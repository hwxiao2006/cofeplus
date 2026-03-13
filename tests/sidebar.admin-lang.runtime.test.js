const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function extractInlineScript(html) {
  const match = html.match(/<script>([\s\S]*)<\/script>\s*<\/body>/);
  if (!match) {
    throw new Error('inline script not found');
  }
  return match[1];
}

function createClassList(initial = []) {
  const set = new Set(initial);
  return {
    add(name) {
      set.add(name);
    },
    remove(name) {
      set.delete(name);
    },
    toggle(name, force) {
      const shouldAdd = force === undefined ? !set.has(name) : Boolean(force);
      if (shouldAdd) set.add(name);
      else set.delete(name);
    },
    contains(name) {
      return set.has(name);
    }
  };
}

function createTextNode(text = '') {
  return {
    textContent: text,
    innerHTML: '',
    value: '',
    style: {},
    dataset: {},
    attributes: {},
    classList: createClassList(),
    focus() {},
    contains() {
      return false;
    },
    getAttribute(name) {
      return this.attributes[name];
    },
    setAttribute(name, value) {
      this.attributes[name] = String(value);
    }
  };
}

function createNavItem(href, text, dataset = {}) {
  const labelNode = createTextNode(text);
  return {
    dataset,
    labelNode,
    attributes: { href },
    classList: createClassList(),
    querySelector(selector) {
      if (selector === 'span:last-child') {
        return labelNode;
      }
      return null;
    },
    getAttribute(name) {
      return this.attributes[name];
    },
    setAttribute(name, value) {
      this.attributes[name] = String(value);
    }
  };
}

function createLangButton(lang) {
  return {
    attributes: { 'data-admin-lang-option': lang, 'aria-pressed': 'false' },
    classList: createClassList(),
    getAttribute(name) {
      return this.attributes[name];
    },
    setAttribute(name, value) {
      this.attributes[name] = String(value);
    }
  };
}

function createRuntime(htmlFile, options = {}) {
  const html = fs.readFileSync(path.join(__dirname, '..', htmlFile), 'utf8');
  const script = `${extractInlineScript(html)}
this.__test = {
  renderAdminSidebarTranslations,
  setAdminSidebarLang,
  getAdminSidebarLang,
  setCurrentTab(value) { currentTab = value; }
};`;

  const brandTitle = createTextNode('运营控制台');
  const sectionTitles = [createTextNode('运营管理'), createTextNode('基础信息管理')];
  const mobileHeaderTitle = createTextNode(options.mobileTitle || '运营控制台');
  const sidebarLogin = { style: {}, scrollWidth: 100, clientWidth: 180 };
  const navItems = options.navItems || [
    createNavItem('overview.html', '总览'),
    createNavItem('devices.html', '设备'),
    createNavItem('menu-management.html', '商品管理'),
    createNavItem('orders.html', '订单')
  ];
  const langButtons = [createLangButton('zh'), createLangButton('en')];
  const genericNodes = {};

  const store = { ...(options.initialStorage || {}) };
  const document = {
    querySelector(selector) {
      if (selector === '.brand-title') return brandTitle;
      if (selector === '.mobile-header strong, .mobile-header span[style], .mobile-header .mobile-header-title') {
        return mobileHeaderTitle;
      }
      if (selector === '.sidebar-login') return sidebarLogin;
      return null;
    },
    querySelectorAll(selector) {
      if (selector === '.nav-section-title') return sectionTitles;
      if (selector === '.sidebar-nav .nav-item') return navItems;
      if (selector === '[data-admin-lang-option]') return langButtons;
      return [];
    },
    getElementById(id) {
      if (!genericNodes[id]) {
        genericNodes[id] = createTextNode('');
      }
      return genericNodes[id];
    },
    addEventListener() {}
  };

  const context = {
    console,
    document,
    window: {
      location: { pathname: `/${htmlFile}` },
      history: { replaceState() {} },
      addEventListener() {}
    },
    localStorage: {
      getItem(key) {
        return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
      },
      setItem(key, value) {
        store[key] = String(value);
      }
    }
  };

  vm.runInNewContext(script, context);

  return {
    api: context.__test,
    brandTitle,
    sectionTitles,
    navItems,
    mobileHeaderTitle,
    langButtons,
    store
  };
}

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

test('故障页切换到英文后应翻译品牌、分组、菜单和移动端标题', () => {
  const runtime = createRuntime('faults.html', {
    mobileTitle: '故障管理'
  });

  runtime.api.setAdminSidebarLang('en');

  assert.strictEqual(runtime.brandTitle.textContent, 'Operations Console');
  assert.strictEqual(runtime.sectionTitles[0].textContent, 'Operations');
  assert.strictEqual(runtime.sectionTitles[1].textContent, 'Basic Info');
  assert.strictEqual(runtime.navItems[0].labelNode.textContent, 'Overview');
  assert.strictEqual(runtime.navItems[1].labelNode.textContent, 'Devices');
  assert.strictEqual(runtime.navItems[2].labelNode.textContent, 'Catalog');
  assert.strictEqual(runtime.mobileHeaderTitle.textContent, 'Faults');
  assert.strictEqual(runtime.store.adminSidebarLang, 'en');
  assert.strictEqual(runtime.langButtons[1].getAttribute('aria-pressed'), 'true');
  assert.ok(runtime.langButtons[1].classList.contains('active'));
});

test('菜单页应根据当前 tab 翻译移动端标题', () => {
  const runtime = createRuntime('menu.html', {
    navItems: [
      createNavItem('#', '总览', { tab: 'overview' }),
      createNavItem('#', '商品管理', { tab: 'menu' })
    ]
  });

  runtime.api.setCurrentTab('menu');
  runtime.api.setAdminSidebarLang('en');
  assert.strictEqual(runtime.mobileHeaderTitle.textContent, 'Catalog');

  runtime.api.setCurrentTab('overview');
  runtime.api.renderAdminSidebarTranslations();
  assert.strictEqual(runtime.mobileHeaderTitle.textContent, 'Overview');
});

test('商品管理页的后台菜单语言切换不应影响 platformLang', () => {
  const runtime = createRuntime('menu-management.html', {
    initialStorage: { platformLang: 'zh' }
  });

  runtime.api.setAdminSidebarLang('en');

  assert.strictEqual(runtime.store.adminSidebarLang, 'en');
  assert.strictEqual(runtime.store.platformLang, 'zh');
});
