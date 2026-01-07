<template>
  <div class="layout-container">
    <Header />
    <div>
      <Nav />
      <Main />
      <Aside />
    </div>
  </div>
</template>

<script setup lang="ts">
import Aside from "./components/Aside.vue";
import Header from "./components/Header.vue";
import Main from "./components/Main.vue";
import Nav from "./components/Nav.vue";
</script>

<style lang="scss" scoped>
.layout-container {
  background-color: var(--background-color-secondary-regular);
}
</style>
