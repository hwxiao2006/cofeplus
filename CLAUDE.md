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
- `devices.html` - Device management and monitoring
- `orders.html` - Order history and tracking
- `materials.html` - Inventory management
- `faults.html` - Fault records and maintenance
- `customers.html` - Customer management
- `locations.html` - Location management
- `staff-management.html` - Staff administration
- `device-entry.html` - Device registration

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

## Development Workflow

**No build step**: Open HTML files directly in browser. Changes are immediately visible on refresh.

**Design source**: Figma exports are in `figma-paste/` directory for reference.

**Planning**: Design and implementation plans are stored in `docs/plans/` with date-prefixed filenames.

**Commit conventions:**
- Use descriptive commit messages in English
- Reference plan files in commits when implementing planned features
- Example: `feat: support location-name device search across pages`

## Code Conventions

**CSS:**
- Use CSS custom properties for colors and spacing
- Mobile-first responsive design
- Consistent sidebar width: 240px
- Common breakpoint: `@media (max-width: 768px)`

**JavaScript:**
- Vanilla JS, no frameworks
- Global variables for page state
- Functions defined in global scope
- Use `localStorage.getItem/setItem` for persistence
- Deterministic mock data generation using device IDs as seeds

**HTML:**
- Semantic markup
- Chinese language content (`lang="zh-CN"`)
- Inline styles and scripts (no external files)
- Consistent sidebar structure across pages

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
