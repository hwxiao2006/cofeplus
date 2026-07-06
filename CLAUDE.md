# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

COFE+ is a Chinese-language operations console for managing coffee vending machines. It's a static HTML prototype with vanilla JavaScript, featuring multi-device management, menu configuration, order tracking, and operational analytics.

## Architecture

**Single-file HTML pages**: Each page is a self-contained HTML file with embedded CSS and JavaScript. No build system, no bundler, no external dependencies.

**Key pages:**
- `overview.html` - Dashboard with sales analytics and device metrics
- `menu.html` - Product browsing interface for customers
- `menu-management.html` - Admin interface for managing products and categories
- `product-detail.html` - Product editing interface
- `product-management.html` - Product management listing
- `devices.html` - Device management and monitoring
- `device-entry.html` - Device registration
- `orders.html` - Order history and tracking
- `materials.html` - Inventory management
- `materials-orders.html` - Materials order tracking
- `materials-refill.html` - Materials refill workflow
- `faults.html` - Fault records and maintenance
- `customers.html` - Customer management
- `locations.html` - Location management
- `staff-management.html` - Staff administration
- `login-paper.html` - Login page
- `index.html` - Entry point / redirect

**Shared patterns:**
- Sidebar navigation with `.sidebar` class, consistent across all admin pages
- Mock data generated using device-specific seeds for deterministic results
- `localStorage` for persisting state (device selection, language preferences, filters)
- Responsive design with mobile-first breakpoints
- CSS custom properties for theming (defined in `:root`)

**State management:**
- `currentDevice` - Currently selected device ID
- `deviceConfig` - Per-device language and currency configuration
- `adminSidebarLang` - Admin interface language (zh/en)
- `platformLang` - Menu product language (separate from admin UI)
- Various page-specific filters and search states stored in localStorage

**Translation system:**
- Admin sidebar has its own translation layer (`ADMIN_SIDEBAR_TRANSLATIONS`)
- Menu management has separate product language system (`platformLang`)
- Both systems coexist independently

## Testing

**Test framework:** Node.js built-in test runner (`node --test`)

**Test patterns:**
- Regex-based static analysis tests (verify markup/script structure exists)
- VM-based runtime tests (execute extracted JavaScript in isolated context)
- Tests live in `tests/*.test.js`

**Running tests:**
```bash
# Run all tests
node --test tests/

# Run specific test file
node --test tests/menu-management.behavior.test.js

# Run multiple specific tests
node --test tests/sidebar.admin-lang.test.js tests/sidebar.admin-lang.runtime.test.js
```

**Test structure:**
- Static tests use regex to verify HTML structure and script presence
- Runtime tests extract `<script>` blocks, replace `let` with `globalThis.`, and execute in VM context
- Mock DOM objects (document, localStorage, window) are provided as needed

## Deployment

**Live site:** https://cofeplus.pages.dev

Hosted on **Cloudflare Pages**, connected to this repo's GitHub `main` branch. Pushing or merging to `main` automatically triggers a build and deploy — no manual step needed (typical build ~1-2 min). The entire repo root is served as static assets.

To verify a release, open https://cofeplus.pages.dev with gstack `/browse` after the build finishes.

**PRD custom domain:** https://prd.cofeplus.dpdns.org is a separate Cloudflare Pages direct-upload project named `cofeplus-prd`. It serves the ignored `prd-site/` bundle, not the tracked `tasks/` files directly. Do not assume a GitHub `main` push has updated the PRD domain.

**WARNING — deploys REPLACE the whole site.** `wrangler pages deploy` swaps in the uploaded bundle wholesale: any PRD missing from `prd-site/` 404s after deploy. Never hand-copy one or two files into a fresh `prd-site/`. Always rebuild the full bundle with `scripts/deploy_prd_pages.sh` (copies ALL `tasks/prd-*.html`/`.md`, `tasks/screenshots/`, referenced `screenshots/*-prd` dirs, and the tracked landing page `scripts/prd_site_index.html`, then verifies every index link and screenshot reference resolves before deploying). When adding a new PRD to the site, add its link to `scripts/prd_site_index.html`. Manual deploy after building: `npx wrangler pages deploy prd-site --project-name cofeplus-prd --branch main --commit-dirty=true`, then verify the custom-domain URL.

```bash
# Manual deploy (legacy fallback only; normal flow is auto-deploy from main)
npx wrangler deploy
```

## Project Structure

