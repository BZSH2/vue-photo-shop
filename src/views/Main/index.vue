<template>
  <div ref="canvasContainerRef" class="canvas-container">
    <canvas ref="canvasRef" class="canvas" />
  </div>
</template>

<script lang="ts" setup>
import { readPsd } from 'ag-psd';
import * as fabric from 'fabric';
import JSZip from 'jszip';
import { onMounted, ref } from 'vue';
import { useEventBus } from '@/hooks/useEventBus';
import { getLfsPath, getPublicPath } from '@/utils/path';

const { on } = useEventBus();
const lfsPath = getLfsPath();
const publicPath = getPublicPath();
const { open, close } = useLoading();
const canvasContainerRef = ref<HTMLDivElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);
let canvas: fabric.Canvas | null = null;
// canvas容器的宽高
const templateSize = {
  width: 0,
  height: 0,
  scale: 1,
};

on('selectTemplate', async (item: any) => {
  open();

  if (!canvas) {
    console.error('Canvas未初始化');
    return;
  }

  // 2. 创建并加载 ZIP
  // 如果是开发环境，使用相对路径；如果是生产环境，使用 LFS 路径
  const baseUrl = import.meta.env.DEV ? publicPath : lfsPath;
  // 移除开头的斜杠以避免双重斜杠（如果是相对路径则不需要）
  const cleanZipPath = item.zipFile.startsWith('/') ? item.zipFile.slice(1) : item.zipFile;
  // 确保路径拼接正确
  const zipUrl = baseUrl ? (baseUrl.endsWith('/') ? `${baseUrl}${cleanZipPath}` : `${baseUrl}/${cleanZipPath}`) : cleanZipPath;

  console.log('zipUrl', zipUrl);

  try {
    const res = await fetch(zipUrl);
    console.log('res', zipUrl, res);

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    const arrayBuffer = await res.arrayBuffer();

    // 检查是否为 Git LFS 指针文件
    const textDecoder = new TextDecoder();
    // 只读取前100个字节来检查，避免大文件性能损耗
    const header = textDecoder.decode(arrayBuffer.slice(0, 100));
    if (header.startsWith('version https://git-lfs.github.com/spec/v1')) {
      throw new Error('检测到 Git LFS 指针文件，而非实际的二进制文件。请检查部署流程是否正确启用了 Git LFS。');
    }
    console.log('arrayBuffer', arrayBuffer);
    const zip = new JSZip();
    const zipData = await zip.loadAsync(arrayBuffer);

    console.log('ZIP 文件内容:', zipData);
    // 2. 查找 ZIP 中的 PSD 文件
    const psdFiles = Object.keys(zipData.files).filter((name) => {
      const isPsd = name.toLowerCase().endsWith('.psd');
      const isMacFile = name.includes('__MACOSX') || name.split('/').pop()?.startsWith('._');
      return isPsd && !isMacFile;
    });

    if (psdFiles.length === 0) {
      console.error('ZIP 中没有找到 PSD 文件');
      return;
    }

    // 3. 获取第一个 PSD 文件
    const psdFileName = psdFiles[0];
    const psdFile = zipData.file(psdFileName || '');

    if (!psdFile) {
      console.error('无法获取 PSD 文件');
      return;
    }

    // 4. 将 PSD 文件转换为 ArrayBuffer
    const psdArrayBuffer = await psdFile.async('arraybuffer');

    console.log('PSD 文件 ArrayBuffer:', psdArrayBuffer);

    canvas.clear();

    const psd = readPsd(psdArrayBuffer, {
      skipLayerImageData: false,
      skipCompositeImageData: false,
    });

    const psdElement = psd;
    const widthScale = templateSize.width / psdElement.width;
    const heightScale = templateSize.height / psdElement.height;

    // 选择较小的缩放比例以确保整个PSD都能显示
    templateSize.scale = Math.min(widthScale, heightScale);

    canvas.setDimensions({
      width: psdElement.width * templateSize.scale,
      height: psdElement.height * templateSize.scale,
    });
    // 处理PSD图层树
    if (psd.children) {
      await processPsdTree(psd.children);
    }
  }
  catch (error) {
    console.error('加载或解析ZIP失败:', error);
  }
  finally {
    close();
  }
});

