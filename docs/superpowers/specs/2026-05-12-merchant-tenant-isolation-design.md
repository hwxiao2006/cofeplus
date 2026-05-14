# 商户租户隔离:客户管理 + 点位管理重构

- **日期**: 2026-05-12
- **模块**: device-mgmt · `customers.html`、`locations.html`、`login-paper.html`、`shared/admin-staff-access.js`
- **基线**: `origin/main` @ 5e294d5
- **分支**: 建议新开 `feat/merchant-tenant-isolation`

## 背景

当前代码的租户(商户)隔离不完整:

- **客户管理页 `customers.html`** 实际是一张"全部商户注册表",任何登录用户都能看/改/删所有商户(C001-C004)。用户心智模型是"我是某商户的运营,只看得到我自己商户的信息",当前行为是重大功能缺陷。
- **点位管理页 `locations.html`** 加载 **全部** `locationsData`,新建点位时还会弹出"所属客户"下拉列表让用户在**所有商户**里选。可以给别人家商户建点位。
- **员工管理页 `staff-management.html`** 反而正确:调 `getManagersByMerchant(selectedMerchantId)`,按当前商户过滤,并在 `getCurrentMerchantContext` 里读 `sidebarLoginProfile.merchantId`。

数据模型本身没问题 —— `locationsData[].customerId`、`staffManagersData[].merchantId` 都已存在。缺的是 **统一的"当前可见范围"判定** 和 **两个受影响页面的消费代码**。

## 目标

普通登录者(商户运营)**只能看到、操作自己商户**的客户资料和点位。超级管理员(平台运营)旁路隔离,看到全局数据。

不在范围:
- `orders.html` / `materials.html` / `devices.html` 等其他页面的隔离审查(单独开 spec)
- 后端真实隔离(项目目前纯前端 localStorage,约定前端先统一入口)
- 切换商户功能

## 设计

### 1. 角色基础设施(`shared/admin-staff-access.js`)

新增:

```javascript
const SUPER_ADMIN_ACCOUNTS = ['superadmin', 'ops']; // username / 手机号

function detectRole(profile) {
    if (!profile) return 'merchant';
    const account = String(profile.account || profile.username || '').trim().toLowerCase();
    return SUPER_ADMIN_ACCOUNTS.includes(account) ? 'super_admin' : 'merchant';
}

function isSuperAdmin() {
    const profile = getSidebarLoginProfile();
    return profile && profile.role === 'super_admin';
}

function getMerchantScope() {
    // null 表示"不限制"(超管);非 null 表示"只看此 merchantId"
    if (isSuperAdmin()) return null;
    const profile = getSidebarLoginProfile();
    return String(profile && profile.merchantId || '').trim() || null;
}
```

导出风格与现有函数一致(挂到 `window` 或 `module.exports`,沿用现有惯例)。

**向后兼容:** profile 上若无 `role` 字段,`isSuperAdmin()` 返回 false → 按普通商户处理(默认隔离)。无需迁移已存的 localStorage。

### 2. 登录页写入 role(`login-paper.html`)

登录成功、准备写 `sidebarLoginProfile` 时,插入:

```javascript
profile.role = detectRole(profile);
```

既有登录 UI 不变,无新增字段、无新增勾选框。

### 3. 客户管理页 → 商户详情页(`customers.html`)

**页面标题 / 侧边栏菜单动态化:**
- `<title>`、页面 h1 根据 `isSuperAdmin()` 切换:
  - 普通:`我的商户`
  - 超管:`商户管理`
- 侧边栏 `.nav-item`(每个 HTML 文件都拷贝一份菜单,见"全站侧边栏"小节)

**普通用户视图:**
```
┌──────────────────────────────────────┐
│ 我的商户                 [编辑]│
├──────────────────────────────────────┤
│ 商户 ID        C001  (只读)          │
│ 商户名称       星巴克咖啡             │
│ 联系人        张经理                 │
│ 联系电话       13800138001           │
│ 商户地址       上海市浦东新区         │
│ 备注          ...                   │
│ 客户类型       直营 / 加盟            │
│ 状态          启用 / 停用            │
└──────────────────────────────────────┘
```

