/**
 * 静态检查：JS 里 $('xxx') / getElementById('xxx') 用到的 id，必须在 index.html 里存在。
 * 运行： node tests/check-ids.js
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.dirname(__dirname);
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const htmlIds = new Set([...html.matchAll(/id="([^"]+)"/g)].map(m => m[1]));

const jsFiles = fs.readdirSync(path.join(ROOT, 'js')).filter(f => f.endsWith('.js'));
const used = new Map();
for (const f of jsFiles) {
  const src = fs.readFileSync(path.join(ROOT, 'js', f), 'utf8');
  for (const m of src.matchAll(/\$\('([^']+)'\)/g)) used.set(m[1], f);
  for (const m of src.matchAll(/getElementById\('([^']+)'\)/g)) used.set(m[1], f);
}

/* 这些是运行时动态创建 / 由 CSS 使用，不需要在 HTML 里 */
const ALLOW = new Set(['toast']);

const missing = [];
for (const [id, file] of used) {
  if (htmlIds.has(id) || ALLOW.has(id)) continue;
  missing.push(id + ' (用于 ' + file + ')');
}

console.log('index.html 里的 id 数量: ' + htmlIds.size);
console.log('JS 引用的 id 数量: ' + used.size);
if (missing.length) {
  console.log('\n✘ 以下 id 在 HTML 里找不到:');
  for (const m of missing) console.log('   ' + m);
  process.exitCode = 1;
} else {
  console.log('\n✔ 所有引用的 id 都存在于 index.html');
}
