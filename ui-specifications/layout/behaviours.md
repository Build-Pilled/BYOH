# Behaviours

Trigger, change, numbers, and before and after pair where a frame exists.
Numbers are CSS px and milliseconds measured on the default look. A look changes
none of them. A line marked "not specified" gives no number: build it
sensibly and keep it inside the layout rules.

## Composer growth (frames F35 then F36)

- **Trigger:** type or paste in the composer.
- **Change:** the field grows with its content, shrinks back as text is
  deleted, caps and then scrolls inside itself.
- **Numbers:** one line is a 33 high field in a 57 high composer (12 padding
  above and below). 28 pasted lines cap the field at exactly 240 (content height
  640), so the composer is 264. The transcript's bottom reserve always equals the
  composer's height (57 up to 264), so the last message is never under it. A
  vertical scrollbar thumb appears inside the field only at the cap. Send and
  Queue stay bottom-aligned (Send 32 x 32 at x = 1222; y = 745 at rest, its
  bottom edge staying at the composer's bottom padding). There is no height
  transition. An empty draft shows Send idle.
- **Kept:** the draft text per session, restored on return; a restored image
  draft returns as a file chip until re-attached.
- Not specified: narrow-width wrapping line counts, intermediate sizes.

## Collapsed tool steps (frames F33 then F34)

- **Trigger:** a tool-using reply settles. Click the Worked chip. Click a tool
  summary.
- **Change:** collapsed by default. The chip opens the step list; a summary
  opens its arguments and result.
- **Numbers:** chip 231.2 x 31.5 at 340, 154.4. Open: steps block 672 x 90,
  result panel 646 x 78; the chevron turns from right to down; the reply card
  moves down by the block's height. Nothing persists; open state is screen-only.
- Not specified: very long results, running and failed steps.

## Other behaviours

| Trigger | Change | Numbers or note |
| --- | --- | --- |
| Reply streaming | A "Thinking" placeholder with a small bot mark; its text pulses | opacity 1, 0.35, 1 over 1400 ms, linear, endless; frame F38 |
| Hover or focus on a row | The `...` opener, the bot Actions button and the folder `+` appear; message actions sit in the row under a card | no transition |
| Open a menu, dialog or popover | Fades in anchored (menus) or centred (dialogs) | 150 ms ease, fill backwards; the recent-activity card 150 ms linear; Escape and an outside click close menus and popovers; a dialog puts focus in its first input |
| Widen the panel | Panel 420 to 960, covering the transcript | transcript is 540 with the narrow panel, 960 otherwise |
| Expand a sidebar or panel section | The opened header takes the accent fill; a folder's chevron turns; `Show all N sessions` toggles to `Show fewer` | no transition |
| Search | In-thread find bar 960 x 50 with current and total; sidebar search shows hit rows with snippets | debounce not specified; no-match line for panel search |
| Model picker | Filter narrows the list; picking a model saves at once; thinking chips are a draft with Save | |
| Edit a file | First edit shows the `unsaved` pill and enables Save; Save also runs on the platform save shortcut in the editor; an external change while dirty shows the conflict banner (Reload replaces the draft); a save problem shows a line under the bar | the save still happens, the line is a warning |
| Attach files | Chips above the field, a 70 high row (908 x 70); Send enabled; a thumbnail opens the viewer | error and oversize states not specified |
| Type `/skill:` | An anchored list above the composer; choosing inserts the command into the draft | |
| Annotate selected text | Editor popover, then badge, highlight and composer chip | annotations live for the session only |
| Send, queue, steer, edit, cancel | Send becomes Stop; Queue adds a 920 x 39 card; the composer region is 102 high; Edit holds the card with a banner | failure and retry states not specified |
| Open the compaction divider | Toggles the summary block | |
| Peer reply, read state | Working lamp while running, waiting-on-teammate lamp, unread lamp; a new-dot and divider in recent activity | |
| Open an activity row | Shows the raw message text; Back returns | |
| Tasks search, row, edit, confirm | Unmatched search zeroes the counts and shows the empty line; a row opens the 540 drawer over a table that keeps its 924 width; Mark done asks first; Back dismisses without writing | |
| Routines view | Tabs, week navigation, today column outlined; Run now adds a run-log row | |
| Select a change | Loads the diff and hash header; Revert asks the person first | |
| Copy | Transient feedback in the action row; a code block's `Copy` is in its header strip | |
| Switch the mode | Applies at once and reloads; every role is painted in both modes; light mode keeps its black panel and dialog islands | the islands are paint, see the look's tokens |
| Scrolling | Transcript, editor, table, calendar and panel scroll independently | calendar 452 high with seven columns |
| Reduced motion | Only the 150 ms fades and the 1400 ms pulse exist, and both stop | |

Not specified in this folder: scrolling while a reply streams, connection loss
and restore, dragging team members and columns, narrow viewports.
