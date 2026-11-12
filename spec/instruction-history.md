# Attributed instruction history

Classification: Core. Prerequisites: initialized home with working Git.

## Purpose

Make prompt-bearing changes inspectable and reversible without presenting
runtime transcripts or credentials as instruction history. This section owns
recording and attribution; the [Changes](changes.md) section owns its browsing/diff
and revert controls.

## Required behaviour

- **R1 — Local record.** Home initialization starts a local Git repository.
  Record bot instructions/configuration, local and shared skills, routine
  definitions, shared MCP definitions, team configuration and bridge link
  definitions when changed.
  Include additions, modifications and deletions. No-op saves create no fake
  change. The history is local, not an upstream or remote backup.
- **R2 — Attribution.** A change saved through the person's app/API or CLI is
  attributed `user`; an identified bot tool change is `bot:<id>`; unclaimed
  disk changes are `external`. Attribute direct write/edit tool paths through
  the authenticated bot's change notification rather than trusting an arbitrary
  body-supplied author. Best-effort tool notifications cover known write/edit
  operations; shell writes without one can correctly appear as external.
  History attribution is provenance, not an OS security boundary between bots
  sharing a user account.
- **R3 — External and active changes.** Detect tracked-scope disk changes while
  the daemon runs, with a settling delay for editor writes and a periodic safety
  sweep (about a minute). Grouping nearby writes into one change is allowed.
  A bot's actively held/touched paths wait for its attributed commit boundary
  rather than being prematurely assigned external. Startup sweeps unrecorded
  changes. Do not require a commit per streamed tool delta.
- **R4 — Exclusions.** Do not put session metadata, transcripts, scratch,
  attachments, delivery queues, bridge message logs, generated `log/` files,
  the task table and its edit journal under `tasks/` ([Tasks](tasks.md)) or credentials in
  instruction history. [Home](home.md) owns initialization
  ignore rules. The tidy archive is also runtime, excluded after its move
  inside the home. Exclusion from history is not encryption or
  backup; sensitive prompt text deliberately saved in instructions is retained
  in history even after an ordinary edit deletes it.
- **R5 — Inspection.** `myharness log` works offline and prints up to thirty
  changes, newest first, each with short SHA, timestamp, attributed author and
  message. Owner GET `/changes?limit=<n>` returns change metadata (`sha`,
  `author`, `date`, `message`, `files`); GET `/changes/<sha>` returns that
  change's text diff with identity/time/message. Inspection never invokes a model.
- **R6 — Reversal.** Owner POST `/changes/<sha>/revert` attempts an ordinary
  inverse commit and returns the new commit id. Preserve the original history;
  this is not reset/force rewriting. Reload effective configuration and expose
  resulting diagnostics. If the inverse conflicts, abandon the attempted
  revert: instruction file bytes and history remain exactly as before the
  attempt, with no conflict markers or pending revert left behind. The error
  names the conflicting paths and says nothing was changed. Subsequent normal
  history recording must still work. Do not automatically resolve
  conflicts or discard unrelated files. Other Git errors are visible, never
  invented successful commits. The [Changes](changes.md) section owns user confirmation.
- **R7 — Recording failure.** Git errors name the failed operation and are
  surfaced/logged rather than inventing a SHA. A file write can already have
  succeeded before recording fails: do not claim failure rolled its bytes back.
  External sweep failures remain inspectable and can be retried after repair.
  Watch limitations require a visible diagnostic and safety sweep, not a silent
  claim of complete immediate coverage.

## Controls

Not applicable; history/diff/revert UI controls are owned by the [Changes](changes.md) section and shared file save controls by config-editors.

## Edge cases

- **E1 — Credentials and transcripts.** A normal instruction edit must not
  incidentally commit an owner token or queued model text. Inspect tree paths
  as well as the selected diff when proving exclusions.
- **E2 — Invalid content.** Recording malformed TOML is not validating it or
  proving the live bot adopted it. A revert can restore invalid config; show
  home diagnostics and apply last-good rules, not automatic repair.
- **E3 — Deletion and one-shots.** Deleted instruction files remain in local
  history. A consumed one-shot records its definition then its deletion; tidy
  and session deletion cannot be undone from this instruction history.
- **E4 — No guaranteed transaction.** A failed record may leave changed files
  awaiting history. Multiple paths/operations are not a promise of atomic
  save-and-commit across a process crash. Preserve error details for recovery.

| Id | Given | When | Expect |
| --- | --- | --- | --- |
| **T1 — Busy does not hold every path** | Unrelated tracked instruction edit and a bot-authenticated write/edit path held during a live turn | Sweep while busy, complete attribution boundary or end the holding process | Record unclaimed tracked changes as external while actively held paths wait their bot attribution boundary. Claimed writes use authenticated bot provenance, not a body author. After process exit no path remains actively held forever; record remaining unrecorded changes under R2/R3 without inventing successful bot notification (R1–R3). |
| **T2 — Exclusions and visible Git failure** | A batch mixing tracked instruction additions/deletions and excluded runtime/credential paths, or an unavailable Git index | Notify/record/save/sweep, then repair the fixture failure and retry | Record only tracked-scope changes, never runtime/credential contents; no-op yields no fake change. Surface/log failed Git operation without inventing a SHA or claiming already-written file bytes rolled back. Keep unrecorded work inspectable for retry after repair; inspect tree paths as well as diff (R1, R4, R7, E1, E4; [home](home.md) R6). |
| **T3 — Provenance and inverse, not reset** | Person/API/CLI, authenticated bot and external instruction edits, including a conflicting inverse | Inspect offline log/API/diff and request a confirmed revert | Use user/bot:<id>/external attribution and R5 bounded metadata without model calls. Revert adds an inverse commit, preserves history and reloads diagnostics. Conflict abandons unchanged instruction bytes/history with named paths/no markers/pending revert, and later recording still works; no automatic resolution or unrelated-file discard (R2, R5–R7). |
