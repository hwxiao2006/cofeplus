# Staff Management Remove Auth Fields Design

**Date:** 2026-03-17

## Goal

Remove the authorization and `openId` inputs from the staff add/edit form in `staff-management.html` so the form reflects the new simplified requirements.

## Scope

- Remove the `运维小程序授权` form row.
- Remove the `微信公众号推送授权` form row.
- Remove all `openId` input fields from the staff form.
- Remove the JavaScript form logic that reads, resets, fills, or mocks these removed fields.
- Update behavior tests so they assert the authorization and `openId` fields are no longer present.

## Non-Goals

- No changes to the desktop staff list density work.
- No changes to permission-tree behavior.
- No changes to push-channel selection behavior.
- No local data migration for historical `opsOpenid` or `wechatOpenid` values.

## Current Problem

The staff form still includes legacy authorization inputs that are no longer part of the product requirement:

- `运维小程序授权`
- `微信公众号推送授权`
- `openId`

Keeping these inputs creates confusion for operators and leaves the form longer than necessary.

## UX Design

### Form Layout

In the `基本信息` section:

- Keep `用户名`
- Keep `手机号`
- Remove every authorization-related row
- Remove every `openId` row

The form should flow directly from the remaining basic info fields into the next section without leaving empty placeholders or dead labels.

### Historical Data Behavior

If existing local mock or persisted staff records still contain:

- `opsOpenid`
- `wechatOpenid`

the page should simply ignore those properties. They should no longer be displayed, edited, or written back from the form.

## Implementation Notes

Keep the change self-contained to the staff page and its behavior test.

Remove or update the following logic areas:

- Form markup for authorization rows and `openId` inputs
- `resetStaffForm()` assignments for removed inputs
- `fillStaffForm()` assignments for removed inputs
- `mockAuthorize()` if it becomes unused
- Save logic that reads removed input values and writes them into staff objects

Do not add replacement fields or transitional UI.

## Files Affected

- `staff-management.html`
- `tests/staff-management.behavior.test.js`

## Testing

Update `tests/staff-management.behavior.test.js` to assert:

- `运维小程序授权` is not present
- `微信公众号推送授权` is not present
- `openId` is not present
- removed authorization helpers are not still referenced by the page
- the rest of the required staff form fields still exist

## Verification

Manual verification should confirm:

- the staff modal opens without any authorization or `openId` fields
- add/edit flows still work with the simplified form
- existing staff records still load without runtime errors even if their stored objects contain old auth properties