- 进页面:`scope = getMerchantScope()` → `customersData.find(c => c.id === scope)` → 渲染
- "编辑" → 切可编辑态;"保存" → 写回 `customersData`(就该一条),若 `name` 字段变化,调用 `syncMerchantNameAcrossStorage(scope, newName)`(见下一节)做冗余字段同步
- **隐藏** 按钮:新建商户、删除商户、批量导出
- **商户 ID** 只读,永不渲染为 input
- 搜索框、筛选器、分页全部隐藏

**超管视图(旁路):** 沿用现有列表 + 新建 / 编辑 / 删除。

**找不到记录 fallback:** 若 `scope` 非 null 但查无此商户(数据损坏),显示友好空态:"未找到你所属的商户信息,请联系管理员"。

**冗余字段同步 helper:** 放在 `shared/admin-staff-access.js`,集中维护:

```javascript
function syncMerchantNameAcrossStorage(merchantId, newName) {
    if (!merchantId || !newName) return;

    // 1. locationsData[].customerName
    const locationsRaw = localStorage.getItem('locationsData');
    if (locationsRaw) {
        try {
            const arr = JSON.parse(locationsRaw);
            let changed = false;
            arr.forEach(l => {
                if (l.customerId === merchantId && l.customerName !== newName) {
                    l.customerName = newName;
                    changed = true;
                }
            });
            if (changed) localStorage.setItem('locationsData', JSON.stringify(arr));
        } catch (e) {}
    }

    // 2. staffManagersData[].merchantName
    const staffRaw = localStorage.getItem('staffManagersData');
    if (staffRaw) {
        try {
            const arr = JSON.parse(staffRaw);
            let changed = false;
            arr.forEach(s => {
                if (s.merchantId === merchantId && s.merchantName !== newName) {
                    s.merchantName = newName;
                    changed = true;
                }
            });
            if (changed) localStorage.setItem('staffManagersData', JSON.stringify(arr));
        } catch (e) {}
    }

    // 3. sidebarLoginProfile.merchantName(当前会话)
    const profileRaw = localStorage.getItem('sidebarLoginProfile');
    if (profileRaw) {
        try {
            const p = JSON.parse(profileRaw);
            if (p.merchantId === merchantId && p.merchantName !== newName) {
                p.merchantName = newName;
                localStorage.setItem('sidebarLoginProfile', JSON.stringify(p));
            }
        } catch (e) {}
    }
}
```

### 4. 点位管理页租户隔离(`locations.html`)

**4.1 列表隔离**
- 页面加载后:`scope = getMerchantScope()` → 若非 null,过滤 `locationsData.filter(l => l.customerId === scope)` 后渲染
- 统计数字(`totalCustomers`、该商户下的点位总数等)按**过滤后**子集计算
- 搜索、分页都基于隔离后的子集

**4.2 新建 / 编辑表单**
- 普通用户:移除"所属客户"下拉,改为只读显示:
  ```html
  <label class="form-label">所属商户</label>
  <div class="form-readonly">${currentMerchantName}</div>
  ```
  保存时 `customerId = scope`, `customerName = currentMerchantName`(来自 `sidebarLoginProfile.merchantName`)
- 超管:下拉选择器保留

**4.3 编辑 / 删除二次校验**
- 打开编辑前检查 `location.customerId === scope`,不等则 toast "无权编辑" 并退出
- 删除同理

**4.4 历史脏数据**
- 若某 location 的 `customerId` 为空或不属于任何有效商户:普通用户看不到;超管可见,便于清洗

### 5. 全站侧边栏菜单名同步

所有含侧边栏菜单的 HTML 文件(当前初步统计:customers/locations/staff/devices/orders/materials/faults/overview/device-entry 等约 10+ 文件)都包含一条:

```html
<a href="customers.html" class="nav-item"><span class="nav-icon">🏢</span><span>客户管理</span></a>
```

每个文件的这条 `<a>` 需要改成动态:

