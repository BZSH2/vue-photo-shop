<template>
  <div>
    <el-input v-model="code" placeholder="请输入二维码内容" />
    <el-button type="primary" class="generate-btn" @click="generateCode">
      生成二维码
    </el-button>
  </div>
</template>

<script lang="ts" setup>
import QRCode from 'qrcode';

const code = ref('https://bzsh2.github.io/vue-photo-shop/#/');
const { emit } = useEventBus();

async function generateCode() {
  // 生成二维码的逻辑
  console.log(code.value);

  const options = {
    width: 200,
    height: 200,
    left: 100,
    top: 100,
  };
    // 生成二维码 Data URL
  const qrDataURL = await QRCode.toDataURL(code.value, {
    width: options.width,
    margin: 1,
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
  });

  emit('qrCodeGenerated', qrDataURL);
}
</script>

<style scoped lang="scss">
.el-input {
  width: 100%;
}
.generate-btn {
  width: 100%;
  margin-top: 10px;
}
</style>