on('download', async () => {
  // 1. 获取DataURL
  const dataURL = canvas?.toDataURL({
    format: 'jpeg',
    quality: 0.9, // 仅JPEG/WebP
    multiplier: 2, // 缩放倍数
  });

  // 2. 下载图片
  const link = document.createElement('a');
  link.href = dataURL || '';
  link.download = 'filename.png';
  link.click();
});

/**
 * 递归处理PSD图层树
 */
async function processPsdTree(layers: any[]) {
  if (!canvas)
    return;

  // 反转图层数组，因为PSD图层是从底部到顶部存储的
  const reversedLayers = [...layers];

  for (const layer of reversedLayers) {
    console.log('处理图层:', layer);
    if (layer.hidden) {
      // '图层已隐藏，跳过
      continue;
    }
    // 处理有canvas的图层（普通图层）
    if (layer.canvas && layer.canvas instanceof HTMLCanvasElement) {
      await addLayerToCanvas(layer);
    }
    // 处理文本图层
    else if (layer.text) {
      await addTextLayerToCanvas(layer);
    }
    // 处理子图层
    else if (layer.children) {
      await processPsdTree(layer.children);
    }
  }
}

/**
 * 添加普通图片图层到Canvas
 */
async function addLayerToCanvas(layer: any) {
  try {
    if (!layer.canvas || !canvas)
      return;

    const layerLeft = layer.left || 0;
    const layerTop = layer.top || 0;
    const layerWidth = layer.width || layer.canvas.width || 0;
    const layerHeight = layer.height || layer.canvas.height || 0;
    // 使用Promise包装图片加载
    const imgInstance = new fabric.Image(layer.canvas, {
      left: layerLeft * templateSize.scale,
      top: layerTop * templateSize.scale,
      scaleX: templateSize.scale,
      scaleY: templateSize.scale,
      originX: 'left',
      originY: 'top',
      opacity: layer.opacity !== undefined ? layer.opacity * 255 : 1, // PSD中透明度是0-255
    });

    // 设置图层名称以便调试
    if (layer.name) {
      imgInstance.set('name', layer.name);
      imgInstance.set('data', {
        originalLeft: layerLeft,
        originalTop: layerTop,
        originalWidth: layerWidth,
        originalHeight: layerHeight,
      });
    }

    canvas.add(imgInstance);
  }
  catch (error) {
    console.error(`添加图层失败 "${layer.name || '未命名图层'}":`, error);
  }
}

/**
 * 添加文本图层到Canvas
 */
async function addTextLayerToCanvas(layer: any) {
  try {
    if (!layer.text || !canvas)
      return;

    const layerLeft = layer.left || 0;
    const layerTop = layer.top || 0;

    const text = new fabric.Text(layer.text.text || layer.text.value || '', {
      left: layerLeft * templateSize.scale,
      top: layerTop * templateSize.scale,
      scaleX: templateSize.scale,
      scaleY: templateSize.scale,
      originX: 'left',
      originY: 'top',
      selectable: false,
      evented: false,
      fontFamily: layer.text.style?.font?.name || 'Arial',
      fontSize: (layer.text.style?.font?.sizes?.[0] || 12) * templateSize.scale,
      fill: layer.text.style?.fill?.color || '#000000',
      opacity: layer.opacity !== undefined ? layer.opacity * 255 : 1,
    });

    if (layer.name) {
      text.set('name', layer.name);
    }

    canvas.add(text);
  }
  catch (error) {
    console.error(`添加文本图层失败 "${layer.name || '未命名文本图层'}":`, error);
  }
}

function initCanvas() {
  if (!canvasRef.value) {
    return;
  }
  templateSize.width = (canvasRef.value.parentElement?.clientWidth || 0) - 40;
  templateSize.height = (canvasRef.value.parentElement?.clientHeight || 0) - 40;
  canvas = new fabric.Canvas(canvasRef.value, {
    width: templateSize.width,
    height: templateSize.height,
    backgroundColor: '#ffffff',
    selection: false,
    preserveObjectStacking: true,
    renderOnAddRemove: true,
  });

  canvas.renderAll();
}

onMounted(() => {
  initCanvas();
});
</script>

<style scoped lang="scss">
.canvas-container {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}
.canvas {
  width: 100%;
  height: 100%;
  background-color: transparent !important; /* 这会覆盖 */
}
</style>
