# C5 Marks only

**Question.** Are bot marks distinct, with unchanged seeded geometry?

**Procedure and pass conditions.**

1. **Mark distinctness.** Render marks at 88 x 88 for 200 seeds with the chosen
   look. Count a pixel as different when the two colours differ by more than 8
   in any channel. Pass when every pair differs in at least 12 percent of the
   tile's pixels.
2. **Mark geometry.** Each mark lies exactly in its box on a 6 x 6 grid of equal
   cells, and the same seed produces the same occupied-cell pattern in
   Instrument and the chosen look.

There is no default-paint leak scan or reduced-motion step. Reduced motion
remains required by the spec and pack, but is not checked here. The seven new
presentation settings have no aesthetic checks. C4 contrast remains separate.
