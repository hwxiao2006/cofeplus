# Device Detail Temperature Alarm Action Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `温度报警设置` action to the device detail right rail and open a standalone device-scoped modal without adding any summary content to the detail body.

**Architecture:** Extend the existing detail aside action list in `devices.html`, add a dedicated modal overlay plus helper/render functions for temperature-alarm settings, and lock the behavior with one static contract test file and one focused runtime test file.

**Tech Stack:** Static HTML/CSS/vanilla JavaScript in `devices.html`, Node.js built-in test runner for `tests/devices.entry-detail.test.js` and a new runtime test file.

---

## Chunk 1: Lock The Contract In Tests

### Task 1: Add failing tests for the new action and modal entry points

**Files:**
- Modify: `tests/devices.entry-detail.test.js`
- Create: `tests/devices.temperature-alarm.runtime.test.js`

- [ ] Add a static assertion that the right-side `设备操作` area now includes `温度报警设置`
- [ ] Add static assertions that `devices.html` contains:
  - `detailTemperatureAlarmModal`
  - `openDetailTemperatureAlarmModal(...)`
  - `closeDetailTemperatureAlarmModal(...)`
- [ ] Add static assertions that no new detail-body summary labels such as `温度报警摘要` are introduced
- [ ] Add a runtime test that opens the modal for one device and verifies:
  - the modal becomes active
  - the device id is rendered in the modal
  - zone labels such as `冰箱` and `豆仓` appear

## Chunk 2: Implement The Modal

### Task 2: Extend `devices.html` with the new action and standalone modal

**Files:**
- Modify: `devices.html`

- [ ] Add the new `温度报警设置` button to `renderDetailAside(...)`
- [ ] Add a dedicated modal overlay container near the existing detail/status/image modals
- [ ] Add CSS for the temperature-alarm modal and zone-card grid
- [ ] Add device-scoped helper/render functions for stable modal data
- [ ] Implement open/close handlers without changing the main detail-card composition
- [ ] Keep `远程操作` as the only primary action

## Chunk 3: Verify Regressions

### Task 3: Run targeted verification

**Files:**
- Verify: `tests/devices.entry-detail.test.js`
- Verify: `tests/devices.temperature-alarm.runtime.test.js`
- Verify: `tests/devices.maintenance-record-contact-runtime.test.js`

- [ ] Run the updated static detail test file
- [ ] Run the new temperature-alarm runtime test file
- [ ] Run the existing maintenance/status runtime regression file
