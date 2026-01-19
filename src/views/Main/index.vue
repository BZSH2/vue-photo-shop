<template>
  <div class="main-container">
    <div class="image-box">
      <img :src="url" alt="" :style="imageStyle">
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useEventBus } from '@/hooks/useEventBus';

const { on } = useEventBus();
const url = ref('');
const imageStyle = ref<{
  width?: string;
  height?: string;
}>({});

/** 监听模板选择事件 */
on('selectTemplate', (item: any) => {
  console.log(item, 'aaaaaaaaaaaaaaaaaaaaa1111');
  const { width, height } = item;
  url.value = item.image;
  if (width > height) {
    imageStyle.value = {
      width: '100%',
    };
  }
  else {
    imageStyle.value = {
      height: '100%',
    };
  }
});

// async function initData() {
// const res = await fetch('@/assets/psd/1.psd');
// console.log(res);
// }

// onMounted(() => {
//   // initData();
// });
</script>

<style lang="scss" scoped>
.image-box {
  width: 100%;
  height: 100%;
  padding: 50px;
  display: flex;
  justify-content: center;
  align-items: center;
}
</style>
