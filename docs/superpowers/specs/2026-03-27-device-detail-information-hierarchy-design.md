# Device Detail Information Hierarchy Design

**Date:** 2026-03-27

## Goal

Redesign the device detail modal in [devices.html](/Users/mac/Documents/New%20project%204/devices.html) so ordinary operators can understand it immediately, while keeping the existing device-level actions unified in one clear place.

The approved direction is:

- operator-first information hierarchy
- one unified device action area
- `远程操作` remains a device-level universal action, not a fault-only action
- current `故障处理` card is renamed and reframed as `设备状态`
- long and technical content moves into collapsed sections

## Background

The current device detail modal already contains most of the product's device operations and status surfaces:

- device base information
- entry information
- fault snapshot
- status records
- device-level actions such as `远程操作`, `编辑状态`, `状态记录`, and `物料页面`

That makes it the natural home for the full device context.

However, the current layout is difficult for general operators to parse because the first screen mixes several concepts at once:

- device identity
- fault/health signals
- entry data
- image data
- section navigation
- action entry points

The issue is not lack of information. The issue is that the information hierarchy is too flat and too busy.

## Current Problems

### 1. First screen tries to answer too many questions

When the modal opens, users are asked to process identity, status, abnormal indicators, entry information, images, and actions at the same time.

That makes the experience feel dense even when the data itself is correct.

### 2. The current `故障处理` name is misleading

The card currently presents operating indicators, organization status, and abnormal signals. It is not purely a fault-only area and it is not the actual action area.

For normal devices, the title `故障处理` creates the wrong expectation.

### 3. The right side feels like a second page

The current right side includes navigation, summary, and actions together. This competes with the left-side content instead of supporting it.

### 4. Deep information is surfaced too early

Technical indicators, long-form entry content, and image-heavy content appear too close to the top of the modal, even though most users only need them occasionally.

## Design Principles

### Principle 1: First screen must answer only 3 questions

When the modal opens, users should quickly understand:

1. Which device is this?
2. Is it currently OK?
3. What is the most likely next action?

### Principle 2: Device actions belong to one unified area

`远程操作` is not a fault-only action. It is a device-level universal action.

Therefore, all major device actions should be grouped in one stable `设备操作` area rather than scattered across status or fault-specific surfaces.

### Principle 3: Technical depth should be available, not forced

Entry details, point photos, ad-screen content, and technical telemetry all remain important. They should be preserved, but default to collapsed sections so the first screen stays understandable.

### Principle 4: Names must match what the content actually shows

If a section is showing monitoring and health information, it should not be named as if it only handles faults.

## Non-Goals

This redesign does not include:

- rebuilding the underlying device data model
- changing the existing action handlers
- merging `devices.html` and `faults.html` into one page
- redefining the faults page as the full action owner
- changing the existing fault record storage keys
- redesigning mobile detail behavior beyond structural alignment where necessary

## Role Boundary With Faults Page

This design assumes the following product boundary:

- `设备管理` is the full device context page
- `故障管理` is the abnormal queue / dispatch page

That means:

- the faults page may still offer fast entry points such as `远程操作`
- the full action set belongs to the device detail modal
- the device detail modal is the source of truth for understanding and operating a single device

## Final Structure

The approved modal layout is:

```text
Header
  Device id + top-level status chips

Left Main Column
  1. 设备概览
  2. 设备状态
  3. 入场信息 (collapsed)
  4. 广告屏信息 (collapsed)
  5. 技术状态 (collapsed)
  6. 状态记录 (collapsed)

Right Sticky Column
  设备操作
```

## Section Definitions

### 1. 设备概览

Purpose:

- answer "what device is this?"

This section is the device identity card. It should not repeat runtime status information.

Approved fields:

- `设备编号`
- `所属商户`
- `点位`
- `设备类别`
- `部署类型`

Rules:

- do not repeat `设备状态`
- do not repeat `停卖状态`
- do not repeat `最近心跳`
- do not repeat `入场状态`

If the device has not entered a point yet:

- `点位` displays a clear business-friendly fallback such as `未分配点位`

### 2. 设备状态

Purpose:

- answer "what is happening right now?"

This section replaces the current `故障处理` naming and reframes the surface as a monitoring-and-judgment area rather than a fault-only area.

Approved default-visible fields:

