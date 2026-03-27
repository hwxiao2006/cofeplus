# COFEPLUS Login Gallery Design

## Goal

Add a new high-fidelity login entry experience for COFEPLUS with three distinct visual directions that can be compared side by side, while keeping the login behavior itself minimal and consistent.

## Scope

This design covers:

- a new gallery entry page that compares three login concepts
- three standalone login pages with shared behavior and different visual treatments
- a lightweight prototype login flow that stores a local session and enters `overview.html`
- desktop and mobile layouts for all new pages

This design does not cover:

- real backend authentication
- account recovery, SMS verification, QR login, or customer support flows
- changes to the admin pages beyond reading the existing sidebar login profile

## Product Intent

The login experience should feel like the front door to a premium coffee operations platform, not a generic SaaS form and not a marketing homepage. The user selected:

- independent first-screen login page
- high-fidelity visual treatment
- coffee lifestyle tone
- account-and-password login
- pure backend login goal
- minimal form fields only
- desktop and mobile with equal visual care

## Deliverables

- `login-gallery.html`
- `login-morning.html`
- `login-counter.html`
- `login-paper.html`
- updated `index.html` entry redirect
- login-focused tests covering entry routing, page structure, shared behavior, and responsive hooks

## Entry Flow

1. Opening `index.html` redirects to `login-gallery.html`.
2. `login-gallery.html` presents the three login concepts with direct links into each page.
3. Each login page supports local validation for account and password.
4. A successful login writes a lightweight local session and sidebar profile data.
5. The page then redirects to `overview.html`.

The gallery remains accessible even if a session already exists so the user can continue comparing concepts.

## Information Architecture

### `login-gallery.html`

Purpose:
- comparison hub for all three concepts
- first-stop page after opening the prototype

Structure:
- page header with `COFE+` brand and one-line explanation
- three concept cards with preview styling, theme summary, and CTA
- optional compact status chip if a local session already exists

### Standalone login pages

Each login page shares the same information structure:

- brand block
- page title
- single supporting sentence
- account field
- password field
- inline validation region
- primary login button
- optional compact current-session hint when a prior session exists

The pages should not add secondary actions such as remember-me, forgot-password, QR login, or support contact.

## Shared Functional Behavior

### Validation

All three pages use the same validation rules:

- empty account: show `请输入账号`
- empty password: show `请输入密码`
- if both are present: continue to loading state

The prototype may also support a generic invalid-credential state, but it should not block the main prototype path by default. The main interaction should allow entering the console after non-empty values.

### Loading and success

On submit:

- disable the button
- change button text to `登录中...`
- keep the loading state visible for roughly 800ms
- write a new local session
- write the sidebar login profile
- redirect to `overview.html`

### Local storage

Add one new key:

- `cofeLoginSession`

Suggested value shape:

```json
{
  "account": "输入的账号",
  "theme": "morning",
  "loggedInAt": "2026-03-16T10:00:00.000Z"
}
```

Reuse the existing key already read by admin pages:

- `sidebarLoginProfile`

Suggested written value shape:

```json
{
  "name": "输入的账号",
  "phone": "登录账号"
}
```

The login pages should not depend on a real phone number. For this prototype, the account string can be mirrored into the sidebar profile so the backend pages visibly reflect the just-entered identity.

## Visual Direction

All pages should preserve COFEPLUS brand continuity through logo use, system font stack, restrained text density, and polished layout spacing, while intentionally making each concept feel different enough for side-by-side review.

### Concept A: `login-morning.html`

Theme:
- morning cafe atmosphere
- warm, soft, calm, premium

Desktop:
- wide two-column split
- left side as an atmospheric stage with creamy gradients, warm highlights, steam-like shapes, and subtle table-surface depth
- right side as a light login card with soft glass or cream-panel feel

Mobile:
- stacked vertical layout
- atmospheric header area first
- login card follows immediately below and remains visually grounded

