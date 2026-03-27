# Staff Management Segmented Modal Flow Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the approved segmented staff modal so only the current configuration step is expanded, completed earlier steps collapse into summary rows, and the modal consistently uses `可管理设备` wording without changing the existing scoped-page data model.

**Architecture:** Keep the implementation inside `staff-management.html` and reuse the existing permission tree, device selector, and `moduleDeviceScopes` model. Add a small step-state controller, summary builders, and validation-target helpers above the current modal logic; keep `基本信息` as a compact always-visible section, then segment only the three configuration sections into `可管理设备` -> `页面权限` -> `页面设备范围`.

**Tech Stack:** Static HTML, inline browser JavaScript, localStorage persistence, Node-based regex/runtime tests

**Files and Responsibilities:**
- Modify: `staff-management.html`
  - add segmented modal markup and styles
  - add step-state and summary helper functions
  - keep `基本信息` always visible while gating the three configurable steps
  - update Step 3 rows to compact line layout and `可管理设备` copy
  - route validation/save failures back to the relevant step
- Modify: `tests/staff-management.behavior.test.js`
  - assert the new segmented structure, copy changes, summary rows, and compact Step 3 layout
- Create: `tests/staff-management.segmented-flow.runtime.test.js`
  - runtime-check step gating, supported scoped-module filtering, and “custom scope pruned to zero” behavior

---

## Chunk 1: Segmented Staff Modal Flow

### Task 1: Add failing coverage for the segmented modal shell and step helpers

**Files:**
- Modify: `tests/staff-management.behavior.test.js`
- Create: `tests/staff-management.segmented-flow.runtime.test.js`
- Test: `tests/staff-management.behavior.test.js`
- Test: `tests/staff-management.segmented-flow.runtime.test.js`

- [ ] **Step 1: Extend the behavior test with the segmented modal structure assertions**

Add assertions like:

```js
assert.ok(/步骤 1 · 可管理设备/.test(staffHtml));
assert.ok(/步骤 2 · 页面权限/.test(staffHtml));
assert.ok(/步骤 3 · 页面设备范围/.test(staffHtml));
assert.ok(/class="staff-modal-stepbar"/.test(staffHtml));
assert.ok(/class="staff-modal-step-summary-list"/.test(staffHtml));
assert.ok(!/设备池/.test(staffHtml));
assert.ok(/全部可管理设备/.test(staffHtml));
```

Also assert:

- `基本信息` still exists above the segmented step region
- Step 1 and Step 2 collapsed summary rows expose `修改`
- Step 3 copy only mentions supported scoped pages
- old `负责设备号` section title and `全部负责设备` copy are removed

- [ ] **Step 2: Create a failing runtime test for step-state and validation-target helpers**

Create `tests/staff-management.segmented-flow.runtime.test.js` and extract these planned helpers from `staff-management.html`:

```js
const helperNames = [
  'getAvailableScopedModulesForStep',
  'canOpenStaffModalStep',
  'getEmptyCustomScopeModuleKeys',
  'resolveStaffModalValidationResult'
];
```

Add tests like:

```js
test('future steps stay locked until previous steps are complete', () => {
  sandbox.currentStaffModalStep = 'manageableDevices';
  sandbox.completedStaffModalSteps = new Set();
  assert.strictEqual(sandbox.canOpenStaffModalStep('pagePermissions'), false);
  assert.strictEqual(sandbox.canOpenStaffModalStep('pageDeviceScopes'), false);
});

test('step 3 only includes authorized scoped modules', () => {
  const modules = sandbox.getAvailableScopedModulesForStep(['ops.overview', 'ops.orders', 'ops.staff']);
  assert.deepStrictEqual(Array.from(modules.map(item => item.moduleKey)), ['orders']);
});

test('custom scope pruned to zero stays invalid until manually fixed', () => {
  const invalidKeys = sandbox.getEmptyCustomScopeModuleKeys(
    { faults: { mode: 'custom', deviceIds: [] } },
    ['ops.faults']
  );
  assert.deepStrictEqual(Array.from(invalidKeys), ['faults']);
  assert.strictEqual(
    sandbox.resolveStaffModalValidationResult({
      username: '王运维',
      phone: '13800138021',
      selectedPermissions: ['ops.faults'],
      selectedDevices: ['RCK386'],
      moduleDeviceScopes: { faults: { mode: 'custom', deviceIds: [] } }
    }).stepKey,
    'pageDeviceScopes'
  );
});

test('basic info errors stay in the always-visible section instead of forcing step 1 open', () => {
  assert.deepStrictEqual(
    sandbox.resolveStaffModalValidationResult({
      username: '',
      phone: '',
      selectedPermissions: ['ops.orders'],
      selectedDevices: ['RCK386'],
      moduleDeviceScopes: { orders: { mode: 'inherit', deviceIds: [] } }
    }),
    { stepKey: '', message: '请填写用户名和手机号' }
  );
});
```