- `设备状态`
- `停卖状态`
- `最近心跳`
- `入场状态`
- `当前异常摘要`

#### Current Abnormal Summary

This is the only abnormal-focused content that should stay on the first screen.

Display rules:

- normal device:
  - show `当前无异常`
- abnormal device:
  - show a concise summary such as `检测到 2 项异常：制冰机失联、混水水路故障`
- if available, show a secondary time line such as `最近异常时间：2026-03-27 09:20`

This section should help non-technical users decide whether the device needs attention without forcing them into technical details.

### 3. 设备操作

Purpose:

- provide the single unified action entry for the device

This is the only top-level action area.

Approved actions:

1. `远程操作`
2. `状态记录`
3. `编辑状态`
4. `物料页面`

Priority rule:

- `远程操作` is visually emphasized as the primary action
- the other actions remain in the same card, but with lower visual weight

Rules:

- remove the current right-side `目录导航`
- remove the current right-side `状态摘要`
- do not duplicate actions elsewhere on the first screen

### 4. 入场信息

Purpose:

- preserve all entry/deployment information in one understandable business section

The previously separated `入场核心信息` and `入场全部信息` should be merged into one collapsed `入场信息` section.

Reason:

- if both are collapsed by default, splitting them creates two similar-looking entry points with low user value
- one section is clearer and easier to scan

This section contains:

- key entry information
- extended entry form fields
- point / site photos

Internal structure inside the expanded section may still be grouped, but the user-facing top-level entry remains a single section.

### 5. 广告屏信息

Purpose:

- isolate display-screen-related content from entry data

This section replaces the previous broad `图片信息` concept.

It should contain:

- ad-screen imagery
- display content / screen-related materials
- other screen-display-related information if available

Rules:

- the current display / monitor image content belongs here
- point photos do **not** belong here
- point photos belong in `入场信息`

### 6. 技术状态

Purpose:

- provide engineering-style diagnostic depth without polluting the first screen

This section is collapsed by default.

It should contain:

- organization / component status
- temperature and humidity signals
- software version information
- firmware / system version information
- update timestamps

This is where the technical content of today's `故障处理` card should move.

### 7. 状态记录

Purpose:

- provide historical context when the user actively asks for it

This section remains a separate collapsed group rather than a first-screen block.

It contains:

- abnormal records
- operation / maintenance records

## Naming Changes

The following user-facing copy changes are approved:

- `故障处理` -> `设备状态`
- `图片信息` -> `广告屏信息`
- `入场核心信息` + `入场全部信息` -> `入场信息`

These renames are structural, not cosmetic. Each one reflects a clarified content boundary.

## First-Screen Information Contract

The first screen should feel like:

1. identity
2. current condition
3. next likely action

The first screen should **not** feel like:

- a technical dashboard
- a long form
- a document archive
- a navigation page

## Interaction Rules

### Right Side

The right side should only contain `设备操作`.

No sticky directory navigation should remain on the first screen.

### Collapsed Groups

The following sections should be collapsed by default:

- `入场信息`
- `广告屏信息`
- `技术状态`
- `状态记录`

### Status Messaging

If the device has no abnormal condition:

- `设备状态` still exists
- the abnormal summary simply reads `当前无异常`

This keeps the section semantically valid for all devices, not only faulted ones.

## Suggested Desktop Reading Order

The reading path should be:

1. Header
2. `设备概览`
3. `设备状态`
4. `设备操作`
5. expanded deep sections only when needed

This order is intentionally business-first and operator-friendly.

## Acceptance Criteria

- The current `故障处理` section is renamed to `设备状态`
- The first screen shows identity information separately from runtime status
- The right side contains only one unified `设备操作` card
- `远程操作` is treated as a universal device action, not a fault-only action
- `入场核心信息` and `入场全部信息` are merged into one top-level `入场信息` section
- Point photos are shown inside `入场信息`
- Display / monitor imagery is shown inside `广告屏信息`
- Technical indicators and version fields are removed from the first screen and moved into `技术状态`
- `状态记录` remains available but no longer competes with first-screen comprehension

## Recommended Next Step

The next implementation plan should focus on:

1. restructuring the device detail modal layout
2. renaming and regrouping sections
3. moving existing content into the approved section boundaries
4. preserving existing action handlers and runtime behavior wherever possible
