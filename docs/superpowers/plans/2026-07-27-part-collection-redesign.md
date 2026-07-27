# 部件配置采集流程重设计 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把部件配置采集从"一次录一件、录完弹窗"重构为"设备工作单"，并新增部件编辑入口与共用表单组件，消除字段覆盖风险。

**Architecture:** 抽出共用的部件表单字段组件（`PartFormFields`）与一批可单测的纯函数（`partForm.helpers.ts`）；新增流程 Step 2 重构为设备工作单（设备信息卡 + 已录清单 + 录入表单同屏、提交不弹窗）；新增独立编辑页 `EditPartPage` 与路由，台账页部件列表变为可点击。

**Tech Stack:** React 19 + react-hook-form + zod + shadcn/ui + Tailwind；数据层 `capabilityClient` 调飞书多维表格；测试用 ts-jest（node 环境，仅覆盖纯函数）。

## Global Constraints

- 所有代码路径相对实施仓库根目录 `/Users/mac/cofeplus/cofeplus/cofeconfig`；本 plan 文档本身位于主仓库 `/Users/mac/cofeplus/cofeplus/docs/superpowers/plans/`。
- 所有 git 操作在 `cofeconfig/` 内、`sprint/default` 分支进行。发布走 `lark-cli apps +release-create --app-id app_17artejsm44`。**禁止直推 `main`、禁止 force-push。**
- 受限路径不得修改（来自 `.spark_project` 的 `[files.restrict]`）：`client/src/api/gen`、`package.json`、`.spark_project`、`.gitignore`。本计划不新增任何依赖，全部使用现有库。
- 路径别名：`@/*` → `client/src/*`，`@shared/*` → `shared/*`。
- **前端无组件测试环境**：jest 为 node 环境，`testMatch` 仅 `server/**/*.spec.ts` 与 `test/unit/**/*.spec.ts`。因此仅纯函数走 jest 单测（Task 2）；所有页面/组件任务通过 `npm run type:check` + `npm run lint` + `npm run dev` 手动验证，计划中每个此类任务都给出明确的手动验证清单。
- 视觉沿用现有暖咖橙主题：卡片 `rounded-2xl border shadow-sm`、输入框 `h-11 rounded-xl`、主色 `hsl(28 68% 53%)`。不引入新视觉语言。
- 每个任务结束后提交一次 commit（消息用英文，遵循现有 conventional commits 风格）。
- 命中"设备编号+部件名称+序号"复合键时**静默转更新**的现有行为在新增/工作单流程中**保留**（仅提示更醒目）；编辑页则是全新的全字段回写逻辑。这是设计确认的边界，两处提交逻辑不同是有意为之。

---

## 参考：设计文档与现状

- 设计文档：`/Users/mac/cofeplus/cofeplus/docs/superpowers/specs/2026-07-27-part-collection-redesign-design.md`
- Mockup：`/Users/mac/cofeplus/cofeplus/docs/superpowers/mockups/2026-07-27-part-collection-redesign.html`

**关键现状文件（实施前必读）：**
- `client/src/pages/PartCollection/PartCollectionPage.tsx`（949 行，两步流程 + 成功弹窗 + 双 banner + 死代码 `handleBackToHome`）
- `client/src/pages/DeviceLedger/DeviceLedgerPage.tsx`（部件列表 `<li>` 纯展示，第 370-393 行）
- `client/src/api/bitable/parts.ts`（`createPartRecord` / `updatePartRecord` / `findPartByCompositeKey` / `searchPartRecords`）
- `client/src/api/bitable/kiosk.ts`（`ensureKioskForDevice` 新建时写"待完善"占位，第 109-122 行）
- `client/src/api/bitable/common.ts`（`BITABLE_KIOSK_INSTANCE_ID`、`getTextField`、`getBitableErrorMessage`）
- `shared/api.interface.ts`（`PartConfigRecord`、`CoffeeKioskRecord`）
- `client/src/app.tsx`（路由）

---

## 文件结构

**新建：**
- `client/src/pages/PartCollection/partFormSchema.ts` — 共用 zod schema、`PartFormValues`、`UploadedFileItem`、`MATERIAL_STATUS_OPTIONS`、`PRESET_PART_NAMES`
- `client/src/pages/PartCollection/partForm.helpers.ts` — 纯函数：`suggestNextSequence`、`getRecordedPartNames`、`buildPartBanner`、`dateStringToTimestamp`、`timestampToDateString`、`buildKioskPatch`
- `client/src/pages/PartCollection/PartFormFields.tsx` — 共用四区块表单字段组件
- `client/src/pages/PartCollection/EditPartPage.tsx` — 编辑部件页
- `test/unit/partForm.helpers.spec.ts` — 纯函数单测

**修改：**
- `client/src/api/bitable/kiosk.ts` — 新增 `updateKioskRecord`；`ensureKioskForDevice` 接受设备信息、不再写"待完善"
- `client/src/pages/PartCollection/PartCollectionPage.tsx` — 重构为设备工作单
- `client/src/pages/DeviceLedger/DeviceLedgerPage.tsx` — 部件列表可点击跳编辑页
- `client/src/app.tsx` — 新增 `/parts/:recordId/edit` 路由

---

## Task 1: 抽取共用 schema、常量与预置部件清单

**Files:**
- Create: `client/src/pages/PartCollection/partFormSchema.ts`

**Interfaces:**
- Produces: `partSchema`（zod object）、`PartFormValues`（`z.infer`）、`UploadedFileItem`、`MATERIAL_STATUS_OPTIONS`、`PRESET_PART_NAMES`、`DEVICE_DEFAULT_STATUS`
- Consumes: 无

- [ ] **Step 1: 创建 schema 文件**

创建 `client/src/pages/PartCollection/partFormSchema.ts`，完整内容：

```typescript
import { z } from 'zod';

/** 部件表单校验 schema（新增录入与编辑共用） */
export const partSchema = z.object({
  deviceCode: z.string().min(1, '请输入设备编号'),
  partName: z.string().min(1, '请输入部件名称'),
  sequence: z.coerce
    .number({ invalid_type_error: '序号必须是数字' })
    .int('序号必须是整数')
    .min(1, '序号必须大于0'),
  partSerialNumber: z.string().optional(),
  hardwareVersion: z.string().optional(),
  firmwareVersion: z.string().optional(),
  paramsAndNotes: z.string().optional(),
  materialStatus: z.string().min(1, '请选择资料状态'),
  partPhotos: z.array(z.any()).optional(),
});

export type PartFormValues = z.infer<typeof partSchema>;

/** 上传附件的本地表示 */
export interface UploadedFileItem {
  name: string;
  size?: number;
  file: File;
}

/** 资料状态可选项 */
export const MATERIAL_STATUS_OPTIONS = ['已录入', '待补充', '待核验'] as const;

/** 新建设备台账时的默认状态 */
export const DEVICE_DEFAULT_STATUS = '使用中';

/**
 * 标准部件预置清单（来自线下《机器人咖啡亭信息表》RCK001 实样 16 项）。
 * 用于录入时的名称补全与完成度参照；支持清单外自由输入。
 */
export const PRESET_PART_NAMES = [
  '咖啡机',
  '机械臂',
  '制冰机',
  '出杯机构1#（左）',
  '出杯机构2#（右）',
  '落杯机构',
  '压盖机构',
  '后道粉后道颗粒',
  '前道粉',
  '前道浆',
  '冰箱',
  '水路总成',
  '侧面屏',
  '点单屏A(左)',
  '点单屏B(右)',
  '广告屏',
] as const;
```

- [ ] **Step 2: 类型检查**

Run: `cd /Users/mac/cofeplus/cofeplus/cofeconfig && npm run type:check:client`
Expected: PASS（新文件无类型错误；此时旧 `PartCollectionPage.tsx` 仍保留自己的 schema 定义，不冲突）

- [ ] **Step 3: 提交**

