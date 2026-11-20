# Lab

## The idea

A technical drawing on a measured ground. Line draws, tone holds, colour
means. Nothing has depth or decoration.

## Principles

- **Type is infrastructure.** Inter keeps small labels and identifiers clear.
  Optical sizing, contextual alternates and disambiguated glyphs serve reading,
  rather than providing decoration. JetBrains Mono handles code.
- **Numbers hold still.** Tabular figures and slashed zero distinguish changing
  counts, times and identifiers. All-caps labels use the font's case feature.
- **Few variables.** A cool slate ground and indigo accent anchor a derived
  surface ladder. Fixed pack sizes and line heights supply the rhythm; the
  face, weight and slight tracking adjustment supply Lab's character.
- **Colour has a job.** Status, callout and mark hues carry meaning; the rest
  stays nearly neutral. Marks are the most colourful part of the screen.
- **Line, tone, colour.** Places carry no rule and no shadow; only marks are
  drawn in line. Four-pixel corners remain inside the fixed boxes.
- **Motion confirms an action.** A 100 ms functional response, no idle animation.
  Reduced motion turns it off, rather than just slowing it down.

## The 90-day test

A misread identifier, a jittering number or a misaligned row costs little once
and much after months. Remove those cumulative reading and scanning costs.

## Decided character

| Aspect | Choice |
| --- | --- |
| Ground | Cool slate at night, cool off-white by day |
| Accent | Restrained indigo; colour otherwise reserved for meaning |
| Type | Inter for interface and prose; JetBrains Mono for code |
| Corners and rules | 4 px corners; no rule on places, lines only on marks |
| Motion | Short functional feedback only |
| Marks | Crisp square cells with a 1 px drawing gap, nine colours |

## Shared boundaries

This is paint on the [fixed shell](../../layout/shell.md), not a different
interface. All sizes, line heights, text, controls, states, border widths and
accessibility semantics stay fixed. Corner radius and the strength of inset
rules and shadows may change only if no box moves. The colours here are
original values for this look, not values copied from another palette.

Both modes are in `tokens.json`. Faint text reaches 3:1; all other text reaches
4.5:1 on its effective background, at every size, without exceptions. Status
words stay in accessible names, never as visible captions beside the lamps;
callout labels remain visible. A callout keeps a visible boundary: bar, tint
edge or outline. Colour never replaces the accessible status name or the callout label.
Fonts are bundled, with open licences: see [the font manifest](../../choice/fonts/README.md).
Nothing is fetched while drawing. Export uses the light variant. Mode selection
is still System/Dark/Light; accepting a look neither adds a config key nor
changes a saved mode. A user-invented look follows the same boundaries.

Use the [choice page](../../choice/index.html) to compare this look's full live
UI sample with the others, and its row for both palettes, type and marks.
A sample is never a picture of the person's own app.

## Presentation

| Setting | Choice |
| --- | --- |
| Icons | Material Symbols Sharp outlined, weight 300, optical size 20, static grade 0 |
| Status | Hollow 1.75 px ring |
| Callout | 28 px kind-colour header strip (18% dark, 16% light), neutral card body, 1 px outline; transparent 4 px bar |
| Surfaces | Flat tone in flow, no shadow or rule; floating tone step with a 1 px edge, no shadow |
| Buttons | 1 px outline: rule/text secondary, accent/link primary and Send; disabled Send uses rule/faint |
| Selected / hover | 2 px left accent inset bar with no fill / next tone step |
| Tags | Square tone plate on surface-raised, badge ink |

Icons are [bundled with their licences and source manifest](../../choice/icons/README.md).
These settings are paint, never box geometry; their aesthetics are prescribed,
not checked. C4 contrast still applies.
