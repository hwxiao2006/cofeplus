# Device Entry Detail Visibility Design

## Background
当前设备列表“详情”弹层仅展示设备基础信息，无法看到“设备入场”页面填写的入场内容。需要在同一详情入口支持桌面与移动端查看入场数据，并兼顾“核心信息快速查看”和“全量字段可追溯”。

## Goal
在设备详情中新增入场信息展示层：默认展示核心字段，同时支持展开查看全部入场字段；并在入场提交时把数据结构化写入设备记录。

## Scope
- 入场提交时持久化 `entryInfo` 到 `devicesData` 中对应设备。
- 设备详情弹层新增两个层级：
  - 核心字段（默认可见）
  - 全字段（折叠展开）
- 同一详情弹层被桌面与移动端复用，因此自动支持两端。

## Data Model
在设备对象新增：

```js
entryInfo: {
  entryAt: '2026-02-28 11:30:00',
  locationName: '上海市中心店',
  locationAddress: '徐汇区... ',
  energyMode: '开启',
  energyStartTime: '18:00',
  energyEndTime: '08:00',
  deviceStartDate: '2026-02-13',
  deviceEndDate: '-',
  terminalGeneration5: '开启',
  parallelProduction: '开启',
  payQr: true,
  payDigitalRmb: false,
  operatorName: '未选择',
  gpsAction: '获取当前位置',
  longitude: '手动输入',
  latitude: '手动输入',
  displayImages: '未上传',
  locationImages: '未上传'
}
```

## Interaction
- 核心字段始终显示在详情弹层中。
- “查看全部入场信息”使用折叠容器（`details/summary`）展开查看。
- 无入场信息设备显示“暂无入场记录”。

## Compatibility
- 旧设备数据没有 `entryInfo` 时，详情正常降级。
- 不改变现有列表筛选、上/下架、分页逻辑。

## Test Strategy
- 新增设备详情测试，验证：
  - 入场页提交逻辑会写入 `entryInfo`。
  - 详情弹层包含核心区与全字段折叠区。
  - 详情渲染读取 `device.entryInfo`。
- 运行全量测试确保无回归。
