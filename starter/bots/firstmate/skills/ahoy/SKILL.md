---
name: ahoy
description: >-
  Use when the captain explicitly says ahoy or /ahoy, or asks for a session
  recap of what happened since they last spoke, plus any unanswered
  decisions. A standalone captain message whose main ask is ahoy is an
  invocation. Session history plus open decision rows in factory.db; no other
  live fleet state.
disable-model-invocation: true
---
# Ahoy

Give a concise session recap. Besides the session, read only the open decision rows in factory.db. Gather no other fresh state.

Treat an explicit captain "ahoy" the same as `/ahoy`. Slash is optional. Do not wait for a slash-command invocation.

## What counts as a captain message

A captain boundary is an ordinary user message they typed.

Exclude:

- Crew or teammate messages (`[from <bot> · <session>]`, another bot reporting in)
- Scheduled or event wakes (`[routine <name> · <time>]`) and incident reports (`[incident · <bot> · <session>]`)
- System, tool, and other injected operational messages
- The current ahoy invocation itself, with or without a slash

A previous ahoy is a real captain message and may be the next interval boundary.

## Recap

1. Find the most recent real captain-authored message before this invocation.
2. If none exists, say this session has no prior captain message, skip the recap and go to step 4. Do not invent a fleet snapshot. Do not call GitHub or read live queues.
3. Recap only what is already visible after that message and before this invocation.
   Include concrete outcomes, landed work, failures, decisions made, new decisions needed, and work still running only when those events appear in that interval.
   Use outcome language. Keep every full PR URL that appears in the interval.
4. Also inspect the entire visible session before this invocation for every explicit captain decision that is still unanswered.
   A later unrelated captain message is a recap boundary. It does not close an earlier decision.
   A decision is closed only when a later visible response substantively resolves it: they chose an option, declined it, granted or denied the approval, skipped the decision (treat skip as decline and record the assumption you made), or otherwise directly addressed it.
   Deduplicate by substance.
   Also read the open decision rows, which outlive sessions:
   `factory-db "SELECT id, title, prompt, gate_ref FROM tasks WHERE kind='decision' AND status='blocked'"`
   Each row is an open decision even if this session never shows it. A visible decision and its row are one decision. If the visible session already resolves a row, do not ask it; close the row with that answer (project-management skill).
5. Do not call GitHub, browsers or fleet snapshots. Write nothing except closing decision rows. Create no report. Do not guess live state beyond the last visible event.
6. If nothing happened after the previous captain message but an older open decision remains (visible or in a row), report that decision instead of claiming nothing happened.
7. If neither events nor open decisions exist, say in one sentence that nothing happened after the previous captain message.

## Decisions

After the recap, if any open decisions remain, present only the single most impactful one.

Cover: what it is, why a decision is needed now, the real options, and a recommendation with a one-line why. Send one decision per message, options numbered, inside an `> [!IMPORTANT]` callout. A decision with no row yet gets its row when you present it (project-management skill).

When they answer, close its row with their answer, then present the next highest-impact remaining decision the same way, until none remain.

Do not start this flow when the inventory is empty.
Do not batch unrelated decisions into one message.

## Do not

- Do not treat a good leftover merge as an open decision just because the process was messy
- Do not re-ask a skipped decision; the skip already closed it
- Do not pull live issue or PR status to "complete" the recap