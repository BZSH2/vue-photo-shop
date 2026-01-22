<template>
  <div class="download">
    <el-button @click="handleDownload">
      下载
    </el-button>
  </div>
</template>

<script setup lang="ts">
import { useEventBus } from '@/hooks/useEventBus';

const { emit } = useEventBus();
function handleDownload() {
  emit('download');
}
</script>

<style scoped lang="scss">
.download {
  margin-right: 20px;
}
</style>
