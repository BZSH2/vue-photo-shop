import type { App as VueApp } from 'vue';
import { createPinia } from 'pinia';
import { createApp } from 'vue';
import App from './App.vue';
import { startMicroFrontend } from './host';
import router from './router';
import '@/styles/index.scss';

let app: VueApp<Element> | null = null;

function render(props: any = {}): void {
  const { container } = props;
  app = createApp(App);
  app.use(createPinia());
  app.use(router);
  const mountPoint = container ? container.querySelector('#app') : '#app';
  app.mount(mountPoint as Element | string);
}

export async function bootstrap(): Promise<void> {
  // 预加载，仅在被主应用加载时调用一次
}

export async function mount(props: any): Promise<void> {
  render(props);
}

export async function unmount(): Promise<void> {
  app?.unmount();
  app = null;
}

if (!(window as any).__POWERED_BY_QIANKUN__) {
  render();
  router.isReady().then(() => startMicroFrontend());
}
