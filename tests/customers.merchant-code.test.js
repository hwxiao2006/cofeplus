const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'customers.html'), 'utf8');
const locationsHtml = fs.readFileSync(path.join(__dirname, '..', 'locations.html'), 'utf8');

function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    console.error(error.stack || error.message);
    process.exitCode = 1;
  }
}

function extractFunctionSource(source, functionName) {
  const signature = `function ${functionName}(`;
  const start = source.indexOf(signature);
  if (start === -1) {
    throw new Error(`未找到函数 ${functionName}`);
  }
  let paramsDepth = 0;
  let braceStart = -1;
  for (let index = start; index < source.length; index += 1) {
    const char = source[index];
    if (char === '(') paramsDepth += 1;
    if (char === ')') {
      paramsDepth -= 1;
      continue;
    }
    if (char === '{' && paramsDepth === 0) {
      braceStart = index;
      break;
    }
  }
  if (braceStart === -1) {
    throw new Error(`函数 ${functionName} 缺少函数体`);
  }
  let depth = 0;
  for (let index = braceStart; index < source.length; index += 1) {
    const char = source[index];
    if (char === '{') depth += 1;
    if (char === '}') depth -= 1;
    if (depth === 0) {
      return source.slice(start, index + 1);
    }
  }
  throw new Error(`函数 ${functionName} 解析失败`);
}

function buildMerchantCodeSandbox(initialCustomers) {
  const sandbox = { console };
  vm.createContext(sandbox);
  vm.runInContext(
    `let customersData = ${JSON.stringify(initialCustomers)};`,
    sandbox
  );
  vm.runInContext(extractFunctionSource(html, 'normalizeCustomerCode'), sandbox);
  vm.runInContext(extractFunctionSource(html, 'readJsonArrayFromStorage'), sandbox);
  vm.runInContext(extractFunctionSource(html, 'isValidCustomerCode'), sandbox);
  vm.runInContext(extractFunctionSource(html, 'getReferencedCustomerIds'), sandbox);
  vm.runInContext(extractFunctionSource(html, 'customerCodeExists'), sandbox);
  vm.runInContext(extractFunctionSource(html, 'suggestCustomerCode'), sandbox);
  return sandbox;
}

function buildDomSandbox(elements) {
  const sandbox = {
    console,
    window: {},
    document: {
      getElementById(id) {
        return elements[id] || null;
      }
    }
  };
  vm.createContext(sandbox);
  return sandbox;
}

test('商户表单应包含可编辑的商户编号输入框', () => {
  assert.ok(/id="customerCode"/.test(html), '缺少商户编号输入框');
  assert.ok(/商户编号\s*<span class="required">\*<\/span>/.test(html), '商户编号应为必填项');
});

