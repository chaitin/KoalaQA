const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

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
  const iconPath = path.resolve(__dirname, `../public/font/iconfont.${commitId}.js`);
  fs.writeFileSync(iconPath, response);
  
  console.log(`Saved as: iconfont.${commitId}.js`);
}
let argument = process.argv.splice(2);
downloadFile(argument[0]);
