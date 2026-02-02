<template>
  <div class="layout-container">
    <header class="header-inner">
      <slot name="header" />
    </header>
    <div class="layout-main">
      <slot name="nav" />
      <main class="main-wrap">
        <slot name="main" />
      </main>
      <slot name="aside" />
    </div>
  </div>
  <LoadingMask />
</template>

<script lang="ts" scoped>
import LoadingMask from './components/LoadingMask.vue';
</script>

<style lang="scss" scoped>
.layout-container {
  background-color: var(--background-color-secondary-regular);

  .header-inner {
    height: 60px;
    white-space: nowrap;
    background-color: var(--background-color-primary-regular);
    border-bottom: 1px solid var(--background-color-divider-regular);
  }

  .layout-main {
    height: calc(100% - 60px);
    display: flex;
    justify-content: space-between;
    .main-wrap {
      height: 100%;
      flex: 1;
    }
  }
}
</style>
