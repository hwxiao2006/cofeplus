# Login Paper Headline Typography Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adjust the `login-paper.html` left-stage title so the Chinese headline uses authored editorial line breaks and calmer typography.

**Architecture:** Keep the existing single-file static HTML structure. Add a small regression test first, then update only the paper login page's headline markup and the CSS that controls its width and type rhythm.

**Tech Stack:** Static HTML, inline CSS, Node.js built-in test runner, regex-based HTML assertions.

---

## File Structure

- Create: `/Users/mac/.config/superpowers/worktrees/New project 4/login-gallery-concepts/tests/login-paper.headline.test.js`
  Responsibility: verify the paper login page exposes authored multiline headline markup and tuned typography hooks.
- Modify: `/Users/mac/.config/superpowers/worktrees/New project 4/login-gallery-concepts/login-paper.html`
  Responsibility: render the approved three-line headline and update the stage typography.

## Chunk 1: Paper Headline Regression

### Task 1: Write And Prove A Failing Regression Test

**Files:**
- Create: `/Users/mac/.config/superpowers/worktrees/New project 4/login-gallery-concepts/tests/login-paper.headline.test.js`

- [ ] **Step 1: Write the failing test**

Assert that `login-paper.html` contains:

- a `.stage-title-line` hook used three times inside the stage `h2`
- the approved three headline lines
- a wider stage-body max width than the previous `380px`
- calmer headline rhythm hooks instead of the current compressed combination

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/login-paper.headline.test.js`

Expected: FAIL because `login-paper.html` still has one unstructured headline string and the old compact typography.

## Chunk 2: Minimal HTML/CSS Fix

### Task 2: Implement The Approved Paper Title

**Files:**
- Modify: `/Users/mac/.config/superpowers/worktrees/New project 4/login-gallery-concepts/login-paper.html`

- [ ] **Step 1: Replace the single-line heading text with three block lines**

- [ ] **Step 2: Tune the stage title CSS**

Change only the CSS needed to support the new title:

- widen the `.stage-body` measure
- reduce headline size slightly
- raise line height
- relax letter spacing
- keep the mobile treatment compact

- [ ] **Step 3: Run the targeted regression tests**

Run:

```bash
node --test tests/login-paper.headline.test.js tests/login-pages.structure.test.js
```

Expected: PASS

- [ ] **Step 4: Run the broader login-page tests**

Run:

```bash
node --test tests/login-pages.runtime.test.js tests/pages.font-stack.test.js
```

Expected: PASS
