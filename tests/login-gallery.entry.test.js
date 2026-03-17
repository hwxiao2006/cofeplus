const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

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

test('index 应直接跳转到 login-paper.html', () => {
  assert.ok(/url=login-paper\.html/.test(indexHtml));
  assert.ok(/window\.location\.replace\('login-paper\.html'\)/.test(indexHtml));
});

test('仓库中不应继续保留画廊页和其他登录方案页', () => {
  ['login-gallery.html', 'login-morning.html', 'login-counter.html'].forEach(file => {
    assert.ok(!fs.existsSync(path.join(root, file)), `${file} should be removed`);
  });
});
