import fs from 'fs';
import path from 'path';
import pngToIco from 'png-to-ico';

const srcPng = path.resolve('public/assets/vi/avatar.png');
const outIco = path.resolve('public/favicon.ico');

(async () => {
  try {
    if (!fs.existsSync(srcPng)) {
      throw new Error('Source PNG not found: ' + srcPng);
    }
    const icoBuffer = await pngToIco(srcPng);
    fs.writeFileSync(outIco, icoBuffer);
    console.log('Generated', outIco, 'size:', icoBuffer.length);
  } catch (e) {
    console.error('Failed to generate favicon.ico:', e);
    process.exitCode = 1;
  }
})();