Palette:
- milk foam, oat, caramel, espresso brown

Interaction tone:
- focus rings in warm caramel
- button in espresso brown with slightly deeper hover state

### Concept B: `login-counter.html`

Theme:
- night bar counter
- dark, composed, premium, operational

Desktop:
- immersive dark layout with controlled highlights
- atmospheric panel uses bar-light reflections and metallic depth rather than literal photography
- login surface appears like a floating operator console

Mobile:
- compress the dramatic background into top lighting and texture
- keep the form dominant and readable

Palette:
- dark roast, charcoal, smoke blue, amber copper

Interaction tone:
- focus rings in amber copper
- button feels denser and more metallic

### Concept C: `login-paper.html`

Theme:
- handcrafted menu paper
- tactile, editorial, distinctive, warm

Desktop:
- centered paper-card composition over a subtly textured table-like background
- thin borders, embossed framing, and understated print-like hierarchy

Mobile:
- paper-card becomes the main canvas
- background texture remains light so the form stays efficient

Palette:
- oat paper, cinnamon, deep coffee, cream white

Interaction tone:
- sharper line-based emphasis
- button reads like a stamped label rather than a glossy CTA

## Typography and Copy

Use the existing system font stack already enforced in repository tests:

`-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`

Shared copy:

- brand: `COFE+`
- product label: `运营控制台`
- title: `欢迎登录`
- field labels: `账号`, `密码`
- placeholders: `请输入运营账号`, `请输入登录密码`
- primary button: `进入控制台`

Concept-specific supporting lines:

- Morning: `开始今天的门店运营与设备巡检`
- Counter: `进入运营后台，查看设备、订单与门店状态`
- Paper: `连接每日出杯现场，进入运营工作台`

## Motion and Feedback

Motion should be minimal and intentional:

- card fade-and-rise on page load
- background highlight drift or light shimmer only when it reinforces the concept
- button hover lift limited to a few pixels
- no looping decorative motion that distracts from the form

## Responsive Rules

All four new pages must support both desktop and mobile intentionally, not via accidental shrinkage.

Desktop expectations:

- strong concept framing
- spacious composition
- clear separation between atmosphere and action

Mobile expectations:

- no clipped or hidden fields
- button remains fully visible above safe-area bottom padding
- keyboard interaction does not visually trap the user
- concept identity survives even after layout stacks vertically

Use a mobile breakpoint aligned with the rest of the repo, typically `@media (max-width: 768px)`.

## Implementation Boundaries

The repository uses self-contained HTML files with inline CSS and JavaScript. The new pages should follow that pattern.

Recommended script responsibilities per login page:

- read existing session state
- bind form submit handling
- validate fields
- render field-level error text
- manage loading state
- write `cofeLoginSession`
- write `sidebarLoginProfile`
- redirect to `overview.html`

The three login pages should share behavior but do not need a separate shared JavaScript file; keeping each page self-contained matches the current codebase conventions.

## Testing Strategy

Add login-page tests that verify:

- `index.html` redirects to `login-gallery.html`
- `login-gallery.html` exposes all three concept links
- each login page contains brand, title, account field, password field, and login button
- each login page contains validation logic for empty account and empty password
- each login page writes `cofeLoginSession`
- each login page writes `sidebarLoginProfile`
- each login page redirects to `overview.html`
- each login page defines a mobile breakpoint and layout hooks for responsive behavior

Static regex assertions are sufficient for structure checks. VM-based runtime tests are appropriate for submit logic and localStorage writes.

## Acceptance Criteria

- Opening the prototype lands on the gallery instead of the overview page.
- The gallery clearly presents three separate login concepts.
- Each concept page feels visually distinct and high fidelity.
- Each concept page keeps the same minimal login workflow.
- A successful prototype login enters `overview.html`.
- The sidebar login profile in the admin pages reflects the account entered on the login page.
- Desktop and mobile versions of each concept remain polished and usable.
