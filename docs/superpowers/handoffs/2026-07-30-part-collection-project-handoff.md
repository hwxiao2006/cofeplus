# Handoff：机器人咖啡亭配置采集 — 部件采集重设计项目

> 写于 2026-07-30。目的：任何 agent 或工程师可凭本文档独立接手,无需回溯对话历史。
> 项目状态:**已全部完成并发布上线**,当前无未完成工作,本文档覆盖背景、架构、发布链路、运维要点与遗留事项。

## 一、这是什么项目

「机器人咖啡亭配置采集」是一个 **妙搭(Miaoda)云端全栈应用**,面向运维团队,按设备编号采集咖啡亭部件配置(部件名称/序列号/硬件固件版本/资料状态等),数据实时写入飞书多维表格。

- **线上地址**:https://hi-dolphin.aiforce.cloud/app/app_17artejsm44 (需飞书登录,全租户可访问)
- **本地代码**:`/Users/mac/cofeplus/cofeplus/cofeconfig/`(独立 git 仓库,与外层 cofeplus 仓库分离)
- **app_id**:`app_17artejsm44`(见 `cofeconfig/.spark/meta.json`)
- **技术栈**:NestJS + React 19 + Tailwind + shadcn/ui(妙搭 fullstack-nestjs-template 2.2.6)
- **数据层**:无自建数据库表,业务数据全部通过两个飞书多维表格 capability 插件读写(前端直调,后端无业务接口)

用户最初诉求:原 PartCollectionPage 录入流程不清楚、页面混乱 → 重设计为「设备工作单」模式并全链路实现、发布。

## 二、当前状态(接手时的事实)

### 已完成并上线
1. **部件采集流程重设计**(spec + plan 见下文文档索引),8 个 Task 全部完成:
   - Step 1 输入设备编号 → Step 2 设备工作单(设备信息 + 已录部件清单 + 录入表单)
   - 预置部件清单 16 项(datalist 补全,helper 计数只统计标准件,清单外可自由输入)
   - 同名部件序号自动建议(partName blur 时触发);改回已占用序号出现橙色警示条,保存后**更新原记录**而非新增
   - 编辑入口两个:设备档案页部件列表、工作单已录清单,均进 `parts/:recordId/edit`,保存后返回来处
2. **Toast 重复渲染缺陷修复**(commit `abbf677`):根因是 `index.tsx` 与 `Layout.tsx` 各挂了一个 Sonner `<Toaster>`,已删 Layout 中的,保留根级唯一实例
3. **界面用词「设备台账」→「设备档案」**(commit `c78dee4`):5 处用户可见文案 + 测试用例名,代码内部日志/注释/变量名(如 `DeviceLedgerPage`)**未改**
4. **访问范围已放开**:`lark-cli apps +access-scope-set --scope tenant`,全公司可访问(此前是 Range+审批,同事打开报"无权访问")
5. **测试数据已清理**:多维表格中只保留 RCK001(机器人咖啡亭)1 台设备 + 16 个部件(与用户提供的 Excel 一致);我在验证期造的 RCKTEST9/RCKNEW77 及一条空白记录已精确删除

### 两张多维表格(业务数据所在)
| capability 实例 ID | 表 | appToken / tableID |
|---|---|---|
| `feishu_bitable_coffee_kiosk_ledger_1` | 咖啡亭台账(设备) | `Qbxrbq38Na6LI0sBkLHcGDsXnkf` / `tblWaF9DWKwTzmZf` |
| `feishu_bitable_component_config_operation_2` | 部件配置 | 同文档另一张表(配置见 `server/capabilities/*.json`) |

前端封装在 `client/src/api/bitable/`(common.ts / kiosk.ts / parts.ts),只用了 `searchRecords` / `batchAddRecords` / `batchUpdateRecords`;插件还支持 `deleteRecords`(清理测试数据时用过,已撤临时代码)。

### git 状态
- 分支 `sprint/default`,工作区干净,HEAD = `c78dee4`,已推送、已发布
- **`main` 分支是发布态快照:禁止直推、禁止 force-push**
- 最近一次发布:release_id `7667877860150922450`,status finished

## 三、发布链路(SOP,每次改完代码照此执行)

```bash
cd /Users/mac/cofeplus/cofeplus/cofeconfig

# 1. 质量门禁(三道全过才继续)
npm run type:check && npm run lint && npm test

# 2. 提交并推送 sprint/default(禁推 main)
git add <files> && git commit -m "..."
git push origin sprint/default
# 若报 Authentication failed(凭据短时过期,几乎每次都会遇到):
lark-cli apps +git-credential-init --app-id app_17artejsm44
git push origin sprint/default

# 3. 触发发布(write 风险,需用户确认后执行)
lark-cli apps +release-create --app-id app_17artejsm44
# 返回 release_id

# 4. 轮询到 finished(约 1 分钟)
lark-cli apps +release-get --app-id app_17artejsm44 --release-id <id> --jq '.data | {status, online_url, error_message}'
```

