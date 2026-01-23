<template>
  <div class="canvas-container">
    <canvas ref="canvasRef" class="canvas" />
  </div>
</template>

<script lang="ts" setup>
import { readPsd } from 'ag-psd';
import axios from 'axios';
import * as fabric from 'fabric';
import { onMounted, ref } from 'vue';
import { useEventBus } from '@/hooks/useEventBus';
import { getPublicPath } from '@/utils/path';

const { on } = useEventBus();
const path = getPublicPath();

const canvasRef = ref<HTMLCanvasElement | null>(null);
let canvas: fabric.Canvas | null = null;
// canvas容器的宽高
const templateSize = {
  width: 0,
  height: 0,
  scale: 1,
};

on('selectTemplate', async (item: any) => {
  console.log('选择模板:', item);
  if (!canvas) {
    console.error('Canvas未初始化');
    return;
  }

  if (!item?.psd) {
    console.error('缺少PSD地址');
    return;
  }

  canvas.clear();

  const url = `${path}${item.psd}`;

  try {
    console.log('res', url);
    const res = await fetch(url);

    const arrayBuffer = await res.arrayBuffer();

    console.log('arrayBuffer', res);
    const response = await axios.get(url, {
      responseType: 'arraybuffer', // 重要：必须指定为arraybuffer
      headers: {
        'Content-Type': 'application/octet-stream',
      },
    });
    console.log('aaaaaaaaaaaaaaaaaa', response);
    const psd = readPsd(arrayBuffer, {
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
    console.error('加载PSD失败:', error);
  }
  finally {
    // loading.value = false;
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
  // console.log(, );
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
