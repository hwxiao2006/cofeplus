const assert = require('assert');
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'devices.html'), 'utf8');
const restartFlowSource = fs.readFileSync(path.join(__dirname, '..', 'shared', 'fault-restart-flow.js'), 'utf8');

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

test('侧栏重启 split button 容器样式应使用品牌薄荷绿实心', () => {
  assert.ok(
    /\.detail-side-restart-split\s*\{[\s\S]*background:\s*#4ECDC4/.test(restartFlowSource),
    '.detail-side-restart-split 应为品牌薄荷绿 #4ECDC4'
  );
  assert.ok(
    /\.detail-side-restart-split\s*\{[\s\S]*border:\s*1px solid #4ECDC4/.test(restartFlowSource)
  );
  assert.ok(
    /\.detail-side-restart-split\s*\{[\s\S]*border-radius:\s*6px/.test(restartFlowSource)
  );
  assert.ok(
    /\.detail-side-restart-split\s*\{[\s\S]*box-shadow:\s*0 6px 14px rgba\(78,\s*205,\s*196,\s*0?\.28\)/.test(restartFlowSource)
  );
});

test('split button 主区 / caret 应有独立 hover 反馈', () => {
  assert.ok(/\.detail-side-restart-primary:hover\s*\{[\s\S]*background:\s*rgba\(0,\s*0,\s*0,\s*0?\.06\)/.test(restartFlowSource));
  assert.ok(/\.detail-side-restart-caret:hover\s*\{[\s\S]*background:\s*rgba\(0,\s*0,\s*0,\s*0?\.10\)/.test(restartFlowSource));
});

test('split button 主区与 caret 之间应有 1px 半透明白分隔线', () => {
  assert.ok(/\.detail-side-restart-caret\s*\{[\s\S]*border-left:\s*1px solid rgba\(255,\s*255,\s*255,\s*0?\.4\)/.test(restartFlowSource));
});

test('popover 应右对齐按钮下方 6px,带阴影', () => {
  assert.ok(/\.detail-side-restart-popover\s*\{[\s\S]*top:\s*calc\(100% \+ 6px\)/.test(restartFlowSource));
  assert.ok(/\.detail-side-restart-popover\s*\{[\s\S]*right:\s*0/.test(restartFlowSource));
  assert.ok(/\.detail-side-restart-popover\s*\{[\s\S]*box-shadow:\s*0 10px 30px rgba\(15,\s*23,\s*42,\s*0?\.12\)/.test(restartFlowSource));
});

test('popover item hover 使用浅薄荷绿背景', () => {
  assert.ok(/\.detail-side-restart-popover-item:hover\s*\{[\s\S]*background:\s*#e8faf8/.test(restartFlowSource));
  assert.ok(/\.detail-side-restart-popover-item:hover\s*\{[\s\S]*color:\s*#3dbdb4/.test(restartFlowSource));
});

test('旧的 .detail-status-recovery-* CSS 类应全部移除', () => {
  assert.ok(!/\.detail-status-recovery-action\s*\{/.test(html), '应移除 .detail-status-recovery-action');
  assert.ok(!/\.detail-status-recovery-head\s*\{/.test(html), '应移除 .detail-status-recovery-head');
  assert.ok(!/\.detail-status-recovery-title\s*\{/.test(html), '应移除 .detail-status-recovery-title');
  assert.ok(!/\.detail-status-recovery-copy\s*\{/.test(html), '应移除 .detail-status-recovery-copy');
  assert.ok(!/\.detail-status-recovery-actions\s*\{/.test(html), '应移除 .detail-status-recovery-actions');
  assert.ok(!/\.detail-status-recovery-btn\s*\{/.test(html), '应移除 .detail-status-recovery-btn');
});

test('renderDeviceStatusCard 不再拼接 recoveryAction', () => {
  assert.ok(!/recoveryAction/.test(html), 'recoveryAction 变量应完全移除');
});

test('置顶头应在远程操作按钮之前渲染 split button', () => {
  // 新布局:split button 从侧栏迁到 .detail-top-head .detail-top-actions
  const headBlock = html.match(/class="detail-top-actions"[\s\S]*?openDetailRemoteActions/);
  assert.ok(headBlock, '应找到头部操作区');
  assert.ok(
    /detail-side-restart-split/.test(headBlock[0]),
    'detail-side-restart-split 必须出现在远程操作按钮之前'
  );
});

test('split button 主区应绑定 openDetailRestartSystem(deviceId)', () => {
  // renderDetailTabsShell 先 const deviceId = escapeHtml(...) 再用 ${deviceId}
  assert.ok(
    /class="detail-side-restart-primary"[\s\S]*?onclick="openDetailRestartSystem\('\$\{deviceId\}'\)"/.test(html),
    '主区应调用 openDetailRestartSystem'
  );
});

test('caret 按钮应绑定 toggleDetailRestartPopover', () => {
  assert.ok(
    /class="detail-side-restart-caret"[\s\S]*?onclick="toggleDetailRestartPopover\(event,\s*'\$\{deviceId\}'\)"/.test(html),
    'caret 应调用 toggleDetailRestartPopover'
  );
});

test('popover 应列出三个部件项,对应 openDetailRestartPart 调用', () => {
  assert.ok(/openDetailRestartPart\([\s\S]*?'重启点单屏（左）'/.test(html));
  assert.ok(/openDetailRestartPart\([\s\S]*?'重启点单屏（右）'/.test(html));
  assert.ok(/openDetailRestartPart\([\s\S]*?'重启六轴机械臂（注意安全，谨慎使用）'/.test(html));
});
