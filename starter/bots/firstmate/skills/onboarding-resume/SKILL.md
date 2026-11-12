---
name: onboarding-resume
description: "Use when the captain hands onboarding over from the setup agent, or asks to resume or finish setting up the harness. Reads the interview record and leads the remaining onboarding stages from inside the harness. Temporary: deleted once onboarding is done (see MEMORY.md)."
---
# Onboarding resume

The setup agent built this harness and handed coordination to you at `first-use`. You lead what is left. The setup agent stays installed on the host; the captain can go back to it at any time.

## 1. Read the record

Read `~/myharness-src/interview.json`: `{"schema": 1, "progress": "<last state passed>", "answers": {...}, "defaulted": [...]}`.
- If it is missing or does not parse, say so, quote the error, and stop. Do not rebuild it from memory or from questions.
- If `progress` is `done`, say onboarding is complete, then follow the MEMORY.md line about deleting this skill.

The setup agent's hand-over message names the blueprint folder. The first time you read that folder, write one line in `~/.myharness/bots/firstmate/MEMORY.md` recording its path; on a later resume, read that line. The onboarding rules are in that folder's `spec/onboarding.md` (R3 to R10). Read the section of each stage before you lead it. Read the bot and admin SSH names from `host` in the interview record, not from memory or a guessed default.

## 2. First reply: prove the context

Open your first reply with onboarding R10's plain-text progress bar, then one
or two plain lines on what is happening now and why it matters to the captain.
Do this for every step message through `done`, including failure and resume
messages. Read R4's seventeen-state order: the completed count is the index of
the record's last passed state, and percent is that count / 17 × 100, rounded
to the nearest integer. Use seventeen cells, filling one per passed state,
and plain `now`/`next` labels for the next unpassed state and the one after it.
At `done`, show 100% and `now: setup complete · next: use your harness`.
No failed or interrupted stage advances the bar; add no record field or store.
Use R10's glossary sentence the first time a component is named to the captain,
never again. The setup hand-over carries terms already explained as conversation
context, so the switch is not a reason to repeat them. Then reply with:
- three or four actual recorded answers (for example `display_name`, `plain_name`, `power`, `host`), marking any that are in `defaulted`;
- the last passed state (`progress`) and the next state to pass;
- what that next state needs from the captain.

Never invent an answer the record does not hold. A question the record already answers is not asked again.

## 3. Lead the remaining states, in order

Each state is passed only by its own proof. A greeting, the switch itself or the captain's "ok" passes nothing. After each pass, write the new `progress` to the record (whole file, through a temporary file and a rename) and commit it in `~/myharness-src`.

Page two and `choices-applied` were completed by the setup agent before the
one initial install and pairing. The captain first sees the app, with those
choices applied, at `first-use`. Do not repeat the interview or choice build.

1. `first-use`: the initial install left the app closed and the pairing line was run in Terminal. The setup agent opens it now, after pairing, and verifies `connected` before the switch. The captain chats with a bot in the finished app and sees work done. Present the choices' Mac checks here; checks the host cannot prove stay `mac-pending` until answered.
2. `keeper-ready`: your first job after the switch is to task bot-maker to sign on a harness keeper for `~/myharness-src` from the crewmate template. Tell the captain this is the crew's first bot sign-on, worth watching, and narrate each step as it happens: your brief, Bot Maker's overlap check and files, and the live check. Include the absolute blueprint folder and its `verify/SKILL.md` in the brief; the keeper records the skill path in its project context and reads that canonical skill for later harness changes, without installing a second copy or adding a gate. The keeper owns the source from sign-on. Its small first task is a read-only scout/handover audit: read source and interview record, identify source/build/test entry points and chosen features, run existing safe local checks, and report the source map plus one next-maintenance recommendation to you. No edits, pull request, installation, real-login turn or deploy. Do not pass this state before sign-on, live check and scout report are complete. On resume, check the existing keeper and task before continuing; do not create a duplicate.
3. `bot-account`: offer to guide the captain through the bots' own GitHub account (onboarding R7). The default is later, when a bot first needs GitHub; either way the state passes once the captain has chosen.
4. `done`: open with the completed progress line, tell the captain onboarding is complete, then delete this skill as MEMORY.md says.

## Do not

- Do not reset the home, rename a bot or overwrite an edited charter.
- Do not put the interview or any task context into the plain bot.
- Do not store a credential, token or key in the record.
- Do not deploy or restart the harness yourself; the captain runs the rebuild line.
