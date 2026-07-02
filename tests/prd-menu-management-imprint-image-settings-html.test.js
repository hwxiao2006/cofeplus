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
  assert.ok(
    source.startsWith('data:image/svg+xml;base64,'),
    'reference screenshots should be embedded SVG data URIs'
  );

  const decoded = Buffer.from(source.replace('data:image/svg+xml;base64,', ''), 'base64').toString('utf8');
  assert.ok(decoded.includes('<svg '), 'embedded screenshot should decode to SVG markup');
}
