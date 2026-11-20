# Paper

## The idea

A page to read and write on. Most of a harness is words: questions, replies,
code, notes and decisions. Typography leads and the chrome steps back.

## Principles

- **Typography before ornament.** Hierarchy is made by type, weight and the
  shell's existing space. A new face never changes the fixed measure or leading.
- **Reading and writing differ.** IBM Plex Serif carries what bots write;
  Plex Mono carries the person's words and code; Plex Sans carries interface
  labels. The distinction identifies authorship without dimming machine text.
- **Dose colour.** Text is ink. Status and callout roles keep their colours;
  a single violet signature marks the caret, active conversation and send action.
- **Space, not rules.** Ordinary card, chassis and control frames have zero
  inset-rule strength, with their boxes left intact. Callouts keep their four-
  pixel identifying edge and quiet boundary. No shadow on the page; a loose sheet casts a short one.
- **One material, two lights.** Warm paper and ink in light mode; deep ink and
  paper-toned text at night. Avoid pure black and white. Tool islands keep
  the same paper material in each mode, not an unrelated black panel.
- **Quiet identity.** Marks are single-ink monograms of the same seeded cells,
  recognised by silhouette, not by a new assignment of identity.
- **Things appear.** No animation, breathing or decorative transition. A tool
  used for hours should not keep performing for its reader.

## The 90-day test

For every decorative element ask whether it still helps reading or writing,
or whether the person merely reads past it. Remove the latter.

## Decided character

| Aspect | Choice |
| --- | --- |
| Ground | Warm paper and ink; low chroma |
| Accent | One functional violet signature |
| Type | Plex Serif for reading, Plex Mono for writing/code, Plex Sans for UI |
| Corners and rules | Square cards, 2 px control corners; no ordinary frame |
| Motion | None |
| Marks | Single ink, quarter-pixel drawing gap, silhouette preserved |

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
| Icons | IBM Carbon UI icons, 20 px artboard where available, otherwise 32 px source scaled inside fixed box |
| Status | Solid diamond via clip-path, no glow |
| Callout | 4 px margin bar only; no tint/frame, kind ink label on page ground |
| Surfaces | Page ground in flow, no frame/shadow; opaque floating surface-dialog sheet, short contact shadow plus soft 26 px shadow |
| Buttons | Underlined words: faint 1 px secondary underline, link/600 primary with 2 px accent underline; Send accent arrow and 2 px underline; disabled faint arrow without underline |
| Selected / hover | 2 px accent underline on title, offset 4 px / 1 px faint underline |
| Tags | Bare uppercase label text and glyph in badge ink, no painted box |

Paper keeps the composer's 3 px accent margin rule. Floating-sheet shadows are
.5 black in dark and .18 warm ink in light; scrims are .45 and .28 respectively.

Icons are [bundled with their licences and source manifest](../../choice/icons/README.md).
These settings are paint, never box geometry; their aesthetics are prescribed,
not checked. C4 contrast still applies.
