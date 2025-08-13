const fs = require('fs');
const path = require('path');

async function downloadFile(url) {
  const iconPath = path.resolve(__dirname, '../public/font/iconfont.js');

  const response = await fetch(`https:${url}`, {
    method: 'GET',
    responseType: 'stream',
  }).then((res) => res.text());
  fs.writeFileSync(iconPath, response);
  console.log('Download Icon Success');
}
let argument = process.argv.splice(2);
downloadFile(argument[0]);
