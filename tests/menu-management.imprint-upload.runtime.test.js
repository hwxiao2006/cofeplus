const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const htmlPath = path.join(__dirname, '..', 'menu-management.html');
const html = fs.readFileSync(htmlPath, 'utf8');
const match = html.match(/<script>([\s\S]*)<\/script>/);
if (!match) {
  throw new Error('menu-management.html 中未找到脚本代码');
}
const scriptSource = match[1];

function extractFunctionSource(source, functionName) {
  const signatures = [`function ${functionName}(`, `async function ${functionName}(`];
  const start = signatures
    .map(signature => source.indexOf(signature))
    .filter(index => index >= 0)
    .sort((left, right) => left - right)[0] ?? -1;
  if (start === -1) {
    throw new Error(`未找到函数 ${functionName}`);
  }
  const braceStart = source.indexOf('{', start);
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

function createElement(id) {
  return {
    id,
    value: '',
    innerHTML: '',
    textContent: '',
    style: {},
    classList: {
      add() {},
      remove() {}
    }
  };
}

function buildSandbox() {
  const elements = {};
  const toasts = [];
  const sandbox = {
    console,
    currentDevice: 'RCK111',
    menuLatteArtUploadDraft: {
      deviceId: 'RCK111',
      itemId: '',
      name: '',
      image: ''
    },
    document: {
      getElementById(id) {
        if (!elements[id]) elements[id] = createElement(id);
        return elements[id];
      }
    },
    showToast(message, type = 'success') {
      toasts.push({ message, type });
    },
    escapePreviewText(value) {
      return String(value ?? '');
    },
    FileReader: function FileReaderMock() {
      this.readAsDataURL = () => {
        if (typeof this.onload === 'function') {
          this.onload({ target: { result: 'data:image/png;base64,ZmFrZQ==' } });
        }
      };
    }
  };
  sandbox.globalThis = sandbox;
  sandbox.__toasts = toasts;
  vm.createContext(sandbox);
  [
    'readFileAsDataUrl',
    'updateMenuLatteArtPreview',
    'handleMenuLatteArtFileChange',
    'resolveMenuLatteArtUploadPayload'
  ].forEach(functionName => {
    vm.runInContext(extractFunctionSource(scriptSource, functionName), sandbox);
  });
  return sandbox;
}

async function test(name, fn) {
  try {
    await fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    console.error(error.stack || error.message);
    process.exitCode = 1;
  }
}

(async function run() {
  await test('印花图片上传：选择本地图片后应读取 data URL 并更新预览', async () => {
    const ctx = buildSandbox();
    ctx.document.getElementById('menuLatteArtNameInput').value = '天鹅';

    await ctx.handleMenuLatteArtFileChange({
      target: {
        files: [{ name: 'imprint.png', type: 'image/png', size: 1024 }]
      }
    });

    const payload = ctx.resolveMenuLatteArtUploadPayload();
    assert.strictEqual(payload.image, 'data:image/png;base64,ZmFrZQ==');
    assert.ok(ctx.document.getElementById('menuLatteArtPreview').innerHTML.includes('data:image/png;base64,ZmFrZQ=='));
    assert.deepStrictEqual(ctx.__toasts, []);
  });
})();
