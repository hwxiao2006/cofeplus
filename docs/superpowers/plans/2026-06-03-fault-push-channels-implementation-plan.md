# 故障推送多渠道：公众号 + 邮箱并行 — 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 device-mgmt 控制台支持「邮箱推送」与「微信公众号推送」并行的故障通知渠道；商户负责选渠道，员工负责登记自己的公众号 OpenID；任何会让「勾了渠道却无人能收」的变更都被拦截或自动修正。

**Architecture:** 抽出独立的共享模块 `shared/fault-notify-channels.js` 集中放渠道默认值、可达性判定、配置校验、员工变更影响预演、自愈与审计日志逻辑；`customers.html` / `staff-management.html` / `faults.html` 三个页面以薄 UI 层调用这些纯函数；测试分两层：纯函数走 `node --test` 直跑，HTML 页面走 VM 抽取脚本的 runtime 测试。

**Tech Stack:** 静态 HTML + 原生 JS（IIFE 暴露到 `window`）；localStorage 持久化；`node --test` + Node `vm` 模块测试。

**Spec:** `device-mgmt/docs/superpowers/specs/2026-06-03-fault-push-channels-design.md`

---

## 文件结构

| 路径 | 角色 | 操作 |
|---|---|---|
| `device-mgmt/shared/fault-notify-channels.js` | 共享模块：常量、默认值归一化、可达性、校验、影响预演、自愈、审计日志 | 新增 |
| `device-mgmt/tests/fault-push-channels.behavior.test.js` | 共享模块单元测试 | 新增 |
| `device-mgmt/tests/fault-push-channels.runtime.test.js` | HTML 页面行为 runtime 测试（VM 抽取脚本） | 新增 |
| `device-mgmt/customers.html` | 商户表单：双复选框 + 邮箱联动 + 校验 + 列表徽章 + 自愈 + 审计日志面板入口 | 修改 |
| `device-mgmt/staff-management.html` | 员工表单：OpenID 字段 + 列表徽章 + 反向保护确认框 | 修改 |
| `device-mgmt/faults.html` | 故障行徽章：从单邮箱重构为渠道徽章 + 自愈 | 修改 |

---

## Task 1: 准备分支与读取规格

**Files:**
- 无代码改动

- [ ] **Step 1: 创建工作分支**

```bash
cd device-mgmt
git checkout -b feat/fault-push-channels
```

- [ ] **Step 2: 通读 spec 与 PRD 段落**

```bash
sed -n '1,200p' docs/superpowers/specs/2026-06-03-fault-push-channels-design.md
```

预期：能复述「核心不变式：勾选渠道 ⇒ 必须可达」「公众号可达 = 同商户 + 启用 + 故障接收权限 + OpenID 非空」「员工侧操作会触发预演确认」「打开页面会自愈」四件事。

- [ ] **Step 3: 跑一次现有测试基线**

```bash
node --test tests/*.test.js
```

预期：现有测试全部通过。记住当前通过用例数，后续新增不应使任何已有用例失败。
> 注：必须用 glob 写法 `tests/*.test.js`，直接 `tests/` 在 Node 25+ 会报 `ERR_MODULE_NOT_FOUND`。

- [ ] **Step 4: Commit**（仅创建分支无文件改动，跳过）

---

## Task 2: 共享模块 — 常量与归一化函数

**Files:**
- Create: `device-mgmt/shared/fault-notify-channels.js`
- Create: `device-mgmt/tests/fault-push-channels.behavior.test.js`

- [ ] **Step 1: 写测试**（先建测试文件）

```js
// device-mgmt/tests/fault-push-channels.behavior.test.js
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

const M = loadModule();

test('normalizeChannelList: 缺字段且原邮箱非空 → 回填 [email]', () => {
  assert.deepStrictEqual(M.normalizeChannelList(undefined, 'a@b.com'), ['email']);
});

test('normalizeChannelList: 缺字段且原邮箱空 → 回填 []', () => {
  assert.deepStrictEqual(M.normalizeChannelList(undefined, ''), []);
});

test('normalizeChannelList: 数组含未知值 → 过滤掉', () => {
  assert.deepStrictEqual(M.normalizeChannelList(['email', 'sms', 'wechat'], ''), ['email', 'wechat']);
});

test('normalizeChannelList: 重复值去重', () => {
  assert.deepStrictEqual(M.normalizeChannelList(['email', 'EMAIL ', 'email'], ''), ['email']);
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
```

- [ ] **Step 2: 运行测试，验证失败**

```bash
cd device-mgmt
node tests/fault-push-channels.behavior.test.js
```

预期：因 `shared/fault-notify-channels.js` 不存在而抛 `ENOENT`。

- [ ] **Step 3: 写共享模块骨架**

```js
// device-mgmt/shared/fault-notify-channels.js
(function(global) {
  const CHANNEL_EMAIL = 'email';
  const CHANNEL_WECHAT = 'wechat';
  const FAULT_PERMISSION_KEY = 'ops.faults';
  const RECONCILE_LOG_KEY = 'faultNotifyReconciliationLog';
  const RECONCILE_LOG_MAX = 20;
  const OPENID_MAX_LEN = 128;
  const ALLOWED_CHANNELS = new Set([CHANNEL_EMAIL, CHANNEL_WECHAT]);

  function normalizeChannelList(value, fallbackEmail) {
    if (!Array.isArray(value)) {
      return String(fallbackEmail || '').trim() ? [CHANNEL_EMAIL] : [];
    }
    return Array.from(new Set(value
      .map((x) => String(x || '').trim().toLowerCase())
      .filter((x) => ALLOWED_CHANNELS.has(x))));
  }

  function normalizeOpenId(value) {
    const s = String(value || '').trim();
    return s.length > OPENID_MAX_LEN ? s.slice(0, OPENID_MAX_LEN) : s;
  }

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
  }

  global.CofeFaultNotifyChannels = {
    CHANNEL_EMAIL,
    CHANNEL_WECHAT,
    FAULT_PERMISSION_KEY,
    RECONCILE_LOG_KEY,
    OPENID_MAX_LEN,
    normalizeChannelList,
    normalizeOpenId,
    isValidEmail
  };
})(typeof window !== 'undefined' ? window : globalThis);
```

- [ ] **Step 4: 跑测试，验证通过**

```bash
node tests/fault-push-channels.behavior.test.js
```

预期：6 个 PASS，0 个 FAIL。

- [ ] **Step 5: Commit**

```bash
git add shared/fault-notify-channels.js tests/fault-push-channels.behavior.test.js
git commit -m "feat(fault-notify): add shared module with channel constants and normalizers"
```

---

## Task 3: 共享模块 — 可达性与配置校验

**Files:**
- Modify: `device-mgmt/shared/fault-notify-channels.js`
- Modify: `device-mgmt/tests/fault-push-channels.behavior.test.js`

- [ ] **Step 1: 追加测试**

把以下追加到测试文件末尾：

