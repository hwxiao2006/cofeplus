const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const faultsHtml = fs.readFileSync(path.join(__dirname, '..', 'faults.html'), 'utf8');

function loadFaultContext(options = {}) {
  const htmlPath = path.join(__dirname, '..', 'faults.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const match = html.match(/<script>([\s\S]*)<\/script>/);
  if (!match) {
    throw new Error('faults.html 中未找到脚本代码');
  }

  const script = match[1]
    .replace('const tabConfig = [', 'globalThis.tabConfig = [')
    .replace("let currentTab = 'fault';", "globalThis.currentTab = 'fault';")
    .replace("let searchKeyword = '';", "globalThis.searchKeyword = '';")
    .replace('const faults = [', 'globalThis.faults = [');

  const elements = {};
  function getElement(id) {
    if (!elements[id]) {
      const classes = new Set();
      elements[id] = {
        id,
        value: '',
        innerHTML: '',
        textContent: '',
        style: {},
        clientWidth: id === 'sidebarLoginWrap' ? 180 : 240,
        scrollWidth: id === 'sidebarLoginWrap' ? 180 : 240,
        dataset: {},
        classList: {
          add(name) { classes.add(name); },
          remove(name) { classes.delete(name); },
          toggle(name, force) {
            if (typeof force === 'boolean') {
              if (force) classes.add(name);
              else classes.delete(name);
              return force;
            }
            if (classes.has(name)) {
              classes.delete(name);
              return false;
            }
            classes.add(name);
            return true;
          },
          contains(name) { return classes.has(name); }
        }
      };
    }
    return elements[id];
  }

  const sessionStore = {};
  const defaultStaffAccessHelper = {
    resolveCurrentStaffAccess() {
      return { isScoped: false, currentStaff: null };
    },
    hasModulePermission() {
      return false;
    },
    getModuleVisibleDeviceIds() {
      return [];
    }
  };
  const context = {
    console,
    window: {
      location: { href: '', pathname: '/faults.html', search: '' },
      innerWidth: options.innerWidth || 1280,
      addEventListener() {},
      CofeAdminStaffAccess: options.staffAccessHelper || defaultStaffAccessHelper
    },
    document: {
      getElementById: getElement,
      querySelector(selector) {
        if (selector === '.sidebar-login') return getElement('sidebarLoginWrap');
        return null;
      }
    },
    localStorage: {
      getItem() { return null; },
      setItem() {}
    },
    sessionStorage: {
      setItem(key, value) { sessionStore[key] = String(value); },
      getItem(key) {
        return Object.prototype.hasOwnProperty.call(sessionStore, key) ? sessionStore[key] : null;
      }
    },
    alert() {}
  };

  vm.createContext(context);
  vm.runInContext(script, context);
  return context;
}

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

test('故障页应显式引入共享员工权限脚本', () => {
  assert.ok(/<script src="shared\/admin-staff-access\.js"><\/script>/.test(faultsHtml));
});

test('故障列表：卡片中应仅保留远程操作按钮', () => {
  const ctx = loadFaultContext();
  ctx.renderList();

  const listHtml = ctx.document.getElementById('list').innerHTML;
  assert.ok(listHtml.includes('fault-actions'));
  assert.ok(listHtml.includes('远程操作'));
  assert.ok(!listHtml.includes('编辑状态'));
  assert.ok(!listHtml.includes('物料'));
  assert.ok(!listHtml.includes('状态记录'));
});

test('故障列表：应只展示故障设备', () => {
  const ctx = loadFaultContext();
  ctx.renderList();

  const listHtml = ctx.document.getElementById('list').innerHTML;
  assert.ok(listHtml.includes('RCK019'));
  assert.ok(!listHtml.includes('RCK021'));
});

test('故障列表：应按当前员工故障页设备范围裁剪数据', () => {
  const ctx = loadFaultContext({
    staffAccessHelper: {
      resolveCurrentStaffAccess() {
        return { isScoped: true, currentStaff: { username: '王运维' } };
      },
      hasModulePermission() {
        return true;
      },
      getModuleVisibleDeviceIds() {
        return ['RCK073'];
      }
    }
  });

  ctx.renderSummary();
  ctx.renderList();

  const listHtml = ctx.document.getElementById('list').innerHTML;
  assert.ok(listHtml.includes('RCK073'));
  assert.ok(!listHtml.includes('RCK019'));
  assert.strictEqual(ctx.document.getElementById('summary').textContent, '故障设备 1 台');
});

test('故障列表：无故障页权限时应展示清晰空状态', () => {
  const ctx = loadFaultContext({
    staffAccessHelper: {
      resolveCurrentStaffAccess() {
        return { isScoped: true, currentStaff: { username: '李财务' } };
      },
      hasModulePermission() {
        return false;
      },
      getModuleVisibleDeviceIds() {
        return [];
      }
    }
  });

  ctx.renderSummary();
  ctx.renderList();

  assert.strictEqual(ctx.document.getElementById('summary').textContent, '故障设备 0 台');
  assert.ok(ctx.document.getElementById('list').innerHTML.includes('当前账号暂未开通故障页面权限'));
});

test('故障列表：操作按钮应只绑定远程操作动作', () => {
  const ctx = loadFaultContext();
  ctx.renderList();

  const listHtml = ctx.document.getElementById('list').innerHTML;
  assert.ok(listHtml.includes("openRemoteActions('RCK019')"));
  assert.ok(!listHtml.includes("openEditStatus('RCK019')"));
  assert.ok(!listHtml.includes("goToDeviceMaterials('RCK019')"));
  assert.ok(!listHtml.includes("openStatusRecords('RCK019')"));
});

test('故障列表：页面不应展示状态筛选Tab', () => {
  assert.ok(!faultsHtml.includes('id="tabs"'));
});

test('故障页：加载后应渲染默认登录名称和电话', () => {
  const ctx = loadFaultContext();

  assert.strictEqual(ctx.document.getElementById('sidebarLoginName').textContent, '运营管理员');
  assert.strictEqual(ctx.document.getElementById('sidebarLoginPhone').textContent, '13800138000');
});

test('远程操作：点击后应显示图一菜单弹层', () => {
  const ctx = loadFaultContext();
  assert.strictEqual(typeof ctx.openRemoteActions, 'function');
  ctx.openRemoteActions('RCK019');

  const panel = ctx.document.getElementById('remoteActionSheet');
  assert.strictEqual(panel.classList.contains('active'), true);
  assert.ok(panel.innerHTML.includes('机构重启'));
  assert.ok(panel.innerHTML.includes('设备开门'));
  assert.ok(!panel.innerHTML.includes('更新配方'));
  assert.ok(panel.innerHTML.includes('设备停售'));
  assert.ok(panel.innerHTML.includes('音量调节'));
});

test('远程操作：超出当前员工故障页设备范围时不应打开弹层', () => {
  const ctx = loadFaultContext({
    staffAccessHelper: {
      resolveCurrentStaffAccess() {
        return { isScoped: true, currentStaff: { username: '王运维' } };
      },
      hasModulePermission() {
        return true;
      },
      getModuleVisibleDeviceIds() {
        return ['RCK073'];
      }
    }
  });

  ctx.openRemoteActions('RCK019');

  const panel = ctx.document.getElementById('remoteActionSheet');
  assert.strictEqual(panel.classList.contains('active'), false);
  assert.strictEqual(panel.innerHTML, '');
});

test('编辑状态：点击后应显示图二菜单弹层', () => {
  const ctx = loadFaultContext();
  assert.strictEqual(typeof ctx.openEditStatus, 'function');
  ctx.openEditStatus('RCK019');

  const panel = ctx.document.getElementById('editStatusSheet');
  assert.strictEqual(panel.classList.contains('active'), true);
  assert.ok(panel.innerHTML.includes('正常'));
  assert.ok(panel.innerHTML.includes('故障'));
  assert.ok(panel.innerHTML.includes('缺料'));
});

test('状态记录：点击后应显示图三列表', () => {
  const ctx = loadFaultContext();
  assert.strictEqual(typeof ctx.openStatusRecords, 'function');
  ctx.openStatusRecords('RCK019');

  const page = ctx.document.getElementById('statusRecordPage');
  assert.strictEqual(page.classList.contains('active'), true);
  assert.ok(page.innerHTML.includes('异常记录'));
  assert.ok(page.innerHTML.includes('运维记录'));
  assert.ok(page.innerHTML.includes('废料记录'));
});

test('状态记录：超出当前员工故障页设备范围时不应打开记录页', () => {
  const ctx = loadFaultContext({
    staffAccessHelper: {
      resolveCurrentStaffAccess() {
        return { isScoped: true, currentStaff: { username: '王运维' } };
      },
      hasModulePermission() {
        return true;
      },
      getModuleVisibleDeviceIds() {
        return ['RCK073'];
      }
    }
  });

  ctx.openStatusRecords('RCK019');

  const page = ctx.document.getElementById('statusRecordPage');
  assert.strictEqual(page.classList.contains('active'), false);
  assert.strictEqual(page.innerHTML, '');
});

test('状态记录：点击异常记录后应显示图四详情', () => {
  const ctx = loadFaultContext();
  assert.strictEqual(typeof ctx.openStatusRecords, 'function');
  assert.strictEqual(typeof ctx.openAbnormalRecords, 'function');
  ctx.openStatusRecords('RCK019');
  ctx.openAbnormalRecords();

  const detailPage = ctx.document.getElementById('abnormalRecordPage');
  assert.strictEqual(detailPage.classList.contains('active'), true);
  assert.ok(detailPage.innerHTML.includes('RCK019-异常记录'));
  assert.ok(detailPage.innerHTML.includes('设备疑似没网或断电'));
});

test('状态记录：点击运维记录后应显示当前设备运维记录', () => {
  const ctx = loadFaultContext();
  assert.strictEqual(typeof ctx.openStatusRecords, 'function');
  assert.strictEqual(typeof ctx.openOperationRecords, 'function');
  ctx.openStatusRecords('RCK019');
  ctx.openOperationRecords();

  const operationPage = ctx.document.getElementById('operationRecordPage');
  assert.strictEqual(operationPage.classList.contains('active'), true);
  assert.ok(operationPage.innerHTML.includes('RCK019-运维记录'));
  assert.ok(operationPage.innerHTML.includes('操作人'));
  assert.ok(operationPage.innerHTML.includes('操作项'));
  assert.ok(operationPage.innerHTML.includes('处理结果'));
});

test('状态记录：运维记录返回后应回到状态页', () => {
  const ctx = loadFaultContext();
  ctx.openStatusRecords('RCK019');
  ctx.openOperationRecords();
  ctx.closeOperationRecords();

  const statusPage = ctx.document.getElementById('statusRecordPage');
  const operationPage = ctx.document.getElementById('operationRecordPage');
  assert.strictEqual(statusPage.classList.contains('active'), true);
  assert.strictEqual(operationPage.classList.contains('active'), false);
});

test('物料：点击后应跳转对应设备的物料页', () => {
  const ctx = loadFaultContext();
  assert.strictEqual(typeof ctx.goToDeviceMaterials, 'function');
  ctx.goToDeviceMaterials('RCK019');

  assert.strictEqual(ctx.sessionStorage.getItem('currentDevice'), 'RCK019');
  assert.ok(ctx.window.location.href.startsWith('materials.html?device=RCK019'));
});

test('交互模式：桌面端远程操作应使用桌面对话框布局', () => {
  const ctx = loadFaultContext({ innerWidth: 1366 });
  ctx.openRemoteActions('RCK019');

  const panel = ctx.document.getElementById('remoteActionSheet');
  assert.ok(panel.innerHTML.includes('fault-desktop-dialog'));
  assert.ok(!panel.innerHTML.includes('fault-sheet-panel'));
});

test('交互模式：移动端远程操作应使用底部弹层布局', () => {
  const ctx = loadFaultContext({ innerWidth: 390 });
  ctx.openRemoteActions('RCK019');

  const panel = ctx.document.getElementById('remoteActionSheet');
  assert.ok(panel.innerHTML.includes('fault-sheet-panel'));
  assert.ok(!panel.innerHTML.includes('fault-desktop-dialog'));
});

test('交互模式：状态记录页应区分桌面与移动样式', () => {
  const desktopCtx = loadFaultContext({ innerWidth: 1366 });
  desktopCtx.openStatusRecords('RCK019');
  const desktopPage = desktopCtx.document.getElementById('statusRecordPage');
  assert.strictEqual(desktopPage.classList.contains('desktop-mode'), true);
  assert.ok(desktopPage.innerHTML.includes('status-page-shell'));

  const mobileCtx = loadFaultContext({ innerWidth: 390 });
  mobileCtx.openStatusRecords('RCK019');
  const mobilePage = mobileCtx.document.getElementById('statusRecordPage');
  assert.strictEqual(mobilePage.classList.contains('desktop-mode'), false);
});

test('交互模式：桌面端状态记录应支持点击遮罩关闭', () => {
  const ctx = loadFaultContext({ innerWidth: 1366 });
  ctx.openStatusRecords('RCK019');
  const page = ctx.document.getElementById('statusRecordPage');

  assert.strictEqual(typeof page.onclick, 'function');
  page.onclick({ target: page });
  assert.strictEqual(page.classList.contains('active'), false);
});
