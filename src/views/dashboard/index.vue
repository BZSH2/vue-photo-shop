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
    <template #aside>
      <Aside />
    </template>
  </Layout>
</template>

<script setup lang="ts">
import Layout from '@/components/Layout/index.vue';
import Aside from '@/views/Aside/index.vue';
import Header from '@/views/Header/index.vue';
import Main from '@/views/Main/index.vue';
import Nav from '@/views/Nav/index.vue';
</script>
