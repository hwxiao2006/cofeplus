# Device Search Location Name Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make shared device-search inputs support location-name lookup and display `点位名称 · 设备编号` across related pages.

**Architecture:** Build runtime device-search metadata from `devicesData` and `locationsData`, then route matching, dropdown rendering, and input display through a shared set of helper concepts replicated across the affected pages. Preserve existing business state as plain device IDs.

**Tech Stack:** Vanilla HTML/CSS/JavaScript, Node static/behavior tests.

---

### Task 1: Add failing tests for location-name search

**Files:**
- Modify: `/Users/tigerhuang/cofeplus/tests/menu-management.behavior.test.js`
- Create: `/Users/tigerhuang/cofeplus/tests/device-search.location-name.test.js`

**Step 1: Write the failing tests**
Add runtime coverage in menu-management and static coverage for the other pages.

**Step 2: Run test to verify it fails**
Run: `node tests/menu-management.behavior.test.js && node tests/device-search.location-name.test.js`
Expected: FAIL because input still only handles bare device IDs.

**Step 3: Write minimal implementation**
No implementation in this task.

**Step 4: Re-run to confirm failure reason**
Run the same commands and confirm failures are tied to missing location-name support.

**Step 5: Commit**
```bash
git add /Users/tigerhuang/cofeplus/tests/menu-management.behavior.test.js /Users/tigerhuang/cofeplus/tests/device-search.location-name.test.js
git commit -m "test: cover location-name device search"
```

### Task 2: Implement shared location-name search behavior

**Files:**
- Modify: `/Users/tigerhuang/cofeplus/menu-management.html`
- Modify: `/Users/tigerhuang/cofeplus/menu.html`
- Modify: `/Users/tigerhuang/cofeplus/overview.html`
- Modify: `/Users/tigerhuang/cofeplus/materials.html`
- Modify: `/Users/tigerhuang/cofeplus/device-entry.html`
- Modify: `/Users/tigerhuang/cofeplus/staff-management.html`

**Step 1: Use failing tests as RED state**

**Step 2: Run tests to verify failure**
Run: `node tests/menu-management.behavior.test.js && node tests/device-search.location-name.test.js`
Expected: FAIL.

**Step 3: Write minimal implementation**
- Build runtime location lookup from `locationsData`.
- Rebuild device search metadata from `devicesData`.
- Format selected input value as `点位名称 · 设备编号`.
- Update matching and dropdown rendering to use both device ID and location name.
- Align staff-management placeholder wording.

**Step 4: Run tests to verify it passes**
Run: `node tests/menu-management.behavior.test.js && node tests/device-search.location-name.test.js`
Expected: PASS.

**Step 5: Commit**
```bash
git add /Users/tigerhuang/cofeplus/menu-management.html /Users/tigerhuang/cofeplus/menu.html /Users/tigerhuang/cofeplus/overview.html /Users/tigerhuang/cofeplus/materials.html /Users/tigerhuang/cofeplus/device-entry.html /Users/tigerhuang/cofeplus/staff-management.html /Users/tigerhuang/cofeplus/tests/menu-management.behavior.test.js /Users/tigerhuang/cofeplus/tests/device-search.location-name.test.js
git commit -m "feat: support location-name device search"
```

### Task 3: Full verification

**Files:**
- Verify only

**Step 1: Run verification**
Run: `node tests/menu-management.behavior.test.js && node tests/device-search.location-name.test.js && node tests/materials.device-routing.test.js && node tests/device-entry.responsive.test.js && node tests/staff-management.behavior.test.js && node tests/product-detail.pricing.test.js`
Expected: PASS.

**Step 2: Inspect git status**
Ensure only intended files changed.

**Step 3: Commit if needed**
```bash
git add -A
git commit -m "chore: finalize location-name device search"
```
