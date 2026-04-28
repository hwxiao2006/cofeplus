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

  global.CofeAdminStaffAccess = {
    DEVICE_SCOPED_MODULES,
    normalizeDeviceIds,
    normalizeModuleDeviceScopes,
    normalizeStaffRecord,
    normalizeStaffPermissions,
    hasModulePermission,
    getModuleVisibleDeviceIds,
    readCurrentLoginSession,
    readSidebarLoginProfile,
    readStaffManagers,
    resolveCurrentStaffAccess
  };
})(typeof window !== 'undefined' ? window : globalThis);
