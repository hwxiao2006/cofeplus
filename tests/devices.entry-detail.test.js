const assert = require('assert');
const fs = require('fs');
const path = require('path');

const deviceEntryPath = path.join(__dirname, '..', 'device-entry.html');
const devicesPath = path.join(__dirname, '..', 'devices.html');

const deviceEntryHtml = fs.readFileSync(deviceEntryPath, 'utf8');
const devicesHtml = fs.readFileSync(devicesPath, 'utf8');

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

test('入场提交应持久化 entryInfo 结构', () => {
  assert.ok(/function\s+buildEntryInfoPayload\s*\(/.test(deviceEntryHtml));
  assert.ok(/device\.entryInfo\s*=\s*buildEntryInfoPayload\(\)/.test(deviceEntryHtml));
  assert.ok(/entryAt/.test(deviceEntryHtml));
});

test('设备详情应提供核心信息与全字段折叠入口', () => {
  assert.ok(/function\s+renderEntryCoreRows\s*\(/.test(devicesHtml));
  assert.ok(/function\s+renderEntryAllRows\s*\(/.test(devicesHtml));
  assert.ok(devicesHtml.includes('查看全部入场信息'));
  assert.ok(/<details[^>]*detail-entry-all/.test(devicesHtml));
});

test('设备详情渲染应读取 device.entryInfo', () => {
  assert.ok(/device\.entryInfo/.test(devicesHtml));
  assert.ok(/renderEntryCoreRows\s*\(/.test(devicesHtml));
  assert.ok(/renderEntryAllRows\s*\(/.test(devicesHtml));
});

test('缺少入场信息时应自动回填 mock 数据用于预览样式', () => {
  assert.ok(/function\s+buildMockEntryInfo\s*\(/.test(devicesHtml));
  assert.ok(/function\s+seedMockEntryInfoForPreview\s*\(/.test(devicesHtml));
  assert.ok(/\|\|\s*d\.entryInfo\s*\)\s*return/.test(devicesHtml));
  assert.ok(/seedMockEntryInfoForPreview\(devicesData,\s*runtimeLocationMap\)/.test(devicesHtml));
});

test('设备详情桌面端应使用超宽弹层与分组卡片布局', () => {
  assert.ok(/max-width:\s*1100px/.test(devicesHtml));
  assert.ok(/function\s+renderDetailCard\s*\(/.test(devicesHtml));
  assert.ok(/class=\"detail-grid\"/.test(devicesHtml));
  assert.ok(/detail-card-basic/.test(devicesHtml));
  assert.ok(/detail-card-entry-core/.test(devicesHtml));
  assert.ok(/detail-card-entry-all/.test(devicesHtml));
});

test('设备详情移动端应回退为单列卡片布局', () => {
  assert.ok(/@media\s*\(max-width:\s*768px\)[\s\S]*\.detail-grid\s*\{[\s\S]*grid-template-columns:\s*1fr/.test(devicesHtml));
});

test('设备详情图片应支持点击预览与左右切换', () => {
  assert.ok(/id="imagePreviewModal"/.test(devicesHtml));
  assert.ok(/class="entry-image-thumb"/.test(devicesHtml));
  assert.ok(/function\s+openImagePreview\s*\(/.test(devicesHtml));
  assert.ok(/function\s+switchImagePreview\s*\(/.test(devicesHtml));
  assert.ok(/function\s+collectEntryPreviewImages\s*\(/.test(devicesHtml));
});

test('mock 入场数据应包含更丰富字段与可区分示例图', () => {
  assert.ok(/function\s+buildMockImageDataUrl\s*\(/.test(devicesHtml));
  assert.ok(/operatorPhone/.test(devicesHtml));
  assert.ok(/networkSignal/.test(devicesHtml));
  assert.ok(/maintenanceWindow/.test(devicesHtml));
  assert.ok(/notes/.test(devicesHtml));
});

test('当入场图片原数据为空时应自动补充预览图', () => {
  assert.ok(/function\s+ensurePreviewImageUrls\s*\(/.test(devicesHtml));
  assert.ok(/function\s+hydrateEntryInfoForPreview\s*\(/.test(devicesHtml));
  assert.ok(/if\s*\(!displayImages\.length\)/.test(devicesHtml));
  assert.ok(/if\s*\(!locationImages\.length\)/.test(devicesHtml));
  assert.ok(/hydrateEntryInfoForPreview\(devicesData,\s*runtimeLocationMap\)/.test(devicesHtml));
});

test('入场图片改为卡片展示后，详情表格中不再重复显示图片统计行', () => {
  assert.ok(!/\['显示器画面',\s*info\.displayImages/.test(devicesHtml));
  assert.ok(!/\['点位照片',\s*info\.locationImages/.test(devicesHtml));
});

test('入场全部信息在点击详情时应默认收起（双端一致）', () => {
  assert.ok(!/isDesktopDetail\s*\?\s*'open'\s*:\s*''/.test(devicesHtml));
  assert.ok(/<details class="detail-entry-all">\s*<summary>查看全部入场信息<\/summary>/.test(devicesHtml));
});

test('详情页应提供编辑入场信息入口并支持保存', () => {
  assert.ok(/id="entryEditModal"/.test(devicesHtml));
  assert.ok(/id="entryEditBtn"/.test(devicesHtml));
  assert.ok(/id="editEntryAt"/.test(devicesHtml));
  assert.ok(/id="editGpsAction"/.test(devicesHtml));
  assert.ok(/id="editLongitude"/.test(devicesHtml));
  assert.ok(/id="editLatitude"/.test(devicesHtml));
  assert.ok(/id="editDisplayImagesInput"/.test(devicesHtml));
  assert.ok(/id="editLocationImagesInput"/.test(devicesHtml));
  assert.ok(/id="editDeviceStartDate"/.test(devicesHtml));
  assert.ok(/id="editDeviceEndDate"/.test(devicesHtml));
  assert.ok(/id="editTerminalGeneration5"/.test(devicesHtml));
  assert.ok(/id="editParallelProduction"/.test(devicesHtml));
  assert.ok(/function\s+openEntryEditModal\s*\(/.test(devicesHtml));
  assert.ok(/function\s+saveEntryInfoEdit\s*\(/.test(devicesHtml));
  assert.ok(/function\s+handleEntryImageUpload\s*\(/.test(devicesHtml));
  assert.ok(/new FileReader\(\)/.test(devicesHtml));
  assert.ok(/currentDetailDeviceId/.test(devicesHtml));
  assert.ok(/entryInfo\s*=\s*\{[\s\S]*operatorName[\s\S]*displayImageUrls[\s\S]*locationImageUrls/.test(devicesHtml));
});