- [ ] **Step 3: Run the two tests to verify they fail**

Run:

```bash
node tests/staff-management.behavior.test.js
node tests/staff-management.segmented-flow.runtime.test.js
```

Expected:

- `tests/staff-management.behavior.test.js` fails because the segmented markup/copy does not exist yet
- `tests/staff-management.segmented-flow.runtime.test.js` fails because the new step helpers do not exist yet

- [ ] **Step 4: Commit after both tests are red**

```bash
git add tests/staff-management.behavior.test.js tests/staff-management.segmented-flow.runtime.test.js
git commit -m "test: cover segmented staff modal flow"
```

### Task 2: Implement the step shell, summary rows, and `可管理设备` copy

**Files:**
- Modify: `staff-management.html`
- Modify: `tests/staff-management.behavior.test.js`
- Create: `tests/staff-management.segmented-flow.runtime.test.js`
- Test: `tests/staff-management.behavior.test.js`
- Test: `tests/staff-management.segmented-flow.runtime.test.js`

- [ ] **Step 1: Add segmented-step state and summary helper scaffolding to `staff-management.html`**

Add state like:

```js
const staffModalStepConfigs = [
  { key: 'manageableDevices', label: '可管理设备' },
  { key: 'pagePermissions', label: '页面权限' },
  { key: 'pageDeviceScopes', label: '页面设备范围' }
];

let currentStaffModalStep = 'manageableDevices';
let completedStaffModalSteps = new Set();
```

Add helper functions:

```js
function canOpenStaffModalStep(stepKey) { /* current + completed only */ }
function buildManageableDevicesStepSummary() { /* 已选 N 台 */ }
function buildPermissionsStepSummary() { /* 已选 N 项 */ }
function buildPageScopeStepSummary() { /* 设备 5 台 / 订单 3 台 / 故障 2 台 */ }
function updateStaffModalStepUi() { /* toggle expanded / collapsed / hidden states */ }
function openCompletedStaffModalStep(stepKey) { /* used by 修改 */ }
```

- [ ] **Step 2: Restructure the modal markup into one fixed basic-info area plus segmented step containers**

Refactor the modal body so:

- `基本信息` stays visible at the top
- the three configurable sections live inside step containers
- a new step header row appears above the step containers
- a new summary-row list appears between the step header and the current expanded step

Use concrete ids/classes like:

```html
<div class="staff-modal-stepbar" id="staffModalStepbar"></div>
<div class="staff-modal-step-summary-list" id="staffModalStepSummaryList"></div>
<section class="staff-modal-step-section" data-staff-step="manageableDevices">...</section>
<section class="staff-modal-step-section" data-staff-step="pagePermissions">...</section>
<section class="staff-modal-step-section" data-staff-step="pageDeviceScopes">...</section>
```

Keep the existing permission tree, device picker entry, and module scope list inside those step bodies instead of rewriting them from scratch.

- [ ] **Step 3: Replace old copy with `可管理设备` terminology**

Update strings such as:

- `负责设备号` -> `可管理设备`
- `选择负责设备` -> `选择可管理设备`
- `全部负责设备` -> `全部可管理设备`
- explanatory note text to the approved copy from the spec

Do not rename persisted data keys like `devices`; this is UI copy only.

