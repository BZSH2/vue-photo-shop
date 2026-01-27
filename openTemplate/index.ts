/*
 处理 PSD 文件
 1. 读取 PSD 文件 压缩为zip包
 2. 处理 PSD 文件中的图层
 3. 生成配置文件
 这里的处理其实是偏前端的，因为前端需要的是图片和配置文件，而不是 PSD 文件
 但是我想打造一个纯前端的项目，所以我需要在前端处理 PSD 文件
 所以我在项目运行或打包时，运行这个文件，生成配置文件和图片
*/
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createCanvas } from '@napi-rs/canvas';
import { initializeCanvas, readPsd } from 'ag-psd';
import JSZip from 'jszip';

// ES模块中获取 __filename
const __filename = '';
const __dirname = path.dirname(__filename);

// 关键：在使用 ag-psd 前初始化 Canvas
initializeCanvas(createCanvas as any);

// 配置
const CONFIG: OpenTemplate.Config = {
  inputDir: path.join(__dirname, 'public/templates/files'),
  outputDir: path.join(__dirname, 'public/templates/psd'),
  configFile: path.join(__dirname, 'public/templates/config.json'),
};

/**
 * 清理旧文件
 */
async function cleanupOldFiles(): Promise<void> {
  console.log('🧹 清理旧的生成文件...');
  try {
    // 使用 fs.rm 删除文件夹（递归删除）
    if (fs.existsSync(CONFIG.outputDir)) {
      await fs.promises.rm(CONFIG.outputDir, {
        recursive: true, // 递归删除
        force: true, // 即使文件夹非空也删除
      });
      console.log(`清理成功`);
    }
  }
  catch (error) {
    console.log(`清理失败: ${error}`);
  }
}

/**
 * 确保目录存在 并创建
 */
