# Mini Program Order Flow Unification Design

**Date:** 2026-04-21

## Goal

Unify two mini-program ordering scenarios into one coherent user flow:

- scenario A: the user is far from the coffee machine, the selected device has an ordering screen, and payment should produce an order code that must be redeemed on-site before production starts
- scenario B: the user is already at the coffee machine, the selected device has no ordering screen, and payment should send the order directly into production

The final product should feel like one ordering experience rather than two separate products.

## Confirmed Inputs

The user approved these product constraints during brainstorming:

- users select a **specific device** before payment
- the system already knows whether that device requires on-site screen redemption
- for screen-based devices, payment does **not** grant production eligibility immediately
- screen-based orders stay valid after payment until the user redeems them; there is **no automatic refund timeout**

These decisions define the foundation of the design and should not be re-opened during implementation unless product direction changes.

## Core Product Decision

Use **one primary order flow** with **device-capability-based branching after payment**.

Unified flow:

`select device -> select products -> pay -> system decides next step based on device capability`

The system should never ask the user to choose between:

- redeem before making
- make immediately

That decision belongs to the product and should be driven by device configuration, not by user judgment.

## Why This Direction

This direction is preferred over two alternatives:

### Alternative 1: Let the user choose a mode

Rejected because:

- users may choose the wrong mode
- it leaks hardware rules into the ordering UI
- it creates support burden after payment

### Alternative 2: Force every order through an order-code step

Rejected because:

- it adds a redundant step to devices that can already make immediately after payment
- it reduces convenience for users standing at a no-screen machine
- it weakens conversion for the simplest scenario

## Final User Journey

### Shared Pre-Payment Flow

All devices use the same front-half journey:

1. user selects a specific device
2. user selects products
3. user confirms cart and pays

This part of the experience must remain identical across both device types.

### Post-Payment Branch: Device Requires Screen Redemption

If the selected device has an ordering screen:

1. payment succeeds
2. the system generates an order code
3. the order enters `待核销`
4. the user goes to the device screen and redeems the order
5. after successful redemption, the order enters production

Key rule:

**Payment success means the user has paid, but production eligibility has not been granted yet.**

### Post-Payment Branch: Device Does Not Require Screen Redemption

If the selected device has no ordering screen:

1. payment succeeds
2. no redemption step is created
3. the order enters production directly

Key rule:

**Payment success immediately grants production eligibility.**

## UX Principles

### Principle 1: One flow, one shell, different next action

The product should not show two different ordering shells. It should show one shell and adapt the post-payment instruction.

### Principle 2: Always tell the user the next concrete step

The UI should not stop at `支付成功`.

It must tell the user exactly what to do next:

- `去点单屏核销`
- `查看制作进度`

### Principle 3: Device capability should be visible before payment

The user must know the fulfillment rule before payment so the post-payment outcome does not feel surprising.

### Principle 4: Payment status and fulfillment status are different

The design must clearly separate:

- money collected
- production eligibility
- current production progress

## Mini Program Surface Design

### Device/Product Page

When the user has selected a device, show a lightweight fulfillment-mode indicator near the device summary.

Recommended labels:

- screen device: `到屏核销后制作`
- no-screen device: `支付后直接制作`

This is expectation-setting, not an alert. Keep it visible but lightweight.

### Submit Order Page

Show a short fulfillment explanation above the pay button.

Recommended copy:

- screen device: `支付后将生成点单码，到设备点单屏核销后开始制作`
- no-screen device: `支付后将直接进入制作队列`

The goal is to prevent surprise after payment, not to introduce a new decision.

### Payment Success Page

Use the same layout shell for both device types and only change the status card and primary action.

### Screen Device Payment Success

Structure:

- title: `支付成功`
- subtitle: `请到设备点单屏前核销后开始制作`
- main status card:
  - large order code
  - device name
  - status: `待核销`
- primary action: `查看点单码 / 去核销`
- secondary action: `查看订单详情`

### No-Screen Device Payment Success

Structure:

- title: `支付成功`
- subtitle: `订单已进入制作队列`
- main status card:
  - production status
  - device name
  - status: `待制作` or `制作中`
- primary action: `查看制作进度`
- secondary action: `查看订单详情`

### Copy Rule

Do **not** use one generic success sentence for both cases.

Forbidden example:

- `支付成功，请等待制作`

Required distinction:

- screen device: `支付成功，待核销后开始制作`
- no-screen device: `支付成功，已进入制作队列`

### Orders List

The orders list should expose user-facing fulfillment status, not just payment result.

Recommended visible tags:

- `待核销`
- `待制作`
- `制作中`
- `已完成`
- `已取消`

Usage:

- screen-device paid orders appear as `待核销` until redemption succeeds
- no-screen paid orders appear as `待制作` or `制作中`

Recommended visual tone:

- `待核销`: orange
- `待制作`: blue
- `制作中`: green or teal
- `已完成`: green-gray
- `已取消`: neutral gray

### Order Detail Page

The detail page should answer the question: **what step is this order currently blocked on?**

### Screen Device Detail

Required fields:

- order status: `待核销`
- current step: `已支付，未核销`
- next action: `请到设备点单屏输入点单码后开始制作`
- order code card
- device name and location

