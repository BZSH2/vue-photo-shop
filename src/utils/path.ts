// src/utils/path.js
export function getPublicPath(): string {
  // 如果是本地开发环境
  if (import.meta.env.DEV) {
    return '';
  }

  // 生产环境（GitHub Pages）使用 GitHub 的原始媒体链接
  // 替换为你的 GitHub 用户名和仓库名
  return 'https://media.githubusercontent.com/media/BZSH2/vue-photo-shop/master/public';
}
