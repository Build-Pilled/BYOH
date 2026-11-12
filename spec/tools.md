# Tools navigation

Classification: Core. Prerequisites: [shell](ui-shell.md) and owner app connection.

## Purpose

Reach the core inspection/management pages without adding a second command
system. This section owns the Tools group, not the contents of its pages.

## Required behaviour

- **R1 — Inventory.** Tools offers Team map, Tasks, Routines, Bot threads,
  Library and Changes to every user. Opening a page makes it the main content
  and identifies the selected destination. These are not optional interview
  features. Routines, [Library](library.md), [Team map](team-map.md) and
  [Bot threads](messaging.md) own their content, as do [Tasks](tasks.md) and
  [Changes](changes.md); this section adds no data editor of its own.
- **R2 — State.** Tools is a collapsible sidebar group. Its expanded/collapsed
  state is local to app profile and daemon origin and survives reopening when
  profile storage is available. Collapsing does not leave the current page,
  change config or remove data. Another destination can still be reached after
  expanding. Settings is a separate entry, not hidden by Tools collapse.
- **R3 — Return.** Bot/session selection remains available from a Tools page;
  navigating away does not send text, archive sessions or alter the selected
  page's files. Page failures are visible rather than a successful empty list.
  All destinations are pointer-accessible; there is no shortcut prerequisite.

## Controls

| Role | Accessible name | Scope, action and observable state |
| --- | --- | --- |
| button | Tools | Sidebar group heading; expanded state. |
| region | Tools | Visible destination group when expanded. |
| button | Team map | Tools region; opens team-map, pressed when current. |
| button | Tasks | Tools region; opens Tasks, pressed when current. |
| button | Routines | Tools region; opens routines, pressed when current. |
| button | Bot threads | Tools region; opens bridge list, pressed when current. |
| button | Library | Tools region; opens shared files, pressed when current. |
| button | Changes | Tools region; opens change history, pressed when current. |

## Edge cases

- **E1 — No bots or files.** Tools is still available. Page-owned empty states
  must follow successful reads, not conceal an unreachable daemon.
- **E2 — Reopen.** Reopening the same profile/origin preserves group collapse;
  another profile/origin may use the default expanded state. No global config
  write is involved. Choice features do not remove these six destinations.