- [ ] **Step 4: Wire modal open/reset/edit flows to the new step controller**

Update:

- `openStaffModal()`
- `editStaff()`
- `resetStaffForm()`
- `fillStaffForm()`

So they:

- reset to Step 1 for new staff
- restore Step 1 as the active step for editing before the admin re-enters the flow
- clear `completedStaffModalSteps`
- call `updateStaffModalStepUi()` after existing data is loaded

- [ ] **Step 5: Run the tests to verify the shell and copy changes pass**

Run:

```bash
node tests/staff-management.behavior.test.js
node tests/staff-management.segmented-flow.runtime.test.js
```

Expected:

- both tests PASS

- [ ] **Step 6: Commit**

```bash
git add staff-management.html tests/staff-management.behavior.test.js tests/staff-management.segmented-flow.runtime.test.js
git commit -m "feat: add segmented staff modal step shell"
```

### Task 3: Compress Step 3 into compact rows and keep it scoped to supported authorized modules

**Files:**
- Modify: `staff-management.html`
- Modify: `tests/staff-management.behavior.test.js`
- Create: `tests/staff-management.segmented-flow.runtime.test.js`
- Test: `tests/staff-management.behavior.test.js`
- Test: `tests/staff-management.segmented-flow.runtime.test.js`

- [ ] **Step 1: Update the tests to require compact Step 3 row rendering**

Add assertions like:

```js
assert.ok(/function\\s+getAvailableScopedModulesForStep\\s*\\(/.test(staffHtml));
assert.ok(/class="module-scope-row-compact"/.test(staffHtml) || /module-scope-row compact/.test(staffHtml));
assert.ok(/全部可管理设备/.test(staffHtml));
assert.ok(/重新选择/.test(staffHtml));
assert.ok(!/页面设备范围只能从“负责设备”中选择/.test(staffHtml));
```

Also add assertions that Step 3 helper text explicitly says only device-aware pages appear there.

- [ ] **Step 2: Implement `getAvailableScopedModulesForStep(selectedPermissions)`**

Base it on the existing `deviceScopedModuleConfigs` plus selected permissions:

```js
function getAvailableScopedModulesForStep(selectedPermissions = getSelectedPermissionValues()) {
  const permissionSet = new Set(Array.isArray(selectedPermissions) ? selectedPermissions : []);
  return deviceScopedModuleConfigs.filter((config) => permissionSet.has(config.permission));
}
```

Use this helper inside `renderModuleDeviceScopeRows()` so Step 3 only shows:

- authorized scoped modules
- never every checked permission

- [ ] **Step 3: Refactor `renderModuleDeviceScopeRows()` into compact line-style rows**

Update the generated markup so each row stays horizontally short:

- page label
- authorization state
- one-line summary
- selected device chips
- compact controls

Keep the current selector entry pattern:

- `指定设备` keeps using the focused selector modal
- do not inline a device checklist directly into Step 3

- [ ] **Step 4: Rephrase scope summaries and selector titles to `可管理设备` wording**

Examples:

```js
scope.mode === 'inherit'
  ? `全部可管理设备（${assignedDeviceIds.length} / ${assignedDeviceIds.length} 台）`
  : `已指定 ${scope.deviceIds.length} / ${assignedDeviceIds.length} 台设备`

title.textContent = `选择${config.label}页面可查看设备`;
```

- [ ] **Step 5: Run the tests to verify compact Step 3 output passes**

Run:

```bash
node tests/staff-management.behavior.test.js
node tests/staff-management.segmented-flow.runtime.test.js
```

Expected:

- both tests PASS

- [ ] **Step 6: Commit**

```bash
git add staff-management.html tests/staff-management.behavior.test.js tests/staff-management.segmented-flow.runtime.test.js
git commit -m "feat: compact staff page scope step"
```

### Task 4: Route validation/save failures back to the right step and preserve empty-custom warnings

