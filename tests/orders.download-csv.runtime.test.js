const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'orders.html'), 'utf8');

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
  const braceStart = source.indexOf('{', start);
  let depth = 0;
  for (let index = braceStart; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1;
    if (source[index] === '}') depth -= 1;
    if (depth === 0) {
      return source.slice(start, index + 1);
    }
  }
  throw new Error(`函数 ${functionName} 解析失败`);
}

const csvFunctionsSource = [
  extractFunctionSource(html, 'escapeCsvField'),
  extractFunctionSource(html, 'buildOrdersCsv'),
  extractFunctionSource(html, 'downloadFilteredOrders')
].join('\n');

function createCsvSandbox({ filteredData = [] } = {}) {
  const toastCalls = [];
  const createdLinks = [];
  const blobInstances = [];
  const revokedUrls = [];

  class FakeBlob {
    constructor(parts, options) {
      this.parts = parts;
      this.options = options;
      blobInstances.push(this);
    }
  }

  const sandbox = {
    console,
    statusMap: { done: '已完成', pending: '处理中', cancelled: '已取消' },
    deviceContextMap: {
      RCK386: { merchant: 'mer001', location: 'A区,一号楼' },
      DEV002: { merchant: 'mer001', location: '科技园' }
    },
    normalizeOrderItems(order) {
      if (Array.isArray(order?.orderItems) && order.orderItems.length) {
        return order.orderItems;
      }
      return [{ name: String(order?.product || '-'), specs: String(order?.specs || ''), quantity: 1 }];
    },
    getOrderPickupCodeDisplay(order) {
      const pickupCode = String(order?.pickupCode ?? '').trim();
      if (order?.status !== 'done' || !pickupCode) {
        return '--';
      }
      return pickupCode;
    },
    getOrderCurrency(order) {
      return order?.currency || 'CNY';
    },
    formatMoneyByCurrency(amount, currency) {
      const safeAmount = Number.isFinite(Number(amount)) ? Number(amount) : 0;
      return `${currency} ${safeAmount.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })}`;
    },
    showToast(message, type = 'success') {
      toastCalls.push({ message, type });
    },
    filteredData,
    Blob: FakeBlob,
    URL: {
      createObjectURL() { return 'blob:fake-url'; },
      revokeObjectURL(url) { revokedUrls.push(url); }
    },
    document: {
      createElement(tag) {
        const link = { tag, href: '', download: '', clicked: false, click() { this.clicked = true; } };
        createdLinks.push(link);
        return link;
      },
      body: {
        appendChild() {},
        removeChild() {}
      }
    }
  };
  sandbox.__toastCalls = toastCalls;
  sandbox.__createdLinks = createdLinks;
  sandbox.__blobInstances = blobInstances;
  sandbox.__revokedUrls = revokedUrls;
  vm.createContext(sandbox);
  vm.runInContext(csvFunctionsSource, sandbox);
  return sandbox;
}

const multiItemOrder = {
  id: 'ORD-A',
  deviceId: 'RCK386',
  createTime: '2026年7月8日 10:00',
  orderItems: [
    { name: '拿铁', specs: '大杯', quantity: 2 },
    { name: '美式', specs: '', quantity: 1 }
  ],
  status: 'done',
  pickupCode: '1234',
  amount: '1234.00',
  currency: 'CNY'
};

const quotedNameOrder = {
  id: 'ORD-B',
  deviceId: 'DEV002',
  createTime: '2026年7月8日 11:00',
  orderItems: [{ name: '超"浓"咖啡', specs: '', quantity: 1 }],
  status: 'pending',
  pickupCode: '',
  amount: '12.5',
  currency: 'CNY'
};

test('escapeCsvField 应遵循标准 CSV 转义规则', () => {
  const sandbox = createCsvSandbox();
  assert.strictEqual(sandbox.escapeCsvField('拿铁'), '拿铁');
  assert.strictEqual(sandbox.escapeCsvField('A区,一号楼'), '"A区,一号楼"');
  assert.strictEqual(sandbox.escapeCsvField('a"b'), '"a""b"');
  assert.strictEqual(sandbox.escapeCsvField('第一行\n第二行'), '"第一行\n第二行"');
  assert.strictEqual(sandbox.escapeCsvField(null), '');
  assert.strictEqual(sandbox.escapeCsvField(undefined), '');
});

test('buildOrdersCsv 应输出表格同款表头并以 CRLF 连接', () => {
  const sandbox = createCsvSandbox();
  const csv = sandbox.buildOrdersCsv([multiItemOrder, quotedNameOrder]);
  const lines = csv.split('\r\n');
  assert.strictEqual(lines.length, 3);
  assert.strictEqual(lines[0], '点位,商品,时间,设备,取货码,订单号,状态,金额');
});

test('多商品订单应序列化为 名称(规格) ×数量 并以中文分号连接', () => {
  const sandbox = createCsvSandbox();
  const csv = sandbox.buildOrdersCsv([multiItemOrder]);
  const row = csv.split('\r\n')[1];
  assert.ok(row.includes('拿铁(大杯) ×2；美式 ×1'));
});

test('含逗号的点位与千分位金额必须加引号，避免列错位', () => {
  const sandbox = createCsvSandbox();
  const csv = sandbox.buildOrdersCsv([multiItemOrder]);
  const row = csv.split('\r\n')[1];
  assert.ok(row.startsWith('"A区,一号楼",'));
  assert.ok(row.endsWith('"CNY 1,234.00"'));
});

test('商品名含引号应翻倍转义，处理中订单取货码回退 --', () => {
  const sandbox = createCsvSandbox();
  const csv = sandbox.buildOrdersCsv([quotedNameOrder]);
  const row = csv.split('\r\n')[1];
  assert.ok(row.includes('"超""浓""咖啡 ×1"'));
  const fields = row.split(',');
  assert.strictEqual(fields[fields.length - 4], '--');
  assert.strictEqual(fields[fields.length - 2], '处理中');
});

test('筛选结果为空时应提示错误且不创建下载链接', () => {
  const sandbox = createCsvSandbox({ filteredData: [] });
  sandbox.downloadFilteredOrders();
  assert.strictEqual(sandbox.__toastCalls.length, 1);
  assert.strictEqual(sandbox.__toastCalls[0].message, '当前筛选条件下暂无订单可下载');
  assert.strictEqual(sandbox.__toastCalls[0].type, 'error');
  assert.strictEqual(sandbox.__createdLinks.length, 0);
  assert.strictEqual(sandbox.__blobInstances.length, 0);
});

test('下载成功路径应生成带 BOM 的 CSV blob 并触发点击与资源回收', () => {
  const sandbox = createCsvSandbox({ filteredData: [multiItemOrder] });
  sandbox.downloadFilteredOrders();
  assert.strictEqual(sandbox.__blobInstances.length, 1);
  const blob = sandbox.__blobInstances[0];
  assert.ok(blob.parts[0].startsWith('\ufeff'));
  assert.strictEqual(blob.options.type, 'text/csv;charset=utf-8');
  assert.strictEqual(sandbox.__createdLinks.length, 1);
  const link = sandbox.__createdLinks[0];
  assert.match(link.download, /^orders-export-\d{4}-\d{2}-\d{2}\.csv$/);
  assert.strictEqual(link.clicked, true);
  assert.deepStrictEqual(sandbox.__revokedUrls, ['blob:fake-url']);
  assert.strictEqual(sandbox.__toastCalls.length, 1);
  assert.strictEqual(sandbox.__toastCalls[0].message, '已导出 1 条订单');
  assert.strictEqual(sandbox.__toastCalls[0].type, 'success');
});
