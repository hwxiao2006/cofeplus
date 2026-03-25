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

['menu.html', 'overview.html'].forEach((htmlFile) => {
  const html = fs.readFileSync(path.join(__dirname, '..', htmlFile), 'utf8');

  test(`${htmlFile} 不应再保留推荐商品统计卡`, () => {
    assert.ok(!html.includes('id="featuredCount"'));
    assert.ok(!html.includes(">推荐商品<"));
    assert.ok(!/getElementById\('featuredCount'\)/.test(html));
  });

  test(`${htmlFile} 不应再保留推荐商品编辑开关`, () => {
    assert.ok(!html.includes('id="productFeatured"'));
    assert.ok(!html.includes('设为推荐商品'));
    assert.ok(!/getElementById\('productFeatured'\)/.test(html));
  });

  test(`${htmlFile} 不应再渲染推荐商品徽标`, () => {
    assert.ok(!html.includes('featured-badge'));
    assert.ok(!/p\.featured\s*\?\s*['"`]<span class="featured-badge">推荐<\/span>/.test(html));
  });
});
