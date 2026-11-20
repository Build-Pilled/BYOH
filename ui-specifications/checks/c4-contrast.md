# C4 Contrast and floors

**Question.** Is every text legible, and are states told apart?

**Procedure.**

1. Pair check from tokens, in each mode: `text`, `text-muted` and `text-faint`
   against `display` and `chassis`; `link` against `display`; `on-accent`
   against `accent`; every callout ink against its background; `annotation-ink`
   against each annotation slot.
2. Rendered check: in every fixture state and both modes, for every text node
   find its effective foreground (including alpha over what is behind it) and
   its effective background (the nearest painted surface, including the ladder
   step), and compute the contrast ratio.
3. Distinctness: compute pairwise colour difference (CIE76 delta E) between the
   four status colours, the five callout bars, and the nine mark colours.

**Thresholds.**

| Measure | Pass when |
| --- | --- |
| `text` and `text-muted` on `display` and `chassis` | at least 4.5:1 |
| `link` on `display` | at least 4.5:1 |
| Every rendered text node other than faint text, at any size and weight | at least 4.5:1 |
| Every rendered faint text node, at any size and weight | at least 3:1, except the exact Instrument-only pairs below |
| Status colours | every pair at least 20 delta E apart in both modes |
| Callout bars | every pair at least 20 delta E apart, except the Instrument-only pair below |
| Callouts and status | callout labels are visible; status words are in accessible names, not visible lamp captions (colour is never the only signal) |

## Instrument-only faint exceptions

Instrument stays exact. The following measured faint-text pairs are retained
only for Instrument, on the named surfaces. An exception matches the mode,
foreground, effective background and surface together, not a token name alone.
Every other Instrument pair still meets the thresholds above. Every other look,
including a user-invented look, must reach 3:1 for all faint text and 4.5:1 for
all other text, with no exceptions. Ratios below are rounded to three decimals;
alpha backgrounds are composited in sRGB before calculating luminance.

| Name | Mode | Foreground | Effective background | Ratio | Surface | Frame or frame's text-only variation |
| --- | --- | --- | --- | --- | --- | --- |
| Selected-row age | Dark | `#6c6c6c` | `#2a2a2a` (`surface-raised`) | 2.733:1 | Selected bot and session rows, including the selected session in the finder | F35 sidebar; F41 finder |
| Raised-control detail | Dark | `#6c6c6c` | `#2a2a2a` (`surface-raised`) | 2.733:1 | All sessions count, model thinking suffix, Worked step count | F35 header; F33 and F34 Worked chip |
| Selected-task time | Dark | `#6c6c6c` | `#262626` (`surface-task-selected`) | 2.882:1 | Selected task row's faint time and empty-value cells | F05 |
| Chassis detail | Light | `#777777` | `#cfd0d2` (`chassis` or `surface-dialog`) | 2.901:1 | Unselected sidebar ages and folder counts, sidebar hints, page-header counts, find count, team-column counts, task-table column labels | Light values for F35 sidebar, F04/F07 headers, F11 find bar, F07/F08 columns and F04 table |
| Hovered-sidebar age | Light | `#777777` | `rgb(198.2 199.2 201.2)`; `surface-row-hover` (`rgb(191 192 194 / 0.55)`) over `chassis` | 2.653:1 | Hovered sidebar session row's age | F03 sidebar archetype, hovered-session variation described in the sheets; no separate frame |

Light mode has value records, not screenshots. A frame named in a light row
identifies the corresponding state, not an additional light picture. These
exceptions do not extend to disabled-control glyphs, other colours or surfaces,
or a new low-contrast pair discovered during a build.

## Instrument-only bar exception

Instrument's exact shipped tokens give the `callout-important-bar` and
`callout-warning-bar` pair a CIE76 delta E of 19.09059333594837, in both dark
and light modes. That one pair, with those exact Instrument token values, is
retained as a named exception to the 20 delta E threshold. Every other pair in
Instrument, and every pair in every other look, including a user-invented look,
must reach 20.

For text on gradient strips or frosted layers, retain the effective-background
PNG: the driver transiently masks only that element's text ink (not colour or
layout), captures its background and restores the inspector stylesheet in
finally. Use the minimum contrast over its text rectangles. Filters and blend
modes remain explicit unsupported failures, never automatic passes.
