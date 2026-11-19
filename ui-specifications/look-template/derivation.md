# Derivation

The default look proves this recipe: regenerating its ladder from its ground
gives its published values. The surface ladder keeps hierarchy (display, card,
chassis, raised, rule) as clear as the default whatever the hue; a freehand
palette loses it first.

## Ladder

1. Pick the ground per mode (Instrument: the `display` token, black in dark and
   a warm off-white in light) and a ground hue and chroma (Instrument: neutral, with a faint warm
   tint in light).
2. Express every ladder step as an **L\* offset from the ground**, using the
   L* columns in `look/instrument/tokens.md`. In dark the offset is that
   step's L* minus the ground's (0); in light it is the step's L* minus the
   ground's 96.1, which is negative for surfaces darker than the ground and
   small positive for white.
3. Keep chroma following the ground's tint: each step uses the ground's hue and
   a chroma that scales with lightness the way the ground does.
4. Text steps: `text` at about 95 L* in dark and 5 in light; `text-muted` about
   64 and 32; `text-faint` starts about 46 and 50. Adjust a new look's text
   steps until faint text reaches 3:1 and all other text 4.5:1 on every surface
   it sits on. The exact Instrument-only exceptions in [C4](../checks/c4-contrast.md)
   do not carry over. Rules: `rule` about 36 L* in dark and 66 in light;
   `rule-soft` 17 and 75. Convert back to the colour space the tokens use and
   write the hex.

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
- Each callout kind: a bar colour (the same in both modes), `edge` at alpha 0.45
  of the bar, a background that is a very dark tint of the bar's hue (L* about
  13 to 14) in dark and a very light one (L* about 94 to 96) in light, and an
  ink that is the bar itself in dark and the bar darkened in light until it
  meets contrast on the background.
- Annotation slots: spaced around the hue circle at constant lightness; the
  ink is near-black and must contrast on every slot.
- Nine mark colours: spaced around the hue circle in one lightness band
  (Instrument dark L* 65 to 80), about 10 to 14 L* darker in light.

## Fonts and motion

A font other than the shipped families is fetched from its official release,
bundled with its licence text, and given `size-adjust` and ascent and descent
overrides measured against the default's text metrics so no box changes size.
Motion is one of three presets of tokens only: none, functional, alive.
