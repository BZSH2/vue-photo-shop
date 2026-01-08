<template>
  <nav class="nav-panel">
    <NavAside v-model="active" />
    <NavInner v-model="active">
      {{ active }}
    </NavInner>
  </nav>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import NavAside from './components/NavAside.vue';
import NavInner from './components/NavInner.vue';

const active = ref('');
</script>

<style lang="scss" scoped>
.nav-panel {
  height: 100%;
  display: flex;
}
</style>
