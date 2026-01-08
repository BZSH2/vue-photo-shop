<template>
  <div class="nav-aside">
    <div
      v-for="(item, key) in navList"
      :key="key"
      class="nav-item"
      :class="{ 'nav-item-active': props.modelValue === item.key }"
      @click="emit('update:modelValue', item.key)"
    >
      <ElIcon class="nav-item-icon">
        <component :is="(props.modelValue === item.key && item.activeIcon) ? item.activeIcon : item.icon" />
      </ElIcon>
      <span class="nav-item-title">{{ item.title }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { CirclePlus, CirclePlusFilled, CopyDocument, Picture, PictureFilled } from "@element-plus/icons-vue";

const props = defineProps({
  modelValue: {
    type: String,
    default: () => "",
  },
});
const emit = defineEmits(["update:modelValue"]);

const navList = [
  {
    icon: CirclePlus,
    activeIcon: CirclePlusFilled,
    title: "添加",
    key: "add",
  },
  {
    icon: Picture,
    activeIcon: PictureFilled,
    title: "图片",
    key: "image",
  },
  {
    icon: CopyDocument,
    title: "我的",
    key: "my",
  },
];
</script>

<style lang="scss" scoped>
.nav-aside {
  height: 100%;
  width: 72px;
  padding: 12px 0 0;
  background-color: var(--background-color-primary-regular);
  border-right: 1px solid var(--background-color-divider-regular);
  z-index: 1;
}

.nav-item {
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  color: #4c535c;
  padding-bottom: 16px;
  cursor: pointer;
  &-icon {
    width: 54px;
    height: 36px;
    font-size: 22px;
    &:hover {
      background-color: var(--background-color-transparent-primary-hover);
      border-radius: var(--border-radius-main);
    }
  }
  &-title {
    font-size: 12px;
    transform: scale(0.92);
    margin-top: 2px;
  }
  &.nav-item-active {
    color: var(--text-color-primary);

    .nav-item-icon {
      background-color: var(--background-color-transparent-primary-hover);
      border-radius: var(--border-radius-main);
    }
    .nav-item-title {
      font-weight: bold;
    }
  }
}
</style>
