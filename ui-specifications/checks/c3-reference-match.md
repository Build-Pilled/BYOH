# C3 Reference match

**Question.** Does the build, painted in Instrument, reproduce the polished
frames and layout values?

**Procedure** (once per build; this is the build-completion check):

1. Stage each frame's state from `layout/fixture.md`. Screenshot at 1280 x 795,
   scale 2, in dark mode, with Instrument tokens.
2. Mask the dynamic regions: timestamps, ages, the clock. Apply the same mask
   to the frame.
3. Compare picture to frame: convert both to grayscale, compute SSIM over 8 x 8
   windows. Record the score per frame.
4. Compare geometry to `layout/layout.json`: for every mapped element (README, Mapping), its
   rectangle against the role's variants in `layout.json` and the frame's position.
5. For the light mode, which has no frames, compare the computed colours of
   every role against `look/instrument/roles.json` resolved with the light
   token values.

**Thresholds.**

| Measure | Pass when |
| --- | --- |
| Frame SSIM | at least 0.90 per frame |
| Rectangle | each fixed role within 2 px of the frame in x, y, width and height |
| Colours and fonts | exact for the chosen look: every computed colour and font family equals the look's resolved token or family |

**Fail.** Any measure below its threshold. The agent fixes the page and runs again.
