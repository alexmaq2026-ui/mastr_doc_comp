const fs = require('fs');
const { execSync } = require('child_process');

// Search for Edge or Chrome
const paths = [
  'C:\\\\Program Files\\\\Microsoft\\\\Edge\\\\Application\\\\msedge.exe',
  'C:\\\\Program Files (x86)\\\\Microsoft\\\\Edge\\\\Application\\\\msedge.exe',
  'C:\\\\Program Files\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe',
];

let found = '';
for (const p of paths) {
  try {
    if (fs.existsSync(p)) { found = p; break; }
  } catch(e) {}
}

console.log('FOUND:', found || 'NONE');
