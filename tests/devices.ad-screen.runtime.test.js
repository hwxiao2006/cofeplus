const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const devicesPath = path.join(__dirname, '..', 'devices.html');
const devicesHtml = fs.readFileSync(devicesPath, 'utf8');

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

function extractFunctionSource(html, functionName) {
  const signature = `function ${functionName}(`;
  const start = html.indexOf(signature);
  if (start === -1) {
    throw new Error(`未找到函数 ${functionName}`);
  }
  let paramsDepth = 0;
  let bodyStart = -1;
  for (let i = start; i < html.length; i += 1) {
    const char = html[i];
    if (char === '(') paramsDepth += 1;
    if (char === ')') {
      paramsDepth -= 1;
      continue;
    }
    if (char === '{' && paramsDepth === 0) {
      bodyStart = i;
      break;
    }
  }
  const braceStart = bodyStart;
  if (braceStart === -1) {
    throw new Error(`函数 ${functionName} 缺少函数体`);
  }
  let depth = 0;
  for (let i = braceStart; i < html.length; i += 1) {
    const char = html[i];
    if (char === '{') depth += 1;
    if (char === '}') depth -= 1;
    if (depth === 0) {
      return html.slice(start, i + 1);
    }
  }
  throw new Error(`函数 ${functionName} 解析失败`);
}

function buildSandbox() {
  const elements = {};
  const storage = {};

  function getElement(id) {
    if (!elements[id]) {
      elements[id] = {
        id,
        value: '',
        checked: false,
        innerHTML: '',
        textContent: '',
        classList: {
          add() {},
          remove() {},
          contains() { return false; }
        }
      };
    }
    return elements[id];
  }

  const sandbox = {
    console,
    Date,
    Math,
    currentDetailDeviceId: '',
    devicesData: [],
    SIDEBAR_LOGIN_PROFILE_KEY: 'sidebarLoginProfile',
    LOGIN_SESSION_KEY: 'cofeLoginSession',
    entryEditImageDraft: {
      adScreen: {
        leftMenu: null,
        rightQueueBackground: null
      },
      location: []
    },
    document: {
      getElementById: getElement
    },
    localStorage: {
      getItem(key) {
        return Object.prototype.hasOwnProperty.call(storage, key) ? storage[key] : null;
      },
      setItem(key, value) {
        storage[key] = String(value);
      }
    },
    buildLocationMap() {
      return {};
    },
    ensureEntryInfoForEditing(device) {
      if (!device.entryInfo) {
        device.entryInfo = {};
      }
    },
    ensureLocationPreviewImageUrls() {
      return false;
    },
    closeEntryEditModal() {},
    viewDetail() {},
    showToast() {},
    saveDevicesData() {},
    formatCurrentDateTime() {
      return '2026-04-02 10:00:00';
    }
  };

  vm.createContext(sandbox);
  [
    'normalizeEditableValue',
    'normalizePreviewImageList',
    'normalizeEntryAdScreenAsset',
    'createEmptyEntryAdScreenDraft',
    'normalizeEntryAdScreen',
    'buildEntryEditImageDraft',
    'validateAdScreenDraftAsset',
    'serializeEntryAdScreenDraft',
    'collectDetailPreviewImages',
    'toDateTimeStorageValue',
    'getLocationsData',
    'getEntryEditSelectedLocationMeta',
    'getCurrentLoginOperatorInfo',
    'buildLocationChangeRecord',
    'appendLocationChangeRecord',
    'saveEntryInfoEdit'
  ].forEach((functionName) => {
    vm.runInContext(extractFunctionSource(devicesHtml, functionName), sandbox);
  });

  return sandbox;
}

test('运行时：normalizeEntryAdScreen 应优先使用 adScreen 结构', () => {
  const sandbox = buildSandbox();
  const normalized = sandbox.normalizeEntryAdScreen({
    adScreen: {
      leftMenu: { kind: 'image', url: 'left.png', fileName: 'left.png' },
      rightQueueBackground: { kind: 'image', url: 'right.png', fileName: 'right.png' }
    },
    displayImageUrls: ['legacy.png']
  });

  assert.strictEqual(normalized.leftMenu.url, 'left.png');
  assert.strictEqual(normalized.rightQueueBackground.url, 'right.png');
});

test('运行时：normalizeEntryAdScreen 应把 legacy displayImageUrls 映射到左侧菜单', () => {
  const sandbox = buildSandbox();
  const normalized = sandbox.normalizeEntryAdScreen({
    displayImageUrls: ['legacy.png']
  });

  assert.strictEqual(normalized.leftMenu.url, 'legacy.png');
  assert.strictEqual(normalized.rightQueueBackground, null);
});

test('运行时：buildEntryEditImageDraft 应返回左右广告屏槽位与点位图片', () => {
  const sandbox = buildSandbox();
  const draft = sandbox.buildEntryEditImageDraft({
    adScreen: {
      leftMenu: { kind: 'image', url: 'left.png', fileName: 'left.png' },
      rightQueueBackground: { kind: 'image', url: 'right.png', fileName: 'right.png' }
    },
    locationImageUrls: ['location-1.png', 'location-2.png']
  });

  assert.strictEqual(draft.adScreen.leftMenu.url, 'left.png');
  assert.strictEqual(draft.adScreen.rightQueueBackground.url, 'right.png');
  assert.deepStrictEqual(Array.from(draft.location), ['location-1.png', 'location-2.png']);
});

