# Materials Shipment Return Flow Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add source-aware return behavior across `materials.html`, `materials-refill.html`, and `materials-orders.html` so shipment users can return to the correct materials-page context without changing the core shipment flow.

**Architecture:** Persist a lightweight session-scoped return-context object when entering the shipment page from `materials.html`, let `materials-refill.html` and `materials-orders.html` consume that context when rendering their back/return affordances, and keep safe fallback navigation when the context is absent or malformed. Lock the flow with structure checks and VM-based runtime assertions in the existing materials regression test file.

**Tech Stack:** Static HTML, inline CSS, vanilla JavaScript, sessionStorage/localStorage, Node built-in test runner with `assert`, `fs`, and `vm`

---

## File Structure

- Modify: `materials.html`
  - Persist source-aware return context before routing into `materials-refill.html`
  - Preserve current preselect and device persistence behavior
- Modify: `materials-refill.html`
  - Read and validate shipment return context
  - Make the refill-page back action source-aware
  - Preserve source context through successful shipment creation
- Modify: `materials-orders.html`
  - Read and validate shipment return context
  - Show a `返回物料页` affordance only when the flow originated from materials
  - Route that affordance back into the restored materials context
- Modify: `tests/materials.device-routing.test.js`
  - Add structure assertions for the new orders-page return affordance
  - Add runtime assertions for session-storage-driven return behavior

## Chunk 1: Lock The Expected Behavior In Tests

### Task 1: Add failing structure assertions for the orders-page return affordance

**Files:**
- Modify: `tests/materials.device-routing.test.js`
- Test: `tests/materials.device-routing.test.js`

- [ ] **Step 1: Write the failing test**

Add assertions that:

- `materials-orders.html` contains a dedicated `返回物料页` trigger in the page chrome
- the trigger is styled as a conditional return affordance rather than replacing the normal back button
- the trigger is absent from the raw markup only if it is injected at runtime; otherwise assert the render hook or container exists

- [ ] **Step 2: Run the targeted test to verify it fails**

Run: `node --test tests/materials.device-routing.test.js`

Expected: FAIL because the current orders page does not expose the new return affordance.

### Task 2: Add failing runtime assertions for source-aware return behavior

**Files:**
- Modify: `tests/materials.device-routing.test.js`
- Test: `tests/materials.device-routing.test.js`

- [ ] **Step 1: Write the failing runtime assertions**

Add VM-based tests that verify:

- `materials.html` writes a session-scoped return context before navigating to `materials-refill.html`
- `materials-refill.html` back navigation prefers that stored context over the generic fallback
- `materials-refill.html` successful submit still routes to `/materials-orders.html?from=materials`
- `materials-orders.html` only exposes the materials return affordance when the return context is valid
- `materials-orders.html` uses the stored context when returning to `materials.html`

- [ ] **Step 2: Run the targeted test to verify it fails**

Run: `node --test tests/materials.device-routing.test.js`

Expected: FAIL on the new context-storage and source-aware return assertions because the current pages still use generic navigation.

## Chunk 2: Persist Source Context From Materials

### Task 3: Extend `materials.html` routing with a shipment return context

**Files:**
- Modify: `materials.html`
- Test: `tests/materials.device-routing.test.js`

- [ ] **Step 1: Add a dedicated helper for shipment return context**

Implement a focused helper that writes a lightweight object to `sessionStorage`, for example:

```js
function persistShipmentReturnContext(materialCode = null) {
    const payload = {
        source: 'materials',
        deviceId: currentDevice,
        materialCode: materialCode || null
    };
    sessionStorage.setItem('materialsShipmentReturnContext', JSON.stringify(payload));
}
```

- [ ] **Step 2: Reuse the helper in shipment entry points**

Call the helper from `goToRefillPage(materialCode)` before redirecting, while preserving the existing `currentDevice` and `preselectMaterial` writes.

- [ ] **Step 3: Run the targeted test**

Run: `node --test tests/materials.device-routing.test.js`

Expected: the new `materials.html` storage assertion passes, while refill/orders assertions still fail.

## Chunk 3: Make The Refill Page Context-Aware

### Task 4: Add return-context parsing and fallback logic in `materials-refill.html`

**Files:**
- Modify: `materials-refill.html`
- Test: `tests/materials.device-routing.test.js`

- [ ] **Step 1: Add a safe parser**

Implement a helper such as:

```js
function getShipmentReturnContext() {
    try {
        const raw = sessionStorage.getItem('materialsShipmentReturnContext');
        const parsed = raw ? JSON.parse(raw) : null;
        if (!parsed || parsed.source !== 'materials') return null;
        return {
            source: 'materials',
            deviceId: String(parsed.deviceId || '').trim() || null,
            materialCode: parsed.materialCode ? String(parsed.materialCode) : null
        };
    } catch (error) {
        return null;
    }
}
```

- [ ] **Step 2: Update the refill-page back action**

Change `goBack()` so it:

- returns to `materials.html` with the stored context when valid
- falls back to the existing `materials.html` redirect when not

Keep the implementation lightweight by continuing to use `sessionStorage` rather than appending large URL params.

- [ ] **Step 3: Preserve context through successful shipment creation**

Keep the redirect target as `/materials-orders.html?from=materials`, but do not clear the return context before that handoff.

- [ ] **Step 4: Run the targeted test**

Run: `node --test tests/materials.device-routing.test.js`

Expected: refill-page runtime assertions pass, while the orders-page return affordance assertions may still fail.

## Chunk 4: Add The Orders-Page Return Affordance

### Task 5: Render and wire `返回物料页` in `materials-orders.html`

**Files:**
- Modify: `materials-orders.html`
- Test: `tests/materials.device-routing.test.js`

- [ ] **Step 1: Add shared context-reader helpers**

Implement safe helpers that:

- read `materialsShipmentReturnContext`
- validate `source === 'materials'`
- expose a boolean like `hasMaterialsReturnContext()`

- [ ] **Step 2: Add a conditional return affordance in the page header**

Render a visible `返回物料页` control only when the return context exists and is valid.

Recommended behavior:

- keep the existing back button for generic navigation
- add the new return control as a secondary header action

- [ ] **Step 3: Implement the return handler**

When activated:

- route to `materials.html`
- leave or clear the return context deliberately so future visits do not pick up stale state

If context is invalid or missing, fall back to the existing generic materials-page redirect.

- [ ] **Step 4: Run the targeted test to verify it passes**

Run: `node --test tests/materials.device-routing.test.js`

Expected: PASS

## Chunk 5: Final Verification

### Task 6: Verify the changed flow and review scope

**Files:**
- Modify: `materials.html`
- Modify: `materials-refill.html`
- Modify: `materials-orders.html`
- Modify: `tests/materials.device-routing.test.js`
- Add: `docs/superpowers/plans/2026-04-08-materials-shipment-return-flow-implementation-plan.md`

- [ ] **Step 1: Run targeted regression**

Run: `node --test tests/materials.device-routing.test.js`

Expected: PASS

- [ ] **Step 2: Review the touched diff**

Run: `git diff -- materials.html materials-refill.html materials-orders.html tests/materials.device-routing.test.js docs/superpowers/specs/2026-04-08-materials-shipment-return-flow-design.md docs/superpowers/plans/2026-04-08-materials-shipment-return-flow-implementation-plan.md`

Expected: only the return-flow spec, plan, page routing, and targeted test updates appear.
