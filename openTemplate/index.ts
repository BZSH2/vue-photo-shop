// build-templates.ts
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as PSD from 'ag-psd';
import JSZip from 'jszip';
import sharp from 'sharp';

// ES模块中获取 __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = '';

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
  return nameWithoutExt.toLowerCase();
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

    return {
      width: psd?.width || CONFIG.previewWidth,
      height: psd?.height || CONFIG.previewHeight,
    };
  }
  catch {
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
      const pngBuffer = psd.canvas.toBuffer('image/png');

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
  catch {
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
  }

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
    });

    fs.writeFileSync(outputPath, zipData);
    return true;
  }
  catch {
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
    return null;
  }

  const stats = fs.statSync(psdPath);
  const fileSizeMB = stats.size / 1024 / 1024;

  if (fileSizeMB > CONFIG.maxFileSizeMB) {
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
    return null;
  }

  return {
    name: generateName(fileName),
    preview: `/templates/psd/${id}/${id}.jpg`,
    zipFile: `/templates/psd/${id}/${id}.zip`,
    width: previewSize.width,
    height: previewSize.height,
    fileName,
    originalWidth: originalSize.width,
    originalHeight: originalSize.height,
  };
}

/**
 * 扫描并处理PSD文件
 */
async function scanAndProcessPsdFiles(): Promise<Template[]> {
  console.log('🔍 扫描PSD文件...');

  if (!fs.existsSync(CONFIG.inputDir)) {
    ensureDirectory(CONFIG.inputDir);
    return [];
  }

  ensureDirectory(CONFIG.outputDir);
  const files = fs.readdirSync(CONFIG.inputDir);
  const psdFiles = files.filter(file => /\.(psd|ps)$/i.test(file));

  console.log(`📊 找到 ${psdFiles.length} 个PSD文件`);

  const templates: Template[] = [];

  for (let i = 0; i < psdFiles.length; i++) {
    const file = psdFiles[i];
    console.log(`🔧 [${i + 1}/${psdFiles.length}] 处理: ${file}`);

    try {
      const template = await processPsdFile(path.join(CONFIG.inputDir, file));
      if (template) {
        templates.push(template);
        console.log(`  ✅ 生成预览: ${template.width}x${template.height}`);
        console.log(`     原始尺寸: ${template.originalWidth}x${template.originalHeight}`);
      }
    }
    catch (error) {
      console.log(`  ❌ 失败: ${(error as Error).message}`);
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
  console.log(`✅ 配置文件已生成: ${CONFIG.configFile}`);
  console.log(`📊 处理了 ${templates.length} 个模板`);
}

/**
 * 主函数
 */
async function main(): Promise<void> {
  console.log('🚀 PSD模板生成系统');
  console.log('='.repeat(40));

  try {
    const templates = await scanAndProcessPsdFiles();
    await generateConfigFile(templates);
    console.log('\n✅ 处理完成！');
  }
  catch (error) {
    console.error('\n❌ 处理失败:', error);
    process.exit(1);
  }
}

// 运行主函数
main().catch(console.error);
