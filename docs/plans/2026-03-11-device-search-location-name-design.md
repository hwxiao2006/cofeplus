# Device Search Location Name Design

**Goal**
统一多个页面的设备搜索组件，使其同时支持“设备编号”和“点位名称”搜索，并在选中后显示“点位名称 · 设备编号”。

**Scope**
- menu-management.html
- menu.html
- overview.html
- materials.html
- device-entry.html
- staff-management.html

**Design**
- 数据来源优先读取 localStorage 中的 devicesData 与 locationsData。
- 运行时建立设备搜索数据：
  - deviceId
  - locationName
  - displayLabel = `点位名称 · 设备编号`
- 当设备没有点位名称时，displayLabel 回退为设备编号。
- 输入框支持按以下内容匹配：
  - 设备编号
  - 点位名称
  - 组合展示文案
- 选择设备后，内部仍只保存 deviceId，不改现有业务逻辑。

**Interaction**
- 下拉列表显示 displayLabel。
- 输入框选中后显示 displayLabel。
- 模糊匹配仅在结果唯一时允许回车/失焦直接切换。
- 多条候选时仍通过下拉手动选择。

**Notes**
- staff-management 已支持设备编号 + 点位搜索，保留现有能力，只统一文案与显示格式。
- 这次不抽公共 JS 文件，避免扩大改动面。
