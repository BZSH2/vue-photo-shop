<template>
  <div class="header-container">
    <Logo />
    <div class="actions">
      <el-button text @click="toAdmin">
        管理后台
      </el-button>
      <Download />
    </div>
  </div>
</template>

<script setup lang="ts">
import Download from '@/components/Header/Download.vue';
import Logo from '@/components/Header/Logo.vue';
import router from '@/router';

function toAdmin() {
  router.push('/micro/vue-admin');
}
</script>

<style scoped lang="scss">
.header-container {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.actions {
  display: flex;
  align-items: center;
}
</style>