```bash
cd /Users/mac/cofeplus/cofeplus/cofeconfig
git add client/src/pages/PartCollection/partFormSchema.ts
git commit -m "feat(parts): extract shared part form schema, constants and preset part list"
```

---

## Task 2: 纯函数 helpers + 单测（TDD）

**Files:**
- Create: `client/src/pages/PartCollection/partForm.helpers.ts`
- Test: `test/unit/partForm.helpers.spec.ts`

**Interfaces:**
- Produces:
  - `suggestNextSequence(existingParts: SequenceLookupPart[], partName: string): number`
  - `getRecordedPartNames(existingParts: { partName: string }[]): Set<string>`
  - `buildPartBanner(input: PartBannerInput): { kind: PartBannerKind; text: string }`
  - `dateStringToTimestamp(dateStr: string): number`
  - `timestampToDateString(ts: number): string`
  - `buildKioskPatch(existing: KioskEditableFields, incoming?: KioskEditableFields): KioskEditableFields`
- Consumes: `dayjs`（现有依赖）

- [ ] **Step 1: 写失败的测试**

创建 `test/unit/partForm.helpers.spec.ts`，完整内容：

```typescript
import {
  suggestNextSequence,
  getRecordedPartNames,
  buildPartBanner,
  dateStringToTimestamp,
  timestampToDateString,
  buildKioskPatch,
} from '../../client/src/pages/PartCollection/partForm.helpers';

describe('suggestNextSequence', () => {
  const parts = [
    { partName: '出杯机构', sequence: 1 },
    { partName: '咖啡机', sequence: 1 },
  ];

  it('空部件名返回 1', () => {
    expect(suggestNextSequence(parts, '')).toBe(1);
  });

  it('首次出现的部件名返回 1', () => {
    expect(suggestNextSequence(parts, '制冰机')).toBe(1);
  });

  it('同名已有一件时返回下一号', () => {
    expect(suggestNextSequence(parts, '出杯机构')).toBe(2);
  });

  it('同名多件时返回最大序号加一', () => {
    const multi = [
      { partName: '出杯机构', sequence: 1 },
      { partName: '出杯机构', sequence: 3 },
    ];
    expect(suggestNextSequence(multi, '出杯机构')).toBe(4);
  });
});

describe('getRecordedPartNames', () => {
  it('返回去重后的部件名集合', () => {
    const set = getRecordedPartNames([
      { partName: '咖啡机' },
      { partName: '机械臂' },
      { partName: '咖啡机' },
    ]);
    expect(set.has('咖啡机')).toBe(true);
    expect(set.has('机械臂')).toBe(true);
    expect(set.size).toBe(2);
  });
});

describe('buildPartBanner', () => {
  it('命中已有部件时给出更新警示文案', () => {
    const r = buildPartBanner({
      deviceCode: 'RCK001',
      deviceExists: true,
      duplicatePart: { partName: '机械臂', sequence: 2, materialStatus: '待补充' },
    });
    expect(r.kind).toBe('part-duplicate');
    expect(r.text).toContain('机械臂');
    expect(r.text).toContain('序号 2');
    expect(r.text).toContain('待补充');
    expect(r.text).toContain('更新原记录');
  });

  it('设备已存在且无重复时给出归属文案', () => {
    const r = buildPartBanner({
      deviceCode: 'RCK001',
      deviceExists: true,
      duplicatePart: null,
    });
    expect(r.kind).toBe('device-exists');
    expect(r.text).toContain('RCK001');
  });

  it('新设备时给出创建台账文案', () => {
    const r = buildPartBanner({
      deviceCode: 'RCK009',
      deviceExists: false,
      duplicatePart: null,
    });
    expect(r.kind).toBe('device-new');
    expect(r.text).toContain('新设备');
  });
});

describe('date helpers', () => {
  it('日期字符串转时间戳再转回一致', () => {
    const ts = dateStringToTimestamp('2021-03-25');
    expect(ts).toBeGreaterThan(0);
    expect(timestampToDateString(ts)).toBe('2021-03-25');
  });

  it('空字符串转时间戳返回 0', () => {
    expect(dateStringToTimestamp('')).toBe(0);
  });

  it('时间戳 0 转字符串返回空', () => {
    expect(timestampToDateString(0)).toBe('');
  });
});

describe('buildKioskPatch', () => {
  const existing = { deviceName: '待完善', deviceVersion: '', productionDate: 0 };

  it('无 incoming 时返回空补丁', () => {
    expect(buildKioskPatch(existing)).toEqual({});
  });

  it('仅包含非空且与现有不同的字段', () => {
    const patch = buildKioskPatch(existing, {
      deviceName: '机器人咖啡亭',
      deviceVersion: '3.0室内超高版',
      productionDate: 1616601600000,
    });
    expect(patch.deviceName).toBe('机器人咖啡亭');
    expect(patch.deviceVersion).toBe('3.0室内超高版');
    expect(patch.productionDate).toBe(1616601600000);
  });

  it('空值不覆盖现有值', () => {
    const patch = buildKioskPatch(
      { deviceName: '机器人咖啡亭', deviceVersion: '3.0', productionDate: 123 },
      { deviceName: '', deviceVersion: '3.0', productionDate: 0 }
    );
    expect(patch).toEqual({});
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd /Users/mac/cofeplus/cofeplus/cofeconfig && npm test -- test/unit/partForm.helpers.spec.ts`
Expected: FAIL —— `Cannot find module '.../partForm.helpers'`

- [ ] **Step 3: 实现 helpers**

创建 `client/src/pages/PartCollection/partForm.helpers.ts`，完整内容：

```typescript
import dayjs from 'dayjs';

/** suggestNextSequence 的输入项（轻量结构，避免耦合 API 类型） */
export interface SequenceLookupPart {
  partName: string;
  sequence: number;
}

/**
 * 给定本设备已录部件与目标部件名，建议下一个可用序号。
 * 同名不存在 → 1；同名已存在 → 现有最大序号 + 1。
 */
export function suggestNextSequence(
  existingParts: SequenceLookupPart[],
  partName: string
): number {
  if (!partName) return 1;
  const sameName = existingParts.filter((p) => p.partName === partName);
  if (sameName.length === 0) return 1;
  const maxSeq = Math.max(...sameName.map((p) => p.sequence));
  return maxSeq + 1;
}

/** 已录入的部件名集合（用于预置清单完成度参照） */
export function getRecordedPartNames(
  existingParts: { partName: string }[]
): Set<string> {
  return new Set(existingParts.map((p) => p.partName));
}

export type PartBannerKind = 'device-exists' | 'device-new' | 'part-duplicate';

export interface PartBannerInput {
  deviceCode: string;
  deviceExists: boolean;
  duplicatePart: { partName: string; sequence: number; materialStatus: string } | null;
}

/** 工作单/新增场景合并后的单条状态提示文案 */
export function buildPartBanner(
  input: PartBannerInput
): { kind: PartBannerKind; text: string } {
  if (input.duplicatePart) {
    const { partName, sequence, materialStatus } = input.duplicatePart;
    return {
      kind: 'part-duplicate',
      text: `本设备下已有「${partName} · 序号 ${sequence}」，保存后将更新原记录（原资料状态：${materialStatus || '未知'}）`,
    };
  }
  if (input.deviceExists) {
    return {
      kind: 'device-exists',
      text: `设备 ${input.deviceCode} 已存在，接下来录入的部件都归属这台设备`,
    };
  }
  return {
    kind: 'device-new',
    text: `设备 ${input.deviceCode} 为新设备，保存首个部件时同步创建设备台账`,
  };
}

/** 日期字符串（YYYY-MM-DD）转时间戳；空串返回 0 */
export function dateStringToTimestamp(dateStr: string): number {
  if (!dateStr) return 0;
  const d = dayjs(dateStr);
  return d.isValid() ? d.valueOf() : 0;
}

/** 时间戳转日期字符串（YYYY-MM-DD）；0 或无效返回空串 */
export function timestampToDateString(ts: number): string {
  if (!ts) return '';
  const d = dayjs(ts);
  return d.isValid() ? d.format('YYYY-MM-DD') : '';
}

/** 设备台账可编辑字段（语义键） */
export interface KioskEditableFields {
  deviceName?: string;
  deviceVersion?: string;
  productionDate?: number;
}

/**
 * 计算设备台账的更新补丁：仅当 incoming 提供了非空且与现有不同的值才纳入，
 * 避免工作单空字段覆盖已有台账数据。
 */
export function buildKioskPatch(
  existing: KioskEditableFields,
  incoming?: KioskEditableFields
): KioskEditableFields {
  const patch: KioskEditableFields = {};
  if (!incoming) return patch;
  if (incoming.deviceName && incoming.deviceName !== existing.deviceName) {
    patch.deviceName = incoming.deviceName;
  }
  if (incoming.deviceVersion && incoming.deviceVersion !== existing.deviceVersion) {
    patch.deviceVersion = incoming.deviceVersion;
  }
  if (incoming.productionDate && incoming.productionDate !== existing.productionDate) {
    patch.productionDate = incoming.productionDate;
  }
  return patch;
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd /Users/mac/cofeplus/cofeplus/cofeconfig && npm test -- test/unit/partForm.helpers.spec.ts`
Expected: PASS（全部用例通过）

