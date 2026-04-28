# Device Entry EntryInfo Alignment Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align `device-entry.html` with the current `devices.html` entry-info contract so newly entered devices persist the same `entryInfo` schema that the device detail editor already reads and writes.

**Architecture:** Keep the implementation focused in `device-entry.html` by upgrading its form fields, upload state, and payload builder to the canonical `entryInfo` shape. Use targeted contract and runtime-style regression tests to lock the saved schema, while leaving `devices.html` compatibility logic intact for older historical data.

**Tech Stack:** Static HTML, inline CSS, inline vanilla JavaScript, Node built-in test runner with `assert`/`fs`/`vm`

---

## Chunk 1: Lock In The Contract

### Task 1: Add failing tests for the canonical entry-info payload

**Files:**
- Modify: `tests/devices.entry-detail.test.js`
- Modify: `tests/device-entry.responsive.test.js`
- Create: `tests/device-entry.entryinfo-alignment.runtime.test.js`
- Read: `device-entry.html`
- Read: `devices.html`

- [ ] **Step 1: Extend the static detail-entry contract test**

Add assertions in `tests/devices.entry-detail.test.js` that `device-entry.html` now contains the canonical entry-info fields and no longer relies on the legacy screen placeholder contract:

- `operatorPhone`
- `networkSignal`
- `maintenanceWindow`
- `notes`
- `adScreen`
- `locationImageUrls`
- no `displayImages` writes inside `buildEntryInfoPayload()`

- [ ] **Step 2: Extend the device-entry markup test**

Add assertions in `tests/device-entry.responsive.test.js` for the new field IDs and upload controls:

- `operatorPhoneDisplay` or equivalent operator-phone binding target
- `networkSignalInput`
- `maintenanceWindowInput`
- `notesInput`
- left/right ad-screen upload controls
- location-image preview list and file input

- [ ] **Step 3: Create a focused runtime alignment test**

Create `tests/device-entry.entryinfo-alignment.runtime.test.js` to exercise the entry-page helpers in a VM-like environment and verify:

- `buildEntryInfoPayload()` returns the canonical field set
- `submitEntry()` writes `device.entryInfo.adScreen`
- `submitEntry()` writes `locationImageUrls`
- energy-time fields collapse to `-` when energy mode is `关闭`

- [ ] **Step 4: Run the new and updated tests to verify they fail**

Run:

```bash
node --test tests/devices.entry-detail.test.js
node --test tests/device-entry.responsive.test.js
node --test tests/device-entry.entryinfo-alignment.runtime.test.js
```

Expected:

- the updated assertions should fail on missing fields and old payload shape
- the new runtime test should fail because the canonical helpers do not exist yet

## Chunk 2: Upgrade Device Entry Form State

### Task 2: Extend `device-entry.html` to capture the missing canonical fields

**Files:**
- Modify: `device-entry.html`
- Test: `tests/device-entry.responsive.test.js`

- [ ] **Step 1: Add missing business fields to the entry form**

Add visible form controls for:

- `networkSignal`
- `maintenanceWindow`
- `notes`

Keep the existing page structure and mobile/desktop layout patterns instead of redesigning the whole page.

- [ ] **Step 2: Add operator phone binding**

Implement a lightweight operator-phone value path so the entry page can persist:

- `operatorName`
- `operatorPhone`

If the selected operator has no phone source, use `-`.

- [ ] **Step 3: Replace the legacy screen section with the left/right ad-screen model**

Remove the old `显示器画面` placeholder upload area and add:

- `左侧菜单` upload controls for image/video
- `右侧排队号背景` upload control for image
- current-draft preview containers for both sides

- [ ] **Step 4: Replace the placeholder point-photo area with real image upload state**

Add:

- local file input for point photos
- preview list container
- count text or equivalent upload summary

- [ ] **Step 5: Run the structural tests again**

Run:

```bash
node --test tests/device-entry.responsive.test.js
```

