# Changes view

Classification: Core. Prerequisites: [instruction history](instruction-history.md) (recording, attribution and the revert rule), [tools](tools.md), the [shell](ui-shell.md).

## Purpose

Let the person see who changed a bot's instructions, skills, routines, teams or
connections and when, read exactly what changed, and undo a change without
rewriting history. [Instruction history](instruction-history.md) owns what is
recorded, attribution, the exclusions and the revert behaviour; this section owns
the page that lists, shows and reverts changes, and the exact guards on the two
owner calls behind it.

## Required behaviour

- **R1 — Change list.** Tools → Changes ([tools](tools.md)) shows the latest 100
  recorded changes, newest first. A row shows the change's message, its
  attributed author (`user`, `bot:<id>` with that bot's mark, or `external`), its
  age, and a `prompt` badge when it touched a prompt-bearing path: a bot's
  `SYSTEM.md` or `bot.toml`, anything under `teams/`, or any `skills/` directory.
  Age reads `now`, minutes, hours or days up to 30 days, then a local date.
  Owner `GET /changes?limit=<n>` (default 50) returns the metadata for the list;
  `limit` must be a positive integer, otherwise 400 with nothing run. New changes
  appear without reloading the page, and a revert refreshes it, but neither
  moves the person's selection.
- **R2 — Selection and links.** Choosing a row makes that change current and
  puts its id in the page address, so a copied link or a reload returns to it. With
  no choice, the newest change is current. A change older than the loaded 100 still
  opens by its link; the list then shows no selected row.
- **R3 — Diff.** The current change shows its full id, author, date, message and
  text diff, from owner `GET /changes/<sha>`. File headers, hunk markers, added
  and removed lines are told apart by styling and by their leading characters
  (`+`, `-`), so colour is not the only signal. The text is shown verbatim as text,
  never interpreted as Markdown or HTML and never fetched from anywhere. `<sha>`
  must be 7 to 40 hexadecimal characters that name a recorded change: any other
  value is 400 and an unknown one is 404, and no history command is run with
  it: passed to Git unchecked, a value shaped like an option would be
  read as one (for example, one that makes Git write its output to a path of
  the caller's choosing, outside the home).
- **R4 — Revert with consent.** Revert opens a confirmation that names the short
  id, message and author and lists the files the change touched (from its
  metadata). It says that a new change is added that undoes this one, that files
  the change added are removed and files it deleted return, that the original
  stays in history, and that restored instructions apply to running
  conversations on their next turn. Cancel, the close control or an outside click
  makes no request. Confirm sends owner `POST /changes/<sha>/revert`, which
  follows [instruction history](instruction-history.md) R6 (an ordinary inverse
  change attributed `user`; effective configuration reloaded and its
  diagnostics shown by the shell; a conflicting inverse abandoned with files and
  history exactly as before and an error naming the conflicting paths). A
  success shows the new change at the top of the list and a status line naming
  its short id. The same `<sha>` rule as R3 applies. Revert is disabled while a
  request is pending, so one confirmation makes at most one new change.
- **R5 — Failures are visible.** A list, diff or revert request that fails shows
  its message in an alert with a Reload button; it is never drawn as an empty
  list, a blank diff or a revert that seems to have happened. An empty successful list says no changes are
  recorded yet. The page is pointer-operable; no shortcut is required.
- **R6 — Only recorded instructions.** The page shows nothing outside the
  recorded history: no session transcripts, queues, tidy archive, runtime
  records, Tasks data or credentials ([instruction history](instruction-history.md) R4).

## Controls

The Changes destination button is owned by [tools](tools.md). Repeated rows are
scoped by short id (`Change <sha7>`), so equal messages are never ambiguous.

| Role | Accessible name | Scope, action and observable state |
| --- | --- | --- |
| heading | Changes | Page title. |
| listbox | Changes | Newest first; each row is an option. |
| option | Change <sha7> | One row; selected when current; message, author, age and any `prompt` badge are its text. |
| region | Change <sha7> | Detail of the current change: header, diff and Revert. |
| region | Diff | Verbatim diff text of the current change. |
| button | Revert | Detail region; opens Revert change, disabled while pending. |
| dialog | Revert change | Confirmation in R4 with the file list; closes without a request on Cancel. |
| button | Revert / Cancel | Revert change dialog; confirm or dismiss. |
| status | Reverted | Names the new change after success. |
| alert | Changes error | Message for a failed list, diff or revert, with button Reload. |
| button | Reload | Inside the alert; repeats the failed read. |

## Edge cases

- **E1 — Conflict.** If later edits make the inverse conflict, the error names the
  conflicting paths and says nothing was changed. Instruction bytes and history
  are exactly as before, no conflict markers or half-finished revert remain, and
  a normal edit afterwards still records.
- **E2 — Restoring invalid content.** A revert may restore invalid TOML or a
  broken skill. It is still recorded; the shell's diagnostics and last-good rules
  apply ([home](home.md) R5), and the page does not repair anything.
- **E3 — Nothing to undo.** Reverting a change whose inverse is already in place,
  or one that would leave no difference, is refused with Git's reason and adds no
  new change. Reverting a revert is allowed and restores the earlier content.
- **E4 — Unrecorded edits.** If the files the revert would touch have edits not
  yet recorded, the revert is refused with the reason and nothing changes; try
  again after those edits are recorded (a short sweep, [instruction
  history](instruction-history.md) R3).
- **E5 — Deleted and first changes.** Reverting the first recorded change or a
  deletion is offered like any other; the confirmation's file list shows what
  would be removed or restored before the person confirms. Deleted bots'
  files remain in history ([instruction history](instruction-history.md) E3).
- **E6 — Busy bots.** A revert does not stop a running turn or send input;
  restored instructions apply from the next turn.
