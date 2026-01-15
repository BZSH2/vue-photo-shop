<template>
  <div class="template-group">
    <div v-for="(items, key) in templateList" :key="key" class="template-group-item">
      <div
        v-for="item in items"
        :key="item.name" class="template-item"
        :class="{ 'template-item-first': key === 0, 'template-item-second': key === 1 }"
        @click="handleClick(item)"
      >
        <img :src="item.image" class="template-image">
        <span class="template-name">{{ item.name }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';

const templateList = ref<any[]>([]);

/** 获取本地psd文件 */
async function getFolders() {
  const basePath = '/src/assets/psd';
  const suffixList = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'avif'];
  const modules = import.meta.glob(`/src/assets/psd/**/*`, {
    eager: true,
    query: '?url',
  });

  const folderMap: any = {};

  const first: any[] = [];
  const second: any[] = [];
  let firstHeight = 0;
  let secondHeight = 0;

  // 使用 for...of 替代 forEach
  const paths = Object.keys(modules);
  for (const path of paths) {
    if (!path.startsWith(`${basePath}/`))
      continue;

    const relativePath = path.slice(basePath.length);
    const parts = relativePath.split('/');

    const folder = parts[1] as string; // 文件夹
    const fileName = parts[2] as string; // 文件名称
    const suffix = fileName.split('.').pop() as string; // 文件后缀

    if (!folderMap[folder]) {
      folderMap[folder] = {
        type: 'folder',
        name: folder,
        url: `${basePath}/${folder}`,
      };
    }

    if (suffix === 'psd') {
      folderMap[folder].psd = `${basePath}/${relativePath}`;
    }
    if (suffixList.includes(suffix.toLocaleLowerCase())) {
      const mod = modules[path] as any;
      const url = (mod?.default || mod) as string;
      folderMap[folder].image = url;
      const { width, height } = await getImageSize(url);
      folderMap[folder].width = width;
      folderMap[folder].height = height;
      const targetWidth = 100;
      const scale = targetWidth / width;
      const targetHeight = Math.round(height * scale);
      folderMap[folder].targetHeight = targetHeight;

      if (secondHeight >= firstHeight) {
        first.push(folderMap[folder]);
        firstHeight += targetHeight;
      }
      else {
        second.push(folderMap[folder]);
        secondHeight += targetHeight;
      }
    }
  }
  return [first, second];
}

/** 获取图片尺寸 */
function getImageSize(imageUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    if (!imageUrl) {
      reject(new Error('图片未找到'));
      return;
    }

    const img = new Image();
    img.onerror = () => {
      reject(new Error('图片加载失败'));
    };

    img.onload = () => {
      resolve({
        width: img.width,
        height: img.height,
      });
    };
    img.src = imageUrl;
  });
}

/** 点击模板 */
function handleClick(item: any) {
  console.log(item);
}

onMounted(async () => {
  templateList.value = await getFolders() as any[];
});
</script>

<style scoped lang="scss">
.template-group {
  display: flex;
  flex-direction: row;
}
.template-group-item {
  width: 50%;
}
.template-item {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 10px;
  border-radius: 5px;
  border: 1px solid #e4e7ed;
  margin: 12px;
  cursor: pointer;
  &.template-item-first {
    margin-right: 5px;
  }
  &.template-item-second {
    margin-left: 5px;
  }
  &:hover {
    box-shadow: 0px 0px 12px rgba(0, 0, 0, 0.12);
  }
  .template-image {
    width: 80%;
  }
  .template-name {
    font-size: 14px;
    font-weight: 700;
    color: #303133;
    padding-top: 12px;
  }
}
</style>