- [ ] **Step 5: 提交**

```bash
cd /Users/mac/cofeplus/cofeplus/cofeconfig
git add client/src/pages/PartCollection/partForm.helpers.ts test/unit/partForm.helpers.spec.ts
git commit -m "feat(parts): add tested pure helpers for sequence/banner/date/kiosk-patch"
```

---

## Task 3: kiosk API 支持设备级字段写入

**Files:**
- Modify: `client/src/api/bitable/kiosk.ts`

**Interfaces:**
- Consumes: `buildKioskPatch`、`KioskEditableFields`（Task 2）；`BITABLE_KIOSK_INSTANCE_ID`、现有 `getKioskByDeviceCode`、`createKioskRecord`
- Produces:
  - `updateKioskRecord(recordId: string, data: KioskEditableFields): Promise<string>`
  - `ensureKioskForDevice(deviceCode: string, deviceInfo?: KioskEditableFields): Promise<{ recordId: string; created: boolean }>`（签名扩展，向后兼容——`deviceInfo` 可选）

- [ ] **Step 1: 新增 import 与 updateKioskRecord**

在 `client/src/api/bitable/kiosk.ts` 顶部 import 区（第 4 行 `import type { CoffeeKioskRecord }` 之后）追加：

```typescript
import {
  buildKioskPatch,
  type KioskEditableFields,
} from '@/pages/PartCollection/partForm.helpers';
```

在文件末尾（现有 `ensureKioskForDevice` 之前）新增 `updateKioskRecord`：

```typescript
export const updateKioskRecord = async (
  recordId: string,
  data: KioskEditableFields
): Promise<string> => {
  try {
    const record: Record<string, any> = {};
    if (data.deviceName !== undefined) record['设备名称'] = data.deviceName;
    if (data.deviceVersion !== undefined) record['设备版本号'] = data.deviceVersion;
    if (data.productionDate !== undefined) record['出厂日期'] = data.productionDate;
    const response = await capabilityClient
      .load(BITABLE_KIOSK_INSTANCE_ID)
      .call<{ records: Array<{ id: string }> }>('batchUpdateRecords', {
        records: [{ id: recordId, record }],
      });
    return response.records?.[0]?.id || '';
  } catch (error) {
    logger.error('更新设备台账失败', error);
    throw error;
  }
};
```

- [ ] **Step 2: 重写 ensureKioskForDevice**

将现有 `ensureKioskForDevice`（第 109-122 行）整体替换为：

```typescript
export const ensureKioskForDevice = async (
  deviceCode: string,
  deviceInfo?: KioskEditableFields
): Promise<{ recordId: string; created: boolean }> => {
  const existing = await getKioskByDeviceCode(deviceCode);
  if (existing) {
    const patch = buildKioskPatch(
      {
        deviceName: existing.deviceName,
        deviceVersion: existing.deviceVersion,
        productionDate: existing.productionDate,
      },
      deviceInfo
    );
    if (Object.keys(patch).length > 0) {
      await updateKioskRecord(existing.recordId, patch);
    }
    return { recordId: existing.recordId, created: false };
  }
  const recordId = await createKioskRecord({
    deviceCode,
    deviceName: deviceInfo?.deviceName || '待完善',
    deviceVersion: deviceInfo?.deviceVersion || '',
    productionDate: deviceInfo?.productionDate || 0,
    deviceStatus: DEVICE_DEFAULT_STATUS,
  });
  return { recordId, created: true };
};
```

在 import 区补充 `DEVICE_DEFAULT_STATUS`（与 Task 2 的 helpers import 相邻）：

```typescript
import { DEVICE_DEFAULT_STATUS } from '@/pages/PartCollection/partFormSchema';
```

> 注：新建时若 `deviceInfo` 未提供名称，仍回退到"待完善"作为兜底（例如从旧路径调用）；工作单会提供真实名称，因此正常流程不再出现占位名。

- [ ] **Step 3: 类型检查**

Run: `cd /Users/mac/cofeplus/cofeplus/cofeconfig && npm run type:check:client`
Expected: PASS。若报 `ensureKioskForDevice` 调用处参数不匹配——不会，因为 `deviceInfo` 可选，现有 `PartCollectionPage` 的单参调用仍合法。

- [ ] **Step 4: lint**

Run: `cd /Users/mac/cofeplus/cofeplus/cofeconfig && npm run eslint`
Expected: PASS（无新增 lint 错误）

- [ ] **Step 5: 提交**

```bash
cd /Users/mac/cofeplus/cofeplus/cofeconfig
git add client/src/api/bitable/kiosk.ts
git commit -m "feat(kiosk): accept device fields in ensureKioskForDevice, add updateKioskRecord"
```

---

## Task 4: 共用表单字段组件 PartFormFields

**Files:**
- Create: `client/src/pages/PartCollection/PartFormFields.tsx`

**Interfaces:**
- Consumes: `PartFormValues`、`UploadedFileItem`、`MATERIAL_STATUS_OPTIONS`、`PRESET_PART_NAMES`（Task 1）；shadcn `Form*`/`Input`/`Textarea`/`Select`/`Button`
- Produces: `PartFormFields`（默认导出组件）+ `PartFormFieldsProps`

- [ ] **Step 1: 创建组件**

创建 `client/src/pages/PartCollection/PartFormFields.tsx`，完整内容：

