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
          <AddCheck />
        </div>
      </el-collapse-item>
      <!-- <el-collapse-item title="绘制" name="3">
      </el-collapse-item> -->
      <el-collapse-item title="二维码" name="4">
        <div>
          <Code />
        </div>
      </el-collapse-item>
    </el-collapse>
  </div>
</template>

<script lang="ts" setup>
import type { CollapseModelValue } from 'element-plus';

import AddCheck from './components/AddCheck.vue';
import Code from './components/Code.vue';
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
