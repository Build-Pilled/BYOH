# Components

Parts, sizes, paddings, gaps and states for every component. Sizes are CSS px
at a 1280 by 795 window. Exact per-role numbers are in `layout.json`; the
name in `code` is the layout key used there; the checks' mapping (see
`checks/README.md`, Mapping) ties each key to an element of the build.
Colours, corner radii, rule and shadow strength, glows and motion are never
given here: they are paint and come from the look (Instrument's are in
`look/instrument/roles.json` and `tokens.md`). Words such as muted, accent or
raised name a role the look paints. Text of controls, names and the accessibility
tree come from the spec sections, which win where this folder and a frame show
something different.

Faces: three classes of text face exist. The **body face** sets prose, names,
buttons and field text. The **label face** (a monospace) sets thread titles,
timestamps, status and model labels and section headings, upper-cased where
`type-scale.md` says. The **code face** sets code, bare URLs and inline code.
Which family fills each class is the look's choice.

## Contents

1. Sidebar
2. Conversation
3. Composer
4. Worked and tool steps
5. Menus, popovers and dialogs
6. Configuration panel and shared editor
7. Annotations
8. Pages: tasks, team map, skills, routines, changes, bridge
9. Settings

## 1. Sidebar

- Section headings `CREW`, `BOTS` (with a right add control), `BOT THREADS`
  and `TOOLS` (label face, upper-case, muted), each with a twisty chevron
  (`sectionHead` is the configuration accordion; the sidebar headings are
  plain text rows).
- Top strip: see `shell.md` (top-strip rule). Below it a search field, full
  width, with an inset rule.
- Bot row (`botRow`), 294 x 75 at x = 8 (56 high when collapsed to one line):
  chevron; mark 32 x 32 at x = 38; name (body face, strong) with the LEAD badge
  on a second line for leads; a one-line preview in the label face, ellipsised;
  right column with the age (`2M`, `NOW`) and the status lamp 8 x 8 at x = 286.
  Selected: raised surface and a 1 px rule.
- Status lamps (`statusLight`): 8 x 8. Working, unread and waiting-on-teammate each have their own
  token; idle shows no lamp. The words stay in the accessible name; colour is
  never the only signal.
- Session row (`threadRow`) 266 x 29.5, indented 36, label face 13. The
  selected row has a 1 px outline and a `...` Session actions opener that
  shows on hover and selection. A row started by a routine carries a `ROUTINE`
  tag and its age. After eight rows a `Show all N sessions` link appears;
  it toggles to `Show fewer`.
- Folder row (`folderRow`) 266 x 29.5: folder glyph, name, count right; hover
  shows a New-session `+` and `...`. Its children sit behind a 1 px vertical
  rail.
- Tools group: five destination rows (Team map, Tasks, Routines, Skills & MCP,
  Changes) in the body face, then a Settings row with a gear at the bottom.
- Sidebar search results replace the tree with hit rows and snippets under
  their bot, and clear back to the tree.

## 2. Conversation

- Person message (`person`): right-aligned bubble, up to
  672 wide, padding 10 x 16, body face 15 on 24.4. Its timestamp sits below
  (11, label face) with a copy glyph at its left.
- Assistant message (`assistant`): a card with an inset rule,
  padding 10 x 16; 500 wide while the 420 panel is open, up to 940 otherwise.
  Prose 15 on 24.4; a heading 16.5 on 26.8, strong.
- Row under the card: copy glyph, fork glyph, time, model name in capitals,
  context size.
- Empty conversation: one centred muted line "A fresh context window. Nothing
  here yet." about 215 below the top, composer unchanged.
- Markdown: bold, italic; bare URL in the code face with an underline in the
  link colour; authored link in the body face with the same underline;
  inline code a 4 px chip (`inlineCode`); fenced code block (`codeBlock`)
  up to 640 wide with a header strip (language, line count, `Copy` right) over
  the code; table (`table`, 878 wide when the panel is closed) with a raised
  header row and 1 px row rules; task-list bullets with checkbox glyphs;
  blockquote with a 3 px left rule (its width is layout).
- Callouts (`callout`, and one per kind): five kinds, Note, Tip, Important,
  Warning, Caution. 878 x 70.2 minimum (640 and 468 when the panel is open),
  a 4 px left bar and a 1 px border in the kind's edge token, a label
  line in the label face (`calloutLabel`: 11, strong, upper-case, 0.66 px
  tracking) in the kind's ink, body in the body face 15 on 24.4, padding
  10 x 14. Each kind has its own bar, edge, background and ink token.