```typescript
import React, { useRef } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { Upload, X, FileText } from 'lucide-react';

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import {
  MATERIAL_STATUS_OPTIONS,
  PRESET_PART_NAMES,
  type PartFormValues,
  type UploadedFileItem,
} from './partFormSchema';

export interface PartFormFieldsProps {
  form: UseFormReturn<PartFormValues>;
  uploadedFiles: UploadedFileItem[];
  onFilesSelected: (files: File[]) => void;
  onRemoveFile: (index: number) => void;
  /** 编辑/更新场景：未重传附件时提示保留原附件 */
  showAttachmentKeepHint?: boolean;
  /** 已录部件名集合，用于展示预置清单完成度 */
  recordedPartNames?: Set<string>;
}

const DATALIST_ID = 'preset-part-names';

const GroupTitle: React.FC<{ children: React.ReactNode; hint?: string }> = ({
  children,
  hint,
}) => (
  <div className="mb-3 flex items-baseline gap-2">
    <span className="h-4 w-1 self-center rounded-sm bg-primary" aria-hidden />
    <h4 className="text-sm font-semibold text-foreground">{children}</h4>
    {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
  </div>
);

const PartFormFields: React.FC<PartFormFieldsProps> = ({
  form,
  uploadedFiles,
  onFilesSelected,
  onRemoveFile,
  showAttachmentKeepHint = false,
  recordedPartNames,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const recordedCount = recordedPartNames
    ? PRESET_PART_NAMES.filter((n) => recordedPartNames.has(n)).length
    : 0;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    onFilesSelected(Array.from(files));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;
    onFilesSelected(Array.from(files));
  };

  return (
    <div className="space-y-6">
      {/* 预置清单补全数据源 */}
      <datalist id={DATALIST_ID}>
        {PRESET_PART_NAMES.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>

      {/* 分组一：标识信息 */}
      <section>
        <GroupTitle>标识信息</GroupTitle>
        <div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">
          <FormField
            control={form.control}
            name="partName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  部件名称 <span className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    list={DATALIST_ID}
                    placeholder="从清单选择或直接输入"
                    className="h-11 rounded-xl"
                  />
                </FormControl>
                {recordedPartNames && (
                  <p className="text-xs text-muted-foreground">
                    标准部件 {PRESET_PART_NAMES.length} 项，已录 {recordedCount} 项
                  </p>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="sequence"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  序号 <span className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    {...field}
                    onChange={(e) => field.onChange(e.target.value)}
                    placeholder="同名部件的第几台，从 1 开始"
                    className="h-11 rounded-xl"
                  />
                </FormControl>
                <p className="text-xs text-muted-foreground">
                  与部件名称组合唯一；已有同名部件时自动建议下一号
                </p>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="partSerialNumber"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>部件序列号</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    value={field.value || ''}
                    placeholder="铭牌上的序列号（选填）"
                    className="h-11 rounded-xl"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </section>

      {/* 分组二：版本信息 */}
      <section>
        <GroupTitle>版本信息</GroupTitle>
        <div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">
          <FormField
            control={form.control}
            name="hardwareVersion"
            render={({ field }) => (
              <FormItem>
                <FormLabel>硬件版本号</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    value={field.value || ''}
                    placeholder="选填"
                    className="h-11 rounded-xl"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="firmwareVersion"
            render={({ field }) => (
              <FormItem>
                <FormLabel>固件版本号</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    value={field.value || ''}
                    placeholder="选填"
                    className="h-11 rounded-xl"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </section>

      {/* 分组三：资料状态与备注 */}
      <section>
        <GroupTitle>资料状态与备注</GroupTitle>
        <div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">
          <FormField
            control={form.control}
            name="materialStatus"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  资料状态 <span className="text-destructive">*</span>
                </FormLabel>
                <Select value={field.value || ''} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="h-11 w-full rounded-xl">
                      <SelectValue placeholder="请选择资料状态" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {MATERIAL_STATUS_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="paramsAndNotes"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>参数与备注</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    value={field.value || ''}
                    rows={3}
                    placeholder="运行参数、调校值等，如「出冰时间：4s；重量AD值：466」（选填）"
                    className="rounded-xl"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </section>

      {/* 分组四：附件 */}
      <section>
        <GroupTitle hint="部件照片、铭牌、说明书等">附件</GroupTitle>
        <div
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-accent/30 px-6 py-8 text-center transition-colors hover:border-primary/50 hover:bg-accent/60"
        >
          <Upload className="h-8 w-8 text-muted-foreground" />
          <div className="text-sm font-medium text-foreground">
            点击或拖拽文件到此处上传
          </div>
          <div className="text-xs text-muted-foreground">
            支持图片、文档等常见格式（选填）
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileChange}
          className="hidden"
        />

        {uploadedFiles.length > 0 && (
          <ul className="mt-3 space-y-2">
            {uploadedFiles.map((file, idx) => (
              <li
                key={idx}
                className="flex items-center justify-between gap-2 rounded-xl border bg-card px-3 py-2"
              >
                <div className="flex min-w-0 flex-1 items-center gap-2 text-sm">
                  <FileText className="h-4 w-4 shrink-0 text-primary" />
                  <span className="truncate">{file.name}</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => onRemoveFile(idx)}
                  className="h-7 w-7 shrink-0 rounded-full text-muted-foreground hover:text-destructive"
                  aria-label="删除文件"
                >
                  <X className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}

        {showAttachmentKeepHint && uploadedFiles.length === 0 && (
          <div className="mt-3 text-xs text-muted-foreground">
            未重新上传附件，将保留原有附件
          </div>
        )}
      </section>
    </div>
  );
};

export default PartFormFields;
```

- [ ] **Step 2: 类型检查**

Run: `cd /Users/mac/cofeplus/cofeplus/cofeconfig && npm run type:check:client`
Expected: PASS

- [ ] **Step 3: lint**

Run: `cd /Users/mac/cofeplus/cofeplus/cofeconfig && npm run eslint`
Expected: PASS

- [ ] **Step 4: 提交**

```bash
cd /Users/mac/cofeplus/cofeplus/cofeconfig
git add client/src/pages/PartCollection/PartFormFields.tsx
git commit -m "feat(parts): add shared grouped PartFormFields component"
```

---

## Task 5: 编辑部件页 EditPartPage + 路由

**Files:**
- Create: `client/src/pages/PartCollection/EditPartPage.tsx`
- Modify: `client/src/app.tsx`

**Interfaces:**
- Consumes: `PartFormFields`（Task 4）；`partSchema`/`PartFormValues`/`UploadedFileItem`（Task 1）；`bitable.parts.updatePartRecord`、`bitable.kiosk.ensureKioskForDevice`；`PartConfigRecord`（`@shared/api.interface`）
- Produces: `EditPartPage`（默认导出）；路由 `/parts/:recordId/edit`
- 入口约定：调用方通过 `navigate(\`/parts/${part.recordId}/edit\`, { state: { part } })` 传入完整 `PartConfigRecord`。无 state 时显示"请从设备台账进入"引导。

- [ ] **Step 1: 创建编辑页**

创建 `client/src/pages/PartCollection/EditPartPage.tsx`，完整内容：

