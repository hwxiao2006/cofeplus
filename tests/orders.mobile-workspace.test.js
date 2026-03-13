const assert = require('assert');
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'orders.html'), 'utf8');

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

test('移动端应提供快捷筛选栏与筛选底部弹层', () => {
  assert.ok(/class="mobile-filter-bar"/.test(html));
  assert.ok(/<div class="mobile-filter-bar">[\s\S]*openMobileFilterSheet\('status'\)[\s\S]*id="mobileQuickStatusLabel"[\s\S]*openMobileFilterSheet\('device'\)[\s\S]*id="mobileQuickDeviceLabel"[\s\S]*openMobileFilterSheet\(\)[\s\S]*>筛选<\/button>[\s\S]*<\/div>/.test(html));
  assert.ok(!/<div class="mobile-filter-bar">[\s\S]*>搜索<\/button>/.test(html), 'mobile quick bar should remove dedicated search chip');
  assert.ok(/@media\s*\(max-width:\s*1024px\)[\s\S]*\.mobile-filter-bar\s*\{[\s\S]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\);/.test(html), 'mobile quick bar should use three compact columns');
  assert.ok(/id="mobileFilterSheet"/.test(html));
  assert.ok(/筛选条件/.test(html));
  assert.ok(/应用筛选/.test(html));
});

test('移动端订单页应提供打开侧边栏的导航入口，便于跳转到设备和商品管理等页面', () => {
  assert.ok(/class="mobile-header"/.test(html), 'missing mobile header');
  assert.ok(/class="menu-btn" onclick="toggleSidebar\(\)"/.test(html), 'missing sidebar trigger button');
  assert.ok(/class="mobile-header-title"/.test(html), 'missing mobile header title');
});

test('移动端订单页不应重复显示顶部导航标题和大号页面标题', () => {
  assert.ok(/@media\s*\(max-width:\s*768px\)[\s\S]*\.header-title-row\s*\{[^}]*display:\s*none;/.test(html), 'mobile should hide duplicated orders page title');
  assert.ok(!/orders-scope-chip/.test(html), 'orders workspace chip should be removed entirely');
});

