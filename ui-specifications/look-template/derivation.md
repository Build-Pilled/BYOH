# Derivation

Instrument supplies a useful starting ladder, not a required order or exact
lightness-offset formula. The three published looks keep their own hierarchy:
Dusk has warm selected rows and Paper lets cards share the page ground. These
choices are intentional; reproducing Instrument's lightness order is not a
completion requirement for another look.

## Ladder

1. Choose a ground hue and chroma per mode. Start with the default's offsets
   (`look/instrument/tokens.md`) to understand the jobs of the surface tokens.
2. Derive a coherent hierarchy for the chosen material in each mode. Ground,
   selected and hover states and tool islands must remain visibly distinguishable
   wherever their state needs it. A card may share the page ground if the fixed
   space and typography already separate it; do not change boxes to compensate.
3. Set every named token in both modes. Keep dark islands coherent with the
   chosen family; do not accidentally leave default fills behind. Alpha fills
   are checked after compositing over their real parent surface.
4. Text, label, muted, link and callout inks reach 4.5:1 everywhere they are
   rendered. Faint text reaches 3:1. Test on the selected and hover surfaces,
   not just the page ground. Instrument-only exceptions never carry over.
5. Rule and shadow strength and radius are paint. Paper can remove an ordinary
   inset frame; callouts still keep their identifying boundary. No border-width,
   size or spacing change is permitted.

## Accent and links

One accent hue. `on-accent` is the near-black ink that meets contrast on the
accent. `link` is the accent made lighter in dark and darker in light until it
meets contrast on `display` and `surface-card`. `accent-wash`, `accent-ring`
and `accent-glow` are the accent at alpha 0.16, 0.5 and 0.55; `accent-glow-core`
is a lighter accent at alpha 0.9.

## Status, callouts, annotation, marks

- Four status colours from one lightness band (Instrument dark: L* 68 to 91),
  pairwise clearly distinct in hue; light mode darkens each by about 20 to 25 L*
  (Instrument light: L* 46 to 66).
- Each callout kind: a bar colour per mode with the same semantic hue family, `edge` at alpha 0.45
  of the bar, a background that is a very dark tint of the bar's hue (L* about
  13 to 14) in dark and a very light one (L* about 94 to 96) in light, and an
  ink that is the bar itself in dark and the bar darkened in light until it
  meets contrast on the background.
- Annotation slots: spaced around the hue circle at constant lightness; the
  ink is near-black and must contrast on every slot.
- Nine mark colours: spaced around the hue circle in one lightness band
  (Instrument dark L* 65 to 80), about 10 to 14 L* darker in light as a starting point. A single-ink style
  keeps the nine identity slots but draws all occupied cells with its chosen ink;
  bots remain distinct by seeded silhouette.

## Fonts and motion

A font other than the shipped families is fetched from its official release,
bundled with its licence text, and measured against the default with fixed sizes and line heights. Use
`size-adjust` and ascent/descent overrides only if needed; identity overrides
(`100%`, `normal`) are valid when the rendered swap check already passes.
Motion is one of three presets of tokens only: none, functional, alive.
