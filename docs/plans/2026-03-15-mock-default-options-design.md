# Mock Default Options Design

## Context

The copy-product confirmation page currently shows `-` for some "default option" rows because the shared mock dataset does not preload `defaultOptions` for menu products. In this prototype, merchants should always have an existing default option for each configurable spec, so `-` is misleading and makes the confirmation diff look broken.

## Decision

Use the shared mock dataset as the source of truth and preload default option baselines for every mock product in `shared/admin-mock-data.js`.

## Scope

- Add a shared default-option baseline for all configurable spec groups.
- Apply that baseline to every mock product in the shared dataset.
- Keep the baseline generation inside the shared mock file so menu management and product detail both receive the same normalized product shape.
- Preserve a defensive UI fallback in confirmation rendering so missing values do not display as a normal `-` state.

## Out of Scope

- Redesigning the copy confirmation information architecture.
- Changing real backend data contracts.
- Reworking option-recipe comparison logic beyond the missing-default baseline.

## Result

- Every mock product has an original default selection.
- Copy confirmation no longer treats "missing default option" as a normal state for mock products.
- Future pages using the shared mock dataset inherit the same complete baseline automatically.
