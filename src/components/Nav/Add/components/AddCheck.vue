<template>
  <div class="add-check-list">
    <div v-for="item in addList" :key="item.value" class="add-check-item" @click="handleClick(item)">
      <span class="add-check-item-value">{{ item.value }}</span>
      <span class="add-check-item-label">{{ item.label }}</span>
    </div>
  </div>
</template>

<script lang="ts" setup>
const { emit } = useEventBus();

const addList: Text.Item[] = [
  {
    label: '标题',
    value: 'H1',
    key: 'h1',
    fontSize: 40,
  },
  {
    label: '副标题',
    value: 'H2',
    key: 'h2',
    fontSize: 30,
  },
  {
    label: '正文',
    value: 'Aa',
    key: 'aa',
    fontSize: 12,
  },
];

function handleClick(item: Text.Item) {
  emit('selectAddText', item);
}
</script>

<style scoped lang="scss">
.add-check-list {
  display: flex;
  flex-wrap: wrap;

  .add-check-item {
    width: 80px;
    height: 74px;
    background-color: #f1f2f4;
    border-radius: 12px;
    margin-right: 12px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    cursor: pointer;

    .add-check-item-value {
      font-size: 16px;
      font-weight: bold;
      color: #222222;
    }

    &:hover {
      background-color: #e8eaec;
    }
  }
}
</style>