**Files:**
- Modify: `staff-management.html`
- Create: `tests/staff-management.segmented-flow.runtime.test.js`
- Modify: `tests/staff-management.behavior.test.js`
- Test: `tests/staff-management.segmented-flow.runtime.test.js`
- Test: `tests/staff-management.behavior.test.js`
- Regression: `tests/admin-staff-access.runtime.test.js`
- Regression: `tests/devices.device-scope.runtime.test.js`
- Regression: `tests/orders.device-scope.runtime.test.js`
- Regression: `tests/faults.behavior.test.js`

- [ ] **Step 1: Add a pure validation-target helper and make the runtime test assert it**

Implement a helper like:

```js
function resolveStaffModalValidationResult({
  username,
  phone,
  selectedPermissions,
  selectedDevices,
  moduleDeviceScopes
}) {
  if (!username || !phone) return { stepKey: '', message: '请填写用户名和手机号' };
  if (!/^1\\d{10}$/.test(phone)) return { stepKey: '', message: '请输入正确的手机号' };
  if (!selectedDevices.length) return { stepKey: 'manageableDevices', message: '请至少选择一个可管理设备' };
  if (!selectedPermissions.length) return { stepKey: 'pagePermissions', message: '请至少选择一个权限' };
  const invalidScopeKeys = getEmptyCustomScopeModuleKeys(moduleDeviceScopes, selectedPermissions);
  if (invalidScopeKeys.length) return { stepKey: 'pageDeviceScopes', message: `${getDeviceScopedModuleConfig(invalidScopeKeys[0]).label}页面已无可见设备，请重新选择范围或改回“全部可管理设备”` };
  return { stepKey: '', message: '' };
}
```

Update the runtime test to assert the first invalid step wins, and that `基本信息` errors return an empty `stepKey` because that section stays visible outside the segmented flow.

- [ ] **Step 2: Preserve custom-empty rows as warnings instead of silently broadening access**

Add helper/state like:

```js
function getEmptyCustomScopeModuleKeys(moduleDeviceScopes, selectedPermissions) { /* returns module keys */ }
```

Use it in:

- `syncModuleDeviceScopeStateWithAssignedDevices(true)`
- `renderModuleDeviceScopeRows()`
- `saveStaff()`

Behavior:

- if Step 1 pruning empties a `custom` scope, keep `mode: 'custom'`
- show inline warning on that row
- block final save until manually fixed or switched back to `全部可管理设备`
- do **not** auto-convert to inherited scope

- [ ] **Step 3: Make save failures reopen the offending step and keep the modal open**

Update `saveStaff()` so:

- it calls `resolveStaffModalValidationResult(...)`
- on validation error:
  - set `currentStaffModalStep` to the returned `stepKey` only when `stepKey` is non-empty
  - update collapsed/expanded UI
  - keep the modal open
  - show the existing toast with the returned message

Also stage the next array before persistence so storage failure cannot dirty in-memory UI state:

```js
const nextStaffManagersData = editingStaffId
  ? staffManagersData.map((item) => item.id === editingStaffId ? nextStaffRecord : item)
  : [...staffManagersData, nextStaffRecord];

try {
  localStorage.setItem('staffManagersData', JSON.stringify(nextStaffManagersData));
} catch (error) {
  showToast('保存失败，请稍后重试');
  return;
}

staffManagersData = nextStaffManagersData;
```

On storage failure:

- keep the current step open
- do not close the modal
- do not mutate `staffManagersData` or any success-path UI

- [ ] **Step 4: Run the targeted tests to verify validation targeting and warning persistence pass**

Run:

```bash
node tests/staff-management.segmented-flow.runtime.test.js
node tests/staff-management.behavior.test.js
```

Expected:

- both tests PASS

- [ ] **Step 5: Run regression coverage for scoped-page behavior**

Run:

```bash
node tests/admin-staff-access.runtime.test.js
node tests/devices.device-scope.runtime.test.js
node tests/orders.device-scope.runtime.test.js
node tests/faults.behavior.test.js
```

Expected:

- all PASS

- [ ] **Step 6: Commit**

```bash
git add staff-management.html tests/staff-management.behavior.test.js tests/staff-management.segmented-flow.runtime.test.js
git commit -m "feat: target staff modal validation by step"
```
