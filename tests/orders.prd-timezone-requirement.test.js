const assert = require('assert');
const fs = require('fs');
const path = require('path');

const markdown = fs.readFileSync(path.join(__dirname, '..', 'tasks', 'prd-orders-management-user-flow.md'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '..', 'tasks', 'prd-orders-management-user-flow.html'), 'utf8');

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

test('订单管理 PRD 应明确指标卡今日口径按浏览器本地日期计算', () => {
  const requiredSnippets = [
    '顶部指标卡中的“今日”必须按用户当前浏览器本地日期计算',
    '订单列表中的订单时间仍按订单产生时的本地时间语义展示'
  ];

  requiredSnippets.forEach(snippet => {
    assert.ok(markdown.includes(snippet), `markdown missing snippet: ${snippet}`);
    assert.ok(html.includes(snippet), `html missing snippet: ${snippet}`);
  });
});
