(function(global) {
  const LOGIN_SESSION_KEY = 'cofeLoginSession';
  const SIDEBAR_LOGIN_PROFILE_KEY = 'sidebarLoginProfile';
  const STAFF_MANAGERS_DATA_KEY = 'staffManagersData';
  const DEVICE_SCOPED_MODULES = {
    devices: 'ops.devices',
    products: 'ops.products',
    materials: 'ops.materials',
    orders: 'ops.orders',
    faults: 'ops.faults'
  };

  function readJsonStorage(storage, key, fallback) {
    try {
      const raw = storage && typeof storage.getItem === 'function' ? storage.getItem(key) : null;
      if (!raw) return cloneValue(fallback);
      const parsed = JSON.parse(raw);
      return parsed == null ? cloneValue(fallback) : parsed;
    } catch (error) {
      return cloneValue(fallback);
    }
  }

  function cloneValue(value) {
    if (Array.isArray(value)) return value.slice();
    if (value && typeof value === 'object') return { ...value };
    return value;
  }

  function normalizeDeviceIds(deviceIds) {
    return Array.from(new Set((Array.isArray(deviceIds) ? deviceIds : [])
      .map((item) => String(item || '').trim())
      .filter(Boolean)));
  }

  function normalizeStaffPermissions(permissions) {
    const normalized = Array.from(new Set((Array.isArray(permissions) ? permissions : [])
      .map((item) => String(item || '').trim())
      .filter(Boolean)));

    if (normalized.includes('ops.staff.manage')) {
      ['ops.materials.laneNameEdit', 'ops.materials.laneMaterialEdit'].forEach((permission) => {
        if (!normalized.includes(permission)) {
          normalized.push(permission);
        }
      });
    }

    return normalized;
  }

  function hasModulePermission(staffRecord, moduleKey) {
    const permissionKey = DEVICE_SCOPED_MODULES[moduleKey];
    if (!permissionKey) return false;
    const permissions = Array.isArray(staffRecord?.permissions) ? staffRecord.permissions : [];
    return permissions.includes(permissionKey);
  }

  function normalizeModuleDeviceScopes(rawScopes, assignedDevices) {
    const source = rawScopes && typeof rawScopes === 'object' ? rawScopes : {};
    const normalizedAssigned = normalizeDeviceIds(assignedDevices);

    return Object.keys(DEVICE_SCOPED_MODULES).reduce((accumulator, moduleKey) => {
      const rawScope = source[moduleKey] && typeof source[moduleKey] === 'object' ? source[moduleKey] : {};
      const mode = rawScope.mode === 'custom' ? 'custom' : 'inherit';
      const deviceIds = mode === 'custom'
        ? normalizeDeviceIds(rawScope.deviceIds).filter((deviceId) => normalizedAssigned.includes(deviceId))
        : [];
      accumulator[moduleKey] = { mode, deviceIds };
      return accumulator;
    }, {});
  }

  function normalizeStaffRecord(rawStaffRecord) {
    const source = rawStaffRecord && typeof rawStaffRecord === 'object' ? rawStaffRecord : {};
    const devices = normalizeDeviceIds(source.devices);
    return {
      ...source,
      merchantId: String(source.merchantId || ''),
      merchantName: String(source.merchantName || ''),
      username: String(source.username || ''),
      phone: String(source.phone || ''),
      accountEnabled: source.accountEnabled !== false,
      permissions: normalizeStaffPermissions(source.permissions),
      devices,
      moduleDeviceScopes: normalizeModuleDeviceScopes(source.moduleDeviceScopes, devices)
    };
  }

  function getModuleVisibleDeviceIds(staffRecord, moduleKey) {
    if (!hasModulePermission(staffRecord, moduleKey)) {
      return [];
    }
    const normalizedStaff = normalizeStaffRecord(staffRecord);
    const assignedDevices = normalizedStaff.devices;
    const scope = normalizedStaff.moduleDeviceScopes[moduleKey];
    if (!scope || scope.mode !== 'custom') {
      return assignedDevices;
    }
    return scope.deviceIds.filter((deviceId) => assignedDevices.includes(deviceId));
  }

  function readCurrentLoginSession(storage) {
    return readJsonStorage(storage, LOGIN_SESSION_KEY, {});
  }

  function readSidebarLoginProfile(storage) {
    return readJsonStorage(storage, SIDEBAR_LOGIN_PROFILE_KEY, {});
  }

  function readStaffManagers(storage) {
    return readJsonStorage(storage, STAFF_MANAGERS_DATA_KEY, [])
      .filter((item) => item && typeof item === 'object')
      .map(normalizeStaffRecord);
  }

  function resolveCurrentStaffAccess() {
    const storage = global.localStorage || (global.window && global.window.localStorage);
    const session = readCurrentLoginSession(storage);
    const profile = readSidebarLoginProfile(storage);
    const allStaff = readStaffManagers(storage);
    const currentMerchantId = String(session.merchantId || profile.merchantId || '');
    const currentMerchantName = String(session.merchantName || profile.merchantName || '');
    const accountPhone = String(session.account || profile.phone || '').trim();

    const currentStaff = allStaff.find((staffRecord) => {
      if (!staffRecord.accountEnabled) return false;
      if (currentMerchantId && staffRecord.merchantId !== currentMerchantId) return false;
      return accountPhone && staffRecord.phone === accountPhone;
    }) || null;

    return {
      session,
      profile,
      merchantId: currentMerchantId,
      merchantName: currentMerchantName,
      accountPhone,
      allStaff,
      currentStaff,
      isScoped: !!currentStaff
    };
  }

  // ---- 商户租户隔离 helpers(2026-05-12 spec)----
  const SUPER_ADMIN_ACCOUNTS = ['superadmin', 'ops'];

  function detectRole(profile) {
    if (!profile || typeof profile !== 'object') return 'merchant';
    const account = String(profile.account || profile.username || profile.phone || '')
      .trim()
      .toLowerCase();
    return SUPER_ADMIN_ACCOUNTS.includes(account) ? 'super_admin' : 'merchant';
  }

  function isSuperAdmin() {
    const storage = global.localStorage || (global.window && global.window.localStorage);
    const profile = readSidebarLoginProfile(storage);
    return !!(profile && profile.role === 'super_admin');
  }

  function getMerchantScope() {
    if (isSuperAdmin()) return null;
    const storage = global.localStorage || (global.window && global.window.localStorage);
    const profile = readSidebarLoginProfile(storage);
    const merchantId = String((profile && profile.merchantId) || '').trim();
    return merchantId || null;
  }

  function syncMerchantNameAcrossStorage(merchantId, newName) {
    if (!merchantId || !newName) return;
    const storage = global.localStorage || (global.window && global.window.localStorage);
    if (!storage) return;

    // locationsData[].customerName
    try {
      const raw = storage.getItem('locationsData');
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) {
          let changed = false;
          arr.forEach((l) => {
            if (l && l.customerId === merchantId && l.customerName !== newName) {
              l.customerName = newName;
              changed = true;
            }
          });
          if (changed) storage.setItem('locationsData', JSON.stringify(arr));
        }
      }
    } catch (e) { /* ignore malformed */ }

    // staffManagersData[].merchantName
    try {
      const raw = storage.getItem('staffManagersData');
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) {
          let changed = false;
          arr.forEach((s) => {
            if (s && s.merchantId === merchantId && s.merchantName !== newName) {
              s.merchantName = newName;
              changed = true;
            }
          });
          if (changed) storage.setItem('staffManagersData', JSON.stringify(arr));
        }
      }
    } catch (e) { /* ignore malformed */ }

    // sidebarLoginProfile.merchantName(当前会话)
    try {
      const raw = storage.getItem('sidebarLoginProfile');
      if (raw) {
        const p = JSON.parse(raw);
        if (p && typeof p === 'object' && p.merchantId === merchantId && p.merchantName !== newName) {
          p.merchantName = newName;
          storage.setItem('sidebarLoginProfile', JSON.stringify(p));
        }
      }
    } catch (e) { /* ignore malformed */ }
  }

  function applyNavLabelsByRole() {
    const doc = global.document || (global.window && global.window.document);
    if (!doc || typeof doc.querySelectorAll !== 'function') return;
    const label = isSuperAdmin() ? '商户管理' : '我的商户';
    const nodes = doc.querySelectorAll('[data-nav="customers"] .nav-label');
    Array.prototype.forEach.call(nodes, (el) => {
      if (el) el.textContent = label;
    });
  }

  global.CofeAdminStaffAccess = {
    DEVICE_SCOPED_MODULES,
    SUPER_ADMIN_ACCOUNTS,
    normalizeDeviceIds,
    normalizeModuleDeviceScopes,
    normalizeStaffRecord,
    normalizeStaffPermissions,
    hasModulePermission,
    getModuleVisibleDeviceIds,
    readCurrentLoginSession,
    readSidebarLoginProfile,
    readStaffManagers,
    resolveCurrentStaffAccess,
    detectRole,
    isSuperAdmin,
    getMerchantScope,
    syncMerchantNameAcrossStorage,
    applyNavLabelsByRole
  };
})(typeof window !== 'undefined' ? window : globalThis);
