const assert = require('assert');
const fs = require('fs');
const path = require('path');

const repoRoot = path.join(__dirname, '..');
const markdownPath = path.join(repoRoot, 'tasks', 'prd-device-management-user-flow.md');
const htmlPath = path.join(repoRoot, 'tasks', 'prd-device-management-user-flow.html');
const bundleHtmlPath = path.join(repoRoot, 'prd-site', 'tasks', 'prd-device-management-user-flow.html');
const implementationPath = path.join(repoRoot, 'device-entry.html');
const screenshotName = 'uf011-device-entry-wizard.png';
const screenshotPath = path.join(repoRoot, 'screenshots', 'device-prd', screenshotName);
const bundleScreenshotPath = path.join(repoRoot, 'prd-site', 'screenshots', 'device-prd', screenshotName);
const detailScreenshotName = 'uf004-detail-overview-latest.png';
const detailScreenshotPath = path.join(repoRoot, 'screenshots', 'device-prd', detailScreenshotName);
const bundleDetailScreenshotPath = path.join(repoRoot, 'prd-site', 'screenshots', 'device-prd', detailScreenshotName);

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

test('设备管理 PRD 应描述当前三步设备入场向导', () => {
  const implementation = fs.readFileSync(implementationPath, 'utf8');
  const markdown = fs.readFileSync(markdownPath, 'utf8');
  const html = fs.readFileSync(htmlPath, 'utf8');

  [
    '基本信息',
    '运维 · 支付',
    '广告屏',
    '三步向导',
    screenshotName
  ].forEach(keyword => {
    assert.ok(markdown.includes(keyword), `missing markdown keyword: ${keyword}`);
    assert.ok(html.includes(keyword), `missing HTML keyword: ${keyword}`);
  });

  assert.ok(implementation.includes('class="wiz-stepper"'), 'implementation is missing the wizard stepper');
  ['data-step="1"', 'data-step="2"', 'data-step="3"'].forEach(step => {
    assert.ok(implementation.includes(step), `implementation is missing wizard step: ${step}`);
  });

  ['左右双栏', 'uf011-device-entry-latest.svg', '设备录入'].forEach(staleText => {
    assert.ok(!markdown.includes(staleText), `markdown still contains stale wording: ${staleText}`);
    assert.ok(!html.includes(staleText), `HTML still contains stale wording: ${staleText}`);
  });
});

test('设备管理 PRD HTML 与上传包应使用新版设备入场截图', () => {
  assert.ok(fs.existsSync(screenshotPath), `missing source screenshot: ${screenshotPath}`);
  assert.ok(fs.existsSync(bundleScreenshotPath), `missing bundled screenshot: ${bundleScreenshotPath}`);

  const html = fs.readFileSync(htmlPath, 'utf8');
  const bundleHtml = fs.readFileSync(bundleHtmlPath, 'utf8');
  assert.strictEqual(bundleHtml, html, 'bundled device PRD HTML is out of sync with tasks source');
  assert.ok(html.includes(`src="../screenshots/device-prd/${screenshotName}"`));

  const screenshotRefs = [...html.matchAll(/<img\b[^>]*\bsrc="([^"]+)"/g)]
    .map(match => match[1])
    .filter(src => !src.startsWith('data:'));
  screenshotRefs.forEach(src => {
    const resolved = path.resolve(path.dirname(bundleHtmlPath), src);
    assert.ok(fs.existsSync(resolved), `missing bundled PRD screenshot: ${src}`);
  });
});

test('设备详情 PRD 应使用顶部摘要与标签页版最新截图', () => {
  const markdown = fs.readFileSync(markdownPath, 'utf8');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const implementation = fs.readFileSync(path.join(repoRoot, 'devices.html'), 'utf8');

  assert.ok(fs.existsSync(detailScreenshotPath), `missing source detail screenshot: ${detailScreenshotPath}`);
  assert.ok(fs.existsSync(bundleDetailScreenshotPath), `missing bundled detail screenshot: ${bundleDetailScreenshotPath}`);

  [
    detailScreenshotName,
    '顶部摘要',
    '概览',
    '运行',
    '记录',
    '入场',
    '广告屏',
    '编辑入场信息'
  ].forEach(keyword => {
    assert.ok(markdown.includes(keyword), `missing markdown detail keyword: ${keyword}`);
    assert.ok(html.includes(keyword), `missing HTML detail keyword: ${keyword}`);
  });

  ['detail-tabs', 'data-tab="overview"', 'data-tab="adscreen"'].forEach(keyword => {
    assert.ok(implementation.includes(keyword), `implementation is missing current detail structure: ${keyword}`);
  });

  assert.ok(!markdown.includes('uf004-detail-summary-latest.png'), 'markdown still references stale detail screenshot');
  assert.ok(!html.includes('uf004-detail-summary-latest.png'), 'HTML still references stale detail screenshot');
  assert.ok(!markdown.includes('左主内容 + 右侧操作区'), 'markdown still describes stale detail layout');
  assert.ok(!html.includes('左主内容 + 右侧操作区'), 'HTML still describes stale detail layout');
});