test('运行时：validateAdScreenDraftAsset 应阻止右侧视频并给出左侧告警', () => {
  const sandbox = buildSandbox();

  const rightResult = sandbox.validateAdScreenDraftAsset('rightQueueBackground', {
    kind: 'video',
    mimeType: 'video/mp4',
    width: 800,
    height: 1080,
    durationSec: 0,
    codec: 'H.264'
  });
  assert.ok(rightResult.errors.includes('右侧排队号背景仅支持 jpg、png'));

  const leftResult = sandbox.validateAdScreenDraftAsset('leftMenu', {
    kind: 'video',
    mimeType: 'video/mp4',
    codec: 'H.264',
    width: 1280,
    height: 720,
    durationSec: 360
  });
  assert.ok(leftResult.warnings.includes('建议上传 1320×1080 的左侧菜单素材'));
  assert.ok(leftResult.warnings.includes('左侧菜单视频时长建议不超过 4 分钟'));
});

test('运行时：validateAdScreenDraftAsset 应阻止左侧非 H.264 视频', () => {
  const sandbox = buildSandbox();
  const result = sandbox.validateAdScreenDraftAsset('leftMenu', {
    kind: 'video',
    mimeType: 'video/mp4',
    codec: 'HEVC',
    width: 1320,
    height: 1080,
    durationSec: 120
  });

  assert.ok(result.errors.includes('左侧菜单视频仅支持 H.264 编码'));
});

test('运行时：collectDetailPreviewImages 应保留点位图片和左右图片素材，但排除视频素材', () => {
  const sandbox = buildSandbox();
  const device = {
    entryInfo: {
      adScreen: {
        leftMenu: {
          kind: 'video',
          url: 'left.mp4',
          fileName: 'left.mp4'
        },
        rightQueueBackground: {
          kind: 'image',
          url: 'right.png',
          fileName: 'right.png'
        }
      },
      locationImageUrls: ['location.png']
    }
  };

  const all = sandbox.collectDetailPreviewImages(device, 'all');
  const rightOnly = sandbox.collectDetailPreviewImages(device, 'adScreenRight');

  assert.deepStrictEqual(Array.from(all.map((item) => item.src)), ['location.png', 'right.png']);
  assert.deepStrictEqual(Array.from(rightOnly.map((item) => item.src)), ['right.png']);
});

test('运行时：saveEntryInfoEdit 应写入 adScreen 并移除 displayImageUrls', () => {
  const sandbox = buildSandbox();
  sandbox.currentDetailDeviceId = 'RCK386';
  sandbox.devicesData = [{
    id: 'RCK386',
    location: 'L1',
    entryInfo: {
      operatorName: '旧值',
      displayImageUrls: ['legacy.png'],
      displayImages: '1张图片'
    }
  }];
  sandbox.entryEditImageDraft = {
    adScreen: {
      leftMenu: {
        kind: 'image',
        url: 'left.png',
        fileName: 'left.png',
        mimeType: 'image/png',
        width: 1320,
        height: 1080,
        durationSec: 0,
        codec: '',
        updatedAt: '2026-04-02 10:00:00'
      },
      rightQueueBackground: {
        kind: 'image',
        url: 'right.png',
        fileName: 'right.png',
        mimeType: 'image/png',
        width: 800,
        height: 1080,
        durationSec: 0,
        codec: '',
        updatedAt: '2026-04-02 10:00:00'
      }
    },
    location: ['location.png']
  };
  sandbox.document.getElementById('editLocationCode').options = [
    { value: '', dataset: {}, textContent: '请选择点位' },
    { value: 'L1', dataset: { name: '旧点位', address: '上海市静安区旧地址 1 号' }, textContent: '旧点位（L1）' }
  ];
  sandbox.document.getElementById('editLocationCode').selectedIndex = 1;
  sandbox.document.getElementById('editLocationCode').value = 'L1';
  sandbox.localStorage.setItem('locationsData', JSON.stringify([
    {
      id: 'L001',
      code: 'L1',
      name: '旧点位',
      address: '上海市静安区旧地址 1 号',
      longitude: '121.4700',
      latitude: '31.2300',
      customerId: 'C001',
      customerName: '星巴克咖啡'
    }
  ]));
  sandbox.document.getElementById('editLocationAddress').value = '上海市静安区旧地址 1 号';

  sandbox.saveEntryInfoEdit();

  const saved = sandbox.devicesData[0].entryInfo;
  assert.strictEqual(saved.adScreen.leftMenu.url, 'left.png');
  assert.strictEqual(saved.adScreen.rightQueueBackground.url, 'right.png');
  assert.strictEqual(saved.locationImageUrls.length, 1);
  assert.strictEqual('displayImageUrls' in saved, false);
  assert.strictEqual('displayImages' in saved, false);
});
