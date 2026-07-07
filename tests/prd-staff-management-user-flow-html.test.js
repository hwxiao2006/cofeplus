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

test('人员管理 PRD v2.4 应采用规则单点定义结构', () => {
  const markdown = fs.readFileSync(mdPath, 'utf8');

  // 11 个用户流程（v2.3 合并后延续）
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
    'UF-011'
  ].forEach(flowId => {
    assert.ok(markdown.includes(`### ${flowId}`), `missing user flow section: ${flowId}`);
  });
  assert.ok(!markdown.includes('### UF-012'), 'v2.3 merged flows: UF-012+ should not exist');

  // 顶级结构：版本记录 + 单点定义章节
  [
    'v2.4 设备逐台分配与范围跟人走',
    '## 0. 版本记录',
    '## 2. 角色与授权模型',
    '### 2.1 角色模板总表',
    '### 2.2 数据范围',
    '### 2.3 分级授权与人员维护门禁',
    '### 2.5 登录方式与账号绑定',
    '### 4.1 角色切换状态机',
    '### 4.2 校验规则表',
    '## 5. 数据保存契约',
    '## 7. 发布检查清单'
  ].forEach(keyword => {
    assert.ok(markdown.includes(keyword), `missing v2.4 structure keyword: ${keyword}`);
  });

  // v2.4 四条分配原则的核心口径
  [
    '角色只在首次分配时有效',
    '数据范围跟人走',
    '分配的设备不能超过你本人的数据权限',
    '暂不归属商户',
    '未归属商户'
  ].forEach(keyword => {
    assert.ok(markdown.includes(keyword), `missing v2.4 principle keyword: ${keyword}`);
  });

  // 关键领域内容：角色 / 数据范围 / 登录绑定
  [
    '平台运维',
    '商户管理员',
    '全平台',
    '指定设备',
    '邮箱',
    'Google',
    '同一商户下手机号不得重复',
    'uf013-superadmin-add.png',
    'uf014-merchant-admin-add.png',
    'uf015-no-access.svg'
  ].forEach(keyword => {
    assert.ok(markdown.includes(keyword), `missing domain keyword: ${keyword}`);
  });

  // 邮箱规则：选填 + 二选一登录
  assert.ok(/邮箱.*选填|选填.*邮箱/s.test(markdown), 'email must be documented as optional');
  assert.ok(markdown.includes('二选一'), 'must document mini-program/Google either-or login');

  // 回归护栏：不得再出现「所属商户」选择、「本商户」三档数据范围、同商户锁定
  assert.ok(!markdown.includes('平台级（不绑定商户）'), 'v2.4 removed the platform-level merchant option');
  assert.ok(!markdown.includes('目标商户'), 'v2.4 removed target-merchant selection');
  assert.ok(!markdown.includes('跨商户不可选'), 'v2.4 removed the cross-merchant lock');
  assert.ok(!/数据范围[^，。]*本商户[^，。]*指定设备/.test(markdown), 'v2.4 collapsed data scope to two tiers');

  // 结构去重：v2.2 的 FR 编号清单与规则矩阵不应回归
  ['FR-1：', 'FR-63：', '## 8. 关键规则矩阵', '## 7. 功能需求'].forEach(legacy => {
    assert.ok(!markdown.includes(legacy), `v2.4 should not reintroduce duplicated structure: ${legacy}`);
  });

  // PRD 不应包含实现级标识符
  [
    'lastCommitSnapshot',
    'pendingRoleSwitch',
    'permissionChanges',
    'staffManagersData',
    'localStorage'
  ].forEach(forbiddenText => {
    assert.ok(!markdown.includes(forbiddenText), `PRD should avoid implementation-only wording: ${forbiddenText}`);
  });
});

test('人员管理 HTML PRD 应同步 11 个用户流程并内联全部截图', () => {
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
    'UF-011'
  ].forEach(flowId => {
    assert.ok(html.includes(flowId), `missing user flow section: ${flowId}`);
  });

  [
    'v2.4 设备逐台分配与范围跟人走',
    '平台运维',
    '商户管理员',
    '数据范围',
    '分级授权与人员维护门禁',
    '登录方式与账号绑定',
    '邮箱',
    '角色只在首次分配时有效',
    '数据范围跟人走'
  ].forEach(keyword => {
    assert.ok(html.includes(keyword), `missing v2.4 PRD keyword in HTML: ${keyword}`);
  });

  const figureCount = (html.match(/<figure class="doc-image">/g) || []).length;
  const inlineImageCount = (html.match(/src="data:image\/png;base64,/g) || []).length;
  const inlineSvgCount = (html.match(/src="data:image\/svg\+xml;base64,/g) || []).length;
  assert.ok(figureCount >= 14, `expected >=14 screenshots across flows, got ${figureCount}`);
  assert.strictEqual(figureCount, inlineImageCount + inlineSvgCount, 'every figure must be inlined');
  assert.ok(inlineSvgCount >= 1, 'expected the no-access SVG screenshot to be inlined');
  assert.ok(!html.includes('src="../screenshots/'), 'final HTML should not depend on relative screenshot paths');

  // 紧凑目录：只列顶级章节
  assert.ok(html.includes('<nav class="toc">'), 'HTML should include a compact table of contents');
  const tocLinks = (html.match(/<nav class="toc">[\s\S]*?<\/nav>/) || [''])[0].match(/<a /g) || [];
  assert.ok(tocLinks.length >= 6 && tocLinks.length <= 12, `TOC should list top-level sections only, got ${tocLinks.length} links`);

  [
    'lastCommitSnapshot',
    'pendingRoleSwitch',
    'staffManagersData'
  ].forEach(forbiddenText => {
    assert.ok(!html.includes(forbiddenText), `HTML PRD should avoid implementation-only wording: ${forbiddenText}`);
  });
});
