<template>
  <div class="main-container" @wheel.prevent="handleWheel">
    <div class="canvas-wrapper" :style="canvasWrapperStyle">
      <canvas ref="canvasRef" class="canvas" />
    </div>

    <!-- 缩放控制面板 -->
    <div v-if="showControls" class="controls-panel">
      <div class="control-item" @click="zoomIn">
        <span class="control-icon">+</span>
        <span class="control-label">放大</span>
      </div>
      <div class="control-item" @click="zoomOut">
        <span class="control-icon">-</span>
        <span class="control-label">缩小</span>
      </div>
      <div class="control-item" @click="resetZoom">
        <span class="control-icon">↺</span>
        <span class="control-label">重置</span>
      </div>
      <div class="control-item" @click="fitToView">
        <span class="control-icon">⤢</span>
        <span class="control-label">适应</span>
      </div>
      <div class="control-item" @click="toggleDebug">
        <span class="control-icon">🐛</span>
        <span class="control-label">调试</span>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-overlay">
      <div class="loading-content">
        <div class="spinner" />
        加载PSD中...
        <div class="loading-progress">
          {{ currentLayerIndex + 1 }} / {{ totalLayers }} 图层
        </div>
      </div>
    </div>

    <!-- 调试信息 -->
    <div v-if="debugInfo.visible" class="debug-panel">
      <h4>调试信息</h4>
      <div>当前缩放: {{ (zoomLevel * 100).toFixed(0) }}%</div>
      <div>基础缩放: {{ (baseScale * 100).toFixed(0) }}%</div>
      <div>原原尺寸: {{ debugInfo.originalSize }}</div>
      <div>当前尺寸: {{ debugInfo.currentSize }}</div>
      <div>画布尺寸: {{ debugInfo.canvasSize }}</div>
      <div>容器尺寸: {{ debugInfo.containerSize }}</div>
      <div>图层数量: {{ debugInfo.canvasObjects }}</div>
      <div>背景图层: {{ debugInfo.backgroundLayers }}</div>
      <div>画布偏移: X:{{ viewportOffset.x.toFixed(0) }} Y:{{ viewportOffset.y.toFixed(0) }}</div>
      <div>模式: {{ fitMode }}</div>

      <button class="debug-btn" @click="checkCanvasObjects">
        检查画布对象
      </button>
      <button class="debug-btn" @click="logLayerInfo">
        记录图层信息
      </button>

      <div class="scale-options">
        <label v-for="option in scaleOptions" :key="option.value" class="scale-option">
          <input
            v-model="selectedScaleMode"
            type="radio"
            :value="option.value"
            @change="applyScaleMode"
          >
          {{ option.label }}
        </label>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { readPsd } from 'ag-psd';
import * as fabric from 'fabric';
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue';
import { useEventBus } from '@/hooks/useEventBus';

const { on } = useEventBus();
const canvasRef = ref<HTMLCanvasElement | null>(null);
let canvas: fabric.Canvas | null = null;
const loading = ref(false);
const currentLayerIndex = ref(0);
const totalLayers = ref(0);
const showControls = ref(true);

// 缩放和视图控制
const zoomLevel = ref(1); // 用户手动缩放级别
const baseScale = ref(1); // 基础缩放比例（智能计算）
const viewportOffset = reactive({ x: 0, y: 0 }); // 视图偏移
const fitMode = ref('fit'); // 当前适配模式: fit, fill, original, custom
const selectedScaleMode = ref('fit'); // 选择的缩放模式

// 缩放模式选项
const scaleOptions = [
  { label: '适应容器', value: 'fit' },
  { label: '填满容器', value: 'fill' },
  { label: '原始尺寸', value: 'original' },
  { label: '25%', value: '0.25' },
  { label: '50%', value: '0.5' },
  { label: '100%', value: '1' },
  { label: '200%', value: '2' },
];

// 画布配置
let MAX_CANVAS_SIZE = 800; // 动态计算最大画布尺寸
let originalPsdSize = { width: 0, height: 0 };
let canvasSize = { width: 0, height: 0 }; // 画布实际尺寸
let containerSize = { width: 0, height: 0 };

