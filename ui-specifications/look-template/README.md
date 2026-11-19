# Look template

The empty token skeleton for a new look. A look is a complete token set: copy
`tokens.json`, fill every token for both modes, and add the fonts, motion
and mark-style values. A look supplies tokens only; it never restyles a
component and never touches a size, spacing, display, position or text case.

Files:

- `tokens.json`: every token name of `look/instrument/tokens.json`, with the
  group, the allowed range, and empty values.
- `derivation.md`: how to derive the surface ladder, text steps, rules, status,
  callout and mark colours from a ground, an accent and a hue family.
- `ranges.md`: the allowed range of each group.

Steps:

1. Choose a ground colour for each mode and an accent with its ink.
2. Derive the ladder by the recipe in `derivation.md`.
3. Choose a status hue family and a callout hue family; derive bar, edge,
   background and ink for each kind.
4. Choose fonts (open licence, bundled with their licence text), motion
   (none, functional or alive), and the mark-style block.
5. Render the look, then run the checks in `checks/`.
