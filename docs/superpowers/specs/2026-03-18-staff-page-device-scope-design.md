# Staff Page Device Scope Design

## Goal

为人员管理增加“按页面/模块分别配置设备范围”的能力，使同一名人员可以在不同页面看到不同的设备集合，同时保持“负责设备”作为总设备池。

目标场景：

- 某人员在设备管理页可管理 5 台设备
- 同一人员在订单页只能查看其中 3 台设备的订单
- 页面级设备范围始终受该人员“负责设备”总池约束

## Background

当前人员数据在 [staff-management.html](/Users/mac/Documents/New project 4/staff-management.html) 中只包含两条主线：

- `permissions`：能进入哪些页面/模块
- `devices`：该人员负责的设备列表

现状只能表达“能看哪些页面”和“总共负责哪些设备”，无法表达“不同页面可见设备范围不同”。

## Non-goals

本次设计不覆盖以下范围：

- 不细化到按钮/动作级设备范围，例如“订单查看 3 台、订单退款 2 台”
- 不引入角色模板系统
- 不处理跨商户设备授权
- 不改变“设备相关数据必须属于当前登录商户”的既有规则

## Recommended Approach

采用“两层设备范围”模型：

1. `devices` 继续表示该人员的“负责设备总池”
2. 新增 `moduleDeviceScopes` 表示“不同页面实际可见的设备范围”

页面范围必须始终是总池的子集。

推荐覆盖的页面范围：

- `devices`
- `orders`
- `faults`

以下页面保持商户级权限，不配置页面设备范围：

- `overview`
- `products`
- `materials`
- `staff`

## Data Model

建议将人员数据扩展为：

```js
{
  id: 'S001',
  merchantId: 'C001',
  merchantName: '星巴克咖啡',
  username: '王运维',
  phone: '13800138021',
  permissions: ['ops.devices', 'ops.orders', 'ops.faults'],
  devices: ['RCK386', 'RCK385', 'RCK384', 'RCK409', 'RCK410'],
  moduleDeviceScopes: {
    devices: {
      mode: 'inherit',
      deviceIds: []
    },
    orders: {
      mode: 'custom',
      deviceIds: ['RCK386', 'RCK385', 'RCK384']
    },
    faults: {
      mode: 'custom',
      deviceIds: ['RCK386', 'RCK385']
    }
  }
}
```

字段含义：

- `devices`
  该人员被分配的全部负责设备
- `moduleDeviceScopes.<module>.mode`
  页面范围模式
- `inherit`
  该页面直接继承全部 `devices`
- `custom`
  该页面仅使用 `deviceIds` 中的设备
- `moduleDeviceScopes.<module>.deviceIds`
  仅在 `custom` 下生效，且必须为 `devices` 子集

建议增加一个统一常量映射：

```js
const DEVICE_SCOPED_MODULES = {
  devices: { label: '设备', permission: 'ops.devices' },
  orders: { label: '订单', permission: 'ops.orders' },
  faults: { label: '故障列表', permission: 'ops.faults' }
};
```

## Permission Rules

统一权限判断规则如下：

1. 先判断页面权限是否存在
2. 再计算该页面可见设备集合
3. 页面所有数据、筛选器、统计、详情入口都只能基于该集合

页面可见设备集合计算规则：

```js
visibleDeviceIds = intersect(
  devices,
  moduleDeviceScopes[module].mode === 'custom'
    ? moduleDeviceScopes[module].deviceIds
    : devices
);
```

额外规则：

- 页面无权限时，即使配置了设备范围也不生效
- 页面有权限但无单独配置时，默认继承全部 `devices`
- 页面级范围最终必须与总池再次取交集，防止脏数据越权

## Staff Form Design

人员管理弹窗推荐保持以下顺序：

1. 基本信息
2. 菜单权限
3. 负责设备总池
4. 页面设备范围

### Section A: 负责设备

保留现有“负责设备号”能力，但文案升级为：

`负责设备（该人员可被分配管理的全部设备，页面范围只能从这里选择）`

该区块继续使用现有设备选择器，但其语义变为“设备总池”。

### Section B: 页面设备范围

在权限配置和设备总池之后新增轻量区块：`页面设备范围`

顶部说明文案：

`页面设备范围只能从“负责设备”中选择；未单独设置时默认继承全部负责设备。`

区块只展示设备相关页面：

- 设备
- 订单
- 故障列表

每行建议包含：