```typescript
import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { Pencil, ArrowLeft, Loader2 } from 'lucide-react';
import { logger } from '@lark-apaas/client-toolkit/logger';

import { bitable } from '@/api';
import { getBitableErrorMessage } from '@/api/bitable/common';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Form } from '@/components/ui/form';
import PartFormFields from './PartFormFields';
import {
  partSchema,
  type PartFormValues,
  type UploadedFileItem,
} from './partFormSchema';
import type { PartConfigRecord } from '@shared/api.interface';

const EditPartPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const part = (location.state as { part?: PartConfigRecord } | null)?.part ?? null;

  const [uploadedFiles, setUploadedFiles] = useState<UploadedFileItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<PartFormValues>({
    resolver: zodResolver(partSchema),
    defaultValues: {
      deviceCode: part?.deviceCode ?? '',
      partName: part?.partName ?? '',
      sequence: part?.sequence ?? 1,
      partSerialNumber: part?.partSerialNumber ?? '',
      hardwareVersion: part?.hardwareVersion ?? '',
      firmwareVersion: part?.firmwareVersion ?? '',
      paramsAndNotes: part?.paramsAndNotes ?? '',
      materialStatus: part?.materialStatus ?? '待核验',
      partPhotos: [],
    },
    mode: 'onTouched',
  });

  useEffect(() => {
    form.setValue(
      'partPhotos',
      uploadedFiles.map((f) => f.file),
      { shouldValidate: false }
    );
  }, [uploadedFiles, form]);

  const handleFilesSelected = (files: File[]) => {
    setUploadedFiles((prev) => [
      ...prev,
      ...files.map((file) => ({ name: file.name, size: file.size, file })),
    ]);
  };

  const handleRemoveFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleBack = () => navigate('/devices');

  const handleSubmit = async (values: PartFormValues) => {
    if (!part) return;
    setIsSubmitting(true);
    try {
      const { recordId: deviceRecordId } = await bitable.kiosk.ensureKioskForDevice(
        part.deviceCode
      );
      // 全字段回写：编辑页已预填充真实值，所见即所存，空串亦为用户意图。
      await bitable.parts.updatePartRecord(
        part.recordId,
        {
          partName: values.partName,
          sequence: values.sequence,
          partSerialNumber: values.partSerialNumber ?? '',
          hardwareVersion: values.hardwareVersion ?? '',
          firmwareVersion: values.firmwareVersion ?? '',
          paramsAndNotes: values.paramsAndNotes ?? '',
          materialStatus: values.materialStatus,
          // 附件特殊：未重传则保留原附件（updatePartRecord 仅在 length>0 时写入）
          partPhotos: uploadedFiles.length > 0 ? values.partPhotos : undefined,
        },
        deviceRecordId
      );
      toast.success(`已保存「${values.partName}」的修改`);
      navigate('/devices');
    } catch (err) {
      logger.error('保存部件修改失败', err);
      toast.error(getBitableErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!part) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4 px-4 py-16 text-center">
        <p className="text-muted-foreground">
          未获取到部件信息，请从设备台账的部件列表进入编辑。
        </p>
        <Button onClick={handleBack} className="rounded-xl">
          <ArrowLeft className="mr-1 h-4 w-4" />
          前往设备台账
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-4 flex items-center gap-3 rounded-xl border border-accent bg-accent px-4 py-3 text-sm text-accent-foreground">
        <Pencil className="h-4 w-4 shrink-0" />
        <div>
          正在编辑{' '}
          <strong className="font-semibold">
            「{part.deviceCode} · {part.partName} · 序号 {part.sequence}」
          </strong>
          <span className="ml-1 opacity-80">设备编号固定，不可在编辑页修改</span>
        </div>
      </div>

      <Card className="rounded-2xl border shadow-sm">
        <CardContent className="p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)}>
              <PartFormFields
                form={form}
                uploadedFiles={uploadedFiles}
                onFilesSelected={handleFilesSelected}
                onRemoveFile={handleRemoveFile}
                showAttachmentKeepHint
              />

              <div className="mt-8 flex items-center justify-end gap-3 border-t border-border pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBack}
                  className="h-11 rounded-xl px-6"
                >
                  取消返回
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-11 rounded-xl px-8"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      保存中...
                    </>
                  ) : (
                    '保存修改'
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default EditPartPage;
```

- [ ] **Step 2: 注册路由**

修改 `client/src/app.tsx`：在 import 区（第 8 行 `import PartCollectionPage ...` 之后）加：

```typescript
import EditPartPage from './pages/PartCollection/EditPartPage';
```

在 `<Route path="parts/new" ... />`（第 17 行）之后新增：

```typescript
        <Route path="parts/:recordId/edit" element={<EditPartPage />} />
```

- [ ] **Step 3: 类型检查 + lint**

Run: `cd /Users/mac/cofeplus/cofeplus/cofeconfig && npm run type:check:client && npm run eslint`
Expected: PASS

- [ ] **Step 4: 手动验证（dev）**

Run: `cd /Users/mac/cofeplus/cofeplus/cofeconfig && npm run dev`
手动步骤（用 gstack `/browse` 打开本地 dev 地址）：
1. 直接访问 `/parts/anything/edit`（无 state）→ 应显示"未获取到部件信息…前往设备台账"引导，不白屏、不报错。
2. 控制台无红色 React 错误。

Expected: 引导态正常渲染。（完整编辑链路在 Task 7 打通入口后再端到端验证。）

- [ ] **Step 5: 提交**

```bash
cd /Users/mac/cofeplus/cofeplus/cofeconfig
git add client/src/pages/PartCollection/EditPartPage.tsx client/src/app.tsx
git commit -m "feat(parts): add single-step EditPartPage with full-field write-back and route"
```

---

## Task 6: PartCollectionPage 重构为设备工作单

**Files:**
- Modify: `client/src/pages/PartCollection/PartCollectionPage.tsx`（整体替换）

**Interfaces:**
- Consumes: `PartFormFields`（Task 4）；`partSchema`/`PartFormValues`/`UploadedFileItem`（Task 1）；`suggestNextSequence`/`getRecordedPartNames`/`buildPartBanner`/`dateStringToTimestamp`/`timestampToDateString`（Task 2）；`bitable.kiosk.*`、`bitable.parts.*`
- Produces: 重构后的 `PartCollectionPage`（默认导出，路由 `/parts/new` 不变）

**改动要点（相对现状）：**
1. 删除成功弹窗（`Dialog` 及 `handleViewLedger`/`handleContinueNext`/`handleBackToHome`/`getSuccessTitle`/`successDialogOpen` 等）——死代码 `handleBackToHome` 随之清除。
2. Step 2 改为工作单：设备信息卡（编号锁定 + 名称/版本/出厂日期可编辑）+ 已录部件清单（可点击进编辑页）+ `<PartFormFields>` 录入表单。
3. 提交成功不弹窗：刷新已录清单、重置表单（保留 deviceCode 与硬件版本号沿用）、焦点回部件名称。
4. 双 banner 合并为一条 `buildPartBanner`（仅命中重复部件时在表单区显示橙色警示）。
5. 序号自动建议：partName 变化时依据已录清单 `suggestNextSequence`。
6. 底部"完成本台设备"（回 `/devices`）/"换一台设备"（回 Step 1）。

- [ ] **Step 1: 整体替换 PartCollectionPage.tsx**

将 `client/src/pages/PartCollection/PartCollectionPage.tsx` 整个文件替换为：

