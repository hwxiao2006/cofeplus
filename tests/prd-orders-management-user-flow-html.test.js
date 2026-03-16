const assert = require('assert');
const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'tasks', 'prd-orders-management-user-flow.html');

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

test('订单管理 PRD 应提供独立 HTML 产物', () => {
  assert.ok(fs.existsSync(htmlPath), 'missing standalone HTML PRD artifact');
});

test('订单管理 HTML PRD 应为每个用户流程内联入口截图', () => {
  const html = fs.readFileSync(htmlPath, 'utf8');

  [
    'UF-001',
    'UF-002',
    'UF-003',
    'UF-004',
    'UF-005',
    'UF-006',
    'UF-007',
    'UF-008'
  ].forEach(flowId => {
    assert.ok(html.includes(flowId), `missing user flow section: ${flowId}`);
  });

  const figureCount = (html.match(/<figure class="doc-image">/g) || []).length;
  const inlineImageCount = (html.match(/src="data:image\/png;base64,/g) || []).length;
  assert.ok(figureCount >= 8, 'expected at least eight screenshot figures');
  assert.ok(inlineImageCount >= 8, 'expected at least eight inline base64 screenshots');
  assert.ok(!/src="screenshots\//.test(html), 'final HTML should not depend on relative screenshot paths');
});
