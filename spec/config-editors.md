# Configuration editors and bot panel

Classification: Core. Prerequisites: owner app/API, [home](home.md), [bots](bots.md), selected adapters.

## Purpose

Inspect and edit the actual instruction/configuration files, with visible drafts,
validation and conflict resolution. This section owns the bot panel and shared
file editor used by Settings, Skills & MCP, routines and team-map. It does not make
editing an OS permission boundary or promise atomic multi-file transactions.

## Required behaviour

- **R1 — Panel.** Configuration opens the current bot's right panel without
  changing the selected conversation. Offer Overview, Identity, System prompt,
  bot.toml, Skills, Routines, Tools & MCP, Model, Limits, Notes and History.
  Each section expands independently. Opened by Configuration or the bot's Edit
  configuration action, the panel starts with every section collapsed, Overview
  included; opened by the bot's Routines action only Routines is expanded, and
  by its Skills & notes action only Skills and Notes ([shell](ui-shell.md)).
  Search bot settings filters label/keywords and expands matching sections
  while searching. Clear query to restore the chosen expansions. Widen/narrow changes only layout; Close returns to chat.
  Overview is read-only: description, team/roster/bridge reach and live process
  counts, not an implicit grant of new reach. History links relevant bot/team
  commits to Changes; [instruction-history](instruction-history.md) owns history.
- **R2 — One draft.** Structured bot fields and raw bot.toml edit the same text
  draft, preserving unrelated keys/comments where possible. Identity owns Name,
  Description (newlines flattened, visible 200-character lead preview), mark
  reroll/reset. Tools & MCP exposes adapter-applicable built-in tools/defaults,
  web tools, configured MCP selections, working directory and Context files;
  [MCP](mcp.md) and adapter sections own meanings. Skills offers shared-skill
  switches plus local files; Notes are not automatically prompt context. Limits
  has Live processes and Idle timeout with schema defaults. Model autosave is
  exclusively [model-picker](model-picker.md); other fields require Save.
  Invalid raw TOML shows its parse error and repair path, not a fabricated
  valid form. Unchosen adapters add no knobs.
- **R3 — File editor.** `GET /files/<home-relative-path>` reads text;
  `PUT /files/<path>` replaces the ordinary editable file, creates missing
  parents and reports path, commit and validation problems. Save writes current
  draft, reloads configuration and records attributed history where tracked.
  Show unsaved/new-file state, path, validation errors and save errors. Save is
  disabled while clean; a successful write can still have config problems.
  `POST /validate` takes path/text and reports problems without saving. TOML,
  Markdown and plain text have editable multiline surfaces, not HTML execution.
  SYSTEM.md shows a read-only assembled prompt preview from its draft plus the
  harness block/skills; preview is not a saved file or a model call.
  The generic deletion and listing routes are `DELETE /files/<path>` and `GET /list/<path>`.
- **R4 — External changes.** Clean editors refresh from disk on change. Dirty
  editors keep their draft and report a conflict when disk differs from the
  loaded version. Reload replaces draft with observed disk bytes; Keep mine
  acknowledges that version while keeping the draft dirty for a subsequent
  ordinary Save. Neither conflict action alone writes. Ordinary Save retains
  replacement semantics, even if the person chooses to overwrite a detected
  conflict; it is not atomic concurrency protection. Failed Save retains draft.
  Closing/unmounting/reloading may discard unsaved editor text; do not claim
  durable draft recovery or save on dismissal. Model's immediate save has its
  separate compare-before-write rule.
  Save captures the draft when pressed, even when queued behind a model save.
  Edits entered after that press remain unsaved in the draft after completion;
  they are neither discarded nor included without another Save.
  This applies while the editor stays mounted; the closing/unmounting/reloading
  caveat above is unchanged.

- **R5 — File boundary.** Generic files/list operations are owner-authenticated
  and confined to the selected home. Normalize lexical paths; reject traversal,
  `.git` paths and daemon-owned paths: bot sessions, bridge log.jsonl, log/,
  credential directory secrets/ and their descendants. Also reserve bin/ and
  companion/ if present; this does not install those deferred producers.
  Apply case-insensitive compatibility-normalized protected-name checks to
  lexical and canonical paths. Resolve the existing prefix even for a missing
  target and refuse symlink escapes outside home for read, write, delete and
  list; ordinary in-home nonprotected symlinks remain editable. Denials are 400,
  name the requested link/path and leave files unchanged. `GET` missing file is
  404. Listing must not descend through protected/escaping links or return
  their contents. This data-safety confinement is not a change to
  native engine skill loading from disk.
- **R6 — Local files and creation.** List nested local skill/note files by sorted
  relative path; selecting a row opens the shared editor. New skill creates
  `bots/<id>/skills/<name>/SKILL.md` with the same scaffold properties as
  [Skills & MCP](skills-mcp.md); New note creates empty `bots/<id>/notes/<name>.md`.
  New routine asks File name and Schedule (default `0 9 * * *`), creating a
  disabled routine with that name/schedule and a placeholder message body.
  The [routines](routines.md) section owns the routine form and run rules. There is no routine Delete button; ordinary generic
  file deletion remains available to the owner API, not a new panel action.
  All three New dialogs are create-only: existing paths show a named error
  with unchanged bytes; independent concurrent dialogs cannot replace a
  winner's file. This data-safety rule does not
  change ordinary editing PUT semantics or prescribe a new wire API. Cancel
  or empty name makes no write. Successful creation selects the created item.
