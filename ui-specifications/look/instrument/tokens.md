# Instrument tokens

Every colour of the default look, by token name, for both modes. Token names are the same in every look; only values change. `tokens.json` and `tokens.css` carry the same values in machine form (`tokens.css` sets dark on the root and light under a root `data-mode="light"` selector). `roles.json` gives the paint of every role, with each colour written as a token name in braces.

Alpha is written `rgb(r g b / a)`. A token with a Derive column value is its source token at that alpha; a look that changes the source changes the derived token with it.

## Surface ladder

Backgrounds from the ground up. Each step is a lightness offset from the ground (see look-template/derivation.md).

| Token | Dark | Light | L* dark / light | Derive | Used for |
| --- | --- | --- | --- | --- | --- |
| `display` | `#000000` | `#f4f4f2` | 0.0 / 96.1 |  | Page ground behind everything; also the text on the person bubble and on the find highlight |
| `surface-input` | `#0b0b0b` | `#e7e7e5` | 3.0 / 91.6 |  | Inputs, chips, member cards |
| `surface-card` | `#0e0e0e` | `#ffffff` | 4.0 / 100.0 |  | Assistant card, task table, popovers |
| `surface-dialog` | `#161616` | `#cfd0d2` | 7.2 / 83.5 |  | Dialogs, settings modal, team columns, find bar |
| `surface-recent` | `#161616` | `#ffffff` | 7.2 / 100.0 |  | Recent-activity card |
| `chassis` | `#1a1a1a` | `#cfd0d2` | 9.3 / 83.5 |  | Sidebar and header |
| `surface-file-row` | `#1f1f1f` | `#1f1f1f` | 11.8 / 11.8 |  | Selected file row |
| `surface-inline-code` | `#222222` | `#e7e7e5` | 13.2 / 91.6 |  | Inline code chip |
| `surface-button` | `#262626` | `#bfc0c2` | 15.2 / 77.7 |  | Button fill |
| `surface-task-selected` | `#262626` | `#fff0eb` | 15.2 / 95.8 |  | Selected task cell |
| `surface-raised` | `#2a2a2a` | `#e9e9e7` | 17.1 / 92.3 |  | Selected row, raised chip |
| `option-active` | `#303030` | `#303030` | 19.9 / 19.9 |  | Active option in the model picker |
| `send-idle` | `#303030` | `#b3b4b6` | 19.9 / 73.3 |  | Send button with an empty draft |
| `editor-line` | `rgb(127 127 127 / 0.07)` | `rgb(127 127 127 / 0.07)` |  |  | Active editor line |
| `menu-glass` | `rgb(14 14 14 / 0.62)` | `rgb(255 255 255 / 0.6)` |  |  | Translucent menu fill |
| `surface-recent-row` | `#262626` | `rgb(0 0 0 / 0)` |  |  | Recent-activity row |
| `surface-row-hover` | `rgb(38 38 38 / 0.55)` | `rgb(191 192 194 / 0.55)` |  |  | Hover fill of rows |

## Rules, edges and underlines

Drawn as inset shadows, not borders. Strength (width and alpha) is paint.

| Token | Dark | Light | L* dark / light | Derive | Used for |
| --- | --- | --- | --- | --- | --- |
| `pill-underside` | `#0a0a0a` | `#0a0a0a` | 2.7 / 2.7 |  | Bottom inset edge of the pill |
| `rule-underside` | `#0a0a0a` | `#8e8f91` | 2.7 / 59.4 |  | Bottom inset edge on raised rows and buttons |
| `rule-input` | `#262626` | `#9a9a9a` | 15.2 / 63.6 |  | Input border |
| `rule-island` | `#262626` | `#262626` | 15.2 / 15.2 |  | Rules inside islands |
| `rule-soft` | `#2a2a2a` | `#b9babc` | 17.1 / 75.5 |  | Row and table rules |
| `rule-popover` | `#3a3a3a` | `#3a3a3a` | 24.4 / 24.4 |  | Popover outline |
| `rule` | `#555555` | `#a0a0a0` | 36.1 / 65.9 |  | Main inset rule (1.5px) |
| `edge-light` | `rgb(255 255 255 / 0.12)` | `rgb(255 255 255 / 0.12)` |  |  | Faint inner highlight on the header |
| `edge-light-menu` | `rgb(255 255 255 / 0.14)` | `#ffffff` |  |  | Inner highlight on menus |
| `edge-light-soft` | `rgb(255 255 255 / 0.08)` | `rgb(255 255 255 / 0.08)` |  |  | Faint inner highlight on the sidebar |
| `transparent` | `rgb(0 0 0 / 0)` | `rgb(0 0 0 / 0)` |  |  |  |

