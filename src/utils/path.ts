// src/utils/path.js
export function getPublicPath(): string {
  // 如果是 GitHub Pages 环境
  if (window.location.host.includes('github.io')) {
    return '/vue-photo-shop/'; // 替换为你的仓库名
  }
  return '/'; // 开发环境
}
