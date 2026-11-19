# Marks

A bot's mark is its identity picture. Two parts, kept apart: **geometry**, which
is fixed for every look, and **drawing**, which is the look's.

## Geometry (fixed)

- The mark seed decides which mark a bot has, deterministically, and nothing a
  look does changes that ([bots](../../../spec/bots.md) R5). The same seed gives
  the same cells in every look.
- A mark is a square tile on a **6 x 6 grid of equal square cells** with no gap
  between cells. It is drawn in one of these boxes: 32 x 32 (sidebar rows,
  header, most lists), 28 x 28, 20 x 20 (small rows) and 88 x 88 (the identity
  section of the configuration panel, over the `Reroll mark` button).
- Coloured areas are whole cells joined into a few blocks of two to five cells;
  every other cell is empty ground. One mark uses two or three colours from the
  nine-colour palette.
- The box never changes size, never gains padding and never overlaps its
  neighbours. Marks of different bots must stay distinct (the check C5 renders
  many seeds and requires a minimum pixel difference between every pair).
- The 88 box cell is about 14.7 px. Frame F13 shows an 88 mark and the 32 mark
  sits on every bot row of every frame.

## Drawing (Instrument, swappable)

- Tile ground: token `mark-ground`, with a corner radius of about 16 percent of
  the side (about 14 px at 88, about 5 px at 32).
- Thin grid lines between cells in `mark-ground-grid` (1 px at 88, hairline
  at 32), with a dot where lines cross in the 88 size.
- Cells filled with palette colours `mark-1` to `mark-9`, square, no rounding,
  no outline.
- No animation: idle and working are both none. Motion in a mark's own style
  (for another look) is limited to transform and opacity, respects reduced
  motion, and stays inside the same box.

## Parameters a look may set

`cellShape` (square, rounded, circle), `gap` (0 or small), `radius`, `palette`
(nine colours), `ink` (multi or single), `idle` and `working` (none, breath,
pulse) and `duration`. Parameters, not code: a look supplies no drawing
function, and no mark is built from a path chosen at run time.
