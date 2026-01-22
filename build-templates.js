// build-templates.js
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ES模块中获取 __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 配置
const CONFIG = {
  inputDir: path.join(__dirname, 'public/templates/psd'),
  outputFile: path.join(__dirname, 'public/templates/config.json'),
};

/**
 * 从目录名提取模板信息
 */
function extractInfoFromDirName(dirName) {
  const lowerName = dirName.toLowerCase();

  // 判断是否是PSD目录
  if (lowerName.startsWith('psd') || lowerName.startsWith('zpsd')) {
    const id = dirName;
    const numberMatch = dirName.match(/\d+/);
    const number = numberMatch ? Number.parseInt(numberMatch[0]) : 0;

    // 根据数字判断可能的类型
    let name = '';
    let category = '其他';
    let description = 'PSD设计模板';

    if (number >= 40000 && number < 41000) {
      category = '海报';
      name = `海报设计模板 ${number}`;
      description = '适用于产品宣传的海报设计';
    }
    else if (number >= 41000 && number < 42000) {
      category = '社交媒体';
      name = `社交媒体模板 ${number}`;
      description = '适用于社交媒体的设计模板';
    }
    else if (lowerName.startsWith('zpsd')) {
      category = '综合';
      name = `综合设计模板 ${number}`;
      description = '多功能设计模板';
    }
    else {
      name = `设计模板 ${number}`;
    }

    return { id, number, name, category, description };
  }

  return null;
}

/**
 * 扫描PSD目录
 */
async function scanPsdDirectories() {
  console.log('📁 开始扫描PSD目录...');
  console.log(`📁 扫描路径: ${CONFIG.inputDir}`);

  // 检查目录是否存在
  if (!fs.existsSync(CONFIG.inputDir)) {
    console.log('❌ PSD目录不存在');
    console.log(`请确保目录存在: ${CONFIG.inputDir}`);
    return [];
  }

  const templates = [];
  const items = fs.readdirSync(CONFIG.inputDir, { withFileTypes: true });

  console.log(`🔍 找到 ${items.length} 个目录\n`);

  for (const item of items) {
    if (item.isDirectory()) {
      const template = await processPsdDirectory(item.name);
      if (template) {
        templates.push(template);
      }
    }
  }

  // 按ID排序
  templates.sort((a, b) => {
    const aNum = Number.parseInt(a.id.match(/\d+/)?.[0] || '0');
    const bNum = Number.parseInt(b.id.match(/\d+/)?.[0] || '0');
    return aNum - bNum;
  });

  return templates;
}

/**
 * 处理单个PSD目录
 */
async function processPsdDirectory(dirName) {
  const dirPath = path.join(CONFIG.inputDir, dirName);
  console.log(`📂 处理目录: ${dirName}`);

  try {
    const files = fs.readdirSync(dirPath);

    // 查找预览图
    const previewFile = files.find((file) => {
      const ext = path.extname(file).toLowerCase();
      const name = path.basename(file, ext).toLowerCase();
      return (ext === '.jpg' || ext === '.jpeg' || ext === '.png')
        && name.includes(dirName.toLowerCase());
    });

    // 查找PSD文件
    const psdFile = files.find((file) => {
      const ext = path.extname(file).toLowerCase();
      const name = path.basename(file, ext).toLowerCase();
      return (ext === '.psd' || ext === '.ps')
        && name.includes(dirName.toLowerCase());
    });

    // 查找说明文件
    const readmeFile = files.find(file =>
      file.toLowerCase() === '说明.htm'
      || file.toLowerCase() === 'readme.htm'
      || file.toLowerCase() === '说明.html',
    );

    if (!previewFile) {
      console.log(`  ⚠️  未找到预览图`);
      return null;
    }

    if (!psdFile) {
      console.log(`  ⚠️  未找到PSD文件`);
      return null;
    }

    // 提取目录信息
    const info = extractInfoFromDirName(dirName);
    if (!info) {
      console.log(`  ⚠️  无法识别目录格式: ${dirName}`);
      return null;
    }

    // 尝试获取图片尺寸
    let dimensions = { width: 1920, height: 1080 };
    try {
      const previewPath = path.join(dirPath, previewFile);
      dimensions = await getImageDimensions(previewPath);
    }
    catch (error) {
      console.log(`  ⚠️  无法获取图片尺寸: ${error.message}`);
    }

    const template = {
      id: info.id,
      number: info.number,
      name: info.name,
      description: info.description,
      image: `/templates/psd/${dirName}/${previewFile}`,
      psd: `/templates/psd/${dirName}/${psdFile}`,
      width: dimensions.width,
      height: dimensions.height,
      category: info.category,
      tags: generateTags(info.category, info.id),
      hasReadme: !!readmeFile,
      readmePath: readmeFile ? `/templates/psd/${dirName}/${readmeFile}` : null,
      createdAt: getFileCreatedTime(dirPath),
      updatedAt: getFileModifiedTime(dirPath),
    };

    console.log(`  ✅ 成功添加: ${info.name}`);
    console.log(`     图片: ${previewFile} (${dimensions.width}x${dimensions.height})`);
    console.log(`     PSD: ${psdFile}`);
    console.log(`     分类: ${info.category}`);

    return template;
  }
  catch (error) {
    console.log(`  ❌ 处理失败: ${error.message}`);
    return null;
  }
}

