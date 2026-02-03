<template>
  <div ref="canvasContainerRef" class="canvas-container">
    <canvas ref="canvasRef" class="canvas" />
  </div>
</template>

<script lang="ts" setup>
import * as fabric from 'fabric';
import { onMounted, ref } from 'vue';

import { useEventBus } from '@/hooks/useEventBus';
import { selectTemplate } from './selectTemplate';

const { on } = useEventBus();
const { open, close } = useLoading();
const canvasContainerRef = ref<HTMLDivElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);
let canvas: fabric.Canvas | null = null;

on('selectTemplate', async (item: any) => {
  open();
  await selectTemplate(item, canvas as fabric.Canvas);
  close();
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

on('uploadImage', (uploadFile: any) => {
  console.log('uploadFile', uploadFile);
});

function initCanvas() {
  if (!canvasRef.value) {
    return;
  }
  canvas = new fabric.Canvas(canvasRef.value, {
    width: (canvasRef.value.parentElement?.clientWidth || 0) - 40,
    height: (canvasRef.value.parentElement?.clientHeight || 0) - 40,
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
