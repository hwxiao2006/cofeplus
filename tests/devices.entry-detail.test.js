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
  assert.ok(/operatorPhone/.test(deviceEntryHtml));
  assert.ok(/networkSignal/.test(deviceEntryHtml));
  assert.ok(/maintenanceWindow/.test(deviceEntryHtml));
  assert.ok(/notes/.test(deviceEntryHtml));
  assert.ok(/adScreen/.test(deviceEntryHtml));
  assert.ok(/locationImageUrls/.test(deviceEntryHtml));
  assert.ok(!/displayImages:\s*'待上传'/.test(deviceEntryHtml));
});

test('设备详情应将入场信息合并为单一顶层入口', () => {
  assert.ok(/function\s+renderEntryCoreRows\s*\(/.test(devicesHtml));
  assert.ok(/function\s+renderEntryAllRows\s*\(/.test(devicesHtml));
  assert.ok(/renderDetailCard\('入场信息'/.test(devicesHtml));
  assert.ok(!devicesHtml.includes('入场核心信息'));
  assert.ok(!devicesHtml.includes('入场全部信息'));
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
  assert.ok(/function\s+ensureMaintenanceContactRowsInCardHtml\s*\(/.test(devicesHtml));
  assert.ok(/function\s+resolveMaintenanceOperatorInfo\s*\(/.test(devicesHtml));
  assert.ok(/function\s+normalizeDetailMaintenanceRecord\s*\(/.test(devicesHtml));
  assert.ok(/function\s+ensureDetailMaintenanceCardContactRows\s*\(/.test(devicesHtml));
  assert.ok(/function\s+resolveMaintenanceRecordDeviceId\s*\(/.test(devicesHtml));
  assert.ok(/normalizedRecord\.deviceCode/.test(devicesHtml));
  assert.ok(/normalizedRecord\.deviceAddress/.test(devicesHtml));
  assert.ok(/normalizedRecord\.recordTime/.test(devicesHtml));
  assert.ok(/normalizedRecord\['运维人员'\]/.test(devicesHtml));
  assert.ok(/normalizedRecord\['运维人员电话'\]/.test(devicesHtml));
  assert.ok(/const\s+operator\s*=\s*resolveMaintenanceOperatorInfo\(\{[\s\S]*deviceId:\s*fallbackDeviceId/.test(devicesHtml));
  assert.ok(/const\s+normalized\s*=\s*normalizeDetailMaintenanceRecord\(record\)/.test(devicesHtml));
  assert.ok(/ensureMaintenanceContactRowsInCardHtml\(renderDetailMaintenanceRecordCard\(item\),\s*item\)/.test(devicesHtml));
  assert.ok(/detail-maint-operator-row/.test(devicesHtml));
  assert.ok(/detail-maint-phone-row/.test(devicesHtml));
  assert.ok(/ensureDetailMaintenanceCardContactRows\(activeRecords,\s*listContainer\)/.test(devicesHtml));
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
  assert.ok(/renderDeviceOverviewCard/.test(devicesHtml));
  assert.ok(/renderDeviceStatusCard/.test(devicesHtml));
  assert.ok(/renderTechnicalStatusCard/.test(devicesHtml));
});

test('设备概览不应再展示部署类型字段', () => {
  assert.ok(/function\s+renderDeviceOverviewCard\s*\(/.test(devicesHtml));
  assert.ok(!/renderDetailRow\('部署类型'/.test(devicesHtml));
});

test('设备详情桌面端应采用左主内容与右侧设备操作布局', () => {
  assert.ok(/class=\"detail-layout\"/.test(devicesHtml));
  assert.ok(/class=\"detail-main\"/.test(devicesHtml));
  assert.ok(/class=\"detail-aside\"/.test(devicesHtml));
  assert.ok(/function\s+renderDetailAside\s*\(/.test(devicesHtml));
  assert.ok(/detail-section-overview/.test(devicesHtml));
  assert.ok(/detail-section-status/.test(devicesHtml));
  assert.ok(/detail-section-operation-summary/.test(devicesHtml));
  assert.ok(!/detail-section-entry/.test(devicesHtml));
  assert.ok(!/detail-section-ad-screen/.test(devicesHtml));
  assert.ok(!/detail-section-technical/.test(devicesHtml));
  assert.ok(!/detail-section-records/.test(devicesHtml));
  assert.ok(/function\s+renderDeviceOperationSummaryCard\s*\(/.test(devicesHtml));
  assert.ok(/function\s+openDetailInfoPanel\s*\(/.test(devicesHtml));
  assert.ok(/id=\"detailInfoPanelOverlay\"/.test(devicesHtml));
  assert.ok(!/目录导航/.test(devicesHtml));
  assert.ok(!/状态摘要/.test(devicesHtml));
  assert.ok(!/detail-anchor-list/.test(devicesHtml));
  assert.ok(!/detail-side-state-list/.test(devicesHtml));
  assert.ok(/detail-side-title">设备操作/.test(devicesHtml));
  assert.ok(/openDetailInfoPanel\('entry'/.test(devicesHtml));
  assert.ok(/openDetailInfoPanel\('adScreen'/.test(devicesHtml));
  assert.ok(/openDetailInfoPanel\('technical'/.test(devicesHtml));
});

test('设备详情右侧设备操作区应新增温度报警设置入口', () => {
  assert.ok(/温度报警设置/.test(devicesHtml));
  assert.ok(/openDetailTemperatureAlarmModal\(/.test(devicesHtml));
  assert.ok(/detailTemperatureAlarmModal/.test(devicesHtml));
  assert.ok(/closeDetailTemperatureAlarmModal\(/.test(devicesHtml));
});

test('温度报警设置应使用独立弹层而非正文摘要', () => {
  assert.ok(!/renderDetailCard\('温度报警设置'/.test(devicesHtml));
  assert.ok(!/renderDetailCard\('温度报警摘要'/.test(devicesHtml));
  assert.ok(!/detail-card-temperature-alarm/.test(devicesHtml));
});

test('设备详情移动端应回退为单列卡片布局', () => {
  assert.ok(/@media\s*\(max-width:\s*768px\)[\s\S]*\.detail-grid\s*\{[\s\S]*grid-template-columns:\s*1fr/.test(devicesHtml));
});

test('设备详情移动端不应隐藏设备操作区', () => {
  assert.ok(!/@media\s*\(max-width:\s*1024px\)[\s\S]*\.detail-aside\s*\{[^}]*display:\s*none/.test(devicesHtml));
  assert.ok(/@media\s*\(max-width:\s*1024px\)[\s\S]*\.detail-aside\s*\{[^}]*display:\s*block/.test(devicesHtml));
});

test('设备详情图片应支持点击预览与左右切换', () => {
  assert.ok(/id="imagePreviewModal"/.test(devicesHtml));
  assert.ok(/class="entry-image-thumb"/.test(devicesHtml));
  assert.ok(/function\s+openImagePreview\s*\(/.test(devicesHtml));
  assert.ok(/function\s+switchImagePreview\s*\(/.test(devicesHtml));
  assert.ok(/function\s+collectDetailPreviewImages\s*\(/.test(devicesHtml));
});

test('mock 入场数据应包含更丰富字段与可区分示例图', () => {
  assert.ok(/function\s+buildMockImageDataUrl\s*\(/.test(devicesHtml));
  assert.ok(/operatorPhone/.test(devicesHtml));
  assert.ok(/networkSignal/.test(devicesHtml));
  assert.ok(/maintenanceWindow/.test(devicesHtml));
  assert.ok(/notes/.test(devicesHtml));
});

test('广告屏 mock 占位图应按左右屏目标比例生成', () => {
  assert.ok(/buildMockImageDataUrl\('左侧菜单',\s*seedIndex\s*\*\s*10\s*\+\s*1,\s*1320,\s*1080\)/.test(devicesHtml));
  assert.ok(/buildMockImageDataUrl\('右侧排队号背景',\s*seedIndex\s*\*\s*10\s*\+\s*2,\s*800,\s*1080\)/.test(devicesHtml));
});

test('当点位图片原数据为空时应自动补充预览图，广告屏不再回填旧显示器数组', () => {
  assert.ok(/function\s+ensureLocationPreviewImageUrls\s*\(/.test(devicesHtml));
  assert.ok(/function\s+hydrateEntryInfoForPreview\s*\(/.test(devicesHtml));
  assert.ok(/if\s*\(!locationImages\.length\)/.test(devicesHtml));
  assert.ok(/hydrateEntryInfoForPreview\(devicesData,\s*runtimeLocationMap\)/.test(devicesHtml));
  assert.ok(!/entryInfo\.displayImageUrls\s*=/.test(devicesHtml));
});

test('入场图片改为卡片展示后，详情表格中不再重复显示图片统计行', () => {
  assert.ok(!/\['显示器画面',\s*info\.displayImages/.test(devicesHtml));
  assert.ok(!/\['点位照片',\s*info\.locationImages/.test(devicesHtml));
});

test('入场信息应作为单一折叠分组出现，旧的全量入口不再存在', () => {
  assert.ok(!/isDesktopDetail\s*\?\s*'open'\s*:\s*''/.test(devicesHtml));
  assert.ok(/入场信息/.test(devicesHtml));
  assert.ok(!/查看全部入场信息/.test(devicesHtml));
  assert.ok(!/detail-entry-all/.test(devicesHtml));
});

test('详情页应提供编辑入场信息入口并支持保存', () => {
  assert.ok(/id="entryEditModal"/.test(devicesHtml));
  assert.ok(/id="entryEditBtn"/.test(devicesHtml));
  assert.ok(/id="editEntryAt"/.test(devicesHtml));
  assert.ok(/id="editGpsAction"/.test(devicesHtml));
  assert.ok(/id="editLongitude"/.test(devicesHtml));
  assert.ok(/id="editLatitude"/.test(devicesHtml));
  assert.ok(/id="editLocationCode"/.test(devicesHtml));
  assert.ok(/id="entryEditQuickCreateLocationModal"/.test(devicesHtml));
  assert.ok(/id="entryEditQuickLocationLocateBtn"/.test(devicesHtml));
  assert.ok(/function\s+onEntryEditLocationChange\s*\(/.test(devicesHtml));
  assert.ok(/function\s+openEntryEditQuickCreateLocationModal\s*\(/.test(devicesHtml));
  assert.ok(/function\s+createLocationFromDeviceDetail\s*\(/.test(devicesHtml));
  assert.ok(/function\s+requestEntryEditQuickLocationCurrentPosition\s*\(/.test(devicesHtml));
  assert.ok(/广告屏设置/.test(devicesHtml));
  assert.ok(/左侧菜单/.test(devicesHtml));
  assert.ok(/右侧排队号背景/.test(devicesHtml));
  assert.ok(/id="editAdScreenLeftImageInput"/.test(devicesHtml));
  assert.ok(/id="editAdScreenLeftVideoInput"/.test(devicesHtml));
  assert.ok(/id="editAdScreenRightImageInput"/.test(devicesHtml));
  assert.ok(/id="editAdScreenLeftPreview"/.test(devicesHtml));
  assert.ok(/id="editAdScreenRightPreview"/.test(devicesHtml));
  assert.ok(!/id="editDisplayImagesInput"/.test(devicesHtml));
  assert.ok(/id="editLocationImagesInput"/.test(devicesHtml));
  assert.ok(/id="editDeviceStartDate"/.test(devicesHtml));
  assert.ok(/id="editDeviceEndDate"/.test(devicesHtml));
  assert.ok(/id="editTerminalGeneration5"/.test(devicesHtml));
  assert.ok(/id="editParallelProduction"/.test(devicesHtml));
  assert.ok(/function\s+openEntryEditModal\s*\(/.test(devicesHtml));
  assert.ok(/function\s+saveEntryInfoEdit\s*\(/.test(devicesHtml));
  assert.ok(/function\s+handleEntryImageUpload\s*\(/.test(devicesHtml));
  assert.ok(/function\s+handleEntryAdScreenUpload\s*\(/.test(devicesHtml));
  assert.ok(/handleEntryAdScreenUpload\('leftMenu',\s*'image'/.test(devicesHtml));
  assert.ok(/handleEntryAdScreenUpload\('leftMenu',\s*'video'/.test(devicesHtml));
  assert.ok(/handleEntryAdScreenUpload\('rightQueueBackground',\s*'image'/.test(devicesHtml));
  assert.ok(/new FileReader\(\)/.test(devicesHtml));
  assert.ok(/currentDetailDeviceId/.test(devicesHtml));
  assert.ok(!/id="editLocationName"/.test(devicesHtml));
  assert.ok(/entryInfo\s*=\s*\{[\s\S]*operatorName[\s\S]*adScreen[\s\S]*locationImageUrls/.test(devicesHtml));
});

test('编辑点位信息后应沉淀点位变更记录并在入场信息中展示', () => {
  assert.ok(/function\s+normalizeLocationChangeRecord\s*\(/.test(devicesHtml));
  assert.ok(/function\s+buildLocationChangeRecord\s*\(/.test(devicesHtml));
  assert.ok(/function\s+appendLocationChangeRecord\s*\(/.test(devicesHtml));
  assert.ok(/function\s+getCurrentLoginOperatorInfo\s*\(/.test(devicesHtml));
  assert.ok(/function\s+renderLocationChangeRecords\s*\(/.test(devicesHtml));
  assert.ok(/function\s+renderLocationChangeRecordCard\s*\(/.test(devicesHtml));
  assert.ok(/locationChangeRecords/.test(devicesHtml));
  assert.ok(/点位变更记录/.test(devicesHtml));
  assert.ok(/previousLocationName/.test(devicesHtml));
  assert.ok(/nextLocationAddress/.test(devicesHtml));
  assert.ok(/previousLongitude/.test(devicesHtml));
  assert.ok(/nextLatitude/.test(devicesHtml));
  assert.ok(/operatorName:\s*loginOperator\.operatorName/.test(devicesHtml));
  assert.ok(/nextEntryInfo\.locationChangeRecords\s*=\s*appendLocationChangeRecord\(/.test(devicesHtml));
});

test('广告屏保存应写入 adScreen 并保留旧数据兼容读取', () => {
  assert.ok(/function\s+normalizeEntryAdScreen\s*\(/.test(devicesHtml));
  assert.ok(/function\s+serializeEntryAdScreenDraft\s*\(/.test(devicesHtml));
  assert.ok(/function\s+validateAdScreenDraftAsset\s*\(/.test(devicesHtml));
  assert.ok(/displayImageUrls/.test(devicesHtml));
});

test('广告屏信息应拆成左右固定分组展示', () => {
  assert.ok(/renderDetailCard\('广告屏信息'/.test(devicesHtml));
  assert.ok(/detail-ad-screen-stage/.test(devicesHtml));
  assert.ok(/detail-ad-screen-pane/.test(devicesHtml));
  assert.ok(/\.detail-ad-screen-pane\.left/.test(devicesHtml));
  assert.ok(/\.detail-ad-screen-pane\.right/.test(devicesHtml));
  assert.ok(/detail-subsection-title">左侧菜单/.test(devicesHtml));
  assert.ok(/detail-subsection-title">右侧排队号背景/.test(devicesHtml));
  assert.ok(!/detail-subsection-title">广告屏画面/.test(devicesHtml));
  assert.ok(/renderDetailRow\('更新时间'/.test(devicesHtml));
  assert.ok(!/renderDetailRow\('素材类型'/.test(devicesHtml));
  assert.ok(!/renderDetailRow\('文件名'/.test(devicesHtml));
  assert.ok(!/renderDetailRow\('分辨率'/.test(devicesHtml));
});

test('广告屏合成预览应移除缩略图堆叠文案并铺满左右画布', () => {
  assert.ok(/\.detail-ad-screen-stage\s+\.entry-image-thumb\s*\{[^}]*display:\s*block/.test(devicesHtml));
  assert.ok(/\.detail-ad-screen-stage\s+\.entry-image-thumb\s*\{[^}]*gap:\s*0/.test(devicesHtml));
  assert.ok(/\.detail-ad-screen-stage\s+\.entry-image-thumb\s*\{[^}]*overflow:\s*hidden/.test(devicesHtml));
  assert.ok(/\.detail-ad-screen-stage\s+\.entry-image-thumb\s*\{[^}]*line-height:\s*0/.test(devicesHtml));
  assert.ok(/\.detail-ad-screen-stage\s+\.entry-image-thumb\s+span\s*\{[^}]*display:\s*none/.test(devicesHtml));
});

test('节能模式关闭时编辑弹窗与详情应隐藏节能时间字段', () => {
  assert.ok(/function\s+isEnergyModeEnabled\s*\(/.test(devicesHtml));
  assert.ok(/function\s+toggleEntryEnergyTimeFields\s*\(/.test(devicesHtml));
  assert.ok(/id="entryEnergyTimeFields"/.test(devicesHtml));
  assert.ok(/addEventListener\('change',\s*toggleEntryEnergyTimeFields\)/.test(devicesHtml));
  assert.ok(/toggleEntryEnergyTimeFields\(\)/.test(devicesHtml));
  assert.ok(/if\s*\(\s*isEnergyModeEnabled\(info\.energyMode\)\s*\)\s*\{[\s\S]*开启节能模式[\s\S]*关闭节能模式/.test(devicesHtml));
});

test('设备详情应以设备状态和设备操作替代故障处理首屏卡片', () => {
  assert.ok(/function\s+renderDeviceStatusCard\s*\(/.test(devicesHtml));
  assert.ok(/function\s+renderTechnicalStatusCard\s*\(/.test(devicesHtml));
  assert.ok(/function\s+buildDeviceFaultSnapshot\s*\(/.test(devicesHtml));
  assert.ok(!/renderDetailCard\('故障处理'/.test(devicesHtml));
  assert.ok(/renderDetailCard\('设备状态'/.test(devicesHtml));
  assert.ok(/renderDetailCard\('技术状态'/.test(devicesHtml));
  assert.ok(/renderDetailCard\('广告屏信息'/.test(devicesHtml));
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
  assert.ok(/renderDeviceStatusCard\(detailData\.base,\s*detailData\.fault,\s*detailRecordCounts\)/.test(devicesHtml));
  assert.ok(/renderTechnicalStatusCard\(detailData\.fault\)/.test(devicesHtml));
  assert.ok(!/renderMaintenanceRecordsRows\(detailData\.maintenance\.records,\s*detailData\.entry\.locationName\)/.test(devicesHtml));
});

test('设备详情卡片布局应让概览与状态占满主列首屏', () => {
  assert.ok(/\.detail-card-basic\s*\{[\s\S]*grid-column:\s*1\s*\/\s*-1/.test(devicesHtml));
  assert.ok(/\.detail-card-status\s*\{[\s\S]*grid-column:\s*1\s*\/\s*-1/.test(devicesHtml));
  assert.ok(/\.detail-card-operation-summary\s*\{[\s\S]*grid-column:\s*1\s*\/\s*-1/.test(devicesHtml));
});

test('状态记录弹层应改为标签切换避免双栏拥挤', () => {
  const match = devicesHtml.match(/function\s+openDetailStatusRecords\s*\([^)]*\)\s*\{[\s\S]*?\n\s*}\n\n\s*function\s+closeDetailStatusRecords/);
  assert.ok(match);
  const openStatusRecordsFn = match[0];
  assert.ok(/function\s+switchDetailStatusRecordTab\s*\(/.test(devicesHtml));
  assert.ok(/detail-fault-record-tabs/.test(devicesHtml));
  assert.ok(/detail-fault-record-tab/.test(devicesHtml));
  assert.ok(/detailStatusRecordTab\s*=\s*'abnormal'/.test(openStatusRecordsFn));
  assert.ok(/closeDetailInfoPanel\(\)/.test(openStatusRecordsFn));
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
  assert.ok(/#detailStatusRecordBody\s+\.detail-maint-record-row\[data-maint-row=\"operatorName\"\][\s\S]*display:\s*grid\s*!important/.test(devicesHtml));
  assert.ok(/#detailStatusRecordBody\s+\.detail-maint-record-row\[data-maint-row=\"operatorPhone\"\][\s\S]*display:\s*grid\s*!important/.test(devicesHtml));
  assert.ok(/\.detail-maint-record-label\s*\{[\s\S]*line-height:\s*1\.6/.test(devicesHtml));
  assert.ok(/\.detail-maint-record-value\s*\{[\s\S]*line-height:\s*1\.6/.test(devicesHtml));
});

test('设备状态卡应只保留运营判断字段，技术信息下沉到技术状态', () => {
  const match = devicesHtml.match(/function\s+renderDeviceStatusCard\s*\([\s\S]*?\n\s*}\n\n\s*function\s+renderTechnicalStatusCard/);
  assert.ok(match);
  const statusCardFn = match[0];

  assert.ok(/当前异常摘要/.test(statusCardFn));
  assert.ok(!/冰箱温度/.test(statusCardFn));
  assert.ok(!/豆仓温度/.test(statusCardFn));
  assert.ok(!/制作仓温度/.test(statusCardFn));
  assert.ok(!/固件版本/.test(statusCardFn));
  assert.ok(!/机构状态/.test(statusCardFn));
});