- 页面名
- 权限状态
- 范围模式
- 已选设备摘要
- 操作入口

示意：

```text
设备        已授权    全部负责设备      5/5台
订单        已授权    指定设备          3/5台
故障列表    已授权    指定设备          2/5台
```

### Range Modes

每个页面支持两种模式：

- `全部负责设备`
  继承总池，适用于默认情况
- `指定设备`
  从总池中选择页面实际可见设备

### Interaction Rules

- 未勾选对应页面权限时，该行禁用
- 勾选页面权限后，默认模式为 `全部负责设备`
- 切换到 `指定设备` 时，弹出的选择器只能显示 `devices` 中的设备
- 页面设备范围选择器不再显示商户下全部设备，只显示该人员负责设备总池
- 若总池设备变化，页面范围需要同步修正

## Validation Rules

保存时执行以下校验：

- `devices` 至少选择 1 台
- `moduleDeviceScopes.*.deviceIds` 必须为 `devices` 子集
- 页面有权限且模式为 `custom` 时，必须至少选择 1 台设备
- 页面无权限时，可保留配置但不生效

推荐策略：

- 取消页面权限时，不删除已有页面范围配置，仅置为不生效
- 后续重新打开权限时，可恢复上次配置，避免重复操作

当管理员从总池中删除设备时：

- 该设备从所有页面范围中自动移除
- 若某页面 `custom` 模式移除后变成 0 台，需要给出保存提示

提示文案建议：

- `订单页面已无可见设备，请重新选择范围或关闭该页面权限`
- `故障列表页面已无可见设备，请重新选择范围或关闭该页面权限`

## Runtime Enforcement

### Devices Page

设备页需要基于 `visibleDeviceIds('devices')` 生效：

- 设备列表只显示该范围内设备
- 顶部统计只统计该范围内设备
- 搜索建议、筛选器、设备下拉都只显示该范围内设备

### Orders Page

订单页需要基于 `visibleDeviceIds('orders')` 生效：

- 订单列表只显示这些设备的订单
- 设备筛选器只能出现这些设备
- 订单详情只能从这些订单进入
- 订单统计也必须按范围收缩

### Faults Page

故障页需要基于 `visibleDeviceIds('faults')` 生效：

- 只展示该范围内设备的故障数据
- 故障筛选器和统计同步收缩

## Empty States

页面有权限但当前可见设备为 0 台时，不建议显示“无权限”，而是显示业务型空状态：

`你已拥有订单页面权限，但当前未分配可查看的设备，请联系管理员调整页面设备范围`

页面顶部可增加轻提示：

`当前可查看设备：3 台`

这样用户能清楚理解“为什么订单页只能看到 3 台机器的数据”。

## Migration Strategy

历史人员数据没有 `moduleDeviceScopes` 时，采用兼容迁移：

- 对设备相关页面，默认生成 `mode: 'inherit'`
- 已有页面权限不变
- 原有 `devices` 继续作为总池

迁移后，旧人员默认行为不变：

- 设备页仍然看到全部负责设备
- 订单页仍然看到全部负责设备对应订单
- 故障页同理

## Implementation Notes

为避免逻辑散落，建议实现统一帮助函数：

```js
function getModuleVisibleDeviceIds(staffProfile, moduleKey) {}
```

页面只依赖这个结果，不自行拼装范围逻辑。

建议统一职责：

- 人员管理页负责录入和校验 `moduleDeviceScopes`
- 登录态或当前人员会话负责提供当前人员的权限数据
- 设备页、订单页、故障页只消费“当前页面可见设备集合”

## Testing Notes

建议覆盖以下测试场景：

- 页面权限存在且 `inherit` 时，范围等于总池
- 页面权限存在且 `custom` 时，仅返回自定义设备
- `custom` 配置超出总池时，自动裁剪为交集
- 页面无权限时，页面范围不生效
- 总池删设备后，页面范围自动移除对应设备
- 订单页筛选器只出现 `orders` 范围内设备
- 设备页统计只统计 `devices` 范围内设备
- 故障页空范围时显示正确提示

## Future Extension

如果后续确实出现动作级差异，例如“订单查看 3 台、退款只允许其中 2 台”，可以在 `moduleDeviceScopes.orders` 下增加 `actions` 层扩展，但本次不实现。

当前设计优先保证：

- 配置足够轻量
- 理解成本低
- 与现有人员管理结构兼容
- 能直接覆盖“设备页 5 台、订单页 3 台”的核心需求
