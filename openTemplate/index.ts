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
  imageWidth: number;
  imageHeight: number;
  imageQuality: number;
  zipLevel: number;
  maxFileSizeMB: number; // 最大处理的文件大小
}

interface PsdMetadata {
  id: string;
  name: string;
  fileName: string;
  fileSize: number;
  fileSizeMB: number;
  width: number;
  height: number;
  layers: number;
  previewImage: string;
  zipFile: string;
  zipSize: number;
  zipSizeMB: number;
  createdAt: string;
  updatedAt: string;
  format: 'PSD';
  hasPreview: boolean;
  hasZip: boolean;
  tags: string[];
  category?: string;
  description?: string;
  downloadUrl?: string;
  colorMode?: string;
  resolution?: number;
  previewGeneratedFromPsd: boolean;
}

interface TemplateConfig {
  generatedAt: string;
  version: string;
  count: number;
  templates: PsdMetadata[];
  stats: {
    totalSize: number;
    totalSizeMB: number;
    dimensions: {
      minWidth: number;
      maxWidth: number;
      minHeight: number;
      maxHeight: number;
    };
    layers: {
      min: number;
      max: number;
      avg: number;
    };
  };
  summary: {
    byCategory: Record<string, number>;
    withPreviewFromPsd: number;
    withPlaceholderPreview: number;
    withZip: number;
  };
}

