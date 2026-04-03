# Device Restart Guidance Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep `机构重启` as the grouped restart entry, send each restart target directly into the existing software-restart confirm flow, and expose `无法远程处理？查看机器按钮位置` as a non-executing helper that opens a hardware guidance card.

**Architecture:** Keep the work inside `devices.html` and extend the existing remote-action modal state machine rather than introducing a new page shell. Drive hardware-guidance screens from a restart-target config object so the same template can render different images and steps now, and later swap assets by model without changing the flow.

**Tech Stack:** Static HTML, inline CSS, inline vanilla JavaScript, Node built-in test runner with `assert`/`fs`/`vm`

---

## Chunk 1: Red Tests For The New Restart Flow

### Task 1: Rewrite the runtime expectations around restart behavior

**Files:**
- Modify: `tests/devices.remote-actions.runtime.test.js`
- Read: `devices.html`
- Read: `docs/superpowers/specs/2026-04-03-device-restart-guidance-design.md`

- [ ] **Step 1: Keep the grouped restart entry coverage**

Assert that opening device remote actions still shows:
- `机构重启`

Then assert that clicking `机构重启` shows:
- `重启系统`
- `重启点单屏（左）`
- `重启点单屏（右）`
- `重启六轴机械臂（注意安全，谨慎使用）`

- [ ] **Step 2: Add a failing test for target -> confirm behavior**

Cover this path:
- open remote actions
- click `机构重启`
- click `重启系统`
- verify the panel now shows:
  - `确定要重启系统？`
  - `确认软件重启`
  - `无法远程处理？查看机器按钮位置`

- [ ] **Step 3: Add a failing test for the software restart branch**

Cover this path:
- click `机构重启`
- click `重启点单屏（左）`
- verify confirmation copy stays in the current style, e.g. `确定要重启点单屏（左）？`
- verify no operation record is written before `确认软件重启`
- click `确认软件重启`
- verify the operation record is written

- [ ] **Step 4: Add a failing test for the hardware guidance helper**

Cover this path:
- click `机构重启`
- click `重启六轴机械臂（注意安全，谨慎使用）`
- click `无法远程处理？查看机器按钮位置`
- verify the guidance card shows:
  - “系统无法远程执行”
  - target-specific title
  - an image slot
  - at least one step
  - `我知道了`
- verify clicking `我知道了` closes the panel and writes no success record

- [ ] **Step 5: Run the test file and confirm it fails for the new missing behavior**

Run: `node --test tests/devices.remote-actions.runtime.test.js`  
Expected: FAIL because the current state machine still routes restart targets through a method-selection screen.

## Chunk 2: Restart Context And Guidance Config

### Task 2: Keep restart-target metadata and simplify modal state

**Files:**
- Modify: `devices.html`
- Test: `tests/devices.remote-actions.runtime.test.js`

- [ ] **Step 1: Keep a restart target config object**

Use one config map keyed by restart target. Each entry should include:
- target title
- confirm label
- hardware-guide title
- hardware-guide warning copy
- image source or placeholder image descriptor
- ordered guidance steps

Assumption for execution:
- if final hardware photos are not yet provided, use clearly labeled placeholder images or lightweight illustrative assets, but keep the config shape swappable

- [ ] **Step 2: Simplify restart context**

Track at least:
- current device id
- selected restart target

Keep this separate from the existing volume context so the flows do not step on each other.

- [ ] **Step 3: Simplify restart state labels**

Use states such as:
- `restart-targets`
- `restart-confirm`
- `restart-hardware-guide`

Reset restart state whenever the remote-action sheet closes.

- [ ] **Step 4: Run the targeted test file**

Run: `node --test tests/devices.remote-actions.runtime.test.js`  
Expected: still FAIL, but now on rendering / routing gaps rather than missing restart metadata.

## Chunk 3: UI Rendering And State Transitions

### Task 3: Replace method selection with a helper entry on the confirm page

**Files:**
- Modify: `devices.html`
- Test: `tests/devices.remote-actions.runtime.test.js`

- [ ] **Step 1: Keep the remote-action root panel grouped**

Keep `机构重启` in the remote-action root panel, and keep other existing non-restart actions unchanged.

- [ ] **Step 2: Keep the restart target selection screen**

This screen should list:
- `重启系统`
- `重启点单屏（左）`
- `重启点单屏（右）`
- `重启六轴机械臂（注意安全，谨慎使用）`

- [ ] **Step 3: Route each target directly into the confirm dialog**

This screen should:
- show the selected restart target in the confirmation copy
- use `确认软件重启` as the primary action card
- add a helper action `无法远程处理？查看机器按钮位置`
- keep the confirmation copy as a separate middle card
- keep `取消`

- [ ] **Step 4: Keep the hardware guidance card**

This screen should:
- reuse a common layout template
- display target-specific title, image, warning text, and steps
- expose a bottom button `我知道了`

- [ ] **Step 5: Route confirm into the existing remote execution flow**

When the user chooses `确认软件重启`:
- reuse the current confirm dialog style
- keep confirm copy consistent with today’s wording
- only write operation records after `确认软件重启`

- [ ] **Step 6: Route the helper action into the guidance flow**

When the user chooses `无法远程处理？查看机器按钮位置`:
- do not execute any command
- do not write any success record
- close only when the user taps `我知道了`

- [ ] **Step 7: Run the targeted restart runtime tests**

Run: `node --test tests/devices.remote-actions.runtime.test.js`  
Expected: PASS

## Chunk 4: Regression Verification

### Task 4: Verify non-restart device behavior still works

**Files:**
- Run: `tests/devices.remote-actions.runtime.test.js`
- Run: `tests/devices.shared-source.test.js`
- Run: `tests/faults.behavior.test.js`

- [ ] **Step 1: Re-run device data baseline coverage**

Run: `node --test tests/devices.shared-source.test.js`  
Expected: PASS

- [ ] **Step 2: Re-run the faults page regression suite**

Run: `node --test tests/faults.behavior.test.js`  
Expected: PASS

- [ ] **Step 3: Run the combined verification set**

Run: `node --test tests/devices.remote-actions.runtime.test.js tests/devices.shared-source.test.js tests/faults.behavior.test.js`  
Expected: all PASS

## Chunk 5: Documentation Sync

### Task 5: Keep the design artifacts aligned with shipped behavior

**Files:**
- Modify: `docs/superpowers/specs/2026-04-03-device-restart-guidance-design.md`
- Modify: `docs/superpowers/plans/2026-04-03-device-restart-guidance-implementation-plan.md`

- [ ] **Step 1: Update the spec to the new interaction model**

The written design should clearly describe:
- target selection first
- direct entry into the software-restart confirm page
- `无法远程处理？查看机器按钮位置` as a helper, not a second executable action
- the confirm page visual hierarchy as primary action card + confirm copy card + helper card

- [ ] **Step 2: Note implementation deviations explicitly**

If execution uses placeholder hardware images or a slightly different config structure, note that in the final implementation summary instead of silently drifting from the plan.
