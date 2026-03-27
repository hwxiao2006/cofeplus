# Staff Page Device Scope Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement page-level device scopes for staff members so device, order, and fault pages can each expose different device subsets under the same staff account.

**Architecture:** Add one shared access helper that resolves the current logged-in staff member and computes visible device IDs per module from `staffManagersData`. Extend staff management to edit and persist `moduleDeviceScopes`, then wire devices, orders, and faults pages to consume the shared helper so lists, metrics, filters, and empty states are all filtered by the same scope rules.

**Tech Stack:** Static HTML pages, inline browser JavaScript, shared browser script, Node-based regex/runtime tests

---

## Chunk 1: Shared Access Model

### Task 1: Add a shared helper for current staff access and module device scope calculation

**Files:**
- Create: `shared/admin-staff-access.js`
- Create: `tests/admin-staff-access.runtime.test.js`
- Modify: `login-paper.html`
- Modify: `staff-management.html`
- Test: `tests/admin-staff-access.runtime.test.js`

- [ ] **Step 1: Write the failing runtime test**

```js
test('resolveCurrentStaffAccess should match current login account to an enabled staff member', () => {
  const access = sandbox.resolveCurrentStaffAccess();
  assert.strictEqual(access.currentStaff.phone, '13800138021');
});

test('getModuleVisibleDeviceIds should return the devices subset for custom module scopes', () => {
  assert.deepStrictEqual(
    sandbox.getModuleVisibleDeviceIds(staff, 'orders'),
    ['RCK386', 'RCK385', 'RCK384']
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/admin-staff-access.runtime.test.js`
Expected: FAIL because the helper file does not exist yet

- [ ] **Step 3: Write the minimal shared implementation**

```js
window.CofeAdminStaffAccess = {
  resolveCurrentStaffAccess,
  getModuleVisibleDeviceIds,
  normalizeModuleDeviceScopes
};
```

Implementation scope:
- read `cofeLoginSession`
- read `staffManagersData`
- match current staff by login account phone under current merchant
- ignore disabled staff
- normalize missing `moduleDeviceScopes` to `inherit`
- enforce final device set as intersection with `devices`

- [ ] **Step 4: Persist enough session context to resolve current staff**

Update `login-paper.html` so the stored login session continues saving the typed `account` and remains compatible with the shared resolver.

- [ ] **Step 5: Run test to verify it passes**