```js
const STAFF_FIXTURE = [
  { id: 'S001', merchantId: 'C001', accountEnabled: true, permissions: ['ops.faults', 'ops.devices'], wechatOpenId: 'OPENID_S001' },
  { id: 'S002', merchantId: 'C001', accountEnabled: true, permissions: ['ops.orders'], wechatOpenId: 'OPENID_S002' },           // 无故障权限
  { id: 'S003', merchantId: 'C001', accountEnabled: false, permissions: ['ops.faults'], wechatOpenId: 'OPENID_S003' },          // 禁用
  { id: 'S004', merchantId: 'C001', accountEnabled: true, permissions: ['ops.faults'], wechatOpenId: '' },                       // 未登记OpenID
  { id: 'S005', merchantId: 'C002', accountEnabled: true, permissions: ['ops.faults'], wechatOpenId: 'OPENID_S005' }            // 别的商户
];

test('getReachableWechatReceivers: 仅返回同商户 + 启用 + 故障权限 + OpenID 的员工', () => {
  const list = M.getReachableWechatReceivers('C001', STAFF_FIXTURE);
  assert.deepStrictEqual(list.map(s => s.id), ['S001']);
});

test('getReachableWechatReceivers: 商户无任何合格员工 → []', () => {
  assert.deepStrictEqual(M.getReachableWechatReceivers('C999', STAFF_FIXTURE), []);
});

test('validateCustomerNotifyConfig: 勾邮箱但邮箱为空 → email-invalid', () => {
  const c = { id: 'C001', notifyChannels: ['email'], notifyEmail: '' };
  const r = M.validateCustomerNotifyConfig(c, STAFF_FIXTURE);
  assert.strictEqual(r.valid, false);
  assert.ok(r.errors.some(e => e.code === 'email-invalid'));
});

test('validateCustomerNotifyConfig: 勾公众号但无可达接收人 → wechat-no-receiver', () => {
  const c = { id: 'C999', notifyChannels: ['wechat'], notifyEmail: '' };
  const r = M.validateCustomerNotifyConfig(c, STAFF_FIXTURE);
  assert.strictEqual(r.valid, false);
  assert.ok(r.errors.some(e => e.code === 'wechat-no-receiver'));
});

test('validateCustomerNotifyConfig: 都不勾 → valid', () => {
  const c = { id: 'C001', notifyChannels: [], notifyEmail: '' };
  const r = M.validateCustomerNotifyConfig(c, STAFF_FIXTURE);
  assert.strictEqual(r.valid, true);
});

test('validateCustomerNotifyConfig: 都勾且都满足 → valid', () => {
  const c = { id: 'C001', notifyChannels: ['email', 'wechat'], notifyEmail: 'ops@x.com' };
  const r = M.validateCustomerNotifyConfig(c, STAFF_FIXTURE);
  assert.strictEqual(r.valid, true);
});
```

- [ ] **Step 2: 跑测试，验证失败**

```bash
node tests/fault-push-channels.behavior.test.js
```

预期：6 条新增用例报 `M.getReachableWechatReceivers is not a function` 等。

- [ ] **Step 3: 在共享模块里追加实现**

在 `shared/fault-notify-channels.js` 的 `isValidEmail` 之后、`global.CofeFaultNotifyChannels = ...` 之前，插入：

```js
  function getReachableWechatReceivers(customerId, staffList) {
    const cid = String(customerId || '').trim();
    if (!cid) return [];
    return (Array.isArray(staffList) ? staffList : []).filter((staff) => {
      if (!staff) return false;
      if (String(staff.merchantId || '').trim() !== cid) return false;
      if (staff.accountEnabled === false) return false;
      const perms = Array.isArray(staff.permissions) ? staff.permissions : [];
      if (!perms.includes(FAULT_PERMISSION_KEY)) return false;
      return Boolean(normalizeOpenId(staff.wechatOpenId));
    });
  }

  function validateCustomerNotifyConfig(customer, staffList) {
    const channels = normalizeChannelList(
      customer && customer.notifyChannels,
      customer && customer.notifyEmail
    );
    const errors = [];
    if (channels.includes(CHANNEL_EMAIL) && !isValidEmail(customer && customer.notifyEmail)) {
      errors.push({ code: 'email-invalid', message: '勾选邮箱推送时,请填写合法的故障通知邮箱' });
    }
    if (channels.includes(CHANNEL_WECHAT)) {
      const receivers = getReachableWechatReceivers(customer && customer.id, staffList);
      if (receivers.length === 0) {
        errors.push({ code: 'wechat-no-receiver', message: '公众号推送渠道下无可达接收人,请先在「人员管理」补充配置公众号 OpenID 的员工', receivers: [] });
      }
    }
    return { valid: errors.length === 0, errors, channels };
  }
```

在导出对象里追加 `getReachableWechatReceivers, validateCustomerNotifyConfig`。

- [ ] **Step 4: 跑测试，验证通过**

```bash
node tests/fault-push-channels.behavior.test.js
```

预期：全部 PASS。

- [ ] **Step 5: Commit**

```bash
git add shared/fault-notify-channels.js tests/fault-push-channels.behavior.test.js
git commit -m "feat(fault-notify): add reachability and config validation"
```

---

## Task 4: 共享模块 — 员工变更影响预演

**Files:**
- Modify: `device-mgmt/shared/fault-notify-channels.js`
- Modify: `device-mgmt/tests/fault-push-channels.behavior.test.js`

- [ ] **Step 1: 追加测试**

追加到测试文件末尾：

```js
const CUSTOMERS_FIXTURE = [
  { id: 'C001', name: '星巴克', notifyChannels: ['email', 'wechat'], notifyEmail: 'a@b.com' },
  { id: 'C002', name: '瑞幸', notifyChannels: ['wechat'], notifyEmail: '' }
];

test('previewStaffChangeImpact: 清空 OpenID 致 C001 失去唯一接收人 → 返回 C001', () => {
  const before = STAFF_FIXTURE.find(s => s.id === 'S001');
  const after = { ...before, wechatOpenId: '' };
  const projected = STAFF_FIXTURE.map(s => s.id === 'S001' ? after : s);
  const impact = M.previewStaffChangeImpact(before, after, CUSTOMERS_FIXTURE, projected);
  assert.deepStrictEqual(impact.map(i => i.merchantId), ['C001']);
});

test('previewStaffChangeImpact: 删除 S001（after = null）', () => {
  const before = STAFF_FIXTURE.find(s => s.id === 'S001');
  const projected = STAFF_FIXTURE.filter(s => s.id !== 'S001');
  const impact = M.previewStaffChangeImpact(before, null, CUSTOMERS_FIXTURE, projected);
  assert.deepStrictEqual(impact.map(i => i.merchantId), ['C001']);
});

test('previewStaffChangeImpact: 移除 S001 故障权限', () => {
  const before = STAFF_FIXTURE.find(s => s.id === 'S001');
  const after = { ...before, permissions: ['ops.orders'] };
  const projected = STAFF_FIXTURE.map(s => s.id === 'S001' ? after : s);
  const impact = M.previewStaffChangeImpact(before, after, CUSTOMERS_FIXTURE, projected);
  assert.deepStrictEqual(impact.map(i => i.merchantId), ['C001']);
});

test('previewStaffChangeImpact: 把 S001 转到 C002 → C001 失去接收人', () => {
  const before = STAFF_FIXTURE.find(s => s.id === 'S001');
  const after = { ...before, merchantId: 'C002' };
  const projected = STAFF_FIXTURE.map(s => s.id === 'S001' ? after : s);
  const impact = M.previewStaffChangeImpact(before, after, CUSTOMERS_FIXTURE, projected);
  assert.deepStrictEqual(impact.map(i => i.merchantId).sort(), ['C001']); // C002 现在反而有接收人
});

test('previewStaffChangeImpact: 商户未勾公众号 → 不在影响列表', () => {
  const customers = [{ id: 'C001', name: '星巴克', notifyChannels: ['email'], notifyEmail: 'a@b.com' }];
  const before = STAFF_FIXTURE.find(s => s.id === 'S001');
  const after = { ...before, wechatOpenId: '' };
  const projected = STAFF_FIXTURE.map(s => s.id === 'S001' ? after : s);
  const impact = M.previewStaffChangeImpact(before, after, customers, projected);
  assert.deepStrictEqual(impact, []);
});
```

