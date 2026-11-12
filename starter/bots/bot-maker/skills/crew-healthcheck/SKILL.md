---
name: crew-healthcheck
description: Use when the crew-healthcheck routine runs, or when a task asks where the crew keeps hitting friction, which routines waste tokens or which charters are oversized, and which skill, learning note, bot or routine would fix it.
---
# Crew healthcheck

Find where the captain or the crew keeps hitting friction, and where routines waste tokens. Propose fixes. This is a report only: build nothing until the captain picks, relayed by Firstmate.

## Window

The last 7 days. An ad hoc task may name its own window.

## Part A: friction

1. List sessions from `~/.myharness/bots/*/sessions/*.json` whose `last_turn` falls in the window. Skip any file whose JSON is not an object. Skip retired bots and your own crew-healthcheck sessions. The `file` field points to the transcript; when it is a relative path, resolve it against that bot's `sessions/` directory. Skip sessions whose `file` is null.
2. Pull bot-to-bot traffic for the window with `myharness activity --since <window> --limit 500`.
3. If nothing is in the window, skip to Part B.
4. Split the transcripts across parallel subagents, one or a few each. Each reads only transcript lines whose timestamp falls in the window, filtered before reading (for example with `jq` or `grep`), never the whole file; of those, only the captain's or inbound bot turns and the replies right around them. Each returns friction items: bot, session id, a short quote, and what went wrong. Look for:
   - the captain repeating or rephrasing the same ask
   - corrections ("no", "that's wrong", "I said...")
   - the captain asking where something is, or asking for something to be resent
   - a manual task that keeps coming back across days
   - a bot claiming something exists or worked when it didn't
   - a bot stalling, looping or giving up
   - a crewmate escalating a question to the captain that it was allowed to decide itself
   - two sessions of one bot working the same task id
   - a tasked hand-off that went quiet, or a message that woke a bot for nothing
5. Merge the results. Drop one-offs already resolved in the same session. Group repeats.

## Part B: routine waste

For each `~/.myharness/bots/*/routines/*.md`, read its front matter, its `<name>.runs.jsonl` run log and `myharness routines <bot>`. Flag it when it is:
- **too frequent**: it runs more often than its output changes
- **long chat**: it uses a sticky session whose transcript keeps growing, so every tick reloads that history
- **noisy**: it sends filler or "nothing new" messages to an audience that does not need a liveness signal
- **dead**: its runs keep failing or being missed, or its target is gone
- **duplicate**: it does the same job as another routine

Skip disabled routines unless they are dead or duplicates.

## Part C: charter size

Count the words in each `~/.myharness/bots/*/SYSTEM.md` with `wc -w`. Flag every charter at or above 2500 words. This is an alert only: name the bot and its word count, and propose no trim unless asked.

## Proposals

Turn each surviving group or flag into one proposal and name its kind:
- **learning note**: a lesson one bot keeps relearning. Name the charter it goes into.
- **skill**: a repeated multi-step task.
- **routine**: something asked for on a rhythm, or a "tell me when".
- **routine fix**: lower the frequency, add a quiet-when-empty rule, switch to `session: fresh`, pause, or merge.
- **bot**: a recurring job that no current charter covers. Check for overlap first.
- **charter size**: a charter flagged in Part C, with its word count.

If no proposal survives, stop and send nothing.

## Report

Send it to Firstmate with `new_session` titled `CREW-HEALTH-<YYYY-MM-DD>`. Give one line per proposal: the kind, a one-line fix, and the evidence (bot, session id, a short quote). Never quote secrets, tokens or credentials found in transcripts. End by asking which proposals to build. When Firstmate relays the captain's pick, build only those, using the design-bot skill.