## Text

Three text steps over any surface.

| Token | Dark | Light | L* dark / light | Derive | Used for |
| --- | --- | --- | --- | --- | --- |
| `text-faint` | `#6c6c6c` | `#777777` | 45.6 / 50.0 |  | Timestamps, placeholders, empty-state lines |
| `text-label` | `#808080` | `#808080` | 53.6 / 53.6 |  | Panel field labels |
| `text-muted` | `#9a9a9a` | `#4c4c4c` | 63.6 / 32.3 |  | Secondary text, buttons |
| `text` | `#f2f2f2` | `#111111` | 95.5 / 5.1 |  | Main text |

## Islands

Surfaces and text that keep their own colour in light mode (black panels and dialogs) and the person bubble. Each look decides whether to keep islands.

| Token | Dark | Light | L* dark / light | Derive | Used for |
| --- | --- | --- | --- | --- | --- |
| `island-card` | `#0e0e0e` | `#0e0e0e` |  |  | Model picker body, stays dark in light mode |
| `island-ground` | `#000000` | `#000000` |  |  | Black island fill that stays black in light mode (panel, cards, inputs inside a panel) |
| `island-text` | `#f2f2f2` | `#f2f2f2` |  |  | Text on islands |
| `island-text-muted` | `#9a9a9a` | `#9a9a9a` |  |  | Muted text inside islands |
| `person-bubble` | `#ececec` | `#111111` |  |  | Person bubble: light grey in dark, black in light |

## Accent and links

One accent. Its alpha variants are derived by the rule in the Derive column.

| Token | Dark | Light | L* dark / light | Derive | Used for |
| --- | --- | --- | --- | --- | --- |
| `accent` | `#ff5a1f` | `#ff5a1f` |  |  | The one accent: focus, open section, primary button |
| `accent-glow` | `rgb(255 90 31 / 0.55)` | `rgb(255 90 31 / 0.55)` |  | `accent` at 0.55 | Primary button glow |
| `accent-glow-core` | `rgb(255 140 90 / 0.9)` | `rgb(255 140 90 / 0.9)` |  |  | Primary button glow core |
| `accent-ring` | `rgb(255 90 31 / 0.5)` | `rgb(255 90 31 / 0.5)` |  | `accent` at 0.5 | Outline of the active model option |
| `accent-wash` | `rgb(255 90 31 / 0.16)` | `rgb(255 90 31 / 0.16)` |  | `accent` at 0.16 | Selected option wash |
| `badge` | `#ff9800` | `#ff9800` |  |  | Lead badge, unsaved pill |
| `find-highlight` | `#ff9800` | `#8a5a00` |  |  | Find hit |
| `link` | `#ff7a45` | `#c2410c` |  |  | Links and bare URLs |
| `on-accent` | `#1a0a00` | `#1a0a00` |  |  | Ink on the accent |

## Status and problems

Four lamp colours (working, waiting, unread, needs attention) and the problem and positive colours, pairwise distinct in both modes.

| Token | Dark | Light | L* dark / light | Derive | Used for |
| --- | --- | --- | --- | --- | --- |
| `positive` | `#38d591` | `#1f7a4d` |  |  | Added diff lines, success |
| `problem` | `#ff5667` | `#ff5667` |  |  | Problem line |
| `status-unread` | `#4ade80` | `#16a34a` |  |  | Unread lamp |
| `status-waiting` | `#6aa8ff` | `#2563eb` |  |  | Waiting-on-teammate lamp |
| `status-working` | `#f9e2af` | `#df8e1d` |  |  | Working lamp |
| `status-attention` | `#ff2d2d` | `#dc2626` |  |  | Needs-attention lamp (not staged in a frame) |

## Callouts

Five kinds, each with bar, edge (45 percent of the bar), background and label ink.