- [ ] **Step 2: 跑测试，验证失败**

```bash
node tests/fault-push-channels.behavior.test.js
```

预期：5 条新增用例 FAIL（函数不存在）。

- [ ] **Step 3: 实现 `previewStaffChangeImpact`**

在 `validateCustomerNotifyConfig` 之后插入：

```js
  function previewStaffChangeImpact(beforeStaff, afterStaff, customerList, projectedStaff) {
    const affected = [];
    const candidate = new Set();
    if (beforeStaff && beforeStaff.merchantId) candidate.add(String(beforeStaff.merchantId));
    if (afterStaff && afterStaff.merchantId) candidate.add(String(afterStaff.merchantId));
    candidate.forEach((cid) => {
      const customer = (customerList || []).find(c => String(c && c.id) === cid);
      if (!customer) return;
      const channels = normalizeChannelList(customer.notifyChannels, customer.notifyEmail);
      if (!channels.includes(CHANNEL_WECHAT)) return;
      if (getReachableWechatReceivers(cid, projectedStaff).length === 0) {
        affected.push({ merchantId: cid, merchantName: customer.name || cid });
      }
    });
    return affected;
  }
```

导出列表追加 `previewStaffChangeImpact`。

- [ ] **Step 4: 跑测试，验证通过**

```bash
node tests/fault-push-channels.behavior.test.js
```

预期：全部 PASS。

- [ ] **Step 5: Commit**

```bash
git add shared/fault-notify-channels.js tests/fault-push-channels.behavior.test.js
git commit -m "feat(fault-notify): predict staff-change impact on merchant wechat channel"
```

---

## Task 5: 共享模块 — 自愈与审计日志

**Files:**
- Modify: `device-mgmt/shared/fault-notify-channels.js`
- Modify: `device-mgmt/tests/fault-push-channels.behavior.test.js`

- [ ] **Step 1: 追加测试**

```js
function createStorage(seed = {}) {
  const store = { ...seed };
  return {
    getItem(k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
    setItem(k, v) { store[k] = String(v); },
    removeItem(k) { delete store[k]; },
    _dump() { return store; }
  };
}

test('reconcileNotifyChannels: 商户勾公众号但无接收人 → 自动剥离 wechat', () => {
  const customers = JSON.parse(JSON.stringify(CUSTOMERS_FIXTURE));
  const staff = STAFF_FIXTURE.map(s => s.id === 'S001' ? { ...s, wechatOpenId: '' } : s);
  const changes = M.reconcileNotifyChannels(customers, staff);
  assert.deepStrictEqual(changes.map(c => c.merchantId).sort(), ['C001', 'C002']);
  assert.deepStrictEqual(customers.find(c => c.id === 'C001').notifyChannels, ['email']);
  assert.deepStrictEqual(customers.find(c => c.id === 'C002').notifyChannels, []);
});

test('reconcileNotifyChannels: 配置无异常 → 不改动', () => {
  const customers = JSON.parse(JSON.stringify(CUSTOMERS_FIXTURE));
  const changes = M.reconcileNotifyChannels(customers, STAFF_FIXTURE);
  assert.deepStrictEqual(changes, []);
  assert.deepStrictEqual(customers.find(c => c.id === 'C001').notifyChannels, ['email', 'wechat']);
});

test('appendReconcileLog + getReconcileLog: FIFO 上限 20', () => {
  const storage = createStorage();
  for (let i = 0; i < 25; i++) {
    M.appendReconcileLog(storage, { merchantId: 'C' + i, kind: 'auto', reason: 'wechat-no-receiver' });
  }
  const log = M.getReconcileLog(storage);
  assert.strictEqual(log.length, 20);
  // 最新的在最前
  assert.strictEqual(log[0].merchantId, 'C24');
  assert.strictEqual(log[19].merchantId, 'C5');
});

test('clearReconcileLog: 清空', () => {
  const storage = createStorage();
  M.appendReconcileLog(storage, { merchantId: 'C001', kind: 'auto', reason: 'x' });
  M.clearReconcileLog(storage);
  assert.deepStrictEqual(M.getReconcileLog(storage), []);
});
```

- [ ] **Step 2: 跑测试，验证失败**

```bash
node tests/fault-push-channels.behavior.test.js
```

预期：4 条新增 FAIL。

- [ ] **Step 3: 实现自愈与日志**

在 `previewStaffChangeImpact` 之后插入：

```js
  function reconcileNotifyChannels(customerList, staffList) {
    const changes = [];
    (customerList || []).forEach((customer) => {
      if (!customer) return;
      const channels = normalizeChannelList(customer.notifyChannels, customer.notifyEmail);
      if (!channels.includes(CHANNEL_WECHAT)) return;
      if (getReachableWechatReceivers(customer.id, staffList).length === 0) {
        customer.notifyChannels = channels.filter(c => c !== CHANNEL_WECHAT);
        changes.push({
          merchantId: customer.id,
          merchantName: customer.name || customer.id,
          reason: 'wechat-no-receiver',
          kind: 'auto'
        });
      }
    });
    return changes;
  }

  function appendReconcileLog(storage, entry) {
    if (!storage) return;
    let arr;
    try {
      const raw = storage.getItem(RECONCILE_LOG_KEY);
      arr = raw ? JSON.parse(raw) : [];
    } catch (e) { arr = []; }
    if (!Array.isArray(arr)) arr = [];
    arr.unshift({ ...entry, at: new Date().toISOString() });
    if (arr.length > RECONCILE_LOG_MAX) arr.length = RECONCILE_LOG_MAX;
    storage.setItem(RECONCILE_LOG_KEY, JSON.stringify(arr));
  }

  function getReconcileLog(storage) {
    if (!storage) return [];
    try {
      const raw = storage.getItem(RECONCILE_LOG_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) { return []; }
  }

  function clearReconcileLog(storage) {
    if (storage) storage.removeItem(RECONCILE_LOG_KEY);
  }
```

