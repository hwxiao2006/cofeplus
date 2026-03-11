# Product Card Dual Actions Design

**Context**
- Current menu-management product card exposes only one explicit action: `编辑`.
- Product status is visible but not directly actionable on the card.
- User decided against a mobile-only status-tap interaction and wants a unified dual-button pattern.

**Decision**
- Use two explicit card actions across desktop and mobile:
  - `上架/下架`
  - `编辑`
- Keep card body click behavior unchanged: clicking outside the action buttons still enters product detail.
- Keep status text under the price as a passive indicator only.

**Interaction**
- Button 1: toggles `onSale` directly and shows the existing toast.
- Button 2: opens edit flow as today.
- Both buttons must stop propagation so they do not trigger detail navigation.

**Layout**
- Desktop: two compact pill buttons aligned as a pair in the action area.
- Mobile: same two-button pattern, but the action row stretches to full width for reliable taps.
- Status line remains above the actions to preserve scanability.

**Risk Controls**
- Do not change batch up/down shelf logic.
- Do not change detail-page edit flow.
- Preserve current card density and avoid expanding card height excessively.

**Verification**
- Product card render output contains two actions.
- Sale button label reflects current sale state.
- Button handlers stop propagation.
- Relevant menu-management behavior tests still pass.
