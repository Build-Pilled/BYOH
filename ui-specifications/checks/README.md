# Checks

Five checks tell the setup agent that its build matches this folder. They are
exact procedures with thresholds; a later kit command runs them, and an agent
may run them by hand with any browser driver until then. Each run writes JSON
and PNG evidence into one directory per run. The suite stays the only pass or
fail authority for behaviour; these checks decide only look and layout.

| Check | Question | When |
| --- | --- | --- |
| [C1](c1-layer-purity.md) | Does the look file touch only paint? | Every look, before building |
| [C2](c2-look-swap.md) | Do boxes stay where they are when the look changes? | Every look, in the build |
| [C3](c3-reference-match.md) | Does the build match the frames and layout values? | Once per build, with Instrument tokens |
| [C4](c4-contrast.md) | Is every rendered text pair legible, and are states distinct? | Every look, both modes |
| [C5](c5-leaks-marks-motion.md) | No default-look leaks, distinct marks, reduced motion respected | Every look |

## Completion rule

Setup is not done until every page of the built app passes. The setup agent:

1. Screenshots each of its own pages at pack size (a 1280 x 795 window at
   scale 2, the same fixture states as the frames) and compares each one with
   its frame and with `layout/layout.json` and the look's tokens.
2. Requires layout within about 2 px, and colours and fonts exact for the chosen
   look. For the default look that means C3 against the frames. For any other
   look, that means C2, the look-swap invariance check, in addition: the same
   page painted in the chosen look and in Instrument has identical layout.
3. Fixes every mismatch and runs again.
4. Shows the person the result: the screenshots with the pass or fail of each
   page.

A page that fails blocks completion; the agent does not report setup done.

## Evidence

One directory per run, named with the date and time, holding `result.json`
(check, page, state, mode, measured, threshold, pass), the screenshots as
PNG, and the measurement files as JSON. The same directory layout serves every
check.

## Common set-up

- Window 1280 x 795 CSS px, device scale 2, fonts loaded from the app's own
  assets, animations paused at their end state, the fixture of
  `layout/fixture.md` staged.
- Element roles: every element named in `layout/layout.json` carries a
  `data-role` attribute with that name. The attribute changes nothing in the
  accessibility tree.
- Masked regions: timestamps, ages, and any text produced by the clock.
