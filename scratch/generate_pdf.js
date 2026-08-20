const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

const browserExe = fs.existsSync(chromePath) ? chromePath : edgePath;
const htmlFile = path.resolve(__dirname, 'scratch', 'report_latest_changes.html');
const outputFile = path.resolve(__dirname, 'آخر_التعديل_الخميس_20_أغسطس_2026.pdf');
const outputFile2 = path.resolve(__dirname, 'آخر_التعديل_20-08-2026.pdf');

console.log('Using browser:', browserExe);
console.log('Input HTML:', htmlFile);
console.log('Output PDF:', outputFile);

try {
    execFileSync(browserExe, [
        '--headless=new',
        '--disable-gpu',
        '--no-pdf-header-footer',
        `--print-to-pdf=${outputFile}`,
        `file:///${htmlFile.replace(/\\/g, '/')}`
    ], { stdio: 'inherit' });

    if (fs.existsSync(outputFile)) {
        fs.copyFileSync(outputFile, outputFile2);
        console.log('✅ PDF generated successfully:', outputFile);
        console.log('✅ Copy created:', outputFile2);
    } else {
        console.error('❌ PDF was not created');
    }
} catch (err) {
    console.error('Error generating PDF:', err);
}
