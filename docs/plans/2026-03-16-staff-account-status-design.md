# Staff Account Status Design

**Date:** 2026-03-16

## Goal

Add an account enable/disable capability to the staff management page and simplify the page summary area to a single enabled-staff count.

## Scope

- Add a staff account status field to the local page model.
- Allow operators to disable and re-enable login for each staff member.
- Replace the existing multi-card summary area with a single compact enabled-count summary.
- Keep the list focused on staff identity and assigned devices only.

## UX

- The top summary becomes a slim summary strip, not a statistics card area.
- Show `启用人员数` and a single numeric total.
- Each staff card shows:
  - name
  - phone
  - created date
  - account status
  - assigned device list
- Each staff card provides:
  - `编辑人员`
  - `停用账号` when enabled
  - `启用账号` when disabled

## Behavior

- New staff default to `accountEnabled: true`.
- Disabling an account keeps the staff record and devices intact.
- Re-enabling restores login ability only.
- The enabled summary counts only `accountEnabled !== false`.

## Testing

- Assert that the old multi-card summary no longer exists.
- Assert that a single enabled-count summary exists.
- Assert that the page includes enable/disable account controls and state handling.
- Assert that the list render no longer includes permission or push panels.
