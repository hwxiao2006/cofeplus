const assert = require('assert');
const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'tasks', 'prd-staff-management-user-flow.html');
const mdPath = path.join(__dirname, '..', 'tasks', 'prd-staff-management-user-flow.md');

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

test('人员管理 PRD 应提供独立 HTML 产物', () => {
  assert.ok(fs.existsSync(htmlPath), 'missing standalone HTML PRD artifact');
  assert.ok(fs.existsSync(mdPath), 'missing markdown PRD source');
});

test('人员管理 PRD 应覆盖角色模板与两步切换完整流程', () => {
  const markdown = fs.readFileSync(mdPath, 'utf8');

  [
    'UF-001',
    'UF-002',
    'UF-003',
    'UF-004',
    'UF-005',
    'UF-006',
    'UF-007',
    'UF-008',
    'UF-009',
    'UF-010',
    'UF-011',
    'UF-012'
  ].forEach(flowId => {
    assert.ok(markdown.includes(`### ${flowId}`), `missing user flow section: ${flowId}`);
  });

  [
    'v2.1（角色模板权限方案）',
    '本版重点变化',
    '角色模板与权限模型',
    '角色切换状态机',
    '数据保存契约',
    'permissionChanges',
    '同一商户下手机号不得重复',
    'pendingRoleSwitch',
    'uf004-role-template.svg',
    'uf005-current-role.svg',
    'uf006-role-switch-confirm.svg',
    'uf007-role-undo.svg',
    'uf008-role-customization.svg'
  ].forEach(keyword => {
    assert.ok(markdown.includes(keyword), `missing optimized PRD keyword: ${keyword}`);
  });

  [
    'lastCommitSnapshot',
    'lastCommitSnapshot != null',
    'lastCommitSnapshot = null',
    '置 null',
    'invalidate lastCommitSnapshot'
  ].forEach(forbiddenText => {
    assert.ok(!markdown.includes(forbiddenText), `PRD should avoid implementation-only wording: ${forbiddenText}`);
  });
});

test('人员管理 HTML PRD 应同步 12 个用户流程并内联截图', () => {
  const html = fs.readFileSync(htmlPath, 'utf8');

  [
    'UF-001',
    'UF-002',
    'UF-003',
    'UF-004',
    'UF-005',
    'UF-006',
    'UF-007',
    'UF-008',
    'UF-009',
    'UF-010',
    'UF-011',
    'UF-012'
  ].forEach(flowId => {
    assert.ok(html.includes(flowId), `missing user flow section: ${flowId}`);
  });

  const figureCount = (html.match(/<figure class="doc-image">/g) || []).length;
  const inlineImageCount = (html.match(/src="data:image\/png;base64,/g) || []).length;
  const inlineSvgCount = (html.match(/src="data:image\/svg\+xml;base64,/g) || []).length;
  assert.ok(figureCount >= 12, 'expected screenshots for all twelve user flows');
  assert.ok(inlineImageCount + inlineSvgCount >= 12, 'expected all flow screenshots to be inlined');
  assert.ok(inlineSvgCount >= 5, 'expected role assignment SVG screenshots to be inlined');
  assert.ok(!html.includes('src="../screenshots/'), 'final HTML should not depend on relative screenshot paths');
  [
    'lastCommitSnapshot',
    'lastCommitSnapshot != null',
    'lastCommitSnapshot = null',
    '置 null',
    'invalidate lastCommitSnapshot'
  ].forEach(forbiddenText => {
    assert.ok(!html.includes(forbiddenText), `HTML PRD should avoid implementation-only wording: ${forbiddenText}`);
  });
});
