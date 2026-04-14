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
    console.error(error.message);
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

function createStorageMock(initialEntries = {}) {
  const store = new Map(
    Object.entries(initialEntries).map(([key, value]) => [key, String(value)])
  );

  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
    __store: store
  };
}

const html = fs.readFileSync(path.join(__dirname, '..', 'materials.html'), 'utf8');
const materialsOrdersHtml = fs.readFileSync(path.join(__dirname, '..', 'materials-orders.html'), 'utf8');
const materialsRefillHtml = fs.readFileSync(path.join(__dirname, '..', 'materials-refill.html'), 'utf8');

test('物料页：应支持从 URL device 参数恢复设备', () => {
  assert.ok(/new URLSearchParams\(window\.location\.search \|\| ''\)/.test(html));
  assert.ok(/params\.get\('device'\)/.test(html));
  assert.ok(/currentDevice = resolveInitialDevice\(\)/.test(html));
});

test('物料页：设备来源不在默认列表时应加入下拉选项', () => {
  assert.ok(/function\s+loadDeviceOptionsFromStorage\s*\(/.test(html));
  assert.ok(/localStorage\.getItem\('devicesData'\)/.test(html));
  assert.ok(/function\s+rebuildDeviceSearchData\s*\(/.test(html));
  assert.ok(/if \(!allDeviceOptions\.includes\(currentDevice\)\)/.test(html));
  assert.ok(/allDeviceOptions\.unshift\(currentDevice\)/.test(html));
});

test('物料页：设备标题应同步展示点位信息', () => {
  assert.ok(/function\s+buildRuntimeLocationMap\s*\(/.test(html));
  assert.ok(/function\s+resolveDeviceLocationName\s*\(/.test(html));
  assert.ok(/runtimeLocationMap\[locationCode\]/.test(html));
  assert.ok(/function\s+syncDeviceContext\s*\(deviceId\)\s*\{[\s\S]*boardDeviceLocation/.test(html));
  assert.ok(/id="boardDeviceLocation"/.test(html));
});

test('物料页：桌面端应提供统一工具栏与设备摘要区', () => {
  assert.ok(/class="desktop-toolbar"/.test(html));
  assert.ok(/class="toolbar-device-switcher"/.test(html));
  assert.ok(/class="toolbar-actions"/.test(html));
  assert.ok(/class="board-summary-stats"/.test(html));
  assert.ok(/class="summary-stat"/.test(html));
});

test('物料页：应在测试阶段一次性清空旧运维记录，避免串历史数据', () => {
  assert.ok(/function\s+resetMaintenanceRecordsForTesting\s*\(/.test(html));
  assert.ok(/localStorage\.removeItem\('deviceMaintenanceRecords'\)/.test(html));
  assert.ok(/localStorage\.setItem\('maintenanceRecordsResetToken'/.test(html));
  assert.ok(/resetMaintenanceRecordsForTesting\(\);\s*currentDevice = resolveInitialDevice\(\);/.test(html));
});

test('物料页：确认补充后应写入设备运维记录', () => {
  assert.ok(/function\s+createRefillMaintenanceRecord\s*\(/.test(html));
  assert.ok(/localStorage\.setItem\('deviceMaintenanceRecords'/.test(html));
  assert.ok(/type:\s*'补料'/.test(html));
  assert.ok(/operatorName:\s*operator\.operatorName/.test(html));
  assert.ok(/operatorPhone:\s*operator\.operatorPhone/.test(html));
  assert.ok(/maintainerName:\s*operator\.operatorName/.test(html));
  assert.ok(/maintainerPhone:\s*operator\.operatorPhone/.test(html));
  assert.ok(/createRefillMaintenanceRecord\(material,\s*oldRemaining,\s*nextCurrent\)/.test(html));
});

test('物料页：写入运维记录前应补齐运维人员和电话字段', () => {
  assert.ok(/function\s+pickFirstValidValue\s*\(/.test(html));
  assert.ok(/function\s+resolveOperatorByDevice\s*\(deviceId\)\s*\{[\s\S]*entryInfo\.operatorPhone[\s\S]*entryInfo\.mobile/.test(html));
  assert.ok(/const\s+normalizedRecord\s*=\s*\{[\s\S]*operatorName:\s*normalizedOperatorName[\s\S]*operatorPhone:\s*normalizedOperatorPhone/.test(html));
  assert.ok(/operator:\s*normalizedOperatorName/.test(html));
  assert.ok(/phone:\s*normalizedOperatorPhone/.test(html));
});

test('物料页：补充弹窗中当前量仅允许整数', () => {
  assert.ok(/id="adjustCurrent"[^>]*step="1"/.test(html));
  assert.ok(/if\s*\(!Number\.isInteger\(nextCurrent\)\)/.test(html));
});

test('物料页：桌面物料卡片应拆分为头部主体和底部状态区', () => {
  assert.ok(/class="material-card-head"/.test(html));
  assert.ok(/class="material-card-body"/.test(html));
  assert.ok(/class="material-card-footer"/.test(html));
  assert.ok(/class="stock-metrics"/.test(html));
  assert.ok(/class="threshold-meta"/.test(html));
});

test('物料页：桌面卡片应优先采用五列后台布局', () => {
  assert.ok(/\.materials-grid\s*\{[\s\S]*grid-template-columns:\s*repeat\(5,\s*minmax\(0,\s*1fr\)\);/.test(html));
  assert.ok(/@media\s*\(max-width:\s*1680px\)\s*\{[\s\S]*\.materials-grid\s*\{[\s\S]*repeat\(4,\s*minmax\(0,\s*1fr\)\);/.test(html));
  assert.ok(/@media\s*\(max-width:\s*1480px\)\s*\{[\s\S]*\.materials-grid\s*\{[\s\S]*repeat\(3,\s*minmax\(220px,\s*1fr\)\);/.test(html));
  assert.ok(/\.materials-grid\s*\{[\s\S]*gap:\s*8px;/.test(html));
});

test('物料页：五列卡片应将状态与操作重排为更紧凑的组合', () => {
  assert.ok(/class="material-card-title-row"/.test(html));
  assert.ok(/class="material-meta-row"/.test(html));
  assert.ok(!/class="material-meta-chip"/.test(html));
  assert.ok(/class="material-card-footer">[\s\S]*class="card-actions"/.test(html));
  assert.ok(!/detail-mini-btn/.test(html));
  assert.ok(!/use-text/.test(html));
  assert.ok(/\.card-actions\s*\{[\s\S]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);/.test(html));
  assert.ok(/@media\s*\(max-width:\s*768px\)\s*\{[\s\S]*\.card-actions\s*\{[\s\S]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);/.test(html));
});

test('物料页：补充按钮应作为主操作，发货按钮应降为次操作', () => {
  const sharedButtonBlock = html.match(/\.ship-btn,\s*[\s\S]*?\.refill-btn\s*\{([^}]*)\}/);
  const shipBlock = html.match(/(?:^|\n)\s*\.ship-btn\s*\{([^}]*)\}/m);
  const shipHoverBlock = html.match(/(?:^|\n)\s*\.ship-btn:hover\s*\{([^}]*)\}/m);
  const refillBlocks = Array.from(html.matchAll(/(?:^|\n)\s*\.refill-btn\s*\{([^}]*)\}/gm));
  const refillHoverBlock = html.match(/(?:^|\n)\s*\.refill-btn:hover\s*\{([^}]*)\}/m);
  const refillBlock = refillBlocks.find((match) => /border:/.test(match[1]));

  assert.ok(sharedButtonBlock && shipBlock && shipHoverBlock && refillBlock && refillHoverBlock);
  assert.ok(/border-radius:\s*14px;/.test(sharedButtonBlock[1]));
  assert.ok(/border:\s*1px solid #cbd5e1;/.test(shipBlock[1]));
  assert.ok(/background:\s*#f8fafc;/.test(shipBlock[1]));
  assert.ok(/color:\s*#475569;/.test(shipBlock[1]));
  assert.ok(/border-color:\s*#94a3b8;/.test(shipHoverBlock[1]));
  assert.ok(/background:\s*#eef2f7;/.test(shipHoverBlock[1]));
  assert.ok(/border:\s*1px solid var\(--primary\);/.test(refillBlock[1]));
  assert.ok(/background:\s*linear-gradient\(135deg,\s*var\(--primary\)\s*0%,\s*#6adbd3\s*100%\);/.test(refillBlock[1]));
  assert.ok(/color:\s*#fff;/.test(refillBlock[1]));
  assert.ok(/box-shadow:\s*0 10px 18px rgba\(78,\s*205,\s*196,\s*0\.28\);/.test(refillBlock[1]));
  assert.ok(/box-shadow:\s*0 12px 22px rgba\(78,\s*205,\s*196,\s*0\.34\);/.test(refillHoverBlock[1]));
  assert.ok(/transform:\s*translateY\(-1px\);/.test(refillHoverBlock[1]));
  assert.ok(/color:\s*#fff;/.test(refillHoverBlock[1]));
});

test('物料页：桌面端应继续压缩为更强运营后台密度', () => {
  assert.ok(/\.board\s*\{[\s\S]*padding:\s*16px;/.test(html));
  assert.ok(/\.desktop-toolbar\s*\{[\s\S]*padding:\s*12px 14px;/.test(html));
  assert.ok(/\.board-device-code\s*\{[\s\S]*font-size:\s*32px;/.test(html));
  assert.ok(/\.material-card\s*\{[\s\S]*min-height:\s*144px;/.test(html));
  assert.ok(/\.ship-btn,\s*[\s\S]*\.refill-btn\s*\{[\s\S]*min-height:\s*28px;/.test(html));
  assert.ok(/\.stock-line-value strong\s*\{[\s\S]*font-size:\s*22px;/.test(html));
});

test('物料页：应按固定 6 个货道大类顺序分组展示看板', () => {
  const orderMatch = html.match(/const\s+LANE_GROUP_ORDER\s*=\s*\[([\s\S]*?)\];/);
  assert.ok(orderMatch, '缺少 LANE_GROUP_ORDER');
  const categories = Array.from(orderMatch[1].matchAll(/'([^']+)'/g)).map(item => item[1]);
  assert.deepStrictEqual(categories, [
    '咖啡豆仓',
    '牛奶&水',
    '糖浆',
    '前后道粉',
    '包材',
    '制冰机'
  ]);
  assert.ok(/function\s+resolveLaneBoardGroup\s*\(/.test(html));
  assert.ok(/function\s+buildLaneGroupSections\s*\(/.test(html));
});

test('物料页：有数据的货道分组应排在空分组前面，但各自内部保持原顺序', () => {
  assert.ok(/const\s+nonEmptyGroups\s*=\s*groups\.filter\(group\s*=>\s*group\.items\.length\s*>\s*0\)/.test(html));
  assert.ok(/const\s+emptyGroups\s*=\s*groups\.filter\(group\s*=>\s*!group\.items\.length\)/.test(html));
  assert.ok(/return\s+nonEmptyGroups\.concat\(emptyGroups\)/.test(html));
});

test('物料页：卡片应展示货道名称、关联物料名称和商品编码，同时保留内部物料 code 作为行为标识', () => {
  assert.ok(/laneName:\s*"/.test(html));
  assert.ok(/materialName:\s*"/.test(html));
  assert.ok(/materialCode:\s*"/.test(html));
  assert.ok(/<h3 class="material-name">\$\{item\.laneName\}<\/h3>/.test(html));
  assert.ok(/关联物料：\$\{item\.materialName/.test(html));
  assert.ok(/商品编码：\$\{item\.materialCode\s*\|\|\s*item\.materialNumber\s*\|\|\s*item\.code\}/.test(html));
  assert.ok(/goToRefillPage\('\$\{item\.code\}'\)/.test(html));
  assert.ok(/openRefillModal\('\$\{item\.code\}'\)/.test(html));
});

test('物料页：看板区应渲染货道分组区块和空分组提示，而不是单一混排网格', () => {
  assert.ok(/id="materialsSections"/.test(html));
  assert.ok(/class="materials-sections"/.test(html));
  assert.ok(/class="materials-category-section"/.test(html));
  assert.ok(/class="materials-category-head"/.test(html));
  assert.ok(/class="materials-category-title"/.test(html));
  assert.ok(/class="materials-category-empty"/.test(html));
  assert.ok(html.includes('当前设备暂无此类物料'));
});

test('物料页：移动端也应完整展示全部货道分组，而不是改成锚点或折叠模式', () => {
  assert.ok(/@media\s*\(max-width:\s*768px\)\s*\{[\s\S]*\.materials-sections\s*\{/.test(html));
  assert.ok(/@media\s*\(max-width:\s*768px\)\s*\{[\s\S]*\.materials-grid\s*\{[\s\S]*grid-template-columns:\s*1fr;/.test(html));
  assert.ok(!/materials-category-anchor/.test(html));
  assert.ok(!/materials-category-collapse/.test(html));
});

test('物料页：发货清单入口应跳转到运维清单页面', () => {
  assert.ok(/function goToOrdersList\(\)\s*\{[\s\S]*window\.location\.href = '\/materials-orders\.html\?from=materials';/.test(html));
});

test('物料页：发货跳转前应写入来源感知返回上下文', () => {
  assert.ok(/function\s+persistShipmentReturnContext\s*\(materialCode\s*=\s*null\)/.test(html));
  assert.ok(/sessionStorage\.setItem\('materialsShipmentReturnContext',\s*JSON\.stringify\(payload\)\)/.test(html));
  assert.ok(/source:\s*'materials'/.test(html));
  assert.ok(/deviceId:\s*currentDevice/.test(html));
  assert.ok(/laneName:\s*matchedLane\?\.laneName\s*\|\|\s*null/.test(html));
  assert.ok(/materialCode:\s*materialCode\s*\|\|\s*null/.test(html));
  assert.ok(/persistShipmentReturnContext\(materialCode\);[\s\S]*window\.location\.href = 'materials-refill\.html';/.test(html));
});

test('物料页：编辑货道名称应由独立权限控制', () => {
  assert.ok(html.includes('<script src="shared/admin-staff-access.js"></script>'));
  assert.ok(/ops\.materials\.laneNameEdit/.test(html));
  assert.ok(/function\s+canEditLaneName\s*\(/.test(html));
  assert.ok(/编辑货道名称/.test(html));
  assert.ok(/document\.getElementById\('laneNameModalTitle'\)\.textContent = '编辑货道名称';/.test(html));
});

test('运维清单页面：标题与标签应为运维清单视图，而不是订单页', () => {
  assert.ok(/<h1 class="header-title">运维清单<\/h1>/.test(materialsOrdersHtml));
  assert.ok(materialsOrdersHtml.includes('全部发货单'));
  assert.ok(materialsOrdersHtml.includes('我的发货单'));
  assert.ok(!materialsOrdersHtml.includes('其他发货单'));
  assert.ok(!materialsOrdersHtml.includes('待处理'));
  assert.ok(!materialsOrdersHtml.includes('历史清单'));
  assert.ok(!materialsOrdersHtml.includes('订单管理 - 运营控制台'));
  assert.ok(!materialsOrdersHtml.includes('<h1 class="header-title">订单</h1>'));
});

test('补充物料页：提交后应返回运维清单页面入口', () => {
  assert.ok(materialsRefillHtml.includes("window.location.href = '/materials-orders.html?from=materials';"));
});

test('补充物料页：返回按钮应优先使用来源感知上下文，而不是固定返回', () => {
  assert.ok(/function\s+readMaterialsShipmentReturnContext\s*\(\)/.test(materialsRefillHtml));
  assert.ok(/function\s+buildMaterialsReturnUrl\s*\(\)/.test(materialsRefillHtml));
  assert.ok(/function\s+goBack\s*\(\)\s*\{[\s\S]*window\.location\.href = buildMaterialsReturnUrl\(\);/.test(materialsRefillHtml));
  assert.ok(/sessionStorage\.getItem\('materialsShipmentReturnContext'\)/.test(materialsRefillHtml));
  assert.ok(/return\s+`materials\.html\?device=\$\{encodeURIComponent\(context\.deviceId\)\}`;/.test(materialsRefillHtml));
});

test('补充物料页：生成发货单时应写入当前申请人的姓名和手机号', () => {
  assert.ok(/const\s+SIDEBAR_LOGIN_PROFILE_KEY\s*=\s*'sidebarLoginProfile';/.test(materialsRefillHtml));
  assert.ok(/const\s+LOGIN_SESSION_KEY\s*=\s*'cofeLoginSession';/.test(materialsRefillHtml));
  assert.ok(/function\s+getCurrentRequesterProfile\s*\(\)/.test(materialsRefillHtml));
  assert.ok(/requestedBy:\s*requester\.name/.test(materialsRefillHtml));
  assert.ok(/requestedByPhone:\s*requester\.phone/.test(materialsRefillHtml));
});

test('补充物料页：来自卡片补充时应默认定位到对应物料', () => {
  assert.ok(/data-material-code="\$\{item\.code\}"/.test(materialsRefillHtml));
});

test('补充物料页：应在保留物料池结构的同时轻量展示来源货道名称', () => {
  assert.ok(/来源货道/.test(materialsRefillHtml));
  assert.ok(/laneName/.test(materialsRefillHtml));
  assert.ok(/id="sourceLaneContext"/.test(materialsRefillHtml));
});

test('补充物料页：列表、已选清单和确认摘要都应优先展示商品编码，并在有来源货道时带出货道名称', () => {
  assert.ok(/materialNumber/.test(materialsRefillHtml));
  assert.ok(/商品编码：\$\{item\.materialNumber\s*\|\|\s*item\.code\}/.test(materialsRefillHtml));
  assert.ok(/class="selected-item-code">商品编码：\$\{item\.materialNumber\s*\|\|\s*item\.code\}<\/div>/.test(materialsRefillHtml));
  assert.ok(/class="summary-item-code">商品编码：\$\{item\.materialNumber\s*\|\|\s*item\.code\}<\/span>/.test(materialsRefillHtml));
  assert.ok(/laneName:\s*activeLaneContext && activeLaneContext\.materialCode === item\.code\s*\?\s*activeLaneContext\.laneName\s*:\s*''/.test(materialsRefillHtml));
  assert.ok(/code:\s*item\.code,[\s\S]*materialNumber:\s*item\.materialNumber\s*\|\|\s*item\.code[\s\S]*laneName:/.test(materialsRefillHtml));
});

test('补充物料页：物料池应按 Excel 入库清单重做 mock', () => {
  assert.ok(materialsRefillHtml.includes('君乐宝牛奶（10L箱）'));
  assert.ok(materialsRefillHtml.includes('16oz纸杯(鹿森)'));
  assert.ok(materialsRefillHtml.includes('机压杯盖'));
  assert.ok(materialsRefillHtml.includes('白色杯套'));
  assert.ok(materialsRefillHtml.includes('EVEBOT拉花机墨盒'));
  assert.ok(/\["01020111",\s*"16oz纸杯\(鹿森\)"/.test(materialsRefillHtml));
  assert.ok(/\["01010407014",\s*"好成香草糖浆"/.test(materialsRefillHtml));
});

test('补充物料页：Excel 清单应先通过主数据数组和分类映射再生成当前分组数据', () => {
  assert.ok(/const\s+REFILL_CATEGORY_ORDER\s*=\s*\[/.test(materialsRefillHtml));
  assert.ok(/const\s+REFILL_MATERIAL_MASTER_DATA\s*=\s*\[/.test(materialsRefillHtml));
  assert.ok(/function\s+resolveRefillMaterialCategory\s*\(/.test(materialsRefillHtml));
  assert.ok(/function\s+buildRefillMaterialsData\s*\(/.test(materialsRefillHtml));
  assert.ok(/const\s+materialsData\s*=\s*buildRefillMaterialsData\(REFILL_MATERIAL_MASTER_DATA\);/.test(materialsRefillHtml));
});

test('补充物料页：列表仅展开当前分类，其他分类默认收起', () => {
  assert.ok(/const\s+activeList\s*=\s*materialsData\[currentCategory\]\s*\|\|\s*\[\];/.test(materialsRefillHtml));
  const renderMatch = materialsRefillHtml.match(/function\s+renderMaterials\s*\(\)\s*\{([\s\S]*?)\n\s*\}/);
  assert.ok(renderMatch && renderMatch[1], '未找到 renderMaterials 函数');
  assert.ok(!/Object\.keys\(materialsData\)\.forEach\(/.test(renderMatch[1]));
});

test('补充物料页：已添加物料应有独立颜色态，并跟随数量变化', () => {
  assert.ok(/\.material-item\.selected\s*\{/.test(materialsRefillHtml));
  assert.ok(/\$\{qty > 0 \? 'selected' : ''\}/.test(materialsRefillHtml));
  assert.ok(/row\.classList\.toggle\('selected',\s*validQty > 0\)/.test(materialsRefillHtml));
});

test('补充物料页：预选物料应聚焦到物料行', () => {
  assert.ok(/tabindex="-1"/.test(materialsRefillHtml));
  assert.ok(/row\.focus\(\{\s*preventScroll:\s*true\s*\}\)/.test(materialsRefillHtml));
});

test('补充物料页：配送时间应按固定天数选项选择', () => {
  assert.ok(materialsRefillHtml.includes('id="deliveryDateOption"'));
  assert.ok(/const\s+DELIVERY_DAY_OFFSETS\s*=\s*\[\s*1,\s*3,\s*5,\s*8,\s*10,\s*12\s*\];/.test(materialsRefillHtml));
  assert.ok(/function\s+populateDeliveryDateOptions\s*\(\)/.test(materialsRefillHtml));
  assert.ok(/document\.getElementById\('deliveryDateOption'\)/.test(materialsRefillHtml));
});

test('补充物料页：确认生成时应使用配送日期选项构造时间', () => {
  assert.ok(/const\s+deliveryDateValue\s*=\s*document\.getElementById\('deliveryDateOption'\)\.value;/.test(materialsRefillHtml));
  assert.ok(/const\s+deliveryDateObj\s*=\s*new Date\(year,\s*month - 1,\s*day,\s*9,\s*0,\s*0\);/.test(materialsRefillHtml));
  assert.ok(/const\s+deliveryTime\s*=\s*deliveryDateObj\.toISOString\(\);/.test(materialsRefillHtml));
});

test('补充物料页：设备与点位口径应对齐现有物料页数据', () => {
  assert.ok(/'RCK111': '徐汇区 漕河泾创新园'/.test(materialsRefillHtml));
  assert.ok(/'RCK112': '浦东新区 张江创智天地'/.test(materialsRefillHtml));
  assert.ok(/'RCK113': '静安区 南京西路商圈'/.test(materialsRefillHtml));
  assert.ok(!/'RCK111': '上海市中心店'/.test(materialsRefillHtml));
});

test('运维清单页面：应提供桌面端优化布局', () => {
  assert.ok(/@media\s*\(min-width:\s*1200px\)/.test(materialsOrdersHtml));
  assert.ok(/\.desktop-table-head\s*\{[\s\S]*grid-template-columns:\s*1\.1fr 1fr 1fr \.8fr 2fr \.7fr 1\.2fr \.9fr;/.test(materialsOrdersHtml));
  assert.ok(/\.order-desktop-row\s*\{[\s\S]*grid-template-columns:\s*1\.1fr 1fr 1fr \.8fr 2fr \.7fr 1\.2fr \.9fr;/.test(materialsOrdersHtml));
  assert.ok(/list\.innerHTML\s*=\s*`\s*<div class="desktop-table-head">/.test(materialsOrdersHtml));
  assert.ok(/<div class="order-desktop-row">/.test(materialsOrdersHtml));
  assert.ok(/\.order-mobile-block\s*\{[\s\S]*display:\s*none;/.test(materialsOrdersHtml));
});

test('运维清单页面：列表与详情应显示商品编码，并在有上下文时轻量展示货道名称', () => {
  assert.ok(/const\s+ORDER_MATERIAL_NUMBER_MAP\s*=\s*\{/.test(materialsOrdersHtml));
  assert.ok(/materialNumber:\s*item\.materialNumber\s*\|\|\s*ORDER_MATERIAL_NUMBER_MAP\[item\.code\]\s*\|\|\s*item\.code/.test(materialsOrdersHtml));
  assert.ok(/class="desktop-item-code">商品编码：\$\{item\.materialNumber\s*\|\|\s*item\.code\}<\/span>/.test(materialsOrdersHtml));
  assert.ok(/class="order-item-code">商品编码：\$\{item\.materialNumber\s*\|\|\s*item\.code\}<\/span>/.test(materialsOrdersHtml));
  assert.ok(/class="detail-item-code">商品编码：\$\{item\.materialNumber\s*\|\|\s*item\.code\}<\/div>/.test(materialsOrdersHtml));
  assert.ok(/laneName/.test(materialsOrdersHtml));
  assert.ok(/货道名称/.test(materialsOrdersHtml));
});

test('运维清单页面：默认 mock 发货单物料应改成现有带编号的物料', () => {
  assert.ok(/materialNumber:\s*'01020111'/.test(materialsOrdersHtml));
  assert.ok(/materialNumber:\s*'01020304'/.test(materialsOrdersHtml));
  assert.ok(/materialNumber:\s*'01010501'/.test(materialsOrdersHtml));
  assert.ok(/materialNumber:\s*'01010407014'/.test(materialsOrdersHtml));
  assert.ok(!/code:\s*'cup-mid'/.test(materialsOrdersHtml));
  assert.ok(!/code:\s*'straw'/.test(materialsOrdersHtml));
  assert.ok(!/code:\s*'bean-light'/.test(materialsOrdersHtml));
});

test('运维清单页面：旧版占位 mock 缓存应自动迁移成新的带编号物料', () => {
  assert.ok(/const\s+LEGACY_SAMPLE_ORDER_SET_BY_CODE\s*=\s*\{/.test(materialsOrdersHtml));
  assert.ok(/'cup-mid':\s*'hotSell'/.test(materialsOrdersHtml));
  assert.ok(/'bean-light':\s*'inventory'/.test(materialsOrdersHtml));
  assert.ok(/const\s+itemsForNormalization\s*=\s*legacySampleGroup[\s\S]*cloneSampleOrderItems/.test(materialsOrdersHtml));
  assert.ok(/if\s*\(hasLegacyMigration\)\s*\{[\s\S]*localStorage\.setItem\('materialOrders',\s*JSON\.stringify\(normalizedOrders\)\);/.test(materialsOrdersHtml));
});

test('运维清单页面：设备点位 mock 和旧缓存迁移应对齐现有物料页数据', () => {
  assert.ok(/const\s+CURRENT_DEVICE_LOCATION_MAP\s*=\s*\{[\s\S]*'RCK111':\s*'徐汇区 漕河泾创新园'/.test(materialsOrdersHtml));
  assert.ok(/'RCK112':\s*'浦东新区 张江创智天地'/.test(materialsOrdersHtml));
  assert.ok(/'RCK113':\s*'静安区 南京西路商圈'/.test(materialsOrdersHtml));
  assert.ok(/deviceId:\s*'RCK111'[\s\S]*location:\s*CURRENT_DEVICE_LOCATION_MAP\.RCK111/.test(materialsOrdersHtml));
  assert.ok(/deviceId:\s*'RCK112'[\s\S]*location:\s*CURRENT_DEVICE_LOCATION_MAP\.RCK112/.test(materialsOrdersHtml));
  assert.ok(/deviceId:\s*'RCK113'[\s\S]*location:\s*CURRENT_DEVICE_LOCATION_MAP\.RCK113/.test(materialsOrdersHtml));
  assert.ok(/const\s+LEGACY_SAMPLE_DEVICE_MAP\s*=\s*\{/.test(materialsOrdersHtml));
  assert.ok(/'VM-A12':\s*\{\s*deviceId:\s*'RCK111'[\s\S]*'VM-B07':\s*\{\s*deviceId:\s*'RCK112'/.test(materialsOrdersHtml));
});

test('运维清单页面：不应在这里处理完成状态，而应提供作废和打印能力', () => {
  assert.ok(!/function\s+completeOrder\s*\(/.test(materialsOrdersHtml));
  assert.ok(!/标记完成/.test(materialsOrdersHtml));
  assert.ok(!/>完成</.test(materialsOrdersHtml));
  assert.ok(/function\s+voidOrder\s*\(orderId\)/.test(materialsOrdersHtml));
  assert.ok(/function\s+printOrder\s*\(orderId\)/.test(materialsOrdersHtml));
  assert.ok(/作废/.test(materialsOrdersHtml));
  assert.ok(/打印发货单/.test(materialsOrdersHtml));
});

test('运维清单页面：作废只允许当前用户处理自己的待发货单', () => {
  assert.ok(/function\s+getCurrentRequesterProfile\s*\(\)/.test(materialsOrdersHtml));
  assert.ok(/function\s+isOwnOrder\s*\(order,\s*requester\s*=\s*currentRequesterProfile\)/.test(materialsOrdersHtml));
  assert.ok(/function\s+canVoidOrder\s*\(order,\s*requester\s*=\s*currentRequesterProfile\)/.test(materialsOrdersHtml));
  assert.ok(/order\.status\s*===\s*'pending'/.test(materialsOrdersHtml));
  assert.ok(/requestedByPhone/.test(materialsOrdersHtml));
});

test('运维清单页面：作废时应要求填写作废原因，并在详情与打印中展示', () => {
  assert.ok(/window\.prompt\('请输入作废原因'/.test(materialsOrdersHtml));
  assert.ok(/voidedReason:\s*order\.voidedReason\s*\|\|\s*''/.test(materialsOrdersHtml));
  assert.ok(/currentOrders\[orderIndex\]\.voidedReason\s*=\s*voidedReason/.test(materialsOrdersHtml));
  assert.ok(/作废原因/.test(materialsOrdersHtml));
  assert.ok(/voidedReason/.test(materialsOrdersHtml));
});

test('运维清单页面：全部发货单标签应按权限控制，无权限时隐藏', () => {
  assert.ok(materialsOrdersHtml.includes('<script src="shared/admin-staff-access.js"></script>'));
  assert.ok(/function\s+resolveCurrentOrdersAccess\s*\(\)/.test(materialsOrdersHtml));
  assert.ok(/ops\.orders/.test(materialsOrdersHtml));
  assert.ok(/function\s+canViewAllOrdersTab\s*\(/.test(materialsOrdersHtml));
  assert.ok(/allOrdersTab/.test(materialsOrdersHtml));
  assert.ok(/style\.display\s*=\s*'none'/.test(materialsOrdersHtml));
});

test('运维清单页面：筛选应收敛为我的发货单与全部发货单双标签', () => {
  assert.ok(/id="allOrdersTab"[\s\S]*switchTab\('all'\)/.test(materialsOrdersHtml));
  assert.ok(/<span>全部发货单<\/span>/.test(materialsOrdersHtml));
  assert.ok(/id="myOrdersTab"[\s\S]*switchTab\('mine'\)/.test(materialsOrdersHtml));
  assert.ok(/<span>我的发货单<\/span>/.test(materialsOrdersHtml));
  assert.ok(!/switchTab\('others'\)/.test(materialsOrdersHtml));
  assert.ok(!/currentFilter === 'others'/.test(materialsOrdersHtml));
  assert.ok(!/暂无其他发货单/.test(materialsOrdersHtml));
});

test('运维清单页面：全部发货单应表示当前权限范围内可见的全部单据', () => {
  assert.ok(/function\s+canAccessOrderInScope\s*\(/.test(materialsOrdersHtml));
  assert.ok(/function\s+getVisibleOrdersByFilter\s*\(filter = currentFilter\)\s*\{[\s\S]*filter === 'mine'[\s\S]*return currentOrders\.filter\(order => canAccessOrderInScope\(order\)\);/.test(materialsOrdersHtml));
  assert.ok(/if \(filter === 'all' && !canViewAllOrdersTab\(\)\)\s*\{[\s\S]*currentFilter = 'mine';/.test(materialsOrdersHtml) || /if \(currentFilter === 'all' && !showAllOrdersTab\) \{[\s\S]*currentFilter = 'mine';/.test(materialsOrdersHtml));
});

test('运维清单页面：仅在存在来源上下文时显示返回物料页入口', () => {
  assert.ok(/id="materialsReturnBtn"/.test(materialsOrdersHtml));
  assert.ok(/返回物料页/.test(materialsOrdersHtml));
  assert.ok(/onclick="returnToMaterialsPage\(\)"/.test(materialsOrdersHtml));
  assert.ok(/function\s+syncMaterialsReturnEntry\s*\(\)/.test(materialsOrdersHtml));
  assert.ok(/button\.style\.display\s*=\s*hasContext\s*\?\s*''\s*:\s*'none'/.test(materialsOrdersHtml));
});

test('运行时：物料页发货跳转前应写入来源感知返回上下文', () => {
  const sessionStorage = createStorageMock();
  const location = { href: 'materials.html' };
  const sandbox = {
    console,
    JSON,
    currentDevice: 'RCK112',
    materialsData: [
      { code: '20010002', laneName: '香草糖浆-2' }
    ],
    sessionStorage,
    window: { location }
  };

  vm.createContext(sandbox);
  vm.runInContext(extractFunctionSource(html, 'persistShipmentReturnContext'), sandbox);
  vm.runInContext(extractFunctionSource(html, 'goToRefillPage'), sandbox);

  sandbox.goToRefillPage('20010002');

  assert.strictEqual(location.href, 'materials-refill.html');
  assert.strictEqual(sessionStorage.getItem('currentDevice'), 'RCK112');
  assert.strictEqual(sessionStorage.getItem('preselectMaterial'), '20010002');
  assert.deepStrictEqual(JSON.parse(sessionStorage.getItem('materialsShipmentReturnContext')), {
    source: 'materials',
    deviceId: 'RCK112',
    laneName: '香草糖浆-2',
    materialCode: '20010002'
  });
});

test('运行时：补充物料页返回应优先恢复来源设备上下文', () => {
  const sessionStorage = createStorageMock({
    materialsShipmentReturnContext: JSON.stringify({
      source: 'materials',
      deviceId: 'RCK113',
      laneName: '榛果糖浆-3',
      materialCode: '20010003'
    })
  });
  const location = { href: 'materials-refill.html' };
  const sandbox = {
    console,
    JSON,
    encodeURIComponent,
    sessionStorage,
    window: { location }
  };

  vm.createContext(sandbox);
  vm.runInContext(extractFunctionSource(materialsRefillHtml, 'readMaterialsShipmentReturnContext'), sandbox);
  vm.runInContext(extractFunctionSource(materialsRefillHtml, 'buildMaterialsReturnUrl'), sandbox);
  vm.runInContext(extractFunctionSource(materialsRefillHtml, 'goBack'), sandbox);

  sandbox.goBack();

  assert.strictEqual(location.href, 'materials.html?device=RCK113');
});

test('运行时：运维清单页应按来源上下文切换返回物料页入口显示', () => {
  const button = { style: { display: 'none' } };
  const document = {
    getElementById(id) {
      return id === 'materialsReturnBtn' ? button : null;
    }
  };
  const sessionStorage = createStorageMock({
    materialsShipmentReturnContext: JSON.stringify({
      source: 'materials',
      deviceId: 'RCK111'
    })
  });
  const sandbox = {
    console,
    JSON,
    document,
    sessionStorage
  };

  vm.createContext(sandbox);
  vm.runInContext(extractFunctionSource(materialsOrdersHtml, 'readMaterialsShipmentReturnContext'), sandbox);
  vm.runInContext(extractFunctionSource(materialsOrdersHtml, 'syncMaterialsReturnEntry'), sandbox);

  sandbox.syncMaterialsReturnEntry();
  assert.strictEqual(button.style.display, '');

  sessionStorage.removeItem('materialsShipmentReturnContext');
  sandbox.syncMaterialsReturnEntry();
  assert.strictEqual(button.style.display, 'none');
});

test('运行时：运维清单页返回物料页时应恢复设备上下文并清理来源上下文', () => {
  const sessionStorage = createStorageMock({
    materialsShipmentReturnContext: JSON.stringify({
      source: 'materials',
      deviceId: 'RCK111',
      materialCode: '81020100'
    })
  });
  const location = { href: 'materials-orders.html?from=materials' };
  const sandbox = {
    console,
    JSON,
    encodeURIComponent,
    sessionStorage,
    window: { location }
  };

  vm.createContext(sandbox);
  vm.runInContext(extractFunctionSource(materialsOrdersHtml, 'readMaterialsShipmentReturnContext'), sandbox);
  vm.runInContext(extractFunctionSource(materialsOrdersHtml, 'buildMaterialsReturnUrl'), sandbox);
  vm.runInContext(extractFunctionSource(materialsOrdersHtml, 'clearMaterialsShipmentReturnContext'), sandbox);
  vm.runInContext(extractFunctionSource(materialsOrdersHtml, 'returnToMaterialsPage'), sandbox);

  sandbox.returnToMaterialsPage();

  assert.strictEqual(location.href, 'materials.html?device=RCK111');
  assert.strictEqual(sessionStorage.getItem('currentDevice'), 'RCK111');
  assert.strictEqual(sessionStorage.getItem('materialsShipmentReturnContext'), null);
});
