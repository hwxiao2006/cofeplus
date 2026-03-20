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

const sidebarPages = [
  'overview.html',
  'devices.html',
  'menu-management.html',
  'materials.html',
  'orders.html',
  'faults.html',
  'customers.html',
  'locations.html',
  'menu.html',
  'product-detail.html'
];

const sidebarHtmlMap = Object.fromEntries(
  sidebarPages.map((file) => [file, fs.readFileSync(path.join(__dirname, '..', file), 'utf8')])
);

const staffHtml = fs.readFileSync(path.join(__dirname, '..', 'staff-management.html'), 'utf8');

test('侧边栏：基础信息管理应新增人员管理菜单入口', () => {
  sidebarPages.forEach((file) => {
    const html = sidebarHtmlMap[file];
    assert.ok(html.includes('href="staff-management.html"'), `${file} 缺少人员管理链接`);
    assert.ok(/<span>人员管理<\/span>/.test(html), `${file} 缺少人员管理菜单文案`);
  });
});

test('侧边栏：人员管理菜单应归属运营管理分组', () => {
  sidebarPages.forEach((file) => {
    const html = sidebarHtmlMap[file];
    const operationsIndex = html.indexOf('运营管理');
    const basicIndex = html.indexOf('基础信息管理');
    const staffIndex = html.indexOf('href="staff-management.html"');
    assert.ok(operationsIndex >= 0, `${file} 缺少运营管理分组`);
    assert.ok(basicIndex >= 0, `${file} 缺少基础信息管理分组`);
    assert.ok(staffIndex > operationsIndex, `${file} 人员管理未出现在运营管理之后`);
    assert.ok(staffIndex < basicIndex, `${file} 人员管理仍在基础信息管理分组中`);
  });
});

