const assert = require('assert');
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'login-paper.html'), 'utf8');

function test(name, fn) {
  try { fn(); console.log(`PASS ${name}`); }
  catch (e) { console.error(`FAIL ${name}`); console.error(e.message); process.exitCode = 1; }
}

test('login-paper.html 应加载 shared/admin-staff-access.js', () => {
  assert.ok(
    /<script[^>]+src="shared\/admin-staff-access\.js"[^>]*>\s*<\/script>/.test(html),
    'admin-staff-access.js 应通过 <script src> 加载'
  );
});

test('persistLoginSession 应把 role 写入 sidebarLoginProfile', () => {
  const fnStart = html.indexOf('function persistLoginSession(');
  const fnEnd = html.indexOf('\n        function ', fnStart + 1);
  const fnBody = html.slice(fnStart, fnEnd);
  assert.ok(
    /CofeAdminStaffAccess\.detectRole\(/.test(fnBody),
    'persistLoginSession 应调用 CofeAdminStaffAccess.detectRole'
  );
  assert.ok(
    /role:/.test(fnBody),
    'persistLoginSession 应把 role 字段写进 profile'
  );
});

test('超管账号(superadmin/ops)登录 profile 不应携带 C001 merchantId', () => {
  const fnStart = html.indexOf('function persistLoginSession(');
  const fnEnd = html.indexOf('\n        function ', fnStart + 1);
  const fnBody = html.slice(fnStart, fnEnd);
  // must have conditional merchantId — either empty or skipped when super_admin
  assert.ok(
    /super_admin/.test(fnBody) || /role\s*===\s*['"]super_admin['"]/.test(fnBody),
    'persistLoginSession 应对 super_admin 做分支处理'
  );
});
