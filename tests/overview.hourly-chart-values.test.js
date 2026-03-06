const assert = require('assert');
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'overview.html'), 'utf8');

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

test('总览页小时柱状图应显示每小时销售数字', () => {
  assert.ok(/\.hour-value\s*\{/.test(html));
  assert.ok(/<div class="hour-value">\$\{hourValues\[idx\]\.toLocaleString\('zh-CN'\)\}<\/div>/.test(html));
});
