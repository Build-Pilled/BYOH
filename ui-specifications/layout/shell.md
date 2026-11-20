# Shell

The shell is the same in every look. All sizes are CSS px at a 1280 by 795
window; frames are that window at scale 2 (2560 by 1590 pixels).

## Regions

| Region | Position | Size | Notes |
| --- | --- | --- | --- |
| Display | 0, 0 | 1280 x 795 | The ground behind everything |
| Sidebar | 0, 0 | 320 x 795 | Full height, own scroll, holds the top strip |
| Header | 320, 0 | 960 x 48 | Observed 48 in almost every state, 40 and 44.5 in a few pages; `layout.json` lists them |
| Transcript | 320, 48 | 960 x 747 | 540 wide while the 420 panel is open |
| Composer | docked at the transcript's bottom | 960 x 57 at rest | Grows with its text, see behaviours |
| Panel | right edge, below the header | 420 x 747 | 960 wide when widened, then it covers the transcript |

Rules between regions are drawn as inset shadows, not as borders: every
computed border width of a region is 0. The sidebar has a rule on its right
edge and the header one on its bottom edge. Where a rule sits is layout; its
colour, width and strength, and any inner highlight line, are paint
(`look/instrument/roles.json` gives Instrument's).

## Spacing scale

Paddings in the pack are mostly 4, 5, 6, 8, 10, 12, 14, 16 or 20; each role's
exact padding is in `layout.json`. Use the role's number, not the nearest step. Row heights are fixed: bot row
75 (56 collapsed, 294 wide), session and folder row 29.5, section header 43,
menu item 35, model label 29.5, task cell 36.

## Top strip (A2)

There is no separate native title band. App content starts at the top edge of
the window. The sidebar's top strip sits at y = 0 and holds the three icon
buttons (recent activity, active sessions, New) right-aligned; the left of the
strip is left clear for the window buttons. The header, not a title bar, is the
drag area: dragging an empty part of the header moves the window, while every
control in the header stays clickable. Nothing is drawn above the sidebar and
header, and no extra band is added to make room for the buttons.

## Z-order and scroll

From back to front: display, regions, panel, popovers and menus, dialogs with
their scrim, the image viewer (its own full-window dimmer), and in front of
all of them the connection card (`behaviours.md`, Connection loss). A scrim covers the
whole 1280 x 795 window including the sidebar and header.

Scroll is independent per surface: sidebar, transcript, panel, editors, tables,
the calendar (452 tall, seven columns) and long lists scroll on their own. The
window itself never scrolls. The composer's field shows a scrollbar only at its height cap.

## Layout versus look

| Layout (this folder, fixed) | Look (a look folder, swappable) |
| --- | --- |
| Region sizes and positions; row heights; mark boxes (32, 28, 20 and 88); lamps 8 x 8; button, input and card sizes | All colours: surfaces, rules, text, accents, status, callouts, annotation, mark palette |
| Padding, margin, gap, grid, z-order, scroll behaviour, the top-strip rule; where each rule sits | Rule and shadow colour, width and strength; glows |
| Border widths, display, position, flex and grid structure | Corner radius |
| Font size, line height, text case and weight class per role | Font families, exact weight within the class, tracking within 0.04 em, OpenType features, font metric overrides |
| Component parts, states and behaviour; accessibility tree; all text | Motion: durations, easings, idle and working animation of marks (transform and opacity only), reduced-motion handling |
| Icon/control/lamp/tag boxes and callout parts | Icon family/style; square, circle, ring or diamond lamps; callout style; in-flow/floating material; button, selected/hover and tag styles |
| Which mark a bot has (the seed) and the mark's cell grid | How marks are drawn and animated inside the same box |
