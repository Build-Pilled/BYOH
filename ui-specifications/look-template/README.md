# Look template

The empty token skeleton for a new look. A look is a complete token set: copy
`tokens.json`, fill every token for both modes, and add the fonts, motion
and mark-style values. The shipped Lab, Dusk and Paper sets are complete examples. A look supplies tokens only; it never restyles a
component and never touches a size, spacing, display, position or text case.

Files:

- `tokens.json`: every token name of `look/instrument/tokens.json`, with the
  group, the allowed range, and empty values.
- `derivation.md`: how to derive the surface ladder, text steps, rules, status,
  callout and mark colours from a ground, an accent and a hue family.
- `ranges.md`: the allowed range of each group.

Steps:

1. Choose a ground colour for each mode and an accent with its ink.
2. Derive a per-look ladder using the starting points in `derivation.md`.
3. Choose a status hue family and a callout hue family; derive bar, edge,
   background and ink for each kind.
4. Choose fonts (open licence, bundled with their licence text), motion
   (none, functional or alive), and the mark-style block.
5. Render the look, then run the checks in `checks/`.

## Parameter blocks

The filled Lab, Dusk and Paper files define every block in the skeleton:

- `fonts`: body, label and code stacks; optional ui, person and data stacks;
  metric overrides, weights within the fixed role classes, tracking and
  OpenType features. Sizes, line heights and text case are layout, not fonts.
- `radius`: `control`, `card`, `callout`, in CSS px, 0–16.
- `ruleStrength`: inset widths `region`, `control`, `card`; `calloutEdge` alpha;
  `glow` and `personShadow` strength; `composerAccent` inset width and
  `primaryTexture` (0–1). These never set a border width or change a rectangle.
- `motion`: preset, duration scale, hover/arrival durations in ms, easing and
  press scale. None has zero durations; alive adds working-state mark motion.
- `markStyle`: shape, drawing gap and cell radius at 32 px, tile radius, nine
  palette token names, multi/single ink (the single ink is a token name), idle
  and working presets and duration in ms. All drawing scales inside the box.

A look's `description` supplies optional choice-page captions; it is not app
wording or a substitute for complete tokens. Instrument's existing file is
colour-only; its documented font/mark defaults are adapted by the shared page
loader without changing any default colour value.
