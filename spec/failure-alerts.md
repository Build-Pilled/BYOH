# Failure alerts to the lead

Classification: Core. Prerequisites: daemon, configured bots and optional led-team membership.

## Purpose

Make a member's failed run visible to its lead without creating an incident
reply loop. [Teams](teams.md) owns who the lead is; [messaging](messaging.md)
owns ordinary explicit bot sends and their pickup failures. This section owns
incident creation, destination and rate limits, not [status lights](status.md).

## Required behaviour

- **R1 — Failure record.** Detect a turn returning an error (`failed`), an
  engine exiting before its turn finishes (`crashed`), and a delivery unable
  to begin a turn (`could-not-start`). Persist the affected session's `failed`
  marker with kind and a bounded first-line detail; clear its display-only idle
  mark so failure is visible again. Missing session produces no invented alert
  conversation. The marker persists even if there is no lead to notify.
- **R2 — Destination.** For a failed member of a led team, notify that team's
  lead. If the failed session was replying to an extant session of that lead,
  use that waiting conversation. Otherwise reuse an unarchived `Team incidents`
  session of the lead or create one with bot origin. The lead's own failure
  does not notify itself. Leadless and unteamed bots have no lead incident
  destination; do not select a bridged peer as substitute lead.
- **R3 — No error echo loop.** On failed delivery from a sender, omit incident
  delivery back to that same sender if it is the lead already seeing the send
  failure. Do not automatically forward an ordinary assistant completion as an
  incident reply. The lead can explicitly respond or investigate via messaging.
- **R4 — Content.** Incident input identifies failed bot and session title,
  outcome category, optional error detail, latest user request (unwrapping bot
  batch framing when present), and latest assistant reply if available.
  Summaries collapse whitespace, omit complete fenced code blocks and bound
  each detail/request/reply excerpt to 300 characters. Later allowed incidents
  state the count in the recent hour. Keep full source transcript/error for
  inspection instead of sending unbounded logs into the lead's context.
- **R5 — Rate limiting.** Notify at most three incidents per failed bot/session
  in a rolling hour in this daemon process. Further incidents still update the
  source failure marker but do not send another model message. Counts are
  process-local and reset on daemon restart; this is not durable deduplication
  or a claim to aggregate every failure into one incident.
- **R6 — Delivery and display.** Incidents are daemon-origin prompts marked as
  such (source `incident:<bot>`), not statements from the person. Arrival can
  start or steer the lead as normal daemon delivery. Expose the failed marker
  through owner session reads and the incident through the destination transcript;
  [status](status.md) owns attention/unread rendering. Starting a subsequent turn
  clears the source failed marker; old incident transcript text remains.
  Failure of incident delivery
  is not success and must not recursively manufacture an infinite lead loop.

## Controls

Not applicable; the incident is conversation content. Transcript navigation and status controls belong to [ui-shell](ui-shell.md) and [status](status.md).

## Edge cases

- **E1 — No lead or deleted waiting thread.** Keep source failure locally; with
  a lead but no extant waiting thread, use Team incidents. Never revive an
  unrelated deleted lead session or widen bridge permissions to notify someone.
- **E2 — Repeated errors.** Three notifications do not mean only three failures
  occurred. Suppressed incidents remain source failures; restart can notify
  again because the limiter is in memory.
- **E3 — Partial output and cancellation.** Preserve partial assistant output
  on error. An intentional Stop is governed by turns, not automatically a
  model-failure incident merely because the person cancelled. Mark as read
  is display state, not deletion of `failed` or historical incident text.

| Id | Given | When | Expect |
| --- | --- | --- | --- |
| **T1 — Member failure goes where its lead waits** | Led team; failed member replying to extant lead conversation, or a routine/member without that waiting destination | Produce failed/crashed/could-not-start outcome and inspect source/destination independently | Persist source failed kind/detail and clear idle display mark; notify waiting lead conversation, otherwise reuse/create lead Team incidents. Identify bot/title/category/bounded detail and request/reply as R4, with incident provenance, never an ordinary automatic reply. Source failure is not cleared merely by alert delivery (R1, R2, R4, R6). |
| **T2 — Waiting peer is not a substitute lead** | One led team, a member waiting on another failed member | Fail the target after pickup and inspect every potential incident destination | Only the lead incident destination receives the incident, not the waiting member or a bridged peer. Source failure remains; ordinary messaging pickup errors still follow messaging rules. Respect skip-sender/no error echo and no recursive incident delivery loop (R1–R3, R6, E1). |
| **T3 — Own lead failure is not a self-incident** | Only one team; its lead fails while a member waits, or a bot has no lead | Inspect source failure and all team transcripts after failure | Keep local failed marker even without an incident destination. Lead never notifies itself or the waiting ordinary member; leadless/unteamed gets no substitute destination. Do not auto-forward an ordinary completion as incident reply; explicit messaging remains possible (R1–R3, R6, E1). |
