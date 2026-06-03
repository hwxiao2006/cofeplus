const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SOURCE = fs.readFileSync(path.join(__dirname, '..', 'shared', 'fault-notify-channels.js'), 'utf8');

function loadModule() {
  const sandbox = { window: {}, globalThis: {} };
  vm.createContext(sandbox);
  vm.runInContext(SOURCE, sandbox);
  return sandbox.window.CofeFaultNotifyChannels || sandbox.globalThis.CofeFaultNotifyChannels;
}

function test(name, fn) {
  try { fn(); console.log(`PASS ${name}`); }
  catch (e) { console.error(`FAIL ${name}`); console.error(e.stack || e.message); process.exitCode = 1; }
}

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

const M = loadModule();

test('normalizeChannelList: 缺字段且原邮箱非空 -> 回填 [email]', () => {
  assert.deepStrictEqual(plain(M.normalizeChannelList(undefined, 'a@b.com')), ['email']);
});

test('normalizeChannelList: 缺字段且原邮箱空 -> 回填 []', () => {
  assert.deepStrictEqual(plain(M.normalizeChannelList(undefined, '')), []);
});

test('normalizeChannelList: 数组含未知值 -> 过滤掉', () => {
  assert.deepStrictEqual(plain(M.normalizeChannelList(['email', 'sms', 'wechat'], '')), ['email', 'wechat']);
});

test('normalizeChannelList: 重复值去重', () => {
  assert.deepStrictEqual(plain(M.normalizeChannelList(['email', 'EMAIL ', 'email'], '')), ['email']);
});

test('normalizeOpenId: 裁剪 + 长度上限 128', () => {
  assert.strictEqual(M.normalizeOpenId('  abc  '), 'abc');
  assert.strictEqual(M.normalizeOpenId('x'.repeat(200)).length, 128);
});

test('isValidEmail: 简单格式校验', () => {
  assert.strictEqual(M.isValidEmail('a@b.com'), true);
  assert.strictEqual(M.isValidEmail('not-an-email'), false);
  assert.strictEqual(M.isValidEmail(''), false);
});

const STAFF_FIXTURE = [
  { id: 'S001', merchantId: 'C001', accountEnabled: true, permissions: ['ops.faults', 'ops.devices'], wechatOpenId: 'OPENID_S001' },
  { id: 'S002', merchantId: 'C001', accountEnabled: true, permissions: ['ops.orders'], wechatOpenId: 'OPENID_S002' },
  { id: 'S003', merchantId: 'C001', accountEnabled: false, permissions: ['ops.faults'], wechatOpenId: 'OPENID_S003' },
  { id: 'S004', merchantId: 'C001', accountEnabled: true, permissions: ['ops.faults'], wechatOpenId: '' },
  { id: 'S005', merchantId: 'C002', accountEnabled: true, permissions: ['ops.faults'], wechatOpenId: 'OPENID_S005' }
];

test('getReachableWechatReceivers: 仅返回同商户 + 启用 + 故障权限 + OpenID 的员工', () => {
  const list = M.getReachableWechatReceivers('C001', STAFF_FIXTURE);
  assert.deepStrictEqual(list.map((staff) => staff.id), ['S001']);
});

test('getReachableWechatReceivers: 商户无任何合格员工 -> []', () => {
  assert.deepStrictEqual(M.getReachableWechatReceivers('C999', STAFF_FIXTURE), []);
});

test('validateCustomerNotifyConfig: 勾邮箱但邮箱为空 -> email-invalid', () => {
  const customer = { id: 'C001', notifyChannels: ['email'], notifyEmail: '' };
  const result = M.validateCustomerNotifyConfig(customer, STAFF_FIXTURE);
  assert.strictEqual(result.valid, false);
  assert.ok(result.errors.some((error) => error.code === 'email-invalid'));
});

test('validateCustomerNotifyConfig: 勾公众号但无可达接收人 -> wechat-no-receiver', () => {
  const customer = { id: 'C999', notifyChannels: ['wechat'], notifyEmail: '' };
  const result = M.validateCustomerNotifyConfig(customer, STAFF_FIXTURE);
  assert.strictEqual(result.valid, false);
  assert.ok(result.errors.some((error) => error.code === 'wechat-no-receiver'));
});

test('validateCustomerNotifyConfig: 都不勾 -> valid', () => {
  const customer = { id: 'C001', notifyChannels: [], notifyEmail: '' };
  const result = M.validateCustomerNotifyConfig(customer, STAFF_FIXTURE);
  assert.strictEqual(result.valid, true);
});

test('validateCustomerNotifyConfig: 都勾且都满足 -> valid', () => {
  const customer = { id: 'C001', notifyChannels: ['email', 'wechat'], notifyEmail: 'ops@x.com' };
  const result = M.validateCustomerNotifyConfig(customer, STAFF_FIXTURE);
  assert.strictEqual(result.valid, true);
});

const CUSTOMERS_FIXTURE = [
  { id: 'C001', name: '星巴克', notifyChannels: ['email', 'wechat'], notifyEmail: 'a@b.com' },
  { id: 'C002', name: '瑞幸', notifyChannels: ['wechat'], notifyEmail: '' }
];

