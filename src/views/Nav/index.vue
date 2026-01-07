<template>
  <nav class="nav-panel">
    <NavAside :active="active" />
    <div class="nav-inner">
      222
    </div>
  </nav>
</template>

<script setup lang="ts">
import { ref } from "vue";
import NavAside from "./components/NavAside.vue";

const active = ref("add");
</script>

<style lang="scss" scoped>
.nav-panel {
  height: 100%;
  display: flex;
}

.nav-inner {
  height: 100%;
  width: 200px;
  background-color: var(--background-color-primary-regular);
  border-right: 1px solid var(--background-color-divider-regular);
}
</style>
