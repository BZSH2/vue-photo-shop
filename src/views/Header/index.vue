<template>
  <div class="header-container">
    <Logo />
    <Download />
  </div>
</template>

<script setup lang="ts">
import Download from '@/components/Header/Download.vue';
import Logo from '@/components/Header/Logo.vue';
</script>

<style scoped lang="scss">
.header-container {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
</style>
