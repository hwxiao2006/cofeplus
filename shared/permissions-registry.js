(function(global) {
  /**
   * COFE+ 权限注册表
   *
   * 统一管理所有权限点的定义、标签、分类等元数据
   * 权限字符串格式: ops.{模块}.{操作}
   */

  const PERMISSION_GROUPS = [
    {
      key: 'overview',
      label: '总览',
      icon: '📊',
      order: 1,
      hasDeviceScope: false,
      children: [
        {
          value: 'ops.overview',
          label: '查看总览',
          description: '查看运营总览和统计数据',
          category: 'view'
        }
      ]
    },
    {
      key: 'devices',
      label: '设备',
      icon: '⚙️',
      order: 2,
      hasDeviceScope: true,
      children: [
        {
          value: 'ops.devices',
          label: '查看设备',
          description: '查看设备列表和状态',
          category: 'view'
        }
      ]
    },
    {
      key: 'products',
      label: '商品管理',
      icon: '📋',
      order: 3,
      hasDeviceScope: true,
      children: [
        {
          value: 'ops.products',
          label: '查看商品管理',
          description: '查看商品列表和配置',
          category: 'view',
          isPrimary: true
        },
        {
          value: 'ops.products.language',
          label: '新增语言',
          description: '添加新的语言版本',
          category: 'edit'
        },
        {
          value: 'ops.products.currency',
          label: '更改币种',
          description: '修改显示币种',
          category: 'edit'
        },
        {
          value: 'ops.products.edit',
          label: '编辑商品',
          description: '编辑商品基本信息',
          category: 'edit'
        },
        {
          value: 'ops.products.recipe',
          label: '编辑配方',
          description: '编辑商品配方和原料',
          category: 'edit'
        }
      ]
    },
    {
      key: 'materials',
      label: '物料',
      icon: '📦',
      order: 4,
      hasDeviceScope: true,
      children: [
        {
          value: 'ops.materials',
          label: '查看物料',
          description: '查看物料库存和记录',
          category: 'view',
          isPrimary: true
        },
        {
          value: 'ops.materials.laneNameEdit',
          label: '编辑货道名称',
          description: '修改货道显示名称',
          category: 'edit'
        },
        {
          value: 'ops.materials.laneMaterialEdit',
          label: '编辑货道关联物料',
          description: '修改货道关联的物料',
          category: 'edit'
        }
      ]
    },
    {
      key: 'orders',
      label: '订单',
      icon: '📝',
      order: 5,
      hasDeviceScope: true,
      children: [
        {
          value: 'ops.orders',
          label: '查看订单',
          description: '查看订单列表和详情',
          category: 'view',
          isPrimary: true
        },
        {
          value: 'ops.orders.refund',
          label: '订单退款',
          description: '处理订单退款',
          category: 'action'
        }
      ]
    },
    {
      key: 'faults',
      label: '故障列表',
      icon: '🛠️',
      order: 6,
      hasDeviceScope: true,
      children: [
        {
          value: 'ops.faults',
          label: '查看故障列表',
          description: '查看设备故障记录',
          category: 'view'
        }
      ]
    },
    {
      key: 'staff',
      label: '人员管理',
      icon: '👥',
      order: 7,
      hasDeviceScope: false,
      children: [
        {
          value: 'ops.staff',
          label: '查看人员管理',
          description: '查看员工列表',
          category: 'view',
          isPrimary: true
        },
        {
          value: 'ops.staff.manage',
          label: '人员维护',
          description: '新增、编辑、停用员工账号',
          category: 'manage'
        }
      ]
    }
  ];

  const DEVICE_SCOPED_MODULES = {
    devices: 'ops.devices',
    products: 'ops.products',
    materials: 'ops.materials',
    orders: 'ops.orders',
    faults: 'ops.faults'
  };

  function getAllPermissions() {
    const result = [];
    PERMISSION_GROUPS.forEach(group => {
      group.children.forEach(child => {
        result.push(child);
      });
    });
    return result;
  }

  function getPermissionGroup(groupKey) {
    return PERMISSION_GROUPS.find(g => g.key === groupKey) || null;
  }

  function getPermissionDetail(permissionValue) {
    for (const group of PERMISSION_GROUPS) {
      const found = group.children.find(c => c.value === permissionValue);
      if (found) {
        return { ...found, groupKey: group.key, groupLabel: group.label };
      }
    }
    return null;
  }

  function getPermissionTree() {
    return PERMISSION_GROUPS;
  }

  function getDeviceScopedModules() {
    return DEVICE_SCOPED_MODULES;
  }

  function hasDeviceScope(moduleKey) {
    const group = getPermissionGroup(moduleKey);
    return group ? group.hasDeviceScope : false;
  }

  function normalizePermissions(permissions) {
    if (!Array.isArray(permissions)) return [];

    const permissionSet = new Set();
    const validPermissions = new Set(getAllPermissions().map(p => p.value));

    permissions.forEach(p => {
      const value = String(p || '').trim();
      if (value && validPermissions.has(value)) {
        permissionSet.add(value);
      }
    });

    PERMISSION_GROUPS.forEach(group => {
      if (group.children.length <= 1) return;
      const primaryValue = group.children[0].value;
      const hasChildPermission = group.children.slice(1).some(child =>
        permissionSet.has(child.value)
      );
      if (hasChildPermission && !permissionSet.has(primaryValue)) {
        permissionSet.add(primaryValue);
      }
    });

    if (permissionSet.has('ops.staff.manage')) {
      permissionSet.add('ops.materials.laneNameEdit');
      permissionSet.add('ops.materials.laneMaterialEdit');
      permissionSet.add('ops.materials');
    }

    return Array.from(permissionSet);
  }

  global.CofePermissionsRegistry = {
    PERMISSION_GROUPS,
    DEVICE_SCOPED_MODULES,
    getAllPermissions,
    getPermissionGroup,
    getPermissionDetail,
    getPermissionTree,
    getDeviceScopedModules,
    hasDeviceScope,
    normalizePermissions
  };
})(typeof window !== 'undefined' ? window : globalThis);