```html
<a href="customers.html" class="nav-item" data-nav="customers">
  <span class="nav-icon">🏢</span>
  <span class="nav-label">客户管理</span>
</a>
```

然后在 `shared/admin-staff-access.js` 里新增一个 `applyNavLabelsByRole()`,页面 `DOMContentLoaded` 调用:

```javascript
function applyNavLabelsByRole() {
    const role = isSuperAdmin() ? 'super_admin' : 'merchant';
    document.querySelectorAll('[data-nav="customers"] .nav-label').forEach(el => {
        el.textContent = role === 'super_admin' ? '商户管理' : '我的商户';
    });
}
```

每个使用 customer 菜单项的 HTML 文件 `<script>` 尾部加一行 `applyNavLabelsByRole()` 调用即可。

### 6. 测试

**单元测试(新建)**

`tests/shared.admin-staff-access.test.js`
- `detectRole(profile)` — 用户名 `superadmin` → `super_admin`;其他 → `merchant`;无 profile → `merchant`
- `isSuperAdmin()` — profile.role === `'super_admin'` → true;其他 → false
- `getMerchantScope()` — 超管 → null;merchant 有 merchantId → 返回 id;merchant 无 merchantId → null

`tests/customers.merchant-profile.test.js`
- 静态:customers.html 的 script 里包含 `getMerchantScope()` 调用
- 静态:新建按钮/删除按钮 DOM 处包含 `isSuperAdmin()` 条件渲染标记
- 运行时(VM):普通 profile 下渲染结果只含一张卡,无列表;超管下走原有列表

`tests/locations.merchant-scope.test.js`
- 静态:表单中"所属商户"区域 DOM 有 `merchant` / `super_admin` 分支
- 静态:`customerSelect` 仅在超管分支下渲染
- 运行时:提供 3 个 location(customerId = C001 × 2,C002 × 1),profile merchantId = C001 → 过滤出 2 条

**回归测试**
- `staff-management.html` 现有测试保持全绿(本次改动不应触及)
- 之前详情页 tabs 测试(PR #7 已 merge 的 70+ 测试)保持全绿

### 7. 文件边界

| 文件 | 改动 |
|---|---|
| `shared/admin-staff-access.js` | 新增 5 个 helper(`detectRole` / `isSuperAdmin` / `getMerchantScope` / `applyNavLabelsByRole` / `syncMerchantNameAcrossStorage`)+ 导出 |
| `login-paper.html` | 一行 `profile.role = detectRole(profile)` |
| `customers.html` | 页面整体改写为单记录模式(保留超管旧路径)|
| `locations.html` | 列表过滤 + 表单改只读(保留超管旧路径)|
| 全站含客户菜单项的 HTML(约 10 个) | 每处菜单 `<a>` 加 `data-nav` + 调 `applyNavLabelsByRole()` |
| `tests/shared.admin-staff-access.test.js` | 新建 |
| `tests/customers.merchant-profile.test.js` | 新建 |
| `tests/locations.merchant-scope.test.js` | 新建 |

## 风险

- **数据耦合同步** — 商户改名要同步 locations / staff 的冗余字段,漏一处会出现显示不一致。用集中工具函数 `syncMerchantNameAcrossStorage(merchantId, newName)` 统一触发,降低散点风险。
- **超管误伤** — 白名单 `SUPER_ADMIN_ACCOUNTS` 写死在 js 里,部署后修改需要发版。可接受(当前阶段只是前端 demo)。
- **脏数据** — 历史 location 可能存在 `customerId` 为空;若存在,对普通用户"消失"可能被误认为 bug。通过"显示空态提示"降低困惑。

## 不改动

- 员工管理页(已经正确)
- orders / materials / devices / faults / overview / device-entry 等页(下次 spec)
- 后端
- 切换商户功能
- 侧边栏图标、其他菜单项名称

## 后续(下个 spec 候选)

- 对 orders / materials / devices / faults 四个页面做同样的 `getMerchantScope()` 接入
- 超管加 "切换商户上下文" 选择器
- 白名单改成可配置(localStorage 或后端 API)
