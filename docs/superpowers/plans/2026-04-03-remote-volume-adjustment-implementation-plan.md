# Remote Volume Adjustment Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the full remote volume adjustment flow in device detail so `音量调节` opens two follow-up steps and supports persisted `0-15` volume values for each device.

**Architecture:** Extend the existing `devices.html` remote-action state machine instead of introducing a new modal system. Keep storage, rendering, and save behavior in small helpers so the main dispatch function only handles state transitions and action routing.

**Tech Stack:** Static HTML, inline vanilla JavaScript, inline CSS, Node built-in test runner with `assert`/`fs`/`vm`

---

## Chunk 1: Runtime Coverage

### Task 1: Add red tests for the new remote volume flow

**Files:**
- Create: `tests/devices.remote-actions.runtime.test.js`
- Read: `devices.html`

- [ ] **Step 1: Write the failing runtime tests**

Cover these behaviors:
- `音量调节` opens a volume menu instead of executing immediately
- volume menu shows `设备音量` and `点单屏音量`
- each detail page renders its own helper copy and current value
- save persists the chosen value and keeps the panel open

- [ ] **Step 2: Run the test file and verify it fails**

Run: `node --test tests/devices.remote-actions.runtime.test.js`  
Expected: FAIL because the volume submenu/detail helpers do not exist yet.

## Chunk 2: Volume State and Storage

### Task 2: Add persisted device volume helpers

**Files:**
- Modify: `devices.html`
- Test: `tests/devices.remote-actions.runtime.test.js`

- [ ] **Step 1: Add a dedicated localStorage key and helpers**

Implement helpers for:
- reading all persisted remote volume settings
- reading one device’s `deviceVolume` / `orderScreenVolume`
- writing one device’s updated values
- clamping values into `0-15`

- [ ] **Step 2: Add an in-memory detail volume context**

Track:
- current device id
- current volume page type
- current editing value

- [ ] **Step 3: Run the targeted tests**

Run: `node --test tests/devices.remote-actions.runtime.test.js`  
Expected: still FAIL, but now on missing rendering and action wiring rather than storage primitives.

## Chunk 3: Remote Action Flow and UI

### Task 3: Extend the existing remote-action state machine

**Files:**
- Modify: `devices.html`
- Test: `tests/devices.remote-actions.runtime.test.js`

- [ ] **Step 1: Add render helpers for the new states**

Implement:
- volume menu renderer
- device volume detail renderer
- order-screen volume detail renderer

- [ ] **Step 2: Add action routing for the new states**

Update `handleDetailRemoteAction` so:
- `音量调节` enters `volume-menu`
- `设备音量` enters `volume-device`
- `点单屏音量` enters `volume-order-screen`
- restart flow still behaves exactly as before

- [ ] **Step 3: Add direct event handlers for slider / plus / minus / save**

Implement small handlers that:
- adjust the current editing value
- re-render only the current volume page
- save and toast without closing the panel

- [ ] **Step 4: Run the targeted tests**

Run: `node --test tests/devices.remote-actions.runtime.test.js`  
Expected: PASS

## Chunk 4: Regression Verification

### Task 4: Verify existing behavior stays intact

**Files:**
- Read: `devices.html`
- Run: `tests/faults.behavior.test.js`
- Run: `tests/devices.shared-source.test.js`

- [ ] **Step 1: Re-run the existing remote-action regression suite**

Run: `node --test tests/faults.behavior.test.js`  
Expected: PASS

- [ ] **Step 2: Re-run a device baseline sanity test**

Run: `node --test tests/devices.shared-source.test.js`  
Expected: PASS

- [ ] **Step 3: Re-run the new volume test together with regressions**

Run: `node --test tests/devices.remote-actions.runtime.test.js tests/faults.behavior.test.js tests/devices.shared-source.test.js`  
Expected: all PASS
