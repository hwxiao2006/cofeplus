# Login Default Credentials Design

## Goal

Provide a ready-to-use demo account on the remaining paper login page while keeping the post-login sidebar identity anchored to the existing admin layout position and profile format.

## Approved Direction

Use the following demo credentials on the shipped login page:

- account: `13800138000`
- password: `123456`

After successful login, keep the stored session account as the entered account value, but write the sidebar profile in the existing admin format:

- name: `运营管理员`
- phone: `13800138000`

## Problem Being Solved

The current login page requires manual typing for every preview run, and the current profile persistence mirrors the account value into both `name` and `phone`. That causes the sidebar login area to lose its original design intent and can produce awkward output in the existing top-of-sidebar login slot.

## Design Decisions

### Default credentials

- Pre-fill the remaining login page with the same demo credentials.
- Keep the form editable so the demo still behaves like a real login form.
- Do not change validation rules or submit flow.

### Post-login sidebar profile

- Continue to use `sidebarLoginProfile`, because all sidebar pages already render that key into the existing login slot.
- Stop mirroring arbitrary account text into both fields.
- Persist a stable display profile so the menu/sidebar area keeps the intended `name + phone` layout.

### Session persistence

- Keep `cofeLoginSession.account` as the actual submitted account.
- Keep `theme` and `loggedInAt` behavior unchanged.

## Scope

In scope:

- `login-paper.html`
- login page structure/runtime regression tests

Out of scope:

- changing admin sidebar rendering logic
- changing redirect target after login
- introducing real authentication or account lookup