test('previewStaffChangeImpact: 清空 OpenID 致 C001 失去唯一接收人 -> 返回 C001', () => {
  const before = STAFF_FIXTURE.find((staff) => staff.id === 'S001');
  const after = { ...before, wechatOpenId: '' };
  const projected = STAFF_FIXTURE.map((staff) => staff.id === 'S001' ? after : staff);
  const impact = M.previewStaffChangeImpact(before, after, CUSTOMERS_FIXTURE, projected);
  assert.deepStrictEqual(plain(impact.map((item) => item.merchantId)), ['C001']);
});

test('previewStaffChangeImpact: 删除 S001(after = null)', () => {
  const before = STAFF_FIXTURE.find((staff) => staff.id === 'S001');
  const projected = STAFF_FIXTURE.filter((staff) => staff.id !== 'S001');
  const impact = M.previewStaffChangeImpact(before, null, CUSTOMERS_FIXTURE, projected);
  assert.deepStrictEqual(plain(impact.map((item) => item.merchantId)), ['C001']);
});

test('previewStaffChangeImpact: 移除 S001 故障权限', () => {
  const before = STAFF_FIXTURE.find((staff) => staff.id === 'S001');
  const after = { ...before, permissions: ['ops.orders'] };
  const projected = STAFF_FIXTURE.map((staff) => staff.id === 'S001' ? after : staff);
  const impact = M.previewStaffChangeImpact(before, after, CUSTOMERS_FIXTURE, projected);
  assert.deepStrictEqual(plain(impact.map((item) => item.merchantId)), ['C001']);
});

test('previewStaffChangeImpact: 停用 S001', () => {
  const before = STAFF_FIXTURE.find((staff) => staff.id === 'S001');
  const after = { ...before, accountEnabled: false };
  const projected = STAFF_FIXTURE.map((staff) => staff.id === 'S001' ? after : staff);
  const impact = M.previewStaffChangeImpact(before, after, CUSTOMERS_FIXTURE, projected);
  assert.deepStrictEqual(plain(impact.map((item) => item.merchantId)), ['C001']);
});

test('previewStaffChangeImpact: 把 S001 转到 C002 -> C001 失去接收人', () => {
  const before = STAFF_FIXTURE.find((staff) => staff.id === 'S001');
  const after = { ...before, merchantId: 'C002' };
  const projected = STAFF_FIXTURE.map((staff) => staff.id === 'S001' ? after : staff);
  const impact = M.previewStaffChangeImpact(before, after, CUSTOMERS_FIXTURE, projected);
  assert.deepStrictEqual(plain(impact.map((item) => item.merchantId).sort()), ['C001']);
});

test('previewStaffChangeImpact: 商户未勾公众号 -> 不在影响列表', () => {
  const customers = [{ id: 'C001', name: '星巴克', notifyChannels: ['email'], notifyEmail: 'a@b.com' }];
  const before = STAFF_FIXTURE.find((staff) => staff.id === 'S001');
  const after = { ...before, wechatOpenId: '' };
  const projected = STAFF_FIXTURE.map((staff) => staff.id === 'S001' ? after : staff);
  const impact = M.previewStaffChangeImpact(before, after, customers, projected);
  assert.deepStrictEqual(plain(impact), []);
});

function createStorage(seed = {}) {
  const store = { ...seed };
  return {
    getItem(key) { return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null; },
    setItem(key, value) { store[key] = String(value); },
    removeItem(key) { delete store[key]; },
    _dump() { return store; }
  };
}

test('reconcileNotifyChannels: 商户勾公众号但无接收人 -> 自动剥离 wechat', () => {
  const customers = JSON.parse(JSON.stringify(CUSTOMERS_FIXTURE));
  const staff = STAFF_FIXTURE.map((item) => item.id === 'S001' ? { ...item, wechatOpenId: '' } : item);
  const changes = M.reconcileNotifyChannels(customers, staff);
  assert.deepStrictEqual(plain(changes.map((item) => item.merchantId).sort()), ['C001']);
  assert.deepStrictEqual(plain(customers.find((item) => item.id === 'C001').notifyChannels), ['email']);
  assert.deepStrictEqual(plain(customers.find((item) => item.id === 'C002').notifyChannels), ['wechat']);
});

test('reconcileNotifyChannels: 配置无异常 -> 不改动', () => {
  const customers = JSON.parse(JSON.stringify(CUSTOMERS_FIXTURE));
  const changes = M.reconcileNotifyChannels(customers, STAFF_FIXTURE);
  assert.deepStrictEqual(plain(changes), []);
  assert.deepStrictEqual(plain(customers.find((item) => item.id === 'C001').notifyChannels), ['email', 'wechat']);
});

test('appendReconcileLog + getReconcileLog: FIFO 上限 20', () => {
  const storage = createStorage();
  for (let i = 0; i < 25; i += 1) {
    M.appendReconcileLog(storage, { merchantId: 'C' + i, kind: 'auto', reason: 'wechat-no-receiver' });
  }
  const log = M.getReconcileLog(storage);
  assert.strictEqual(log.length, 20);
  assert.strictEqual(log[0].merchantId, 'C24');
  assert.strictEqual(log[19].merchantId, 'C5');
});

test('clearReconcileLog: 清空', () => {
  const storage = createStorage();
  M.appendReconcileLog(storage, { merchantId: 'C001', kind: 'auto', reason: 'x' });
  M.clearReconcileLog(storage);
  assert.deepStrictEqual(plain(M.getReconcileLog(storage)), []);
});