// 调试信息
const debugInfo = reactive({
  visible: false,
  originalSize: '0x0',
  currentSize: '0x0',
  canvasSize: '0x0',
  containerSize: '0x0',
  canvasObjects: 0,
  backgroundLayers: 0,
});

// 计算画布容器的样式
const canvasWrapperStyle = computed(() => {
  return {
    width: `${canvasSize.width}px`,
    height: `${canvasSize.height}px`,
    transform: `translate(${viewportOffset.x}px, ${viewportOffset.y}px) scale(${zoomLevel.value * baseScale.value})`,
    transformOrigin: 'center center',
  };
});

function initCanvas() {
  if (!canvasRef.value) {
    console.error('Canvas元素未找到');
    return;
  }

  // 获取容器尺寸
  const container = canvasRef.value.parentElement?.parentElement;
  if (container) {
    containerSize = {
      width: container.clientWidth,
      height: container.clientHeight,
    };

    // 根据容器尺寸设置最大画布尺寸
    MAX_CANVAS_SIZE = Math.min(
      1200,
      Math.max(containerSize.width, containerSize.height) * 0.9,
    );
  }

  console.log('容器尺寸:', containerSize);
  console.log('最大画布尺寸:', MAX_CANVAS_SIZE);

  // 初始化画布，尺寸稍后根据PSD调整
  canvas = new fabric.Canvas(canvasRef.value, {
    width: 100, // 初始小尺寸，后续根据PSD调整
    height: 100,
    backgroundColor: '#fff',
    selection: false,
    preserveObjectStacking: true,
    renderOnAddRemove: true,
  });

  canvasSize = { width: 100, height: 100 };
  debugInfo.containerSize = `${containerSize.width}x${containerSize.height}`;
  debugInfo.canvasSize = `${canvasSize.width}x${canvasSize.height}`;

  console.log('Canvas初始化完成，初始尺寸:', canvasSize);
}

/**
 * 智能缩放计算函数
 */
function calculateSmartScale(mode: string = 'fit'): number {
  if (originalPsdSize.width === 0 || originalPsdSize.height === 0) {
    return 1;
  }

  const containerWidth = containerSize.width;
  const containerHeight = containerSize.height;
  const psdWidth = originalPsdSize.width;
  const psdHeight = originalPsdSize.height;

  console.log('计算缩放:', {
    mode,
    容器尺寸: `${containerWidth}x${containerHeight}`,
    PSD尺寸: `${psdWidth}x${psdHeight}`,
  });

  let scale = 1;

  switch (mode) {
    case 'fit': // 适应容器（保持比例，完全显示）
      const fitScaleX = containerWidth / psdWidth;
      const fitScaleY = containerHeight / psdHeight;
      scale = Math.min(fitScaleX, fitScaleY);
      break;

    case 'fill': // 填满容器（保持比例，可能会裁剪）
      const fillScaleX = containerWidth / psdWidth;
      const fillScaleY = containerHeight / psdHeight;
      scale = Math.max(fillScaleX, fillScaleY);
      break;

    case 'original': // 原始尺寸
      scale = 1;
      break;

    case 'custom': // 自定义（通过用户缩放控制）
      scale = zoomLevel.value;
      break;

    default: // 数值缩放
      if (!isNaN(Number.parseFloat(mode))) {
        scale = Number.parseFloat(mode);
      }
      else {
        scale = 1;
      }
  }

  // 限制缩放范围
  const finalScale = Math.max(0.1, Math.min(scale, 10));
  console.log('计算出的缩放比例:', finalScale);
  return finalScale;
}

/**
 * 应用缩放模式
 */
