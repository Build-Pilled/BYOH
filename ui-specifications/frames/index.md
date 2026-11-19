# Frames

29 dark screenshots, 2560 x 1590 pixels (a 1280 x 795 window at scale 2). All
are marked **Instrument paint, layout reference**: take geometry from them
(sizes, positions, spacing, which parts exist). The colours and type in them
are the Instrument look's only. Never copy a colour or a typeface from a frame
into a non-default look; take them from that look's tokens. There are no light
frames: light mode is specified by values only. Text in a frame is the fixture
(`layout/fixture.md`); where a frame's control label differs from the spec's
control names, the spec wins. Layout numbers are in `layout/`; open only the
frame you need.

| Frame | Shows | Layout to take from it |
| --- | --- | --- |
| `F02-annotations.png` | Annotated reply | Numbered inline highlights and the annotation list above the composer |
| `F03-bots-tree-menu.png` | Bot action menu | The anchored menu and its hover-revealed opener |
| `F04-tasks.png` | Tasks page | Filter rail, dense sortable table, footer |
| `F05-task-detail.png` | Task detail | The drawer beside its table: field grid and relations |
| `F06-skills-mcp.png` | Skills & MCP | Two-pane file browser and editor with root headings |
| `F07-team-map.png` | Team map | Horizontal board, member cards, standalone column |
| `F08-team-configuration.png` | Team configuration | Board plus the team form; the board's changed width |
| `F09-model-picker.png` | Model picker | Grouped model list with filter and thinking controls |
| `F10-sidebar-search.png` | Sidebar search results | Two flat sections (Bots, Threads), hit rows with snippets, the status line |
| `F11-thread-search.png` | In-thread find | The find bar in the transcript chrome and the highlights |
| `F13-config-identity.png` | Bot configuration, Identity | The accordion, the 88 mark and its controls |
| `F14-config-system.png` | Bot configuration, System prompt (wide) | The wide panel: editor beside the read-only preview |
| `F17-config-routines.png` | Bot configuration, Routines | The nested framed editor with the file bar |
| `F18-config-tools.png` | Bot configuration, Tools & MCP | Switch cards and assignment rows |
| `F23-settings-appearance.png` | Settings, Appearance | Settings modal and the three theme cards |
| `F29-formatting.png` | Formatted reply | The populated transcript, typography, code block, table |
| `F30-attachments.png` | Composer with attachments | Thumbnail and file chips in the composer |
| `F31-image-viewer.png` | Image viewer | The full-window viewer and its action strip |
| `F33-tools-before.png` | Collapsed tool steps | Baseline of the pair F33 and F34 |
| `F34-tools-after.png` | Expanded tool steps | Result of the pair F33 and F34 |
| `F35-composer-before.png` | One-line composer | Baseline of the pair F35 and F36 |
| `F36-composer-after.png` | Grown composer | Capped field and the transcript space it leaves |
| `F38-running-queue.png` | Running turn with a queued message | Stop button, queue card actions |
| `F39-creation-dialog.png` | Creation dialog | Modal with labelled fields and footer |
| `F41-session-finder.png` | Session finder | Popover with origin select, checkbox and scrolling rows |
| `F44-activity-feed.png` | Recent activity | Sticky day headings, message rows, navigation footer |
| `F46-routines-calendar.png` | Routines calendar | Seven-column weekly calendar and timed cards |
| `F49-changes.png` | Changes | History list and full diff |
| `F52-connection-lost.png` | Connection lost, Team map | Reference for the connection card's position and size only; its wording is the pack's (see `layout/behaviours.md`), not the text shown |

Surfaces with no frame (hero reply, empty chat, skill suggestions, other
configuration sections, other Settings pages, other dialogs and menus, run
logs, compaction, bridge) are described by text in `layout/components.md`; they
reuse the geometry of a frame above.
