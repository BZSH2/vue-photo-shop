export default {
  // 1. 基础配置，继承两个官方推荐的配置
  // stylelint-config-standard：Stylelint 的标准规则集，涵盖常见的 CSS 规范。
  // stylelint-config-recess-order：强制 CSS 属性按照特定顺序排列（如 position -> display -> margin 等），提高代码可读性。
  extends: ["stylelint-config-standard", "stylelint-config-recess-order", "stylelint-prettier/recommended"],

  // 2. 文件解析器
  overrides: [
    {
      files: ["**/*.(css|html|vue)"],
      customSyntax: "postcss-html", // 解析 CSS、HTML、Vue(如 Vue 的 <style> 块) 文件
    },
    // 选less可以注释scss
    {
      files: ["*.less", "**/*.less"],
      customSyntax: "postcss-less", // 解析 Less 文件
    },
    // 选sass可以注释上面的less
    {
      files: ["*.scss", "**/*.scss"],
      customSyntax: "postcss-scss", // 解析 SCSS 文件
      rules: {
        "scss/percent-placeholder-pattern": null, // 关闭 SCSS 占位符检查
        "scss/at-mixin-pattern": null, // 关闭 SCSS Mixin 命名检查
      },
    },
  ],

  // 3. 自定义规则
  rules: {
    // (1) 忽略某些规则: 这些规则被设为 null，表示不检查，通常是为了兼容项目特殊情况。
    "media-feature-range-notation": null, // 允许 `min-width: 768px` 或 `width >= 768px`
    "selector-not-notation": null, // 允许 `:not(.class)` 或 `:not(.class, .other)`
    "import-notation": null,
    "function-no-unknown": null, // 允许未知的 CSS 函数（如自定义函数）
    "selector-class-pattern": null, // 允许任意类名（默认强制 kebab-case）
    "no-empty-source": null, // 允许空样式文件
    "no-descending-specificity": null, // 允许低优先级选择器覆盖高优先级
    "font-family-no-missing-generic-family-keyword": null, // 允许 `font-family: Arial`（不强制加 `sans-serif`）
    "named-grid-areas-no-invalid": null, //  禁用对 CSS Grid 命名区域有效性的检查。

    // (2) 特殊伪类/伪元素处理: 允许 Vue 特有的伪类（如 :global）和伪元素（如 ::v-deep），避免误报。
    "selector-pseudo-class-no-unknown": [
      true,
      {
        ignorePseudoClasses: ["global", "deep"], // 允许 `:global` 和 `:deep`（Vue Scoped CSS）
      },
    ],
    "selector-pseudo-element-no-unknown": [
      true,
      {
        ignorePseudoElements: ["v-deep", ":deep"], // 允许 `::v-deep` 和 `::deep`（Vue 深度选择器）
      },
    ],

    // (3) 忽略未知的 @ 规则: 允许 TailwindCSS、SCSS/Less 的特殊语法（如 @apply、@mixin）
    "at-rule-no-unknown": [
      true,
      {
        ignoreAtRules: [
          // TailwindCSS
          "tailwind",
          "apply",
          "variants",

          // SCSS/Less 控制语句
          "function",
          "if",
          "each",

          // SCSS Mixins
          "include",
          "mixin",
          "extend",

          // "use",
          // "responsive",
          // "screen",
        ],
      },
    ],

    // (4) 其他重要规则
    "unit-no-unknown": [true, { ignoreUnits: ["rpx"] }], // 允许微信小程序的 `rpx` 单位
    "rule-empty-line-before": [// 规则前空行（注释后除外）
      "always",
      {
        ignore: ["after-comment", "first-nested"],
      },
    ],
    "property-no-vendor-prefix": [ // 允许 `-webkit-` 前缀
      true,
      {
        ignoreProperties: ["background-clip"],
      },
    ],

    // (5) CSS 属性顺序（重要！）
    // "order/order": [
    //   [
    //     "dollar-variables", // $variables
    //     "custom-properties", // --css-vars
    //     "at-rules", // @media, @keyframes
    //     "declarations", // 普通 CSS 属性
    //     { type: "at-rule", name: "supports" }, // @supports
    //     { type: "at-rule", name: "media" }, // @media
    //     "rules", // 嵌套规则
    //   ],
    //   { severity: "error" }, // 违反时报错（非警告）
    // ],
  },

  // 4. 忽略文件: 不检查 .js、.jsx、.tsx、.ts 文件（Stylelint 只处理样式文件）
  ignoreFiles: ["**/*.js", "**/*.jsx", "**/*.tsx", "**/*.ts"],
};