导出列表追加 `reconcileNotifyChannels, appendReconcileLog, getReconcileLog, clearReconcileLog`。

- [ ] **Step 4: 跑测试，验证通过**

```bash
node tests/fault-push-channels.behavior.test.js
```

预期：全部 PASS（累计约 19 条用例）。

- [ ] **Step 5: Commit**

```bash
git add shared/fault-notify-channels.js tests/fault-push-channels.behavior.test.js
git commit -m "feat(fault-notify): add reconciliation and audit log helpers"
```

---

## Task 6: customers.html — 加载共享模块 + 数据归一化 + 自愈钩子

**Files:**
- Modify: `device-mgmt/customers.html`
- Create: `device-mgmt/tests/fault-push-channels.runtime.test.js`

- [ ] **Step 1: 写一个 runtime 测试，验证 customers.html 引用了共享模块**

```js
// device-mgmt/tests/fault-push-channels.runtime.test.js
const assert = require('assert');
const fs = require('fs');
const path = require('path');

function read(p) { return fs.readFileSync(path.join(__dirname, '..', p), 'utf8'); }

function test(name, fn) {
  try { fn(); console.log(`PASS ${name}`); }
  catch (e) { console.error(`FAIL ${name}`); console.error(e.stack || e.message); process.exitCode = 1; }
}

test('customers.html 引入了 fault-notify-channels.js', () => {
  const html = read('customers.html');
  assert.ok(/shared\/fault-notify-channels\.js/.test(html));
});

test('staff-management.html 引入了 fault-notify-channels.js', () => {
  const html = read('staff-management.html');
  assert.ok(/shared\/fault-notify-channels\.js/.test(html));
});

test('faults.html 引入了 fault-notify-channels.js', () => {
  const html = read('faults.html');
  assert.ok(/shared\/fault-notify-channels\.js/.test(html));
});
```

- [ ] **Step 2: 跑测试，验证三条都失败**

```bash
node tests/fault-push-channels.runtime.test.js
```

预期：3 FAIL（未引入）。

- [ ] **Step 3: 在三个 HTML 文件 `<head>` 区域、`shared/admin-staff-access.js` 引用之后，插入新的 `<script src>`**

```bash
# 三个文件分别打开，定位 admin-staff-access.js 这一行
grep -n "shared/admin-staff-access.js" customers.html staff-management.html faults.html
```

对每个文件，在该 `<script>` 行的下一行追加：

```html
<script src="shared/fault-notify-channels.js"></script>
```

- [ ] **Step 4: 跑测试，验证 3 PASS**

```bash
node tests/fault-push-channels.runtime.test.js
```

- [ ] **Step 5: customers.html 数据加载阶段调用归一化与自愈**

定位 `customersData` 的初始化位置（搜 `customersData =`），在 `customersData` 被读取后、UI 首次渲染前，插入：

```js
        // 归一化:为存量商户回填 notifyChannels 字段
        try {
            if (window.CofeFaultNotifyChannels) {
                const mod = window.CofeFaultNotifyChannels;
                let mutated = false;
                customersData.forEach((c) => {
                    const before = JSON.stringify(c.notifyChannels);
                    c.notifyChannels = mod.normalizeChannelList(c.notifyChannels, c.notifyEmail);
                    if (JSON.stringify(c.notifyChannels) !== before) mutated = true;
                });
                // 自愈:勾了 wechat 但无可达接收人 → 剥离 + 写日志
                const staffList = JSON.parse(localStorage.getItem('staffManagersData') || '[]');
                const changes = mod.reconcileNotifyChannels(customersData, staffList);
                changes.forEach((ch) => mod.appendReconcileLog(localStorage, ch));
                if (mutated || changes.length) {
                    localStorage.setItem('customersData', JSON.stringify(customersData));
                }
            }
        } catch (e) { /* 数据归一化失败不阻塞页面 */ }
```

- [ ] **Step 6: 手动验证**

打开浏览器：

```bash
python3 -m http.server 8000
```

访问 `http://127.0.0.1:8000/device-mgmt/customers.html`，打开 DevTools Console 跑：

```js
JSON.parse(localStorage.getItem('customersData')).map(c => ({ id: c.id, channels: c.notifyChannels }))
```

预期：每个商户都有 `notifyChannels` 数组，原本有邮箱的 → `['email']`，原本无邮箱的 → `[]`。

- [ ] **Step 7: Commit**

```bash
git add customers.html staff-management.html faults.html tests/fault-push-channels.runtime.test.js
git commit -m "feat(customers): load fault-notify shared module and normalize on bootstrap"
```

---

## Task 7: customers.html — 表单 UI（双复选框 + 邮箱联动 + 新建模式置灰）

**Files:**
- Modify: `device-mgmt/customers.html`
- Modify: `device-mgmt/tests/fault-push-channels.runtime.test.js`

- [ ] **Step 1: 追加 runtime 测试**

```js
test('customers.html 表单含两个推送渠道复选框', () => {
  const html = read('customers.html');
  assert.ok(/id="customerChannelEmail"/.test(html));
  assert.ok(/id="customerChannelWechat"/.test(html));
});

test('customers.html 表单含「新建模式公众号置灰」逻辑', () => {
  const html = read('customers.html');
  assert.ok(/customerChannelWechat\.disabled\s*=/.test(html) || /disabled.*customerChannelWechat/.test(html));
});
```

- [ ] **Step 2: 跑测试，验证 2 FAIL**

```bash
node tests/fault-push-channels.runtime.test.js
```

- [ ] **Step 3: 改 customers.html 表单**

定位 `<label class="form-label">故障通知邮箱</label>` 一行（参见 spec 中 `customers.html:1202`），在该 `<div>` 之**前**插入：

```html
                <div class="form-group">
                    <label class="form-label">故障推送渠道</label>
                    <div class="channel-checkbox-row" style="display:flex;gap:16px;align-items:center;">
                        <label style="display:flex;align-items:center;gap:6px;">
                            <input type="checkbox" id="customerChannelEmail"> 邮箱推送
                        </label>
                        <label style="display:flex;align-items:center;gap:6px;" id="customerChannelWechatWrap">
                            <input type="checkbox" id="customerChannelWechat"> 公众号推送
                        </label>
                    </div>
                    <div class="form-hint" id="customerChannelHint" style="font-size:12px;color:#6b7280;margin-top:6px;">
                        接收人将自动从本商户旗下「拥有故障接收权限并登记了公众号 OpenID」的员工中聚合
                    </div>
                </div>
```

- [ ] **Step 4: 给表单打开（编辑/新建）函数加联动**

定位 `function openCustomerModal` 与 `openEditCustomerModal` （参见 `customers.html:1699`/`:1721`），在两个函数体最后追加：