/**
 * 获取图片尺寸
 */
async function getImageDimensions(imagePath) {
  return new Promise((resolve, reject) => {
    fs.readFile(imagePath, (err, buffer) => {
      if (err) {
        reject(err);
        return;
      }

      const size = getImageSizeFromBuffer(buffer, path.extname(imagePath));
      if (size) {
        resolve(size);
      }
      else {
        // 如果无法解析，返回默认尺寸
        resolve({ width: 1920, height: 1080 });
      }
    });
  });
}

/**
 * 从Buffer解析图片尺寸
 */
function getImageSizeFromBuffer(buffer, ext) {
  const extension = ext.toLowerCase();

  try {
    if (extension === '.png') {
      return parsePNG(buffer);
    }
    else if (extension === '.jpg' || extension === '.jpeg') {
      return parseJPEG(buffer);
    }
  }
  catch (error) {
    console.log(`解析图片失败: ${error.message}`);
  }

  return null;
}

function parsePNG(buffer) {
  if (buffer.length < 24)
    return null;
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  return { width, height };
}

function parseJPEG(buffer) {
  if (buffer[0] !== 0xFF || buffer[1] !== 0xD8)
    return null;

  let offset = 2;
  while (offset < buffer.length) {
    if (buffer[offset] !== 0xFF)
      break;

    const marker = buffer[offset + 1];
    offset += 2;

    if ((marker >= 0xC0 && marker <= 0xC3)
      || (marker >= 0xC5 && marker <= 0xC7)
      || (marker >= 0xC9 && marker <= 0xCB)
      || (marker >= 0xCD && marker <= 0xCF)) {
      const length = buffer.readUInt16BE(offset);

      if (offset + length <= buffer.length) {
        const height = buffer.readUInt16BE(offset + 3);
        const width = buffer.readUInt16BE(offset + 5);
        return { width, height };
      }
      break;
    }

    const length = buffer.readUInt16BE(offset);
    offset += length;
  }

  return null;
}

/**
 * 获取文件创建时间
 */
function getFileCreatedTime(dirPath) {
  try {
    const stats = fs.statSync(dirPath);
    return stats.birthtime.toISOString().split('T')[0];
  }
  catch (error) {
    return new Date().toISOString().split('T')[0];
  }
}

/**
 * 获取文件修改时间
 */
function getFileModifiedTime(dirPath) {
  try {
    const stats = fs.statSync(dirPath);
    return stats.mtime.toISOString().split('T')[0];
  }
  catch (error) {
    return new Date().toISOString().split('T')[0];
  }
}

/**
 * 生成标签
 */
function generateTags(category, id) {
  const tags = [];

  // 根据分类添加标签
  const categoryTags = {
    海报: ['海报', '宣传', '打印', '大尺寸'],
    社交媒体: ['社交', '网络', '分享', '小尺寸'],
    综合: ['通用', '多功能', '模板'],
  };

  if (categoryTags[category]) {
    tags.push(...categoryTags[category]);
  }

  // 根据ID添加标签
  if (id.toLowerCase().startsWith('zpsd')) {
    tags.push('压缩', '综合');
  }
  else if (id.toLowerCase().includes('psd')) {
    tags.push('PSD', '源文件');
  }

  // 添加通用标签
  tags.push('设计', '模板', '可编辑');

  return [...new Set(tags)].slice(0, 8); // 去重，最多8个标签
}

