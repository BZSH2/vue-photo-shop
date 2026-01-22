<template>
  <div ref="canvasContainerRef" class="canvas-container">
    <canvas ref="canvasRef" class="canvas" />
  </div>
</template>

<script lang="ts" setup>
import { readPsd } from 'ag-psd';
import * as fabric from 'fabric';
import { onMounted, ref } from 'vue';
import { useEventBus } from '@/hooks/useEventBus';

const { on } = useEventBus();

const canvasRef = ref<HTMLCanvasElement | null>(null);
const canvasContainerRef = ref<HTMLDivElement | null>(null);
let canvas: fabric.Canvas | null = null;
// canvas容器的宽高
const templateSize = {
  width: 0,
  height: 0,
  scale: 1,
};

on('selectTemplate', async (item: any) => {
  if (!canvas) {
    console.error('Canvas未初始化');
    return;
  }

  if (!item?.psd) {
    console.error('缺少PSD地址');
    return;
  }

  canvas.clear();

  try {
    const res = await fetch(item.psd);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const arrayBuffer = await res.arrayBuffer();
    if (arrayBuffer.byteLength === 0) {
      throw new Error('PSD文件为空');
    }

    // 解析PSD
    const psd = readPsd(arrayBuffer, {
      skipLayerImageData: false,
      skipCompositeImageData: false,
    });

    console.log('psd', psd);

    const psdElement = psd;
    templateSize.scale = psdElement?.width && psdElement?.height ? psdElement.width > psdElement.height ? templateSize.width / psdElement.width : templateSize.height / psdElement.height : 1;

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

/**
 * 递归处理PSD图层树
 */
async function processPsdTree(psd: any[]) {
  if (!canvas)
    return;

  for (const layer of psd) {
    if (layer.canvas) {
      initCanvasContainer(layer);
    }
    if (layer.children) {
      await processPsdTree(layer.children);
    }
  }
}

function initCanvasContainer(layer: any) {
  console.log('layer', layer);

  const imgInstance = new fabric.FabricImage(layer.canvas, {
    scaleX: templateSize.scale,
    scaleY: templateSize.scale,
  });
  canvas?.add(imgInstance);
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
