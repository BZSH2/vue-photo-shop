<template>
  <div class="template-group">
    <div v-for="(items, key) in templateList" :key="key" class="template-group-item">
      <div
        v-for="item in items"
        :key="item.name" class="template-item"
        :class="{ 'template-item-first': key === 0, 'template-item-second': key === 1 }"
        @click="handleClick(item)"
      >
        <img :src="`${path}${item.image}`" class="template-image">
        <span class="template-name">{{ item.name }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useEventBus } from '@/hooks/useEventBus';
import { getPublicPath } from '@/utils/path';

const templateList = ref<any[]>([]);
const { emit } = useEventBus();
const path = getPublicPath();
const configUrl = `${path}templates/config.json`;

/** 获取本地psd文件 */
async function getFolders() {
  const res = await fetch(configUrl);
  const data = await res.json();
  return data.templates;
}

/** 点击模板 */
function handleClick(item: any) {
  emit('selectTemplate', item);
}

// 优化算法版本：尝试交换项目来获得更平衡的布局
function splitTemplatesOptimally(templates: any[]) {
  const targetWidth = 100;

  // 计算缩放后高度
  const items = templates.map(item => ({
    ...item,
    scaledHeight: Math.round(item.height * (targetWidth / item.width)),
  }));

  // 初始分配（按高度降序）
  const itemsSorted = [...items].sort((a, b) => b.scaledHeight - a.scaledHeight);

  const column1: any[] = [];
  const column2: any[] = [];
  let col1Height = 0;
  let col2Height = 0;

  // 基本分配
  for (const item of itemsSorted) {
    if (col1Height <= col2Height) {
      column1.push(item);
      col1Height += item.scaledHeight;
    }
    else {
      column2.push(item);
      col2Height += item.scaledHeight;
    }
  }

  // 计算高度差
  let heightDiff = Math.abs(col1Height - col2Height);
  let improved = true;

  // 尝试优化：交换项目来减少高度差
  while (improved) {
    improved = false;

    for (let i = 0; i < column1.length; i++) {
      for (let j = 0; j < column2.length; j++) {
        const item1 = column1[i];
        const item2 = column2[j];

        // 如果交换后能减少高度差
        const newCol1Height = col1Height - item1.scaledHeight + item2.scaledHeight;
        const newCol2Height = col2Height - item2.scaledHeight + item1.scaledHeight;
        const newDiff = Math.abs(newCol1Height - newCol2Height);

        if (newDiff < heightDiff) {
          // 执行交换
          column1[i] = item2;
          column2[j] = item1;
          col1Height = newCol1Height;
          col2Height = newCol2Height;
          heightDiff = newDiff;
          improved = true;
        }
      }
    }
  }

  // 返回结果，去除scaledHeight
  return [
    column1.map(({ scaledHeight, ...rest }) => rest),
    column2.map(({ scaledHeight, ...rest }) => rest),
  ];
}

onMounted(async () => {
  templateList.value = splitTemplatesOptimally(await getFolders() as any[]);
  console.log(templateList.value, 'aaaaaaaaaaaaa');
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
