<template>
  <div
    class="aside-inner"
    :style="{ width: `${width}px` }"
  >
    <!-- 内容区域 -->
    <slot>
      <div v-if="$slots.default === undefined" class="aside-default-content">
        aside
      </div>
    </slot>

    <!-- 拖拽手柄
    <div
      class="resize-handle"
      @mousedown="startResize"
      @touchstart.prevent="startTouchResize"
    >
      <div class="handle-line" />
    </div> -->
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';

interface Props {
  // 初始宽度
  initialWidth?: number;
  // 最小宽度
  minWidth?: number;
  // 最大宽度
  maxWidth?: number;
  // 拖拽方向
  direction?: 'left' | 'right';
}

const props = withDefaults(defineProps<Props>(), {
  initialWidth: 100,
  minWidth: 100,
  maxWidth: 600,
  direction: 'left',
});

// 定义事件
const emit = defineEmits<{
  'width-change': [width: number];
}>();

// 当前宽度
const width = ref(props.initialWidth);

// 拖拽状态
const isResizing = ref(false);
const startX = ref(0);
const startWidth = ref(0);

// 开始拖拽
function startResize(e: MouseEvent) {
  e.preventDefault();
  isResizing.value = true;
  startX.value = e.clientX;
  startWidth.value = width.value;

  // 添加全局事件监听
  document.addEventListener('mousemove', handleResize);
  document.addEventListener('mouseup', stopResize);
  document.body.style.userSelect = 'none'; // 防止选中文本
  document.body.style.cursor = 'col-resize'; // 设置光标样式
}

// 处理触摸拖拽
function startTouchResize(e: TouchEvent) {
  e.preventDefault();
  isResizing.value = true;
  const touch = e.touches[0];
  startX.value = touch?.clientX ?? 0;
  startWidth.value = width.value;

  document.addEventListener('touchmove', handleTouchResize);
  document.addEventListener('touchend', stopTouchResize);
  document.body.style.userSelect = 'none';
  document.body.style.cursor = 'col-resize';
}

// 处理拖拽
function handleResize(e: MouseEvent) {
  if (!isResizing.value)
    return;

  e.preventDefault();
  const deltaX = props.direction === 'left'
    ? startX.value - e.clientX
    : e.clientX - startX.value;

  calculateNewWidth(deltaX);
}

// 处理触摸拖拽
function handleTouchResize(e: TouchEvent) {
  if (!isResizing.value)
    return;

  e.preventDefault();
  const touch = e.touches[0];
  const deltaX = props.direction === 'left'
    ? startX.value - (touch?.clientX ?? 0)
    : (touch?.clientX ?? 0) - startX.value;

  calculateNewWidth(deltaX);
}

// 计算新宽度
function calculateNewWidth(deltaX: number) {
  let newWidth = startWidth.value + deltaX;

  // 限制在最小最大宽度之间
  if (newWidth < props.minWidth) {
    newWidth = props.minWidth;
  }
  else if (newWidth > props.maxWidth) {
    newWidth = props.maxWidth;
  }

  width.value = newWidth;
}

// 停止拖拽
function stopResize() {
  isResizing.value = false;
  document.removeEventListener('mousemove', handleResize);
  document.removeEventListener('mouseup', stopResize);
  document.body.style.userSelect = '';
  document.body.style.cursor = '';

  // 触发宽度改变事件
  emit('width-change', width.value);
}

// 停止触摸拖拽
function stopTouchResize() {
  isResizing.value = false;
  document.removeEventListener('touchmove', handleTouchResize);
  document.removeEventListener('touchend', stopTouchResize);
  document.body.style.userSelect = '';
  document.body.style.cursor = '';

  emit('width-change', width.value);
}

// 重置宽度
function resetWidth() {
  width.value = props.initialWidth;
  emit('width-change', width.value);
}

// 设置宽度
function setWidth(newWidth: number) {
  if (newWidth >= props.minWidth && newWidth <= props.maxWidth) {
    width.value = newWidth;
    emit('width-change', width.value);
  }
}

// 清理事件监听
onUnmounted(() => {
  document.removeEventListener('mousemove', handleResize);
  document.removeEventListener('mouseup', stopResize);
  document.removeEventListener('touchmove', handleTouchResize);
  document.removeEventListener('touchend', stopTouchResize);
});

// 暴露方法给父组件
defineExpose({
  resetWidth,
  setWidth,
  getWidth: () => width.value,
});
</script>

<style lang="scss" scoped>
.aside-inner {
  position: relative;
  height: 100%;
  background-color: var(--background-color-primary-regular);
  border-left: 1px solid var(--background-color-divider-regular);
  transition: width 0.1s ease; // 添加平滑过渡
  box-sizing: border-box;
  overflow: hidden; // 防止内容溢出

  .aside-default-content {
    padding: 20px;
    color: var(--text-color-secondary);
  }
}

// 拖拽手柄
.resize-handle {
  position: absolute;
  top: 0;
  left: 0;
  width: 8px;
  height: 100%;
  cursor: col-resize;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;

  // 拖拽区域扩大，方便操作
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -4px;
    right: -4px;
    bottom: 0;
  }

  .handle-line {
    width: 2px;
    height: 100%;
    background-color: var(--background-color-divider-regular);
    transition: all 0.2s ease;
    border-radius: 1px;

    &:hover {
      background-color: var(--color-primary);
      width: 3px;
    }
  }

  // 拖拽时的样式
  &:active,
  &.resizing {
    .handle-line {
      background-color: var(--color-primary);
      width: 3px;
    }
  }
}

// 拖拽时的全局样式
:global(body.resizing) {
  user-select: none;
  cursor: col-resize !important;
}
</style>
