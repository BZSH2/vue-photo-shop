namespace OpenTemplate {
  // 配置接口
  interface Config {
    inputDir: string;
    outputDir: string;
    configFile: string;
    publicDir: string;
  }

  // 简化的模板接口
  interface Template {
    name: string; // 模板名称
    inputPsdPath: string; // 输入PSD文件路径
    zipFile: string; // ZIP文件地址
    width: number; // 预览图宽度
    height: number; // 预览图高度
    image: string; // 预览图路径
  }

  // 配置文件接口
  interface TemplateConfig {
    version: string;
    count: number;
    templates: Template[];
  }
}
