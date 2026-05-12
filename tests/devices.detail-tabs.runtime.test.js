const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'devices.html'), 'utf8');

function test(name, fn) {
  try { fn(); console.log(`PASS ${name}`); }
  catch (e) { console.error(`FAIL ${name}`); console.error(e.message); process.exitCode = 1; }
}

function extractFn(html, name) {
  const sig = `function ${name}(`;
  const start = html.indexOf(sig);
  if (start === -1) throw new Error(`未找到 ${name}`);
  const b = html.indexOf('{', start);
  let d = 0;
  for (let i = b; i < html.length; i += 1) {
    if (html[i] === '{') d += 1;
    if (html[i] === '}') d -= 1;
    if (d === 0) return html.slice(start, i + 1);
  }
  throw new Error(`解析失败 ${name}`);
}

function buildSandbox() {
  function mkTab(key) {
    const cls = [];
    const attr = {};
    return {
      key,
      cls,
      attr,
      classList: {
        toggle(name, on) {
          if (on) { if (!cls.includes(name)) cls.push(name); }
          else { const i = cls.indexOf(name); if (i >= 0) cls.splice(i, 1); }
        },
        contains(name) { return cls.includes(name); }
      },
      setAttribute(n, v) { attr[n] = v; },
      getAttribute(n) { return n === 'data-tab' ? key : attr[n] ?? null; }
    };
  }
  function mkPane(key) {
    const cls = [];
    return {
      key,
      cls,
      classList: {
        toggle(name, on) {
          if (on) { if (!cls.includes(name)) cls.push(name); }
          else { const i = cls.indexOf(name); if (i >= 0) cls.splice(i, 1); }
        },
        contains(name) { return cls.includes(name); }
      },
      getAttribute(n) { return n === 'data-tab-pane' ? key : null; }
    };
  }
  const tabs = { overview: mkTab('overview'), run: mkTab('run') };
  const panes = { overview: mkPane('overview'), run: mkPane('run') };
  const sandbox = {
    console,
    document: {
      querySelectorAll(sel) {
        if (sel === '.detail-tab') return [tabs.overview, tabs.run];
        if (sel === '.detail-tab-pane') return [panes.overview, panes.run];
        return [];
      }
    },
    history: { replaceState() {} },
    window: { location: { hash: '' } }
  };
  vm.createContext(sandbox);
  return { sandbox, tabs, panes };
}

test('switchDetailTab("run") 应激活 run tab 和 pane', () => {
  const { sandbox, tabs, panes } = buildSandbox();
  vm.runInContext(extractFn(html, 'switchDetailTab'), sandbox);
  sandbox.switchDetailTab('run');
  assert.ok(tabs.run.cls.includes('active'), 'run tab 应 active');
  assert.ok(!tabs.overview.cls.includes('active'), 'overview tab 不应 active');
  assert.ok(panes.run.cls.includes('active'));
  assert.ok(!panes.overview.cls.includes('active'));
});

test('switchDetailTab(非法) 应回退到 overview', () => {
  const { sandbox, tabs } = buildSandbox();
  vm.runInContext(extractFn(html, 'switchDetailTab'), sandbox);
  sandbox.switchDetailTab('bogus');
  assert.ok(tabs.overview.cls.includes('active'));
});

test('switchDetailTab 应设置 aria-selected', () => {
  const { sandbox, tabs } = buildSandbox();
  vm.runInContext(extractFn(html, 'switchDetailTab'), sandbox);
  sandbox.switchDetailTab('run');
  assert.strictEqual(tabs.run.attr['aria-selected'], 'true');
  assert.strictEqual(tabs.overview.attr['aria-selected'], 'false');
});
