const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const galleryHtml = fs.readFileSync(path.join(root, 'login-gallery.html'), 'utf8');

function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    console.error(error.message);
    process.exitCode = 1;
  }
}

test('index 应跳转到 login-gallery.html', () => {
  assert.ok(/url=login-gallery\.html/.test(indexHtml));
  assert.ok(/window\.location\.replace\('login-gallery\.html'\)/.test(indexHtml));
});

test('gallery 页应展示三套登录方案入口', () => {
  assert.ok(/href="login-morning\.html"/.test(galleryHtml));
  assert.ok(/href="login-counter\.html"/.test(galleryHtml));
  assert.ok(/href="login-paper\.html"/.test(galleryHtml));
  assert.ok(/清晨咖啡馆/.test(galleryHtml));
  assert.ok(/夜间吧台/.test(galleryHtml));
  assert.ok(/手作菜单纸/.test(galleryHtml));
});

test('gallery 页应包含移动端断点和统一品牌文案', () => {
  assert.ok(/COFE\+/.test(galleryHtml));
  assert.ok(/运营控制台/.test(galleryHtml));
  assert.ok(/@media\s*\(max-width:\s*768px\)/.test(galleryHtml));
});