test('新增客户时应预填建议编号,编辑客户时应设为只读', () => {
  const openModalStart = html.indexOf('function openModal(');
  const openModalEnd = html.indexOf('\n        function ', openModalStart + 30);
  const openModalFn = html.slice(openModalStart, openModalEnd > 0 ? openModalEnd : openModalStart + 2000);
  assert.ok(/setCustomerCodeFieldReadonly\s*\(\s*false\s*\)/.test(openModalFn), '新增时应允许编辑商户编号');
  assert.ok(/customerCode['"]\)\.value\s*=\s*suggestCustomerCode\s*\(/.test(openModalFn), '新增时应预填建议编号');

  const editCustomerStart = html.indexOf('function editCustomer(');
  const editCustomerEnd = html.indexOf('\n        function ', editCustomerStart + 30);
  const editCustomerFn = html.slice(editCustomerStart, editCustomerEnd > 0 ? editCustomerEnd : editCustomerStart + 1500);
  assert.ok(/setCustomerCodeFieldReadonly\s*\(\s*true\s*\)/.test(editCustomerFn), '编辑时应锁定商户编号');
});

test('保存时应校验编号为空并提示', () => {
  const start = html.indexOf('function saveCustomer(');
  const end = html.indexOf('\n        function ', start + 30);
  const fn = html.slice(start, end > 0 ? end : start + 3000);
  assert.ok(/!customerCode/.test(fn) && /请填写必填项/.test(fn), '编号为空应阻止保存');
});

test('保存时应校验商户编号重复并提示', () => {
  const start = html.indexOf('function saveCustomer(');
  const end = html.indexOf('\n        function ', start + 30);
  const fn = html.slice(start, end > 0 ? end : start + 3000);
  assert.ok(/customerCodeExists\s*\(\s*customerCode,\s*editingCustomerId\s*\)/.test(fn), '应调用重复校验');
  assert.ok(/商户编号已存在,请更换/.test(fn), '重复时应提示更换编号');
});

test('新增客户时应使用手动输入的编号作为 id', () => {
  const start = html.indexOf('function saveCustomer(');
  const end = html.indexOf('\n        function ', start + 30);
  const fn = html.slice(start, end > 0 ? end : start + 3500);
  assert.ok(/const newId = customerCode;/.test(fn), '新增时 id 应来自输入编号');
});

test('customerCodeExists 应大小写不敏感地检测重复,并排除当前编辑对象', () => {
  const sandbox = buildMerchantCodeSandbox([
    { id: 'C001' },
    { id: 'C002' }
  ]);
  assert.strictEqual(sandbox.customerCodeExists('c001', null), true);
  assert.strictEqual(sandbox.customerCodeExists('C003', null), false);
  assert.strictEqual(sandbox.customerCodeExists('C001', 'C001'), false, '编辑时不应把自己判为重复');
  assert.strictEqual(sandbox.customerCodeExists('C001', 'C002'), true);
});

test('normalizeCustomerCode 应去除首尾空白', () => {
  const sandbox = buildMerchantCodeSandbox([]);
  assert.strictEqual(sandbox.normalizeCustomerCode('  c005  '), 'C005');
});

test('商户编号应只允许 C 加至少三位数字', () => {
  const sandbox = buildMerchantCodeSandbox([]);
  vm.runInContext(extractFunctionSource(html, 'isValidCustomerCode'), sandbox);
  assert.strictEqual(sandbox.isValidCustomerCode('C005'), true);
  assert.strictEqual(sandbox.isValidCustomerCode('C1000'), true);
  assert.strictEqual(sandbox.isValidCustomerCode('QA-SH-0910'), false);
  assert.strictEqual(sandbox.isValidCustomerCode('<img src=x>'), false);
});

test('重复校验应阻止仍被点位或员工引用的旧编号', () => {
  const sandbox = buildMerchantCodeSandbox([]);
  sandbox.localStorage = {
    getItem(key) {
      return {
        locationsData: JSON.stringify([{ customerId: 'C005' }]),
        staffManagersData: JSON.stringify([{ merchantId: 'C006' }]),
        devicesData: JSON.stringify([{ merchant: 'mer007' }])
      }[key] || null;
    }
  };
  vm.runInContext(extractFunctionSource(html, 'readJsonArrayFromStorage'), sandbox);
  vm.runInContext(extractFunctionSource(html, 'getReferencedCustomerIds'), sandbox);
  assert.strictEqual(sandbox.customerCodeExists('c005', null), true);
  assert.strictEqual(sandbox.customerCodeExists('C006', null), true);
  assert.strictEqual(sandbox.customerCodeExists('C007', null), true);
  assert.strictEqual(sandbox.customerCodeExists('C008', null), false);
});

test('客户列表渲染应转义手动输入的商户编号', () => {
  const elements = { customerList: { innerHTML: '' }, searchInput: { value: '' } };
  const sandbox = buildDomSandbox(elements);
  sandbox.customersData = [{ id: '<b data-probe="1">BAD</b>', name: '商户', contact: '联系人', phone: '1', status: 'active' }];
  sandbox.escapeHtml = vm.runInContext(`(${extractFunctionSource(html, 'escapeHtml')})`, sandbox);
  sandbox.renderCustomerNotifyBadges = () => '';
  vm.runInContext(extractFunctionSource(html, 'renderCustomers'), sandbox);
  sandbox.renderCustomers();
  assert.ok(elements.customerList.innerHTML.includes('&lt;b data-probe=&quot;1&quot;&gt;BAD&lt;/b&gt;'));
  assert.ok(!elements.customerList.innerHTML.includes('<b data-probe="1">BAD</b>'));
});

test('点位页加载商户时应使用安全的 option 节点写入方式', () => {
  const start = locationsHtml.indexOf('function loadCustomers(');
  const end = locationsHtml.indexOf('\n        function ', start + 30);
  const fn = locationsHtml.slice(start, end > 0 ? end : start + 1800);
  assert.ok(/createElement\(['"]option['"]\)/.test(fn), '应通过 DOM 节点创建商户选项');
  assert.ok(/textContent/.test(fn), '商户名称应通过 textContent 写入');
  assert.ok(!/html \+= `/.test(fn), '不应通过 HTML 字符串拼接商户选项');
});

test('保存失败时不应提示成功且应恢复内存中的商户数据', () => {
  const values = {
    customerName: { value: '新商户' }, customerCode: { value: 'c005' }, contactName: { value: '联系人' }, contactPhone: { value: '1' },
    customerNotifyEmail: { value: '' }, customerAddress: { value: '' }, customerRemark: { value: '' },
    customerChannelEmail: { checked: false }, customerChannelWechat: { checked: false },
    customerModal: { classList: { add() {}, remove() {} } }
  };
  const sandbox = buildDomSandbox(values);
  sandbox.customersData = [{ id: 'C001', name: '旧商户', contact: '旧联系人', phone: '1' }];
  sandbox.editingCustomerId = null;
  sandbox.normalizeCustomerCode = value => String(value).trim().toUpperCase();
  sandbox.isValidCustomerCode = value => /^C\d{3,}$/.test(sandbox.normalizeCustomerCode(value));
  sandbox.customerCodeExists = () => false;
  sandbox.isValidNotifyEmail = () => true;
  sandbox.readStaffManagersForNotify = () => [];
  sandbox.window.CofeFaultNotifyChannels = null;
  sandbox.CofeAdminStaffAccess = { isSuperAdmin: () => true, getMerchantScope: () => null };
  sandbox.showToast = (message, type) => { sandbox.lastToast = { message, type }; };
  sandbox.saveToStorage = () => false;
  sandbox.renderCustomers = () => {};
  sandbox.updateStats = () => {};
  sandbox.updateReconcileLogBadge = () => {};
  sandbox.closeModal = () => { sandbox.closed = true; };
  vm.runInContext(extractFunctionSource(html, 'saveCustomer'), sandbox);
  sandbox.saveCustomer();
  assert.strictEqual(JSON.stringify(sandbox.customersData), JSON.stringify([{ id: 'C001', name: '旧商户', contact: '旧联系人', phone: '1' }]));
  assert.notStrictEqual(sandbox.lastToast?.message, '客户添加成功');
  assert.strictEqual(sandbox.closed, undefined);
});

test('新增客户运行时应把手动输入的编号规范化后写入', () => {
  const values = {
    customerName: { value: '新商户' }, customerCode: { value: ' c005 ' }, contactName: { value: '联系人' }, contactPhone: { value: '1' },
    customerNotifyEmail: { value: '' }, customerAddress: { value: '' }, customerRemark: { value: '' },
    customerChannelEmail: { checked: false }, customerChannelWechat: { checked: false },
    customerModal: { classList: { add() {}, remove() {} } }
  };
  const sandbox = buildDomSandbox(values);
  sandbox.customersData = [{ id: 'C001', name: '旧商户', contact: '旧联系人', phone: '1' }];
  sandbox.editingCustomerId = null;
  sandbox.normalizeCustomerCode = value => String(value).trim().toUpperCase();
  sandbox.isValidCustomerCode = value => /^C\d{3,}$/.test(sandbox.normalizeCustomerCode(value));
  sandbox.customerCodeExists = () => false;
  sandbox.isValidNotifyEmail = () => true;
  sandbox.readStaffManagersForNotify = () => [];
  sandbox.window.CofeFaultNotifyChannels = null;
  sandbox.CofeAdminStaffAccess = { isSuperAdmin: () => true, getMerchantScope: () => null };
  sandbox.showToast = (message, type) => { sandbox.lastToast = { message, type }; };
  sandbox.saveToStorage = () => true;
  sandbox.renderCustomers = () => {};
  sandbox.updateStats = () => {};
  sandbox.updateReconcileLogBadge = () => {};
  sandbox.closeModal = () => {};
  vm.runInContext(extractFunctionSource(html, 'saveCustomer'), sandbox);
  sandbox.saveCustomer();
  assert.strictEqual(sandbox.customersData[1].id, 'C005');
  assert.strictEqual(sandbox.lastToast.message, '客户添加成功');
});

test('编辑客户时即使绕过只读控件也不应修改商户编号', () => {
  const values = {
    customerName: { value: '商户' }, customerCode: { value: 'C002' }, contactName: { value: '联系人' }, contactPhone: { value: '1' },
    customerNotifyEmail: { value: '' }, customerAddress: { value: '' }, customerRemark: { value: '' },
    customerChannelEmail: { checked: false }, customerChannelWechat: { checked: false },
    customerModal: { classList: { add() {}, remove() {} } }
  };
  const sandbox = buildDomSandbox(values);
  sandbox.customersData = [{ id: 'C001', name: '商户', contact: '旧联系人', phone: '1' }];
  sandbox.editingCustomerId = 'C001';
  sandbox.normalizeCustomerCode = value => String(value).trim().toUpperCase();
  sandbox.isValidCustomerCode = value => /^C\d{3,}$/.test(sandbox.normalizeCustomerCode(value));
  sandbox.customerCodeExists = () => false;
  sandbox.showToast = (message, type) => { sandbox.lastToast = { message, type }; };
  vm.runInContext(extractFunctionSource(html, 'saveCustomer'), sandbox);
  sandbox.saveCustomer();
  assert.strictEqual(sandbox.lastToast.message, '商户编号创建后不可修改');
  assert.strictEqual(vm.runInContext('customersData[0].id', sandbox), 'C001');
});

test('保存前发现其他标签页更新时应拒绝覆盖最新数据', () => {
  const sandbox = buildDomSandbox({});
  const storage = {
    raw: '[{"id":"C002"}]',
    getItem() { return this.raw; },
    setItem() { throw new Error('不应覆盖并发更新'); }
  };
  sandbox.localStorage = storage;
  sandbox.CUSTOMER_DATA_STORAGE_KEY = 'customersData';
  sandbox.customersData = [{ id: 'C003' }];
  sandbox.customersDataStorageSnapshot = '[{"id":"C001"}]';
  sandbox.showToast = (message, type) => { sandbox.lastToast = { message, type }; };
  vm.runInContext(extractFunctionSource(html, 'saveToStorage'), sandbox);
  assert.strictEqual(sandbox.saveToStorage(), false);
  assert.strictEqual(sandbox.lastToast.type, 'error');
});

test('首次保存前发现其他标签页创建数据时也应拒绝覆盖', () => {
  const sandbox = buildDomSandbox({});
  const storage = {
    raw: '[{"id":"C002"}]',
    getItem() { return this.raw; },
    setItem() { throw new Error('不应覆盖并发创建的数据'); }
  };
  sandbox.localStorage = storage;
  sandbox.CUSTOMER_DATA_STORAGE_KEY = 'customersData';
  sandbox.customersData = [{ id: 'C003' }];
  sandbox.customersDataStorageSnapshot = null;
  sandbox.showToast = (message, type) => { sandbox.lastToast = { message, type }; };
  vm.runInContext(extractFunctionSource(html, 'saveToStorage'), sandbox);
  assert.strictEqual(sandbox.saveToStorage(), false);
  assert.strictEqual(sandbox.lastToast.type, 'error');
});

test('删除仍有引用的商户时应阻止删除', () => {
  const sandbox = buildMerchantCodeSandbox([{ id: 'C005', name: '商户' }]);
  sandbox.localStorage = {
    getItem(key) {
      return key === 'locationsData' ? JSON.stringify([{ customerId: 'C005' }]) : '[]';
    }
  };
  sandbox.confirm = () => { sandbox.confirmed = true; return true; };
  sandbox.showToast = (message, type) => { sandbox.lastToast = { message, type }; };
  vm.runInContext(extractFunctionSource(html, 'deleteCustomer'), sandbox);
  sandbox.deleteCustomer('C005');
  assert.strictEqual(sandbox.confirmed, undefined);
  assert.strictEqual(sandbox.lastToast.type, 'error');
  assert.strictEqual(vm.runInContext('customersData.length', sandbox), 1);
});

test('suggestCustomerCode 应跳过已占用编号', () => {
  const sandbox = buildMerchantCodeSandbox([
    { id: 'C001' },
    { id: 'C003' }
  ]);
  assert.strictEqual(sandbox.suggestCustomerCode(), 'C002');
});