/**
 * 生成配置文件
 */
async function generateConfig(templates) {
  console.log('\n📄 开始生成配置文件...');

  try {
    if (templates.length === 0) {
      console.log('⚠️  未找到任何模板');

      const defaultConfig = {
        generatedAt: new Date().toISOString(),
        version: '1.0.0',
        count: 0,
        templates: [],
        directoryStructure: {
          base: '/templates/psd/',
          pattern: 'psdXXXXX 或 zpsdXXXXX',
          expectedFiles: [
            'psdXXXXX.jpg (预览图)',
            'psdXXXXX.psd (PSD源文件)',
            '说明.htm (可选说明文件)',
          ],
        },
        instructions: '请按照psdXXXXX格式创建目录，包含同名jpg和psd文件',
      };

      fs.writeFileSync(CONFIG.outputFile, JSON.stringify(defaultConfig, null, 2));
      console.log(`✅ 默认配置文件已生成: ${CONFIG.outputFile}`);
      return;
    }

    // 统计分类
    const categories = {};
    templates.forEach((template) => {
      categories[template.category] = (categories[template.category] || 0) + 1;
    });

    const config = {
      generatedAt: new Date().toISOString(),
      version: '1.0.0',
      count: templates.length,
      templates,
      stats: {
        totalTemplates: templates.length,
        byCategory: categories,
        withReadme: templates.filter(t => t.hasReadme).length,
        sizeRange: {
          minWidth: Math.min(...templates.map(t => t.width)),
          maxWidth: Math.max(...templates.map(t => t.width)),
          minHeight: Math.min(...templates.map(t => t.height)),
          maxHeight: Math.max(...templates.map(t => t.height)),
        },
      },
      categories: Object.keys(categories),
      structure: {
        basePath: '/templates/psd/',
        pattern: 'psdXXXXX (XXXXX为数字)',
        fileNaming: '目录名必须与jpg/psd文件名一致',
        example: {
          directory: 'psd40449',
          files: ['psd40449.jpg', 'psd40449.psd', '说明.htm (可选)'],
        },
      },
    };

    // 写入配置文件
    fs.writeFileSync(CONFIG.outputFile, JSON.stringify(config, null, 2));

    console.log('\n🎉 配置文件生成完成！');
    console.log(`📁 输出文件: ${CONFIG.outputFile}`);
    console.log(`📊 统计信息:`);
    console.log(`   模板总数: ${config.count}`);
    console.log(`   分类统计: ${JSON.stringify(categories, null, 2)}`);
    console.log(`   带说明文件: ${config.stats.withReadme}`);
    console.log(`   尺寸范围: ${config.stats.sizeRange.minWidth}x${config.stats.sizeRange.minHeight} 到 ${config.stats.sizeRange.maxWidth}x${config.stats.sizeRange.maxHeight}`);

    console.log('\n📋 模板列表:');
    templates.forEach((t, i) => {
      console.log(`  ${i + 1}. ${t.name} (${t.id})`);
      console.log(`     分类: ${t.category}`);
      console.log(`     图片: ${path.basename(t.image)}`);
      console.log(`     PSD: ${path.basename(t.psd)}`);
      console.log(`     尺寸: ${t.width}x${t.height}`);
      console.log('');
    });
  }
  catch (error) {
    console.error('❌ 生成配置文件失败:', error);
    throw error;
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('🚀 开始生成PSD模板配置...\n');

  try {
    const templates = await scanPsdDirectories();
    await generateConfig(templates);

    console.log('\n✅ 配置生成完成！');
    console.log('\n📁 目录结构要求:');
    console.log('  public/templates/psd/');
    console.log('  ├── psd40449/');
    console.log('  │   ├── psd40449.jpg');
    console.log('  │   ├── psd40449.psd');
    console.log('  │   └── 说明.htm (可选)');
    console.log('  ├── psd40502/');
    console.log('  │   ├── psd40502.JPG');
    console.log('  │   └── psd40502.PSD');
    console.log('  └── ...');
  }
  catch (error) {
    console.error('❌ 生成失败:', error);
    process.exit(1);
  }
}

// 运行主函数
main();
