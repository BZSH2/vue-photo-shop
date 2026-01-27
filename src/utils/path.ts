// src/utils/path.js
export function getPublicPath(): string {
  const base = import.meta.env.BASE_URL;
  return base === '/' ? '' : base.replace(/\/$/, '');
}