```typescript
import React, { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Check,
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Lock,
} from 'lucide-react';
import { logger } from '@lark-apaas/client-toolkit/logger';

import { bitable } from '@/api';
import { getBitableErrorMessage } from '@/api/bitable/common';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import PartFormFields from './PartFormFields';
import {
  partSchema,
  DEVICE_DEFAULT_STATUS,
  type PartFormValues,
  type UploadedFileItem,
} from './partFormSchema';
import {
  suggestNextSequence,
  getRecordedPartNames,
  buildPartBanner,
  dateStringToTimestamp,
  timestampToDateString,
} from './partForm.helpers';
import type { PartConfigRecord, CoffeeKioskRecord } from '@shared/api.interface';

type DeviceLookupStatus = 'idle' | 'checking' | 'found' | 'not-found' | 'error';

const materialStatusVariant = (
  status?: string
): 'default' | 'secondary' | 'destructive' => {
  if (status === '已录入') return 'default';
  if (status === '待核验') return 'secondary';
  return 'destructive';
};

const PartCollectionPage: React.FC = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);

  // 设备侧
  const [deviceLookupStatus, setDeviceLookupStatus] =
    useState<DeviceLookupStatus>('idle');
  const [deviceLookupError, setDeviceLookupError] = useState('');
  const [deviceExists, setDeviceExists] = useState(false);
  const [deviceName, setDeviceName] = useState('');
  const [deviceVersion, setDeviceVersion] = useState('');
  const [productionDate, setProductionDate] = useState(''); // YYYY-MM-DD

  // 已录部件清单
  const [deviceParts, setDeviceParts] = useState<PartConfigRecord[]>([]);
  const [partsLoading, setPartsLoading] = useState(false);
  const [lastSavedRecordId, setLastSavedRecordId] = useState<string | null>(null);

  // 录入表单侧
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFileItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingPart, setExistingPart] = useState<PartConfigRecord | null>(null);
  const partLookupTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const form = useForm<PartFormValues>({
    resolver: zodResolver(partSchema),
    defaultValues: {
      deviceCode: '',
      partName: '',
      sequence: 1,
      partSerialNumber: '',
      hardwareVersion: '',
      firmwareVersion: '',
      paramsAndNotes: '',
      materialStatus: '待核验',
      partPhotos: [],
    },
    mode: 'onTouched',
  });

  const deviceCode = form.watch('deviceCode');
  const partName = form.watch('partName');
  const sequence = form.watch('sequence');

  useEffect(() => {
    form.setValue(
      'partPhotos',
      uploadedFiles.map((f) => f.file),
      { shouldValidate: false }
    );
  }, [uploadedFiles, form]);

  const loadDeviceParts = async (code: string) => {
    setPartsLoading(true);
    try {
      const list = await bitable.parts.searchPartRecords({
        deviceCode: code,
        pageSize: 50,
        sort: [{ fieldName: '序号', desc: false }],
      });
      setDeviceParts(list);
    } catch (err) {
      logger.error('加载已录部件失败', err);
      setDeviceParts([]);
    } finally {
      setPartsLoading(false);
    }
  };

  const handleGoNext = async () => {
    const valid = await form.trigger('deviceCode');
    if (!valid) return;
    const code = form.getValues('deviceCode').trim();
    setDeviceLookupStatus('checking');
    setDeviceLookupError('');
    try {
      const record: CoffeeKioskRecord | null =
        await bitable.kiosk.getKioskByDeviceCode(code);
      if (record) {
        setDeviceExists(true);
        setDeviceName(record.deviceName === '待完善' ? '' : record.deviceName || '');
        setDeviceVersion(record.deviceVersion || '');
        setProductionDate(timestampToDateString(record.productionDate));
        setDeviceLookupStatus('found');
      } else {
        setDeviceExists(false);
        setDeviceName('');
        setDeviceVersion('');
        setProductionDate('');
        setDeviceLookupStatus('not-found');
      }
      await loadDeviceParts(code);
    } catch (err) {
      logger.error('查询设备台账失败', err);
      setDeviceLookupStatus('error');
      setDeviceLookupError(getBitableErrorMessage(err));
    }
    setCurrentStep(2);
  };

  const handleChangeDevice = () => {
    setCurrentStep(1);
    setDeviceLookupStatus('idle');
    setDeviceExists(false);
    setDeviceParts([]);
    setExistingPart(null);
    setLastSavedRecordId(null);
    form.reset({
      deviceCode: '',
      partName: '',
      sequence: 1,
      partSerialNumber: '',
      hardwareVersion: '',
      firmwareVersion: '',
      paramsAndNotes: '',
      materialStatus: '待核验',
      partPhotos: [],
    });
    setUploadedFiles([]);
  };

  // 部件重复检测（复合键）
  useEffect(() => {
    if (currentStep !== 2) return;
    if (!partName || !sequence || sequence < 1) {
      setExistingPart(null);
      return;
    }
    if (partLookupTimeoutRef.current) clearTimeout(partLookupTimeoutRef.current);
    partLookupTimeoutRef.current = setTimeout(async () => {
      try {
        const record = await bitable.parts.findPartByCompositeKey({
          deviceCode,
          partName,
          sequence,
        });
        setExistingPart(record);
      } catch (err) {
        logger.error('查询已有部件失败', err);
      }
    }, 300);
    return () => {
      if (partLookupTimeoutRef.current) clearTimeout(partLookupTimeoutRef.current);
    };
  }, [deviceCode, partName, sequence, currentStep]);

  // 序号自动建议：部件名变化且非重复检测态时，依据已录清单建议下一号
  const handlePartNameBlur = () => {
    const name = form.getValues('partName');
    if (!name) return;
    const suggested = suggestNextSequence(
      deviceParts.map((p) => ({ partName: p.partName, sequence: p.sequence })),
      name
    );
    form.setValue('sequence', suggested, { shouldValidate: true });
  };

  const handleFilesSelected = (files: File[]) => {
    setUploadedFiles((prev) => [
      ...prev,
      ...files.map((file) => ({ name: file.name, size: file.size, file })),
    ]);
  };

  const handleRemoveFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleEditExistingPart = (part: PartConfigRecord) => {
    navigate(`/parts/${part.recordId}/edit`, { state: { part } });
  };

  const handleSubmit = async (values: PartFormValues) => {
    setIsSubmitting(true);
    try {
      const { recordId: deviceRecordId } = await bitable.kiosk.ensureKioskForDevice(
        values.deviceCode,
        {
          deviceName: deviceName || undefined,
          deviceVersion: deviceVersion || undefined,
          productionDate: dateStringToTimestamp(productionDate) || undefined,
        }
      );

      const isUpdate = existingPart != null;
      let savedId = '';

      if (isUpdate && existingPart) {
        // 命中复合键：静默转更新（保留现状行为）
        savedId = await bitable.parts.updatePartRecord(
          existingPart.recordId,
          {
            deviceCode: values.deviceCode,
            partName: values.partName,
            sequence: values.sequence,
            partSerialNumber: values.partSerialNumber || undefined,
            hardwareVersion: values.hardwareVersion || undefined,
            firmwareVersion: values.firmwareVersion || undefined,
            paramsAndNotes: values.paramsAndNotes || undefined,
            materialStatus: form.formState.dirtyFields.materialStatus
              ? values.materialStatus
              : undefined,
            partPhotos: uploadedFiles.length > 0 ? values.partPhotos : undefined,
          },
          deviceRecordId
        );
      } else {
        savedId = await bitable.parts.createPartRecord(
          {
            deviceCode: values.deviceCode,
            partName: values.partName,
            sequence: values.sequence,
            partSerialNumber: values.partSerialNumber || undefined,
            hardwareVersion: values.hardwareVersion || undefined,
            firmwareVersion: values.firmwareVersion || undefined,
            paramsAndNotes: values.paramsAndNotes || undefined,
            materialStatus: values.materialStatus,
            partPhotos:
              values.partPhotos && values.partPhotos.length > 0
                ? values.partPhotos
                : undefined,
          },
          deviceRecordId
        );
      }

      toast.success(
        isUpdate ? `已更新「${values.partName}」` : `已录入「${values.partName}」`
      );

      // 设备录过至少一件后即视为已存在
      setDeviceExists(true);
      setLastSavedRecordId(savedId || null);

      // 重置表单：保留设备编号与硬件版本号（沿用上一件）
      const keepHardware = values.hardwareVersion || '';
      form.reset({
        deviceCode: values.deviceCode,
        partName: '',
        sequence: 1,
        partSerialNumber: '',
        hardwareVersion: keepHardware,
        firmwareVersion: '',
        paramsAndNotes: '',
        materialStatus: '待核验',
        partPhotos: [],
      });
      setUploadedFiles([]);
      setExistingPart(null);

      await loadDeviceParts(values.deviceCode);
    } catch (err) {
      logger.error('提交部件采集失败', err);
      toast.error(getBitableErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const banner = buildPartBanner({
    deviceCode,
    deviceExists,
    duplicatePart: existingPart
      ? {
          partName: existingPart.partName,
          sequence: existingPart.sequence,
          materialStatus: existingPart.materialStatus,
        }
      : null,
  });
  const recordedPartNames = getRecordedPartNames(deviceParts);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      {/* 步骤指示器 */}
      <div className="mb-8 flex items-center justify-center">
        <div className="flex w-full max-w-md items-center">
          <div className="flex flex-1 flex-col items-center">
            <div
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors',
                currentStep >= 1
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-card text-muted-foreground'
              )}
            >
              {currentStep > 1 ? <Check className="h-5 w-5" /> : <span>1</span>}
            </div>
            <span
              className={cn(
                'mt-2 text-xs font-medium',
                currentStep >= 1 ? 'text-foreground' : 'text-muted-foreground'
              )}
            >
              输入设备编号
            </span>
          </div>
          <div
            className={cn(
              'mx-2 h-0.5 flex-1 rounded-full transition-colors',
              currentStep > 1 ? 'bg-primary' : 'bg-border'
            )}
          />
          <div className="flex flex-1 flex-col items-center">
            <div
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors',
                currentStep >= 2
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-card text-muted-foreground'
              )}
            >
              <span>2</span>
            </div>
            <span
              className={cn(
                'mt-2 text-xs font-medium',
                currentStep >= 2 ? 'text-foreground' : 'text-muted-foreground'
              )}
            >
              录入部件（工作单）
            </span>
          </div>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)}>
          {/* 第一步：输入设备编号 */}
          {currentStep === 1 && (
            <div className="flex justify-center">
              <Card className="w-full max-w-md rounded-2xl border shadow-sm">
                <CardHeader>
                  <CardTitle className="text-xl">输入设备编号</CardTitle>
                  <CardDescription>请输入要采集部件的设备编号</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FormField
                    control={form.control}
                    name="deviceCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          设备编号 <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="请输入设备编号，例如 RCK001"
                            className="h-11 rounded-xl"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="button"
                    onClick={handleGoNext}
                    disabled={!deviceCode || deviceLookupStatus === 'checking'}
                    className="h-11 w-full rounded-xl text-base"
                  >
                    {deviceLookupStatus === 'checking' ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        查询中...
                      </>
                    ) : (
                      '下一步'
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* 第二步：设备工作单 */}
          {currentStep === 2 && (
            <div className="space-y-6">
              {/* 设备信息卡 */}
              <Card className="rounded-2xl border shadow-sm">
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-foreground">
                        设备编号
                      </label>
                      <div className="flex h-11 items-center gap-2 rounded-xl border border-border bg-muted px-3 text-sm text-muted-foreground">
                        <Lock className="h-3.5 w-3.5" />
                        <span className="font-mono">{deviceCode}</span>
                      </div>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-foreground">
                        设备名称
                      </label>
                      <Input
                        value={deviceName}
                        onChange={(e) => setDeviceName(e.target.value)}
                        placeholder="如：机器人咖啡亭"
                        className="h-11 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-foreground">
                        设备版本号
                      </label>
                      <Input
                        value={deviceVersion}
                        onChange={(e) => setDeviceVersion(e.target.value)}
                        placeholder="如：3.0室内超高版"
                        className="h-11 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-foreground">
                        出厂日期
                      </label>
                      <Input
                        type="date"
                        value={productionDate}
                        onChange={(e) => setProductionDate(e.target.value)}
                        className="h-11 rounded-xl"
                      />
                    </div>
                  </div>
                  <div className="mt-3">
                    <Badge variant={deviceExists ? 'default' : 'secondary'}>
                      {deviceExists ? '设备已存在' : '新设备'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {deviceLookupStatus === 'error' && (
                <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <div className="font-medium">设备台账查询失败</div>
                    <div className="mt-0.5 text-xs opacity-80">
                      {deviceLookupError}
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
                {/* 已录部件清单 */}
                <Card className="rounded-2xl border shadow-sm">
                  <CardHeader className="p-5 pb-3">
                    <CardTitle className="text-base">
                      已录部件（{deviceParts.length}）
                    </CardTitle>
                    <CardDescription>点击任一件可修改</CardDescription>
                  </CardHeader>
                  <CardContent className="p-5 pt-0">
                    {partsLoading ? (
                      <div className="space-y-2">
                        {Array.from({ length: 3 }).map((_, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-3 rounded-xl border border-border p-3"
                          >
                            <Skeleton className="h-6 w-6 rounded-full" />
                            <Skeleton className="h-4 flex-1 rounded-md" />
                            <Skeleton className="h-5 w-14 rounded-full" />
                          </div>
                        ))}
                      </div>
                    ) : deviceParts.length === 0 ? (
                      <div className="py-8 text-center text-sm text-muted-foreground">
                        还没有录入部件
                      </div>
                    ) : (
                      <ul className="space-y-2">
                        {deviceParts.map((part) => (
                          <li key={part.recordId}>
                            <button
                              type="button"
                              onClick={() => handleEditExistingPart(part)}
                              className={cn(
                                'flex w-full items-center gap-2.5 rounded-xl border p-3 text-left transition-colors hover:border-primary/40 hover:bg-accent',
                                part.recordId === lastSavedRecordId
                                  ? 'border-success/50 bg-success/10'
                                  : 'border-border bg-card'
                              )}
                            >
                              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-medium text-accent-foreground tabular-nums">
                                {part.sequence}
                              </span>
                              <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                                {part.partName}
                              </span>
                              <Badge variant={materialStatusVariant(part.materialStatus)}>
                                {part.materialStatus || '未知'}
                              </Badge>
                              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>

                {/* 录入表单 */}
                <Card className="rounded-2xl border shadow-sm">
                  <CardHeader className="p-5 pb-3">
                    <CardTitle className="text-base">录入下一件</CardTitle>
                  </CardHeader>
                  <CardContent className="p-5 pt-0">
                    {banner.kind === 'part-duplicate' && (
                      <div className="mb-4 flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning-foreground">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                        <span>{banner.text}</span>
                      </div>
                    )}

                    {/* 部件名称失焦触发序号建议：包一层监听 */}
                    <div onBlurCapture={handlePartNameBlur}>
                      <PartFormFields
                        form={form}
                        uploadedFiles={uploadedFiles}
                        onFilesSelected={handleFilesSelected}
                        onRemoveFile={handleRemoveFile}
                        recordedPartNames={recordedPartNames}
                        showAttachmentKeepHint={existingPart != null}
                      />
                    </div>

                    <div className="mt-6 flex justify-end border-t border-border pt-5">
                      <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="h-11 rounded-xl px-8"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            保存中...
                          </>
                        ) : (
                          '保存，录下一件'
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* 底部流程出口 */}
              <div className="flex items-center justify-between border-t border-border pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleChangeDevice}
                  className="h-11 rounded-xl px-6"
                >
                  <ArrowLeft className="mr-1 h-4 w-4" />
                  换一台设备
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/devices')}
                  className="h-11 rounded-xl border-primary px-6 text-primary hover:bg-accent"
                >
                  <CheckCircle2 className="mr-1 h-4 w-4" />
                  完成本台设备
                </Button>
              </div>
            </div>
          )}
        </form>
      </Form>
    </div>
  );
};

export default PartCollectionPage;
```

