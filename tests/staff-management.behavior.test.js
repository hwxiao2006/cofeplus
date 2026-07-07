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

test('人员管理页：应提供管理人员列表区域与添加人员入口', () => {
  assert.ok(staffHtml.includes('<title>人员管理 - 运营控制台</title>'));
  assert.ok(staffHtml.includes('<h1 class="header-title">人员管理</h1>'));
  assert.ok(staffHtml.includes('id="managerList"'));
  assert.ok(staffHtml.includes('onclick="openStaffModal()"'));
});

test('人员管理页：新增/编辑人员入口应受 ops.staff.manage 门禁保护', () => {
  assert.ok(/function\s+canManageStaff\s*\(/.test(staffHtml), '应定义 canManageStaff 门禁');
  assert.ok(staffHtml.includes("includes('ops.staff.manage')"), '门禁应基于 ops.staff.manage');
  assert.ok(staffHtml.includes('id="addStaffBtn"'), '添加按钮应有 id 供按权限显隐');
  // 门禁需覆盖：helper 定义 + renderManagers(按钮显隐 + 行内按钮) + openStaffModal/editStaff/toggleStaffLoginStatus/saveStaff
  const count = (staffHtml.match(/canManageStaff\(\)/g) || []).length;
  assert.ok(count >= 6, `canManageStaff 调用点应覆盖各入口，实际 ${count}`);
});

test('人员管理页：角色卡应按登录者可创建范围过滤', () => {
  assert.ok(/getCreatableRoleIds\s*\(/.test(staffHtml), '应有 getCreatableRoleIds');
  assert.ok(/getCreatableRoles\s*\(/.test(staffHtml), '应调用 role-definitions.getCreatableRoles 过滤角色卡');
});

test('人员管理页：商户归属不再手动指定，设备范围跟人走', () => {
  // 「所属商户」选择器已整体移除：商户由所选设备体现，超管新建暂不归属
  assert.ok(!staffHtml.includes('id="staffMerchantItem"'), '不应再有商户选择器容器');
  assert.ok(!staffHtml.includes('id="staffMerchantSelect"'), '不应再有商户选择下拉');
  assert.ok(!/function\s+renderStaffMerchantSelector\s*\(/.test(staffHtml), '不应再有 renderStaffMerchantSelector');
  assert.ok(!/function\s+handleStaffMerchantChange\s*\(/.test(staffHtml), '不应再有 handleStaffMerchantChange');
  assert.ok(!staffHtml.includes('平台级（不绑定商户）'), '不应再有平台级选项文案');
  // 设备清单跟登录者本人数据权限走；跨商户自由勾选，无锁定交互
  assert.ok(/function\s+getDeviceOptionsForCurrentEditor\s*\(/.test(staffHtml), '设备清单应按当前登录身份解析');
  assert.ok(/function\s+isEditorDeviceScopeUnrestricted\s*\(/.test(staffHtml), '应有登录者本人数据范围判定');
  assert.ok(!/function\s+getLockedMerchantIdForSelection\s*\(/.test(staffHtml), '不应再有第一台锁定商户的判定');
  assert.ok(!staffHtml.includes('跨商户不可选'), '不应再有跨商户禁用徽标');
  assert.ok(!staffHtml.includes('所选设备必须属于同一商户'), '不应再有同商户防御校验');
  // 原则 2：给他人分配的设备不能超过自己本身的数据权限（保存兜底）
  assert.ok(staffHtml.includes('分配的设备不能超过你本人的数据权限'), '保存前应有本人数据权限上限防御');
});

test('人员管理页：角色只在首次分配时有效，编辑不再出现角色', () => {
  // 原则 3：编辑人员时隐藏角色选择区，只能通过勾选变更权限
  assert.ok(/roleSection\.hidden\s*=\s*isEditing/.test(staffHtml), '编辑时应隐藏角色选择区');
  assert.ok(/if\s*\(!editingStaffRecord\)\s*\{[\s\S]{0,220}staffPayload\.role\s*=/.test(staffHtml), '仅新建时写入 role 字段');
  // 原则 1：全平台数据范围（如平台运维）动态可见全部设备，无需逐台分配
  assert.ok(/function\s+isAllScopeForCurrentEditor\s*\(/.test(staffHtml), '应有全平台范围判定（新建看角色模板，编辑看人员记录）');
  assert.ok(/skipDeviceRequirement/.test(staffHtml), '全平台范围应豁免设备必选');
  assert.ok(/deviceDataScope,/.test(staffHtml), '保存时应把数据范围落到人员记录');
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

test('人员管理页：添加人员表单应为 3 步向导并保留公众号 OpenID 字段', () => {
  assert.ok(staffHtml.includes('基本信息<span class="required">*</span>'));
  assert.ok(staffHtml.includes('用户名'));
  assert.ok(staffHtml.includes('手机号'));
  assert.ok(staffHtml.includes('公众号 OpenID'));
  assert.ok(staffHtml.includes('id="staffWechatOpenId"'));
  // 邮箱：Google 登录用，小程序/Google 二选一登录 → 选填 + 格式校验
  assert.ok(staffHtml.includes('id="staffEmail"'), '基本信息应有邮箱输入框');
  assert.ok(/for="staffEmail">邮箱<span class="form-label-optional">（选填）<\/span>/.test(staffHtml), '邮箱应标记为选填');
  assert.ok(staffHtml.includes('用于 Google 账号登录'), '邮箱字段应说明 Google 登录用途');
  assert.ok(/email\s*&&\s*!\/\^\[\^\\s@\]\+@\[\^\\s@\]\+\\\.\[\^\\s@\]\+\$\/\.test\(email\)/.test(staffHtml), '校验应为“填了才校验格式”，留空放行');
  // 添加员工弹窗应为 3 步向导结构
  assert.ok(/class="staff-modal-stepbar"/.test(staffHtml), '应使用分步向导步骤条');
  assert.ok((staffHtml.match(/class="staff-modal-step-section"/g) || []).length === 3, '应有 3 个步骤区块');
  assert.ok(/staff-modal-step-trigger-label">基本信息</.test(staffHtml), '步骤1 标签应为基本信息');
  assert.ok(/staff-modal-step-trigger-label">角色与设备</.test(staffHtml), '步骤2 标签应为角色与设备');
  assert.ok(/staff-modal-step-trigger-label">权限确认</.test(staffHtml), '步骤3 标签应为权限确认');
  assert.ok(/id="staffNextBtn"/.test(staffHtml) && /id="staffPrevBtn"/.test(staffHtml), '应有上一步/下一步导航按钮');
  assert.ok(/可管理设备/.test(staffHtml));
  assert.ok(/全部可管理设备/.test(staffHtml));
  assert.ok(/这个员工最多只能看到这里选中的设备/.test(staffHtml));
  assert.ok(/在每个页面行里设置可进入页面和可查看设备/.test(staffHtml));
  assert.ok(!staffHtml.includes('运维小程序授权'));
  assert.ok(!staffHtml.includes('微信公众号推送授权'));
  assert.ok(!staffHtml.includes('for="opsOpenid"'));
  assert.ok(!staffHtml.includes('for="wechatOpenid"'));
  assert.ok(!staffHtml.includes('id="opsOpenid"'));
  assert.ok(!staffHtml.includes('id="wechatOpenid"'));
  assert.ok(!staffHtml.includes('设备池'));
  assert.ok(!staffHtml.includes('负责设备号'));
  assert.ok(!staffHtml.includes('全部负责设备'));
  assert.ok(!/name="push"/.test(staffHtml));
  assert.ok(!/function\s+handlePushOptionChange\s*\(/.test(staffHtml));
  assert.ok(!/function\s+mockAuthorize\s*\(/.test(staffHtml));

  assert.ok(staffHtml.includes('在每个页面行里设置可进入页面和可查看设备。'));
  assert.ok(/class="permission-section-head"/.test(staffHtml), '应使用紧凑权限区头部');
  assert.ok(/id="permissionSelectionStats"/.test(staffHtml), '应存在权限总数提示胶囊');
  assert.ok(/class="permission-group-row"/.test(staffHtml), '权限组应改为轻量行式布局');
  assert.ok(/class="permission-group-trigger"/.test(staffHtml), '权限组应提供轻量展开入口');
  assert.ok(/class="permission-group-options"/.test(staffHtml), '权限组选项区应保留可编辑能力');
  assert.ok(/class="permission-inline-option"/.test(staffHtml), '权限组选项应改为紧凑项样式');
  assert.ok(/data-permission-summary="products"/.test(staffHtml), '应提供商品管理权限摘要槽位');
  assert.ok(/data-permission-count="orders"/.test(staffHtml), '应提供订单权限计数槽位');
  assert.ok(/data-permission-count="materials"[\s\S]*0\/2/.test(staffHtml), '物料权限组计数应更新为 0/2');
  assert.ok(!/permission-group-card/.test(staffHtml), '不应继续使用大卡片权限样式');
  assert.ok(!/permission-child-grid/.test(staffHtml), '不应继续使用旧的权限子项网格');

  [
    '总览', '查看总览',
    '设备', '查看设备',
    '商品管理', '查看商品管理', '新增语言', '更改币种', '编辑商品', '编辑配方',
    '物料', '查看物料', '编辑货道名称',
    '订单', '查看订单', '订单退款',
    '故障列表', '查看故障列表',
    '人员管理', '查看人员管理', '人员维护'
  ].forEach((label) => {
    assert.ok(staffHtml.includes(label), `权限树缺少 ${label}`);
  });

  [
    '运维权限',
    '维修权限',
    '财务权限',
    '管理员权限',
    '运维&退款权限'
  ].forEach((label) => {
    assert.ok(!staffHtml.includes(label), `权限树中不应再出现旧权限 ${label}`);
  });
});

test('人员管理页：应仅使用登录态商户过滤管理人员，并校验新增必填规则', () => {
  assert.ok(/const\s+DEFAULT_SIDEBAR_LOGIN_PROFILE\s*=\s*\{[\s\S]*merchantId:\s*'C001'[\s\S]*merchantName:\s*'星巴克咖啡'[\s\S]*\}/.test(staffHtml));
  assert.ok(/function\s+getCurrentMerchantContext\s*\(\)/.test(staffHtml));
  assert.ok(/selectedMerchantId\s*=\s*getCurrentMerchantContext\(\)\.merchantId;/.test(staffHtml));
  // 超管跨商户看全部人员；非超管仍按登录商户过滤
  assert.ok(/全平台 · 管理人员列表/.test(staffHtml), '超管列表标题应为全平台');
  assert.ok(/listTitle\.textContent\s*=\s*isSuper[\s\S]*getCurrentMerchantContext\(\)\.merchantName\s*\|\|\s*'未获取登录商户'/.test(staffHtml));
  assert.ok(!/function\s+resolveInitialMerchantId\s*\(/.test(staffHtml));
  assert.ok(!/new URLSearchParams\(window\.location\.search \|\| ''\)/.test(staffHtml));
  assert.ok(!/currentMerchantId/.test(staffHtml));
  assert.ok(/function\s+getManagersByMerchant\s*\(merchantId\)/.test(staffHtml));
  assert.ok(/isSuper\s*\?\s*staffManagersData\s*:\s*getManagersByMerchant\(selectedMerchantId\)/.test(staffHtml), '超管应展示全部人员');
  assert.ok(/function\s+getSelectedPermissionValues\s*\(\)/.test(staffHtml));
  assert.ok(/if\s*\(!username\s*\|\|\s*!phone\)/.test(staffHtml));
  assert.ok(/function\s+resolveStaffModalValidationResult\s*\(/.test(staffHtml));
  assert.ok(/if\s*\(validationResult\.message\)/.test(staffHtml));
  assert.ok(/validationResult\.stepKey/.test(staffHtml));
  assert.ok(/showToast\('未获取登录商户信息'\)/.test(staffHtml));
  assert.ok(/localStorage\.setItem\('staffManagersData',\s*JSON\.stringify\(staffManagersData\)\)/.test(staffHtml));
});

test('人员管理页：应支持编辑人员信息和负责设备', () => {
  assert.ok(/onclick="editStaff\('\$\{manager\.id\}'\)"/.test(staffHtml));
  assert.ok(/let\s+editingStaffId\s*=\s*null;/.test(staffHtml));
  assert.ok(/function\s+editStaff\s*\(staffId\)/.test(staffHtml));
  assert.ok(/editingStaffId\s*=\s*staffId;/.test(staffHtml));
  assert.ok(/const\s+targetStaff\s*=\s*staffManagersData\.find\(\(item\)\s*=>\s*item\.id\s*===\s*staffId\);/.test(staffHtml));
  assert.ok(!/selectedMerchantId\s*=\s*targetStaff\.merchantId\s*\|\|\s*selectedMerchantId;/.test(staffHtml));
  assert.ok(/renderDevicePicker\(targetStaff\.devices\s*\|\|\s*\[\]\)/.test(staffHtml), '编辑回填设备清单不再依赖商户参数');
  assert.ok(/function\s+normalizeStaffPermissions\s*\(permissions\)/.test(staffHtml));
  assert.ok(/const\s+staffIndex\s*=\s*staffManagersData\.findIndex\(\(item\)\s*=>\s*item\.id\s*===\s*editingStaffId\);/.test(staffHtml));
  assert.ok(/nextStaff\s*=\s*\{[\s\S]*devices:\s*selectedDevices[\s\S]*nextStaffManagersData\[staffIndex\]\s*=\s*nextStaff/.test(staffHtml));
  assert.ok(/validateAndCommitStaffChange\(beforeStaff/.test(staffHtml));
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
  assert.ok(/ops\.materials\.laneNameEdit/.test(staffHtml));
  assert.ok(/ops\.materials\.laneMaterialEdit/.test(staffHtml));
  assert.ok(/ops\.orders\.refund/.test(staffHtml));
  assert.ok(/ops\.staff\.manage/.test(staffHtml));
  assert.ok(/function\s+renderPermissionTree\s*\(/.test(staffHtml));
  assert.ok(/function\s+syncPermissionParentState\s*\(/.test(staffHtml));
  assert.ok(/function\s+refreshPermissionSelectionUi\s*\(/.test(staffHtml));
  assert.ok(/function\s+updatePermissionSelectionStats\s*\(/.test(staffHtml));
  assert.ok(/function\s+updatePermissionGroupDisplay\s*\(/.test(staffHtml));
  assert.ok(/normalizedSet\.has\('ops\.staff\.manage'\)[\s\S]*normalizedSet\.add\('ops\.materials\.laneNameEdit'\)[\s\S]*normalizedSet\.add\('ops\.materials\.laneMaterialEdit'\)/.test(staffHtml));

  const renderManagersBlockMatch = staffHtml.match(/function\s+renderManagers\s*\(\)\s*\{[\s\S]*?\n\s*function\s+updateStats/);
  assert.ok(renderManagersBlockMatch, '应存在 renderManagers 逻辑');
  const renderManagersBlock = renderManagersBlockMatch[0];
  assert.ok(/manager-device-summary/.test(renderManagersBlock));
  assert.ok(/已绑公众号/.test(renderManagersBlock), '列表页应展示公众号绑定状态徽章');
  assert.ok(!/manager-panel-title">权限/.test(renderManagersBlock), '列表页不应展示权限面板');
  assert.ok(!/manager-panel-title">公众号推送/.test(renderManagersBlock), '列表页不应恢复旧公众号推送面板');
  assert.ok(!/运维 openId:/.test(renderManagersBlock), '列表页不应展示运维 openId');
  assert.ok(!/公众号 openId:/.test(renderManagersBlock), '列表页不应展示旧 openId 文案');
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

test('人员管理页：应支持按页面配置设备范围，并将范围限制在负责设备内', () => {
  assert.ok(/moduleDeviceScopes/.test(staffHtml));
  assert.ok(/设备范围/.test(staffHtml));
  ['devices', 'products', 'materials', 'orders', 'faults'].forEach((moduleKey) => {
    assert.ok(new RegExp(`data-module-scope-row="${moduleKey}"`).test(staffHtml), `${moduleKey} 应支持页面设备范围`);
  });
  assert.ok(!/id="moduleDeviceScopeRows"/.test(staffHtml));
  assert.ok(/function\s+normalizeModuleDeviceScopes\s*\(/.test(staffHtml));
  assert.ok(/function\s+validateModuleDeviceScopes\s*\(/.test(staffHtml));
  assert.ok(/function\s+pruneModuleDeviceScopesToAssignedDevices\s*\(/.test(staffHtml));
  assert.ok(/function\s+renderModuleDeviceScopeRows\s*\(/.test(staffHtml));
  assert.ok(/function\s+openModuleDeviceScopeSelector\s*\(/.test(staffHtml));
  assert.ok(/function\s+renderModuleScopeDevicePickerList\s*\(/.test(staffHtml));
  assert.ok(/function\s+getAvailableScopedModulesForStep\s*\(/.test(staffHtml));
  assert.ok(!/function\s+canOpenStaffModalStep\s*\(/.test(staffHtml));
  assert.ok(/function\s+getEmptyCustomScopeModuleKeys\s*\(/.test(staffHtml));
  assert.ok(/function\s+resolveStaffModalValidationResult\s*\(/.test(staffHtml));
  assert.ok(/全部可管理设备/.test(staffHtml));
  assert.ok(/限制设备/.test(staffHtml));
  assert.ok(/重新选择/.test(staffHtml));
  assert.ok(!/>指定设备<\/button>/.test(staffHtml), '不应再让用户先切换指定设备模式');
  assert.ok(/function\s+buildModuleScopeDeviceChipLabel\s*\(/.test(staffHtml));
  assert.ok(/white-space:\s*nowrap;[\s\S]*?\.module-scope-mode/.test(staffHtml), '范围按钮文字不应换行');
  assert.ok(!/scope\.mode === 'custom' \? '重新选择' : '选择设备'/.test(staffHtml), '继承全部设备时不应继续渲染不可用的选择设备按钮');
  assert.ok(/设备范围/.test(staffHtml));
  assert.ok(/moduleKey:\s*'devices'/.test(staffHtml));
  assert.ok(/moduleKey:\s*'products'/.test(staffHtml));
  assert.ok(/moduleKey:\s*'materials'/.test(staffHtml));
  assert.ok(/moduleKey:\s*'orders'/.test(staffHtml));
  assert.ok(/moduleKey:\s*'faults'/.test(staffHtml));
  assert.ok(/已设置为“指定设备”，但还没有可查看设备/.test(staffHtml));
  assert.ok(/请点击“选择设备”，或改为“全部可管理设备”/.test(staffHtml));
  assert.ok(/moduleDeviceScopes:\s*normalizedModuleDeviceScopes/.test(staffHtml));
});

test('人员管理页：角色切换应采用「待确认 + 撤销」两步交互，不再立即覆盖权限', () => {
  // 新的 HTML 结构：当前角色条 + 待确认对比条 + 卡片
  assert.ok(/id="roleCurrentBanner"/.test(staffHtml), '应有当前角色条容器');
  assert.ok(/id="roleCurrentName"/.test(staffHtml), '应有当前角色名节点');
  assert.ok(/id="roleCurrentUndoBtn"[\s\S]*?hidden/.test(staffHtml), '撤销按钮默认必须 hidden');
  assert.ok(/id="roleSwitchPreview"[\s\S]*?hidden/.test(staffHtml), '待确认对比条默认必须 hidden');
  assert.ok(/onclick="confirmRoleSwitch\(\)"/.test(staffHtml), '应提供确认切换按钮');
  assert.ok(/onclick="cancelRoleSwitch\(\)"/.test(staffHtml), '应提供取消切换按钮');
  assert.ok(/onclick="undoRoleSwitch\(\)"/.test(staffHtml), '应提供撤销切换按钮');

  // 旧 API 必须不存在
  assert.ok(!/id="roleSummaryBar"/.test(staffHtml), '旧的 roleSummaryBar 必须被删除');
  assert.ok(!/onclick="resetRoleSelection\(\)"/.test(staffHtml), '旧的 resetRoleSelection 入口必须被删除');
  assert.ok(!/onclick="selectRole\(/.test(staffHtml), '点击卡片不应再调用旧的 selectRole');
  assert.ok(!/\bisRoleFirstSelection\b/.test(staffHtml), '旧的 isRoleFirstSelection 标志应被移除');
  assert.ok(!/\bselectedRoleId\b/.test(staffHtml), '统一改用 committedRoleId/pendingRoleId');

  // 新的状态机变量
  assert.ok(/let\s+committedRoleId\s*=\s*'custom'/.test(staffHtml), '应声明 committedRoleId');
  assert.ok(/let\s+pendingRoleId\s*=\s*null/.test(staffHtml), '应声明 pendingRoleId');
  assert.ok(/let\s+lastCommitSnapshot\s*=\s*null/.test(staffHtml), '应声明 lastCommitSnapshot');

  // 新函数齐备
  assert.ok(/function\s+requestRoleSwitch\s*\(/.test(staffHtml), '应有 requestRoleSwitch');
  assert.ok(/function\s+confirmRoleSwitch\s*\(/.test(staffHtml), '应有 confirmRoleSwitch');
  assert.ok(/function\s+cancelRoleSwitch\s*\(/.test(staffHtml), '应有 cancelRoleSwitch');
  assert.ok(/function\s+undoRoleSwitch\s*\(/.test(staffHtml), '应有 undoRoleSwitch');
  assert.ok(/function\s+snapshotCurrentRoleState\s*\(/.test(staffHtml), '应有 snapshotCurrentRoleState');
  assert.ok(/function\s+restoreFromSnapshot\s*\(/.test(staffHtml), '应有 restoreFromSnapshot');
  assert.ok(/function\s+renderRoleCurrentBanner\s*\(/.test(staffHtml), '应有 renderRoleCurrentBanner');
  assert.ok(/function\s+renderRoleSwitchPreview\s*\(/.test(staffHtml), '应有 renderRoleSwitchPreview');
  assert.ok(/function\s+invalidateRoleSnapshotOnManualEdit\s*\(/.test(staffHtml), '应有 invalidateRoleSnapshotOnManualEdit');
});

test('人员管理页：回填员工时绝不触发切换 UI（lastCommitSnapshot 必须显式置 null）', () => {
  const fillFnMatch = staffHtml.match(/function\s+fillStaffForm\s*\([^)]*\)\s*\{[\s\S]*?\n\s{8}\}/);
  assert.ok(fillFnMatch, '应能定位到 fillStaffForm');
  const fillFn = fillFnMatch[0];
  assert.ok(/committedRoleId\s*=\s*staffRole\.id\s*\|\|\s*'custom'/.test(fillFn), 'fillStaffForm 应从 staff.role.id 还原 committedRoleId');
  assert.ok(/pendingRoleId\s*=\s*null/.test(fillFn), 'fillStaffForm 应显式置 pendingRoleId = null');
  assert.ok(/lastCommitSnapshot\s*=\s*null/.test(fillFn), 'fillStaffForm 必须显式置 lastCommitSnapshot = null，避免撤销按钮残留');

  const resetFnMatch = staffHtml.match(/function\s+resetStaffForm\s*\([^)]*\)\s*\{[\s\S]*?\n\s{8}\}/);
  assert.ok(resetFnMatch, '应能定位到 resetStaffForm');
  const resetFn = resetFnMatch[0];
  assert.ok(/lastCommitSnapshot\s*=\s*null/.test(resetFn), 'resetStaffForm 必须显式置 lastCommitSnapshot = null');
  assert.ok(/pendingRoleId\s*=\s*null/.test(resetFn), 'resetStaffForm 必须显式置 pendingRoleId = null');
});

test('人员管理页：lastCommitSnapshot 必须仅在 confirmRoleSwitch 中被赋值（铁律）', () => {
  // 找出所有 "lastCommitSnapshot =" 的赋值位置
  const assignments = [...staffHtml.matchAll(/lastCommitSnapshot\s*=\s*([^;\n]+)/g)];
  assert.ok(assignments.length > 0, '应至少有一次 lastCommitSnapshot 赋值');

  // 找到 confirmRoleSwitch 函数体范围
  const confirmFnMatch = staffHtml.match(/function\s+confirmRoleSwitch\s*\([^)]*\)\s*\{[\s\S]*?\n\s{8}\}/);
  assert.ok(confirmFnMatch, '应能定位 confirmRoleSwitch');
  const confirmBody = confirmFnMatch[0];
  assert.ok(/lastCommitSnapshot\s*=\s*snapshotCurrentRoleState\(\)/.test(confirmBody),
    'confirmRoleSwitch 内应有 lastCommitSnapshot = snapshotCurrentRoleState() 这一行');

  // 除 confirmRoleSwitch 外，其他对 lastCommitSnapshot 的赋值只允许置 null
  assignments.forEach((m) => {
    const value = m[1].trim();
    const isInsideConfirm = confirmBody.includes(m[0]);
    if (!isInsideConfirm) {
      assert.ok(value === 'null', `lastCommitSnapshot 仅允许在 confirmRoleSwitch 内非 null 赋值，违规：${m[0]}`);
    }
  });

  // 手动改权限的两个 handler 必须调用 invalidateRoleSnapshotOnManualEdit
  const parentFn = staffHtml.match(/function\s+handlePermissionParentChange\s*\([^)]*\)\s*\{[\s\S]*?\n\s{8}\}/);
  const childFn = staffHtml.match(/function\s+handlePermissionChildChange\s*\([^)]*\)\s*\{[\s\S]*?\n\s{8}\}/);
  assert.ok(parentFn && /invalidateRoleSnapshotOnManualEdit\(\)/.test(parentFn[0]),
    'handlePermissionParentChange 必须调用 invalidateRoleSnapshotOnManualEdit');
  assert.ok(childFn && /invalidateRoleSnapshotOnManualEdit\(\)/.test(childFn[0]),
    'handlePermissionChildChange 必须调用 invalidateRoleSnapshotOnManualEdit');
});

test('人员管理页：种子员工必须带 role 与 deviceDataScope，避免编辑时误显示"自定义"', () => {
  const seedMatch = staffHtml.match(/const\s+defaultManagers\s*=\s*\[[\s\S]*?\n\s{8}\];/);
  assert.ok(seedMatch, '应能定位 defaultManagers 种子数据');
  const seedBlock = seedMatch[0];
  const roleCount = (seedBlock.match(/role:\s*\{\s*id:/g) || []).length;
  const scopeCount = (seedBlock.match(/deviceDataScope:/g) || []).length;
  assert.ok(roleCount >= 3, `种子员工应各自带 role 字段（找到 ${roleCount} 个），否则编辑弹窗会退回自定义`);
  assert.ok(scopeCount >= 3, `种子员工应各自带 deviceDataScope 字段（找到 ${scopeCount} 个）`);
});

test('人员管理页：历史无 role 记录应可按权限精确回填角色，且不得误判为平台运维', () => {
  const inferMatch = staffHtml.match(/function\s+inferRoleForLegacyRecord\s*\([^)]*\)\s*\{[\s\S]*?\n\s{8}\}/);
  assert.ok(inferMatch, '应定义 inferRoleForLegacyRecord 历史数据回填 helper');
  const inferFn = inferMatch[0];
  // operations 与 platform_ops 权限集完全相同（均逐台分配设备），无法靠权限区分；
  // 历史无 role 记录一律是商户内员工，回填必须跳过 platform_ops 防止越权
  assert.ok(/filter\s*\(\s*\(?template\)?\s*=>\s*template\.id\s*!==\s*'platform_ops'\s*\)/.test(inferFn),
    'inferRoleForLegacyRecord 必须跳过 platform_ops，避免商户老数据被误判为平台角色');
  // bootstrap else 分支应调用回填 helper
  assert.ok(/inferRoleForLegacyRecord\s*\(/.test(staffHtml.replace(inferFn, '')),
    'bootstrapStaffManagers 应调用 inferRoleForLegacyRecord 回填历史记录');
});