## 四、本地开发与调试要点(踩过的坑)

### 启动
- `.claude/launch.json`(在外层 cofeplus 仓库)定义了 `cofeconfig-dev` 配置:`cd cofeconfig && npm run dev:local`,端口 8080
- 用 `preview_start`(name=`cofeconfig-dev`)启动;冷启动约 50-60 秒(env pull → 依赖 → 编译)
- 应用入口:`http://localhost:8080/app/app_17artejsm44/`(必须带 `/app/<app_id>` 前缀)
- 日志:`cofeconfig/logs/dev.std.log`,`grep '\[server\]'` 取后端单边

### 浏览器自动化(preview_* 工具)
- `preview_click` **不支持** `:has-text()`;按钮点击用 `preview_eval` + `Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'XXX').click()`
- **手动 dispatchEvent 无法触发 React 受控组件副作用**(如序号自动建议);必须用 `preview_fill` + `preview_click`(真实原生事件)
- 页面内通过 `import('@lark-apaas/client-toolkit')` 注入调用 capability **不可行**(模块解析失败);需要程序化调 bitable 时,做法是**临时加清理页组件 + 路由 → 浏览器操作 → 撤代码**(本项目清理测试数据即此法,模板见 git 历史或重写)
- Toast 淡出快(~2s),抓不到就看业务结果(清单计数/记录状态)

### 线上验证(gstack /browse)
- 应用要求飞书登录,headless 无登录态会 302 到 accounts.feishu.cn
- 可用路径:`$B connect`(headed 模式)→ 让用户在受控窗口里登录 → 登录态在该上下文内持续;`cookie-import-browser` 从本机 Chrome 导入**拿不到**飞书 cookie(0 条)
- browse 二进制:`~/.claude/skills/gstack/browse/dist/browse`

### 表单字段选择器(线上/本地一致)
- 设备编号 `input[name="deviceCode"]`;部件名称 `input[name="partName"]`(datalist `#preset-part-names`);序号 `input[name="sequence"]`;序列号 `input[name="partSerialNumber"]`;硬件/固件 `input[name="hardwareVersion"|"firmwareVersion"]`;资料状态是原生 `select`;备注 `textarea[name="paramsAndNotes"]`
- 关键按钮文案:「下一步」「保存，录下一件」「换一台设备」「完成本台设备」「保存修改」「取消返回」

## 五、文档索引(设计与计划,均在外层 cofeplus 仓库)

- 设计 spec:`docs/superpowers/specs/2026-07-27-part-collection-redesign-design.md`
- 实施 plan(8 Tasks):`docs/superpowers/plans/2026-07-27-part-collection-redesign.md`
- cofeconfig 编码规范:`cofeconfig/.claude/skills/coding-guide/SKILL.md`(写代码前必读;另有 code-fix / authz-guide 等 skill)
- cofeconfig 关键提交:`17d852d`(PartFormFields)→ `aa7d245`(EditPartPage)→ `2268a40`(工作单重构)→ `fd6435d`(档案页编辑入口)→ `365a607`(序号建议修正)→ `7b56752`(bitable 字段配置修复)→ `abbf677`(Toast 修复)→ `c78dee4`(台账→档案)

## 六、遗留与待决事项(无阻塞,按需处理)

1. **kiosk.ts 对 pages 层的依赖反转**:`client/src/api/bitable/kiosk.ts` 引用了 `pages/PartCollection/partFormSchema.ts` 的类型,层次上应反过来。功能正常,重构时顺手处理。
2. **「待补充」状态 Badge 颜色**:当前红色(destructive),mockup 是橙色;若要还原需给 Badge 加 warning variant。用户未裁决,搁置。
3. **首页说明文案中「咖啡亭台账」表名未改**:那是飞书多维表格的真实表名,界面须与之一致;若用户想统一改成"档案",先在飞书里重命名表,再改代码引用。
4. **NewDevicePage 是死代码**:`app.tsx` 中 `devices/new` 已重定向到 `/parts/new`,`NewDevicePage.tsx` 无引用,其内部仍有"台账"文案(用户不可见)。可整目录删除。
5. **页面加载期一条资源 401**:线上控制台可见,不影响功能,未定位。
6. **外层 cofeplus 仓库有未提交内容**:`docs/superpowers/mockups/` 两个 mockup、`.kiro/`、`cofeconfig/`(整个应用仓库嵌在外层仓库目录里但未被外层跟踪)、screenshots 若干。是否提交/忽略由用户定。
7. **lark-cli 提示可升级**(1.0.67 → 1.0.79),不紧急。

## 七、用户偏好(与本项目相关)

- 全程中文沟通;PRD/文档用中性产品语言,**不暴露代码字段名/函数名**(见 memory:`prd-no-code-variable-names`)
- 发布、删数据等不可逆操作**必须先问再做**;删除数据前先扫描列出命中项给用户确认
- 用词避免专业术语(本次"台账→档案"即用户主动要求,理由:一线人员看不懂记账术语)
