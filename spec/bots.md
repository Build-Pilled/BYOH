# Bot identity and discovery

Classification: Core. Prerequisites: an initialized home; a selected adapter for running a bot.

## Purpose

Give each bot a stable address distinct from its display name. This section
owns creation, bot configuration and marks, not starter prompt content or the
[config editor](config-editors.md) and [sidebar](ui-shell.md) controls.

## Required behaviour

- **R1 — Identity.** A bot id matches `^[a-z0-9][a-z0-9-]*$` and names its
  directory under `bots/`. Address bots by id, not display name. Display names
  need not be unique. `myharness bot new <id> [--name N] [--description D]
  [--model M]` creates `bot.toml` and an empty `SYSTEM.md`, reports the path,
  and records creation in existing home history. Default name is the id;
  default description is a one-sentence placeholder to replace before use.
- **R2 — Flat configuration.** `bot.toml` requires string `name` and
  `description`; optional fields are `model`, `thinking`, `cwd`, `tools`,
  `skills`, `mcp`, `max_processes`, `idle_timeout`, `mark_seed`, `command`.
  Adapter-only keys are declared in their selected adapter's section and are
  accepted only when that adapter is selected. Keys for an
  adapter the user did not choose are not part of their harness. Unknown fields are
  diagnostics, not extra capabilities. String arrays are required for `tools`,
  `skills`, `mcp`, `command`; `command` must be nonempty.
  Limits inherit [home](home.md) defaults.
- **R3 — Defaults and engine boundary.** Model omitted means the selected
  adapter's default. `thinking` defaults to `high`; accepted values are `off`,
  `minimal`, `low`, `medium`, `high`, `xhigh`, `max`; adapters own effective
  effort support. `cwd` defaults to `~` (the isolated bot user's OS home), with
  home expansion. `skills` and `mcp` default empty; bot-local skills remain
  available. Project instruction discovery and explicit settings/hooks belong
  to the chosen adapter's contract, not engine-neutral configuration. `tools` omitted uses engine defaults;
  known names are `read`, `bash`, `edit`, `write`, `grep`, `find`, `ls`,
  `web_search`, `web_fetch`, with support specified by the adapter.
  A configured command is literal argv, never a shell program.
- **R4 — Discovery.** Discover non-hidden bot directories in sorted id order.
  Owner `GET /bots` returns `bots`, `teams`, `problems`; each bot exposes id,
  display name, description, model, thinking, `mark_seed`, mark, roster, leads,
  live session/running summaries, unread count, state and problems. At least
  these fields have a fixed form: `roster` is the list of bot ids the bot leads
  and `leads` the list of bot ids that lead it ([teams](teams.md) R2, R4; both
  empty lists when none); `live` is a list with one entry per session that has
  a live engine process, each with `session` (the session UUID) and `running`
  (boolean, a turn in progress).
  `GET /bots/<id>` provides that bot's detail. `myharness bots` prints readable
  rows with ids/names and applicable live/unread/roster/problem/status summaries;
  an empty set prints `count: 0 bots`. Live discovery and diagnostic changes do
  not require an app or daemon restart.
- **R5 — Marks and prompts.** `mark_seed` defaults to the bot id and deterministically
  selects its mark, not its address. `myharness mark <bot> [--light] [--size n]`
  emits SVG (default dark, size 128, positive finite size); an unknown bot uses
  the supplied id as seed. `myharness prompt <bot>` prints the assembled prompt
  offline; `GET /bots/<id>/prompt` offers the owner API view. Assembly belongs
  to the [engine contract](engine-contract.md); no notes are loaded implicitly.

## Controls

Not applicable; bot selection and editing controls belong to [ui-shell](ui-shell.md), [config-editors](config-editors.md) and [status](status.md).

## Edge cases

- **E1 — Duplicate or invalid id.** Creation refuses an existing directory or
  invalid id with usage exit 2, leaving that directory unchanged. This is not
  a rename operation. Changing `name` does not change the id or session paths.
- **E2 — Invalid configuration.** Apply [home](home.md)'s last-good rule;
  discovery diagnostics do not authorize a launch with malformed settings.
  Removing a bot directory is not a supported data migration or a promise to
  erase that bot's independent bridge logs. Removing one while its engine runs
  must not stop the daemon ([daemon](daemon.md) R8).
- **E3 — Model availability.** Creation and discovery do not prove a model login
  or launch is working. A missing chosen engine is an explicit run failure,
  never a fallback to another person's provider credentials.

| Id | Given | When | Expect |
| --- | --- | --- | --- |
| **T1 — Create while daemon runs** | Initialized home and running daemon | Create a valid bot with `myharness bot new`, then use an allowed messaging route | Creation writes bot.toml and empty SYSTEM.md; live discovery lists its stable id without an extra config write or restart. Messaging still requires normal reach, not creation alone (R1, R4; [messaging](messaging.md) R1, R4). |
