# Orders Detail Preview Design

**Date:** 2026-03-13

## Goal
Provide two previewable redesign directions for order details triggered from the orders page `详情` action:
- A centered desktop modal
- A right-side desktop drawer

Both directions must present the screenshot's information model, but avoid the old long white table aesthetic.

## Information Model
The preview must include these fields:
- 支付时间
- 订单编号
- 交易单号
- 用户昵称
- 手机号
- 设备编号
- 排队号
- 出杯口号
- 取杯码
- 订单状态
- 订单类型
- 支付方式
- 支付金额
- 优惠金额
- 商品名称 / 规格

## Shared Visual Direction
Use the existing back-office system-font environment and the order workspace palette already established in `orders.html`.

Design principles:
- Replace the screenshot's long divider-based list with grouped information cards
- Elevate the strongest facts into a summary header: order id, status, amount, time
- Keep label/value reading patterns, but reduce visual monotony through grouped sections
- Make long identifiers wrap safely without blowing up layout width
- Preserve an operational tone rather than a consumer app tone
- Both preview variants should render in a desktop workspace shell so the desktop interaction cost is visible at a glance

## Variant A: Modal
Use when the operator only needs a quick inspection and returns to the list immediately.

Structure:
- Dimmed desktop workspace background
- Centered floating modal card with strong drop shadow
- Hero summary block at the top
- Three grouped sections: 基础信息 / 交易信息 / 商品信息
- Compact footer actions only if needed for preview

Tradeoff:
- Strong focus
- But hides surrounding order context completely

## Variant B: Drawer
Use when the orders page is treated as a working surface and the operator may inspect multiple orders in sequence.

Structure:
- Left side remains a desktop order-table workspace mock
- Right side fixed-width drawer
- Summary header in drawer
- Same grouped sections as the modal
- Drawer feels native to an operations console and supports repeated inspection better

Tradeoff:
- Keeps context
- Uses more horizontal space

## Recommendation
Recommend Variant B for final integration into `orders.html` because the orders page is an operational workspace rather than a one-off receipt viewer.

Variant A remains useful as a fallback for mobile or as a quick lightweight inspection pattern.
