const assert = require('assert');
const fs = require('fs');
const path = require('path');

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

const customersHtml = fs.readFileSync(path.join(__dirname, '..', 'customers.html'), 'utf8');

test('客户管理页：客户列表应包含客户编号列标题', () => {
  assert.ok(customersHtml.includes('客户编号'), '缺少客户编号列标题');
});

test('客户管理页：客户列表项应渲染客户编号字段', () => {
  assert.ok(/class="customer-code-value">\$\{customer\.id\}<\/span>/.test(customersHtml), '缺少客户编号字段渲染');
});
