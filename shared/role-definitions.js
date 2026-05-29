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
      order: 2,
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
      order: 3,
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

    finance: {
      id: 'finance',
      name: '财务人员',
      description: '查看订单和退款处理',
      icon: '💰',
      order: 4,
      permissions: [
        'ops.overview',
        'ops.orders',
        'ops.orders.refund'
      ],
      defaultModuleScopes: {
        orders: { mode: 'custom', deviceIds: [] }
      }
    },

    warehouse: {
      id: 'warehouse',
      name: '库管/物料员',
      description: '负责物料补货和货道管理',
      icon: '📦',
      order: 5,
      permissions: [
        'ops.overview',
        'ops.devices',
        'ops.materials',
        'ops.materials.laneNameEdit',
        'ops.materials.laneMaterialEdit'
      ],
      defaultModuleScopes: {
        devices: { mode: 'custom', deviceIds: [] }
      }
    },

    cashier: {
      id: 'cashier',
      name: '收银员',
      description: '查看订单和基础数据（只读）',
      icon: '💳',
      order: 6,
      permissions: [
        'ops.overview',
        'ops.orders'
      ],
      defaultModuleScopes: {
        orders: { mode: 'custom', deviceIds: [] }
      }
    },

    custom: {
      id: 'custom',
      name: '自定义',
      description: '完全自定义权限配置',
      icon: '⚙️',
      order: 99,
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
    getRolePermissions,
    getRoleDefaultModuleScopes,
    applyRoleWithCustomizations,
    calculatePermissionChanges,
    hasCustomizations
  };
})(typeof window !== 'undefined' ? window : globalThis);
