const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

const browserExe = fs.existsSync(chromePath) ? chromePath : edgePath;
const htmlFile = path.resolve(__dirname, 'report_tiebreaker_guide.html');
const tempPdf = path.resolve(__dirname, 'temp_guide.pdf');

const rootDir = path.resolve(__dirname, '..');
const outPdf1 = path.join(rootDir, 'دليل_معايير_كسر_التعادل_والخيارات_المتقدمة_20-08-2026.pdf');
const outPdf2 = path.join(rootDir, 'إيضاحات_كسر_التعادل_20-08-2026.pdf');
const outPdf3 = path.join(rootDir, 'إيضاحات_المحادثة_الخميس_20_أغسطس_2026.pdf');

console.log('Generating PDF...');
try {
    execFileSync(browserExe, [
        '--headless=new',
        '--disable-gpu',
        '--no-pdf-header-footer',
        `--print-to-pdf=${tempPdf}`,
        `file:///${htmlFile.replace(/\\/g, '/')}`
    ], { stdio: 'inherit' });

    if (fs.existsSync(tempPdf)) {
        fs.copyFileSync(tempPdf, outPdf1);
        fs.copyFileSync(tempPdf, outPdf2);
        fs.copyFileSync(tempPdf, outPdf3);
        console.log('✅ Generated PDF 1:', outPdf1);
        console.log('✅ Generated PDF 2:', outPdf2);
        console.log('✅ Generated PDF 3:', outPdf3);
    } else {
        console.error('❌ Failed to generate PDF');
    }
} catch (e) {
    console.error('Error generating PDF:', e);
}