function ensureDirectory(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * PSD 模板信息
 * @param psdPath PSD文件路径
 * @param fileName 文件名
 * @param outputZipPath 输出ZIP文件路径
 * @param width 预览图宽度
 * @param height 预览图高度
 * @param image 预览图路径
 * @returns
 */
function getTemplateInfo(
  psdPath: string,
  fileName: string,
  outputZipPath: string,
  width: number,
  height: number,
  imagePath: string,
): OpenTemplate.Template {
  const template: OpenTemplate.Template = {
    name: fileName,
    inputPsdPath: psdPath,
    zipFile: outputZipPath,
    width,
    height,
    image: imagePath,
  };
  return template;
}

/**
 * 生成配置文件
 */
async function generateConfigFile(templates: OpenTemplate.Template[]): Promise<void> {
  const config: OpenTemplate.TemplateConfig = {
    version: '1.0.0',
    count: templates.length,
    templates,
  };

  ensureDirectory(path.dirname(CONFIG.configFile));
  fs.writeFileSync(CONFIG.configFile, JSON.stringify(config, null, 2));

  console.log(`\n${'='.repeat(50)}`);
  console.log(`✅ 配置文件已生成: ${CONFIG.configFile}`);
  console.log(`📊 处理了 ${templates.length} 个模板`);

  if (templates.length > 0) {
    console.log('\n生成的模板列表:');
    templates.forEach((template, index) => {
      console.log(`${index + 1}. ${template.name}`);
    });

    console.log('\n📁 生成的目录结构:');
    console.log(`  ${CONFIG.outputDir}/`);
    console.log(`  ├── 模板ID/`);
    console.log(`  │   ├── 模板ID.jpg    # 预览图`);
    console.log(`  │   └── 模板ID.zip    # 压缩包`);
    console.log(`  └── ...`);
  }
}

/**
 * 扫描并处理PSD文件
 */
async function scanAndProcessPsdFiles(): Promise<OpenTemplate.Template[]> {
  console.log(`输入目录: ${CONFIG.inputDir}`);

  /** 输入目录验证 */
  if (!fs.existsSync(CONFIG.inputDir)) {
    console.log(`输入目录不存在，创建目录...`);
    ensureDirectory(CONFIG.inputDir);
    console.log(`请将PSD文件放入: ${CONFIG.inputDir}`);
    return [];
  }

  /** 输出目录创建 */
  ensureDirectory(CONFIG.outputDir);
  console.log(`✅ 已成功创建输出: ${CONFIG.outputDir}`);

  /** 读取输入目录下的所有文件并筛选psd文件 */
  const files = fs.readdirSync(CONFIG.inputDir);
  const psdFiles = files.filter(file => /\.(?:psd|ps)$/i.test(file));
  console.log(`找到 ${psdFiles.length} 个PSD文件`);

  /** 用于储存目标模板信息 */
  const templates: OpenTemplate.Template[] = [];

  const zip = new JSZip();

  /** 处理每个PSD文件 */
  for (let i = 0; i < psdFiles.length; i++) {
    const file = psdFiles[i]; // 目标文件名
    const psdPath = path.join(CONFIG.inputDir, file || ''); // 当前输入文件路径

    console.log(`\n🔧 [${i + 1}/${psdFiles.length}] 处理: ${file}`);
    console.log(`读取 PSD 文件: ${psdPath}`);

    // 获取文件名
    const fileName = path.basename(psdPath).replace(/\.[^/.]+$/, '');

    // 完整输出 文件夹
    const outputPath = path.join(CONFIG.outputDir, `${fileName}`);

    // 1. 检查输出目录是否存在 并创建
    if (!fs.existsSync(outputPath)) {
      // console.log(`📁 目录不存在: ${outputPath}`);
      fs.mkdirSync(outputPath, { recursive: true });
      console.log(`✅ 已创建目录: ${outputPath}`);
    }

    // 2. 读取 PSD 文件
    const psdData = fs.readFileSync(psdPath);

    // 3. 添加文件到 ZIP
    zip.file(fileName, psdData);
    const content = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE', // 使用压缩
      compressionOptions: {
        level: 9, // 最大压缩级别
      },
    });

    // 4.写入zip到输出目录
    const outputZipPath = path.join(outputPath, `${fileName}.zip`);
    fs.writeFileSync(outputZipPath, content);
    console.log(`✅ 已写入 ZIP 文件: ${outputZipPath}`);

    // 5. 使用readPsd读取PSD文件
    const psd: any = readPsd(psdData, {
      skipLayerImageData: false, // 必须为 false
      skipCompositeImageData: false, // 必须为 false
      skipThumbnail: false, // 如果需要缩略图
    });

    // 6. 转换为 PNG 并保存
    const { width, height } = psd.canvas;
    console.log(`PSD 宽度: ${width}, 高度: ${height}`);
    const pngBuffer = psd.canvas?.toBuffer('image/png');
    const imagePath = path.join(outputPath, `${fileName}.png`);
    fs.writeFileSync(imagePath, pngBuffer);
    console.log(`✅ 已转换为 PNG 文件: ${imagePath}`);

    const template: OpenTemplate.Template = getTemplateInfo(
      psdPath,
      fileName,
      outputZipPath,
      width,
      height,
      imagePath,
    );
    templates.push(template);
  }

  return templates;
}

/**
 * 主函数
 */
async function main(): Promise<void> {
  try {
    cleanupOldFiles();
    const templates = await scanAndProcessPsdFiles();

    await generateConfigFile(templates);

    console.log(`\n${'='.repeat(50)}`);
    console.log('✅ 处理完成！');

    if (templates.length === 0) {
      console.log('\n💡 使用说明:');
      console.log(`1. 将PSD文件放入: ${CONFIG.inputDir}`);
      console.log('2. 重新运行此脚本');
      console.log(`3. 查看生成的配置文件: ${CONFIG.configFile}`);
    }
  }
  catch (error) {
    console.error('\n❌ 处理失败:', error);
    process.exit(1);
  }
}

// 运行主函数
main().catch(console.error);