- Find bar (`findBar`) 960 x 50 under the header: query, current of total,
  previous, next, close. Matches are highlighted; the current one stronger.

## 3. Composer

- At rest (`composer`) 960 x 57: paperclip (24 glyph, x about 330); one-line
  field (`draft`) 773 x 33, body face 15 on 22.5, placeholder "Message <bot>";
  a `Queue` text button right; Send (`send`) 32 x 32 at x = 1222, y = 745,
  up arrow. It is disabled for an empty draft and primary with text; its paint
  comes from the chosen look. While a turn runs it becomes a Stop square.
- Grown: see behaviours B01. Capped field 240 high, composer 264.
- Attachments (`attachment`): a chip row inside the composer above the field,
  908 x 70 at 346, 668: an image thumbnail with a close badge top right, and a
  file chip (document glyph and name) with the same badge; clicking a thumbnail
  opens the image viewer (a full-window dimmer with the image and an action
  strip).
- Running and queue (`queueCard`): while a turn runs, queued messages show as
  cards above the composer, 920 x 39: `1.` and the text, right-aligned `Edit`,
  `Steer`, `Delete` links; the whole composer region is 102 high. An edited
  card is marked held, with a banner "Editing queued message", and a Cancel.
- Skill suggestions (`skillMenu`): an anchored popover above the composer
  listing `/skill:<name>` (label face) with a description line (body face,
  muted); choosing one inserts the text into the draft without running it.

## 4. Worked and tool steps

- Collapsed chip (`worked`) 231.2 x 31.5 at 340, 154.4: a bordered button
  "Worked for 0s, 1 step" with a check and a chevron.
- Expanded: the chevron turns down; a steps block (`toolSteps`) 672 x 90 sits
  below with a left rule; each step is a summary line (tool name strong, then
  the arguments muted) and, opened, a result panel (`toolResult`) 646 x 78,
  code face 13. The reply card below moves down by the block's
  height. Collapsed is the default once a reply settles.
- Compaction divider (`compaction`): a row "Not in the model's context since
  <time> (compacted)" that toggles a bordered summary block.

## 5. Menus, popovers and dialogs

- Anchored menu (`menu`) 190 x 292 (214.6 x 152 and 190 x 82 for shorter
  ones), anchored to the clicked button's edge (the bot action menu opens at
  x = 282, y = 167), items (`menuItem`) 178 x 35, separators, the
  destructive item last. The same chassis serves New, session, folder and
  bridge menus.
- Dialog (`dialog`) 460 wide (180, 340 or 362 high), centred, padding 20 x 22,
  with a scrim over the whole window. Title 22, strong. Labelled fields: label
  14, muted; input (`modalInput`) 414 x 35. The focused field uses the look's
  focus treatment. Hint lines 13 muted. Footer right-aligned: Cancel (bordered),
  then the primary button, painted by the look. Variants differ only in fields:
  New folder and Rename folder (one Name field), Connect two bots (two ids,
  a Why field, a hint), a refusal with Close, New MCP server (Name), and a
  read-only scrolling prompt view.
- Model picker (`modelPicker`) 359 x 268, under the model label: a filter
  input, grouped list (group headings; rows `modelOption` 345 x 31.5 with the
  model name and a route tag), selected row marked, thinking chips below.
  An empty filter result shows only the empty line.
- Session finder (`finder`) 360 x 363.5 under All sessions: search field,
  an origin select and an `archived` checkbox, then scrolling rows with ages.
- Recent activity (`recent`) 560 wide (179.2 or 206.6 high), a card over a dim
  scrim: header with a title, a count and a close; sticky day headings with a
  rule; rows (`recentRow`) 542 x 63.5 with author mark, name, arrow, recipient
  mark and name, time and one line of text; a footer line "NEW SINCE YOU LAST
  LOOKED". A row opens its message text; Back returns.
- Transient feedback ("Saved to Downloads", copy feedback) appears inline in
  the header or the message action row, bounded and wrapped.

## 6. Configuration panel and shared editor

- Panel (`panel`) 420 x 747 at x = 860 (960 when widened): a heading row (bot
  name, widen, close), a search field, then an accordion of eleven sections:
  Overview, Identity, System prompt, bot.toml, Skills, Routines, Tools & MCP,
  Model, Limits, Notes, History. Each header (`sectionHead`) is 409 x 43 with a
  glyph token at left, a 14 upper-case label (1.12 px tracking) and a chevron.
  The open header uses the look's open-state treatment and shows the file hint.
