/**  @type {import('lint-staged').Config} */
export default {
  "*.{js,jsx,ts,tsx}": ["eslint --fix", "git add"],
  "*.json": ["prettier --write", "git add"], // JSON 文件检查 ：JSON 文件通常使用 prettier 进行格式化
  "*.vue": ["eslint --fix", "git add"],
  "*.{scss,less,styl,html}": ["stylelint --fix --allow-empty-input", "git add"],
  "*.md": ["prettier --write", "git add"],
};
