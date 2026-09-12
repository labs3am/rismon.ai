const fs = require('fs');
const path = require('path');
const testFile = path.join(__dirname, 'src', 'test', 'analyzer', 'inventory.test.ts');
const content = fs.readFileSync(path.join(__dirname, 'src', 'test', 'analyzer', 'inventory.test.ts.template'), 'utf-8');
fs.writeFileSync(testFile, content, 'utf-8');
console.log('Created:', testFile);