- Fields: label (`panelLabel` 13, strong, upper-case) over a field
  (`panelField` 347.8 x 31.5); descriptive hints 13 muted.
- Identity: the bot's mark at 88 x 88 centred over a `Reroll mark` button, then
  Name and Description.
- File bar (`fileBar`) 680 x 38: path (label face, muted), an `unsaved` pill,
  `Open in editor`, `Reveal` and `Save` (primary; flat until the file is dirty).
  Conflict banner: "This file changed on disk while you were editing it." with
  `Reload` and `Keep mine`. A save problem shows a line under the bar
  (`problems`).
- Editor (`editor`, text in `editorText` 12.5 on 19.4, code face): line numbers,
  syntax colours from the look's diff and accent tokens. System prompt view is
  wide: editor left, read-only assembled preview right.
- Routines section: nested framed editor with a Form and Text toggle,
  label/value rows. Tools & MCP: switch cards (`switch`, 349 x 29, 48 or 66
  high): a Defaults row with hint, then one row per tool; the track is
  bordered, with a knob and distinct on/off treatments from the look. Web
  tools are disabled for an engine that lacks them.

## 7. Annotations

Numbered badges (`annotationBadge` 20 x 20, 11 strong) mark
the end of each highlighted range; the range gets a background in its slot's
colour (thirteen slots exist, three are shown in the frame). The composer shows
a chip (`annotationChip` 150.1 x 31.5, "3 annotations"). Hovering it opens the
list (`annotationPopup` 420 x 330): badge, quoted text, comment, Edit and
Delete. The editor (`annotationEditor` 340 x 77 and up) is a popover with a
textarea and Cancel and Save.

## 8. Pages

- Tasks: page heading and count; a filter rail (screens, search, chips with
  counts, Clear all); a dense table (`taskTable` 924 wide) with sortable
  headers, 36 high cells (`taskCell`), row rules, and a footer `4 of 4 tasks`
  with key hints. The detail drawer (`taskDetail` 540 x 578.5 at x = 722) sits
  over the right of the table, which keeps its width: id and status chip, title,
  actions, a field grid, relation lists. Editing swaps the title and prompt into
  inputs with Save and Cancel; Mark done opens a confirmation block with an
  optional reason (required where the task waits for the person's decision).
- Team map: board (`teamBoard` 960 x 697, or 540 beside the 420 panel);
  columns (`teamColumn` 260 wide) each with a team header, lead card and member
  cards (`teamMember` 244 x 58 to 73: mark, name, one line); a standalone
  column; an instruction line on top. The team form beside it: Name, Lead
  select, member checkboxes, Form and Text toggle.
- Skills & MCP: left tree 280 wide with root headings (`Shared skills`,
  `MCP servers`), create buttons and nested rows (`fileRow` 349 x 30); right
  editor with the file bar.
- Routines: tabs `List`, `Calendar`, `Run logs` (selected tab outlined in the
  accent) and a bot filter. Calendar (`calendar` 920 x 452): week navigation
  and range, seven 128 x 452 columns, day header in the label face, today
  outlined, event cards with mark, time and truncated title; finished runs use
  the positive colour for the time, upcoming ones an accent border. List:
  routine cards (`routine`) with Active or Paused pill, schedule, next time,
  latest status, Edit and Run now. Run logs: status cards with the bot, local
  time and how the run began.
- Changes: left list 280 wide (rows with a kind chip, title, age, `prompt`
  pill), the list outlined in the accent while focused; right diff 680 wide: a
  hash header with `Revert`, a metadata block, then lines (`diff`, `diffAdd`,
  code face 12): file header, hunk marker, added, removed, context.
- Bridge: header with the two bot names and a menu, a one-line note
  `bridgeNote` 920 x 30, then a read-only combined message list with
  `A to B, age` attribution.

## 9. Settings

Modal (`settings`) 900 x 620 at 190, 87.5; left navigation (`settingsNav`) 220
wide with the title, a search field and rows Appearance, Connections, Daemon,
About, Shutdown VM; content (`settingsBody` 678 x 618) with a close, a heading
and cards (`settingsCard` 638 wide). Appearance: a card with three theme cards
(`themeChoice` 195.3 x 161: a swatch, a name in the body face strong, a
three-line muted description); the selected card takes the accent border.
Use the spec's names for the modes; labels shown in a frame are not
authoritative. Connections: status cards and buttons. Daemon: the file bar and
editor. About: name, version, home, URL, process id. Shutdown VM: a button,
an availability line, a bounded output block, and a Stop anyway button while
busy; its unavailable text is the spec's, never a path.
