---
name: design-bot
description: Use when a task asks to design, sign on, edit, rename, re-model or retire a bot, or to turn a lesson into enforcement, a skill or a charter note.
---
# Design a bot

## Shape

Every bot has four parts. Decide all four before writing anything.

1. **One job.** One sentence: what it does every time it wakes.
2. **Never.** The few consequential actions it must not take, even when asked. See "Writing the Never section" below.
3. **Audience and voice.** Who it talks to (Firstmate, other crewmates, the captain directly, an outside channel) and a few words on voice.
4. **Wake.** Tasked by Firstmate, a standing routine, or both. A tasked ask always gets a reply against its task id, even when the result is empty. A standing routine stays quiet when it finds nothing; no "no change" filler.

## Where each part goes

- `bot.toml` `description`: at most 160 characters, so a lead's roster shows it whole. It says what the bot is for: what it owns, its key identifier (path, repo, inbox, handle), and which neighbour, by bot id, gets what it does not own. How to use a bot goes in the lead's own notes, not here.
- `SYSTEM.md`: the full charter. The one job; the task-id protocol; what it owns; a Never section; the concrete how (which path, tool, API, inbox or channel, never "use whatever tools you have"); and Learning notes. Do not repeat what the harness appends (bot id, directory, roster, how to recognise messages from bots and routines).
- `skills/<name>/SKILL.md`: one repeatable multi-step procedure per skill. Use a shared skill in `~/.myharness/skills/` plus the `skills` list in bot.toml when more than one bot needs it.
- `routines/<name>.md`: a five-field cron schedule and `session: fresh` unless the routine needs continuity, because a sticky session reloads its whole history on every tick. Omit `tz` to use the harness's own time zone.
- `bot.toml` keys stay flat. Only these exist: name, description, model, thinking, cwd, tools, skills, mcp, max_processes, idle_timeout, mark_seed, command, plus any keys the selected engine's adapter declares. Ids match `^[a-z0-9][a-z0-9-]*$`.

## Writing the Never section

Every charter gets a `## Never` section with only the important items, usually three to six. An item earns its place only if all three tests hold:
1. **Within reach:** the bot can actually do it with its tools (send, push, merge, delete, write a path, run a command).
2. **Plausible:** a helpful model might do it on its own initiative, or because someone asked.
3. **Consequential:** the damage is irreversible, goes outside the host, or lands on someone else's work, files or decisions.

Write each item as: the action, then what to do instead or who owns it, then a one-line why. For example: "Never send, reply to or forward an email unless Firstmate's task names the recipients and the content; ask Firstmate if either is missing. Why: email cannot be unsent and speaks for the captain."

Leave out anything that fails a test. Leave out generic quality rules ("never write bad code") and actions the bot cannot take. A long list dilutes the items that matter.

The Never section lives in SYSTEM.md, because the bot never sees its own bot.toml description.

When editing an existing charter, merge its scattered "never" and "do not" lines into the section, keep only those that pass the tests, and report what you dropped.

## Kinds of bot: crew or not

Read `crew-context.md` (next to this file) first. It explains how the crew works and gives the decision rule. It also holds the two blocks to paste: the crew contract for crewmates, and the user-only block for everyone else.

- **Project crewmate** (owns a repo): start from `crewmate-template.md` (next to this file) and fill in its Project area. Add it to crew.toml.
- **Role crewmate** (inbox, documents, research, reviewer): a role charter that starts with the crew contract from crew-context.md. Add it to crew.toml.
- **Not crew** (loop bot, advisor persona, utility chat): paste the user-only block, leave out every crew instruction, and keep it off crew.toml.

The charter and crew.toml must agree. A bot whose charter says "crewmate" but is not in crew.toml can never receive Firstmate's tasks.

A bot belongs to one team at most. Before adding it to `members`, check that no other team file lists it.

## Model

Model and thinking live only in bot.toml, never in SYSTEM.md, a skill or a routine, so the captain can switch models freely. Copy them from a working sibling of the same kind unless the task names one; read the current ids from that sibling's bot.toml, never from this skill.

## Steps

1. Read the task row and the brief. Read every existing charter that could overlap. Report "reuse <id>" if one fits.
2. Send any open preference questions to Firstmate, one decision per message. Decide everything else and state what you decided.
3. Write the files. Read the current files before editing them.
4. Membership: update crew.toml where it applies.
5. Prove it is live:
   - `myharness validate` shows no errors.
   - `myharness prompt <id>` shows the charter you meant, and the roster line in `myharness prompt firstmate` shows the new description.
   - `myharness bots` lists the bot.
   - `myharness routines <id>` shows each routine with the right schedule and enabled state.
   - After a rename, touch bot.toml first, then check again.
6. If the bot needs a credential, tell Firstmate which bot needs which credential. Do not handle the secret yourself.
7. Report to Firstmate against the task id: each file changed, the bot's one-job line, the verification output, and anything you decided without asking.

## Edits and learning notes

Only when Firstmate states that the captain approved the lesson; without that approval, reply that it is refused and write nothing:
1. Check the evidence in the hand-off; it is not recorded. If it does not support a lesson, the outcome is NO_ENTRY; report it with the reason.
2. Form ladder: pick the cheapest form that works.
   1. Mechanical enforcement: a task-database trigger, CLI or schema validation, an engine hook. A task-database trigger is yours. If it needs code (daemon, CLI, hook), do not write it: return it to Firstmate as a proposed ship task for the owning crewmate.
   2. A skill with a trigger line, when the lesson applies only in a recognisable situation.
   3. A line in one charter: the bot that needs it; the crewmate template only when it applies to every crewmate.
3. Budget: each charter line you add means one line cut or merged in the same charter. Name both in the report.
4. Record: the rule plus a one-clause reason; no incident story, no task id. The rule is self-contained: a reader understands and applies it from the charter alone, with no pointer to a report, task, other doc or "see X". Names of the tools, commands and paths the rule operates on stay. Keep a reason only if the source states it; never infer one. One rule per bullet. Remove any note it supersedes.

Do not edit loop or advisor charters unless the task carries the captain's explicit ask.

## Retire

Only on the captain's word relayed by Firstmate:
1. Move `~/.myharness/bots/<id>` to `~/.myharness/retired-bots/<id>`.
2. Remove the bot from crew.toml.
3. Run `myharness validate` and `myharness bots`, then report.