| Token | Dark | Light | L* dark / light | Derive | Used for |
| --- | --- | --- | --- | --- | --- |
| `callout-caution-bar` | `#e46f8a` | `#e46f8a` |  |  |  |
| `callout-caution-bg` | `#291e20` | `#fbe9ed` |  |  |  |
| `callout-caution-edge` | `rgb(228 111 138 / 0.45)` | `rgb(228 111 138 / 0.45)` |  | `callout-caution-bar` at 0.45 |  |
| `callout-caution-ink` | `#e46f8a` | `#813f4e` |  |  | Label colour |
| `callout-important-bar` | `#f2a96b` | `#f2a96b` |  |  |  |
| `callout-important-bg` | `#2a231e` | `#fdf2e9` |  |  |  |
| `callout-important-edge` | `rgb(242 169 107 / 0.45)` | `rgb(242 169 107 / 0.45)` |  | `callout-important-bar` at 0.45 |  |
| `callout-important-ink` | `#f2a96b` | `#714f32` |  |  | Label colour |
| `callout-note-bar` | `#4a9bc2` | `#4a9bc2` |  |  |  |
| `callout-note-bg` | `#1b2225` | `#e4f0f6` |  |  |  |
| `callout-note-edge` | `rgb(74 155 194 / 0.45)` | `rgb(74 155 194 / 0.45)` |  | `callout-note-bar` at 0.45 |  |
| `callout-note-ink` | `#4a9bc2` | `#2a596f` |  |  | Label colour |
| `callout-tip-bar` | `#6cc3a0` | `#6cc3a0` |  |  |  |
| `callout-tip-bg` | `#1e2622` | `#e9f6f1` |  |  |  |
| `callout-tip-edge` | `rgb(108 195 160 / 0.45)` | `rgb(108 195 160 / 0.45)` |  | `callout-tip-bar` at 0.45 |  |
| `callout-tip-ink` | `#6cc3a0` | `#345d4d` |  |  | Label colour |
| `callout-warning-bar` | `#f1bd59` | `#f1bd59` |  |  |  |
| `callout-warning-bg` | `#2a251c` | `#fdf5e6` |  |  |  |
| `callout-warning-edge` | `rgb(241 189 89 / 0.45)` | `rgb(241 189 89 / 0.45)` |  | `callout-warning-bar` at 0.45 |  |
| `callout-warning-ink` | `#f1bd59` | `#6a5327` |  |  | Label colour |

## Annotation

Badge colours, one per highlight slot; ink for the number.

| Token | Dark | Light | L* dark / light | Derive | Used for |
| --- | --- | --- | --- | --- | --- |
| `annotation-1` | `#ef8a7e` | `#ef8a7e` |  |  | Badge and highlight slot 1 |
| `annotation-2` | `#58b7c9` | `#58b7c9` |  |  | Badge and highlight slot 2 |
| `annotation-3` | `#f1bd59` | `#f1bd59` |  |  | Badge and highlight slot 3 |
| `annotation-ink` | `#161b27` | `#161b27` |  |  | Number inside the badge |

## Bot marks

Nine mark colours, the tile ground and its grid lines.

| Token | Dark | Light | L* dark / light | Derive | Used for |
| --- | --- | --- | --- | --- | --- |
| `mark-1` | `#e8a0bf` | `#bf859e` |  |  | Pink |
| `mark-2` | `#58b7c9` | `#4c98a6` |  |  | Cyan |
| `mark-3` | `#e6c35c` | `#bea14f` |  |  | Gold |
| `mark-4` | `#e46f8a` | `#bc5e73` |  |  | Rose |
| `mark-5` | `#6fa8a3` | `#5e8c87` |  |  | Sage |
| `mark-6` | `#f1bd59` | `#c69d4c` |  |  | Amber |
| `mark-7` | `#4a9bc2` | `#4181a0` |  |  | Blue |
| `mark-8` | `#ef8a7e` | `#c5746a` |  |  | Coral |
| `mark-9` | `#e8d36a` | `#bfae5a` |  |  | Lemon |
| `mark-ground` | `#0a0a0a` | `#e3dccf` |  |  | Mark tile ground |
| `mark-ground-grid` | `#232a38` | `#cfc6b6` |  |  | Faint grid line on the mark tile |
| `mark-ground-grid-strong` | `#39414f` | `#cfc6b6` |  |  | Grid line, second strength |

## Shadows and dimmers

Colour and alpha only; offsets and blur are in roles.json.

