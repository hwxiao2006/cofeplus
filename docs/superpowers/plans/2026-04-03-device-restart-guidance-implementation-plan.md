# Device Restart Guidance Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the old `机构重启` entry with a target-first restart flow that splits `软件重启` from `机器按钮重启`, preserves remote restart confirmations, and adds a hardware guidance card that does not execute commands.

**Architecture:** Keep the work inside `devices.html` and extend the existing remote-action modal state machine rather than introducing a new page shell. Drive hardware-guidance screens from a restart-target config object so the same template can render different images and steps now, and later swap assets by model without changing the flow.

**Tech Stack:** Static HTML, inline CSS, inline vanilla JavaScript, Node built-in test runner with `assert`/`fs`/`vm`

---

## Chunk 1: Red Tests For The New Restart Flow

### Task 1: Rewrite the runtime expectations around restart behavior

**Files:**
- Modify: `tests/devices.remote-actions.runtime.test.js`
- Read: `devices.html`
- Read: `docs/superpowers/specs/2026-04-03-device-restart-guidance-design.md`

- [ ] **Step 1: Add a failing test for the new top-level restart target list**

Assert that opening device remote actions now shows:
- `重启系统`
- `重启点单屏（左）`
- `重启点单屏（右）`
- `重启六轴机械臂（注意安全，谨慎使用）`

And does **not** show:
- `机构重启`

- [ ] **Step 2: Add a failing test for restart method selection**

Cover this path:
- open remote actions
- click `重启系统`
- verify the panel now shows:
  - `软件重启`
  - `机器按钮重启`

- [ ] **Step 3: Add a failing test for the software restart branch**

Cover this path:
- click `重启点单屏（左）`
- click `软件重启`
- verify confirmation copy stays in the current style, e.g. `确定要重启点单屏（左）？`
- verify no operation record is written before `确认执行`

- [ ] **Step 4: Add a failing test for the machine-button restart branch**

Cover this path:
- click `重启六轴机械臂（注意安全，谨慎使用）`
- click `机器按钮重启`
- verify the guidance card shows:
  - “系统无法远程执行”
  - target-specific title
  - an image slot
  - at least one step
  - `我知道了`
- verify clicking `我知道了` closes the panel and writes no success record

- [ ] **Step 5: Run the test file and confirm it fails for the new missing behavior**

Run: `node --test tests/devices.remote-actions.runtime.test.js`  
Expected: FAIL because the current state machine still starts from `机构重启` and does not have the method-selection / hardware-guide screens.

## Chunk 2: Restart Context And Guidance Config

### Task 2: Add restart-target metadata and modal state

**Files:**
- Modify: `devices.html`
- Test: `tests/devices.remote-actions.runtime.test.js`

- [ ] **Step 1: Add a restart target config object**

Create one config map keyed by restart target. Each entry should include:
- target title
- software-confirm label
- hardware-guide title
- hardware-guide warning copy
- image source or placeholder image descriptor
- ordered guidance steps

Assumption for execution:
- if final hardware photos are not yet provided, use clearly labeled placeholder images or lightweight illustrative assets, but keep the config shape swappable.

- [ ] **Step 2: Add a restart context object**

Track at least:
- current device id
- selected restart target
- selected restart method

Keep this separate from the existing volume context so the flows do not step on each other.

- [ ] **Step 3: Add explicit restart state labels**

Use states such as:
- `restart-targets`
- `restart-method`
- `restart-confirm`
- `restart-hardware-guide`

Reset restart state whenever the remote-action sheet closes.

- [ ] **Step 4: Run the targeted test file**

Run: `node --test tests/devices.remote-actions.runtime.test.js`  
Expected: still FAIL, but now on rendering / routing gaps rather than missing restart metadata.

## Chunk 3: UI Rendering And State Transitions

### Task 3: Replace the old restart entry with the target-first flow

**Files:**
- Modify: `devices.html`
- Test: `tests/devices.remote-actions.runtime.test.js`

- [ ] **Step 1: Update the remote-action root panel**

Change the root panel so it directly lists the four restart targets as first-class actions. Keep other existing non-restart actions unchanged.

- [ ] **Step 2: Add a renderer for restart method selection**

This screen should:
- show the selected restart target in the title
- offer `软件重启`
- offer `机器按钮重启`

- [ ] **Step 3: Add a renderer for the hardware guidance card**

This screen should:
- reuse a common layout template
- display target-specific title, image, warning text, and steps
- expose a bottom button `我知道了`

- [ ] **Step 4: Route software restart into the existing confirm flow**

When the user chooses `软件重启`:
- reuse the current confirm dialog style
- keep confirm copy consistent with today’s wording
- only write operation records after `确认执行`

- [ ] **Step 5: Route machine-button restart into the guidance flow**

When the user chooses `机器按钮重启`:
- do not open confirm
- do not execute any command
- close only when the user taps `我知道了`

- [ ] **Step 6: Run the targeted restart runtime tests**

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

- [ ] **Step 1: Update the spec if implementation details changed during TDD**

Only adjust the spec if execution revealed a better naming or state-boundary choice that still matches the approved product behavior.

- [ ] **Step 2: Mark any plan deviations explicitly**

If execution uses placeholder hardware images or a slightly different config structure, note that in the final implementation summary instead of silently drifting from the plan.
