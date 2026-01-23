// build-templates.ts
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as PSD from 'ag-psd';
import { createCanvas, Image } from 'canvas';
import JSZip from 'jszip';
import sharp from 'sharp';

// ES模块中获取 __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 配置接口
interface Config {
  inputDir: string;
  outputDir: string;
  configFile: string;
  previewWidth: number;
  previewHeight: number;
  imageQuality: number;
  zipLevel: number;
  maxFileSizeMB: number;
}

// 简化的模板接口
interface Template {
  name: string; // 模板名称
  preview: string; // 预览图地址
  zipFile: string; // ZIP文件地址
  width: number; // 预览图宽度
  height: number; // 预览图高度
  fileName: string; // 原始文件名
  originalWidth: number; // 原始PSD宽度
  originalHeight: number; // 原始PSD高度
}

// 配置文件接口
interface TemplateConfig {
  version: string;
  count: number;
  templates: Template[];
}

// 配置
const CONFIG: Config = {
  inputDir: path.join(__dirname, 'public/templates/files'),
  outputDir: path.join(__dirname, 'public/templates/psd'),
  configFile: path.join(__dirname, 'public/templates/config.json'),
  previewWidth: 800,
  previewHeight: 600,
  imageQuality: 85,
  zipLevel: 9,
  maxFileSizeMB: 500,
};

/**
 * 确保目录存在
 */
function ensureDirectory(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * 从文件名生成模板名称
 */
function generateName(fileName: string): string {
  const nameWithoutExt = path.basename(fileName, path.extname(fileName));
  return nameWithoutExt
    .replace(/[_-]/g, ' ')
    .replace(/\bPSD\b/gi, '')
    .trim();
}

/**
 * 从文件名提取ID
 */
function extractId(fileName: string): string {
  const nameWithoutExt = path.basename(fileName, path.extname(fileName));
  return nameWithoutExt
    .replace(/\W/g, '')
    .toLowerCase();
}

/**
 * 获取PSD文件尺寸
 */
async function getPsdSize(psdPath: string): Promise<{ width: number; height: number }> {
  try {
    const buffer = fs.readFileSync(psdPath);
    const psd = PSD.readPsd(buffer, {
      skipLayerImageData: true,
      skipCompositeImageData: false,
      skipThumbnail: true,
    });

    if (!psd) {
      return { width: CONFIG.previewWidth, height: CONFIG.previewHeight };
    }

    return {
      width: psd.width || CONFIG.previewWidth,
      height: psd.height || CONFIG.previewHeight,
    };
  }
  catch (error) {
    console.log(`获取PSD尺寸失败: ${error}`);
    return { width: CONFIG.previewWidth, height: CONFIG.previewHeight };
  }
}

/**
 * 从PSD生成预览图
 */
async function generatePreview(
  psdPath: string,
  outputPath: string,
  originalSize: { width: number; height: number },
): Promise<{ width: number; height: number }> {
  try {
    const buffer = fs.readFileSync(psdPath);
    const psd = PSD.readPsd(buffer, {
      skipLayerImageData: true,
      skipCompositeImageData: false,
      skipThumbnail: false,
    });

    if (psd?.canvas) {
      // 使用canvas的toBuffer方法
      const canvas = psd.canvas as any;

      // 检查是否有toBuffer方法
      if (typeof canvas.toBuffer === 'function') {
        const pngBuffer = canvas.toBuffer('image/png');

        const scale = Math.min(
          CONFIG.previewWidth / originalSize.width,
          CONFIG.previewHeight / originalSize.height,
          1,
        );

        const targetWidth = Math.round(originalSize.width * scale);
        const targetHeight = Math.round(originalSize.height * scale);

        await sharp(pngBuffer)
          .resize(targetWidth, targetHeight, {
            fit: 'contain',
            background: { r: 255, g: 255, b: 255, alpha: 1 },
          })
          .jpeg({ quality: CONFIG.imageQuality, mozjpeg: true })
          .toFile(outputPath);

        return { width: targetWidth, height: targetHeight };
      }
      else if (canvas.toDataURL) {
        // 如果只有toDataURL方法
        const dataUrl = canvas.toDataURL('image/png');
        const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
        const pngBuffer = Buffer.from(base64Data, 'base64');

        const scale = Math.min(
          CONFIG.previewWidth / originalSize.width,
          CONFIG.previewHeight / originalSize.height,
          1,
        );

        const targetWidth = Math.round(originalSize.width * scale);
        const targetHeight = Math.round(originalSize.height * scale);

        await sharp(pngBuffer)
          .resize(targetWidth, targetHeight, {
            fit: 'contain',
            background: { r: 255, g: 255, b: 255, alpha: 1 },
          })
          .jpeg({ quality: CONFIG.imageQuality, mozjpeg: true })
          .toFile(outputPath);

        return { width: targetWidth, height: targetHeight };
      }
    }
  }
  catch (error) {
    console.log(`生成预览图失败: ${error}`);
  }

  // 生成简单的占位图
  await sharp({
    create: {
      width: CONFIG.previewWidth,
      height: CONFIG.previewHeight,
      channels: 3,
      background: { r: 240, g: 240, b: 240 },
    },
  })
    .jpeg({ quality: CONFIG.imageQuality })
    .toFile(outputPath);

  return { width: CONFIG.previewWidth, height: CONFIG.previewHeight };
}

/**
 * 创建ZIP压缩包
 */
async function createZip(psdPath: string, outputPath: string): Promise<boolean> {
  try {
    const zip = new JSZip();
    const fileName = path.basename(psdPath);
    const psdData = fs.readFileSync(psdPath);

    zip.file(fileName, psdData);

    const zipData = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: {
        level: CONFIG.zipLevel,
      },
    });

    fs.writeFileSync(outputPath, zipData);
    return true;
  }
  catch (error) {
    console.log(`创建ZIP失败: ${error}`);
    return false;
  }
}

