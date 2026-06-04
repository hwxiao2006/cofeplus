const assert = require('assert');
const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'tasks', 'prd-copy-product-flow.html');

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

test('复制商品 PRD 应限制每次只能复制到一台目标设备', () => {
  const html = fs.readFileSync(htmlPath, 'utf8');

  assert.ok(html.includes('必须且只能选择一台目标设备'), 'target device selection should be single-choice');
  assert.ok(html.includes('不支持一次复制到多台机器'), 'multi-machine copy should be explicitly out of scope');
  assert.ok(html.includes('如需复制到多台机器，必须逐台重复发起复制流程'), 'multi-machine operations should require repeated copy flows');
  assert.ok(!html.includes('批量多设备复制'), 'old batch multi-device target should be removed');
  assert.ok(!html.includes('支持一次选择多个目标设备'), 'old multi-select device requirement should be removed');
  assert.ok(!html.includes('一次复制到多个设备时'), 'old multiple-device copy wording should be removed');
});
