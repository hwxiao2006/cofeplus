const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'locations.html'), 'utf8');

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

// ---- 静态断言 ----

test('点位管理：经纬度字段应标记为必填', () => {
  const longBlock = html.match(/经度[\s\S]{0,120}id="locationLongitude"/);
  const latBlock = html.match(/纬度[\s\S]{0,120}id="locationLatitude"/);
  assert.ok(longBlock && /required/.test(longBlock[0]), '经度 label 应含必填星标');
  assert.ok(latBlock && /required/.test(latBlock[0]), '纬度 label 应含必填星标');
  assert.ok(!/经度（可选）/.test(html), '不应再出现「经度（可选）」');
  assert.ok(!/纬度（可选）/.test(html), '不应再出现「纬度（可选）」');
});

test('点位管理：保存点位应校验经纬度必填', () => {
  assert.ok(/if\s*\(!longitude\s*\|\|\s*!latitude\)/.test(html), 'saveLocation 应校验经纬度');
});

test('点位管理：应提供按编码统计绑定设备数的函数', () => {
  assert.ok(/function\s+countDevicesBoundToLocation\s*\(/.test(html));
});

test('点位管理：删除点位应在有绑定设备时拦截', () => {
  const start = html.indexOf('function deleteLocation(');
  const end = html.indexOf('\n        function ', start + 30);
  const fn = html.slice(start, end > 0 ? end : start + 1200);
  assert.ok(/countDevicesBoundToLocation\(/.test(fn), 'deleteLocation 应统计绑定设备');
  assert.ok(/boundCount\s*>\s*0/.test(fn), '应有 boundCount > 0 拦截分支');
  assert.ok(/return;/.test(fn), '拦截分支应提前 return，不执行删除');
});

// ---- 运行时行为断言（VM 执行核心函数）----

function buildSandbox(locationsData, devicesData) {
  const store = {
    locationsData: JSON.stringify(locationsData),
    devicesData: JSON.stringify(devicesData || []),
    customersData: '[]'
  };
  const toasts = [];
  const confirmCalls = [];
  const sandbox = {
    localStorage: {
      getItem: (k) => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = v; },
      removeItem: (k) => { delete store[k]; }
    },
    console,
    __store: store,
    __toasts: toasts,
    __confirmReturn: true,
    confirm: (msg) => { confirmCalls.push(msg); return sandbox.__confirmReturn; },
    showToast: (msg, type) => toasts.push({ msg, type: type || 'success' }),
    renderLocations: () => {},
    updateStats: () => {},
    __confirmCalls: confirmCalls
  };
  return sandbox;
}

// 抽取需要的函数体，避免执行整页 DOM 逻辑
function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  if (start < 0) throw new Error(`未找到函数 ${name}`);
  // 从函数起点向后配平大括号
  let i = source.indexOf('{', start);
  let depth = 0;
  for (let j = i; j < source.length; j++) {
    if (source[j] === '{') depth++;
    else if (source[j] === '}') {
      depth--;
      if (depth === 0) return source.slice(start, j + 1);
    }
  }
  throw new Error(`函数 ${name} 括号未配平`);
}

const countFnSrc = extractFunction(html, 'countDevicesBoundToLocation');
const deleteFnSrc = extractFunction(html, 'deleteLocation');
const saveToStorageSrc = extractFunction(html, 'saveToStorage');

test('运行时：绑定了设备的点位删除被拦截且数据不变', () => {
  const locations = [
    { id: 'L001', code: 'k8298', name: '上海市中心店' },
    { id: 'L002', code: 'k8667', name: '北京朝阳门店' }
  ];
  const devices = [{ id: 'RCK386', location: 'k8298' }];
  const sandbox = buildSandbox(locations, devices);
  sandbox.locationsData = locations.slice();
  vm.createContext(sandbox);
  vm.runInContext(`${saveToStorageSrc}\n${countFnSrc}\n${deleteFnSrc}`, sandbox);

  vm.runInContext(`deleteLocation('L001')`, sandbox);

  assert.strictEqual(sandbox.locationsData.length, 2, 'L001 不应被删除');
  assert.strictEqual(sandbox.__confirmCalls.length, 0, '被绑定时不应弹出确认框');
  const errToast = sandbox.__toasts.find(t => t.type === 'error');
  assert.ok(errToast && /绑定/.test(errToast.msg), '应提示已绑定设备');
});

test('运行时：无设备绑定的点位可正常删除', () => {
  const locations = [
    { id: 'L001', code: 'k8298', name: '上海市中心店' },
    { id: 'L009', code: 'k9999', name: '空置点位' }
  ];
  const devices = [{ id: 'RCK386', location: 'k8298' }];
  const sandbox = buildSandbox(locations, devices);
  sandbox.locationsData = locations.slice();
  sandbox.__confirmReturn = true;
  vm.createContext(sandbox);
  vm.runInContext(`${saveToStorageSrc}\n${countFnSrc}\n${deleteFnSrc}`, sandbox);

  vm.runInContext(`deleteLocation('L009')`, sandbox);

  assert.strictEqual(sandbox.locationsData.length, 1, 'L009 应被删除');
  assert.ok(!sandbox.locationsData.find(l => l.id === 'L009'), 'L009 应已移除');
  const okToast = sandbox.__toasts.find(t => /已删除/.test(t.msg));
  assert.ok(okToast, '应提示删除成功');
});

test('运行时：countDevicesBoundToLocation 按编码不区分大小写统计', () => {
  const sandbox = buildSandbox([], [
    { id: 'A', location: 'k8298' },
    { id: 'B', location: 'K8298' },
    { id: 'C', location: 'k8667' },
    { id: 'D', location: '' }
  ]);
  vm.createContext(sandbox);
  vm.runInContext(countFnSrc, sandbox);
  assert.strictEqual(vm.runInContext(`countDevicesBoundToLocation('k8298')`, sandbox), 2);
  assert.strictEqual(vm.runInContext(`countDevicesBoundToLocation('k8667')`, sandbox), 1);
  assert.strictEqual(vm.runInContext(`countDevicesBoundToLocation('k0000')`, sandbox), 0);
});

test('点位管理：默认 mock 数据应带经纬度', () => {
  const block = html.match(/const\s+defaultLocations\s*=\s*\[([\s\S]*?)\];/);
  assert.ok(block, '未找到 defaultLocations');
  const longs = (block[1].match(/longitude:\s*'[\d.]+'/g) || []).length;
  const lats = (block[1].match(/latitude:\s*'[\d.]+'/g) || []).length;
  assert.ok(longs >= 5, `默认点位应都带经度，实际 ${longs}`);
  assert.ok(lats >= 5, `默认点位应都带纬度，实际 ${lats}`);
});
