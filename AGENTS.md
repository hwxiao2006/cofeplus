# Repository Guidelines

## Project Structure & Module Organization
The product surface lives in root-level HTML files such as `overview.html`, `devices.html`, `orders.html`, and `menu-management.html`. Keep each page self-contained with inline `<style>` and `<script>` blocks unless logic is shared across pages. Reusable JavaScript belongs in `shared/*.js` such as `shared/admin-mock-data.js`. Store regression tests in `tests/*.test.js`, dated design and implementation plans in `docs/plans/`, design source files in `designs/` and `figma-paste/`, and QA artifacts in `screenshots/` or `test-results/`.

## Build, Test, and Development Commands
There is no build step or bundler in this repository.

- `python3 scripts/no_cache_http_server.py --port 8080` starts a no-cache local server for manual QA.
- `node --test tests/` runs the full Node built-in test suite.
- `node --test tests/orders.shared-source.test.js` runs one targeted test file while iterating.
- Production is a Cloudflare Pages project connected to GitHub `main`; release by committing to `main` and pushing to GitHub so Pages auto-deploys. Do not use `npx wrangler deploy` for production releases.

## Coding Style & Naming Conventions
Follow the surrounding file before refactoring. Root HTML pages generally use 4-space indentation and keep markup, CSS variables, and vanilla JavaScript together in one file. Shared utilities use kebab-case filenames, for example `business-tag-library.js`. Prefer descriptive page-state globals, preserve existing `localStorage` keys, and reuse established layout tokens such as `--primary`, `--bg-sidebar`, and the 240px sidebar width. Name new plan docs `YYYY-MM-DD-topic-plan.md`; name tests `<page>.<focus>.test.js`.

## Testing Guidelines
Tests use Node’s built-in runner with `assert`, `fs`, and `vm`. Add or update tests for every behavior change, especially when touching shared mock data, sidebar translation logic, or persisted state. When a change affects both markup and runtime behavior, cover both: a structure/assertion test plus a VM-based runtime test is the normal pattern here.

## Commit & Pull Request Guidelines
Recent history uses concise Conventional Commit-style messages in English, for example `feat(menu): add multilingual business tags` and `docs: add device latte art implementation plan`. Keep commits scoped to one behavior or page. PRs should summarize impacted files, link the relevant task or plan, list the commands you ran, and include screenshots for visual changes.

## Agent Notes
Repo-local automation lives in `.agents/skills/`, with vendored gstack workflows under `.claude/skills/gstack/`. For browser-based QA in this repo, prefer the gstack `/browse` workflow over ad hoc browser tooling.
