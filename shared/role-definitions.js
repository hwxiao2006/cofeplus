(function(global) {
  /**
   * COFE+ 角色模板定义
   *
   * 角色模板用于快速分配权限，新员工可基于角色创建，
   * 然后允许在此基础上进行微调。
   */

  const ROLE_TEMPLATES = {
    super_admin: {
      id: 'super_admin',
      name: '超级管理员',
      description: '拥有所有权限，可管理商户和人员',
      icon: '👑',
      order: 1,
      deviceDataScope: 'all',
      creatableBy: [],
      permissions: [
        'ops.overview',
        'ops.devices',
        'ops.products',
        'ops.products.language',
        'ops.products.currency',
        'ops.products.edit',
        'ops.products.recipe',
        'ops.materials',
        'ops.materials.laneNameEdit',
        'ops.materials.laneMaterialEdit',
        'ops.orders',
        'ops.orders.refund',
        'ops.faults',
        'ops.staff',
        'ops.staff.manage'
      ],
      defaultModuleScopes: {}
    },

    platform_ops: {
      id: 'platform_ops',
      name: '平台运维',
      description: '平台方运维，可查看所有商户及未分配的机器，负责设备维护与故障处理',
      icon: '🌐',
      order: 2,
      deviceDataScope: 'all',
      creatableBy: ['super_admin'],
      permissions: [
        'ops.overview',
        'ops.devices',
        'ops.faults',
        'ops.materials',
        'ops.materials.laneNameEdit',
        'ops.materials.laneMaterialEdit'
      ],
      defaultModuleScopes: {}
    },

    merchant_admin: {
      id: 'merchant_admin',
      name: '商户管理员',
      description: '管理本商户的运营、设备与人员',
      icon: '🏬',
      order: 3,
      deviceDataScope: 'merchant',
      creatableBy: ['super_admin'],
      permissions: [
        'ops.overview',
        'ops.devices',
        'ops.products',
        'ops.products.language',
        'ops.products.currency',
        'ops.products.edit',
        'ops.products.recipe',
        'ops.materials',
        'ops.materials.laneNameEdit',
        'ops.materials.laneMaterialEdit',
        'ops.orders',
        'ops.orders.refund',
        'ops.faults',
        'ops.staff',
        'ops.staff.manage'
      ],
      defaultModuleScopes: {}
    },

    store_manager: {
      id: 'store_manager',
      name: '店长',
      description: '负责门店日常运营管理',
      icon: '🏪',
      order: 4,
      deviceDataScope: 'merchant',
      creatableBy: ['super_admin', 'merchant_admin'],
      permissions: [
        'ops.overview',
        'ops.devices',
        'ops.products',
        'ops.products.edit',
        'ops.materials',
        'ops.materials.laneNameEdit',
        'ops.materials.laneMaterialEdit',
        'ops.orders',
        'ops.faults',
        'ops.staff'
      ],
      defaultModuleScopes: {
        products: { mode: 'custom', deviceIds: [] },
        orders: { mode: 'custom', deviceIds: [] }
      }
    },

    operations: {
      id: 'operations',
      name: '运维人员',
      description: '负责设备安装、维护和故障处理',
      icon: '🔧',
      order: 5,
      deviceDataScope: 'merchant',
      creatableBy: ['super_admin', 'merchant_admin'],
      permissions: [
        'ops.overview',
        'ops.devices',
        'ops.faults',
        'ops.materials',
        'ops.materials.laneNameEdit',
        'ops.materials.laneMaterialEdit'
      ],
      defaultModuleScopes: {
        devices: { mode: 'custom', deviceIds: [] },
        faults: { mode: 'custom', deviceIds: [] }
      }
    },

    staff: {
      id: 'staff',
      name: '职员',
      description: '基础查看权限，可根据需要添加其他权限',
      icon: '💼',
      order: 6,
      deviceDataScope: 'merchant',
      creatableBy: ['super_admin', 'merchant_admin'],
      permissions: [
        'ops.overview',
        'ops.devices',
        'ops.orders'
      ],
      defaultModuleScopes: {
        devices: { mode: 'custom', deviceIds: [] },
        orders: { mode: 'custom', deviceIds: [] }
      }
    },

    custom: {
      id: 'custom',
      name: '自定义',
      description: '完全自定义权限配置',
      icon: '⚙️',
      order: 99,
      deviceDataScope: 'merchant',
      creatableBy: ['super_admin', 'merchant_admin'],
      permissions: [],
      defaultModuleScopes: {}
    }
  };

  function getRoleTemplate(roleId) {
    return ROLE_TEMPLATES[roleId] || null;
  }

  function getAllRoleTemplates() {
    return Object.values(ROLE_TEMPLATES)
      .filter(role => role.id !== 'custom')
      .sort((a, b) => a.order - b.order);
  }

  // 返回「当前角色」有权创建的角色列表（含 custom）。
  // 依据每个模板的 creatableBy 白名单：super_admin 可建除自身外的全部；
  // merchant_admin 只能建 store_manager/operations/staff/custom。
  function getCreatableRoles(currentRoleId) {
    const normalizedRoleId = String(currentRoleId || '').trim();
    return Object.values(ROLE_TEMPLATES)
      .filter(role => Array.isArray(role.creatableBy) && role.creatableBy.includes(normalizedRoleId))
      .sort((a, b) => a.order - b.order);
  }

  function getRolePermissions(roleId) {
    const role = getRoleTemplate(roleId);
    return role ? role.permissions.slice() : [];
  }

  function getRoleDefaultModuleScopes(roleId) {
    const role = getRoleTemplate(roleId);
    return role ? { ...role.defaultModuleScopes } : {};
  }

  function applyRoleWithCustomizations(roleId, customAdded = [], customRemoved = []) {
    const basePermissions = getRolePermissions(roleId);
    const baseSet = new Set(basePermissions);

    customRemoved.forEach(p => baseSet.delete(p));
    customAdded.forEach(p => baseSet.add(p));

    return Array.from(baseSet);
  }

  function calculatePermissionChanges(roleId, finalPermissions) {
    const role = getRoleTemplate(roleId);
    if (!role || roleId === 'custom') {
      return { added: [], removed: [], fromRole: null };
    }

    const rolePermissions = new Set(role.permissions);
    const finalSet = new Set(finalPermissions);

    const added = finalPermissions.filter(p => !rolePermissions.has(p));
    const removed = role.permissions.filter(p => !finalSet.has(p));

    return {
      added,
      removed,
      fromRole: {
        id: role.id,
        name: role.name
      }
    };
  }

  function hasCustomizations(roleId, addedPermissions, removedPermissions) {
    if (roleId === 'custom') return false;
    const changes = calculatePermissionChanges(roleId, addedPermissions);
    return changes.added.length > 0 || changes.removed.length > 0;
  }

  global.CofeRoleDefinitions = {
    ROLE_TEMPLATES,
    getRoleTemplate,
    getAllRoleTemplates,
    getCreatableRoles,
    getRolePermissions,
    getRoleDefaultModuleScopes,
    applyRoleWithCustomizations,
    calculatePermissionChanges,
    hasCustomizations
  };
})(typeof window !== 'undefined' ? window : globalThis);