// 配置
const CONFIG: Config = {
  inputDir: path.join(__dirname, 'public/templates/files'),
  outputDir: path.join(__dirname, 'public/templates/psd'),
  configFile: path.join(__dirname, 'public/templates/config.json'),
  imageWidth: 800,
  imageHeight: 600,
  imageQuality: 85,
  zipLevel: 9,
  maxFileSizeMB: 500, // 最大处理500MB的文件
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
 * 从文件名提取ID
 */
function extractIdFromFileName(fileName: string): string {
  const nameWithoutExt = path.basename(fileName, path.extname(fileName));
  const match = nameWithoutExt.match(/\d+/);
  if (match) {
    return `psd${match[0]}`;
  }
  return nameWithoutExt
    .replace(/[^\w-]/g, '')
    .toLowerCase();
}

/**
 * 从ID生成名称
 */
function generateNameFromId(id: string, originalName: string): string {
  const numMatch = id.match(/\d+/);
  if (numMatch) {
    const num = Number.parseInt(numMatch[0]);
    if (!isNaN(num)) {
      if (num >= 40000 && num < 41000)
        return `海报设计模板 PSD${num}`;
      if (num >= 41000 && num < 42000)
        return `社交媒体模板 PSD${num}`;
      if (num >= 42000 && num < 43000)
        return `电商设计模板 PSD${num}`;
      if (num >= 43000 && num < 44000)
        return `广告设计模板 PSD${num}`;
      if (num >= 44000 && num < 45000)
        return `UI设计模板 PSD${num}`;
      if (num >= 45000 && num < 46000)
        return `名片设计模板 PSD${num}`;
    }
  }
  return originalName
    .replace(/(\.psd|\.ps)$/i, '')
    .replace(/[_-]/g, ' ')
    .replace(/\bPSD\b/gi, '')
    .trim();
}

/**
 * 使用ag-psd获取PSD文件元数据
 */
async function getPsdMetadataWithAgPsd(psdPath: string): Promise<{
  width: number;
  height: number;
  layers: number;
  colorMode?: string;
  resolution?: number;
  success: boolean;
}> {
  try {
    console.log(`  📄 使用ag-psd解析PSD: ${path.basename(psdPath)}`);

    const stats = fs.statSync(psdPath);
    const fileSizeMB = stats.size / 1024 / 1024;

    // 检查文件大小
    if (fileSizeMB > CONFIG.maxFileSizeMB) {
      console.log(`  ⚠️ 文件过大(${fileSizeMB.toFixed(2)}MB)，跳过深度解析`);
      return {
        width: CONFIG.imageWidth,
        height: CONFIG.imageHeight,
        layers: 1,
        success: false,
      };
    }

    // 读取文件
    const buffer = fs.readFileSync(psdPath);

    // 使用ag-psd解析
    const psd = PSD.readPsd(buffer, {
      skipLayerImageData: true, // 跳过图层图片数据，加快解析
      skipCompositeImageData: true, // 跳过合成图片数据
      skipThumbnail: true, // 跳过缩略图
    });

    if (!psd) {
      throw new Error('PSD解析返回空结果');
    }

    const result = {
      width: psd.width || CONFIG.imageWidth,
      height: psd.height || CONFIG.imageHeight,
      layers: countLayers(psd.children || []),
      colorMode: getColorModeName(psd.colorMode),
      resolution: psd.resolution,
      success: true,
    };

    console.log(`  ✅ PSD解析成功: ${result.width}x${result.height}, ${result.layers}个图层`);
    if (result.colorMode) {
      console.log(`     色彩模式: ${result.colorMode}`);
    }
    if (result.resolution) {
      console.log(`     分辨率: ${result.resolution}`);
    }

    return result;
  }
  catch (error) {
    console.log(`  ⚠️ PSD解析失败: ${(error as Error).message}`);
    return {
      width: CONFIG.imageWidth,
      height: CONFIG.imageHeight,
      layers: 1,
      success: false,
    };
  }
}

/**
 * 递归计算图层数量
 */
function countLayers(nodes: PSD.Node[] = []): number {
  let count = 0;

  for (const node of nodes) {
    if (node.type === 'layer') {
      count++;
    }
    if (node.children && node.children.length > 0) {
      count += countLayers(node.children);
    }
  }

  return count;
}

/**
 * 获取颜色模式名称
 */
function getColorModeName(mode?: number): string {
  if (mode === undefined)
    return '未知';

  const modes: Record<number, string> = {
    0: '位图',
    1: '灰度',
    2: '索引',
    3: 'RGB',
    4: 'CMYK',
    7: '多通道',
    8: '双色调',
    9: 'Lab',
  };

  return modes[mode] || `模式${mode}`;
}

/**
 * 从PSD文件生成预览图
 */
async function generatePreviewFromPsd(
  psdPath: string,
  outputPath: string,
): Promise<{ success: boolean; fromPsd: boolean }> {
  try {
    console.log(`  🖼️  从PSD生成预览图: ${path.basename(psdPath)}`);

    const stats = fs.statSync(psdPath);
    const fileSizeMB = stats.size / 1024 / 1024;

    // 如果文件太大，使用占位图
    if (fileSizeMB > 100) { // 100MB限制
      console.log(`  ⚠️ 文件过大(${fileSizeMB.toFixed(2)}MB)，使用占位图`);
      return {
        success: await generatePlaceholderPreview(psdPath, outputPath),
        fromPsd: false,
      };
    }

    // 尝试从PSD生成预览
    try {
      const buffer = fs.readFileSync(psdPath);
      const psd = PSD.readPsd(buffer, {
        skipLayerImageData: true,
        skipCompositeImageData: false, // 需要合成图片
        skipThumbnail: false, // 需要缩略图
      });

      if (psd && psd.canvas) {
        // 从PSD的canvas生成图片
        const pngBuffer = psd.canvas.toBuffer('image/png');

        await sharp(pngBuffer)
          .resize(CONFIG.imageWidth, CONFIG.imageHeight, {
            fit: 'inside',
            withoutEnlargement: true,
          })
          .jpeg({
            quality: CONFIG.imageQuality,
            mozjpeg: true,
          })
          .toFile(outputPath);

        const previewStats = fs.statSync(outputPath);
        console.log(`  ✅ 从PSD生成预览成功: ${(previewStats.size / 1024).toFixed(2)} KB`);

        return { success: true, fromPsd: true };
      }
    }
    catch (psdError) {
      console.log(`  ⚠️ 从PSD生成预览失败: ${(psdError as Error).message}`);
    }

    // 如果PSD预览失败，使用占位图
    return {
      success: await generatePlaceholderPreview(psdPath, outputPath),
      fromPsd: false,
    };
  }
  catch (error) {
    console.log(`  ❌ 预览图生成失败: ${(error as Error).message}`);
    return { success: false, fromPsd: false };
  }
}

/**
 * 生成占位预览图
 */
async function generatePlaceholderPreview(
  psdPath: string,
  outputPath: string,
): Promise<boolean> {
  try {
    const fileName = path.basename(psdPath);
    const nameWithoutExt = fileName.replace(/\.(psd|ps)$/i, '');
    const stats = fs.statSync(psdPath);
    const fileSizeMB = (stats.size / 1024 / 1024).toFixed(2);

    const text = nameWithoutExt.length > 20
      ? `${nameWithoutExt.substring(0, 20)}...`
      : nameWithoutExt;

    // 生成漂亮的占位图
    const colors = [
      { bg: '#f8f9fa', card: '#ffffff', text: '#495057', accent: '#007bff' },
      { bg: '#fff5f5', card: '#ffffff', text: '#c92a2a', accent: '#fa5252' },
      { bg: '#f8f0fc', card: '#ffffff', text: '#862e9c', accent: '#cc5de8' },
      { bg: '#e7f5ff', card: '#ffffff', text: '#1864ab', accent: '#339af0' },
      { bg: '#e6fcf5', card: '#ffffff', text: '#087f5b', accent: '#20c997' },
    ];

    const color = colors[Math.floor(Math.random() * colors.length)];

    const svg = Buffer.from(`
      <svg width="${CONFIG.imageWidth}" height="${CONFIG.imageHeight}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:${color.bg};stop-opacity:1" />
            <stop offset="100%" style="stop-color:${color.card};stop-opacity:1" />
          </linearGradient>
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="rgba(0,0,0,0.1)" flood-opacity="1"/>
          </filter>
        </defs>

        <rect width="100%" height="100%" fill="url(#grad1)"/>

        <g filter="url(#shadow)">
          <rect x="40" y="40" width="720" height="520" rx="12" fill="white"/>
        </g>

        <!-- PSD图标 -->
        <rect x="350" y="120" width="100" height="100" rx="8" fill="${color.accent}"/>
        <text x="400" y="175" font-family="Arial, sans-serif" font-size="48"
              text-anchor="middle" fill="white" font-weight="bold">PSD</text>

        <!-- 文件名 -->
        <text x="400" y="260" font-family="Arial, sans-serif" font-size="24"
              text-anchor="middle" fill="${color.text}" font-weight="bold">
          ${text}
        </text>

        <!-- 文件信息 -->
        <text x="400" y="310" font-family="Arial, sans-serif" font-size="16"
              text-anchor="middle" fill="#6c757d">
          Adobe Photoshop 文档
        </text>

        <!-- 文件大小 -->
        <g transform="translate(400, 370)">
          <rect x="-120" y="-15" width="240" height="30" rx="15" fill="#f8f9fa"/>
          <text font-family="Arial, sans-serif" font-size="14" text-anchor="middle"
                fill="#495057" dy="5">📦 ${fileSizeMB} MB</text>
        </g>

        <!-- 下载按钮 -->
        <g transform="translate(400, 450)" cursor="pointer">
          <rect x="-80" y="-20" width="160" height="40" rx="20" fill="${color.accent}"/>
          <text font-family="Arial, sans-serif" font-size="16" text-anchor="middle"
                fill="white" dy="5" font-weight="bold">⬇️ 下载源文件</text>
        </g>

        <!-- 底部信息 -->
        <text x="400" y="520" font-family="Arial, sans-serif" font-size="12"
              text-anchor="middle" fill="#adb5bd">
          生成时间: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </text>
      </svg>
    `);

    await sharp(svg)
      .jpeg({
        quality: CONFIG.imageQuality,
        mozjpeg: true,
      })
      .toFile(outputPath);

    const previewStats = fs.statSync(outputPath);
    console.log(`  🎨 生成精美占位图: ${(previewStats.size / 1024).toFixed(2)} KB`);
    return true;
  }
  catch (error) {
    console.log(`  ❌ 占位图生成失败: ${(error as Error).message}`);
    return false;
  }
}

/**
 * 使用JSZip创建ZIP压缩包
 */
async function createPsdZip(
  psdPath: string,
  outputPath: string,
): Promise<{ success: boolean; size?: number }> {
  try {
    console.log(`  📦 创建ZIP压缩包: ${path.basename(psdPath)}`);

    const zip = new JSZip();
    const fileName = path.basename(psdPath);
    const stats = fs.statSync(psdPath);
    const fileSizeMB = (stats.size / 1024 / 1024).toFixed(2);
    const id = extractIdFromFileName(fileName);

    // 添加PSD文件
    const psdData = fs.readFileSync(psdPath);
    zip.file(fileName, psdData);

    // 尝试解析PSD信息用于说明文件
    let psdInfo = null;
    try {
      const buffer = fs.readFileSync(psdPath);
      psdInfo = PSD.readPsd(buffer, {
        skipLayerImageData: true,
        skipCompositeImageData: true,
        skipThumbnail: true,
      });
    }
    catch (error) {
      console.log(`  ⚠️ 无法解析PSD信息用于说明文件: ${(error as Error).message}`);
    }

    // 生成详细的说明文件
    const readmeContent = `# ${fileName}

## 🎨 PSD文件信息

### 📁 基本信息
- **文件名**: ${fileName}
- **文件大小**: ${fileSizeMB} MB
- **模板ID**: ${id}
- **格式**: Adobe Photoshop Document (.psd)
- **创建时间**: ${stats.birthtime.toLocaleString()}
- **最后修改**: ${stats.mtime.toLocaleString()}
- **生成时间**: ${new Date().toLocaleString()}

### 📐 设计规格
${psdInfo
  ? `
- **画布尺寸**: ${psdInfo.width || '未知'} × ${psdInfo.height || '未知'} 像素
- **色彩模式**: ${getColorModeName(psdInfo.colorMode)}
- **分辨率**: ${psdInfo.resolution || '72'} DPI
- **图层数量**: 约 ${countLayers(psdInfo.children || [])} 个图层
`
  : '- **详细信息**: 无法读取完整PSD信息'}

### 🎯 适用场景
${psdInfo && psdInfo.width && psdInfo.height ? getUsageScenario(psdInfo.width, psdInfo.height) : '- 通用设计模板'}

### 🚀 使用说明
1. **解压文件**: 使用解压软件（如WinRAR、7-Zip、Bandizip）解压此ZIP文件
2. **打开文件**: 使用 Adobe Photoshop CC 2015+ 打开 .psd 文件
3. **编辑设计**: 所有图层均已分组，可自由编辑
4. **导出使用**: 根据需要导出为 JPG、PNG、PDF 等格式

### ⚙️ 软件要求
- **推荐**: Adobe Photoshop CC 2018 或更高版本
- **最低**: Adobe Photoshop CS6
- **替代软件**: GIMP、Photopea（在线）等支持PSD的软件

### 📋 包含内容
- 完整的分层设计文件
- 可编辑的文字图层
- 矢量形状和智能对象
- 图层样式和效果
- 色彩调整图层

### 🔧 注意事项
- 如缺少字体，请安装相应字体或替换为系统字体
- 链接的智能对象可能需要重新链接
- 建议使用最新版Photoshop以获得最佳兼容性
- 大文件建议在性能较好的计算机上打开

### 📁 目录结构
\`\`\`
${id}/
├── ${fileName}        # PSD源文件
└── README.md         # 本说明文件
\`\`\`

### 🏷️ 标签
${generateTags('', fileName, psdInfo ? countLayers(psdInfo.children || []) : 1).map(tag => `- \`${tag}\``).join('\n')}

### 📞 支持
如有问题或需要帮助，请联系设计支持团队。

---

*本模板文件由 PSD模板生成系统自动生成*
*版本: 1.0.0 | 生成时间: ${new Date().toISOString()}*
`;

    zip.file('README.md', readmeContent);

    // 可选：添加一个简单的配置信息
    const configInfo = {
      template: {
        id,
        name: generateNameFromId(id, fileName),
        originalFileName: fileName,
        fileSize: stats.size,
        fileSizeMB: Number.parseFloat(fileSizeMB),
        dimensions: psdInfo
          ? {
              width: psdInfo.width,
              height: psdInfo.height,
            }
          : null,
        colorMode: psdInfo ? getColorModeName(psdInfo.colorMode) : null,
        layers: psdInfo ? countLayers(psdInfo.children || []) : null,
        generated: new Date().toISOString(),
        version: '1.0.0',
      },
    };

    zip.file('config.json', JSON.stringify(configInfo, null, 2));

    // 生成ZIP文件
    const zipData = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: {
        level: CONFIG.zipLevel,
      },
      comment: `PSD Template: ${fileName} | ID: ${id} | Generated: ${new Date().toISOString()}`,
    });

    // 写入文件
    fs.writeFileSync(outputPath, zipData);

    const zipStats = fs.statSync(outputPath);
    const originalSize = stats.size;
    const compressedSize = zipStats.size;
    const compressionRatio = ((1 - compressedSize / originalSize) * 100).toFixed(1);

    console.log(`  ✅ ZIP创建成功: ${path.basename(outputPath)}`);
    console.log(`     原始: ${(originalSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`     压缩: ${(compressedSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`     压缩率: ${compressionRatio}%`);

    return {
      success: true,
      size: compressedSize,
    };
  }
  catch (error) {
    console.log(`  ❌ ZIP创建失败: ${(error as Error).message}`);
    return {
      success: false,
    };
  }
}

/**
 * 根据尺寸获取使用场景
 */
function getUsageScenario(width: number, height: number): string {
  const ratio = width / height;

  if (width > 2000 && height > 1000) {
    return '- 海报/展板设计\n- 大型印刷物料\n- 户外广告';
  }
  else if (ratio >= 1.7 && ratio <= 1.9) {
    return '- 社交媒体封面\n- 网页横幅\n- 演示文稿';
  }
  else if (Math.abs(ratio - 1) < 0.1) {
    return '- 社交媒体头像\n- 应用图标\n- 正方形海报';
  }
  else if (ratio > 2) {
    return '- 横幅广告\n- 网页头部\n- 长图设计';
  }
  else if (width < 1000 && height < 1000) {
    return '- 社交媒体帖子\n- 小图素材\n- 图标设计';
  }

  return '- 通用设计模板\n- 多场景适用';
}

/**
 * 生成标签
 */
function generateTags(category: string, fileName: string, layers: number = 1): string[] {
  const tags = new Set<string>();

  // 根据ID判断分类
  const id = extractIdFromFileName(fileName);
  const numMatch = id.match(/\d+/);
  if (numMatch) {
    const num = Number.parseInt(numMatch[0]);
    if (!isNaN(num)) {
      if (num >= 40000 && num < 41000) {
        tags.add('海报'); tags.add('宣传'); tags.add('广告');
      }
      else if (num >= 41000 && num < 42000) {
        tags.add('社交'); tags.add('媒体'); tags.add('在线');
      }
      else if (num >= 42000 && num < 43000) {
        tags.add('电商'); tags.add('商品'); tags.add('购物');
      }
      else if (num >= 43000 && num < 44000) {
        tags.add('广告'); tags.add('营销'); tags.add('推广');
      }
      else if (num >= 44000 && num < 45000) {
        tags.add('UI'); tags.add('界面'); tags.add('设计');
      }
    }
  }

  // 根据文件名添加标签
  const lowerFileName = fileName.toLowerCase();
  if (lowerFileName.includes('banner'))
    tags.add('横幅');
  if (lowerFileName.includes('poster'))
    tags.add('海报');
  if (lowerFileName.includes('social'))
    tags.add('社交');
  if (lowerFileName.includes('facebook'))
    tags.add('脸书');
  if (lowerFileName.includes('instagram'))
    tags.add('INS');
  if (lowerFileName.includes('twitter'))
    tags.add('推特');
  if (lowerFileName.includes('wechat'))
    tags.add('微信');
  if (lowerFileName.includes('mobile'))
    tags.add('移动端');
  if (lowerFileName.includes('web'))
    tags.add('网页');
  if (lowerFileName.includes('app'))
    tags.add('应用');
  if (lowerFileName.includes('ui'))
    tags.add('界面');
  if (lowerFileName.includes('ux'))
    tags.add('体验');
  if (lowerFileName.includes('card'))
    tags.add('卡片');
  if (lowerFileName.includes('flyer'))
    tags.add('传单');
  if (lowerFileName.includes('brochure'))
    tags.add('手册');

  // 根据图层数量
  if (layers > 30) {
    tags.add('多图层'); tags.add('复杂设计');
  }
  else if (layers > 10) {
    tags.add('分层设计');
  }
  else {
    tags.add('简洁');
  }

  // 通用标签
  tags.add('PSD'); tags.add('源文件'); tags.add('可编辑');
  tags.add('模板'); tags.add('设计'); tags.add('素材');
  tags.add('分层'); tags.add('Photoshop');

  return Array.from(tags).slice(0, 12);
}

/**
 * 处理单个PSD文件
 */
async function processPsdFile(
  psdPath: string,
): Promise<PsdMetadata | null> {
  const fileName = path.basename(psdPath);
  const fileExt = path.extname(fileName).toLowerCase();

  // 只处理PSD文件
  if (fileExt !== '.psd' && fileExt !== '.ps') {
    console.log(`  ⏭️  跳过非PSD文件: ${fileName}`);
    return null;
  }

  const id = extractIdFromFileName(fileName);
  const name = generateNameFromId(id, fileName);
  const stats = fs.statSync(psdPath);
  const fileSizeMB = stats.size / 1024 / 1024;

  console.log(`\n📁 处理PSD文件: ${fileName}`);
  console.log(`  🆔 ID: ${id}`);
  console.log(`  📛 名称: ${name}`);
  console.log(`  📊 大小: ${fileSizeMB.toFixed(2)} MB`);
  console.log(`  🕐 修改时间: ${stats.mtime.toLocaleString()}`);

  // 检查文件大小
  if (fileSizeMB > CONFIG.maxFileSizeMB) {
    console.log(`  ⚠️  文件过大(超过${CONFIG.maxFileSizeMB}MB限制)，跳过处理`);
    return null;
  }

  // 获取PSD元数据
  const psdInfo = await getPsdMetadataWithAgPsd(psdPath);

  // 创建输出目录
  const outputDir = path.join(CONFIG.outputDir, id);
  ensureDirectory(outputDir);

  // 生成预览图
  const previewPath = path.join(outputDir, `${id}.jpg`);
  const previewResult = await generatePreviewFromPsd(psdPath, previewPath);

  // 创建ZIP压缩包
  const zipPath = path.join(outputDir, `${id}.zip`);
  const zipResult = await createPsdZip(psdPath, zipPath);

  if (!previewResult.success && !zipResult.success) {
    console.log(`  ⚠️  PSD处理失败，跳过: ${fileName}`);
    return null;
  }

  // 确定分类
  let category = '其他';
  const numMatch = id.match(/\d+/);
  if (numMatch) {
    const num = Number.parseInt(numMatch[0]);
    if (!isNaN(num)) {
      if (num >= 40000 && num < 41000)
        category = '海报';
      else if (num >= 41000 && num < 42000)
        category = '社交媒体';
      else if (num >= 42000 && num < 43000)
        category = '电商';
      else if (num >= 43000 && num < 44000)
        category = '广告';
      else if (num >= 44000 && num < 45000)
        category = 'UI设计';
      else if (num >= 45000 && num < 46000)
        category = '名片';
    }
  }

  // 生成标签
  const tags = generateTags(category, fileName, psdInfo.layers);

  const metadata: PsdMetadata = {
    id,
    name,
    fileName,
    fileSize: stats.size,
    fileSizeMB: Number.parseFloat(fileSizeMB.toFixed(2)),
    width: psdInfo.width,
    height: psdInfo.height,
    layers: psdInfo.layers,
    previewImage: previewResult.success ? `/templates/psd/${id}/${id}.jpg` : '',
    zipFile: zipResult.success ? `/templates/psd/${id}/${id}.zip` : '',
    zipSize: zipResult.success ? zipResult.size! : 0,
    zipSizeMB: zipResult.success ? Number.parseFloat((zipResult.size! / 1024 / 1024).toFixed(2)) : 0,
    createdAt: stats.birthtime.toISOString(),
    updatedAt: stats.mtime.toISOString(),
    format: 'PSD',
    hasPreview: previewResult.success,
    hasZip: zipResult.success,
    tags,
    category,
    colorMode: psdInfo.colorMode,
    resolution: psdInfo.resolution,
    description: `${category}设计模板，${psdInfo.width}×${psdInfo.height}像素，${psdInfo.layers}个可编辑图层`,
    downloadUrl: zipResult.success ? `/templates/psd/${id}/${id}.zip` : undefined,
    previewGeneratedFromPsd: previewResult.fromPsd,
  };

  console.log(`  ✅ 处理完成: ${fileName}`);
  console.log(`     📷 预览图: ${previewResult.success ? '✓' : '✗'} (${previewResult.fromPsd ? '来自PSD' : '占位图'})`);
  console.log(`     📦 ZIP文件: ${zipResult.success ? '✓' : '✗'}`);
  console.log(`     🏷️  分类: ${category}`);
  console.log(`     🎯 标签: ${tags.slice(0, 5).join(', ')}${tags.length > 5 ? '...' : ''}`);

  return metadata;
}

/**
 * 扫描并处理所有PSD文件
 */
async function scanAndProcessPsdFiles(): Promise<PsdMetadata[]> {
  console.log('🔍 开始扫描PSD文件...');
  console.log(`📁 输入目录: ${CONFIG.inputDir}`);
  console.log(`📁 输出目录: ${CONFIG.outputDir}`);
  console.log(`📁 配置文件: ${CONFIG.configFile}`);
  console.log(`⚙️  最大文件: ${CONFIG.maxFileSizeMB} MB\n`);

  // 检查输入目录
  if (!fs.existsSync(CONFIG.inputDir)) {
    console.log(`❌ 输入目录不存在: ${CONFIG.inputDir}`);
    console.log(`📁 请创建目录: mkdir -p "${CONFIG.inputDir}"`);
    ensureDirectory(CONFIG.inputDir);
    return [];
  }

  // 确保输出目录存在
  ensureDirectory(CONFIG.outputDir);

  // 读取文件
  const files = fs.readdirSync(CONFIG.inputDir);
  const psdFiles = files.filter(file =>
    /\.(psd|ps)$/i.test(file),
  );

  console.log(`📊 找到 ${psdFiles.length} 个PSD文件\n`);

  if (psdFiles.length === 0) {
    console.log('⚠️  未找到任何PSD文件');
    console.log('💡 请将.psd或.ps文件放入以下目录:');
    console.log(`   ${CONFIG.inputDir}`);
    console.log('\n📁 支持的文件类型:');
    console.log('   *.psd - Photoshop文档');
    console.log('   *.ps  - Photoshop脚本');
    return [];
  }

  const templates: PsdMetadata[] = [];

  for (let i = 0; i < psdFiles.length; i++) {
    const file = psdFiles[i];
    const filePath = path.join(CONFIG.inputDir, file);

    console.log(`\n🔧 [${i + 1}/${psdFiles.length}] 处理文件: ${file}`);

    try {
      const metadata = await processPsdFile(filePath);
      if (metadata) {
        templates.push(metadata);
      }
    }
    catch (error) {
      console.log(`  ❌ 处理文件失败: ${file}`);
      console.log(`     错误: ${(error as Error).message}`);
    }
  }

  // 按ID中的数字排序
  templates.sort((a, b) => {
    const aNum = Number.parseInt(a.id.replace(/\D/g, '')) || 0;
    const bNum = Number.parseInt(b.id.replace(/\D/g, '')) || 0;
    return aNum - bNum;
  });

  return templates;
}

/**
 * 生成配置文件
 */
async function generateConfigFile(templates: PsdMetadata[]): Promise<void> {
  console.log('\n📄 生成配置文件...');

  if (templates.length === 0) {
    console.log('⚠️  未生成任何模板');

    const defaultConfig: TemplateConfig = {
      generatedAt: new Date().toISOString(),
      version: '1.0.0',
      count: 0,
      templates: [],
      stats: {
        totalSize: 0,
        totalSizeMB: 0,
        dimensions: { minWidth: 0, maxWidth: 0, minHeight: 0, maxHeight: 0 },
        layers: { min: 0, max: 0, avg: 0 },
      },
      summary: {
        byCategory: {},
        withPreviewFromPsd: 0,
        withPlaceholderPreview: 0,
        withZip: 0,
      },
    };

    fs.writeFileSync(CONFIG.configFile, JSON.stringify(defaultConfig, null, 2));
    console.log(`📁 已生成空配置文件: ${CONFIG.configFile}`);
    return;
  }

  // 计算统计信息
  const totalSize = templates.reduce((sum, t) => sum + t.fileSize, 0);
  const totalZipSize = templates.reduce((sum, t) => sum + t.zipSize, 0);
  const widths = templates.map(t => t.width).filter(w => w > 0);
  const heights = templates.map(t => t.height).filter(h => h > 0);
  const layers = templates.map(t => t.layers).filter(l => l > 0);

  // 分类统计
  const byCategory: Record<string, number> = {};
  let withPreviewFromPsd = 0;
  let withPlaceholderPreview = 0;

  templates.forEach((t) => {
    byCategory[t.category || '其他'] = (byCategory[t.category || '其他'] || 0) + 1;
    if (t.previewGeneratedFromPsd)
      withPreviewFromPsd++;
    else if (t.hasPreview)
      withPlaceholderPreview++;
  });

  const config: TemplateConfig = {
    generatedAt: new Date().toISOString(),
    version: '1.0.0',
    count: templates.length,
    templates,
    stats: {
      totalSize,
      totalSizeMB: Number.parseFloat((totalSize / 1024 / 1024).toFixed(2)),
      dimensions: {
        minWidth: widths.length > 0 ? Math.min(...widths) : 0,
        maxWidth: widths.length > 0 ? Math.max(...widths) : 0,
        minHeight: heights.length > 0 ? Math.min(...heights) : 0,
        maxHeight: heights.length > 0 ? Math.max(...heights) : 0,
      },
      layers: {
        min: layers.length > 0 ? Math.min(...layers) : 0,
        max: layers.length > 0 ? Math.max(...layers) : 0,
        avg: layers.length > 0 ? Number.parseFloat((layers.reduce((a, b) => a + b) / layers.length).toFixed(1)) : 0,
      },
    },
    summary: {
      byCategory,
      withPreviewFromPsd,
      withPlaceholderPreview,
      withZip: templates.filter(t => t.hasZip).length,
    },
  };

  // 写入配置文件
  fs.writeFileSync(CONFIG.configFile, JSON.stringify(config, null, 2));

  console.log(`\n🎉 配置文件生成完成！`);
  console.log(`📁 输出文件: ${CONFIG.configFile}`);
  console.log(`\n📊 统计信息:`);
  console.log(`   📈 模板总数: ${config.count}`);
  console.log(`   💾 总大小: ${config.stats.totalSizeMB} MB`);
  console.log(`   📦 ZIP总大小: ${(totalZipSize / 1024 / 1024).toFixed(2)} MB (压缩节省: ${((1 - totalZipSize / totalSize) * 100).toFixed(1)}%)`);
  console.log(`   📐 尺寸范围: ${config.stats.dimensions.minWidth}x${config.stats.dimensions.minHeight} - ${config.stats.dimensions.maxWidth}x${config.stats.dimensions.maxHeight}`);
  console.log(`   🎨 图层统计: 最少${config.stats.layers.min}层, 最多${config.stats.layers.max}层, 平均${config.stats.layers.avg}层`);
  console.log(`\n🖼️  预览图统计:`);
  console.log(`   ✅ 来自PSD: ${withPreviewFromPsd}`);
  console.log(`   🎨 占位图: ${withPlaceholderPreview}`);
  console.log(`   📦 有ZIP文件: ${config.summary.withZip}`);
  console.log(`\n📂 分类统计:`);
  Object.entries(config.summary.byCategory).forEach(([category, count]) => {
    console.log(`   ${category}: ${count} 个`);
  });

  console.log(`\n📋 模板列表:`);
  templates.forEach((t, i) => {
    console.log(`  ${i + 1}. ${t.name} (${t.id})`);
    console.log(`     文件: ${t.fileName} (${t.fileSizeMB} MB)`);
    console.log(`     尺寸: ${t.width}x${t.height}, 图层: ${t.layers}`);
    console.log(`     分类: ${t.category}`);
    console.log(`     预览: ${t.hasPreview ? (t.previewGeneratedFromPsd ? '来自PSD' : '占位图') : '无'}`);
    console.log(`     ZIP: ${t.hasZip ? `${t.zipSizeMB} MB` : '无'}`);
    console.log(`     路径: /templates/psd/${t.id}/`);
    console.log(``);
  });

  console.log(`\n📁 生成的目录结构:`);
  console.log(`  public/templates/`);
  console.log(`  ├── files/                    # 原始PSD文件`);
  console.log(`  │   ├── psd40449.psd`);
  console.log(`  │   └── ...`);
  console.log(`  ├── psd/                     # 生成的模板目录`);
  console.log(`  │   ├── psd40449/           # 每个PSD一个目录`);
  console.log(`  │   │   ├── psd40449.jpg    # 预览图`);
  console.log(`  │   │   ├── psd40449.zip    # 压缩包(含PSD+说明)`);
  console.log(`  │   │   └── (内部: README.md, config.json)`);
  console.log(`  │   └── ...`);
  console.log(`  └── config.json              # 配置文件`);
}

/**
 * 清理旧文件
 */
function cleanupOldFiles(): void {
  console.log('\n🧹 清理旧的生成文件...');

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

      console.log(`✅ 清理完成，删除了 ${deletedCount} 个目录`);
    }
    else {
      console.log(`📁 输出目录不存在，无需清理`);
    }
  }
  catch (error) {
    console.log(`⚠️ 清理失败: ${(error as Error).message}`);
  }
}

