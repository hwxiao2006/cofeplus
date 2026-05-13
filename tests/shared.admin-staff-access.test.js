const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

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

function createStorage(seed = {}) {
  const store = { ...seed };
  return {
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
    },
    setItem(key, value) {
      store[key] = String(value);
    },
    removeItem(key) {
      delete store[key];
    },
    _snapshot() { return { ...store }; }
  };
}

function loadSandbox(seed = {}) {
  const scriptPath = path.join(__dirname, '..', 'shared', 'admin-staff-access.js');
  const script = fs.readFileSync(scriptPath, 'utf8');
  const sandbox = {
    console,
    localStorage: createStorage(seed),
    window: {},
    document: {
      querySelectorAll() { return []; }
    }
  };
  sandbox.window.localStorage = sandbox.localStorage;
  sandbox.window.document = sandbox.document;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(script, sandbox);
  // IIFE attaches to window; expose as top-level convenience
  sandbox.CofeAdminStaffAccess = sandbox.window.CofeAdminStaffAccess;
  return sandbox;
}

// ---- detectRole ----
test('detectRole: username "superadmin" should be super_admin', () => {
  const sb = loadSandbox();
  const role = sb.CofeAdminStaffAccess.detectRole({ username: 'superadmin' });
  assert.strictEqual(role, 'super_admin');
});

test('detectRole: account "ops" (case-insensitive) should be super_admin', () => {
  const sb = loadSandbox();
  const role = sb.CofeAdminStaffAccess.detectRole({ account: 'OPS' });
  assert.strictEqual(role, 'super_admin');
});

test('detectRole: normal phone number should be merchant', () => {
  const sb = loadSandbox();
  const role = sb.CofeAdminStaffAccess.detectRole({ username: '13800138001' });
  assert.strictEqual(role, 'merchant');
});

test('detectRole: no profile should be merchant', () => {
  const sb = loadSandbox();
  const role = sb.CofeAdminStaffAccess.detectRole(null);
  assert.strictEqual(role, 'merchant');
});

// ---- isSuperAdmin ----
test('isSuperAdmin: profile.role==="super_admin" returns true', () => {
  const sb = loadSandbox({
    sidebarLoginProfile: JSON.stringify({ role: 'super_admin', merchantId: '' })
  });
  assert.strictEqual(sb.CofeAdminStaffAccess.isSuperAdmin(), true);
});

test('isSuperAdmin: profile.role==="merchant" returns false', () => {
  const sb = loadSandbox({
    sidebarLoginProfile: JSON.stringify({ role: 'merchant', merchantId: 'C001' })
  });
  assert.strictEqual(sb.CofeAdminStaffAccess.isSuperAdmin(), false);
});

test('isSuperAdmin: no profile returns false (backward compat)', () => {
  const sb = loadSandbox();
  assert.strictEqual(sb.CofeAdminStaffAccess.isSuperAdmin(), false);
});

// ---- getMerchantScope ----
test('getMerchantScope: super_admin returns null (no scope)', () => {
  const sb = loadSandbox({
    sidebarLoginProfile: JSON.stringify({ role: 'super_admin' })
  });
  assert.strictEqual(sb.CofeAdminStaffAccess.getMerchantScope(), null);
});

test('getMerchantScope: merchant with merchantId returns the id', () => {
  const sb = loadSandbox({
    sidebarLoginProfile: JSON.stringify({ role: 'merchant', merchantId: 'C001' })
  });
  assert.strictEqual(sb.CofeAdminStaffAccess.getMerchantScope(), 'C001');
});

test('getMerchantScope: merchant without merchantId returns null', () => {
  const sb = loadSandbox({
    sidebarLoginProfile: JSON.stringify({ role: 'merchant' })
  });
  assert.strictEqual(sb.CofeAdminStaffAccess.getMerchantScope(), null);
});

test('getMerchantScope: no role field falls back to non-admin (merchantId if any)', () => {
  const sb = loadSandbox({
    sidebarLoginProfile: JSON.stringify({ merchantId: 'C002' })
  });
  assert.strictEqual(sb.CofeAdminStaffAccess.getMerchantScope(), 'C002');
});