```js
            // 推送渠道复选框联动
            const channelEmailEl = document.getElementById('customerChannelEmail');
            const channelWechatEl = document.getElementById('customerChannelWechat');
            const emailInputEl = document.getElementById('customerNotifyEmail');
            const channels = (window.CofeFaultNotifyChannels
                ? window.CofeFaultNotifyChannels.normalizeChannelList(
                    customer ? customer.notifyChannels : undefined,
                    customer ? customer.notifyEmail : ''
                  )
                : []);
            channelEmailEl.checked = channels.includes('email');
            channelWechatEl.checked = channels.includes('wechat');

            // 邮箱输入框可用性跟随邮箱勾选
            const syncEmailEnabled = () => {
                emailInputEl.disabled = !channelEmailEl.checked;
                if (!channelEmailEl.checked) emailInputEl.classList.add('input-disabled');
                else emailInputEl.classList.remove('input-disabled');
            };
            syncEmailEnabled();
            channelEmailEl.onchange = syncEmailEnabled;

            // 新建模式或可达接收人为 0 时:置灰公众号复选框
            const customerIdForCheck = customer ? customer.id : null;
            const staffList = JSON.parse(localStorage.getItem('staffManagersData') || '[]');
            const reachable = customerIdForCheck && window.CofeFaultNotifyChannels
                ? window.CofeFaultNotifyChannels.getReachableWechatReceivers(customerIdForCheck, staffList)
                : [];
            const wechatDisabled = !customerIdForCheck || reachable.length === 0;
            channelWechatEl.disabled = wechatDisabled && !channelWechatEl.checked;
            const wechatWrap = document.getElementById('customerChannelWechatWrap');
            if (wechatDisabled) {
                wechatWrap.title = customer
                    ? '该商户暂无登记了 OpenID 的故障接收员工。请先去「人员管理」配置,再回此处勾选'
                    : '请先保存商户基础信息,再去「人员管理」为本商户添加员工后回此处勾选';
                wechatWrap.style.opacity = '0.55';
            } else {
                wechatWrap.title = '';
                wechatWrap.style.opacity = '1';
            }
```

> 上面假设 `openCustomerModal(customer)` 接受一个 `customer` 参数；如果现有代码是分两个独立函数（新建/编辑），新建函数里把 `customer` 当作 `null` 处理同样适用。

- [ ] **Step 5: 跑测试，验证 2 PASS**

```bash
node tests/fault-push-channels.runtime.test.js
```

- [ ] **Step 6: 手动验证**

开发服务器中编辑一个商户：勾掉邮箱 → 邮箱输入框置灰；旁边公众号复选框可用与否，跟该商户旗下是否有合格员工一致。

- [ ] **Step 7: Commit**

```bash
git add customers.html tests/fault-push-channels.runtime.test.js
git commit -m "feat(customers): channel checkboxes with email coupling and reach-aware wechat greyout"
```

---

## Task 8: customers.html — 保存校验 + 列表徽章

**Files:**
- Modify: `device-mgmt/customers.html`
- Modify: `device-mgmt/tests/fault-push-channels.runtime.test.js`

- [ ] **Step 1: 追加测试**

```js
test('customers.html 保存函数调用了 validateCustomerNotifyConfig', () => {
  const html = read('customers.html');
  assert.ok(/validateCustomerNotifyConfig/.test(html));
});

test('customers.html 列表渲染含双渠道徽章逻辑', () => {
  const html = read('customers.html');
  assert.ok(/邮箱推送/.test(html) && /公众号推送/.test(html));
  assert.ok(/未配置推送/.test(html));
});
```

- [ ] **Step 2: 跑测试，验证 2 FAIL**

- [ ] **Step 3: 改保存函数**

定位 `function saveCustomer`（参见 `customers.html:1739`），在原本读取 `notifyEmail` 之后、构建商户对象之前，加入：

```js
            // 读取渠道复选框
            const checkedChannels = [];
            if (document.getElementById('customerChannelEmail').checked) checkedChannels.push('email');
            if (document.getElementById('customerChannelWechat').checked) checkedChannels.push('wechat');

            // 校验
            if (window.CofeFaultNotifyChannels) {
                const staffList = JSON.parse(localStorage.getItem('staffManagersData') || '[]');
                const candidate = {
                    id: editingCustomerId || 'NEW',
                    name: effectiveName,
                    notifyEmail,
                    notifyChannels: checkedChannels
                };
                const result = window.CofeFaultNotifyChannels.validateCustomerNotifyConfig(candidate, staffList);
                if (!result.valid) {
                    const msg = result.errors.map(e => '• ' + e.message).join('\n');
                    alert('推送配置存在问题,无法保存:\n' + msg);
                    return;
                }
            }
```

构建商户对象时把 `notifyChannels: checkedChannels` 加进去（同 `notifyEmail` 同级）。

- [ ] **Step 4: 改列表渲染（资料卡 + 客户表）的徽章**

定位 `customers.html:1671` 附近的客户列表渲染处。把原本只显示邮箱的那一段：

```js
${customer.notifyEmail ? `<span>✉️ ${escapeHtml(customer.notifyEmail)}</span>` : '<span style="color:#9ca3af">✉️ 未设置故障邮箱</span>'}
```

替换为：

```js
${(() => {
    const ch = window.CofeFaultNotifyChannels
        ? window.CofeFaultNotifyChannels.normalizeChannelList(customer.notifyChannels, customer.notifyEmail)
        : (customer.notifyEmail ? ['email'] : []);
    if (ch.length === 0) return '<span style="color:#9ca3af">🔕 未配置推送</span>';
    const parts = [];
    if (ch.includes('email')) parts.push(`<span>✉️ 邮箱推送 · ${escapeHtml(customer.notifyEmail)}</span>`);
    if (ch.includes('wechat')) parts.push('<span>📱 公众号推送</span>');
    return parts.join(' ');
})()}
```

资料卡 `customers.html:1566` 那行同样替换为渠道徽章版本。

- [ ] **Step 5: 跑测试，验证 2 PASS**

- [ ] **Step 6: 手动验证**

- 编辑一个商户，仅勾「公众号」但旗下无 OpenID 员工 → 弹错误，保存被阻塞
- 仅勾「邮箱」但邮箱为空 → 弹错误
- 两个都勾且都满足 → 保存成功，列表行显示两个徽章
- 两个都不勾 → 保存成功，列表行显示「🔕 未配置推送」

- [ ] **Step 7: Commit**

```bash
git add customers.html tests/fault-push-channels.runtime.test.js
git commit -m "feat(customers): validate notify config on save and render multi-channel badges"
```

---

## Task 9: customers.html — 自愈日志面板入口

**Files:**
- Modify: `device-mgmt/customers.html`
- Modify: `device-mgmt/tests/fault-push-channels.runtime.test.js`

- [ ] **Step 1: 追加测试**

```js
test('customers.html 含自愈日志面板触发按钮', () => {
  const html = read('customers.html');
  assert.ok(/id="reconcileLogTrigger"/.test(html));
  assert.ok(/getReconcileLog/.test(html));
});
```