/**
 * 主函数
 */
async function main(): Promise<void> {
  console.log('🚀 PSD模板生成系统 v1.0.0');
  console.log('='.repeat(50));
  console.log(`⚙️  配置信息:`);
  console.log(`   输入目录: ${CONFIG.inputDir}`);
  console.log(`   输出目录: ${CONFIG.outputDir}`);
  console.log(`   图片尺寸: ${CONFIG.imageWidth}x${CONFIG.imageHeight}`);
  console.log(`   图片质量: ${CONFIG.imageQuality}`);
  console.log(`   压缩级别: ${CONFIG.zipLevel}`);
  console.log(`   最大文件: ${CONFIG.maxFileSizeMB} MB`);
  console.log(`${'='.repeat(50)}\n`);

  try {
    // 清理旧的生成文件
    cleanupOldFiles();

    // 扫描并处理PSD文件
    const templates = await scanAndProcessPsdFiles();

    // 生成配置文件
    await generateConfigFile(templates);

    console.log('\n✅ 处理完成！');
    console.log('\n💡 使用说明:');
    console.log('  1. 将PSD文件放入 public/templates/files/ 目录');
    console.log('  2. 运行此脚本: npm run build:templates');
    console.log('  3. 查看生成的模板: public/templates/psd/');
    console.log('  4. 配置文件: public/templates/config.json');
    console.log('  5. 前端通过 config.json 获取所有模板信息');
    console.log('  6. 每个模板包含: 预览图 + ZIP压缩包');
    console.log('\n🎨 功能特色:');
    console.log('  ✓ 自动解析PSD文件信息');
    console.log('  ✓ 生成精美预览图');
    console.log('  ✓ 创建带说明的ZIP压缩包');
    console.log('  ✓ 自动分类和标签');
    console.log('  ✓ 详细的统计信息');
    console.log('  ✓ 支持大文件处理');
  }
  catch (error) {
    console.error('\n❌ 处理失败:', error);
    process.exit(1);
  }
}

// 运行主函数
main().catch(console.error);
