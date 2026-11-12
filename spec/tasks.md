# Tasks view

Classification: Core. Prerequisites: [tools](tools.md) and the [shell](ui-shell.md); [starter bots](starter-bots.md) for the writer; the exact pinned Node 26.

## Purpose

Show the work the starter Firstmate has handed out, and the decisions it has put
to the person, from one local table, and allow only narrow corrections. It is a
screener over a table, not a task system: the daemon neither assigns work nor
messages a bot about a task, and the table is written by the crew
([starter bots](starter-bots.md) R2), not created by the daemon. [Tools](tools.md)
owns the entry button.

## Required behaviour

- **R1 — The table contract.** Tasks are rows of table `tasks` in the SQLite file
  `<home>/tasks/factory.db`. The view requires these 13 columns and reads any
  others it finds. The shared interface between writer and view is this table:

  | Column | Type | Meaning |
  | --- | --- | --- |
  | `id` | TEXT, primary key | Unique id; ids ending `-<digits>` share a family prefix. |
  | `kind` | TEXT, not null | Free text; `decision`, `scout` and `ship` have chips, `decision` has the R7 rule. |
  | `title`, `prompt` | TEXT, not null | Short title; the brief that was handed off. |
  | `project_id`, `repo`, `branch` | TEXT, null allowed | Grouping and source pointers. |
  | `status` | TEXT, not null | Known: `queued`, `underway`, `blocked`, `done`, `cancelled`; any other value is shown. |
  | `gate_kind` | TEXT, null allowed | `after-task`, `at-time`, `captain` or null (none). |
  | `gate_ref` | TEXT, null allowed | The gating task id, time or note. |
  | `result` | TEXT, null allowed | Outcome and report pointers; only appended to through this view. |
  | `created_at` | INTEGER, not null | Unix seconds. |
  | `updated_at` | INTEGER, null allowed | Unix seconds; null means never updated. |

  The daemon never creates the file or the table, runs no schema or migration and
  adds no trigger. The writer owns the schema and may add columns, indexes or
  triggers; a trigger that rejects a write is the writer's rule, and the view
  reports the refusal (R8). Open means `status` not in (`done`, `cancelled`); it
  is not a fixed list of words.
- **R2 — The writer and what the spec relies on.** The starter Firstmate records each
  task it hands off, and each decision it puts to the person, as a row through its
  seeded project-management skill, which creates the file and the table on first
  use ([starter bots](starter-bots.md) R2). The writer sets `created_at` on insert and
  sets `updated_at` to the current unix seconds on every update, so a change is
  always visible to the stale check in R8. The daemon uses only the built-in
  `node:sqlite` module of the pinned Node 26 (exact version; Node documents it for
  26 as release candidate, no flag needed), with no third-party SQLite package.
  The host also provides the `sqlite3` command and `jq` for the crew's skills:
  the seeded `factory-db` wrapper and bearings scripts rely on them. A change
  of the Node pin re-proves the module before it lands.
- **R3 — Reading.** Owner `GET /tasks` returns `{exists, tasks, pending}` from one
  consistent read of a read-only connection; a missing file is `exists: false`
  with empty lists and is never created. Each task record carries `row` (every
  column), `loaded` (the same values exactly as read, a BLOB as tagged base64),
  `readOnly` (text fields whose bytes are not valid UTF-8) and a stable `key`;
  `pending` holds the keys of the open rows. Text stored as a BLOB is decoded as
  UTF-8 for display and search without changing the file. An unreadable or locked
  file (after a five-second wait), a file that is not a database, or a database
  with no `tasks` table is an error response with its reason, never an empty
  snapshot. The directory, the database and the edit journal (R8) must each resolve,
  link by link, to a place inside the home: a link that leads outside is refused
  for reading and for writing, with an error naming the path, and an action is
  refused before it writes anything, to the database or the journal. Nothing
  outside the home is touched. The page loads on open, on Refresh and after its own edits. It does not
  watch the file and sends no message, notification or bot input.
