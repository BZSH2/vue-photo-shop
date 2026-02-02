// src/utils/path.js
export function getPublicPath(): string {
  // 保持原有逻辑，用于获取部署后的相对路径（非 LFS 资源）
  // 注意：import.meta.env.BASE_URL 通常以 / 结尾（例如 "./" 或 "/repo/"）
  // 不要移除末尾的 /，否则会导致拼接路径时出错（如 ".templates"）
  return import.meta.env.BASE_URL;
}

export function getLfsPath(): string {
  // 生产环境（GitHub Pages）使用 GitHub 的原始媒体链接获取 LFS 资源
  // 替换为你的 GitHub 用户名和仓库名
  if (import.meta.env.DEV) {
    return '';
  }
  return 'https://media.githubusercontent.com/media/BZSH2/vue-photo-shop/master/public/';
}