test('人员管理页：应提供管理人员列表区域，并去掉商户切换控件', () => {
  assert.ok(staffHtml.includes('<title>人员管理 - 运营控制台</title>'));
  assert.ok(staffHtml.includes('<h1 class="header-title">人员管理</h1>'));
  assert.ok(!staffHtml.includes('id="merchantSelect"'));
  assert.ok(!/function\s+handleMerchantChange\s*\(/.test(staffHtml));
  assert.ok(!/function\s+renderMerchantSelect\s*\(/.test(staffHtml));
  assert.ok(staffHtml.includes('id="managerList"'));
  assert.ok(staffHtml.includes('onclick="openStaffModal()"'));
});

test('人员管理页：移动端头部应与订单和商品页保持一致', () => {
  const mobileHeaderMatch = staffHtml.match(/<div class="mobile-header">[\s\S]*?<\/div>/);
  assert.ok(mobileHeaderMatch, '应存在移动端头部');
  const mobileHeader = mobileHeaderMatch[0];
  assert.ok(/class="mobile-header-title"/.test(mobileHeader), '移动端头部应使用统一标题类');
  assert.ok(/>人员管理<\/strong>/.test(mobileHeader), '移动端头部应保留人员管理页名');
  assert.ok(/class="header-title-wrapper"/.test(staffHtml), '标题区域应使用统一包装结构');
  assert.ok(/class="header-meta"/.test(staffHtml), '标题区域应使用统一元信息结构');
  assert.ok(/<span class="header-desc">列出当前商户下所有管理人员，支持按截图表单新增人员<\/span>/.test(staffHtml));
  assert.ok(/@media \(max-width: 768px\)[\s\S]*?\.header-title\s*\{\s*display:\s*none;/.test(staffHtml), '移动端应隐藏重复的大标题');
});

test('人员管理页：添加人员表单应移除授权与 openId 输入，并暂时隐藏公众号推送', () => {
  assert.ok(staffHtml.includes('基本信息<span class="required">*</span>'));
  assert.ok(staffHtml.includes('用户名'));
  assert.ok(staffHtml.includes('手机号'));
  assert.ok(staffHtml.includes('菜单权限配置<span class="required">*</span>'));
  assert.ok(staffHtml.includes('负责设备号<span class="required">*</span>'));
  assert.ok(!staffHtml.includes('运维小程序授权'));
  assert.ok(!staffHtml.includes('微信公众号推送授权'));
  assert.ok(!staffHtml.includes('for="opsOpenid"'));
  assert.ok(!staffHtml.includes('for="wechatOpenid"'));
  assert.ok(!staffHtml.includes('id="opsOpenid"'));
  assert.ok(!staffHtml.includes('id="wechatOpenid"'));
  assert.ok(!staffHtml.includes('公众号推送'));
  assert.ok(!/name="push"/.test(staffHtml));
  assert.ok(!/function\s+handlePushOptionChange\s*\(/.test(staffHtml));
  assert.ok(!/function\s+mockAuthorize\s*\(/.test(staffHtml));

  const permissionSectionMatch = staffHtml.match(/菜单权限配置[\s\S]*?负责设备号/);
  assert.ok(permissionSectionMatch, '应存在菜单权限配置区块');
  const permissionSection = permissionSectionMatch[0];
  assert.ok(permissionSection.includes('按模块快速勾选，一屏完成。'));
  assert.ok(/class="permission-section-head"/.test(staffHtml), '应使用紧凑权限区头部');
  assert.ok(/id="permissionSelectionStats"/.test(permissionSection), '应存在权限总数提示胶囊');
  assert.ok(/class="permission-group-row"/.test(permissionSection), '权限组应改为轻量行式布局');
  assert.ok(/class="permission-group-trigger"/.test(permissionSection), '权限组应提供轻量展开入口');
  assert.ok(/class="permission-group-options"/.test(permissionSection), '权限组选项区应保留可编辑能力');
  assert.ok(/class="permission-inline-option"/.test(permissionSection), '权限组选项应改为紧凑项样式');
  assert.ok(/data-permission-summary="products"/.test(permissionSection), '应提供商品管理权限摘要槽位');
  assert.ok(/data-permission-count="orders"/.test(permissionSection), '应提供订单权限计数槽位');
  assert.ok(!/permission-group-card/.test(permissionSection), '不应继续使用大卡片权限样式');
  assert.ok(!/permission-child-grid/.test(permissionSection), '不应继续使用旧的权限子项网格');

  [
    '总览', '查看总览',
    '设备', '查看设备',
    '商品管理', '查看商品管理', '新增语言', '更改币种', '编辑商品', '编辑配方',
    '物料', '查看物料',
    '订单', '查看订单', '订单退款',
    '故障列表', '查看故障列表',
    '人员管理', '查看人员管理', '人员维护'
  ].forEach((label) => {
    assert.ok(permissionSection.includes(label), `权限树缺少 ${label}`);
  });

  [
    '运维权限',
    '维修权限',
    '财务权限',
    '管理员权限',
    '运维&退款权限'
  ].forEach((label) => {
    assert.ok(!permissionSection.includes(label), `权限树中不应再出现旧权限 ${label}`);
  });
});

test('人员管理页：应按当前商户过滤管理人员，并校验新增必填规则', () => {
  assert.ok(/function\s+resolveInitialMerchantId\s*\(\)\s*\{[\s\S]*new URLSearchParams\(window\.location\.search \|\| ''\)/.test(staffHtml));
  assert.ok(/localStorage\.setItem\('currentMerchantId',\s*selectedMerchantId\)/.test(staffHtml));
  assert.ok(/function\s+getManagersByMerchant\s*\(merchantId\)/.test(staffHtml));
  assert.ok(/const\s+filteredManagers\s*=\s*getManagersByMerchant\(selectedMerchantId\);/.test(staffHtml));
  assert.ok(/function\s+getSelectedPermissionValues\s*\(\)/.test(staffHtml));
  assert.ok(/if\s*\(!username\s*\|\|\s*!phone\)/.test(staffHtml));
  assert.ok(/if\s*\(!selectedPermissions\.length\)/.test(staffHtml));
  assert.ok(/if\s*\(!selectedDevices\.length\)/.test(staffHtml));
  assert.ok(/localStorage\.setItem\('staffManagersData',\s*JSON\.stringify\(staffManagersData\)\)/.test(staffHtml));
});

test('人员管理页：应支持编辑人员信息和负责设备', () => {
  assert.ok(/onclick="editStaff\('\$\{manager\.id\}'\)"/.test(staffHtml));
  assert.ok(/let\s+editingStaffId\s*=\s*null;/.test(staffHtml));
  assert.ok(/function\s+editStaff\s*\(staffId\)/.test(staffHtml));
  assert.ok(/editingStaffId\s*=\s*staffId;/.test(staffHtml));
  assert.ok(/const\s+targetStaff\s*=\s*staffManagersData\.find\(\(item\)\s*=>\s*item\.id\s*===\s*staffId\);/.test(staffHtml));
  assert.ok(/renderDevicePicker\(selectedMerchantId,\s*targetStaff\.devices\s*\|\|\s*\[\]\)/.test(staffHtml));
  assert.ok(/function\s+normalizeStaffPermissions\s*\(permissions\)/.test(staffHtml));
  assert.ok(/const\s+staffIndex\s*=\s*staffManagersData\.findIndex\(\(item\)\s*=>\s*item\.id\s*===\s*editingStaffId\);/.test(staffHtml));
  assert.ok(/staffManagersData\[staffIndex\]\s*=\s*\{[\s\S]*devices:\s*selectedDevices/.test(staffHtml));
  assert.ok(/showToast\(editingStaffId\s*\?\s*'人员信息已更新'\s*:\s*'人员新增成功'\)/.test(staffHtml));
});

test('人员管理页：桌面端应使用紧凑工具头与单层卡片布局', () => {
  assert.ok(/class="staff-toolbar"/.test(staffHtml));
  assert.ok(/class="staff-toolbar-stat"/.test(staffHtml));
  assert.ok(/class="staff-toolbar-meta"/.test(staffHtml));
  assert.ok(!/class="summary-strip"/.test(staffHtml));
  assert.ok(!/class="list-head"/.test(staffHtml));

  const renderManagersBlockMatch = staffHtml.match(/function\s+renderManagers\s*\(\)\s*\{[\s\S]*?\n\s*function\s+updateStats/);
  assert.ok(renderManagersBlockMatch, '应存在 renderManagers 逻辑');
  const renderManagersBlock = renderManagersBlockMatch[0];

  assert.ok(/manager-row/.test(renderManagersBlock));
  assert.ok(/manager-detail-stack/.test(renderManagersBlock));
  assert.ok(/manager-device-summary/.test(renderManagersBlock));
  assert.ok(!/manager-panel manager-device-panel/.test(renderManagersBlock), '桌面端不应继续使用独立设备面板');
});

test('人员管理页：桌面端负责设备应支持摘要与卡片内展开', () => {
  assert.ok(/let\s+expandedDeviceStaffIds\s*=\s*new Set\(\)/.test(staffHtml));
  assert.ok(/function\s+getManagerDeviceSummary\s*\(devices,\s*staffId\)/.test(staffHtml));
  assert.ok(/function\s+toggleManagerDevices\s*\(staffId\)/.test(staffHtml));
  assert.ok(/deviceCount\s*<=\s*3/.test(staffHtml));
  assert.ok(/devices\.slice\(0,\s*2\)/.test(staffHtml));
  assert.ok(/查看全部/.test(staffHtml));
  assert.ok(/收起/.test(staffHtml));

  const renderManagersBlockMatch = staffHtml.match(/function\s+renderManagers\s*\(\)\s*\{[\s\S]*?\n\s*function\s+updateStats/);
  assert.ok(renderManagersBlockMatch, '应存在 renderManagers 逻辑');
  const renderManagersBlock = renderManagersBlockMatch[0];

  assert.ok(/manager-device-summary/.test(renderManagersBlock));
  assert.ok(/manager-device-toggle/.test(renderManagersBlock));
  assert.ok(/manager-device-expanded/.test(renderManagersBlock));
  assert.ok(/onclick="toggleManagerDevices\('\$\{manager\.id\}'\)"/.test(renderManagersBlock));
});

test('人员管理页：应使用运营菜单权限树替代旧角色权限，并让列表聚焦人员信息与负责设备', () => {
  assert.ok(/ops\.products\.language/.test(staffHtml));
  assert.ok(/ops\.products\.currency/.test(staffHtml));
  assert.ok(/ops\.products\.edit/.test(staffHtml));
  assert.ok(/ops\.products\.recipe/.test(staffHtml));
  assert.ok(/ops\.orders\.refund/.test(staffHtml));
  assert.ok(/ops\.staff\.manage/.test(staffHtml));
  assert.ok(/function\s+renderPermissionTree\s*\(/.test(staffHtml));
  assert.ok(/function\s+syncPermissionParentState\s*\(/.test(staffHtml));
  assert.ok(/function\s+refreshPermissionSelectionUi\s*\(/.test(staffHtml));
  assert.ok(/function\s+updatePermissionSelectionStats\s*\(/.test(staffHtml));
  assert.ok(/function\s+updatePermissionGroupDisplay\s*\(/.test(staffHtml));

  const renderManagersBlockMatch = staffHtml.match(/function\s+renderManagers\s*\(\)\s*\{[\s\S]*?\n\s*function\s+updateStats/);
  assert.ok(renderManagersBlockMatch, '应存在 renderManagers 逻辑');
  const renderManagersBlock = renderManagersBlockMatch[0];
  assert.ok(/manager-device-summary/.test(renderManagersBlock));
  assert.ok(!/manager-panel-title">权限/.test(renderManagersBlock), '列表页不应展示权限面板');
  assert.ok(!/manager-panel-title">公众号推送/.test(renderManagersBlock), '列表页不应展示公众号推送面板');
  assert.ok(!/运维 openId:/.test(renderManagersBlock), '列表页不应展示运维 openId');
  assert.ok(!/公众号 openId:/.test(renderManagersBlock), '列表页不应展示公众号 openId');
  assert.ok(!/manager-panel manager-device-panel/.test(renderManagersBlock), '列表页不应继续使用独立设备面板');
});

test('人员管理页：应提供账号停用能力，并将顶部汇总收敛为启用人员数', () => {
  assert.ok(/启用人员数/.test(staffHtml));
  assert.ok(/id="staffEnabledCount"/.test(staffHtml));
  assert.ok(/accountEnabled/.test(staffHtml));
  assert.ok(/function\s+toggleStaffLoginStatus\s*\(staffId\)/.test(staffHtml));
  assert.ok(/停用账号/.test(staffHtml));
  assert.ok(/启用账号/.test(staffHtml));
  assert.ok(/账号状态：\$\{manager\.accountEnabled === false \? '已停用' : '已启用'\}/.test(staffHtml));
  assert.ok(!/id="staffTotal"/.test(staffHtml));
  assert.ok(!/id="staffProductConfig"/.test(staffHtml));
  assert.ok(!/id="staffOrderRefund"/.test(staffHtml));
  assert.ok(!/覆盖设备数/.test(staffHtml));
  assert.ok(!/商品配置权限人数/.test(staffHtml));
  assert.ok(!/订单退款权限人数/.test(staffHtml));
  assert.ok(!/class="stats-grid"/.test(staffHtml));
});

test('人员管理页：设备选择应支持点位信息与长列表交互优化', () => {
  assert.ok(staffHtml.includes('id="deviceSelectorModal"'));
  assert.ok(staffHtml.includes('id="openDeviceSelectorBtn"'));
  assert.ok(staffHtml.includes('onclick="openDeviceSelector()"'));
  assert.ok(staffHtml.includes('onclick="closeDeviceSelector()"'));
  assert.ok(staffHtml.includes('id="deviceSearchInput"'));
  assert.ok(staffHtml.includes('placeholder="搜索设备编号或点位名称"'));
  assert.ok(staffHtml.includes('id="deviceSelectedOnly"'));
  assert.ok(staffHtml.includes('id="deviceSelectionStats"'));
  assert.ok(staffHtml.includes('id="selectedDeviceSummary"'));
  assert.ok(/let\s+deviceSelectionSet\s*=\s*new Set\(\)/.test(staffHtml));
  assert.ok(/let\s+showOnlySelectedDevices\s*=\s*false;/.test(staffHtml));
  assert.ok(/function\s+openDeviceSelector\s*\(\)/.test(staffHtml));
  assert.ok(/function\s+closeDeviceSelector\s*\(\)/.test(staffHtml));
  assert.ok(/function\s+handleDeviceSearch\s*\(keyword\)/.test(staffHtml));
  assert.ok(/function\s+toggleDeviceSelectedOnly\s*\(checked\)/.test(staffHtml));
  assert.ok(/function\s+renderDevicePickerList\s*\(\)/.test(staffHtml));
  assert.ok(/<span class="device-code">\$\{device\.id\}<\/span>/.test(staffHtml));
  assert.ok(/<span class="device-location">\$\{device\.locationLabel\}<\/span>/.test(staffHtml));
  assert.ok(/const\s+selectedDevices\s*=\s*Array\.from\(deviceSelectionSet\)/.test(staffHtml));
  assert.ok(!/function\s+groupDevicesByLocation\s*\(devices\)/.test(staffHtml));
  assert.ok(!/function\s+toggleDeviceGroup\s*\(groupKey\)/.test(staffHtml));
});
