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

test('设备详情应保留运维数据能力但不在卡片区重复展示', () => {
  assert.ok(/function\s+getMaintenanceRecordsByDevice\s*\(/.test(devicesHtml));
  assert.ok(/function\s+renderMaintenanceRecordsRows\s*\(/.test(devicesHtml));
  assert.ok(/function\s+renderDetailMaintenanceRecordCard\s*\(/.test(devicesHtml));
  assert.ok(/function\s+resolveMaintenanceOperatorInfo\s*\(/.test(devicesHtml));
  assert.ok(/function\s+normalizeDetailMaintenanceRecord\s*\(/.test(devicesHtml));
  assert.ok(/function\s+resolveMaintenanceRecordDeviceId\s*\(/.test(devicesHtml));
  assert.ok(/normalizedRecord\.deviceCode/.test(devicesHtml));
  assert.ok(/normalizedRecord\.deviceAddress/.test(devicesHtml));
  assert.ok(/normalizedRecord\.recordTime/.test(devicesHtml));
  assert.ok(/normalizedRecord\['运维人员'\]/.test(devicesHtml));
  assert.ok(/normalizedRecord\['运维人员电话'\]/.test(devicesHtml));
  assert.ok(/const\s+operator\s*=\s*resolveMaintenanceOperatorInfo\(\{[\s\S]*deviceId:\s*fallbackDeviceId/.test(devicesHtml));
  assert.ok(/const\s+normalized\s*=\s*normalizeDetailMaintenanceRecord\(record\)/.test(devicesHtml));
  assert.ok(/normalizedRecord\.maintainerName/.test(devicesHtml));
  assert.ok(/normalizedRecord\.maintenanceOperator/.test(devicesHtml));
  assert.ok(/normalizedRecord\.mobile/.test(devicesHtml));
  assert.ok(/resolveMaintenanceRecordDeviceId\(record\)/.test(devicesHtml));
  assert.ok(/const\s+operationRecords\s*=\s*getMaintenanceRecordsByDevice\(deviceId\)/.test(devicesHtml));
  assert.ok(/detail-maint-record-row/.test(devicesHtml));
  assert.ok(/detail-maint-record-content-text/.test(devicesHtml));
  assert.ok(/运维人员电话/.test(devicesHtml));
  assert.ok(/类型\(清洁\/补料\)/.test(devicesHtml));
  assert.ok(!/renderDetailCard\('运维记录'/.test(devicesHtml));
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

test('节能模式关闭时编辑弹窗与详情应隐藏节能时间字段', () => {
  assert.ok(/function\s+isEnergyModeEnabled\s*\(/.test(devicesHtml));
  assert.ok(/function\s+toggleEntryEnergyTimeFields\s*\(/.test(devicesHtml));
  assert.ok(/id="entryEnergyTimeFields"/.test(devicesHtml));
  assert.ok(/addEventListener\('change',\s*toggleEntryEnergyTimeFields\)/.test(devicesHtml));
  assert.ok(/toggleEntryEnergyTimeFields\(\)/.test(devicesHtml));
  assert.ok(/if\s*\(\s*isEnergyModeEnabled\(info\.energyMode\)\s*\)\s*\{[\s\S]*开启节能模式[\s\S]*关闭节能模式/.test(devicesHtml));
});

test('设备详情应整合故障处理卡片并支持四项操作入口', () => {
  assert.ok(/function\s+renderFaultControlCard\s*\(/.test(devicesHtml));
  assert.ok(/function\s+buildDeviceFaultSnapshot\s*\(/.test(devicesHtml));
  assert.ok(/function\s+renderFaultActionButtons\s*\(/.test(devicesHtml));
  assert.ok(/class="detail-fault-chip/.test(devicesHtml));
  assert.ok(/openDetailRemoteActions\(/.test(devicesHtml));
  assert.ok(/openDetailEditFaultStatus\(/.test(devicesHtml));
  assert.ok(/goToDeviceMaterials\(/.test(devicesHtml));
  assert.ok(/openDetailStatusRecords\(/.test(devicesHtml));
});

test('设备详情应通过单一分流方法隔离入场数据与故障数据', () => {
  assert.ok(/function\s+splitDeviceDetailData\s*\(/.test(devicesHtml));
  assert.ok(/const\s+detailData\s*=\s*splitDeviceDetailData\(device,\s*runtimeLocationMap\)/.test(devicesHtml));
  assert.ok(/renderEntryCoreRows\(detailData\.entry\)/.test(devicesHtml));
  assert.ok(/renderEntryAllRows\(detailData\.entry\)/.test(devicesHtml));
  assert.ok(/renderFaultControlCard\(detailData\.fault\)/.test(devicesHtml));
  assert.ok(!/renderMaintenanceRecordsRows\(detailData\.maintenance\.records,\s*detailData\.entry\.locationName\)/.test(devicesHtml));
});

test('设备详情卡片布局应避免单列卡片造成右侧空白', () => {
  assert.ok(/\.detail-card-basic\s*\{[\s\S]*grid-column:\s*1\s*\/\s*-1/.test(devicesHtml));
  assert.ok(/\.detail-card-entry-core\s*\{[\s\S]*grid-column:\s*1\s*\/\s*-1/.test(devicesHtml));
});

test('状态记录弹层应改为标签切换避免双栏拥挤', () => {
  assert.ok(/function\s+switchDetailStatusRecordTab\s*\(/.test(devicesHtml));
  assert.ok(/detail-fault-record-tabs/.test(devicesHtml));
  assert.ok(/detail-fault-record-tab/.test(devicesHtml));
  assert.ok(/openDetailStatusRecords[\s\S]*detailStatusRecordTab\s*=\s*'abnormal'/.test(devicesHtml));
  assert.ok(/switchDetailStatusRecordTab\('abnormal'\)/.test(devicesHtml));
  assert.ok(/switchDetailStatusRecordTab\('operation'\)/.test(devicesHtml));
});

test('状态记录双Tab应使用统一卡片与稳定容器避免切换跳动', () => {
  assert.ok(/function\s+renderDetailAbnormalRecordCard\s*\(/.test(devicesHtml));
  assert.ok(/return\s+renderDetailAbnormalRecordCard\(item\)/.test(devicesHtml));
  assert.ok(/detail-fault-record-list[\s\S]*height:\s*\d+vh/.test(devicesHtml));
  assert.ok(/detail-fault-record-list[\s\S]*scrollbar-gutter:\s*stable/.test(devicesHtml));
  assert.ok(/\.stable-tab-switch\s*,/.test(devicesHtml));
  assert.ok(/\.stable-tab-btn\s*,/.test(devicesHtml));
  assert.ok(/\.stable-tab-panel\s*,/.test(devicesHtml));
  assert.ok(/\.stable-tab-list\s*,/.test(devicesHtml));
  assert.ok(/class=\"detail-fault-record-tabs stable-tab-switch\"/.test(devicesHtml));
  assert.ok(/class=\"detail-fault-record-tab stable-tab-btn/.test(devicesHtml));
  assert.ok(/class=\"detail-fault-record-section stable-tab-panel\"/.test(devicesHtml));
  assert.ok(/class=\"detail-fault-record-list stable-tab-list\"/.test(devicesHtml));
  assert.ok(/\.detail-fault-record-tab\s*\{[\s\S]*border:\s*1px\s+solid\s+transparent/.test(devicesHtml));
  assert.ok(/\.detail-fault-record-tab\.active[\s\S]*box-shadow:\s*none/.test(devicesHtml));
});

test('运维记录卡片桌面端应使用固定列布局避免信息错位', () => {
  assert.ok(/\.detail-maint-record-row\s*\{[\s\S]*grid-template-columns:\s*120px\s+minmax\(0,\s*1fr\)/.test(devicesHtml));
  assert.ok(/\.detail-maint-record-label\s*\{[\s\S]*line-height:\s*1\.6/.test(devicesHtml));
  assert.ok(/\.detail-maint-record-value\s*\{[\s\S]*line-height:\s*1\.6/.test(devicesHtml));
});

test('故障处理卡片应去除与设备信息卡片重复的基础字段', () => {
  const match = devicesHtml.match(/function\s+renderFaultControlCard\s*\([\s\S]*?\n\s*}\n\n\s*function\s+getFaultRecordList/);
  assert.ok(match);
  const faultCardFn = match[0];

  assert.ok(!/\['设备编号',\s*snapshot\.deviceId\]/.test(faultCardFn));
  assert.ok(!/\['点位名称',\s*snapshot\.siteName\]/.test(faultCardFn));
  assert.ok(!/\['设备状态',\s*snapshot\.deviceStatus\]/.test(faultCardFn));
  assert.ok(!/\['停售状态',\s*snapshot\.sellStatus\]/.test(faultCardFn));
});