function applyScaleMode() {
  if (!canvas)
    return;

  const mode = selectedScaleMode.value;
  fitMode.value = mode;

  if (mode === 'custom') {
    // 用户手动缩放模式
    baseScale.value = 1;
    zoomLevel.value = 1;
  }
  else {
    // 自动计算基础缩放
    const newBaseScale = calculateSmartScale(mode);
    baseScale.value = newBaseScale;
    zoomLevel.value = 1;

    // 计算画布尺寸
    const targetWidth = originalPsdSize.width * newBaseScale;
    const targetHeight = originalPsdSize.height * newBaseScale;

    // 设置画布尺寸
    canvas.setDimensions({
      width: targetWidth,
      height: targetHeight,
    });

    canvasSize = { width: targetWidth, height: targetHeight };

    console.log('应用缩放模式:', {
      模式: mode,
      缩放比例: newBaseScale,
      画布尺寸: canvasSize,
      原始PSD尺寸: originalPsdSize,
    });
  }

  // 重置视图位置
  centerViewport();
  updateDebugInfo();
  canvas?.renderAll();
}

/**
 * 居中视图
 */
function centerViewport() {
  if (!canvas)
    return;

  const scaledWidth = canvasSize.width * zoomLevel.value * baseScale.value;
  const scaledHeight = canvasSize.height * zoomLevel.value * baseScale.value;

  // 计算居中的偏移
  viewportOffset.x = (containerSize.width - scaledWidth) / 2;
  viewportOffset.y = (containerSize.height - scaledHeight) / 2;

  console.log('居中视图:', {
    容器尺寸: containerSize,
    缩放后尺寸: { width: scaledWidth, height: scaledHeight },
    偏移: viewportOffset,
  });
}

/**
 * 缩放控制函数
 */
function zoomIn() {
  zoomLevel.value = Math.min(zoomLevel.value * 1.2, 10);
  fitMode.value = 'custom';
  selectedScaleMode.value = 'custom';
  centerViewport();
  updateDebugInfo();
  canvas?.renderAll();
}

function zoomOut() {
  zoomLevel.value = Math.max(zoomLevel.value / 1.2, 0.1);
  fitMode.value = 'custom';
  selectedScaleMode.value = 'custom';
  centerViewport();
  updateDebugInfo();
  canvas?.renderAll();
}

function resetZoom() {
  zoomLevel.value = 1;
  baseScale.value = 1;
  fitMode.value = 'original';
  selectedScaleMode.value = 'original';
  applyScaleMode();
  updateDebugInfo();
}

function fitToView() {
  fitMode.value = 'fit';
  selectedScaleMode.value = 'fit';
  applyScaleMode();
  updateDebugInfo();
}

function toggleDebug() {
  debugInfo.visible = !debugInfo.visible;
}

/**
 * 处理滚轮缩放
 */
function handleWheel(event: WheelEvent) {
  if (!canvas)
    return;

  event.preventDefault();

  const delta = event.deltaY;
  const zoomFactor = 0.1;

  if (delta > 0) {
    // 缩小
    zoomLevel.value = Math.max(zoomLevel.value / (1 + zoomFactor), 0.1);
  }
  else {
    // 放大
    zoomLevel.value = Math.min(zoomLevel.value * (1 + zoomFactor), 10);
  }

  fitMode.value = 'custom';
  selectedScaleMode.value = 'custom';
  centerViewport();
  updateDebugInfo();
  canvas?.renderAll();
}

/**
 * 计算画布尺寸
 */
function calculateCanvasSize(psdWidth: number, psdHeight: number) {
  // 如果PSD尺寸太大，按比例缩放到最大限制
  if (psdWidth > MAX_CANVAS_SIZE || psdHeight > MAX_CANVAS_SIZE) {
    const scaleX = MAX_CANVAS_SIZE / psdWidth;
    const scaleY = MAX_CANVAS_SIZE / psdHeight;
    const scale = Math.min(scaleX, scaleY);

    return {
      width: Math.floor(psdWidth * scale),
      height: Math.floor(psdHeight * scale),
    };
  }

  // 如果PSD尺寸小于最小限制，按比例放大
  const MIN_CANVAS_SIZE = 300;
  if (psdWidth < MIN_CANVAS_SIZE || psdHeight < MIN_CANVAS_SIZE) {
    const scaleX = MIN_CANVAS_SIZE / psdWidth;
    const scaleY = MIN_CANVAS_SIZE / psdHeight;
    const scale = Math.min(scaleX, scaleY);

    return {
      width: Math.floor(psdWidth * scale),
      height: Math.floor(psdHeight * scale),
    };
  }

  // 尺寸合适，使用原始尺寸
  return {
    width: psdWidth,
    height: psdHeight,
  };
}

