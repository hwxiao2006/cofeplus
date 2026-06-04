# Project Structure

This repository is a static prototype with no build step. Keep production-facing files small in number and explicit at the repository root.

## Production Surface

- Root HTML pages are the deployed app entry points, for example `overview.html`, `devices.html`, `orders.html`, `menu-management.html`, and `login-paper.html`.
- `shared/*.js` contains reusable runtime JavaScript loaded by the root HTML pages.
- `logo.png`, `wrangler.jsonc`, `.assetsignore`, and `.env.example` support the deployed app or local deployment workflow.

Do not move root HTML pages, `shared/*.js`, or `logo.png` without adding compatibility redirects or updating every page reference and test.

## Non-Production Artifacts

- `tests/` contains Node built-in test runner coverage.
- `tasks/` contains PRD Markdown sources and standalone HTML PRDs.
- `screenshots/` contains PRD, QA, and visual reference captures.
- `docs/plans/` contains dated engineering and design plans.
- `docs/superpowers/` contains workflow plans, specs, and mockups.
- `docs/source-data/` contains source spreadsheets and document inputs used by specs or mock data work.
- `designs/` and `figma-paste/` contain design source files and imported references.
- `scripts/` contains local development and deployment helper scripts.

These directories are excluded from Cloudflare static asset deployment by `.assetsignore`.

## Root Directory Rule

Before adding a new root-level file, check whether it is one of:

- a production HTML page
- a runtime asset referenced by a production page
- deployment configuration
- repository-level documentation or policy

Everything else should go into `docs/`, `tasks/`, `screenshots/`, `designs/`, `scripts/`, or `tests/`.
