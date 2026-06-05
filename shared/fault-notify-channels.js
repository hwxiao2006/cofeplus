(function(global) {
  const CHANNEL_EMAIL = 'email';
  const CHANNEL_WECHAT = 'wechat';
  const FAULT_PERMISSION_KEY = 'ops.faults';
  const RECONCILE_LOG_KEY = 'faultNotifyReconciliationLog';
  const RECONCILE_LOG_MAX = 20;
  const OPENID_MAX_LEN = 128;
  const ALLOWED_CHANNELS = new Set([CHANNEL_EMAIL, CHANNEL_WECHAT]);

  function normalizeChannelList(value, fallbackEmail) {
    if (!Array.isArray(value)) {
      return String(fallbackEmail || '').trim() ? [CHANNEL_EMAIL] : [];
    }
    return Array.from(new Set(value
      .map((item) => String(item || '').trim().toLowerCase())
      .filter((item) => ALLOWED_CHANNELS.has(item))));
  }

  function normalizeOpenId(value) {
    const text = String(value || '').trim();
    return text.length > OPENID_MAX_LEN ? text.slice(0, OPENID_MAX_LEN) : text;
  }

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
  }

  function getReachableWechatReceivers(customerId, staffList) {
    const cid = String(customerId || '').trim();
    if (!cid) return [];
    return (Array.isArray(staffList) ? staffList : []).filter((staff) => {
      if (!staff) return false;
      if (String(staff.merchantId || '').trim() !== cid) return false;
      if (staff.accountEnabled === false) return false;
      const permissions = Array.isArray(staff.permissions) ? staff.permissions : [];
      if (!permissions.includes(FAULT_PERMISSION_KEY)) return false;
      return Boolean(normalizeOpenId(staff.wechatOpenId));
    });
  }

  function validateCustomerNotifyConfig(customer, staffList) {
    const channels = normalizeChannelList(
      customer && customer.notifyChannels,
      customer && customer.notifyEmail
    );
    const errors = [];
    if (channels.includes(CHANNEL_EMAIL) && !isValidEmail(customer && customer.notifyEmail)) {
      errors.push({ code: 'email-invalid', message: '勾选邮箱推送时,请填写合法的故障通知邮箱' });
    }
    if (channels.includes(CHANNEL_WECHAT)) {
      const receivers = getReachableWechatReceivers(customer && customer.id, staffList);
      if (receivers.length === 0) {
        errors.push({
          code: 'wechat-no-receiver',
          message: '公众号推送渠道下无可达接收人,请先在「人员管理」补充配置公众号 OpenID 的员工',
          receivers: []
        });
      }
    }
    return { valid: errors.length === 0, errors, channels };
  }

  function previewStaffChangeImpact(beforeStaff, afterStaff, customerList, projectedStaff) {
    const affected = [];
    const candidates = new Set();
    if (beforeStaff && beforeStaff.merchantId) candidates.add(String(beforeStaff.merchantId));
    if (afterStaff && afterStaff.merchantId) candidates.add(String(afterStaff.merchantId));
    candidates.forEach((cid) => {
      const customer = (Array.isArray(customerList) ? customerList : [])
        .find((item) => String(item && item.id) === cid);
      if (!customer) return;
      const channels = normalizeChannelList(customer.notifyChannels, customer.notifyEmail);
      if (!channels.includes(CHANNEL_WECHAT)) return;
      if (getReachableWechatReceivers(cid, projectedStaff).length === 0) {
        affected.push({ merchantId: cid, merchantName: customer.name || cid });
      }
    });
    return affected;
  }

  function reconcileNotifyChannels(customerList, staffList) {
    const changes = [];
    (Array.isArray(customerList) ? customerList : []).forEach((customer) => {
      if (!customer) return;
      const channels = normalizeChannelList(customer.notifyChannels, customer.notifyEmail);
      customer.notifyChannels = channels;
      if (!channels.includes(CHANNEL_WECHAT)) return;
      if (getReachableWechatReceivers(customer.id, staffList).length === 0) {
        customer.notifyChannels = channels.filter((channel) => channel !== CHANNEL_WECHAT);
        changes.push({
          merchantId: customer.id,
          merchantName: customer.name || customer.id,
          reason: 'wechat-no-receiver',
          kind: 'auto'
        });
      }
    });
    return changes;
  }

  function appendReconcileLog(storage, entry) {
    if (!storage || typeof storage.setItem !== 'function') return;
    let items;
    try {
      const raw = typeof storage.getItem === 'function' ? storage.getItem(RECONCILE_LOG_KEY) : null;
      items = raw ? JSON.parse(raw) : [];
    } catch (e) {
      items = [];
    }
    if (!Array.isArray(items)) items = [];
    items.unshift({ ...entry, at: new Date().toISOString() });
    if (items.length > RECONCILE_LOG_MAX) items.length = RECONCILE_LOG_MAX;
    storage.setItem(RECONCILE_LOG_KEY, JSON.stringify(items));
  }

  function getReconcileLog(storage) {
    if (!storage || typeof storage.getItem !== 'function') return [];
    try {
      const raw = storage.getItem(RECONCILE_LOG_KEY);
      const items = raw ? JSON.parse(raw) : [];
      return Array.isArray(items) ? items : [];
    } catch (e) {
      return [];
    }
  }

  function clearReconcileLog(storage) {
    if (storage && typeof storage.removeItem === 'function') {
      storage.removeItem(RECONCILE_LOG_KEY);
    }
  }

  global.CofeFaultNotifyChannels = {
    CHANNEL_EMAIL,
    CHANNEL_WECHAT,
    FAULT_PERMISSION_KEY,
    RECONCILE_LOG_KEY,
    OPENID_MAX_LEN,
    normalizeChannelList,
    normalizeOpenId,
    isValidEmail,
    getReachableWechatReceivers,
    validateCustomerNotifyConfig,
    previewStaffChangeImpact,
    reconcileNotifyChannels,
    appendReconcileLog,
    getReconcileLog,
    clearReconcileLog
  };
})(typeof window !== 'undefined' ? window : globalThis);
