<template>
  <el-upload
    v-model:file-list="fileList"
    list-type="picture-card"
    :http-request="doUpload"
    :on-preview="handlePictureCardPreview"
    :on-remove="handleRemove"
    class="upload-image"
    :on-success="handleSuccess"
  >
    <el-icon><Plus /></el-icon>
  </el-upload>

  <el-dialog v-model="dialogVisible">
    <img w-full :src="dialogImageUrl" alt="Preview Image">
  </el-dialog>
</template>

<script lang="ts" setup>
import type { UploadProps, UploadUserFile } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';

const fileList = ref<UploadUserFile[]>([]);

const dialogImageUrl = ref('');
const dialogVisible = ref(false);

const { emit } = useEventBus();

const handleRemove: UploadProps['onRemove'] = (uploadFile, uploadFiles) => {
  console.log(uploadFile, uploadFiles);
};

const handlePictureCardPreview: UploadProps['onPreview'] = (uploadFile) => {
  dialogImageUrl.value = uploadFile.url!;
  dialogVisible.value = true;
};

const handleSuccess: UploadProps['onSuccess'] = (res, uploadFile) => {
  emit('uploadImage', uploadFile);
};

function doUpload() {
  return Promise.resolve();
}
</script>

<style lang="scss" scoped>
.upload-image {
  :deep(.el-upload-list__item) {
    width: 80px;
    height: 80px;
  }
  :deep(.el-upload--picture-card) {
    width: 80px;
    height: 80px;
  }
}
</style>
