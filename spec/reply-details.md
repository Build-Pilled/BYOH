# Reply details

Classification: Core. Prerequisites: [shell](ui-shell.md), the selected adapters' transcript readers ([Pi](engine-pi.md), [Claude Code](engine-claude-code.md)).

## Purpose

Show, beside a message, when it was written and, for the model's answers, which
model produced them and how much context they carried. These are read-only facts
taken from the stored conversation, so the person can see a model switch or a
growing context without opening a log. [Model picker](model-picker.md) owns the
choice of model, [compaction](compaction.md) owns what a summary does to
context, and the shell owns Copy and the other message actions.

## Required behaviour

- **R1 — Where details appear.** The small details line under a message holds
  the time on every person message, every incoming message from a bot, and
  every final reply. A **final reply** is an assistant message with text, no
  tool calls and no error. Model and context appear only on a final reply. Tool
  steps and results, error rows, compaction records and dividers carry none, and
  they do not take part in the comparisons in R3 and R5.
- **R2 — Time.** The time is the message's stored timestamp shown in the
  viewer's own time zone (the zone the desktop app runs in, not the host's), as a
  12-hour clock with an unpadded hour, two-digit minutes and an uppercase
  period: `12:00 AM`, `8:08 AM`, `12:00 PM`, `11:59 PM`. The zone offset is
  applied for the date of each message, so summer and winter times both read
  correctly. A message written on the viewer's current calendar day shows the
  time alone. A message from any other day puts its date first: a three-letter
  English month, a two-digit day, a comma and the time, as in `Oct 02, 3:42 PM`.
  The year, after the day, is added only to a date earlier than today's date a
  year back: with today as 3 October 2026, `Oct 03, 12:00 AM` (2025) has no
  year, `Oct 02 2025, 11:59 PM` has one, and a later date such as
  `Oct 04, 3:42 PM` has none. That comparison is of calendar dates, not elapsed
  time: with today as 29 February 2028, a message from 28 February 2027 reads
  `Feb 28 2027, 3:42 PM` and one from 1 March 2027 reads `Mar 01, 3:42 PM`.
  Today, the date and the zone are all the viewer's and are read when the line
  is drawn. A missing, empty or unreadable timestamp shows nothing, not a
  placeholder or `Invalid`. The full instant stays attached to the displayed
  time as its machine-readable value.
- **R3 — Model on change.** A reply names its model when it is the first reply
  that records one, or when its model differs from the previous final reply that
  recorded one. Replies without a model are skipped: they show no label and
  neither trigger nor hide a later one. The recorded model is `provider/model`
  for Pi and `claude-code/<model>` for Claude Code; a synthetic placeholder or a
  missing provider or model means none. The label is the model picker's name
  for that id when the list has it, else the id with everything up to and
  including its first `/` removed; the full id is the label's description.
- **R4 — Context used.** The context of a reply is the prompt size the engine
  reported for that model call: fresh input tokens plus cache-read plus
  cache-write tokens (output tokens excluded). Several usage records of one
  Claude Code response count once, as the last record's value, never added
  together. Missing usage, non-numeric fields and a total of zero mean no value:
  unknown is never printed as zero. The figure is printed as thousands with a
  `k`: from 10,000 upward as whole thousands rounded (`87k`), below 10,000 with
  one decimal (`8.4k`; 999 prints `1.0k` and 9,999 prints `10.0k`).
- **R5 — Context added.** After the first reply that has a context value, each
  later final reply that has one also shows its change from the previous such
  reply, in parentheses and signed: `87k (+12k)`, `13k (−87k)` after a compaction
  (the minus is U+2212), `(+0.0k)` when unchanged. The first value shows no
  change. Replies without a value are skipped.
- **R6 — Facts only, no outgoing request.** Everything is derived from fields
  already in the stored transcript and the local model list. Showing details
  never calls a model or makes a network request, does not rewrite the transcript
  and does not depend on the engine being running. Reloading, forking
  ([conversation branching](conversation-branching.md)) or reading the session
  through another window shows the same details. Both adapters satisfy R2–R5
  through the same observable contract ([engine contract](engine-contract.md)).