- **R4 — Screening.** The header shows `<n> tasks · <m> open · <p> projects`. Search
  splits the query on spaces; every word must be a case-insensitive substring of the
  id, title, prompt, result, branch or repo. A row whose id equals the whole query
  is pinned first, and a match outside id and title is tagged with the field (`in
  prompt`). Five **screens** set the filters and sort together: Open; Recently
  created (created, newest first); Recently updated; Waiting on you (open rows
  where `kind` is `decision` or `gate_kind` is `captain`); Blocked. A search or sort
  keeps Waiting on you until another screen, a filter or Clear all changes it.
  **Chips** toggle Open, each status seen, and each kind; a **Project** and a
  **Gate** choice complete the filters ("Any gate", "none", and each gate kind
  known or seen). Chips show live counts that respect the other active filters.
  Columns ID, Title, Kind, Status, Project, Gate, Created and Updated sort both ways;
  the default is Updated, newest first, a null `updated_at` counting as
  `created_at`, ties broken by id. A gate reference that is another task's id
  opens that task; other references stay text.
- **R5 — Detail.** Choosing a row opens a panel beside the table, leaving the
  filters usable. It shows every column under its database name, explicit NULLs,
  unix seconds with the local date and time, the full prompt and result with web
  addresses as links that open the system browser only on an explicit click
  ([shell](ui-shell.md) R6), and three lists: Gated on, Gated by, and Same ID family.
  Invalid UTF-8 is shown with replacement characters and labelled read-only.
- **R6 — Editing.** Only `title` and `prompt` can be edited, through Edit title
  and prompt, then Save or Cancel. Save is off until something changed, and only
  changed fields are sent. Editing an underway row warns that the record changes
  but the bot already working keeps its original instructions. A read-only field
  cannot be edited. Owner `PATCH /tasks/<id>` with `action` `edit` and `title` or
  `prompt` is the call; any other field is 400.
- **R7 — Marking done or cancelled.** Mark done and Cancel task each ask for
  confirmation and an optional reason (required for a `decision` marked done).
  The confirmation says that the result gets a line and that no bot is messaged.
  Confirming sets `status` to `done` or `cancelled` and appends to `result`, after
  a newline, the line `Person YYYY-MM-DD (via Tasks): marked done` or `...:
  cancelled`, followed by ` — <reason>` when one was given; the date is the
  daemon's local calendar date. Marking done a done row, or cancelling a cancelled one,
  is refused and not offered, so no empty line is appended. A result that is
  not valid UTF-8 refuses both actions. The call is `PATCH /tasks/<id>` with `action`
  `done` or `cancel` and optional `reason`.
- **R8 — Safe writes.** Every write sends the whole row as loaded and its
  `updated_at`. The daemon opens one exclusive transaction (five-second wait),
  compares every column of the current row with the loaded one, null-safely, and
  answers 409 `changed since you loaded it, reload` on any difference, including a
  change that did not touch `updated_at`; a vanished row is 404. It then writes only
  the changed fields, sets `updated_at` to the current unix seconds, and appends
  one JSON line per changed field to `<home>/tasks/task-edits.jsonl`:
  `{ts, id, field, old, new, by: "person", via: "tasks-ui"}`, one action sharing
  one `ts`. If the transaction fails the lines it added are removed; a rejected
  write logs nothing. A trigger or constraint refusal is shown with its message.
  The view never creates, deletes or re-keys a task, never edits a project and
  never writes another column.
- **R9 — Names and exclusions.** The gate value for the person is `captain`;
  the result line, journal `by` value and screen Waiting on you keep the neutral
  names above. The directory and file are
  `tasks/` and `factory.db`. The file, its journal and the Tasks data are runtime data, outside
  instruction history ([instruction history](instruction-history.md) R4,
  [home](home.md)).

## Controls

Names are fixed by this spec and the page is fully pointer-operable; no shortcut
is required. Rows are scoped by id: `Task <id>`.

