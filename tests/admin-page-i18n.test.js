const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const rootAppPages = [
    'overview.html',
    'menu.html',
    'menu-management.html',
    'devices.html',
    'orders.html',
    'materials.html',
    'materials-orders.html',
    'materials-refill.html',
    'faults.html',
    'customers.html',
    'locations.html',
    'staff-management.html',
    'device-entry.html',
    'product-detail.html',
    'product-management.html',
    'login-paper.html',
    'recipe-entry-preview.html'
];

function read(file) {
    return fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
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

test('所有根业务页面都应加载后台页面正文 i18n helper', () => {
    rootAppPages.forEach(file => {
        const html = read(file);
        assert.ok(
            html.includes('shared/admin-page-i18n.js'),
            `${file} 缺少 shared/admin-page-i18n.js，正文不会跟随中英文切换`
        );
    });
});

test('页面正文 i18n helper 应根据 adminSidebarLang 翻译固定正文和属性', () => {
    const helper = read('shared/admin-page-i18n.js');
    const textNode = {
        nodeType: 3,
        nodeValue: '销售总览',
        parentElement: null
    };
    const button = {
        nodeType: 1,
        tagName: 'BUTTON',
        childNodes: [],
        attributes: [
            { name: 'title', value: '编辑' },
            { name: 'aria-label', value: '编辑' }
        ],
        dataset: {},
        getAttribute(name) {
            const attr = this.attributes.find(item => item.name === name);
            return attr ? attr.value : null;
        },
        setAttribute(name, value) {
            const attr = this.attributes.find(item => item.name === name);
            if (attr) attr.value = value;
            else this.attributes.push({ name, value });
        }
    };
    const document = {
        body: {
            nodeType: 1,
            tagName: 'BODY',
            childNodes: [textNode, button],
            attributes: [],
            dataset: {}
        },
        title: '商品管理 - 运营控制台',
        addEventListener() {},
        querySelectorAll() {
            return [];
        }
    };
    const store = { adminSidebarLang: 'en' };
    const context = {
        window: { addEventListener() {} },
        document,
        localStorage: {
            getItem(key) {
                return store[key] || null;
            }
        },
        MutationObserver: function MutationObserver() {
            this.observe = function observe() {};
        }
    };

    vm.runInNewContext(helper, context);
    context.window.CofeAdminPageI18n.apply();

    assert.strictEqual(textNode.nodeValue, 'Sales Overview');
    assert.strictEqual(button.getAttribute('title'), 'Edit');
    assert.strictEqual(button.getAttribute('aria-label'), 'Edit');
    assert.strictEqual(document.title, 'Catalog - Operations Console');
});

test('页面正文 i18n helper 应支持带动态数值的常见运营文案', () => {
    const helper = read('shared/admin-page-i18n.js');
    const nodes = [
        '设备：全部',
        '5 个商品',
        '较昨日 +3.9%',
        '图表类型：柱状图（2026-02-13 07:00-18:00 小时销售额，单位 CNY）'
    ].map(value => ({ nodeType: 3, nodeValue: value, parentElement: null }));
    const document = {
        body: {
            nodeType: 1,
            tagName: 'BODY',
            childNodes: nodes,
            attributes: [],
            dataset: {}
        },
        title: '',
        addEventListener() {},
        querySelectorAll() {
            return [];
        }
    };
    const context = {
        window: { addEventListener() {} },
        document,
        localStorage: {
            getItem() {
                return 'en';
            }
        },
        MutationObserver: function MutationObserver() {
            this.observe = function observe() {};
        }
    };

    vm.runInNewContext(helper, context);
    context.window.CofeAdminPageI18n.apply();

    assert.strictEqual(nodes[0].nodeValue, 'Device: All');
    assert.strictEqual(nodes[1].nodeValue, '5 products');
    assert.strictEqual(nodes[2].nodeValue, 'vs yesterday +3.9%');
    assert.strictEqual(nodes[3].nodeValue, 'Chart: Bar (2026-02-13 07:00-18:00 hourly sales, unit CNY)');
});

test('页面正文 i18n helper 应能翻译渲染后再次变更的中文节点', () => {
    const helper = read('shared/admin-page-i18n.js');
    const textNode = { nodeType: 3, nodeValue: 'Customers', parentElement: null };
    const document = {
        body: {
            nodeType: 1,
            tagName: 'BODY',
            childNodes: [textNode],
            attributes: [],
            dataset: {}
        },
        title: '',
        addEventListener() {},
        querySelectorAll() {
            return [];
        }
    };
    const context = {
        window: { addEventListener() {} },
        document,
        localStorage: {
            getItem() {
                return 'en';
            }
        },
        MutationObserver: function MutationObserver() {
            this.observe = function observe() {};
        }
    };

    vm.runInNewContext(helper, context);
    context.window.CofeAdminPageI18n.apply();
    textNode.nodeValue = '我的商户';
    context.window.CofeAdminPageI18n.apply();

    assert.strictEqual(textNode.nodeValue, 'My Merchants');
});

test('页面正文 i18n helper 应覆盖设备、订单、人员等核心页面固定文案', () => {
    const helper = read('shared/admin-page-i18n.js');
    const nodes = [
        '管理和监控所有咖啡设备',
        '+ 设备入场',
        '今日销售动态与订单处理',
        '当前范围数据 · 支付成功订单',
        '列出当前商户下所有管理人员，支持按截图表单新增人员',
        '点击选择权限'
    ].map(value => ({ nodeType: 3, nodeValue: value, parentElement: null }));
    const document = {
        body: {
            nodeType: 1,
            tagName: 'BODY',
            childNodes: nodes,
            attributes: [],
            dataset: {}
        },
        title: '',
        addEventListener() {},
        querySelectorAll() {
            return [];
        }
    };
    const context = {
        window: { addEventListener() {} },
        document,
        localStorage: {
            getItem() {
                return 'en';
            }
        },
        MutationObserver: function MutationObserver() {
            this.observe = function observe() {};
        }
    };

    vm.runInNewContext(helper, context);
    context.window.CofeAdminPageI18n.apply();

    assert.deepStrictEqual(nodes.map(node => node.nodeValue), [
        'Manage and monitor all coffee devices',
        '+ Add Device',
        'Today sales activity and order handling',
        'Current range · Paid orders',
        'List all managers under the current merchant and add staff from the form',
        'Select permissions'
    ]);
});

test('页面正文 i18n helper 应覆盖登录页、旧商品页和配方入口预览固定文案', () => {
    const helper = read('shared/admin-page-i18n.js');
    const nodes = [
        '欢迎登录',
        '请输入运营账号',
        '进入控制台',
        '商品首页',
        '编辑商品信息',
        '配方入口方案对比',
        '操作路径：',
        '调整配方',
        '连接每日出杯现场，进入运营工作台',
        '当前入口：菜单管理 → 商品管理 → 点击商品 → 商品详情 → 配方配置 tab → 修改配方。下面是 4 种优化方案。',
        '配方配置 · 直接调整各杯型成分',
        '保存配方',
        '温区参数',
        '点位照片（本地上传）',
        '点击上传图片',
        '商品名称（中文）',
        '这套方案把品牌感放在纸张肌理、边框和排版秩序里，不靠复杂装饰也能让后台入口带上精品咖啡菜单的节奏感。',
        '方案 C（推荐）',
        '侧边栏新增「配方维护」独立页面',
        '商品管理 → 点击商品 → 配方配置 Tab',
        '原图（模板商品）',
        '商品搜索',
        '分类导航',
        '全部分类（23个商品）'
    ].map(value => ({ nodeType: 3, nodeValue: value, parentElement: null }));
    const document = {
        body: {
            nodeType: 1,
            tagName: 'BODY',
            childNodes: nodes,
            attributes: [],
            dataset: {}
        },
        title: '',
        addEventListener() {},
        querySelectorAll() {
            return [];
        }
    };
    const context = {
        window: { addEventListener() {} },
        document,
        localStorage: {
            getItem() {
                return 'en';
            }
        },
        MutationObserver: function MutationObserver() {
            this.observe = function observe() {};
        }
    };

    vm.runInNewContext(helper, context);
    context.window.CofeAdminPageI18n.apply();

    assert.deepStrictEqual(nodes.map(node => node.nodeValue), [
        'Welcome',
        'Enter operations account',
        'Enter Console',
        'Catalog Home',
        'Edit Product Info',
        'Recipe Entry Plan Comparison',
        'Path:',
        'Adjust Recipe',
        'Connect to daily cup output and enter the operations workspace',
        'Current path: Menu Management → Catalog → Click Product → Product Detail → Recipe Config tab → Edit Recipe. Four optimization plans are shown below.',
        'Recipe Config · Directly adjust each cup size ingredient',
        'Save Recipe',
        'Temperature Zone Parameters',
        'Location Photos (Local Upload)',
        'Click to upload image',
        'Product Name (Chinese)',
        'This concept puts the brand feel into paper texture, borders, and typography, giving the admin entry the rhythm of a specialty coffee menu without extra decoration.',
        'Plan C (Recommended)',
        'Add an independent Recipe Maintenance page to the sidebar',
        'Catalog → Click Product → Recipe Config Tab',
        'Original Image (Template Product)',
        'Product Search',
        'Category Navigation',
        'All Categories (23 products)'
    ]);
});

test('页面正文 i18n helper 不应翻译 input.value（避免把表单里的中文数据替换为英文）', () => {
    const helper = read('shared/admin-page-i18n.js');
    // 模拟多语言矩阵里的中文 input：value 是真实的中文数据 "热"，
    // 不能被替换成 'Hot'，否则用户看到 zh 槽位显示英文、保存时还会把英文写回到 zh。
    const input = {
        nodeType: 1,
        tagName: 'INPUT',
        childNodes: [],
        attributes: [
            { name: 'value', value: '热' },
            { name: 'placeholder', value: '请输入名称' }
        ],
        dataset: {},
        getAttribute(name) {
            const attr = this.attributes.find(item => item.name === name);
            return attr ? attr.value : null;
        },
        setAttribute(name, value) {
            const attr = this.attributes.find(item => item.name === name);
            if (attr) attr.value = value;
            else this.attributes.push({ name, value });
        }
    };
    const document = {
        body: { nodeType: 1, tagName: 'BODY', childNodes: [input], attributes: [], dataset: {} },
        title: '',
        addEventListener() {},
        querySelectorAll() { return []; }
    };
    const context = {
        window: { addEventListener() {} },
        document,
        localStorage: { getItem() { return 'en'; } },
        MutationObserver: function () { this.observe = function () {}; }
    };
    vm.runInNewContext(helper, context);
    context.window.CofeAdminPageI18n.apply();
    // value 不可被改：表单数据保持原样
    assert.strictEqual(input.getAttribute('value'), '热');
    // placeholder 仍可翻：那是 UI 文案；dict 里有"请输入名称" → "Name"
    assert.strictEqual(input.getAttribute('placeholder'), 'Name');
});

test('页面正文 i18n helper 应翻译每个页面共享的侧边栏 / 顶栏 chrome', () => {
    const helper = read('shared/admin-page-i18n.js');
    const nodes = [
        '后台菜单语言',
        '基础信息管理',
        '运营管理',
        '退出登录',
        '我的商户'
    ].map(value => ({ nodeType: 3, nodeValue: value, parentElement: null }));
    const document = {
        body: { nodeType: 1, tagName: 'BODY', childNodes: nodes, attributes: [], dataset: {} },
        title: '',
        addEventListener() {},
        querySelectorAll() { return []; }
    };
    const context = {
        window: { addEventListener() {} },
        document,
        localStorage: { getItem() { return 'en'; } },
        MutationObserver: function () { this.observe = function () {}; }
    };
    vm.runInNewContext(helper, context);
    context.window.CofeAdminPageI18n.apply();
    assert.deepStrictEqual(nodes.map(n => n.nodeValue), [
        'Admin Menu Language',
        'Basic Info',
        'Operations',
        'Logout',
        'My Merchants'
    ]);
});

test('页面正文 i18n helper 应覆盖常见 placeholder / 示例提示', () => {
    const helper = read('shared/admin-page-i18n.js');
    const samples = [
        ['搜索设备编号或点位名称...', 'Search by device ID or location...'],
        ['搜索客户名称、联系人、电话...', 'Search customer name, contact, or phone...'],
        ['搜索点位名称、地址、编码...', 'Search location name, address, or code...'],
        ['请输入名称', 'Name'],
        ['请输入手机号', 'Phone'],
        ['请输入图片URL（可选）', 'Image URL (optional)'],
        ['上一步', 'Previous'],
        ['下一步', 'Next'],
        ['如：Français', 'e.g. Français'],
        ['例如 07:00-09:00', 'e.g. 07:00-09:00']
    ];
    const nodes = samples.map(([zh]) => ({ nodeType: 3, nodeValue: zh, parentElement: null }));
    const document = {
        body: { nodeType: 1, tagName: 'BODY', childNodes: nodes, attributes: [], dataset: {} },
        title: '',
        addEventListener() {},
        querySelectorAll() { return []; }
    };
    const context = {
        window: { addEventListener() {} },
        document,
        localStorage: { getItem() { return 'en'; } },
        MutationObserver: function () { this.observe = function () {}; }
    };
    vm.runInNewContext(helper, context);
    context.window.CofeAdminPageI18n.apply();
    assert.deepStrictEqual(nodes.map(n => n.nodeValue), samples.map(([, en]) => en));
});

test('页面正文 i18n helper 应覆盖动态数值 PATTERNS（照片数 / 已选 / 强制同步 / 退款上限）', () => {
    const helper = read('shared/admin-page-i18n.js');
    const samples = [
        ['3张', '3 photos'],
        ['5项已选', '5 selected'],
        ['可退款上限：CNY 12.50', 'Max refund: CNY 12.50'],
        ['已选 4 行', '4 rows selected'],
        ['已选择 7 个', '7 selected'],
        ['强制同步 12 个关联商品', 'Force-sync 12 linked products'],
        ['已选 2 个商品', '2 products selected'],
        ['已选 3 台设备', '3 devices selected']
    ];
    const nodes = samples.map(([zh]) => ({ nodeType: 3, nodeValue: zh, parentElement: null }));
    const document = {
        body: { nodeType: 1, tagName: 'BODY', childNodes: nodes, attributes: [], dataset: {} },
        title: '',
        addEventListener() {},
        querySelectorAll() { return []; }
    };
    const context = {
        window: { addEventListener() {} },
        document,
        localStorage: { getItem() { return 'en'; } },
        MutationObserver: function () { this.observe = function () {}; }
    };
    vm.runInNewContext(helper, context);
    context.window.CofeAdminPageI18n.apply();
    assert.deepStrictEqual(nodes.map(n => n.nodeValue), samples.map(([, en]) => en));
});

test('页面正文 i18n helper 应递归翻译 PATTERNS 捕获组里的中文 token + 整段无匹配时的兜底', () => {
    const helper = read('shared/admin-page-i18n.js');
    const samples = [
        ['3D拉花 · 商品列表', '3D Latte Art · Product List'],
        ['本店王牌 · 商品列表', 'House Signature · Product List'],
        ['已选 3 个商品 · 太平洋咖啡', 'Selected 3 products · Pacific Coffee'],
        ['金奖黑咖-浓香意式、热、标准', 'Gold Black Coffee - Bold Italian, Hot, Standard']
    ];
    const nodes = samples.map(([zh]) => ({ nodeType: 3, nodeValue: zh, parentElement: null }));
    const document = {
        body: { nodeType: 1, tagName: 'BODY', childNodes: nodes, attributes: [], dataset: {} },
        title: '',
        addEventListener() {},
        querySelectorAll() { return []; }
    };
    const context = {
        window: { addEventListener() {} },
        document,
        localStorage: { getItem() { return 'en'; } },
        MutationObserver: function () { this.observe = function () {}; }
    };
    vm.runInNewContext(helper, context);
    context.window.CofeAdminPageI18n.apply();
    assert.deepStrictEqual(nodes.map(n => n.nodeValue), samples.map(([, en]) => en));
});

// 覆盖率回归护栏：扫 17 个根页面、抽取可见中文，计算未翻译数；
// 阀值给 30（容忍少量边角文案），任何人新增中文 UI 又忘了补字典就会立刻 fail。
test('页面正文 i18n 字典对 17 个根页面的覆盖率应保持高位（未翻译 < 30）', () => {
    const rootPages = [
        'overview.html', 'devices.html', 'orders.html', 'staff-management.html',
        'faults.html', 'customers.html', 'locations.html', 'materials.html',
        'materials-refill.html', 'materials-orders.html', 'menu.html',
        'menu-management.html', 'product-detail.html', 'product-management.html',
        'device-entry.html', 'login-paper.html', 'recipe-entry-preview.html'
    ];
    const helper = read('shared/admin-page-i18n.js');

    // 抽 TEXT 字典 keys（用单引号字符串字面量；用 RegExp 而不是 JSON.parse，以容忍内部转义）
    const textBlockMatch = helper.match(/const TEXT = \{([\s\S]*?)\};/);
    assert.ok(textBlockMatch, 'TEXT 字典定义无法解析');
    const textKeys = new Set();
    const keyRe = /^\s*'((?:\\'|[^'])+)':/gm;
    let m;
    while ((m = keyRe.exec(textBlockMatch[1])) !== null) {
        textKeys.add(m[1].replace(/\\'/g, "'"));
    }

    // 抽 PATTERNS 正则源
    const patternsMatch = helper.match(/const PATTERNS = \[([\s\S]*?)\];/);
    assert.ok(patternsMatch, 'PATTERNS 列表定义无法解析');
    const patterns = [];
    const patRe = /\[\/((?:\\\/|[^/])+)\/([gimsuy]*),/g;
    let pm;
    while ((pm = patRe.exec(patternsMatch[1])) !== null) {
        try { patterns.push(new RegExp(pm[1])); } catch (_) { /* skip */ }
    }

    const norm = v => String(v).replace(/\s+/g, ' ').trim();
    const hasChinese = s => /[一-鿿]/.test(s);

    const missing = new Set();
    rootPages.forEach(page => {
        const html = read(page);
        const stripped = html
            .replace(/<script[\s\S]*?<\/script>/g, '')
            .replace(/<style[\s\S]*?<\/style>/g, '')
            .replace(/<!--[\s\S]*?-->/g, '');
        const strings = new Set();
        const textRe = />([^<>]{1,160})</g;
        let t;
        while ((t = textRe.exec(stripped)) !== null) {
            const s = t[1].trim();
            if (s && hasChinese(s)) strings.add(s);
        }
        ['placeholder', 'title', 'aria-label', 'value', 'alt'].forEach(attr => {
            const ar = new RegExp(`${attr}="([^"]+)"`, 'g');
            let am;
            while ((am = ar.exec(stripped)) !== null) {
                const s = am[1].trim();
                if (s && hasChinese(s)) strings.add(s);
            }
        });
        strings.forEach(s => {
            const n = norm(s);
            if (textKeys.has(n)) return;
            if (patterns.some(p => p.test(n))) return;
            missing.add(s);
        });
    });

    const list = Array.from(missing).sort();
    assert.ok(
        missing.size < 30,
        `i18n 覆盖率回退：发现 ${missing.size} 条未翻译中文字符串（阀值 30）。前 20 条：\n${list.slice(0, 20).map(s => '  · ' + JSON.stringify(s)).join('\n')}`
    );
});
