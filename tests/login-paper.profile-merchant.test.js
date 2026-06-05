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

const html = fs.readFileSync(path.join(__dirname, '..', 'login-paper.html'), 'utf8');
const staffHtml = fs.readFileSync(path.join(__dirname, '..', 'staff-management.html'), 'utf8');

function extractMatch(source, pattern, label) {
  const match = source.match(pattern);
  assert.ok(match, `未找到 ${label}`);
  return match[1];
}

const staffDefaultName = extractMatch(
  staffHtml,
  /const\s+defaultManagers\s*=\s*\[\s*\{[\s\S]*?merchantId:\s*'C001'[\s\S]*?username:\s*'([^']+)'[\s\S]*?phone:\s*'[^']+'[\s\S]*?accountEnabled:\s*true/,
  '人员管理默认启用人员姓名'
);
const staffDefaultPhone = extractMatch(
  staffHtml,
  /const\s+defaultManagers\s*=\s*\[\s*\{[\s\S]*?merchantId:\s*'C001'[\s\S]*?username:\s*'[^']+'[\s\S]*?phone:\s*'([^']+)'[\s\S]*?accountEnabled:\s*true/,
  '人员管理默认启用人员手机号'
);

test('纸感登录页应把所属商户写入 sidebarLoginProfile', () => {
  assert.ok(/const\s+SIDEBAR_LOGIN_MERCHANT_ID\s*=\s*'C001'/.test(html));
  assert.ok(/const\s+SIDEBAR_LOGIN_MERCHANT_NAME\s*=\s*'星巴克咖啡'/.test(html));
  const fnStart = html.indexOf('function persistLoginSession(');
  assert.ok(fnStart >= 0, '应找到 persistLoginSession 函数');
  // Grab chunk from function start through the next top-level "function" declaration
  const fnNext = html.indexOf('\n        function ', fnStart + 30);
  const fn = html.slice(fnStart, fnNext > 0 ? fnNext : fnStart + 2000);
  assert.ok(/SIDEBAR_LOGIN_MERCHANT_ID/.test(fn), '函数体应引用 SIDEBAR_LOGIN_MERCHANT_ID');
  assert.ok(/SIDEBAR_LOGIN_MERCHANT_NAME/.test(fn), '函数体应引用 SIDEBAR_LOGIN_MERCHANT_NAME');
  assert.ok(/localStorage\.setItem\(LOGIN_SESSION_KEY,/.test(fn), '应写 LOGIN_SESSION_KEY');
  assert.ok(/localStorage\.setItem\(SIDEBAR_LOGIN_PROFILE_KEY,/.test(fn), '应写 SIDEBAR_LOGIN_PROFILE_KEY');
  assert.ok(/merchantId/.test(fn) && /merchantName/.test(fn),
    '应写入 merchantId / merchantName 字段');
});

test('纸感登录页默认账号应与人员管理默认启用人员一致', () => {
  assert.ok(new RegExp(`value="${staffDefaultPhone}"`).test(html));
  assert.ok(new RegExp(`const\\s+SIDEBAR_LOGIN_DISPLAY_NAME\\s*=\\s*'${staffDefaultName}'`).test(html));
  assert.ok(new RegExp(`const\\s+SIDEBAR_LOGIN_DISPLAY_PHONE\\s*=\\s*'${staffDefaultPhone}'`).test(html));
});
