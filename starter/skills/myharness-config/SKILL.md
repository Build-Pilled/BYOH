---
name: myharness-config
description: Use when asked to create, inspect or change a bot, team, routine, skill or MCP server, or to have a bot woken at a set time (one-shot routine), including "check back in N minutes" or waiting for something to arrive. Explains the ~/.myharness layout.
---
# Configuring the harness

The harness configuration is plain files under `~/.myharness`. Change it with your ordinary read, write and edit tools. Changes take effect immediately: a new bot directory is a new bot, a new team member can be messaged on the next turn, an edited SYSTEM.md is used on the next turn. Every change is recorded in the home's local git history, so the captain can see and revert it (`myharness log`).

Read the current files before changing them. Run `myharness validate` after writing; it reports TOML and front matter errors. Tell the captain what you changed, file by file.

## Layout

```
~/.myharness/
  bots/<id>/bot.toml          identity, model, tools, skills, mcp, limits
  bots/<id>/SYSTEM.md         the complete system prompt, nothing templated
  bots/<id>/skills/<name>/SKILL.md
  bots/<id>/routines/<name>.md
  bots/<id>/notes/            the bot's own notes; never loaded into its context
  teams/<id>.toml             name, lead, members
  skills/<name>/SKILL.md      shared skills, referenced by name in bot.toml
  mcp/<name>.toml             shared MCP servers, referenced by name in bot.toml
  tasks/factory.db            the crew's task table (project-management skill)
```

Ids match `^[a-z0-9][a-z0-9-]*$`. Do not touch `bots/*/sessions/`, `bridges/`, `log/` or `secrets/`; they belong to the daemon.

## bot.toml

Keep it flat: top-level keys only, no tables. `name` and `description` are required.

```toml
name = "Research"
description = "One sentence. This is what leads see about this bot in their roster."
model = "<copy from a working sibling's bot.toml>"   # omit for the engine's default
thinking = "medium"                        # off, minimal, low, medium, high, xhigh, max; default: high
cwd = "~/work/project"                     # default: the home directory
tools = ["read", "grep", "find", "ls", "bash", "write", "edit"]
skills = []                                # names under ~/.myharness/skills
mcp = []                                   # names under ~/.myharness/mcp
max_processes = 3
```

The other keys are `idle_timeout`, `mark_seed` and `command`, plus any keys the selected engine's adapter declares. Do not invent `memory`, `personality`, `avatar` or similar; `myharness validate` reports unknown keys.

## SYSTEM.md

Write the whole prompt as the model should read it. The harness appends only: the bot's id and directory, for leads the bots they lead with their one-line descriptions, and how to recognise messages from other bots, routines and incidents. Do not repeat those. Lessons and observations belong in notes/ unless the captain asks for them to go into a prompt.

## Skills

A skill is a directory with a `SKILL.md`: front matter with `name` and `description`, then the instructions. Put it in `bots/<id>/skills/<name>/` for one bot, or in `skills/<name>/` and list the name in `skills` of each bot.toml that should have it.

The description is what the bot sees in its prompt; it decides from that alone when to read the skill. To make a skill manual, used only when the captain asks for it, add `disable-model-invocation: true` to its front matter. It then stays out of the prompt, and the captain runs it by starting a message with `/skill:<name>`.

```markdown
---
name: report-format
description: The captain's reporting format.
disable-model-invocation: true
---
Report using ...
```

## Teams

```toml
name = "Crew"
lead = "firstmate"
members = ["bot-maker", "code-reviewer"]
```

Teams scope leads. The lead sees and can message every member of its team. Everyone in a team can message everyone else in it, but members are not told about the team or about each other: a member learns of a teammate only when a message names it. A bot belongs to one team at most, as lead or member: before adding a bot to `members`, remove it from any other team file. To make a new bot reachable by a lead, add it to `members` of that lead's team. The lead is not listed in `members`.

Connections between bots outside a team (bridges) are made with `myharness connect <a> <b>` and removed with `myharness disconnect <a> <b>`; `myharness bridges` lists them.

## Routines

```markdown
---
name: Heartbeat
description: What it does, one line.
schedule: "6 */6 * * *"     # five-field cron, or a local date-time for a one-shot
enabled: true
session: fresh              # existing session id | fresh | <sticky session title>; default: the routine's name
---
The message the bot receives on each tick.
```

`tz` is optional; without it the routine runs in the harness's own time zone. `enabled` defaults to false.

### One-shot: wake a bot at a set time

Write `bots/<bot id>/routines/<name>.md` with `schedule: "YYYY-MM-DDTHH:MM"` (local time in the routine's zone) and `enabled: true`. Your bot id is in `$MYHARNESS_BOT`. It wakes a new session titled after the routine, so put everything that session needs in the body: what to check, where, and whom to tell.

```sh
cat > "${MYHARNESS_HOME:-$HOME/.myharness}/bots/$MYHARNESS_BOT/routines/check-build.md" <<'EOF'
---
schedule: "2026-10-13T01:35"
enabled: true
session: fresh
---
Check whether the build in ~/work/project finished; report the result to the captain's task thread.
EOF
```

Once attempted, the daemon deletes the routine and its run log; git keeps the Markdown history. A one-shot whose time passed while the daemon was stopped does not run: it is consumed as a visible failure. To message another bot at a set time, schedule a wake for yourself, then use `send_message` when it fires.

## Checking on bots

Through bash: `myharness bots`, `myharness sessions <bot>`, `myharness routines <bot>`, `myharness prompt <bot>` (the exact prompt a bot gets), `myharness activity` (messages between bots), `myharness log` (recent configuration changes).
