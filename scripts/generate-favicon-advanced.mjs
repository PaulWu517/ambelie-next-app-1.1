import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import pngToIco from 'png-to-ico';

const srcPng = path.resolve('public/assets/vi/avatar.png');
const tempDir = path.resolve('.tmp_favicon');
const outIco = path.resolve('public/icon/favicon.ico');

const sizes = [16, 32, 48, 64, 128];

(async () => {
  try {
    if (!fs.existsSync(srcPng)) {
      throw new Error('Source PNG not found: ' + srcPng);
    }
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

    const generatedPngs = [];
    for (const size of sizes) {
      const outPng = path.join(tempDir, `favicon-${size}.png`);
      await sharp(srcPng)
        .resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
        .flatten({ background: { r: 255, g: 255, b: 255 } }) // 去掉透明，白底
        .png({ quality: 90 })
        .toFile(outPng);
      generatedPngs.push(outPng);
    }

    const icoBuffer = await pngToIco(generatedPngs);
    // 确保目录存在
    const outDir = path.dirname(outIco);
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(outIco, icoBuffer);

    console.log('Advanced favicon generated:', outIco, 'size:', icoBuffer.length);
    // 清理临时文件
    for (const file of generatedPngs) fs.unlinkSync(file);
    fs.rmdirSync(tempDir);
  } catch (e) {
    console.error('Failed to generate advanced favicon:', e);
    process.exitCode = 1;
  }
})();