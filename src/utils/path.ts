// src/utils/path.js
export function getPublicPath(): string {
  // 保持原有逻辑，用于获取部署后的相对路径（非 LFS 资源）
  return import.meta.env.BASE_URL === '/' ? '' : import.meta.env.BASE_URL.replace(/\/$/, '');
}

export function getLfsPath(): string {
  // 生产环境（GitHub Pages）使用 GitHub 的原始媒体链接获取 LFS 资源
  // 替换为你的 GitHub 用户名和仓库名
  if (import.meta.env.DEV) {
    return '';
  }
  return 'https://media.githubusercontent.com/media/BZSH2/vue-photo-shop/master/public/';
}
