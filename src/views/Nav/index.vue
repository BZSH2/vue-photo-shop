<template>
  <nav class="nav-panel">
    <NavAside v-model="active" />
    <NavInner v-model="active">
      <template v-if="active === 'template'">
        <TemplateNav />
      </template>
    </NavInner>
  </nav>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import TemplateNav from '@/components/Nav/Template/index.vue';
import NavAside from './components/NavAside.vue';
import NavInner from './components/NavInner.vue';

const active = ref('template');
</script>

<style lang="scss" scoped>
.nav-panel {
  height: 100%;
  display: flex;
}
</style>
