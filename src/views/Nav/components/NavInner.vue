<template>
  <Transition name="nav-drawer">
    <div
      v-if="!!modelValue"
      class="nav-inner"
      :style="{ width: `${drawerWidth}px` }"
    >
      <div v-if="modelValue" class="nav-inner-main">
        <el-scrollbar height="100%">
          <slot />
        </el-scrollbar>
      </div>
      <!-- 拖拽手柄 -->
      <div
        class="nav-drag-handle"
        @mousedown="onDragStart"
      />
      <div v-if="modelValue" class="nav-inner-close" @click="emit('update:modelValue', '')">
        <el-icon class="nav-inner-close-icon">
          <Close />
        </el-icon>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { Close } from '@element-plus/icons-vue';
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

const emit = defineEmits(['update:modelValue']);

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

  .nav-inner-close {
    position: absolute;
    width: 30px;
    height: 30px;
    top: 12%;
    right: -29px;
    background-color: var(--background-color-primary-regular);
    border-radius: 0 30% 30% 0;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--background-color-divider-regular);
    border-left: 0 none;
    cursor: pointer;
    z-index: 11; /* 比拖拽手柄更高 */

    .nav-inner-close-icon {
      font-size: 16px;
      color: var(--text-color-primary-regular);
    }
  }
}

.nav-drawer-enter-active,
.nav-drawer-leave-active {
  transition: all 0.28s ease;
}
.nav-drawer-enter-from,
.nav-drawer-leave-to {
  opacity: 0;
  width: 0 !important;
  border-right-color: transparent;
}
.nav-drawer-enter-to,
.nav-drawer-leave-from {
  opacity: 1;
}
</style>
