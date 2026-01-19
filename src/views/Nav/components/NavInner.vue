<template>
  <div
    class="nav-inner"
    :style="{ width: modelValue ? `${drawerWidth}px` : '0px' }"
  >
    <div v-if="modelValue" class="nav-inner-main">
      <el-scrollbar height="100%">
        <slot />
      </el-scrollbar>
    </div>
    <div
      class="nav-drag-handle"
      @mousedown="onDragStart"
    />
  </div>
</template>

<script setup lang="ts">
import { onUnmounted, ref, watch } from 'vue';

interface Props {
  modelValue?: string;
  minWidth?: number;
  maxWidth?: number;
  defaultWidth?: number;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  minWidth: 200,
  maxWidth: 600,
  defaultWidth: 313,
});
// 响应式数据
const drawerWidth = ref(props.defaultWidth);
const isDragging = ref(false);
const startX = ref(0);
const startWidth = ref(0);

// 监听modelValue变化，显示时重置宽度
watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    drawerWidth.value = props.defaultWidth;
  }
}, { immediate: true });

// 拖拽开始
function onDragStart(e: MouseEvent) {
  e.preventDefault();
  e.stopPropagation();

  isDragging.value = true;
  startX.value = e.clientX;
  startWidth.value = drawerWidth.value;

  // 添加事件监听
  document.addEventListener('mousemove', onDragging);
  document.addEventListener('mouseup', onDragEnd);

  // 防止选中文本
  document.body.style.userSelect = 'none';
  document.body.style.cursor = 'col-resize';
}

// 拖拽中
function onDragging(e: MouseEvent) {
  if (!isDragging.value)
    return;

  const deltaX = e.clientX - startX.value;
  let newWidth = startWidth.value + deltaX;

  // 限制宽度在最小和最大值之间
  newWidth = Math.max(props.minWidth, Math.min(props.maxWidth, newWidth));

  drawerWidth.value = newWidth;
}

// 拖拽结束
function onDragEnd() {
  if (!isDragging.value)
    return;

  isDragging.value = false;

  // 移除事件监听
  document.removeEventListener('mousemove', onDragging);
  document.removeEventListener('mouseup', onDragEnd);

  // 恢复样式
  document.body.style.userSelect = '';
  document.body.style.cursor = '';
}

// 组件卸载时清理
onUnmounted(() => {
  if (isDragging.value) {
    document.removeEventListener('mousemove', onDragging);
    document.removeEventListener('mouseup', onDragEnd);
  }
});
</script>

<style lang="scss" scoped>
.nav-inner-main {
  width: 100%;
  height: 100%;
}

.nav-inner {
  height: 100%;
  background-color: var(--background-color-primary-regular);
  border-right: 1px solid var(--background-color-divider-regular);
  position: relative;
  display: flex;
  flex-direction: column;
  transition: width 0.28s ease;

  .nav-drag-handle {
    position: absolute;
    right: 0;
    top: 0;
    width: 8px;
    height: 100%;
    cursor: col-resize;
    z-index: 10;
    transition: background-color 0.2s;

    &:hover {
      background-color: rgba(0, 0, 0, 0.1);
    }

    &::after {
      content: '';
      position: absolute;
      right: 3px;
      top: 50%;
      transform: translateY(-50%);
      width: 2px;
      height: 40px;
      background-color: var(--background-color-divider-regular);
      border-radius: 1px;
    }
  }
}
</style>