// ---- syncMerchantNameAcrossStorage ----
test('syncMerchantNameAcrossStorage updates locationsData customerName for matching merchant', () => {
  const sb = loadSandbox({
    locationsData: JSON.stringify([
      { id: 'L001', customerId: 'C001', customerName: '星巴克' },
      { id: 'L002', customerId: 'C002', customerName: '瑞幸' },
      { id: 'L003', customerId: 'C001', customerName: '星巴克' }
    ])
  });
  sb.CofeAdminStaffAccess.syncMerchantNameAcrossStorage('C001', '星巴克咖啡');
  const updated = JSON.parse(sb.localStorage.getItem('locationsData'));
  assert.strictEqual(updated[0].customerName, '星巴克咖啡');
  assert.strictEqual(updated[1].customerName, '瑞幸'); // untouched
  assert.strictEqual(updated[2].customerName, '星巴克咖啡');
});

test('syncMerchantNameAcrossStorage updates staffManagersData merchantName', () => {
  const sb = loadSandbox({
    staffManagersData: JSON.stringify([
      { id: 'S001', merchantId: 'C001', merchantName: '星巴克' },
      { id: 'S002', merchantId: 'C002', merchantName: '瑞幸' }
    ])
  });
  sb.CofeAdminStaffAccess.syncMerchantNameAcrossStorage('C001', '星巴克咖啡');
  const updated = JSON.parse(sb.localStorage.getItem('staffManagersData'));
  assert.strictEqual(updated[0].merchantName, '星巴克咖啡');
  assert.strictEqual(updated[1].merchantName, '瑞幸');
});

test('syncMerchantNameAcrossStorage updates current sidebarLoginProfile merchantName', () => {
  const sb = loadSandbox({
    sidebarLoginProfile: JSON.stringify({ merchantId: 'C001', merchantName: '星巴克', role: 'merchant' })
  });
  sb.CofeAdminStaffAccess.syncMerchantNameAcrossStorage('C001', '星巴克咖啡');
  const updated = JSON.parse(sb.localStorage.getItem('sidebarLoginProfile'));
  assert.strictEqual(updated.merchantName, '星巴克咖啡');
});

test('syncMerchantNameAcrossStorage skips when merchantId or newName empty', () => {
  const sb = loadSandbox({
    locationsData: JSON.stringify([{ id: 'L001', customerId: 'C001', customerName: '原名' }])
  });
  sb.CofeAdminStaffAccess.syncMerchantNameAcrossStorage('', '新名');
  sb.CofeAdminStaffAccess.syncMerchantNameAcrossStorage('C001', '');
  const updated = JSON.parse(sb.localStorage.getItem('locationsData'));
  assert.strictEqual(updated[0].customerName, '原名');
});

test('syncMerchantNameAcrossStorage tolerates malformed storage', () => {
  const sb = loadSandbox({
    locationsData: 'not valid json',
    staffManagersData: '{}',
    sidebarLoginProfile: 'also broken'
  });
  // Should not throw
  sb.CofeAdminStaffAccess.syncMerchantNameAcrossStorage('C001', '新名');
});

// ---- applyNavLabelsByRole ----
test('applyNavLabelsByRole sets label to 商户管理 for super_admin', () => {
  const sb = loadSandbox({
    sidebarLoginProfile: JSON.stringify({ role: 'super_admin' })
  });
  const label1 = { textContent: '原' };
  const label2 = { textContent: '原' };
  sb.document.querySelectorAll = (sel) => {
    if (sel === '[data-nav="customers"] .nav-label') return [label1, label2];
    return [];
  };
  sb.CofeAdminStaffAccess.applyNavLabelsByRole();
  assert.strictEqual(label1.textContent, '商户管理');
  assert.strictEqual(label2.textContent, '商户管理');
});

test('applyNavLabelsByRole sets label to 我的商户 for merchant', () => {
  const sb = loadSandbox({
    sidebarLoginProfile: JSON.stringify({ role: 'merchant', merchantId: 'C001' })
  });
  const label = { textContent: '原' };
  sb.document.querySelectorAll = (sel) => {
    if (sel === '[data-nav="customers"] .nav-label') return [label];
    return [];
  };
  sb.CofeAdminStaffAccess.applyNavLabelsByRole();
  assert.strictEqual(label.textContent, '我的商户');
});
