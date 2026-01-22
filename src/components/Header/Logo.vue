<template>
  <div class="logo">
    <el-tooltip content="返回首页" placement="top">
      <div class="logo-icon">
        <el-icon><House /></el-icon>
      </div>
    </el-tooltip>
  </div>
</template>

<script setup lang="ts">
import { House } from '@element-plus/icons-vue';
</script>

<style scoped lang="scss">
.logo {
  width: 72px;
  height: 100%;
  border: 12px solid transparent;
  cursor: pointer;
  &-icon {
    width: 100%;
    height: 100%;
    font-size: 22px;
    display: flex;
    align-items: center;
    justify-content: center;
    &:hover {
      background-color: var(--background-color-transparent-primary-hover);
      border-radius: var(--border-radius-main);
    }
  }
}
</style>
