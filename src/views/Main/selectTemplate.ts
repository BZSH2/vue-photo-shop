import { readPsd } from 'ag-psd';
import * as fabric from 'fabric';
import JSZip from 'jszip';
import { getLfsPath, getPublicPath } from '@/utils/path';

const lfsPath = getLfsPath();
const publicPath = getPublicPath();
// canvas容器的宽高
const templateSize = {
  width: 0,
  height: 0,
  scale: 1,
};

// 选择模板 加载psd
export async function selectTemplate(item: any, canvas: fabric.Canvas): Promise<void> {
  if (!canvas) {
    console.error('Canvas未初始化');
    return;
  }
  // 1.获取 canvas 尺寸
  templateSize.width = canvas.width;
  templateSize.height = canvas.height;
  // 2. 创建并加载 ZIP
  // 如果是开发环境，使用相对路径；如果是生产环境，使用 LFS 路径
  const baseUrl = import.meta.env.DEV ? publicPath : lfsPath;
  // 移除开头的斜杠以避免双重斜杠（如果是相对路径则不需要）
  const cleanZipPath = item.zipFile.startsWith('/') ? item.zipFile.slice(1) : item.zipFile;
  // 确保路径拼接正确
  const zipUrl = baseUrl ? (baseUrl.endsWith('/') ? `${baseUrl}${cleanZipPath}` : `${baseUrl}/${cleanZipPath}`) : cleanZipPath;

  try {
    const res = await fetch(zipUrl);

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
    const zip = new JSZip();
    const zipData = await zip.loadAsync(arrayBuffer);

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
      await processPsdTree(psd.children, canvas);
    }
  }
  catch (error) {
    console.error('加载或解析ZIP失败:', error);
  }
}

/**
 * 递归处理PSD图层树
 */
async function processPsdTree(layers: any[], canvas: fabric.Canvas): Promise<void> {
  if (!canvas)
    return;

  // 反转图层数组，因为PSD图层是从底部到顶部存储的
  const reversedLayers = [...layers];

  for (const layer of reversedLayers) {
    if (layer.hidden) {
      // '图层已隐藏，跳过
      continue;
    }
    // 处理有canvas的图层（普通图层）
    if (layer.canvas && layer.canvas instanceof HTMLCanvasElement) {
      await addLayerToCanvas(layer, canvas);
    }
    // 处理文本图层
    else if (layer.text) {
      await addTextLayerToCanvas(layer, canvas);
    }
    // 处理子图层
    else if (layer.children) {
      await processPsdTree(layer.children, canvas);
    }
  }
}

/**
 * 添加普通图片图层到Canvas
 */
async function addLayerToCanvas(layer: any, canvas: fabric.Canvas): Promise<void> {
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
async function addTextLayerToCanvas(layer: any, canvas: fabric.Canvas): Promise<void> {
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