/**
 * 递归处理PSD图层树
 */
async function processPsdTree(psd: any) {
  if (!canvas)
    return;

  console.log('=== 开始处理PSD图层树 ===');

  // 清空画布
  canvas.clear();
  canvas.backgroundColor = '#fff';

  // 记录原始PSD尺寸
  originalPsdSize = {
    width: psd.width || 800,
    height: psd.height || 600,
  };

  console.log('PSD尺寸信息:', {
    原始宽度: originalPsdSize.width,
    原始高度: originalPsdSize.height,
  });

  // 计算合适的画布尺寸
  const calculatedCanvasSize = calculateCanvasSize(originalPsdSize.width, originalPsdSize.height);
  canvas.setDimensions({
    width: calculatedCanvasSize.width,
    height: calculatedCanvasSize.height,
  });

  canvasSize = calculatedCanvasSize;

  // 计算适应容器的缩放比例
  const fitScale = Math.min(
    containerSize.width / originalPsdSize.width,
    containerSize.height / originalPsdSize.height,
  );
  baseScale.value = fitScale;

  console.log('计算信息:', {
    画布尺寸: canvasSize,
    容器尺寸: containerSize,
    缩放比例: baseScale.value,
  });

  // 更新调试信息
  debugInfo.originalSize = `${originalPsdSize.width}x${originalPsdSize.height}`;
  debugInfo.currentSize = `${(originalPsdSize.width * baseScale.value).toFixed(0)}x${(originalPsdSize.height * baseScale.value).toFixed(0)}`;
  debugInfo.canvasSize = `${canvasSize.width}x${canvasSize.height}`;

  // 收集所有图层
  const allLayers: any[] = [];
  let layerCounter = 0;

  /**
   * 递归遍历图层树
   */
  function traverseLayers(layers: any[], depth: number = 0) {
    if (!layers || !Array.isArray(layers))
      return;

    for (let i = 0; i < layers.length; i++) {
      const layer = layers[i];
      if (!layer)
        continue;

      layerCounter++;

      // 检测背景图层
      const isBackground
        = layer.name?.toLowerCase().includes('background')
          || (layer.opacity === 255 && (layer.left === 0 || layer.top === 0))
          || (i === 0 && depth === 0); // 最底层的第一个图层可能是背景

      const layerWithDepth = {
        ...layer,
        _depth: depth,
        _index: layerCounter - 1,
        _isBackground: isBackground,
        _isGroup: !!layer.children?.length,
      };

      allLayers.push(layerWithDepth);

      // 递归处理子图层
      if (layer.children && layer.children.length > 0) {
        traverseLayers(layer.children, depth + 1);
      }
    }
  }

  // 开始遍历
  if (psd.children && psd.children.length > 0) {
    traverseLayers(psd.children, 0);
  }

  console.log(`总共发现 ${layerCounter} 个图层`);
  console.log('图层列表:', allLayers.map(l => ({
    名称: l.name,
    是否背景: l._isBackground,
    位置: { left: l.left, top: l.top },
    尺寸: { width: l.width, height: l.height },
  })));

  debugInfo.canvasObjects = 0;
  totalLayers.value = layerCounter;

  // 分离背景图层和普通图层
  const backgroundLayers = allLayers.filter(layer => layer._isBackground);
  const normalLayers = allLayers.filter(layer => !layer._isBackground);

  debugInfo.backgroundLayers = backgroundLayers.length;

  console.log('背景图层数:', backgroundLayers.length);
  console.log('普通图层数:', normalLayers.length);

  // === 第一步：处理背景图层（正向顺序，确保在最底层）===
  for (let i = 0; i < backgroundLayers.length; i++) {
    const layer = backgroundLayers[i];
    currentLayerIndex.value = i;

    if (layer?.canvas) {
      try {
        // 背景图层使用完整不透明度
        await addPsdLayerToCanvas(layer, {
          index: layer._index,
          depth: layer._depth,
          opacity: 1, // 背景图通常完全显示
          isBackground: true,
        });
      }
      catch (error) {
        console.warn(`背景图层 ${layer.name} 添加失败:`, error);
      }
    }
  }

  // === 第二步：处理普通图层（反向顺序，确保正确的叠加顺序）===
  const reversedNormalLayers = [...normalLayers].reverse();

  for (let i = 0; i < reversedNormalLayers.length; i++) {
    const layer = reversedNormalLayers[i];
    currentLayerIndex.value = backgroundLayers.length + i;

    if (layer?.canvas) {
      try {
        const baseOpacity = (layer.opacity !== undefined ? layer.opacity : 255) / 255;
        const finalOpacity = Math.max(0.1, baseOpacity);

        await addPsdLayerToCanvas(layer, {
          index: layer._index,
          depth: layer._depth,
          opacity: finalOpacity,
          isBackground: false,
        });
      }
      catch (error) {
        console.warn(`图层 ${layer.name} 添加失败:`, error);
      }
    }

    // 更新调试信息
    debugInfo.canvasObjects = canvas.getObjects().length;
  }

  console.log('=== 所有图层处理完成 ===');
  debugInfo.canvasObjects = canvas.getObjects().length;

  // 确保背景图在最底层
  ensureBackgroundAtBottom();

  // 渲染画布
  canvas.renderAll();
  console.log('画布渲染完成，对象数量:', canvas.getObjects().length);
  logLayerInfo();

  // 自动适配到视图
  fitToView();
}