- [ ] **Step 2: 跑测试，验证 1 FAIL**

- [ ] **Step 3: 在客户列表页头部插入日志入口**

定位客户列表的页头工具栏（搜「客户列表」或工具栏区域）。在工具栏右侧追加：

```html
                <button type="button" id="reconcileLogTrigger" class="btn-ghost" onclick="openReconcileLogPanel()">
                    🔔 推送配置变更记录 <span id="reconcileLogBadge" style="display:none;background:#ffa502;color:#fff;border-radius:10px;padding:1px 7px;font-size:11px;margin-left:4px;">0</span>
                </button>
```

在脚本区追加：

```js
        function updateReconcileLogBadge() {
            if (!window.CofeFaultNotifyChannels) return;
            const log = window.CofeFaultNotifyChannels.getReconcileLog(localStorage);
            const badge = document.getElementById('reconcileLogBadge');
            if (!badge) return;
            badge.textContent = String(log.length);
            badge.style.display = log.length ? 'inline-block' : 'none';
        }

        function openReconcileLogPanel() {
            if (!window.CofeFaultNotifyChannels) return;
            const log = window.CofeFaultNotifyChannels.getReconcileLog(localStorage);
            if (!log.length) {
                alert('暂无自动调整记录');
                return;
            }
            const lines = log.map((e, i) => {
                const when = new Date(e.at).toLocaleString('zh-CN');
                const kind = e.kind === 'auto' ? '自动校对' : '运营确认';
                return `${i + 1}. [${when}] ${e.merchantName || e.merchantId} · ${kind} · ${e.reason}`;
            }).join('\n');
            if (confirm('最近的推送配置调整:\n\n' + lines + '\n\n点击确定清空记录,取消则保留')) {
                window.CofeFaultNotifyChannels.clearReconcileLog(localStorage);
                updateReconcileLogBadge();
            }
        }
```

在页面初始化阶段（`init()` 或 `DOMContentLoaded`）调用 `updateReconcileLogBadge()`。

- [ ] **Step 4: 跑测试，验证 1 PASS**

- [ ] **Step 5: 手动验证**

控制台跑：

```js
window.CofeFaultNotifyChannels.appendReconcileLog(localStorage, { merchantId: 'C001', merchantName: '星巴克', kind: 'auto', reason: 'wechat-no-receiver' });
location.reload();
```

预期：页头按钮显示红/橙色「1」徽章；点击弹出最近的记录列表。

- [ ] **Step 6: Commit**

```bash
git add customers.html tests/fault-push-channels.runtime.test.js
git commit -m "feat(customers): reconciliation log panel entry in toolbar"
```

---

## Task 10: staff-management.html — 数据归一化 + OpenID 字段 + 列表徽章

**Files:**
- Modify: `device-mgmt/staff-management.html`
- Modify: `device-mgmt/tests/fault-push-channels.runtime.test.js`

- [ ] **Step 1: 追加测试**

```js
test('staff-management.html 表单含公众号 OpenID 字段', () => {
  const html = read('staff-management.html');
  assert.ok(/id="staffWechatOpenId"/.test(html));
  assert.ok(/公众号 OpenID/.test(html));
});

test('staff-management.html bootstrap 用 normalizeOpenId 归一化字段', () => {
  const html = read('staff-management.html');
  assert.ok(/normalizeOpenId/.test(html));
});

test('staff-management.html 列表渲染含「已绑公众号」徽章', () => {
  const html = read('staff-management.html');
  assert.ok(/已绑公众号/.test(html));
});
```

- [ ] **Step 2: 跑测试，验证 3 FAIL**

- [ ] **Step 3: 在 `bootstrapStaffManagers` 里追加 OpenID 归一化**

定位 `staff-management.html:2598` 的 `bootstrapStaffManagers` 函数。在 `normalizedModuleDeviceScopes` 之后追加：

```js
                    const normalizedWechatOpenId = window.CofeFaultNotifyChannels
                        ? window.CofeFaultNotifyChannels.normalizeOpenId(item.wechatOpenId)
                        : String(item.wechatOpenId || '').trim();
                    if (normalizedWechatOpenId !== (item.wechatOpenId || '')) shouldPersist = true;
```

并在 `return { ...item, ... }` 对象里追加 `wechatOpenId: normalizedWechatOpenId`。

`defaultManagers` 三个对象里也加上 `wechatOpenId: ''`（让测试 fixture 稳定）。

- [ ] **Step 4: 在员工表单的「基础信息」区域加 OpenID 输入**

定位员工弹窗里 `phone` 输入所在的 form-group（搜 `id="staffPhone"`）。在该 form-group 之后追加：

```html
                <div class="form-group">
                    <label class="form-label">公众号 OpenID</label>
                    <input type="text" class="form-input" id="staffWechatOpenId" placeholder="员工本人在咖啡运营公众号下的 OpenID" maxlength="128">
                    <div class="form-hint" style="font-size:12px;color:#6b7280;margin-top:4px;">
                        ℹ️ 配置后,当所属商户开启「公众号推送」时,本人将接收授权范围内的故障消息
                    </div>
                </div>
```

- [ ] **Step 5: 在「打开员工弹窗」/「保存员工」逻辑里读写 OpenID**

定位打开员工弹窗的函数（搜 `staffPhone` 的赋值位置），在 `staffPhone.value = ...` 之后追加：

```js
            document.getElementById('staffWechatOpenId').value = staff ? (staff.wechatOpenId || '') : '';
```

定位保存员工的函数（搜 `staffPhone.value` 读取位置），在读取 `phone` 之后追加：

```js
            const wechatOpenId = window.CofeFaultNotifyChannels
                ? window.CofeFaultNotifyChannels.normalizeOpenId(document.getElementById('staffWechatOpenId').value)
                : String(document.getElementById('staffWechatOpenId').value || '').trim();
```

构建 staff 对象时把 `wechatOpenId` 一并塞进去（与 `phone` 同级）。

- [ ] **Step 6: 列表行追加徽章**

定位员工列表渲染处。在每行末尾追加：

```js
${staff.wechatOpenId ? '<span style="background:#f3f4f6;color:#374151;padding:2px 8px;border-radius:10px;font-size:11px;margin-left:6px;">📱 已绑公众号</span>' : ''}
```

- [ ] **Step 7: 跑测试，验证 3 PASS**

- [ ] **Step 8: 手动验证**

- 打开员工弹窗，能看到「公众号 OpenID」输入框
- 给某员工填一个 OpenID 保存 → 列表行末尾出现「📱 已绑公众号」徽章
- 控制台 `JSON.parse(localStorage.getItem('staffManagersData')).find(s => s.id === 'S001').wechatOpenId` 能取到值

- [ ] **Step 9: Commit**

```bash
git add staff-management.html tests/fault-push-channels.runtime.test.js
git commit -m "feat(staff): add wechat OpenID field, normalization and list badge"
```

---

## Task 11: staff-management.html — 员工变更预演与确认框

