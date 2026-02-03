<template>
  <div class="add-container">
    <el-collapse v-model="activeNames" @change="handleChange">
      <el-collapse-item title="图片" name="1">
        <div>
          <UploadImage />
        </div>
      </el-collapse-item>
      <el-collapse-item title="文字" name="2">
        <div>
          Operation feedback: enable the users to clearly perceive their
          operations by style updates and interactive effects;
        </div>
        <div>
          Visual feedback: reflect current state by updating or rearranging
          elements of the page.
        </div>
      </el-collapse-item>
      <el-collapse-item title="绘制" name="3">
        <div>
          Simplify the process: keep operating process simple and intuitive;
        </div>
        <div>
          Definite and clear: enunciate your intentions clearly so that the
          users can quickly understand and make decisions;
        </div>
        <div>
          Easy to identify: the interface should be straightforward, which helps
          the users to identify and frees them from memorizing and recalling.
        </div>
      </el-collapse-item>
      <el-collapse-item title="二维码" name="4">
        <div>
          Decision making: giving advice about operations is acceptable, but do
          not make decisions for the users;
        </div>
        <div>
          Controlled consequences: users should be granted the freedom to
          operate, including canceling, aborting or terminating current
          operation.
        </div>
      </el-collapse-item>
    </el-collapse>
  </div>
</template>

<script lang="ts" setup>
import type { CollapseModelValue } from 'element-plus';

import UploadImage from './components/UploadImage.vue';

const activeNames = ref(['1']);
function handleChange(val: CollapseModelValue) {
  console.log(val);
}
</script>

<style scoped lang="scss">
.add-container {
  padding: 0 12px;
}
</style>