Expected:

- the markup test now passes
- the runtime alignment test still fails because payload/storage wiring is not finished

## Chunk 3: Align The Saved Payload

### Task 3: Rewrite the entry payload builder to the canonical schema

**Files:**
- Modify: `device-entry.html`
- Test: `tests/device-entry.entryinfo-alignment.runtime.test.js`

- [ ] **Step 1: Add small helper state for entry-page image drafts**

Implement focused in-page helpers for:

- left/right ad-screen draft assets
- location-image draft list
- safe serialization of those draft values

Mirror the current detail-edit data shape without trying to extract a shared module in this phase.

- [ ] **Step 2: Rewrite `buildEntryInfoPayload()`**

Update `buildEntryInfoPayload()` so it returns the canonical object:

```js
{
  entryAt,
  locationName,
  locationAddress,
  operatorName,
  operatorPhone,
  gpsAction,
  longitude,
  latitude,
  energyMode,
  networkSignal,
  energyStartTime,
  energyEndTime,
  deviceStartDate,
  deviceEndDate,
  terminalGeneration5,
  parallelProduction,
  maintenanceWindow,
  notes,
  payQr,
  payDigitalRmb,
  paymentMethods,
  adScreen,
  locationImageUrls,
  locationImages
}
```

Do not keep writing `displayImages`.

- [ ] **Step 3: Update `submitEntry()` to persist the aligned payload**

Keep the current business behavior:

- select device
- assign location
- mark `entered = true`
- enable sales if needed

But make sure `device.entryInfo` now always receives the canonical payload from Step 2.

- [ ] **Step 4: Run the focused runtime test**

Run:

```bash
node --test tests/device-entry.entryinfo-alignment.runtime.test.js
```

Expected:

- PASS

## Chunk 4: Verify Detail Compatibility

### Task 4: Re-run detail-side contract tests against the aligned entry page

**Files:**
- Verify: `tests/devices.entry-detail.test.js`
- Verify: `tests/device-entry.location-quick-create.test.js`
- Verify: `tests/device-entry.responsive.test.js`
- Verify: `tests/device-entry.entryinfo-alignment.runtime.test.js`

- [ ] **Step 1: Re-run the detail contract test**

Run:

```bash
node --test tests/devices.entry-detail.test.js
```

Expected:

- PASS

- [ ] **Step 2: Re-run the existing device-entry regressions**

Run:

```bash
node --test tests/device-entry.location-quick-create.test.js
node --test tests/device-entry.responsive.test.js
```

Expected:

- PASS

- [ ] **Step 3: Run the full targeted bundle**

Run:

```bash
node --test tests/devices.entry-detail.test.js tests/device-entry.location-quick-create.test.js tests/device-entry.responsive.test.js tests/device-entry.entryinfo-alignment.runtime.test.js
```

Expected:

- all PASS

## Chunk 5: Finish The Branch Cleanly

### Task 5: Review, commit, and prepare the implementation branch

**Files:**
- Review: `device-entry.html`
- Review: `tests/devices.entry-detail.test.js`
- Review: `tests/device-entry.responsive.test.js`
- Review: `tests/device-entry.entryinfo-alignment.runtime.test.js`

- [ ] **Step 1: Review the final diff for accidental schema drift**

Check specifically that:

- the entry page writes `adScreen`, not legacy screen placeholders
- the entry page writes `locationImageUrls`
- no unrelated device-detail flow is changed

- [ ] **Step 2: Commit the implementation**

Run:

```bash
git add device-entry.html tests/devices.entry-detail.test.js tests/device-entry.responsive.test.js tests/device-entry.entryinfo-alignment.runtime.test.js
git commit -m "feat(devices): align device entry payload with detail schema"
```

- [ ] **Step 3: Report verification results and hand off**

Summarize:

- files changed
- tests run
- any deliberate compatibility choices kept in place