## Controls

Details are read-only and have no action. They are scoped to the `Message
<entry-id>` region ([shell](ui-shell.md)); the Copy and Fork buttons beside them
belong to the shell and to [conversation branching](conversation-branching.md).

| Role | Accessible name | Scope, action and observable state |
| --- | --- | --- |
| time | The R2 text, for example `8:08 PM` or `Oct 02, 3:42 PM` | Details line of a person, incoming or final-reply message; absent without a usable timestamp. |
| group | Model <label> | Final reply only, when R3 shows it; described by the full model id. |
| group | Context <used> / Context <used> (<change>) | Final reply only, when R4 has a value; the change part follows R5. |

## Edge cases

- **E1 — Older or partial transcripts.** A reply lacking model or usage fields
  shows only the details it has. There is no `unknown` text, zero or estimate in
  place of a missing field, and a gap in values does not break the comparison for
  the replies around it.
- **E2 — Model switch mid-thread.** Changing the model through the picker changes
  the label from the next reply, not earlier ones; switching back shows the
  label again. A thread whose every reply used one model shows one label, on its
  first reply.
- **E3 — Compaction and drops.** A context value that falls after a compaction
  shows a negative change; the first value after the drop is compared with the
  previous value, not with zero. The compaction record itself shows no details.
- **E4 — Time zone and daylight saving.** The same stored instant reads
  differently in different viewer zones, and across a daylight-saving boundary
  each message uses the offset of its own date. Midnight and noon are `12:00 AM`
  and `12:00 PM`. Whether a message is from today, and so shows a date, is
  also decided in the viewer's zone: one instant can be today in one zone and
  another day in another.
- **E5 — Failed turns.** A failed model call leaves an error row without details
  and does not become the baseline for the next change.

| Id | Given | When | Expect |
| --- | --- | --- | --- |
| **T1 — Model labels skip gaps and non-replies** | Pi/Claude native records with repeated/switched models, missing fields, synthetic/error/tool rows | Read details through reload/fork/another window with no live engine | Only R1 final replies display model/context. Label the first recorded model and later changes, ignoring missing values and non-final rows as baselines; use Pi provider/model or claude-code/model, no synthetic placeholder. Use the local model name or R3 fallback/full-id description. These are stored facts with no model/network call or transcript rewrite (R1, R3, R6, E1, E2, E5). |
| **T2 — Usage is not a sum of repeated responses** | Pi input/cache usage or repeated usage records for one Claude response; missing, nonnumeric or all-zero values | Show context on a final reply | Use fresh input plus cache-read plus cache-write, exclude output; repeated Claude response usage uses the last record once, not their sum. Missing, nonnumeric or zero total shows no value, and no unknown text, zero or estimate in its place. Only final replies display it and no non-final row becomes a comparison baseline (R1, R4, E1, E5). |
| **T3 — Rounded values and signed drops** | Final replies with growing/equal context, missing/error gaps and a compaction drop | Format values and compare the next final reply with a value | Use R4 thousands formatting: 999 → 1.0k, 8400 → 8.4k, 9999 → 10.0k, 10000 → 10k, 87342 → 87k. First value has no delta; later values compare with the previous known final value, not gaps, tool/error/compact rows or zero. Show signed R5 change, including U+2212 for a drop and +0.0k unchanged (R1, R4, R5, E1, E3, E5). |
| **T4 — Viewer calendar, not host date** | Stored instants around midnight/noon, DST, year anniversary and leap day, plus unusable timestamps | Draw details with fixed viewer clocks/zones | Apply each message-date offset and current viewer calendar under R2/E4, not host time or elapsed-year arithmetic. Use the R2 12-hour/date/year forms; omit unusable timestamps and retain the full instant as machine-readable time. Drawing details remains read-only/offline (R2, R6, E4). |
