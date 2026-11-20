# C2 Look-swap invariance

**Question.** Does changing the look leave every box where it was?

**Procedure.**

1. In one build, drive every fixture state of the frames (`frames/index.md`),
   in both modes, twice: once with Instrument tokens and once with the chosen
   look. For a look being tested against itself there is nothing to do.
2. In each state, for every element the plan's role/name mapping names (see the
   README's Mapping section), record
   `getBoundingClientRect()` (x, y, width, height) and the computed font-size,
   line-height, padding, margin, row and column gap, border widths, display.
3. Record the accessibility tree snapshot and hash it.
4. Compare the two runs per role, using the class in `layout/layout.json`:

| Class | Pass when |
| --- | --- |
| `fixed` | each rectangle value equal within 0.5 px |
| `intrinsic-width` | height equal within 0.5 px; width within 8 px or 4 percent, whichever is larger; text clipped in neither run or in both |
| `flow` | no overflow and no overlap in either run; line height unchanged; wrapped height may differ only by whole lines |

**Also pass when all hold:** every computed property named in step 2 is equal
for every role; the two accessibility hashes are equal; no element, text or
control exists in one run and not the other.

Decorative descendants inside an aria-hidden SVG may change with the icon
family or mark renderer; compare the outer SVG box, not its internal artwork.
Mark identity and cell geometry remain covered by C5.

No reference screenshot is needed. It holds whenever the look touches only paint.
