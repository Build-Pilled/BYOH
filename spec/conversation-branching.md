# Fork and duplicate a conversation

Classification: Core. Prerequisites: [sessions](sessions.md), a selected engine adapter ([contract](engine-contract.md)), the [shell](ui-shell.md).

## Purpose

Let the person try another direction without losing the first one. **Fork**
starts a new session from a chosen reply; **Duplicate** copies the whole
conversation as it stands. Both leave the source conversation exactly as it
was. [Sessions](sessions.md) owns identity and deletion, [session
organization](session-organization.md) owns the row menu that holds Duplicate,
and [compaction](compaction.md) owns what a summary leaves behind.

## Required behaviour

- **R1 — Operations and entry points.** One owner call creates a branch:
  `POST /sessions/<bot>/<ref>/fork` (`<ref>` resolves as in [sessions](sessions.md) R4)
  with an optional JSON body `entry` (a message's entry id from the session
  detail) and `position`. No `entry` is **Duplicate**: the whole active
  conversation. `entry` with `position` `at` (the default) is **Fork**: history
  up to and including that entry. `entry` with `position` `before` is
  **edit-and-fork**: history before that entry, with the entry's person text
  returned as `text` for the caller to edit; nothing is sent. The response is
  `{session, text?}`. `myharness fork <bot> <session> [--at entry | --before entry]`
  prints the new full UUID on its first line and, only for `--before`, a blank
  line, `Text to edit and send:` and the text; the two flags are mutually
  exclusive ([cli](cli.md)). Creating a branch makes no model call.
- **R2 — The new session.** It has a new UUID, origin `fork`, the title
  `<source title> (fork)` (equal titles are permitted, no numbering), the
  source's folder label, no archive mark, no unread mark, and
  `forked_from` `{session, entry}`: the session whose history it was cut from
  (for a branch of a not-yet-started branch, the original) and the chosen entry
  or null for Duplicate. It records the source's native engine. The UUID is new
  and unused: creating a branch never overwrites an existing session's files. It inherits no
  reply address, routine, queued or pending input, attachment, workspace,
  launch record or idle mark; its first turn uses the bot's configuration at
  that time. A creation event reaches other open windows so the list updates.
- **R3 — Content and independence.** The branch shows the source's active
  conversation up to the cut point: the same messages in the same order with
  their text, images, tool calls and results, timestamps, reply details
  ([reply details](reply-details.md)) and compaction records. Afterwards the
  two sessions are independent: later messages, renames, folder moves,
  archiving or deletion of one never alter the other's metadata or transcript
  (the one stated exception is an unstarted Claude Code branch whose source is deleted or archived, E3).
- **R4 — The source is never changed.** Creating a branch must leave the
  source's metadata file, native transcript, prompt, queue, pending, outbound
  and incoming records, attachments, workspace and live process byte-identical
  and its running turn untouched, whether the source is idle, working, queued or
  archived. Opening the source transcript with Pi itself is not
  enough: Pi can append a thinking-level record to a transcript written before
  it recorded one. BYOH satisfies the rule by branching from a private working copy
  or by any means that writes nothing to the source; if that cannot be done, the
  request is refused, not performed in place. A branch requested while the
  source works captures the history already persisted; the source's unfinished
  turn and queued input are not carried.
