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

test('人员管理页：应提供商户切换和管理人员列表区域', () => {
  assert.ok(staffHtml.includes('<title>人员管理 - 运营控制台</title>'));
  assert.ok(staffHtml.includes('<h1 class="header-title">人员管理</h1>'));
  assert.ok(staffHtml.includes('id="merchantSelect"'));
  assert.ok(staffHtml.includes('id="managerList"'));
  assert.ok(staffHtml.includes('onclick="openStaffModal()"'));
});

test('人员管理页：添加人员表单应覆盖截图中的关键字段分组', () => {
  assert.ok(staffHtml.includes('基本信息<span class="required">*</span>'));
  assert.ok(staffHtml.includes('用户名'));
  assert.ok(staffHtml.includes('手机号'));
  assert.ok(staffHtml.includes('运维小程序授权'));
  assert.ok(staffHtml.includes('微信公众号推送授权'));
  assert.ok(staffHtml.includes('openId'));
  assert.ok(staffHtml.includes('选择权限<span class="required">*</span>'));
  assert.ok(staffHtml.includes('公众号推送'));
  assert.ok(staffHtml.includes('负责设备号<span class="required">*</span>'));
  assert.ok(staffHtml.includes('运维权限'));
  assert.ok(staffHtml.includes('维修权限'));
  assert.ok(staffHtml.includes('财务权限'));
  assert.ok(staffHtml.includes('管理员权限'));
  assert.ok(staffHtml.includes('运维&退款权限'));
});

test('人员管理页：应按当前商户过滤管理人员，并校验新增必填规则', () => {
  assert.ok(/function\s+resolveInitialMerchantId\s*\(\)\s*\{[\s\S]*new URLSearchParams\(window\.location\.search \|\| ''\)/.test(staffHtml));
  assert.ok(/localStorage\.setItem\('currentMerchantId',\s*selectedMerchantId\)/.test(staffHtml));
  assert.ok(/function\s+getManagersByMerchant\s*\(merchantId\)/.test(staffHtml));
  assert.ok(/const\s+filteredManagers\s*=\s*getManagersByMerchant\(selectedMerchantId\);/.test(staffHtml));
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
  assert.ok(/const\s+staffIndex\s*=\s*staffManagersData\.findIndex\(\(item\)\s*=>\s*item\.id\s*===\s*editingStaffId\);/.test(staffHtml));
  assert.ok(/staffManagersData\[staffIndex\]\s*=\s*\{[\s\S]*devices:\s*selectedDevices/.test(staffHtml));
  assert.ok(/showToast\(editingStaffId\s*\?\s*'人员信息已更新'\s*:\s*'人员新增成功'\)/.test(staffHtml));
});

test('人员管理页：设备选择应支持点位信息与长列表交互优化', () => {
  assert.ok(staffHtml.includes('id="deviceSelectorModal"'));
  assert.ok(staffHtml.includes('id="openDeviceSelectorBtn"'));
  assert.ok(staffHtml.includes('onclick="openDeviceSelector()"'));
  assert.ok(staffHtml.includes('onclick="closeDeviceSelector()"'));
  assert.ok(staffHtml.includes('id="deviceSearchInput"'));
  assert.ok(staffHtml.includes('placeholder="搜索设备号或点位"'));
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
