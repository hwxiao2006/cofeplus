(function(global) {
  const ACTIONS = [
    '重启系统',
    '重启点单屏（左）',
    '重启点单屏（右）',
    '重启六轴机械臂（注意安全，谨慎使用）'
  ];

  const COMMON_WARNING = '该操作需要客户在设备现场完成，系统无法远程执行。';

  const META = {
    '重启系统': {
      guideTitle: '机器按钮位置 · 重启系统',
      imageLabel: '整机重启按钮位置示意图',
      imageHint: '请客户查看设备机身侧面或背部控制区域，寻找整机电源 / 重启按钮。',
      steps: [
        '请先确认设备周边无人操作，避免重启过程中误触。',
        '在设备机身侧面或背部找到整机电源 / 重启按钮。',
        '按住按钮约 3 秒后松开，等待系统重新启动。',
        '等待设备恢复后，再返回页面查看设备状态。'
      ],
      warning: COMMON_WARNING
    },
    '重启点单屏（左）': {
      guideTitle: '机器按钮位置 · 重启点单屏（左）',
      imageLabel: '左侧点单屏按钮位置示意图',
      imageHint: '请客户查看左侧点单屏边框背面或屏幕下缘，找到该屏对应的电源按钮。',
      steps: [
        '确认左侧点单屏当前无人操作后，再进行重启。',
        '在左侧点单屏边框背面或下沿找到电源按钮。',
        '短按关闭后等待 2 秒，再次按下启动左侧点单屏。',
        '屏幕重新点亮后，确认页面恢复正常显示。'
      ],
      warning: COMMON_WARNING
    },
    '重启点单屏（右）': {
      guideTitle: '机器按钮位置 · 重启点单屏（右）',
      imageLabel: '右侧点单屏按钮位置示意图',
      imageHint: '请客户查看右侧点单屏边框背面或屏幕下缘，找到该屏对应的电源按钮。',
      steps: [
        '确认右侧点单屏当前无人操作后，再进行重启。',
        '在右侧点单屏边框背面或下沿找到电源按钮。',
        '短按关闭后等待 2 秒，再次按下启动右侧点单屏。',
        '屏幕重新点亮后，确认页面恢复正常显示。'
      ],
      warning: COMMON_WARNING
    },
    '重启六轴机械臂（注意安全，谨慎使用）': {
      guideTitle: '机器按钮位置 · 重启六轴机械臂',
      imageLabel: '六轴机械臂控制按钮位置示意图',
      imageHint: '请客户在确保机械臂周边安全的前提下，查看控制柜或机械臂基座上的控制按钮区域。',
      steps: [
        '先确认机械臂作业范围内无人、无障碍物，再进行操作。',
        '在控制柜或机械臂基座找到机械臂控制电源按钮。',
        '按流程关闭机械臂电源，等待数秒后再次启动。',
        '机械臂重新上电后，再观察其是否恢复待机状态。'
      ],
      warning: '该操作需要客户在设备现场完成，系统无法远程执行。请先确认机械臂周边安全后再操作。'
    }
  };

  const STYLES = `
        .detail-fault-sheet-dialog {
            width: min(360px, 100%);
            border-radius: 12px;
            background: #fff;
            border: 1px solid var(--border-light);
            box-shadow: var(--shadow-lg);
            overflow: hidden;
        }

        .detail-fault-sheet-title {
            padding: 12px 14px;
            border-bottom: 1px solid var(--border-light);
            font-size: 14px;
            color: var(--text-primary);
            font-weight: 700;
        }

        .detail-fault-sheet-option {
            width: 100%;
            height: 44px;
            border: none;
            border-bottom: 1px solid var(--border-light);
            background: #fff;
            color: var(--text-primary);
            font-size: 14px;
            cursor: pointer;
        }

        .detail-fault-sheet-option:last-child {
            border-bottom: none;
        }

        .detail-fault-sheet-option:hover {
            background: #ecfeff;
            color: #0f766e;
            cursor: pointer;
        }

        .detail-side-restart-split {
            position: relative;
            display: grid;
            grid-template-columns: 1fr auto;
            border: 1px solid #4ECDC4;
            border-radius: 6px;
            overflow: visible;
            background: #4ECDC4;
            color: #fff;
            font-weight: 700;
            font-size: 13px;
            box-shadow: 0 6px 14px rgba(78, 205, 196, 0.28);
        }

        .detail-side-restart-primary,
        .detail-side-restart-caret {
            background: transparent;
            border: 0;
            color: inherit;
            font: inherit;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 6px;
            transition: background-color 0.15s ease;
        }

        .detail-side-restart-primary {
            padding: 10px 12px;
            justify-content: flex-start;
            border-radius: 5px 0 0 5px;
        }

        .detail-side-restart-caret {
            padding: 10px;
            border-left: 1px solid rgba(255, 255, 255, 0.4);
            border-radius: 0 5px 5px 0;
        }

        .detail-side-restart-primary:hover { background: rgba(0, 0, 0, 0.06); }
        .detail-side-restart-caret:hover { background: rgba(0, 0, 0, 0.10); }

        .detail-side-restart-icon {
            display: inline-block;
            width: 13px;
            height: 13px;
            border: 1.8px solid currentColor;
            border-radius: 50%;
            position: relative;
            flex-shrink: 0;
        }

        .detail-side-restart-icon::after {
            content: '';
            position: absolute;
            top: -3px;
            right: -2px;
            width: 0;
            height: 0;
            border-left: 4px solid transparent;
            border-bottom: 5px solid currentColor;
        }

        .detail-side-restart-chevron {
            display: inline-block;
            width: 0;
            height: 0;
            border-left: 4px solid transparent;
            border-right: 4px solid transparent;
            border-top: 5px solid currentColor;
            transition: transform 0.2s ease;
        }

        .detail-side-restart-caret[aria-expanded="true"] .detail-side-restart-chevron {
            transform: rotate(180deg);
        }

        .detail-side-restart-popover {
            position: absolute;
            top: calc(100% + 6px);
            right: 0;
            background: #fff;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            box-shadow: 0 10px 30px rgba(15, 23, 42, 0.12);
            padding: 6px;
            min-width: 200px;
            display: none;
            z-index: 10;
        }

        .detail-side-restart-popover[data-open="true"] { display: block; }

        .detail-side-restart-popover-item {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 10px;
            border-radius: 5px;
            cursor: pointer;
            color: var(--text-primary);
            font-size: 12.5px;
            font-weight: 500;
            background: transparent;
            border: 0;
            width: 100%;
            text-align: left;
            font-family: inherit;
        }

        .detail-side-restart-popover-item:hover {
            background: #e8faf8;
            color: #3dbdb4;
        }

        .detail-side-restart-popover-dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: #4ECDC4;
            flex-shrink: 0;
        }

        .detail-side-restart-popover-dot--danger { background: #ff6b6b; }

        .detail-side-restart-popover-hint {
            margin-left: auto;
            font-size: 10px;
            color: #ff6b6b;
            font-weight: 600;
        }

        .detail-remote-restart-confirm-shell {
            padding: 16px;
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        .detail-remote-restart-confirm-primary,
        .detail-remote-restart-confirm-helper {
            width: 100%;
            border-radius: 18px;
            min-height: 54px;
            padding: 0 16px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            font-size: 15px;
            font-weight: 700;
            cursor: pointer;
        }

        .detail-remote-restart-confirm-primary {
            border: 1px solid rgba(78, 205, 196, 0.45);
            background: rgba(78, 205, 196, 0.14);
            color: #0f8f88;
        }

        .detail-remote-restart-confirm-helper {
            border: 1px solid rgba(245, 158, 11, 0.35);
            background: #fffaf0;
            color: #a16207;
        }

        .detail-remote-restart-confirm-primary:hover { background: rgba(78, 205, 196, 0.2); }
        .detail-remote-restart-confirm-helper:hover { background: #fff3d6; }

        .detail-remote-restart-confirm-callout {
            border-radius: 18px;
            border: 1px solid var(--border-light);
            background: #f8fafc;
            color: #666;
            text-align: center;
            padding: 16px;
            font-size: 14px;
            line-height: 1.6;
        }

        .detail-remote-restart-confirm-arrow {
            font-size: 18px;
            line-height: 1;
        }

        .detail-remote-restart-confirm-cancel {
            width: 100%;
            border: none;
            background: transparent;
            color: var(--text-secondary);
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            min-height: 40px;
        }

        .detail-remote-restart-confirm-cancel:hover { color: var(--text-primary); }

        .detail-remote-restart-guide-shell {
            padding: 18px 18px 20px;
            display: flex;
            flex-direction: column;
            gap: 16px;
        }

        .detail-remote-restart-guide-card {
            display: flex;
            flex-direction: column;
            gap: 14px;
            text-align: left;
        }

        .detail-remote-restart-guide-warning {
            padding: 12px 14px;
            border-radius: 12px;
            background: rgba(20, 184, 166, 0.1);
            color: #0f766e;
            font-size: 13px;
            line-height: 1.6;
            font-weight: 600;
        }

        .detail-remote-restart-guide-image {
            min-height: 168px;
            border-radius: 18px;
            border: 1px solid rgba(15, 23, 42, 0.08);
            background: linear-gradient(180deg, #f8fbff 0%, #eef7f8 100%);
            padding: 18px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            gap: 12px;
            box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.6);
        }

        .detail-remote-restart-guide-image-label {
            color: var(--text-primary);
            font-size: 14px;
            font-weight: 700;
        }

        .detail-remote-restart-guide-image-diagram {
            flex: 1;
            border-radius: 14px;
            border: 1px dashed rgba(15, 23, 42, 0.16);
            background:
                radial-gradient(circle at 22% 30%, rgba(20, 184, 166, 0.18), transparent 26%),
                radial-gradient(circle at 74% 68%, rgba(15, 23, 42, 0.08), transparent 28%),
                #ffffff;
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--text-secondary);
            font-size: 13px;
            line-height: 1.6;
            text-align: center;
            padding: 20px;
        }

        .detail-remote-restart-guide-steps {
            margin: 0;
            padding-left: 18px;
            color: var(--text-primary);
            font-size: 14px;
            line-height: 1.8;
        }

        .detail-remote-restart-guide-action {
            width: 100%;
            border: none;
            border-radius: 12px;
            background: var(--primary);
            color: #fff;
            cursor: pointer;
            font-size: 15px;
            font-weight: 700;
            min-height: 46px;
        }
  `;

  let activeCtx = null;
  let stylesInjected = false;

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function getActionMeta(actionName) {
    return META[actionName] || null;
  }

  function renderSubPanel(deviceId) {
    const buttons = ACTIONS.map((action) => {
      return `<button type="button" class="detail-fault-sheet-option" onclick="window.CofeFaultRestartFlow.dispatch('${escapeHtml(action)}')">${escapeHtml(action)}</button>`;
    }).join('');
    return `
                <div class="detail-fault-sheet-dialog">
                    <div class="detail-fault-sheet-title">机构重启 · ${escapeHtml(deviceId)}</div>
                    ${buttons}
                </div>
            `;
  }

  function renderConfirmDialog(actionName) {
    const restartMeta = getActionMeta(actionName);
    if (restartMeta) {
      return `
                    <div class="detail-fault-sheet-dialog">
                        <div class="detail-fault-sheet-title">确认操作</div>
                        <div class="detail-remote-restart-confirm-shell">
                            <button type="button" class="detail-remote-restart-confirm-primary" onclick="window.CofeFaultRestartFlow.dispatch('确认软件重启')">
                                <span>确认软件重启</span>
                                <span class="detail-remote-restart-confirm-arrow">›</span>
                            </button>
                            <div class="detail-remote-restart-confirm-callout">确定要${escapeHtml(actionName)}？</div>
                            <button type="button" class="detail-remote-restart-confirm-helper" onclick="window.CofeFaultRestartFlow.dispatch('无法远程处理？查看机器按钮位置')">
                                <span>无法远程处理？查看机器按钮位置</span>
                                <span class="detail-remote-restart-confirm-arrow">›</span>
                            </button>
                            <button type="button" class="detail-remote-restart-confirm-cancel" onclick="window.CofeFaultRestartFlow.dispatch('取消')">取消</button>
                        </div>
                    </div>
                `;
    }
    return `
                <div class="detail-fault-sheet-dialog">
                    <div class="detail-fault-sheet-title">确认操作</div>
                    <div style="padding: 16px; text-align: center; color: #666;">确定要${escapeHtml(actionName)}？</div>
                    <button type="button" class="detail-fault-sheet-option" onclick="window.CofeFaultRestartFlow.dispatch('确认执行')">确认执行</button>
                    <button type="button" class="detail-fault-sheet-option" onclick="window.CofeFaultRestartFlow.dispatch('取消')">取消</button>
                </div>
            `;
  }

  function renderHardwareGuide(deviceId, actionName) {
    const meta = getActionMeta(actionName);
    if (!meta) return renderSubPanel(deviceId);
    const steps = (meta.steps || []).map((step) => `<li>${escapeHtml(step)}</li>`).join('');
    return `
                <div class="detail-fault-sheet-dialog">
                    <div class="detail-fault-sheet-title">${escapeHtml(meta.guideTitle)} · ${escapeHtml(deviceId)}</div>
                    <div class="detail-remote-restart-guide-shell">
                        <div class="detail-remote-restart-guide-card">
                            <div class="detail-remote-restart-guide-warning">${escapeHtml(meta.warning)}</div>
                            <div class="detail-remote-restart-guide-image" role="img" aria-label="${escapeHtml(meta.imageLabel)}">
                                <div class="detail-remote-restart-guide-image-label">${escapeHtml(meta.imageLabel)}</div>
                                <div class="detail-remote-restart-guide-image-diagram">${escapeHtml(meta.imageHint)}</div>
                            </div>
                            <ol class="detail-remote-restart-guide-steps">${steps}</ol>
                        </div>
                        <button type="button" class="detail-remote-restart-guide-action" onclick="window.CofeFaultRestartFlow.dispatch('我知道了')">我知道了</button>
                    </div>
                </div>
            `;
  }

  function open(ctx) {
    if (!ctx || !ctx.panel) return;
    activeCtx = ctx;
    ctx.mode = 'sub';
    ctx.pendingAction = '';
    ctx.panel.innerHTML = renderSubPanel(ctx.deviceId);
  }

  function close(ctx) {
    const target = ctx || activeCtx;
    if (target && target.panel) {
      if (target.panel.classList && typeof target.panel.classList.remove === 'function') {
        target.panel.classList.remove('active');
      }
      target.panel.innerHTML = '';
      target.mode = null;
      target.pendingAction = '';
    }
    if (!ctx || activeCtx === ctx) activeCtx = null;
  }

  function handle(ctx, actionName) {
    if (!ctx || !ctx.panel) return;
    if (ctx.mode === 'sub' && ACTIONS.includes(actionName)) {
      ctx.mode = 'confirm';
      ctx.pendingAction = actionName;
      ctx.panel.innerHTML = renderConfirmDialog(actionName);
      return;
    }
    if (ctx.mode === 'confirm' && actionName === '确认软件重启') {
      if (typeof ctx.onCommit === 'function') ctx.onCommit(ctx.deviceId, ctx.pendingAction);
      close(ctx);
      return;
    }
    if (ctx.mode === 'confirm' && actionName === '无法远程处理？查看机器按钮位置') {
      ctx.mode = 'hardware-guide';
      ctx.panel.innerHTML = renderHardwareGuide(ctx.deviceId, ctx.pendingAction);
      return;
    }
    if (ctx.mode === 'confirm' && actionName === '取消') {
      if (typeof ctx.onCancel === 'function') ctx.onCancel();
      close(ctx);
      return;
    }
    if (ctx.mode === 'hardware-guide' && actionName === '我知道了') {
      if (typeof ctx.onCancel === 'function') ctx.onCancel();
      close(ctx);
    }
  }

  function dispatch(actionName) {
    if (activeCtx) handle(activeCtx, actionName);
  }

  function _setActiveCtx(ctx) {
    activeCtx = ctx || null;
  }

  function injectStyles() {
    if (stylesInjected) return;
    if (typeof document === 'undefined' || !document.head) return;
    const style = document.createElement('style');
    style.setAttribute('data-cofe-fault-restart-flow', '1');
    style.textContent = STYLES;
    document.head.appendChild(style);
    stylesInjected = true;
  }

  global.CofeFaultRestartFlow = {
    ACTIONS,
    getActionMeta,
    renderSubPanel,
    renderConfirmDialog,
    renderHardwareGuide,
    open,
    handle,
    close,
    dispatch,
    _setActiveCtx,
    injectStyles
  };
})(typeof window !== 'undefined' ? window : globalThis);
