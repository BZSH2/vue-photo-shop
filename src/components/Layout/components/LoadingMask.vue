<template>
  <div v-if="loading" class="loading-container">
    <el-icon class="is-loading">
      <Loading />
    </el-icon>
    <span class="loading-text">加载中...</span>
  </div>
</template>

<script setup lang="ts">
import { Loading } from '@element-plus/icons-vue';

const { loading } = useLoading();
</script>

<style lang="scss" scoped>
.loading-container {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-flow: column;
  background-color: rgba(0, 0, 0, 0.7);
  z-index: 9999;
  color: #fff;
  .is-loading {
    font-size: 24px;
    margin-bottom: 12px;
    margin-top: -60px;
  }
  .loading-text {
    font-size: 12px;
  }
}
</style>