| Role | Accessible name | Scope, action and observable state |
| --- | --- | --- |
| heading | Tasks | Page title. |
| status | Task counts | The header counts in R4. |
| button | Refresh tasks | Header; repeats R3, disabled while loading. |
| searchbox | Search tasks | R4 query, filters as you type. |
| button | Open / Recently created / Recently updated / Waiting on you / Blocked | Region Screens; the active screen is pressed. |
| button | <status> <n> / <kind> <n> / Open <n> | Region Filters; pressed when on, count in the name. |
| combobox | Project / Gate | Region Filters; values in R4. |
| button | Clear all | Region Filters; removes search, screens and filters. |
| table | Tasks | Sortable table; the footer shows `<shown> of <all> tasks`. |
| button | Sort by <column> | Column header; sets `aria-sort` ascending or descending. |
| row | Task <id> | Selected when its panel is open; the whole row opens the panel. |
| complementary | Task detail | The R5 panel for one task. |
| button | Close task detail | Panel. |
| button | Edit title and prompt | Panel; disabled when both fields are read-only. |
| textbox | Task title / Task prompt | Edit mode; disabled when read-only. |
| button | Save / Cancel | Edit mode; Save off while unchanged. |
| button | Mark done / Cancel task | Panel; hidden for a row already in that state. |
| group | Confirm task status | The R7 confirmation. |
| textbox | Task reason | Confirmation; required for a decision marked done. |
| button | Confirm done / Confirm cancellation / Back | Confirmation; Back writes nothing. |
| button | <task id> | In Gated on, Gated by and Same ID family, and a gate reference that is a task id; opens that task. |
| alert | Tasks error | A load or save failure with its reason; button Reload follows R8's wording for a stale row. |
| button | Reload | Inside the alert; repeats the read. |

## Edge cases

- **E1 — No file.** A missing `factory.db` shows `No task table yet.` with no
  error; the view does not create it. An empty table says `No tasks yet.`; a filter
  with no match says `No tasks match these filters.` A load error is shown as an
  alert, distinct from these.
- **E2 — Stale row.** A row changed by the crew after it was loaded makes Save or
  Confirm answer `Changed since you loaded it.` with Reload; nothing is written
  and nothing is logged. Reload shows the current row and the person redoes the
  action.
- **E3 — Two edits.** Two windows editing the same row: the second to submit gets
  E2. Edits of different rows do not conflict.
- **E4 — Odd values.** Unknown statuses, kinds and gate kinds are shown and
  filterable; NULL and the literal text `NULL` stay distinguishable; a BLOB with
  invalid UTF-8 is read-only; a task id with unusual characters is addressed by its
  exact value. Nothing else about a row is changed by looking at it.
- **E5 — Unavailable SQLite.** If the running Node cannot load its built-in
  SQLite module, the page shows that error. It does not claim an empty table, and
  no task file is touched.
- **E6 — Writer and reader at once.** The crew inserting or updating while the page
  is open is seen on the next Refresh or reload, not live; a write the writer is
  holding is waited for up to five seconds and then reported.

| Id | Given | When | Expect |
| --- | --- | --- | --- |
| **T1 — Narrow edit and whole-row stale check** | Owned task row loaded with NULLs, valid/invalid UTF8 and BLOB bytes, possibly changed without a timestamp bump | Edit title/prompt or submit stale/forbidden-field data | Apart from the R8 timestamp/journal, change only editable title/prompt fields; preserve all other bytes/types, result and status. Compare every loaded column null-safely in the R8 exclusive transaction, not updated_at alone; stale 409 or vanished 404 writes/logs nothing. Invalid UTF8 fields stay read-only and no task is created/deleted/re-keyed (R3, R6, R8, E2–E4). |
| **T2 — Outcome append and journal belong to the action** | Existing result/history, decision or ordinary row and a writer trigger that can refuse an update | Confirm done/cancel with optional/required reason; repeat the same status or force transaction failure | Require a decision-done reason, preserve prior result and append the exact neutral R7 Person/date/action line rather than replace it. Same-status/invalid-UTF8-result refusal adds no line. Set updated_at to unix seconds and journal each changed action field with R8 old/new/person/tasks-ui and one shared ts; rejected/failed transaction removes its added lines and reports the refusal. No bot is messaged (R2, R7–R9). |
