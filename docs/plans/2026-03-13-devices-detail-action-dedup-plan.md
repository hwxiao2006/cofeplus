# Devices Detail Action Dedup Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove duplicated action buttons from the left fault card in the device detail modal and keep a single right-side action card titled `设备操作`.

**Architecture:** Keep all action handlers and modal flows unchanged. Only update `devices.html` so the left fault card no longer renders action buttons, and the right sticky side card becomes the sole action entry with the approved button order and label.

**Tech Stack:** Static HTML, CSS, vanilla JavaScript, existing Node-based regression tests.

---

### Task 1: Capture the desired button layout in a failing check

**Files:**
- Modify: `devices.html`
- Verify: existing runtime and structure tests only

**Step 1: Identify duplicated render paths**

Inspect:
- `renderFaultActionButtons(...)`
- `renderFaultControlCard(...)`
- `renderDetailAside(...)`

Expected: confirm left fault card and right side card both render the same actions today.

**Step 2: Define the target state**

Target:
- left fault card has no action button area
- right side card title is `设备操作`
- right side button order is `远程操作 / 编辑状态 / 状态记录 / 物料页面`

**Step 3: Verify current behavior before change**

Run: `node tests/devices.entry-detail.test.js`
Expected: current tests pass before implementation.

### Task 2: Implement minimal layout change in `devices.html`

**Files:**
- Modify: `devices.html`

**Step 1: Remove left fault-card action rendering**

Update `renderFaultControlCard(...)` so it no longer appends `renderFaultActionButtons(snapshot)`.

**Step 2: Update right-side card title**

Change `renderDetailAside(...)` section title from `快捷操作` to `设备操作`.

**Step 3: Reorder right-side buttons**

Render buttons in this order:
1. `远程操作`
2. `编辑状态`
3. `状态记录`
4. `物料页面`

**Step 4: Keep behavior unchanged**

Do not rename or rewrite:
- `openDetailRemoteActions(...)`
- `openDetailEditFaultStatus(...)`
- `openDetailStatusRecords(...)`
- `goToDeviceMaterials(...)`

### Task 3: Verify no regressions

**Files:**
- Verify: `devices.html`

**Step 1: Run focused structure tests**

Run: `node tests/devices.entry-detail.test.js`
Expected: PASS

**Step 2: Run focused runtime tests**

Run: `node tests/devices.maintenance-record-contact-runtime.test.js`
Expected: PASS

**Step 3: Sanity-check worktree scope**

Run: `git diff -- devices.html docs/plans/2026-03-13-devices-detail-action-dedup-design.md docs/plans/2026-03-13-devices-detail-action-dedup-plan.md`
Expected: only the intended layout and docs changes appear.
