# Single Paper Login Entry Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `login-paper.html` the only login page and route the default site entry directly to it.

**Architecture:** Keep the existing static HTML structure but collapse the multi-concept entry into a single paper-login path. Update tests first to expect one login page, then remove unused files and repoint the index redirect.

**Tech Stack:** Static HTML, inline CSS, inline vanilla JavaScript, Node.js built-in test runner, regex-based HTML assertions, `vm`-based runtime tests.

---

## File Structure

- Modify: `/Users/mac/.config/superpowers/worktrees/New project 4/login-gallery-concepts/index.html`
  Responsibility: redirect the default entry straight to `login-paper.html`.
- Delete: `/Users/mac/.config/superpowers/worktrees/New project 4/login-gallery-concepts/login-gallery.html`
  Responsibility: remove the obsolete login comparison page.
- Delete: `/Users/mac/.config/superpowers/worktrees/New project 4/login-gallery-concepts/login-morning.html`
  Responsibility: remove the obsolete morning login concept.
- Delete: `/Users/mac/.config/superpowers/worktrees/New project 4/login-gallery-concepts/login-counter.html`
  Responsibility: remove the obsolete counter login concept.
- Modify: `/Users/mac/.config/superpowers/worktrees/New project 4/login-gallery-concepts/tests/login-gallery.entry.test.js`
  Responsibility: verify direct paper entry and absence of the removed login pages.
- Modify: `/Users/mac/.config/superpowers/worktrees/New project 4/login-gallery-concepts/tests/login-pages.structure.test.js`
  Responsibility: verify the remaining `login-paper.html` structure and defaults only.
- Modify: `/Users/mac/.config/superpowers/worktrees/New project 4/login-gallery-concepts/tests/login-pages.runtime.test.js`
  Responsibility: verify the remaining `login-paper.html` runtime behavior only.
- Modify: `/Users/mac/.config/superpowers/worktrees/New project 4/login-gallery-concepts/tests/pages.font-stack.test.js`
  Responsibility: keep the shared font regression aligned with the remaining page set.

## Chunk 1: Turn The Tests Red For Single-Page Login

### Task 1: Replace Multi-Concept Expectations

**Files:**
- Modify: `/Users/mac/.config/superpowers/worktrees/New project 4/login-gallery-concepts/tests/login-gallery.entry.test.js`
- Modify: `/Users/mac/.config/superpowers/worktrees/New project 4/login-gallery-concepts/tests/login-pages.structure.test.js`
- Modify: `/Users/mac/.config/superpowers/worktrees/New project 4/login-gallery-concepts/tests/login-pages.runtime.test.js`
- Modify: `/Users/mac/.config/superpowers/worktrees/New project 4/login-gallery-concepts/tests/pages.font-stack.test.js`

- [ ] **Step 1: Rewrite the entry test for direct paper redirect and removed files**

- [ ] **Step 2: Narrow the structure/runtime tests to `login-paper.html` only**

- [ ] **Step 3: Remove deleted login pages from the font-stack regression**

- [ ] **Step 4: Run the targeted tests to verify they fail**

Run:

```bash
node --test tests/login-gallery.entry.test.js tests/login-pages.structure.test.js tests/login-pages.runtime.test.js tests/pages.font-stack.test.js
```

Expected: FAIL because `index.html` still redirects to the gallery and the obsolete login pages still exist.

## Chunk 2: Remove The Extra Login Surfaces

### Task 2: Repoint Entry And Delete Unused Pages

**Files:**
- Modify: `/Users/mac/.config/superpowers/worktrees/New project 4/login-gallery-concepts/index.html`
- Delete: `/Users/mac/.config/superpowers/worktrees/New project 4/login-gallery-concepts/login-gallery.html`
- Delete: `/Users/mac/.config/superpowers/worktrees/New project 4/login-gallery-concepts/login-morning.html`
- Delete: `/Users/mac/.config/superpowers/worktrees/New project 4/login-gallery-concepts/login-counter.html`

- [ ] **Step 1: Change `index.html` to redirect to `login-paper.html`**

- [ ] **Step 2: Delete the gallery, morning, and counter login pages**

- [ ] **Step 3: Re-run the targeted tests**

Run:

```bash
node --test tests/login-gallery.entry.test.js tests/login-pages.structure.test.js tests/login-pages.runtime.test.js tests/pages.font-stack.test.js
```

Expected: PASS

- [ ] **Step 4: Re-run the broader login verification**

Run:

```bash
node --test tests/login-paper.headline.test.js tests/overview.sidebar-login.test.js tests/sidebar.shared-login.test.js
```

Expected: PASS
