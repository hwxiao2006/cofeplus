const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const slug = 'prd-product-detail-images-option-group-order';
const md = fs.readFileSync(path.join(root, 'tasks', slug + '.md'), 'utf8');
const html = fs.readFileSync(path.join(root, 'tasks', slug + '.html'), 'utf8');
test('PRD 配对源文件、图片引用和独立截图完整', () => {
    const sources = [...md.matchAll(/!\[[^\]]+\]\(([^)]+)\)/g)].map(m => m[1]);
    assert.equal(sources.length, 7);
    for (const source of sources) assert.ok(fs.existsSync(path.resolve(root, 'tasks', source)), source);
    const images = [...html.matchAll(/<img\b[^>]*src="([^"]+)"/g)].map(m => m[1]);
    assert.equal(images.length, sources.length);
    assert.ok(images.every(src => src.startsWith('data:image/png;base64,')));
});
test('PRD 包含关键行为、验收和简洁目录，站点提供入口', () => {
    for (const text of ['持续跟随', '独立详情图', '虚线占位', '不保存直接预览', '触屏', '取消拖动', 'A16']) {
        assert.ok(md.includes(text), text);
        assert.ok(html.includes(text), text);
    }
    const toc = html.match(/<nav[\s\S]*?<\/nav>/)[0];
    assert.equal([...toc.matchAll(/href="#section-/g)].length, 8);
    const index = fs.readFileSync(path.join(root, 'scripts/prd_site_index.html'), 'utf8');
    assert.ok(index.includes(`/tasks/${slug}.html`));
    for (const word of ['localStorage', 'optionGroupOrder', 'productDetailImage', 'postMessage']) assert.ok(!md.includes(word), word);
});
