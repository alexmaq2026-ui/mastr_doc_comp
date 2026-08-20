const fs = require('fs');
const path = require('path');

const src1 = path.join(__dirname, 'آخر_التعديل_الخميس_20_أغسطس_2026.pdf');
const src2 = path.join(__dirname, 'آخر_التعديل_20-08-2026.pdf');

const rootDir = path.resolve(__dirname, '..');

fs.copyFileSync(src1, path.join(rootDir, 'آخر_التعديل_الخميس_20_أغسطس_2026.pdf'));
fs.copyFileSync(src2, path.join(rootDir, 'آخر_التعديل_20-08-2026.pdf'));
fs.copyFileSync(src1, path.join(rootDir, 'آخر_التعديل.pdf'));

console.log('✅ Copied to root workspace successfully');
