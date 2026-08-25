const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const browserExe = fs.existsSync(chromePath) ? chromePath : edgePath;

const rootDir = path.resolve(__dirname, '..');
const htmlFile = path.join(rootDir, 'تحديث_25-08-2026.html');

const out1 = path.join(rootDir, 'تحديث_25-08-2026.pdf');
const out2 = path.join(rootDir, 'تحديث1_25-08-2026.pdf');
const out3 = path.join(rootDir, 'تحديث_2026-08-25.pdf');

console.log('Using browser:', browserExe);
console.log('Input HTML:', htmlFile);

try {
    execFileSync(browserExe, [
        '--headless=new',
        '--disable-gpu',
        '--no-pdf-header-footer',
        `--print-to-pdf=${out1}`,
        `file:///${htmlFile.replace(/\\/g, '/')}`
    ], { stdio: 'inherit' });

    if (fs.existsSync(out1)) {
        fs.copyFileSync(out1, out2);
        fs.copyFileSync(out1, out3);
        console.log('✅ Generated PDF 1:', out1);
        console.log('✅ Generated PDF 2:', out2);
        console.log('✅ Generated PDF 3:', out3);
    } else {
        console.error('❌ PDF was not created at:', out1);
        process.exit(1);
    }
} catch (err) {
    console.error('Error generating PDF:', err);
    process.exit(1);
}