- **R5 — Refusal creates nothing.** These return 400 with a plain reason,
  create no session and change nothing: the source has no transcript yet; the
  `entry` is not on the source's active conversation; `entry` or `position` is
  malformed (blank entry, `position` without `entry`, a position other than
  `at` or `before`); edit-and-fork before the first message ("nothing before
  the first message to fork from", for every engine) or on an entry that is not
  a person message (there is no person text to return); or, on Claude Code, an
  entry before the newest compaction boundary (the message reports `forkable`
  false and has no Fork control; Duplicate stays available). Unknown bot or
  session is 404; a bot with no valid configuration is 409. A failed or
  interrupted attempt removes every file it created, so recovery of orphaned
  native transcripts ([sessions](sessions.md) E2) can never adopt it as an
  `Untitled session`. An unknown entry is refused rather than saved as a branch that cannot start,
  and a blank entry, the first message and a non-person entry (for which Claude
  Code returns assistant text) are refused too.
- **R6 — Pointer entry points.** A **Fork** button sits on every final
  assistant reply that is forkable; activating it creates the branch at that
  reply and opens the new session by its exact UUID. **Duplicate** in the row's
  Session actions menu creates a whole-conversation branch and opens it. The
  control is disabled while its request is pending, so one activation makes
  one session. Failure leaves the person where they were with a visible error.
  Edit-and-fork has no control in release one; the API and CLI provide it.
  No shortcut is required.
- **R7 — Origin and engines.** An opened branch shows, above its first
  message, `Forked from the original session. Both continue independently.`
  with a link to the source; when the source no longer exists the sentence says
  so and has no link. Each adapter performs the cut natively and never
  fabricates a copy from rendered text ([Pi](engine-pi.md),
  [Claude Code](engine-claude-code.md) R6). A branch keeps its source's native
  engine, so [sessions](sessions.md) R6 governs it like any session of that
  engine. It appears under the origin filter value Fork ([session
  organization](session-organization.md) R3).
- **R8 — Warning before deleting a source.** Deleting a session that unstarted
  Claude Code branches still read (E3) names them in the confirmation, so the
  person can choose knowing those branches would lose their history.

## Controls

The Fork button is scoped to the reply's `Message <entry-id>` region
([shell](ui-shell.md)); Duplicate is an item of the Session actions menu owned
by [session organization](session-organization.md).

| Role | Accessible name | Scope, action and observable state |
| --- | --- | --- |
| button | Fork | Within a final assistant reply's message region; absent when not forkable, disabled while pending; creates and opens the branch. |
| menuitem | Duplicate | Session actions menu of one session row; creates and opens a whole-conversation branch. |
| status | Forked from | Top of an opened branch; the sentence in R7. |
| link | Original session | Inside Forked from; opens the source by UUID; absent when the source is gone. |
| alert | Fork failed / Duplicate failed | Shows the refusal reason; dismissed by the next successful action. |

## Edge cases

- **E1 — Nothing to branch.** A session with no transcript refuses Fork and
  Duplicate with the R5 reason; its Duplicate item stays visible and the error
  is shown, not a silent no-op or an empty copy.
- **E2 — Compaction.** Fork on Pi keeps the compaction records up to the cut. On
  Claude Code, replies before the newest compaction have no Fork control and the
  API refuses them; a Duplicate of a compacted session is allowed and carries the
  native summary. Neither case restores history the engine file no longer holds.
- **E3 — Unstarted Claude Code branch.** Until its first turn the branch reads
  the source's native history through the source session. If the source is deleted
  first, or its transcript is moved to the tidy archive ([session tidy](session-tidy.md))
  and not yet put back, the branch reports that its history is unavailable (never an empty
  conversation presented as loaded, [Claude Code](engine-claude-code.md) R6) and a
  send fails visibly instead of starting an unrelated fresh conversation; after a
  put-back the history and sending return. A Pi
  branch owns its transcript from creation and is unaffected.
- **E4 — Source in use.** A working source keeps working; a second branch
  request, or a branch made while the person sends in the source, yields
  independent sessions with distinct UUIDs. Two simultaneous requests make two
  branches; none changes the source.
- **E5 — Files and messaging.** The workspace and attachment folders are not
  copied. Paths in earlier person messages still name the source's attachment
  folder and stop resolving if the source is deleted. A branch is an ordinary
  session for [messaging](messaging.md): it may be addressed by its exact session id
  and has no reply address from the source.

| Id | Given | When | Expect |
| --- | --- | --- | --- |
| **T1 — Branch without touching the source** | A source has history, including a working or queued source | Fork at a reply, edit-and-fork before a valid person entry, or Duplicate | New independent UUID/content cut, no model call and no inherited queued input; source artifacts stay byte-identical and its running turn is untouched. Invalid/blank entries, first-message edit-and-fork or non-person edit-and-fork refuse without creating anything (R1–R5). |