/**
 * 处理单个PSD文件
 */
async function processPsdFile(psdPath: string): Promise<Template | null> {
  const fileName = path.basename(psdPath);
  const fileExt = path.extname(fileName).toLowerCase();

  if (fileExt !== '.psd' && fileExt !== '.ps') {
    console.log(`跳过非PSD文件: ${fileName}`);
    return null;
  }

  const stats = fs.statSync(psdPath);
  const fileSizeMB = stats.size / 1024 / 1024;

  console.log(`处理文件: ${fileName} (${fileSizeMB.toFixed(2)} MB)`);

  if (fileSizeMB > CONFIG.maxFileSizeMB) {
    console.log(`文件过大，跳过处理`);
    return null;
  }

  const id = extractId(fileName);
  const originalSize = await getPsdSize(psdPath);
  const outputDir = path.join(CONFIG.outputDir, id);

  ensureDirectory(outputDir);

  const previewPath = path.join(outputDir, `${id}.jpg`);
  const previewSize = await generatePreview(psdPath, previewPath, originalSize);

  const zipPath = path.join(outputDir, `${id}.zip`);
  const zipCreated = await createZip(psdPath, zipPath);

  if (!zipCreated) {
    console.log(`创建ZIP失败，跳过文件`);
    return null;
  }

  const template: Template = {
    name: generateName(fileName),
    preview: `/templates/psd/${id}/${id}.jpg`,
    zipFile: `/templates/psd/${id}/${id}.zip`,
    width: previewSize.width,
    height: previewSize.height,
    fileName,
    originalWidth: originalSize.width,
    originalHeight: originalSize.height,
  };

  console.log(`生成成功:`);
  console.log(`  预览图: ${template.preview} (${template.width}x${template.height})`);
  console.log(`  ZIP文件: ${template.zipFile}`);
  console.log(`  原始尺寸: ${template.originalWidth}x${template.originalHeight}`);

  return template;
}

/**
 * 扫描并处理PSD文件
 */
async function scanAndProcessPsdFiles(): Promise<Template[]> {
  console.log('='.repeat(50));
  console.log('🔍 扫描PSD文件...');
  console.log(`输入目录: ${CONFIG.inputDir}`);

  if (!fs.existsSync(CONFIG.inputDir)) {
    console.log(`输入目录不存在，创建目录...`);
    ensureDirectory(CONFIG.inputDir);
    console.log(`请将PSD文件放入: ${CONFIG.inputDir}`);
    return [];
  }

  ensureDirectory(CONFIG.outputDir);
  const files = fs.readdirSync(CONFIG.inputDir);
  const psdFiles = files.filter(file => /\.(psd|ps)$/i.test(file));

  console.log(`找到 ${psdFiles.length} 个PSD文件`);

  const templates: Template[] = [];

  for (let i = 0; i < psdFiles.length; i++) {
    const file = psdFiles[i];
    console.log(`\n🔧 [${i + 1}/${psdFiles.length}] 处理: ${file}`);

    try {
      const template = await processPsdFile(path.join(CONFIG.inputDir, file));
      if (template) {
        templates.push(template);
      }
    }
    catch (error) {
      console.log(`处理失败: ${(error as Error).message}`);
    }
  }

  return templates;
}

/**
 * 生成配置文件
 */
async function generateConfigFile(templates: Template[]): Promise<void> {
  const config: TemplateConfig = {
    version: '1.0.0',
    count: templates.length,
    templates,
  };

  fs.writeFileSync(CONFIG.configFile, JSON.stringify(config, null, 2));
  console.log(`\n${'='.repeat(50)}`);
  console.log(`✅ 配置文件已生成: ${CONFIG.configFile}`);
  console.log(`📊 处理了 ${templates.length} 个模板`);

  if (templates.length > 0) {
    console.log('\n生成的模板列表:');
    templates.forEach((template, index) => {
      console.log(`${index + 1}. ${template.name}`);
      console.log(`   预览: ${template.width}x${template.height} (原始: ${template.originalWidth}x${template.originalHeight})`);
      console.log(`   文件: ${template.fileName}`);
    });
  }
}

/**
 * 清理旧文件
 */
function cleanupOldFiles(): void {
  console.log('🧹 清理旧的生成文件...');
  try {
    if (fs.existsSync(CONFIG.outputDir)) {
      const items = fs.readdirSync(CONFIG.outputDir, { withFileTypes: true });
      let deletedCount = 0;

      for (const item of items) {
        if (item.isDirectory()) {
          const itemPath = path.join(CONFIG.outputDir, item.name);
          fs.rmSync(itemPath, { recursive: true, force: true });
          deletedCount++;
        }
      }

      console.log(`清理了 ${deletedCount} 个目录`);
    }
  }
  catch (error) {
    console.log(`清理失败: ${(error as Error).message}`);
  }
}

/**
 * 主函数
 */
async function main(): Promise<void> {
  console.log('🚀 PSD模板生成系统');
  console.log('='.repeat(50));

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