/**
 * 确保背景图在最底层
 */
function ensureBackgroundAtBottom() {
  if (!canvas)
    return;

  const objects = canvas.getObjects();
  objects.forEach((obj, index) => {
    if (obj.data?.isBackground) {
      canvas?.moveObjectToBack(obj);
    }
  });
}

/**
 * 添加PSD图层到画布
 */
async function addPsdLayerToCanvas(layer: any, options: {
  index: number;
  depth: number;
  opacity: number;
  isBackground: boolean;
}): Promise<void> {
  if (!canvas || !layer.canvas)
    return Promise.resolve();

  return new Promise((resolve) => {
    const img = new Image();

    img.onload = () => {
      try {
        // 计算图层在画布中的位置和缩放
        const scaleX = canvasSize.width / originalPsdSize.width;
        const scaleY = canvasSize.height / originalPsdSize.height;

        const layerLeft = (layer.left || 0) * scaleX;
        const layerTop = (layer.top || 0) * scaleY;
        const layerWidth = (layer.width || img.width) * scaleX;
        const layerHeight = (layer.height || img.height) * scaleY;

        console.log(`图层 "${layer.name}" 信息:`, {
          原始位置: { left: layer.left, top: layer.top },
          缩放后位置: { left: layerLeft, top: layerTop },
          原始尺寸: { width: layer.width, height: layer.height },
          缩放后尺寸: { width: layerWidth, height: layerHeight },
          图片尺寸: { width: img.width, height: img.height },
          缩放比例: { scaleX, scaleY },
          是否背景: options.isBackground,
          不透明度: options.opacity,
        });

        const fabricImg = new fabric.Image(img, {
          left: layerLeft,
          top: layerTop,
          width: layerWidth,
          height: layerHeight,
          opacity: options.opacity,
          selectable: false, // 禁止选择和操作
          hasControls: false,
          hasBorders: false,
          lockMovementX: true,
          lockMovementY: true,
          lockRotation: true,
          lockScalingX: true,
          lockScalingY: true,
          name: layer.name || `layer_${options.index}`,
          data: {
            source: 'psd',
            layerName: layer.name,
            layerIndex: options.index,
            layerDepth: options.depth,
            isBackground: options.isBackground,
            originalLeft: layer.left,
            originalTop: layer.top,
            originalWidth: layer.width,
            originalHeight: layer.height,
          },
        });

        canvas?.add(fabricImg);

        // 如果是背景图层，立即发送到底层
        if (options.isBackground) {
          canvas?.sendObjectToBack(fabricImg);
        }

        resolve();
      }
      catch (error) {
        console.error('创建Fabric图片失败:', error);
        resolve();
      }
    };

    img.onerror = () => {
      console.warn(`图层 ${layer.name} 图片加载失败`);
      resolve();
    };

    try {
      const dataUrl = layer.canvas.toDataURL('image/png');
      if (!dataUrl || dataUrl.startsWith('data:,')) {
        console.warn(`图层 ${layer.name} 的dataURL无效`);
        resolve();
        return;
      }
      img.src = dataUrl;
    }
    catch (err) {
      console.warn(`创建图层 ${layer.name} 失败:`, err);
      resolve();
    }
  });
}

