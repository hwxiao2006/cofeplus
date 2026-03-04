const assert = require('assert');
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'orders.html'), 'utf8');

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

test('移动端搜索面板应移除纵向 flex-basis 防止出现大块空白', () => {
  assert.ok(/@media\s*\(max-width:\s*1024px\)[\s\S]*\.order-search-panel\s*\{[\s\S]*flex:\s*0\s+0\s+auto;/.test(html));
});
