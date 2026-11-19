# C5 Leaks, marks and motion

**Question.** Does a non-default look carry nothing of the default, keep marks
distinct and respect reduced motion?

**Procedure and pass conditions.**

1. **Leak scan.** Scan the built CSS and the built page for the Instrument-only
   literals: the accent, the link colour, the badge colour, the on-accent ink,
   the nine mark colours and the island fills (read their values from
   `look/instrument/tokens.json`). Pass when none appears unless the chosen
   look's own token file contains the same literal.
2. **Mark distinctness.** Render marks at 88 x 88 for 200 seeds with the chosen
   look. Count a pixel as different when the two colours differ by more than 8
   in any channel. Pass when every pair of marks differs in at least 12 percent
   of the tile's pixels.
3. **Mark geometry.** Pass when each mark lies exactly in its box, on a 6 x 6
   grid of equal cells, and the same seed produces the same cell pattern in
   Instrument and in the chosen look.
4. **Reduced motion.** With the operating system's reduced-motion setting on,
   read every element's running animations and transitions. Pass when none is
   running on any element, in every fixture state.
