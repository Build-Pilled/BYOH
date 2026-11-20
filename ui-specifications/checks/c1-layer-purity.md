# C1 Static lint: layer purity

**Question.** Does the look file declare only paint?

**Procedure.** Parse the look's stylesheet (tokens and fonts) as text. No
browser is needed.

**Pass when all hold:**

1. Every custom property it declares is a token name of `look-template/tokens.json`,
   or a font, motion, radius, rule-strength, presentation or mark-style parameter of the
   template. No other custom property exists.
2. Every selector is the root look selector (the root for dark, the root with
   the light-mode attribute for light). No component selector appears.
3. `@font-face` rules set only family, source, weight, style, `size-adjust`,
   `ascent-override`, `descent-override` and `line-gap-override`.
4. `@keyframes` rules change only `transform` and `opacity`.
5. No declaration touches size, spacing, `display`, `position`, `font-size`,
   `line-height` or `text-transform`.

**Fail.** Any declaration outside the list. The report names the line.
