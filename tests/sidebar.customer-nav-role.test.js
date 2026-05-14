const assert = require('assert');
const fs = require('fs');
const path = require('path');

function test(name, fn) {
  try { fn(); console.log(`PASS ${name}`); }
  catch (e) { console.error(`FAIL ${name}`); console.error(e.message); process.exitCode = 1; }
}

// Files with 客户管理 sidebar nav link
const FILES = [
  'customers.html',
  'faults.html',
  'locations.html',
  'materials.html',
  'staff-management.html'
];

FILES.forEach((file) => {
  const html = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

  test(`${file} 的客户管理菜单项应带 data-nav="customers"`, () => {
    assert.ok(
      /<a[^>]+href="customers\.html"[^>]+data-nav="customers"/.test(html) ||
      /<a[^>]+data-nav="customers"[^>]+href="customers\.html"/.test(html),
      '<a href="customers.html"> 应包含 data-nav="customers"'
    );
  });

  test(`${file} 客户管理菜单项的标签 span 应带 class="nav-label"`, () => {
    const re = /<a[^>]+data-nav="customers"[\s\S]*?<\/a>/;
    const m = html.match(re);
    assert.ok(m, '应能匹配出 data-nav="customers" 的 <a>');
    assert.ok(/class="nav-label"/.test(m[0]), '<span> 应带 class="nav-label"');
  });

  test(`${file} 应加载 shared/admin-staff-access.js`, () => {
    assert.ok(
      /<script[^>]+src="shared\/admin-staff-access\.js"/.test(html),
      'admin-staff-access.js 应通过 <script src> 加载'
    );
  });

  test(`${file} 应调用 applyNavLabelsByRole`, () => {
    assert.ok(
      /applyNavLabelsByRole\s*\(\s*\)/.test(html),
      '应调用 applyNavLabelsByRole()'
    );
  });
});