- [ ] **Step 2: 类型检查**

Run: `cd /Users/mac/cofeplus/cofeplus/cofeconfig && npm run type:check:client`
Expected: PASS

- [ ] **Step 3: lint**

Run: `cd /Users/mac/cofeplus/cofeplus/cofeconfig && npm run eslint`
Expected: PASS

- [ ] **Step 4: 手动验证（dev）**

用 gstack `/browse` 打开本地 dev 地址，进入"部件配置采集"：
1. Step 1 输入 `RCK001`（一个已存在设备）→ 下一步 → Step 2 设备信息卡显示"设备已存在"徽标，名称/版本/出厂日期回填；已录清单展示现有部件。
2. Step 1 输入一个不存在的编号 → Step 2 显示"新设备"徽标、清单为空。
3. 在录入表单部件名称输入"出杯机构"（若清单已有）→ 失焦后序号自动变为下一号；部件名称输入框有预置清单补全提示（`标准部件 16 项，已录 X 项`）。
4. 填写一件并"保存，录下一件"→ 不弹窗；清单新增一行且以绿色高亮；表单清空但设备编号与硬件版本号保留；`toast` 提示"已录入…"。
5. 输入与某已录部件相同的名称+序号 → 表单区出现橙色"将更新原记录"警示。
6. 点击已录清单某一项 → 跳转到编辑页并预填充（验证 Task 5 + Task 6 联动）。
7. "完成本台设备"→ 跳 `/devices`；"换一台设备"→ 回 Step 1 且表单清空。
8. 控制台无红色 React 错误。

Expected: 以上全部符合。

- [ ] **Step 5: 提交**

```bash
cd /Users/mac/cofeplus/cofeplus/cofeconfig
git add client/src/pages/PartCollection/PartCollectionPage.tsx
git commit -m "feat(parts): rebuild Step 2 as device worksheet, merge banners, remove success dialog"
```

---

## Task 7: 设备台账页部件列表可点击

**Files:**
- Modify: `client/src/pages/DeviceLedger/DeviceLedgerPage.tsx`

