<template>
  <Layout>
    <template #header>
      <Header />
    </template>
    <template #nav>
      <Nav />
    </template>
    <template #main>
      <Main />
    </template>
  </Layout>
</template>

<script setup lang="ts">
import Layout from "@/components/Layout/index.vue";
import Header from "@/views/Header/index.vue";
import Main from "@/views/Main/index.vue";
import Nav from "@/views/Nav/index.vue";
</script>
