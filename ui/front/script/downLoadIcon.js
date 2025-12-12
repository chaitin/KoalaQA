const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ICON_TYPE_FILE_PATH = path.resolve(__dirname, '../src/components/icon.types.ts');

function extractSymbolIds(svgContent) {
  const regex = /<symbol\s+id="([^"]+)"/g;
  const ids = [];
  let match;
  while ((match = regex.exec(svgContent)) !== null) {
    ids.push(match[1]);
  }
  return Array.from(new Set(ids));
}

function writeIconTypesFile(ids) {
  if (!ids.length) {
    console.warn('Warning: No <symbol id> found, skip icon type generation.');
    return;
  }

  const fileContent = `// 此文件由 script/downLoadIcon.js 自动生成\nexport const ICON_TYPES = ${JSON.stringify(ids, null, 2)} as const;\nexport type IconType = (typeof ICON_TYPES)[number];\n`;
  fs.writeFileSync(ICON_TYPE_FILE_PATH, fileContent);
  console.log(`Generated icon types: ${ICON_TYPE_FILE_PATH}`);
}

async function downloadFile(url) {
  // 先获取当前的 git commit id
  let commitId;
  try {
    commitId = execSync('git rev-parse --short HEAD', {
      cwd: path.resolve(__dirname, '../..'),
      encoding: 'utf-8',
    }).trim();
  } catch (error) {
    console.error('Error: Failed to get git commit id:', error.message);
    process.exit(1);
  }

  // 下载图标文件
  const response = await fetch(`https:${url}`, {
    method: 'GET',
    responseType: 'stream',
  }).then((res) => res.text());

  // 保存为带 commit id 的文件名
  const iconPath = path.resolve(__dirname, `../public/font/iconfont.js`);
  fs.writeFileSync(iconPath, response);

  // 解析 symbol id，生成类型文件
  const symbolIds = extractSymbolIds(response);
  writeIconTypesFile(symbolIds);

}
let argument = process.argv.splice(2);
downloadFile(argument[0]);
