type MicroApp = {
  name: string
  entry: string
  container: string
  activeRule: string | ((location: Location) => boolean)
  props?: any
}

declare global {
  interface Window {
    qiankun?: any
    __MICRO_APPS__?: MicroApp[]
  }
}

function getApps(): MicroApp[] {
  const defaultApps: MicroApp[] = [
    {
      name: 'vue-admin',
      entry: import.meta.env.DEV ? 'http://localhost:3000/' : 'https://bzsh2.github.io/vue-admin/',
      container: '#subapp-container',
      activeRule: (location) => location.hash.startsWith('#/micro/vue-admin'),
      props: {
        routerBase: '/micro/vue-admin',
      },
    },
  ]
  try {
    const fromStorage = localStorage.getItem('MICRO_APPS')
    if (fromStorage) {
      return JSON.parse(fromStorage)
    }
  } catch {}
  if (Array.isArray(window.__MICRO_APPS__)) {
    return window.__MICRO_APPS__ as MicroApp[]
  }
  return defaultApps
}

function loadQiankun(): Promise<any> {
  if (window.qiankun) {
    return Promise.resolve(window.qiankun)
  }
  return new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://unpkg.com/qiankun/dist/qiankun.umd.min.js'
    s.onload = () => resolve((window as any).qiankun)
    s.onerror = () => reject(new Error('load qiankun failed'))
    document.head.appendChild(s)
  })
}

export async function startMicroFrontend(): Promise<void> {
  const q = await loadQiankun()
  const apps = getApps()
  if (!apps.length) {
    return
  }
  q.registerMicroApps(apps)
  q.addGlobalUncaughtErrorHandler(() => {})
  q.start({
    prefetch: true,
    sandbox: { experimentalStyleIsolation: true },
  })
}