- `shared/admin-mock-data.js` - Shared mock data generation utilities used across pages
- `shared/business-tag-library.js` - Business tag management library
- `shared/device-latte-art-library.js` - Device latte art pattern library
- `shared/admin-staff-access.js` - Staff access control and merchant tenant isolation
- `shared/fault-library.js` - Mock fault records with handling steps (30 entries)
- `shared/tag-group-i18n.js` - Tag group name internationalization per device
- `designs/` - Design files (`.pen` and `.svg` previews)
- `docs/plans/` - Date-prefixed implementation and design plans (e.g. `2026-03-01-feature-name.md`)
- `docs/superpowers/plans/` and `docs/superpowers/specs/` - Detailed feature specs and plans
- `tasks/` - PRD documents (both `.md` and `.html` formats)
- `figma-paste/` - Figma export HTML files for design reference
- `scripts/` - Utility scripts (e.g. screenshot generators)
- `test-results/` - Test execution results
- `screenshots/` - UI screenshots

## Development Workflow

**No build step**: Open HTML files directly in browser. Changes are immediately visible on refresh.

**Local dev server (with no-cache headers):**
```bash
python3 scripts/no_cache_http_server.py --port 8080
```

**Commit conventions:**
- Use descriptive commit messages in English
- Reference plan files in commits when implementing planned features
- Example: `feat: support location-name device search across pages`

## Code Conventions

**CSS:**
- CSS custom properties for theming: `--primary: #4ECDC4`, `--danger: #ff6b6b`, `--warning: #ffa502`, `--success: #2ed573`
- Sidebar background: `#0b132b`
- Consistent sidebar width: 240px
- Responsive breakpoints: desktop 1025px+, tablet 768px-1024px, mobile <768px

**JavaScript:**
- Vanilla JS, no frameworks
- Global variables for page state
- Use `localStorage.getItem/setItem` for persistence
- Deterministic mock data generation using device IDs as seeds

**HTML:**
- Chinese language content (`lang="zh-CN"`)
- Inline styles and scripts, with shared JS loaded from `shared/` directory
- Consistent sidebar structure across all admin pages

## Key Implementation Details

**Device language config:**
- Each device has a language configuration stored in localStorage
- Key: `deviceLanguageConfig_${deviceId}`
- Structure: `{ zh: {...}, en: {...} }` with product translations
- New devices get initialized with default config on first access

**Admin sidebar language:**
- Separate from product language system
- Stored in localStorage as `adminSidebarLang`
- Translates only navigation and UI chrome, not content
- Switch UI appears below login block in sidebar

**Mock data generation:**
- Uses device ID as seed for deterministic randomness
- Functions like `getStableDeviceSeed()`, `shiftHourlySeries()`, `normalizeShareItems()`
- Ensures consistent data across page refreshes for same device

**Merchant tenant isolation:**
- Non-admin users are scoped to their merchant via `admin-staff-access.js`
- Login sessions stored in localStorage with merchant context
- Admin users see all merchants; regular staff see only their own
- Affects sidebar visibility and data filtering across pages

**Search and filtering:**
- Search states persisted to localStorage with page-specific keys
- Device search supports location name matching across pages
- Filter states restored on page load

## Common Tasks

When adding new features:
1. Check if similar patterns exist in other pages
2. Maintain consistency with existing sidebar structure
3. Add tests following existing test patterns
4. Update relevant plan documents if working from a plan

When fixing bugs:
1. Check if the issue affects multiple pages (shared patterns)
2. Verify localStorage state isn't causing issues
3. Test with different device IDs for mock data consistency

When modifying tests:
1. Run affected tests immediately after changes
2. Check both static and runtime test variants if both exist
3. Verify test isolation (no cross-test state pollution)

## gstack

This repo vendors `gstack` at `.claude/skills/gstack` for teammates, and exposes project-local Codex skill entry points under `.agents/skills/`.

Use gstack `/browse` for all web browsing and visual QA in this repo. Never use `mcp__claude-in-chrome__*` tools.

Available skills:
- `/autoplan`
- `/benchmark`
- `/office-hours`
- `/plan-ceo-review`
- `/plan-eng-review`
- `/plan-design-review`
- `/canary`
- `/design-consultation`
- `/cso`
- `/review`
- `/ship`
- `/land-and-deploy`
- `/browse`
- `/qa`
- `/qa-only`
- `/design-review`
- `/setup-browser-cookies`
- `/setup-deploy`
- `/retro`
- `/investigate`
- `/document-release`
- `/codex`
- `/careful`
- `/freeze`
- `/guard`
- `/unfreeze`
- `/gstack-upgrade`

If gstack skills are missing or not working:
- Claude: `cd .claude/skills/gstack && ./setup`
- Codex: `cd .claude/skills/gstack && ./setup --host codex`

These setup commands rebuild the local browser binary if needed and refresh the skill registration links.