**Files:**
- Modify: `device-mgmt/staff-management.html`
- Modify: `device-mgmt/tests/fault-push-channels.runtime.test.js`

- [ ] **Step 1: 追加测试**

```js
test('staff-management.html 保存调用 previewStaffChangeImpact', () => {
  const html = read('staff-management.html');
  assert.ok(/previewStaffChangeImpact/.test(html));
});

test('staff-management.html 含确认弹窗中「自动取消公众号渠道」选项文案', () => {
  const html = read('staff-management.html');
  assert.ok(/自动取消.*公众号/.test(html));
});
```

- [ ] **Step 2: 跑测试，验证 2 FAIL**

- [ ] **Step 3: 在保存员工的函数里插入预演**

在保存函数里，构建好 `wechatOpenId / permissions / accountEnabled / merchantId` 后，调用 `validateAndCommit`。新函数：

```js
        function validateAndCommitStaffChange(beforeStaff, afterStaff /* null 表示删除 */) {
            if (!window.CofeFaultNotifyChannels) return { proceed: true };

            const customers = JSON.parse(localStorage.getItem('customersData') || '[]');
            // 构造 projected staff 列表(预演落库后的状态)
            const projected = staffManagersData.slice();
            const idx = projected.findIndex(s => String(s.id) === String((beforeStaff || afterStaff).id));
            if (afterStaff) {
                if (idx >= 0) projected[idx] = afterStaff;
                else projected.push(afterStaff);
            } else if (idx >= 0) {
                projected.splice(idx, 1);
            }

            const impact = window.CofeFaultNotifyChannels.previewStaffChangeImpact(
                beforeStaff, afterStaff, customers, projected
            );
            if (impact.length === 0) return { proceed: true };

            const names = impact.map(i => i.merchantName).join('、');
            const choice = window.prompt(
                `此变更将使商户「${names}」的公众号推送失去全部可达接收人。请选择处理方式:\n\n` +
                `1 = 保留员工变更,并自动取消该商户的「公众号推送」(推荐)\n` +
                `2 = 暂不保存,先去人员管理给该商户补一位 OpenID 接收人\n` +
                `3 = 取消本次操作\n\n` +
                `请输入 1 / 2 / 3:`,
                '1'
            );

            if (choice === '1') {
                // 落库时,把受影响商户的 wechat 渠道剥离 + 写日志
                impact.forEach((it) => {
                    const customer = customers.find(c => String(c.id) === String(it.merchantId));
                    if (!customer) return;
                    const ch = window.CofeFaultNotifyChannels.normalizeChannelList(customer.notifyChannels, customer.notifyEmail);
                    customer.notifyChannels = ch.filter(c => c !== 'wechat');
                    window.CofeFaultNotifyChannels.appendReconcileLog(localStorage, {
                        merchantId: customer.id,
                        merchantName: customer.name,
                        kind: 'manual',
                        reason: 'staff-change-cascade'
                    });
                });
                localStorage.setItem('customersData', JSON.stringify(customers));
                return { proceed: true };
            } else if (choice === '2') {
                location.href = 'staff-management.html'; // 已在该页,留待用户操作
                return { proceed: false };
            } else {
                return { proceed: false };
            }
        }
```

在保存员工的函数里、构建好新 staff 对象 `next` 之后、写入 `staffManagersData` 之前：

```js
            const before = editingStaffId ? staffManagersData.find(s => String(s.id) === String(editingStaffId)) : null;
            const gate = validateAndCommitStaffChange(before ? { ...before } : null, next);
            if (!gate.proceed) return;
```

如果有「删除员工」入口，同样调用 `validateAndCommitStaffChange(beforeStaff, null)`。

- [ ] **Step 4: 跑测试，验证 2 PASS**

- [ ] **Step 5: 手动验证**

- 给商户 C001 留下唯一一位有 OpenID 的故障员工
- 把 C001 的公众号推送渠道勾上保存
- 回到员工管理，清空那位员工的 OpenID 保存 → 弹出确认框，输入 1 后保存成功，回到 customers.html 看 C001 的 `notifyChannels` 已不含 `wechat`，且列表页头有「1」条变更记录

- [ ] **Step 6: Commit**

```bash
git add staff-management.html tests/fault-push-channels.runtime.test.js
git commit -m "feat(staff): predict and confirm cascade when staff change breaks wechat reach"
```

---

## Task 12: faults.html — 徽章重构 + 自愈钩子

**Files:**
- Modify: `device-mgmt/faults.html`
- Modify: `device-mgmt/tests/fault-push-channels.runtime.test.js`

- [ ] **Step 1: 追加测试**

```js
test('faults.html 渠道徽章渲染含所有四种状态文案', () => {
  const html = read('faults.html');
  assert.ok(/邮箱推送/.test(html));
  assert.ok(/公众号推送/.test(html));
  assert.ok(/未配置推送/.test(html));
});

test('faults.html 初始化阶段调用 reconcileNotifyChannels', () => {
  const html = read('faults.html');
  assert.ok(/reconcileNotifyChannels/.test(html));
});
```

- [ ] **Step 2: 跑测试，验证 2 FAIL**

- [ ] **Step 3: 重构 `getFaultNotifyEmailForDevice` 与 `renderFaultNotifyEmail`**

定位 `faults.html:2410-2436`。把整段两个函数替换为：

```js
        // 解析设备所属商户的推送渠道
        // 链路: fault.id → devicesData[device.id === fault.id].merchant ('mer001')
        //       → customerId ('C001') → customersData[c.id === customerId].notifyChannels
        function getFaultNotifyConfigForDevice(deviceId) {
            try {
                const devices = JSON.parse(localStorage.getItem('devicesData') || '[]');
                const device = devices.find(d => String(d?.id || '').trim() === String(deviceId || '').trim());
                if (!device) return { channels: [], email: '' };
                const merchantKey = String(device.merchant || '').trim().toLowerCase();
                const matched = merchantKey.match(/^mer(\d+)$/i);
                if (!matched) return { channels: [], email: '' };
                const customerId = 'C' + String(matched[1]).padStart(3, '0');
                const customers = JSON.parse(localStorage.getItem('customersData') || '[]');
                const customer = customers.find(c => String(c?.id || '').trim() === customerId);
                if (!customer) return { channels: [], email: '' };
                const channels = window.CofeFaultNotifyChannels
                    ? window.CofeFaultNotifyChannels.normalizeChannelList(customer.notifyChannels, customer.notifyEmail)
                    : (customer.notifyEmail ? ['email'] : []);
                return { channels, email: String(customer.notifyEmail || '').trim() };
            } catch (e) {
                return { channels: [], email: '' };
            }
        }

        function renderFaultNotifyBadges(item) {
            const cfg = getFaultNotifyConfigForDevice(item.id);
            if (cfg.channels.length === 0) {
                return '<span class="fault-notify-email fault-notify-email-empty" title="该设备所属商户未配置故障推送渠道">🔕 未配置推送</span>';
            }
            const parts = [];
            if (cfg.channels.includes('email')) {
                parts.push(`<span class="fault-notify-email" title="邮箱推送至 ${escapeText(cfg.email)}">✉️ 邮箱推送</span>`);
            }
            if (cfg.channels.includes('wechat')) {
                parts.push('<span class="fault-notify-email" title="公众号推送给该商户下故障接收员工">📱 公众号推送</span>');
            }
            return parts.join(' ');
        }
```

