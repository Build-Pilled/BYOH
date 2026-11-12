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

The setup agent's hand-over message names the blueprint folder. The first time you read that folder, write one line in `~/.myharness/bots/firstmate/MEMORY.md` recording its path; on a later resume, read that line. The onboarding rules are in that folder's `spec/onboarding.md` (R3 to R9). Read the section of each stage before you lead it. Read the bot and admin SSH names from `host` in the interview record, not from memory or a guessed default.

## 2. First reply: prove the context

Before doing anything else, reply with:
- three or four actual recorded answers (for example `display_name`, `plain_name`, `power`, `host`), marking any that are in `defaulted`;
- the last passed state (`progress`) and the next state to pass;
- what that next state needs from the captain.

Never invent an answer the record does not hold. A question the record already answers is not asked again.

## 3. Lead the remaining states, in order

Each state is passed only by its own proof. A greeting, the switch itself or the captain's "ok" passes nothing. After each pass, write the new `progress` to the record (whole file, through a temporary file and a rename) and commit it in `~/myharness-src`.

1. `first-use`: the captain chats with a bot in the app and sees work done.
2. `interview-2`: page two on Lavish (lavish skill, port 4388; on an own host give the captain the one-time forward `ssh -N -L 127.0.0.1:4388:127.0.0.1:4388 <bot SSH name>`, using the bot SSH name from `host` in the record). Ask the release-one choices in the order and wording of their spec sections, each default visible, with "Go with the defaults". If the page cannot be served, ask the same questions in chat. Record the answers and `defaulted`.
3. `choices-applied`: the answers are built into `~/myharness-src` by a crewmate, never by you. Task bot-maker to sign on a harness keeper for `~/myharness-src` from the crewmate template, and tell the captain this is the crew's first bot sign-on, worth watching: say each step as it happens (your brief, Bot Maker's overlap check and files, the live check). Include the absolute blueprint folder and its `verify/SKILL.md` in that brief: the keeper records the skill path in its project context and reads that canonical skill for this build and later harness changes, without installing a second copy or adding a second ship gate. Then hand the keeper the build as a ship task (Code Reviewer pass, pull request, merge on the captain's word). The keeper keeps owning the harness source after. Then give the captain the rebuild line to paste on the Mac, and present the choices' Mac checks for the captain to confirm.
4. `bot-account`: offer to guide the captain through the bots' own GitHub account (onboarding R7). The default is later, when a bot first needs GitHub; either way the state passes once the captain has chosen.
5. `done`: tell the captain onboarding is complete, then delete this skill as MEMORY.md says.

## Do not

- Do not reset the home, rename a bot or overwrite an edited charter.
- Do not put the interview or any task context into the plain bot.
- Do not store a credential, token or key in the record.
- Do not deploy or restart the harness yourself; the captain runs the rebuild line.
