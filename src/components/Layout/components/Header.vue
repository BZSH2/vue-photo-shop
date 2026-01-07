<template>
  <header class="header-content">
    <div class="header-logo">
      <ElIcon class="logo">
        <House />
      </ElIcon>
    </div>
    <ElButton>Test</ElButton>
  </header>
</template>

<script lang="ts" setup>
import { House } from "@element-plus/icons-vue";
</script>

<style lang="scss" scoped>
.header-content {
  height: 60px;
  white-space: nowrap;
  background-color: var(--background-color-primary-regular);
  border-bottom: 1px solid var(--background-color-divider-regular);
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-right: 16px;

  .header-logo {
    width: 72px;
    display: flex;
    justify-content: center;
    align-items: center;
    .logo {
      width: 40px;
      height: 40px;
      font-size: 24px;
      border-radius: var(--border-radius-main);
      &:hover {
        background-color: var(--background-color-transparent-primary-hover);
      }
    }
  }
}
</style>