function updateDebugInfo() {
  if (!canvas)
    return;

  const currentScale = baseScale.value * zoomLevel.value;
  const width = originalPsdSize.width * currentScale;
  const height = originalPsdSize.height * currentScale;

  debugInfo.currentSize = `${width.toFixed(0)}x${height.toFixed(0)}`;
  debugInfo.canvasObjects = canvas.getObjects().length;
  debugInfo.canvasSize = `${canvasSize.width}x${canvasSize.height}`;
  debugInfo.containerSize = `${containerSize.width}x${containerSize.height}`;

  // 统计背景图层数量
  const objects = canvas.getObjects();
  const backgroundCount = objects.filter(obj => obj.data?.isBackground).length;
  debugInfo.backgroundLayers = backgroundCount;
}

/**
 * 检查画布对象
 */
function checkCanvasObjects() {
  if (!canvas) {
    console.log('画布未初始化');
    return;
  }

  const objects = canvas.getObjects();
  console.log('=== 画布对象检查 ===');
  console.log('总对象数:', objects.length);

  objects.forEach((obj, index) => {
    console.log(`对象 ${index}:`, {
      名称: obj.name,
      类型: obj.type,
      是否背景: obj.data?.isBackground || false,
      位置: { left: obj.left, top: obj.top },
      尺寸: { width: obj.width, height: obj.height },
      透明度: obj.opacity,
      可见性: obj.visible,
      层级: obj.zIndex,
      数据: obj.data,
    });
  });

  // 检查是否有重叠或位置异常的对象
  const problemObjects = objects.filter(obj =>
    obj.opacity === 0
    || obj.width === 0
    || obj.height === 0
    || !obj.visible,
  );

  if (problemObjects.length > 0) {
    console.log('发现可能有问题的对象:', problemObjects);
  }
}

/**
 * 记录图层信息
 */
function logLayerInfo() {
  if (!canvas)
    return;

  const objects = canvas.getObjects();
  const backgroundLayers = objects.filter(obj => obj.data?.isBackground);
  const normalLayers = objects.filter(obj => !obj.data?.isBackground);

  console.log('=== 图层信息汇总 ===');
  console.log('背景图层:', backgroundLayers.map(l => ({
    名称: l.name,
    位置: `(${l.left}, ${l.top})`,
    尺寸: `${l.width}x${l.height}`,
  })));
  console.log('普通图层:', normalLayers.map(l => ({
    名称: l.name,
    位置: `(${l.left}, ${l.top})`,
    尺寸: `${l.width}x${l.height}`,
  })));
}

on('selectTemplate', async (item: any) => {
  if (!canvas) {
    console.error('Canvas未初始化');
    return;
  }

  if (!item?.psd) {
    console.error('缺少PSD地址');
    return;
  }

  console.log('开始加载PSD:', item.name || '未命名');
  console.log('PSD地址:', item.psd);
  loading.value = true;
  currentLayerIndex.value = 0;
  totalLayers.value = 0;

  try {
    // 下载PSD文件
    console.log('开始下载PSD文件...');
    const res = await fetch(item.psd);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const arrayBuffer = await res.arrayBuffer();
    console.log('PSD文件大小:', (arrayBuffer.byteLength / 1024).toFixed(2), 'KB');

    if (arrayBuffer.byteLength === 0) {
      throw new Error('PSD文件为空');
    }

    // 解析PSD
    console.log('开始解析PSD...');
    const psd = readPsd(arrayBuffer, {
      skipLayerImageData: false,
      skipCompositeImageData: false,
    });

    console.log('PSD解析完成:', {
      宽度: psd.width,
      高度: psd.height,
      颜色模式: psd.colorMode,
      bitsPerChannel: psd.bitsPerChannel,
      图层数量: psd.children?.length || 0,
    });

    // 处理PSD图层树
    await processPsdTree(psd);
  }
  catch (error) {
    console.error('加载PSD失败:', error);
  }
  finally {
    loading.value = false;
  }
});

