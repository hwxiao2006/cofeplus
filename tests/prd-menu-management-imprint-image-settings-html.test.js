const assert = require('assert');
const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'tasks', 'prd-menu-management-imprint-image-settings.html');
const html = fs.readFileSync(htmlPath, 'utf8');

const imageSources = Array.from(html.matchAll(/<img\b[^>]*\bsrc="([^"]+)"/g), match => match[1]);

assert.strictEqual(imageSources.length, 4, 'PRD should include four reference screenshots');
assert.ok(
  !html.includes('../screenshots/menu-tag-imprint-prd/'),
  'standalone PRD should not depend on external screenshot paths'
);

for (const source of imageSources) {
  const pngPrefix = 'data:image/png;base64,';

  assert.ok(
    source.startsWith(pngPrefix),
    'reference screenshots should be embedded PNG data URIs'
  );

  const decoded = Buffer.from(source.slice(pngPrefix.length), 'base64');
  assert.deepStrictEqual(
    Array.from(decoded.subarray(0, 8)),
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
    'embedded screenshot should decode to PNG data'
  );
}

assert.ok(
  !html.includes('data:image/svg+xml;base64,'),
  'PRD should not use generated SVG mock screenshots'
);
assert.ok(
  html.includes('生产页面当前通过浏览器原生确认弹窗完成删除确认'),
  'delete flow should explain why the native confirm dialog is not visible in the reference screenshot'
);
