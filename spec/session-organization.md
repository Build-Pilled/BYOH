# Session folders and archive

Classification: Core. Prerequisites: [sessions](sessions.md), [shell](ui-shell.md), [status](status.md).

## Purpose

Organize a bot's sessions without adding folder names to model context. Soft
archive is a visibility flag, not deletion or [session tidy](session-tidy.md).

## Required behaviour

- **R1 — Folder metadata.** Per-bot `sessions/index.json` holds ordered folder
  names; each session metadata has folder string or null. UI New folder trims
  input and adds a nonempty not-already-present name. Existing names are
  refused without changing index/session bytes; simultaneous creation cannot
  replace another folder or lose its membership. This create-only rule does not make a new session id a reusable directory name. Folder membership is a
  label, not an on-disk directory move or nested context hierarchy. Owner
  `PUT /bots/<id>/folders` sets the folder list and clears memberships absent
  from it; `POST /bots/<id>/folders/rename` takes from/to and renames memberships
  as well as index. Reject blank destination, missing source or duplicate
  destination with 400. `DELETE /bots/<id>/folders/<name>` removes the label,
  returning sessions to unfiled without deleting them.
- **R2 — Tree.** Show non-archived sessions grouped under folders, collapsible
  with counts and New session in <folder>. Unfiled sessions initially show the
  current session plus Show all <n> sessions; expanded shows the rest in the
  session list's recency order. Show fewer restores compact display. Empty
  folders stay visible. Dragging a session to a folder/unfiled or choosing Move
  to <folder>/Remove from folder updates only that session's folder metadata.
- **R3 — All sessions.** Header All sessions opens a bot-local finder with title
  substring search, origin filter (All origins, Person, Bot, Routine, Fork) and
  Include archived checkbox, initially off. Search is case-insensitive and
  does not search content; [search](search.md) owns cross-thread content search.
  Results open exact UUIDs. Count beside All sessions excludes archived threads.
  Outside/Close dismisses without changing data.
- **R4 — Row actions.** Session actions offers Copy thread ID (`<bot>/<uuid>`),
  Rename, Duplicate ([conversation branching](conversation-branching.md) owns
  its effect), Move to <folder>, Remove from folder when filed, status-owned mark
  actions, Archive/Unarchive and Delete. Rename accepts a trimmed nonempty
  title via `PATCH /sessions/<bot>/<sid>` without changing UUID. Archive toggles
  archived via PATCH; it hides from ordinary tree/aggregate but remains readable
  in finder/search and does not stop a process or delete messages. A subsequent
  turn start unarchives. Deleting requires explicit irreversible warning:
  transcript is not in instruction history and cannot be recovered by it. If
  unstarted branches still read the session, the warning names them
  ([conversation branching](conversation-branching.md) R8).
  [sessions](sessions.md) owns deletion artifacts. Deleting the open session
  returns to the bot's unselected chat, not a send to some other session.
- **R5 — Independence.** Folder/title/archive edits persist across daemon/app
  restart but do not alter transcript bytes, prompt, queue input or bot id.
  Confirmation cancellation, empty new name/title and menu dismissal make no
  write. Removing a folder retains its sessions/transcripts. Not all metadata
  operations are multi-file atomic; report failures rather than claiming rollback.

## Controls

Every session row/finder result is scoped as `Session <bot>/<sid>`. Folder scopes
are `Folder <bot>/<name>`; same titles never become ambiguous test selectors.
Shared shell owns New session and bots; this section owns New folder and rows.

| Role | Accessible name | Scope, action and observable state |
| --- | --- | --- |
| button | New folder | Bot row; opens dialog New folder. |
| treeitem | Folder <bot>/<name> | Expanded state and non-archived count. |
| treeitem | Session <bot>/<sid> | Exact session row; selected state, title visible. |
| button | Session actions | Within Session scope; opens menu of same name. |
| button | Folder actions | Within Folder scope; opens menu of same name. |
| button | New session in <name> | Folder row; creates/opens filed person session. |
| treeitem | Show all <n> sessions / Show fewer | Bot unfiled list; expanded state. |
| button | All sessions | Conversation header; expanded when finder open. |
| dialog | All sessions | Bot-local finder. |
| searchbox | Search sessions | Finder title search. |
| combobox | Origin | Finder, origin values in R3. |
| checkbox | Include archived | Finder; checked includes soft archives. |
| button | Open <bot>/<sid> | Finder result, within Session scope. |
| button | Close | All sessions dialog only. |
| menu | Session actions / Folder actions | Respective row; outside dismissal. |
| menuitem | Copy thread ID / Rename / Duplicate / Archive / Unarchive / Delete | Session actions; applicable archive action only. Duplicate opens the new branch. |
| menuitem | Move to <name> / Remove from folder | Session actions, applicable targets only. |
| menuitem | Rename / Delete | Folder actions. |
| dialog | New folder / Rename folder | Individually named prompts; textbox Name, OK, Cancel. |
| dialog | Rename session | textbox Title, OK, Cancel. |
| textbox | Name / Title | Individually named within matching dialog. |
| button | OK / Cancel | Creation/rename dialog. |
| dialog | Delete folder / Delete session | Individually named confirmations; consequences in R4/R5. |
| button | Delete / Cancel | Delete confirmation; confirm or preserve data. |

## Edge cases

- **E1 — Orphaned label.** A session whose folder is absent from index is shown
  unfiled. Rename into another existing folder is rejected, not merged. A new
  session in a folder does not inherit another session's conversation context.
- **E2 — Soft archive.** Archived sessions stay in title/content search and can
  be unarchived without restoring a tidy manifest. Tidy restoration is a
  different operation. Opening an archive need not unarchive it.
- **E3 — Races and duplicates.** Equal session titles are permitted; controls
  use UUIDs. A deleted/missing row errors rather than operating on a different
  session. Failed clipboard copy is not a Copied success indication.

| Id | Given | When | Expect |
| --- | --- | --- | --- |
| **T1 — Copy identity, not title** | Session rows have duplicate titles | Copy thread ID, repeat the copy, or encounter a clipboard failure | Copy the selected bot/full UUID, never another row's identity. A failed clipboard write never reports Copied success (R4, E3). |
| **T2 — Compact and expanded unfiled sessions** | Current, other unfiled, filed and soft-archived sessions | Show all/Show fewer, or move a session to folder/unfiled | Compact view keeps the current unfiled session visible; expanded view shows the rest in recency order. Ordinary tree/counts exclude archives and retain empty folders. A move changes only that session's folder metadata, not transcript/context (R2, R4, R5). |
| **T3 — Find archived or matching sessions** | Matching titles, duplicate titles and archives | Use All sessions filters or global search | Finder is bot-local, case-insensitive title search with origin/archive filters; results open exact UUIDs. Global search replaces ordinary navigation and includes soft archives under its own rules, without sending the query (R3; [search](search.md) R1–R4). |
| **T4 — Row edits and soft archive** | Selected session and other sessions with retained transcripts | Rename/move/archive/unarchive, cancel/confirm deletion, or start a later person/bot/routine turn | Target exact identity; metadata edits persist without changing transcript/prompt/queue input. Archive hides from ordinary navigation but does not delete/stop it; turn start unarchives. Cancelled edits/confirmations write nothing; deleting the open session returns to unselected chat, never another send target (R4, R5, E3). |
