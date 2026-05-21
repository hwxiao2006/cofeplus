# Product Management Hot-Only Rollback Design

**Date:** 2026-05-21

## Goal

商品管理当前只保留最早的“是否热销”能力，去掉本次业务标签相关的页面入口、编辑能力、点单屏展示和 PRD 描述。同时保留一条业务标签归档分支，后续需要恢复业务标签时可以从该分支重新取回实现。

## Source Baseline

实施前必须以远程生产主分支 `origin/main` 为基线创建实际修改分支，避免在当前脏工作树上继续叠加改动。

当前已确认远程主分支更新到 `b752612`。实际回退分支建议命名为：

- 归档分支：`codex/business-tags-archive`
- 回退实现分支：`codex/product-hot-only`

## Branch Preservation

在开始回退前，先保留业务标签实现分支。

规则：

- `codex/business-tags-archive` 用来保存当前业务标签相关实现和文档。
- 该分支不作为本次上线分支。
- 后续恢复业务标签时，从该分支 cherry-pick、merge 或重新对照实现。
- 当前主线回退不删除这条归档分支。

如果当前业务标签实现仍包含未提交文件，归档分支需要先生成一个归档提交，确保相关文件不会只存在于本地未暂存状态。

## Product Scope

回退后的商品管理只支持一个商品级营销标识：

- 字段：`featured`
- 业务含义：是否热销
- 展示文案：热销
- 编辑方式：商品详情中保留“是否热销”开关或等价表单项

以下能力从当前主线移除：

- 业务标签库
- 业务标签新增、编辑、隐藏、恢复
- 商品绑定多个业务标签
- 商品业务标签排序
- 基本设置中的业务标签管理卡片或抽屉
- 点单屏预览中的多业务标签展示
- 业务标签多语言名称管理

## Affected Areas

### Menu Management

`menu-management.html` 回到只根据 `featured` 展示热销状态。

商品卡片不再读取 `businessTagIds` 或全局业务标签库。基本设置 Tab 不再包含业务标签管理入口，只保留设备语言、点单屏联系信息和售价币种等仍在范围内的能力。

### Product Detail

`product-detail.html` 保留商品基本信息中的“是否热销”编辑能力。

移除业务标签选择、排序、创建、确认标签、标签库抽屉，以及和业务标签保存相关的协调逻辑。配方标签、规格标签等非“业务标签”的既有能力不属于本次回退对象，不能误删。

### Shared Data

共享 mock 商品继续保留 `featured`。

主线不再依赖 `defaultBusinessTags`、`businessTagIds`、`shared/business-tag-library.js`。如果为兼容旧本地缓存需要保留读取逻辑，也只能把旧 `businessTagIds` 忽略或转换为 `featured`，不能继续驱动 UI。

### PRD

商品管理 PRD 改为当前只支持“热销/非热销”。

所有“业务标签管理”“多业务标签”“标签隐藏/恢复”“业务标签多语言”描述从主 PRD 中移除或标记为归档分支能力，不进入本次提测范围。

## Data Compatibility

回退后仍可能遇到旧缓存中的 `businessTagIds`。

兼容策略：

- 如果商品已有 `featured`，以 `featured` 为准。
- 如果没有 `featured` 但存在旧 `businessTagIds`，可将包含原招牌/热销等历史标签的商品视为 `featured: true`；其他标签忽略。
- 保存商品时只写入 `featured`，不再写入或更新 `businessTagIds`。

## Testing

需要调整或新增测试覆盖：

- 商品卡片只展示热销，不展示业务标签 chip。
- 商品详情可编辑并保存 `featured`。
- 基本设置不出现业务标签管理入口。
- 点单屏预览只根据 `featured` 展示热销。
- 旧 `businessTagIds` 不再驱动多标签 UI。
- PRD HTML 不包含业务标签管理相关验收项。

业务标签相关测试不要简单保留为跳过；主线中与业务标签功能强绑定的测试应删除或改写为热销回退测试。业务标签完整测试留在 `codex/business-tags-archive` 分支。

## Risks

- 当前工作树存在大量未提交改动，回退实现必须使用独立工作树或干净分支，避免覆盖用户已有改动。
- “标签”一词在商品详情中也用于配方/规格标签，本次只移除“业务标签”，不能误删配方标签能力。
- PRD 和页面必须同步，否则测试会按旧业务标签要求验收。

## Implementation Gate

用户确认本规格后，再创建实现计划并进入代码修改。