onMounted(() => {
  initCanvas();

  // 监听窗口大小变化
  window.addEventListener('resize', () => {
    if (fitMode.value === 'fit') {
      applyScaleMode();
    }
  });
});

onUnmounted(() => {
  window.removeEventListener('resize', () => {});
});
</script>

<style scoped lang="scss">
.main-container {
  width: 100%;
  height: 100%;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(
    45deg,
    #f5f5f5 25%,
    #e8e8e8 25%,
    #e8e8e8 50%,
    #f5f5f5 50%,
    #f5f5f5 75%,
    #e8e8e8 75%,
    #e8e8e8
  );
  background-size: 20px 20px;
  overflow: hidden;
  cursor: grab;

  &:active {
    cursor: grabbing;
  }

  .canvas-wrapper {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.2s ease;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    border: 1px solid #dcdfe6;
    background: white;
    overflow: visible;

    .canvas {
      display: block;
    }
  }

  .controls-panel {
    position: absolute;
    bottom: 20px;
    right: 20px;
    background: rgba(255, 255, 255, 0.95);
    border-radius: 8px;
    padding: 8px;
    display: flex;
    gap: 8px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
    border: 1px solid #e4e7ed;
    z-index: 100;

    .control-item {
      padding: 8px 12px;
      border-radius: 4px;
      background: white;
      display: flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      transition: all 0.2s;
      border: 1px solid transparent;

      &:hover {
        background: #f5f7fa;
        border-color: #409eff;
        transform: translateY(-1px);
      }

      &:active {
        transform: translateY(0);
      }

      .control-icon {
        font-size: 16px;
        font-weight: bold;
      }

      .control-label {
        font-size: 12px;
        color: #606266;
        white-space: nowrap;
      }
    }
  }

  .loading-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(255, 255, 255, 0.9);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;

    .loading-content {
      text-align: center;
      padding: 30px 40px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
      border: 1px solid #e4e7ed;

      .spinner {
        width: 40px;
        height: 40px;
        border: 3px solid #e4e7ed;
        border-top-color: #409eff;
        border-radius: 50%;
        margin: 0 auto 16px;
        animation: spin 1s linear infinite;
      }

      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }

      .loading-progress {
        margin-top: 10px;
        font-size: 12px;
        color: #909399;
      }
    }
  }

  .debug-panel {
    position: absolute;
    top: 20px;
    right: 20px;
    background: rgba(0, 0, 0, 0.85);
    color: white;
    padding: 16px;
    border-radius: 8px;
    font-family: 'Monaco', 'Menlo', monospace;
    font-size: 12px;
    z-index: 100;
    min-width: 240px;
    backdrop-filter: blur(4px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    max-height: 80vh;
    overflow-y: auto;

    h4 {
      margin: 0 0 12px 0;
      color: #409eff;
      font-size: 13px;
      font-weight: bold;
    }

    > div {
      margin: 6px 0;
      line-height: 1.4;
      padding: 4px 0;

      &:not(:last-child) {
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }
    }

    .debug-btn {
      width: 100%;
      margin: 8px 0;
      padding: 6px 12px;
      background: rgba(64, 158, 255, 0.2);
      color: #409eff;
      border: 1px solid #409eff;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      transition: background 0.2s;

      &:hover {
        background: rgba(64, 158, 255, 0.3);
      }
    }

    .scale-options {
      margin-top: 12px;
      padding-top: 12px;
      border-top: 2px solid rgba(255, 255, 255, 0.2);

      .scale-option {
        display: block;
        margin: 4px 0;
        padding: 4px 8px;
        border-radius: 4px;
        cursor: pointer;
        transition: background 0.2s;

        &:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        input[type='radio'] {
          margin-right: 8px;
        }
      }
    }
  }
}
</style>