- **R7 — Shared actions.** FileBar offers Open in VS Code and Copy path for the
  host path under [shell](ui-shell.md)'s remote-file policy. No Mac-local file
  picker/reveal is substituted for host paths. Shared skill assignment changes
  only the draft until Save. Selecting a file does not enable tools, install a
  skill or send its body. File read/list errors are not proof of empty content.

## Controls

Every shared editor is scoped by region `File <home-relative-path>`. Panel field
names are unique within its expanded section; repeated skill/MCP switches use
the directory/server name with the prefix below. Dialog buttons are unique in
the open dialog. No delete action is added to general skill/note file rows.

| Role | Accessible name | Scope, action and observable state |
| --- | --- | --- |
| complementary | Bot panel <id> | Right panel for this bot. |
| button | Widen panel / Narrow panel | Panel heading, switches width. |
| button | Close | Panel heading; no implicit save. |
| searchbox | Search bot settings | Panel filter, no-match text when empty result. |
| button | Overview / Identity / System prompt / bot.toml / Skills / Routines / Tools & MCP / Model / Limits / Notes / History | Individually named section headings; expanded state. Model content owned by model-picker. |
| textbox | Name / Description / Working directory / Idle timeout | Individually named structured fields within their section. |
| spinbutton | Live processes | Limits section, minimum one. |
| button | Reroll mark / Reset mark | Identity; draft seed change/removal. |
| switch | Defaults | Tools & MCP; default built-ins versus explicit list. |
| switch | read / bash / edit / write / grep / find / ls | Explicit built-in tool names when Defaults off. |
| switch | web_search / web_fetch | Claude-selected route only; unavailable for Pi. |
| switch | Context files | Tools & MCP; selected-adapter semantics. |
| switch | MCP <name> | Tools & MCP; checked for selected server in draft. |
| switch | Shared skill <name> | Skills; checked when assigned in draft. |
| button | Open in VS Code / Copy path | Shared skills folder actions, or shared File region actions. |
| region | File <home-relative-path> | Shared editor path, dirty/conflict/problem state. |
| textbox | File contents | Multiline editor within File region. |
| region | Prompt preview | System prompt section; read-only assembled bytes. |
| button | Save | File region; disabled when clean; writes draft, not proof of valid config. |
| button | Reload / Keep mine | Conflicting File region; discard or retain draft, no write. |
| button | Open <relative-path> | Local Skills/Notes section; expanded when editor open. |
| button | New skill / New note / New routine | Opens corresponding dialog, R6. |
| dialog | New skill / New note / New routine | Individually named create-only dialogs. |
| textbox | Name | New skill/note dialog. |
| textbox | File name / Schedule | New routine dialog fields. |
| button | OK / Cancel | Open creation dialog; create or dismiss. |
| button | Routine <name> | Routines section card; expands owned Routine editor. |
| switch | Enable routine | Within region Routine <bot>/<name>; immediate enable/disable, routines owns semantics. |
| button | Change <sha> | History section; opens that diff, commit message/date visible. |

## Edge cases

- **E1 — Conflict is not a lock.** Two clients can save successively and the
  later ordinary Save wins. Do not describe polling/events as atomic conflict
  protection. Keep mine without Save leaves disk bytes unchanged.
- **E2 — Symlink and protection.** An out-of-home linked skill can still be
  loaded by native skill discovery, but app editor/list access is refused with
  a link-naming error. The spec/starter set prescribes no such installation.
  Test missing leaves via external links and aliases to protected paths too.
- **E3 — New and save failures.** Duplicate/racing creates preserve bytes;
  permission errors and failed list reads are visible. A malformed saved bot
  config uses the limited last-good rules of home, not a cached SYSTEM.md.
  Save/history are not promised atomic if history recording fails after write.

| Id | Given | When | Expect |
| --- | --- | --- | --- |
| **T1 — Entry selects expansions, not a save** | Bot panel closed with its current conversation selected | Open Configuration/Edit configuration, Routines, or Skills & notes | Offer R1 sections including Overview and bot.toml. Configuration/Edit configuration starts all collapsed; Routines expands only Routines, Skills & notes only Skills and Notes. Sections expand independently, without changing the conversation or implicitly writing a draft. Overview remains read-only, not a grant of reach (R1–R3). |
| **T2 — Save captures the press** | Mounted dirty editor with an ordinary Save request held in flight | Press Save, then type additional edits before it completes | Save the draft captured at the press. Keep later edits unsaved in the mounted draft after completion, neither discarded nor silently included without another Save; retain the close/unmount/reload discard caveat and ordinary replacement semantics (R3, R4, E1). |
| **T3 — Queued Save still captures its press** | Mounted dirty editor with a model-only save ahead of ordinary Save | Press ordinary Save while queued, type later, then release the model write | Capture ordinary Save at its press, not when its queued write starts. Preserve post-press edits unsaved after completion; this editor serializes writes without extending ordinary Save to cross-client CAS or overriding its discard caveat (R2–R4, E1; [model picker](model-picker.md) R3). |

Proof: `suite/config-editors.mjs` sends owner read, write, delete and list requests for traversal, symlink-escape, `.git` and protected paths, reads the 400 naming the path, compares files inside and outside the home before and after, and reads that an ordinary symlink inside the home is still served. Evidence: JSON.