Run: `node tests/admin-staff-access.runtime.test.js`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add shared/admin-staff-access.js tests/admin-staff-access.runtime.test.js login-paper.html staff-management.html
git commit -m "feat: add shared staff access scope helper"
```

## Chunk 2: Staff Management Editing Flow

### Task 2: Extend staff management data and form UI to edit page-level device scopes

**Files:**
- Modify: `staff-management.html`
- Modify: `tests/staff-management.behavior.test.js`
- Test: `tests/staff-management.behavior.test.js`

- [ ] **Step 1: Write the failing behavior tests**

Add assertions for:
- `moduleDeviceScopes` on default staff records
- a new `页面设备范围` section
- device-scoped rows for `devices`, `orders`, `faults`
- text explaining “页面设备范围只能从负责设备中选择”
- `inherit` / `custom` mode controls
- save logic writing `moduleDeviceScopes`

Example assertions:

```js
assert.ok(/moduleDeviceScopes/.test(staffHtml));
assert.ok(/页面设备范围/.test(staffHtml));
assert.ok(/function\s+normalizeModuleDeviceScopes\s*\(/.test(staffHtml));
assert.ok(/function\s+validateModuleDeviceScopes\s*\(/.test(staffHtml));
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/staff-management.behavior.test.js`
Expected: FAIL because the UI and save logic do not support page-level scopes yet

- [ ] **Step 3: Write minimal implementation for data migration and defaults**

Implementation scope:
- extend `defaultManagers` with `moduleDeviceScopes`
- normalize historical staff data with `inherit` defaults
- add helper functions:
  - `getDeviceScopedModules()`
  - `normalizeModuleDeviceScopes()`
  - `pruneModuleDeviceScopesToAssignedDevices()`
  - `validateModuleDeviceScopes()`

- [ ] **Step 4: Add the new form section and editors**

Implementation scope:
- keep `负责设备` as the total pool
- add a compact `页面设备范围` section below it
- show rows only for `设备` / `订单` / `故障列表`
- disable a row when its permission is unchecked
- add mode controls for `全部负责设备` and `指定设备`
- add a module-specific device picker that only shows assigned devices

- [ ] **Step 5: Save and edit existing staff with page-level scopes**

Implementation scope:
- load existing `moduleDeviceScopes` into the form
- persist `moduleDeviceScopes` in `saveStaff()`
- when assigned devices shrink, prune child scopes automatically
- show a clear toast when a custom page scope becomes empty after pruning

- [ ] **Step 6: Run test to verify it passes**

Run: `node tests/staff-management.behavior.test.js`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add staff-management.html tests/staff-management.behavior.test.js
git commit -m "feat: add module device scope editing to staff management"
```

## Chunk 3: Devices Page Enforcement

### Task 3: Filter devices page data, stats, and filters by the current staff device scope

**Files:**
- Modify: `devices.html`
- Create: `tests/devices.device-scope.runtime.test.js`
- Test: `tests/devices.device-scope.runtime.test.js`

- [ ] **Step 1: Write the failing runtime test**

Add assertions for:
- page imports `shared/admin-staff-access.js`
- `init()` resolves current staff access
- `devicesData` / `filteredData` / stats only include `getModuleVisibleDeviceIds(staff, 'devices')`
- empty state message appears when visible scope is empty

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/devices.device-scope.runtime.test.js`
Expected: FAIL because devices page does not yet read page-level scopes

- [ ] **Step 3: Write the minimal implementation**

Implementation scope:
- import the shared helper
- add `currentStaffAccess` state
- derive `visibleDeviceIds` for `devices`
- filter:
  - source device list
  - stats counts
  - search/filter dropdown options
  - detail entry access
- show a business empty state when permission exists but no devices are visible

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/devices.device-scope.runtime.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add devices.html tests/devices.device-scope.runtime.test.js
git commit -m "feat: enforce staff device scope on devices page"
```

## Chunk 4: Orders Page Enforcement

### Task 4: Filter orders page orders, metrics, and device filter options by the order scope

**Files:**
- Modify: `orders.html`
- Create: `tests/orders.device-scope.runtime.test.js`
- Test: `tests/orders.device-scope.runtime.test.js`

- [ ] **Step 1: Write the failing runtime test**

Add assertions for:
- page imports `shared/admin-staff-access.js`
- visible orders are restricted to the `orders` device scope
- today metrics are computed from the filtered orders only
- device filter dropdowns only list visible devices
- empty state copy is shown when there are zero visible devices

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/orders.device-scope.runtime.test.js`
Expected: FAIL because orders page currently works from the full device list

- [ ] **Step 3: Write the minimal implementation**

Implementation scope:
- import the shared helper
- resolve `visibleDeviceIds` for `orders`
- filter preview/runtime orders before rendering
- recalculate metrics on the filtered dataset
- restrict device picker options to the visible set
- keep the current search/filter UX unchanged apart from the reduced scope

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/orders.device-scope.runtime.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add orders.html tests/orders.device-scope.runtime.test.js
git commit -m "feat: enforce staff device scope on orders page"
```

## Chunk 5: Faults Page Enforcement

### Task 5: Filter fault data and fault flows by the fault page device scope

**Files:**
- Modify: `faults.html`
- Modify: `tests/faults.behavior.test.js`
- Test: `tests/faults.behavior.test.js`

- [ ] **Step 1: Write the failing runtime assertions**

Add assertions for:
- page imports `shared/admin-staff-access.js`
- fault list only shows devices inside `getModuleVisibleDeviceIds(staff, 'faults')`
- remote actions and status-record overlays only open for visible devices
- empty state copy appears when no fault devices are visible

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/faults.behavior.test.js`
Expected: FAIL because the page currently renders all default fault devices

- [ ] **Step 3: Write the minimal implementation**

Implementation scope:
- import the shared helper
- resolve `visibleDeviceIds` for `faults`
- filter the fault source list before rendering
- guard remote-action and status-record entry points against out-of-scope devices
- preserve existing desktop/mobile interaction modes

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/faults.behavior.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add faults.html tests/faults.behavior.test.js
git commit -m "feat: enforce staff device scope on faults page"
```

## Chunk 6: Verification

### Task 6: Run targeted regression verification and inspect final diff

**Files:**
- Test: `tests/admin-staff-access.runtime.test.js`
- Test: `tests/staff-management.behavior.test.js`
- Test: `tests/devices.device-scope.runtime.test.js`
- Test: `tests/orders.device-scope.runtime.test.js`
- Test: `tests/faults.behavior.test.js`
- Test: `tests/login-paper.profile-merchant.test.js`
- Test: `tests/sidebar.shared-login.test.js`

- [ ] **Step 1: Run the full targeted suite**

Run:

```bash
node tests/admin-staff-access.runtime.test.js && \
node tests/staff-management.behavior.test.js && \
node tests/devices.device-scope.runtime.test.js && \
node tests/orders.device-scope.runtime.test.js && \
node tests/faults.behavior.test.js && \
node tests/login-paper.profile-merchant.test.js && \
node tests/sidebar.shared-login.test.js
```

Expected: PASS for every file

- [ ] **Step 2: Inspect the final diff**

Run:

```bash
git diff -- \
  shared/admin-staff-access.js \
  login-paper.html \
  staff-management.html \
  devices.html \
  orders.html \
  faults.html \
  tests/admin-staff-access.runtime.test.js \
  tests/staff-management.behavior.test.js \
  tests/devices.device-scope.runtime.test.js \
  tests/orders.device-scope.runtime.test.js \
  tests/faults.behavior.test.js
```

Expected: Only page-scope staff access changes appear

- [ ] **Step 3: Report verification evidence**

Report:
- commands actually run
- pass/fail result
- any residual risk, especially around pages not yet using device scopes
