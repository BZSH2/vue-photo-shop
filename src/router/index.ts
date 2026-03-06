import { createRouter, createWebHashHistory } from 'vue-router';
import Dashboard from '@/views/dashboard/index.vue';
import MicroHost from '@/views/MicroHost/index.vue';

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'dashboard',
      component: Dashboard,
    },
    {
      path: '/micro/:pathMatch(.*)*',
      name: 'micro',
      component: MicroHost,
    },
  ],
});

export default router;