| Token | Dark | Light | L* dark / light | Derive | Used for |
| --- | --- | --- | --- | --- | --- |
| `accent-bottom-shade` | `rgb(0 0 0 / 0.28)` | `rgb(0 0 0 / 0.28)` |  |  | Dark bottom edge of an active primary button |
| `accent-top-light` | `rgb(255 255 255 / 0.6)` | `rgb(255 255 255 / 0.6)` |  |  | Light top edge of a primary button |
| `person-shadow` | `rgb(0 0 0 / 0.18)` | `rgb(244 244 242 / 0.18)` |  |  | Person bubble drop edge |
| `scrim` | `rgb(0 0 0 / 0.6)` | `rgb(0 0 0 / 0.6)` |  |  | Dimmer behind dialogs |
| `scrim-lightbox` | `rgb(0 0 0 / 0.82)` | `rgb(0 0 0 / 0.82)` |  |  | Image viewer dimmer |
| `scrim-soft` | `rgb(0 0 0 / 0.6)` | `rgb(17 17 17 / 0.35)` |  |  | Dimmer variant (activity card) |
| `shadow-badge` | `rgb(0 0 0 / 0.35)` | `rgb(0 0 0 / 0.35)` |  |  |  |
| `shadow-drawer` | `rgb(0 0 0 / 0.35)` | `rgb(0 0 0 / 0.1)` |  |  | Task drawer shadow |
| `shadow-menu` | `rgb(0 0 0 / 0.55)` | `rgb(0 0 0 / 0.25)` |  |  | Menu hard offset shadow |
| `shadow-modal` | `rgb(0 0 0 / 0.5)` | `rgb(0 0 0 / 0.5)` |  |  | Modal drop shadow |
| `shadow-popover` | `rgb(0 0 0 / 0.4)` | `rgb(0 0 0 / 0.4)` |  |  | Popover drop shadow |

## Shape and strength (paint)

Corner radius is paint. Instrument uses 4 px on almost every surface (cards, buttons, inputs, menus, dialogs), 50 percent on the annotation badge, 1.5 px on status lamps, and 0 on full-bleed regions. Counts of roles per radius value: 4px x 49, 0px x 4, 5px x 2, 50% x 1, 2px x 1, 1.5px x 1. Rule width is 1.5 px for the main inset rule and 1 px for popovers and selected rows; shadow offsets and blur are in `roles.json`. A look may change radius and rule or shadow strength; it may not change a border width or anything else that moves a box.

## Fonts

Three face classes (see `layout/components.md`):

| Class | Instrument family | Used for |
| --- | --- | --- |
| Body | Literata, then Georgia, Times New Roman, serif | Prose, names, buttons, field text, authored links |
| Label | The system monospace (`ui-monospace`, which is SF Mono on macOS; not bundled) | Thread titles, timestamps, status and model labels, section headings (upper-case where `type-scale.md` says) |
| Code | Recursive Mono Linear | Code, inline code, bare URLs |

Literata and Recursive Mono Linear are bundled with the app from their official releases with their licence texts, and load only from the app's own origin. If a bundled font is absent the system stack is used without an error. Exact weights: body 400, strong 600 (bold 700, label strong 750 for the callout label).

## Motion

- Popovers, menus and dialogs fade in over 150 ms, `ease`, fill backwards.
- The recent-activity card fades over 150 ms, linear.
- The streaming placeholder pulses opacity 1, 0.35, 1 over 1400 ms, linear, endlessly.
- Everything else is instant; computed transition durations are 0.
- One motion scale multiplies every duration; reduced motion sets it to zero, which stops the pulse and the fades.

## Islands policy

In dark mode the display, panel, input and card grounds are all the same black, so the island tokens equal the ground tokens. In light mode the panel, dialog, card and input-in-panel stay black (`island-ground`, `island-card`, `island-text`, `island-text-muted`) while the display turns light. The person bubble is a light grey with black text in dark mode and black with light text in light mode (`person-bubble`). A look decides whether it keeps islands; if it removes them, the contrast checks (C4) still apply to every pair.

## Annotation highlights

Thirteen highlight slots exist; the pack fixes the first three (`annotation-1`, `annotation-2`, `annotation-3`). The other ten are the look's own, spread around the hue circle so no two neighbouring slots look alike.

## Mark style block

Parameters a look may set for drawing marks (geometry stays fixed, see `marks.md`):

| Parameter | Instrument |
| --- | --- |
| `cellShape` | square, no gap between cells |
| `gap` | 0 |
| `radius` | tile radius about 16 percent of the side; cells square |
| `palette` | `mark-1` to `mark-9` |
| `ink` | multi |
| `idle` | none |
| `working` | none |
| `duration` | not used |
