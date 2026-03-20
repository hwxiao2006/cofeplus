# Single Paper Login Entry Design

## Goal

Simplify the prototype login experience so the site opens directly into the paper-themed login page and no longer ships the gallery or the other two login concepts.

## Approved Direction

- `index.html` should redirect directly to `login-paper.html`
- `login-paper.html` becomes the only shipped login page
- `login-gallery.html`, `login-morning.html`, and `login-counter.html` should be removed

## Problem Being Solved

The repository currently exposes a comparison gallery plus three separate login concepts. That no longer matches the product direction. Keeping the unused pages creates extra entry paths, stale tests, and future maintenance noise.

## Design Decisions

### Entry flow

- Opening the prototype should land on `login-paper.html`
- The redirect text in `index.html` should refer to a login page, not a login concept gallery

### File surface

- Remove the gallery page entirely
- Remove the morning and counter login pages entirely
- Keep only `login-paper.html` as the single supported login surface

### Tests

- Replace gallery-oriented entry assertions with single-entry assertions
- Update shared login-page tests so they only target `login-paper.html`
- Remove deleted pages from the body font-stack regression

## Scope

In scope:

- `index.html`
- `login-paper.html`
- login entry and login page regression tests
- deletion of `login-gallery.html`, `login-morning.html`, `login-counter.html`

Out of scope:

- changes to `login-paper.html` visual design beyond what is needed for the single-page entry
- changes to login behavior after submission
- changes to admin pages after successful login