定位 `renderList` 里 `${renderFaultNotifyEmail(item)}` 调用，替换为 `${renderFaultNotifyBadges(item)}`。

- [ ] **Step 4: 在 faults.html 的初始化阶段加自愈钩子**

定位 `faults.html` 中 `currentStaffFaultAccess` 初始化或页面 `init()` 函数。在数据加载之后、首次渲染之前插入：

```js
        try {
            if (window.CofeFaultNotifyChannels) {
                const customers = JSON.parse(localStorage.getItem('customersData') || '[]');
                const staff = JSON.parse(localStorage.getItem('staffManagersData') || '[]');
                const changes = window.CofeFaultNotifyChannels.reconcileNotifyChannels(customers, staff);
                if (changes.length) {
                    changes.forEach(ch => window.CofeFaultNotifyChannels.appendReconcileLog(localStorage, ch));
                    localStorage.setItem('customersData', JSON.stringify(customers));
                }
            }
        } catch (e) { /* 自愈失败不阻塞页面 */ }
```

- [ ] **Step 5: 跑测试，验证 2 PASS**

- [ ] **Step 6: 跑全套测试**

```bash
node --test tests/*.test.js
```

预期：现有测试与新增测试全部通过。

- [ ] **Step 7: 手动验证**

- 商户 C001 设置 `['email']` → 设备故障行显示「✉️ 邮箱推送」
- 商户 C001 设置 `['email', 'wechat']` → 显示两个徽章
- 商户 C001 设置 `[]` → 显示「🔕 未配置推送」
- 控制台手动篡改 `customersData` 让某商户勾 wechat 但实际无接收人 → 刷新 faults.html 后，自动剥离 + 日志 +1

- [ ] **Step 8: Commit**

```bash
git add faults.html tests/fault-push-channels.runtime.test.js
git commit -m "feat(faults): render multi-channel badges and reconcile on load"
```

---

## Task 13: 全流程冒烟 + spec 覆盖核对

**Files:**
- 无代码改动

- [ ] **Step 1: 跑全套测试**

```bash
node --test tests/*.test.js
```

预期：所有用例 PASS。

- [ ] **Step 2: 浏览器端端到端 walkthrough**

```bash
python3 -m http.server 8000
```

按以下顺序操作并对照预期：

| # | 操作 | 预期 |
|---|---|---|
| 1 | 在干净 localStorage 下打开 customers.html | 三个默认商户自动归一化 `notifyChannels`；C001/C002/C004 → `['email']`，C003 → `[]` |
| 2 | 给 C003 编辑表单，仅勾「公众号」 | 公众号复选框置灰，tooltip 显示「该商户暂无登记了 OpenID 的故障接收员工…」 |
| 3 | 去 staff-management.html，给 S001 填一个 OpenID 保存 | 列表行末尾出现「📱 已绑公众号」 |
| 4 | 回 customers.html 编辑 C001，勾「公众号」保存 | 保存成功，列表行出现「✉️ 邮箱推送」「📱 公众号推送」两个徽章 |
| 5 | 去 faults.html 看 C001 旗下设备的故障 | 行右下角同时显示两个推送徽章 |
| 6 | 回 staff-management.html 把 S001 的 OpenID 清空保存 | 弹出确认框，输入 1 后保存成功 |
| 7 | 回 customers.html | C001 行只剩「✉️ 邮箱推送」；页头铃铛按钮显示「1」，点开看到一条「自动取消」记录 |
| 8 | 控制台手动改坏：`const d = JSON.parse(localStorage.getItem('customersData')); d[0].notifyChannels.push('wechat'); localStorage.setItem('customersData', JSON.stringify(d));` 再刷新 customers.html | 渠道被自愈剥离，铃铛 +1 |

- [ ] **Step 3: 核对 spec 覆盖**

逐节对照 `docs/superpowers/specs/2026-06-03-fault-push-channels-design.md`：

| Spec 节 | 对应 Task |
|---|---|
| §1 数据模型 | Task 6（customers）+ Task 10（staff）|
| §2 商户管理 UI | Task 7、Task 8 |
| §3 人员管理 UI | Task 10 |
| §4 故障列表 | Task 12 |
| §5.1 配置时把关 | Task 8 |
| §5.2 员工反向保护 | Task 11 |
| §5.3 自动校对 | Task 6（customers）、Task 12（faults） |
| §5.4 故障行呈现 | Task 12 |
| §6 自愈与日志 | Task 5（共享模块）+ Task 9（面板入口） |
| 测试节 T-1 ~ T-7 | 已分别在 Task 2 ~ Task 12 中覆盖 |

- [ ] **Step 4: 合并准备**

```bash
git log --oneline feat/fault-push-channels ^main
```

预期：约 12 个 commit，commit message 全部以 `feat(...)` 开头且与 task 对应。

- [ ] **Step 5: 推上去开 PR**

```bash
git push -u origin feat/fault-push-channels
gh pr create --title "feat: fault push channels (email + wechat)" --body "$(cat <<'EOF'
## Summary
- 商户支持「邮箱推送」「公众号推送」并行渠道
- 员工新增「公众号 OpenID」字段
- 配置时把关 + 员工变更时预演确认 + 打开页面时自愈三层保护

## Spec & Plan
- Spec: device-mgmt/docs/superpowers/specs/2026-06-03-fault-push-channels-design.md
- Plan: device-mgmt/docs/superpowers/plans/2026-06-03-fault-push-channels-implementation-plan.md

## Test plan
- [x] node --test tests/*.test.js 全套通过
- [x] customers / staff / faults 三个页面 walkthrough 通过
- [x] 自愈链路验证(手动改坏 customersData → 刷新 → 自动剥离 + 日志)
EOF
)"
```

---

## Self-Review 备忘

- 共享模块的所有函数都有专属测试（normalize ×4, validate ×4, preview ×5, reconcile ×2, log ×2）。
- 三个 HTML 页面的引用、表单字段、列表徽章、保存校验、确认弹窗都有 runtime 静态检查测试兜底。
- Spec 列出的 D-1 ~ D-5 五种破坏路径都进 `previewStaffChangeImpact`：清空 OpenID（D-1，test 覆盖）、停用账号（D-2）、移除权限（D-3）、转商户（D-4）、删除（D-5）。其中 D-2/D-3/D-5 没单独 test，但走同一个函数路径；如评审要求严格，可在 Task 4 末尾再加两条用例。
- 「设备范围」按 spec 名词约定不进入可达性判定，本期不实现「按设备过滤接收人」的实际推送逻辑，仅 UI 层完整。
- 所有 commit 都是「先测后码」，每个 task 5 步对齐 TDD 节奏。
