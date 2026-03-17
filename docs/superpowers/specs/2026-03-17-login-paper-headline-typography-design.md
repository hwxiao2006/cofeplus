# Login Paper Headline Typography Design

## Goal

Fix the left-stage headline on `login-paper.html` so it reads like an intentional Chinese editorial title instead of an automatically squeezed multiline block.

## Problem

The current paper concept uses a narrow text column, a very large headline size, a sub-1.0 line height, and aggressive negative letter spacing. That combination works poorly for Chinese copy and creates awkward rhythm:

- the line breaks feel accidental rather than authored
- the headline block looks compressed instead of composed
- the large display type fights the paper-editorial tone rather than supporting it

## Approved Direction

Use an authored three-line headline with a stronger editorial cadence:

1. `把门店现场，`
2. `印进更有记忆点的`
3. `登录纸卡。`

Keep the warm paper concept, the overall page structure, and the right-side login card unchanged.

## Design Decisions

### Headline structure

- Replace the single text node in the stage `h2` with three block lines.
- Keep the same message, but allow light copy editing to improve Chinese rhythm.
- The final line should feel like a clean landing point, not a forced remainder.

### Typography

- Reduce the effective headline size slightly from the current oversized treatment.
- Increase line height so stacked Chinese lines breathe.
- Relax negative letter spacing to near-neutral values that suit Chinese characters.
- Slightly widen the available headline measure so the middle line can carry the long phrase cleanly.

### Responsiveness

- Preserve the current mobile layout pattern.
- Keep the authored line treatment on desktop.
- Allow the smaller mobile heading to stay simple and readable without introducing new decorative behavior.

## Scope

In scope:

- `login-paper.html` headline markup
- `login-paper.html` related CSS for the stage headline block
- one regression test covering the authored multiline headline structure and typography hooks

Out of scope:

- changes to the other login concepts
- changes to login behavior or session handling
- changes to the right-side form layout