test('移动端顶部三个入口应打开不同筛选模式，而不是同一套完整内容', () => {
  assert.ok(/<div class="mobile-filter-sheet"[^>]*data-mobile-filter-mode="all"/.test(html), 'mobile filter sheet should default to full mode');
  assert.ok(/id="mobileFilterSheetTitle"/.test(html), 'missing mobile filter title node');
  assert.ok(/id="mobileFilterSheetSubtitle"/.test(html), 'missing mobile filter subtitle node');
  assert.ok(/data-mobile-filter-section="search"/.test(html), 'missing search section marker');
  assert.ok(/data-mobile-filter-section="status"/.test(html), 'missing status section marker');
  assert.ok(/data-mobile-filter-section="device"/.test(html), 'missing device section marker');
  assert.ok(/data-mobile-filter-section="date"/.test(html), 'missing date section marker');
  assert.ok(/\.mobile-filter-sheet\[data-mobile-filter-mode="status"\][\s\S]*data-mobile-filter-section="search"[\s\S]*display:\s*none;/.test(html), 'status mode should hide search section');
  assert.ok(/\.mobile-filter-sheet\[data-mobile-filter-mode="device"\][\s\S]*data-mobile-filter-section="status"[\s\S]*display:\s*none;/.test(html), 'device mode should hide status section');
  assert.ok(/\.mobile-filter-sheet\[data-mobile-filter-mode="all"\][\s\S]*data-mobile-filter-section="status"[\s\S]*display:\s*none;/.test(html), 'full filter mode should hide status section');
  assert.ok(/\.mobile-filter-sheet\[data-mobile-filter-mode="all"\][\s\S]*data-mobile-filter-section="device"[\s\S]*display:\s*none;/.test(html), 'full filter mode should hide device section');
  assert.ok(/function\s+setMobileFilterSheetMode\(mode = 'all'\)/.test(html), 'missing mobile filter mode helper');
  assert.ok(/sheetPanel\.dataset\.mobileFilterMode\s*=\s*normalizedMode/.test(html), 'sheet mode helper should update sheet dataset');
  assert.ok(/if\s*\(normalizedMode === 'status'\)[\s\S]*订单状态/.test(html), 'status mode should update title copy');
  assert.ok(/else if\s*\(normalizedMode === 'device'\)[\s\S]*选择设备/.test(html), 'device mode should update title copy');
  assert.ok(/else\s*\{[\s\S]*高级筛选/.test(html), 'full filter mode should update title or subtitle copy to advanced filtering');
});

test('移动端筛选弹层应使用固定底部操作区，避免确认按钮被内容区挤出', () => {
  assert.ok(/\.mobile-filter-sheet\s*\{[\s\S]*display:\s*flex;[\s\S]*flex-direction:\s*column;/.test(html), 'mobile filter sheet should use vertical flex layout');
  assert.ok(/\.mobile-filter-sheet-body\s*\{[\s\S]*flex:\s*1\s+1\s+auto;[\s\S]*min-height:\s*0;[\s\S]*overflow:\s*auto;/.test(html), 'mobile filter body should shrink and scroll within sheet');
  assert.ok(/\.mobile-filter-sheet-footer\s*\{[\s\S]*flex-shrink:\s*0;[\s\S]*background:\s*#ffffff;/.test(html), 'mobile filter footer should stay visible as a fixed action area');
});

test('移动端订单应改为订单流卡片并保留订单级动作', () => {
  assert.ok(/mobile-order-stream-card/.test(html));
  assert.ok(/class="mobile-card-amount"/.test(html));
  assert.ok(/退款/.test(html));
  assert.ok(/详情/.test(html));
  assert.ok(!/returnCoupon\('\$\{order\.id\}'\)/.test(html));
});

test('移动端指标卡应改为一屏一张的左右滑动布局', () => {
  assert.ok(/@media\s*\(max-width:\s*1024px\)[\s\S]*\.metrics-grid\s*\{[\s\S]*display:\s*flex;[\s\S]*overflow-x:\s*auto;[\s\S]*scroll-snap-type:\s*x\s+mandatory;/.test(html));
  assert.ok(/@media\s*\(max-width:\s*1024px\)[\s\S]*\.metric-card\s*\{[\s\S]*flex:\s*0\s+0\s+100%;[\s\S]*min-width:\s*100%;[\s\S]*max-width:\s*100%;/.test(html));
});

test('430px 及以下移动端应切换为紧凑单列卡片布局以避免横向滚动', () => {
  assert.ok(/@media\s*\(max-width:\s*430px\)[\s\S]*\.content\s*\{[\s\S]*padding:\s*6px\s+10px\s+96px;/.test(html));
  assert.ok(/@media\s*\(max-width:\s*430px\)[\s\S]*\.mobile-card-top\s*\{[\s\S]*flex-direction:\s*column;[\s\S]*gap:\s*10px;/.test(html));
  assert.ok(/@media\s*\(max-width:\s*430px\)[\s\S]*\.mobile-card-status\s*\{[\s\S]*width:\s*100%;[\s\S]*flex-direction:\s*row;[\s\S]*justify-content:\s*space-between;/.test(html));
  assert.ok(/@media\s*\(max-width:\s*430px\)[\s\S]*\.mobile-order-id\s*\{[\s\S]*white-space:\s*normal;[\s\S]*word-break:\s*break-all;/.test(html));
  assert.ok(/@media\s*\(max-width:\s*430px\)[\s\S]*\.mobile-order-meta-grid\s*\{[\s\S]*grid-template-columns:\s*1fr;/.test(html));
  assert.ok(/@media\s*\(max-width:\s*430px\)[\s\S]*\.mobile-order-meta-card:last-child\s*\{[\s\S]*grid-column:\s*auto;/.test(html));
});

test('移动端订单动作按钮应保持等宽双列，不因最后一个按钮跨行而尺寸不一致', () => {
  assert.ok(/@media\s*\(max-width:\s*768px\)[\s\S]*\.mobile-order-actions\s*\{[\s\S]*display:\s*grid;[\s\S]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);/.test(html));
  assert.ok(/@media\s*\(max-width:\s*768px\)[\s\S]*\.mobile-order-actions \.action-btn\s*\{[\s\S]*width:\s*100%;[\s\S]*height:\s*38px;/.test(html));
  assert.ok(!/@media\s*\(max-width:\s*430px\)[\s\S]*\.mobile-order-actions \.action-btn:last-child\s*\{[\s\S]*grid-column:\s*1\s*\/\s*-1;/.test(html));
  assert.ok(/\.order-card-action\.refund\s*,\s*\.btn-refund\s*\{[\s\S]*color:\s*#b42318;[\s\S]*background:\s*#fff5f5;[\s\S]*border-color:\s*#fecaca;/.test(html), 'desktop and mobile refund buttons should share the same refund styling');
});

test('不可退款时，移动端退款按钮应和桌面端一样使用统一灰态 disabled 样式', () => {
  assert.ok(/\.order-card-action:disabled,\s*\.action-btn:disabled\s*\{[\s\S]*background:\s*#f8fafc;[\s\S]*border-color:\s*rgba\(226,\s*232,\s*240,\s*0\.96\);[\s\S]*color:\s*#94a3b8;/.test(html), 'desktop and mobile disabled action buttons should share the same neutral style');
});

test('移动端订单页可见下拉应统一改为自定义底部选择器，避免原生弹层过小', () => {
  assert.ok(/id="mobileSortTrigger"/.test(html), 'missing mobile sort trigger');
  assert.ok(/id="mobileSortSheet"/.test(html), 'missing mobile sort sheet');
  assert.ok(/data-mobile-sort-option="latest"/.test(html), 'missing mobile sort option');
  assert.ok(/class="mobile-status-options"/.test(html), 'missing mobile status option group');
  assert.ok(/name="mobileStatusOption"/.test(html), 'missing mobile status radio options');
  assert.ok(/function\s+openMobileSortSheet\s*\(/.test(html), 'missing openMobileSortSheet');
  assert.ok(/function\s+selectMobileSortOption\s*\(/.test(html), 'missing selectMobileSortOption');
});

test('移动端订单工具栏汇总区应改为紧凑两层布局，不再让总金额和成功金额各占一整行', () => {
  assert.ok(/@media\s*\(max-width:\s*1024px\)[\s\S]*\.order-toolbar-summary\s*\{[^}]*display:\s*grid;[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);/.test(html), 'mobile summary should use two-column grid');
  assert.ok(/@media\s*\(max-width:\s*1024px\)[\s\S]*\.results-count\s*\{[^}]*grid-column:\s*1\s*\/\s*-1;/.test(html), 'results count should occupy the first row');
  assert.ok(/@media\s*\(max-width:\s*1024px\)[\s\S]*\.toolbar-total\s*\{[^}]*width:\s*auto;/.test(html), 'mobile toolbar totals should no longer force full-width rows');
});
