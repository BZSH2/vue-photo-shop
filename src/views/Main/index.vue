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

on('uploadImage', async (uploadFile: any) => {
  const img = await fabric.Image.fromURL(uploadFile.url || '', {}, {
    scaleX: 0.1,
    scaleY: 0.1,
    left: canvas!.width / 2,
    top: canvas!.height / 2,
  });

  if (!img) {
    return;
  }
  canvas?.add(img);
});

on('selectAddText', (item: unknown) => {
  const textItem = item as Text.Item;
  console.log(textItem);

  const text = new fabric.IText(`请输入${textItem.label}`, {
    left: canvas!.width / 2,
    top: canvas!.height / 2,
    fontSize: textItem.fontSize,
    fontFamily: 'Arial',
    fill: '#000000',
    originX: 'center',
    originY: 'center',
    hasControls: true,
    hasBorders: true,
  });
  canvas?.add(text);
});

on('qrCodeGenerated', async (qrDataURL: any) => {
  const img = await fabric.Image.fromURL(qrDataURL, {}, {
    left: canvas!.width / 2,
    top: canvas!.height / 2,
  });

  if (!img) {
    return;
  }
  canvas?.add(img);
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
