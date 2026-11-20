# Dusk

## The idea

A warm room for working into the evening. Tinted surfaces, softer corners and
quietly present colleagues, without anything waving for attention. Warmth does
not come from making words harder to read.

## Principles

- **Softness is hue, not weak contrast.** Plum and rose grounds and desaturated
  pastel accents carry the warmth. Text stays crisp. Light mode feels like
  morning in the same room, not an inverted night.
- **One small colour family.** Each status and callout has a deliberate job.
  Hues recur by meaning; they are not arbitrary decoration.
- **Gentle surfaces.** Control corners are 10 px, cards 14 px and callouts
  10 px, inside unchanged boxes. Ordinary surfaces have no inset rule; no padding
  or border width changes to fake softness.
- **Humanist type.** Nunito carries prose and interface; Spline Sans Mono keeps
  code and data legible without making the room feel mechanical.
- **Purpose before frequency.** Most repeated actions should barely move.
  Hover feedback lasts 180 ms. A reply arrival may use 220 ms, 6 px of travel
  and scale from .985, never an entrance from zero. Keyboard actions are instant.
- **State, not personality.** Abstract marks have no faces. Only a bot that is
  genuinely working breathes, in opacity on a five-second cycle. Idle is still.
  Marks remain within their identity boxes, and any motion can be interrupted.
- **An opt-out is an opt-out.** Reduced motion disables all animation and
  transitions, not just the strongest effect. Motion uses transform and opacity.

## The 90-day test

The warmth should become the room, not a theme to notice. If movement asks for
attention without conveying real state, remove it. Imagine the 200th repetition.

## Decided character

| Aspect | Choice |
| --- | --- |
| Ground | Warm plum at night, warm dawn paper by day |
| Accent | Rose, with muted pastel status and callout families |
| Type | Nunito for prose and interface; Spline Sans Mono for code and data |
| Corners and rules | Soft 10/14 px corners; no ordinary rule, tinted soft shadow |
| Motion | Sparing, state-driven; rest when idle |
| Marks | Rounded pastel cells, no faces; working-only breathing |

## Shared boundaries

This is paint on the [fixed shell](../../layout/shell.md), not a different
interface. All sizes, line heights, text, controls, states, border widths and
accessibility semantics stay fixed. Corner radius and the strength of inset
rules and shadows may change only if no box moves. The colours here are
original values for this look, not values copied from another palette.

Both modes are in `tokens.json`. Faint text reaches 3:1; all other text reaches
4.5:1 on its effective background, at every size, without exceptions. Status
words and callout labels remain. A callout keeps a visible boundary: bar, tint
edge or outline. Colour never replaces the words.
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
| Icons | Phosphor Duotone, 20% secondary body; Regular for plus/check/x/minus when used |
| Status | Filled circle with a 2.5 px halo at 22% |
| Callout | Full kind tint, no bar or frame; kind ink label |
| Surfaces | Raised soft card, top-edge light and plum-tinted shadow; floating glass .74 dark/.72 light, 18 px blur on ::before |
| Buttons | Filled soft: surface-button secondary, accent/on-accent primary and Send, soft accent shadow; disabled Send uses send-idle |
| Selected / hover | 16% accent light on chassis, no outline / surface-row-hover |
| Tags | Fully rounded accent-wash pill, badge ink |

Icons are [bundled with their licences and source manifest](../../choice/icons/README.md).
These settings are paint, never box geometry; their aesthetics are prescribed,
not checked. C4 contrast still applies.

In light mode, muted ink is `#604e5d` and badge ink is `#842d48`,
darkened within the plum/rose family so text on the selected row and nested
tinted pills reaches 4.5:1. Muted remains between text and faint ink.
