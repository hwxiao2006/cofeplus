# 产品需求文档索引：商品管理标签管理与印花图片设置

> 原合并版 PRD 已拆分为两份独立文档，便于分别评审、迭代和交付。`Markdown` 版本适合在仓库内查看；如需在浏览器或飞书文档中阅读，可使用同目录的 [prd-menu-management-tag-imprint-settings.html](./prd-menu-management-tag-imprint-settings.html)。

## 1. 文档说明

- `业务标签管理` 文档聚焦标签库维护、多语言名称、隐藏恢复和可见范围规则。
- `印花图片设置` 文档聚焦当前设备素材管理、上传删除和跨设备复制能力。
- 后续如有需求变更，应优先在对应的单独文档中维护，避免再次把两块职责不同的能力写回同一份 PRD。

## 2. 文档入口

- 业务标签管理
  - Markdown：[prd-menu-management-business-tag-management.md](./prd-menu-management-business-tag-management.md)
  - HTML：[prd-menu-management-business-tag-management.html](./prd-menu-management-business-tag-management.html)
- 印花图片设置
  - Markdown：[prd-menu-management-imprint-image-settings.md](./prd-menu-management-imprint-image-settings.md)
  - HTML：[prd-menu-management-imprint-image-settings.html](./prd-menu-management-imprint-image-settings.html)

## 3. 拆分原则

- 标签管理与印花图片设置同属 `商品管理`，但配置对象不同：前者维护标签库，后者维护设备级图片素材。
- 评审关注点不同：标签管理更偏规则和多语言，印花图片设置更偏素材操作和设备分发。
- 拆分后可以分别推进设计、开发和验收，减少单份文档过长造成的沟通噪音。