### No-Screen Device Detail

Required fields:

- order status: `待制作` or `制作中`
- current step: `已支付，系统已提交制作`
- next action: `请在设备前等待出杯`

## Order Model

Do not create separate order models for screen and no-screen scenarios.

Use one order model with a device-capability snapshot.

Recommended fields:

```text
orderId
userId
deviceId
deviceNameSnapshot
deviceLocationSnapshot
fulfillmentModeSnapshot   // screen_redeem | direct_make
paymentStatus             // unpaid | paid | refunded | closed
redeemStatus              // not_required | pending | redeemed
productionStatus          // not_queued | queued | making | done | cancelled
uiStatus                  // 待核销 | 待制作 | 制作中 | 已完成 | 已取消
orderCode
paidAt
redeemedAt
queuedAt
startedAt
completedAt
cancelledAt
recipeSnapshot
priceSnapshot
```

## Snapshot Rule

`fulfillmentModeSnapshot` must be written at order creation time.

Once an order is created, later device configuration changes must not alter that order's fulfillment path.

Example:

- if a device changes from no-screen to screen-based later, an older direct-make order must still stay direct-make

## State Model

Separate payment state from fulfillment state.

### Payment Layer

- `待支付`
- `已支付`
- `已退款`
- `已关闭`

### Fulfillment Layer

- `待核销`
- `待制作`
- `制作中`
- `已完成`
- `已取消`

This distinction prevents the product from incorrectly treating all paid orders as production-ready.

## State Transitions

### Common

`待支付 -> 已支付`

### Screen Device

`已支付 -> 待核销 -> 待制作 -> 制作中 -> 已完成`

Detailed meaning:

- after payment, set `redeemStatus = pending`
- only successful redemption allows the order to enter the production queue

### No-Screen Device

`已支付 -> 待制作 -> 制作中 -> 已完成`

Detailed meaning:

- after payment, set `redeemStatus = not_required`
- the order enters the production queue immediately

## Redemption Rules

The order code must be bound to both:

- `orderId`
- `deviceId`

Required business rules:

- redemption is only valid on the original device
- redemption is single-use
- redemption must be idempotent
- repeated redemption attempts after success should return `already redeemed` rather than enqueueing production again

Because the approved rule is `pay first, grant production eligibility only after redemption`, the production queue must be created on successful redemption, not on payment, for screen-based devices.

## UI Status Mapping

Frontends should consume one normalized user-facing status from the backend or a shared state layer.

Recommended mapping:

```text
paymentStatus = paid
redeemStatus = pending
=> uiStatus = 待核销

paymentStatus = paid
redeemStatus = redeemed
productionStatus = queued
=> uiStatus = 待制作

paymentStatus = paid
productionStatus = making
=> uiStatus = 制作中

paymentStatus = paid
productionStatus = done
=> uiStatus = 已完成
```

The mini-program should not re-derive these labels independently in each screen.

## Long-Unredeemed Orders

Product has explicitly chosen:

- no automatic refund
- no automatic order expiry for the user-facing order

This creates an operations requirement.

### User-Side Rule

The order remains `待核销` until the user redeems it, cancels it, or customer support resolves it.

### Operations-Side Rule

Add internal flags for long-unredeemed paid orders, for example:

- `30分钟未核销`
- `2小时未核销`
- `当日未核销`

These internal markers must not change the customer-facing status automatically.

This preserves the approved product promise while keeping operations manageable.

## Exception Handling

Implementation must define concrete behavior for the following exceptions.

### Exception 1: Device Offline After Payment

Recommended handling:

- screen device: keep the order in `待核销` but show device-unavailable guidance if redemption is attempted while offline
- no-screen device: if payment succeeds but the device cannot accept production, move the order to an operational exception queue and show customer support guidance

### Exception 2: Wrong Device Redemption

If the user attempts to redeem on a different device:

- redemption must fail
- the UI should clearly show the correct original device name

### Exception 3: Device Capability Changes After Order Creation

All orders must follow the snapshot captured at creation time, not current live device config.

### Exception 4: Long-Unredeemed Order Meets Menu or Recipe Changes

Recommended rule:

- keep `recipeSnapshot` and `priceSnapshot` frozen at payment time
- attempt fulfillment against the paid snapshot
- if the machine can no longer fulfill that snapshot, route the order to manual support resolution rather than silently substituting

This is the safest rule under the approved `no automatic refund / no expiry` policy.

## Non-Goals

This design does not include:

- loyalty or coupon redesign
- hardware-side screen UI redesign
- customer support workflow UI
- refund policy redesign beyond the confirmed no-auto-refund rule
- cross-device redemption
- automatic expiration logic

## Implementation Implications

Any implementation plan should cover at least:

1. device capability source of truth
2. order snapshot creation
3. normalized status mapping
4. payment-success surface variants
5. order-detail surface variants
6. redemption API idempotency
7. operations visibility for long-unredeemed paid orders

## Approval Summary

This design is based on the following approved direction:

- one ordering shell for all devices
- branch only after payment
- screen device orders become `待核销`
- no-screen device orders become `待制作`
- payment and fulfillment status are separate
- screen redemption grants production eligibility
- long-unredeemed orders stay valid for users and are managed operationally through internal flags