**Interfaces:**
- Consumes: 现有 `navigate`、`PartConfigRecord`；跳转约定同 Task 5（`navigate(\`/parts/${part.recordId}/edit\`, { state: { part } })`）
- Produces: 无新导出

- [ ] **Step 1: 关联部件列表项改为可点击按钮**

在 `client/src/pages/DeviceLedger/DeviceLedgerPage.tsx` 中，将关联部件的 `<ul>...</ul>` 块（现状第 368-395 行，`{!partsLoading && !partsError && parts.length > 0 && ( ... )}`）替换为：

```tsx
              {!partsLoading && !partsError && parts.length > 0 && (
                <ul className="space-y-2">
                  {parts.map((part: PartConfigRecord) => (
                    <li key={part.recordId}>
                      <button
                        type="button"
                        onClick={() =>
                          navigate(`/parts/${part.recordId}/edit`, {
                            state: { part },
                          })
                        }
                        className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-3 text-left transition-colors hover:border-primary/40 hover:bg-accent"
                      >
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-accent text-xs font-medium text-accent-foreground tabular-nums shrink-0">
                          {part.sequence}
                        </span>
                        <span className="flex-1 text-sm text-foreground truncate">
                          {part.partName}
                        </span>
                        <Badge
                          variant={
                            part.materialStatus === '已录入'
                              ? 'default'
                              : part.materialStatus === '待核验'
                                ? 'secondary'
                                : 'destructive'
                          }
                        >
                          {part.materialStatus || '未知'}
                        </Badge>
                        <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
```

- [ ] **Step 2: 补充 ChevronRight 图标 import**

在 `DeviceLedgerPage.tsx` 的 lucide-react import（现状第 6-15 行）中加入 `ChevronRight`：

```typescript
import {
  Search,
  Plus,
  X,
  MapPin,
  Calendar,
  Coffee,
  Cpu,
  RotateCw,
  ChevronRight,
} from 'lucide-react';
```

- [ ] **Step 3: 类型检查 + lint**

Run: `cd /Users/mac/cofeplus/cofeplus/cofeconfig && npm run type:check:client && npm run eslint`
Expected: PASS

- [ ] **Step 4: 手动验证（dev）**

用 gstack `/browse`：
1. 打开 `/devices`，点开任一有部件的设备卡 → 抽屉的关联部件项现在有 hover 底色与右侧箭头。
2. 点击某个部件 → 跳转 `/parts/:recordId/edit`，字段预填充为该部件现值。
3. 修改"资料状态"为"已录入"→ 保存修改 → 回到 `/devices`，`toast` 提示"已保存…"。
4. 重新打开该设备抽屉 → 该部件状态已更新（验证全字段回写生效）。
5. 编辑页只改一个字段、其余不动 → 保存后重开确认其他字段未被清空（验证覆盖风险已消除）。

Expected: 全部符合。

- [ ] **Step 5: 提交**

```bash
cd /Users/mac/cofeplus/cofeplus/cofeconfig
git add client/src/pages/DeviceLedger/DeviceLedgerPage.tsx
git commit -m "feat(devices): make ledger part list items clickable to edit page"
```

---

## Task 8: 全量验证与发布

**Files:** 无代码改动（质量门禁 + 发布）

- [ ] **Step 1: 全量质量门禁**

Run（逐条，全部需通过）：
```bash
cd /Users/mac/cofeplus/cofeplus/cofeconfig
npm run type:check
npm run lint
npm test
```
Expected: type:check PASS（server + client）、lint PASS、jest PASS（含 `test/unit/partForm.helpers.spec.ts`）。

- [ ] **Step 2: 端到端手动回归（dev）**

用 gstack `/browse` 跑一遍完整链路（覆盖设计文档"测试要点"7 条）：
1. 新设备首件保存 → 台账创建且设备名称为所填（非"待完善"）。
2. 连续录入多件 → 清单增长、表单重置、硬件版本号沿用、无弹窗。
3. 同名部件 → 序号自动建议；改回已占用序号 → 橙色警示，保存后原记录被更新。
4. 从台账页/工作单两个入口进入编辑 → 全字段预填充正确；只改一项保存 → 其他字段不变。
5. 编辑保存后返回来处 + toast 提示 + 列表刷新。
6. 提示条四种情境文案正确，同屏不再堆两条。
7. 预置清单补全可用；清单外自由输入可保存。

Expected: 全部符合。若发现问题，回到对应 Task 修复后重新验证，再继续发布。

- [ ] **Step 3: 推送工作分支**

```bash
cd /Users/mac/cofeplus/cofeplus/cofeconfig
git status
git push origin sprint/default
```
Expected: 推送成功。若遇非 fast-forward：`git pull --rebase origin sprint/default` 解决冲突后再推，**不 force-push**。

- [ ] **Step 4: 发起发布**

```bash
lark-cli apps +release-create --app-id app_17artejsm44
```
记下返回的 `release_id`。

- [ ] **Step 5: 轮询发布结果**

```bash
lark-cli apps +release-get --app-id app_17artejsm44 --release-id <release_id>
```
- `publishing` → 继续轮询；
- `finished` → 读取输出中的 `online_url`，交付给用户（先说明默认仅创建者可见，询问是否用 `+access-scope-set` 放开范围）；
- `failed` → 读取 `error_logs`，据此定位失败原因并修复后重走 Step 3-5。

Expected: `finished`，拿到线上链接。

---

## Self-Review（计划编写后自检）

**1. Spec coverage：**
- 工作单（设备卡+已录清单+录入表单+不弹窗）→ Task 6 ✓
- 编辑页单步直改+全字段回写 → Task 5 ✓
- 台账页部件可点击 → Task 7 ✓
- 共用表单组件 → Task 4 ✓
- 状态提示条合并（4 种文案）→ Task 2（`buildPartBanner`）+ Task 6 ✓
- 预置清单 → Task 1（`PRESET_PART_NAMES`）+ Task 4（datalist）✓
- 序号自动建议 → Task 2（`suggestNextSequence`）+ Task 6 ✓
- 硬件版本号沿用上一件 → Task 6（reset 保留 `hardwareVersion`）✓
- 设备信息卡不写"待完善" → Task 3（`ensureKioskForDevice`）+ Task 6 ✓
- 死代码 `handleBackToHome` 清理 → Task 6（整体替换后消失）✓
- 静默转更新保留 → Task 6（update 分支沿用 `dirtyFields`/`|| undefined`）✓
- 错误处理（工作单/编辑页/设备字段/附件）→ 各 Task 的 try-catch + toast ✓
- 发布链路 → Task 8 ✓

**2. Placeholder scan：** 无 TBD/TODO；每个代码步骤均为完整代码。✓

**3. Type consistency：**
- `ensureKioskForDevice(deviceCode, deviceInfo?)` 在 Task 3 定义，Task 5/6 调用签名一致 ✓
- `PartFormFieldsProps`（`form`/`uploadedFiles`/`onFilesSelected`/`onRemoveFile`/`showAttachmentKeepHint`/`recordedPartNames`）在 Task 4 定义，Task 5/6 使用一致 ✓
- 编辑入口跳转约定 `navigate(\`/parts/${part.recordId}/edit\`, { state: { part } })` 在 Task 5/6/7 三处一致 ✓
- helpers 函数名（`suggestNextSequence`/`getRecordedPartNames`/`buildPartBanner`/`dateStringToTimestamp`/`timestampToDateString`/`buildKioskPatch`）在 Task 2 定义并被 Task 3/6 按同名调用 ✓

**已知取舍（如实记录）：**
- 预置清单用原生 `datalist` 做补全 + 字段下方完成度计数文字，未在每个下拉项上单独打"已录"标（datalist option 无法稳定渲染徽标）。与 mockup 的"每项打标"略有出入，换取零依赖与跨浏览器可靠性。
- 前端组件/页面无自动化测试（仓库无 jsdom 环境），Task 4/5/6/7 依赖 `type:check` + `lint` + `dev` 手动验证；仅 Task 2 纯函数走 jest 单测。
