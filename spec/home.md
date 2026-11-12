# Harness home and configuration

Classification: Core. Prerequisites: an isolated host with Git and the selected engine adapters.

## Purpose

Keep one identifiable harness instance's configuration and runtime state together.
[Verifiability](verifiability.md) owns home selection and disposable engine state;
[daemon](daemon.md) owns credentials. Engine sections own native transcript and
login locations; this layout does not relocate an engine's own login files.

## Required behaviour

- **R1 — Selection and initialization.** `MYHARNESS_HOME` selects an absolute
  resolved home; default `~/.myharness`. Expand `~` and `~/` against the OS home;
  resolve other relative home overrides against the calling directory.
  `myharness init` creates missing home, `bots/`, `teams/`, `skills/`, `mcp/`,
  default `myharness.toml`, and a local Git history. Repeating it preserves an
  existing config and existing files. `--examples` adds the starter examples;
  their content and source paths belong to [starter bots](starter-bots.md).
  Examples are a plain copy: no install-time placeholder substitution or
  interview record is needed. Repeated initialization still preserves existing
  files, including edits.
- **R2 — Layout.** Under the home: `bots/<id>/bot.toml`, `SYSTEM.md`,
  `skills/<name>/SKILL.md`, `routines/<name>.md`, `notes/`, and `sessions/`;
  `teams/<id>.toml`; shared `skills/<name>/SKILL.md`; `mcp/<name>.toml`;
  `bridges/<sorted-a>--<sorted-b>/link.toml` and `log.jsonl`; `log/daemon.json`;
  `log/app-outbox/<bot>%2F<session>.json`, the app's recovery copies of unsent input and the composer draft ([turns](turns.md) R8);
  `bin/factory-db`, the executable wrapper installed by `init --examples`;
  `secrets/owner-token`; the task table `tasks/factory.db`, created by the crew's
  project-management skill, and its edit journal `tasks/task-edits.jsonl`, created
  by the [Tasks](tasks.md) view's first save; `init` creates neither; and `session-archive/` as specified by
  [session tidy](session-tidy.md). Notes are not automatically prompt context.
  Runtime directories may be created lazily. Configuration is UTF-8 TOML;
  instructions are plain Markdown; runtime records use JSON or JSONL.
- **R3 — Global fields.** Core `myharness.toml` fields are `listen` (string,
  default `127.0.0.1:7797`), `tz` (IANA zone, default host zone, UTC if unavailable),
  `idle_timeout` (default `"10m"`) and `max_processes` (positive integer,
  default 3, per-bot live-process limit). Adapter launch-command keys belong
  to the selected adapter sections, with the literal-argv seam in
  [verifiability](verifiability.md); an unchosen adapter adds no config keys.
  Durations accept numeric seconds or
  nonnegative decimal strings suffixed `ms`, `s`, `m`, `h`.
  Optional-feature fields belong to their feature sections (for example `notify`
  in [desktop notifications](desktop-notifications.md) R5); phone and shortcut
  configuration is not part of release-one core.
- **R4 — Validation.** `myharness validate` reads configuration without a daemon
  or model call. Report relative file path and a useful reason for every found
  problem, then a problem count and exit 1; success prints `OK:` with bot/team
  counts and exits 0. Check TOML syntax, unknown fields, field types, positive
  limits, a `listen` address that is not loopback, time zones, bot fields,
  team references, routine schedules and skill
  front-matter syntax. Check shared skills even if unused, and bot-local skills.
  Missing optional directories are empty, not errors. Missing `bot.toml` in a
  discovered bot directory is a problem. Skill/MCP names referenced by a bot
  must resolve to their shared definition files.
- **R5 — Live diagnostics and last good.** Owner `GET /bots` exposes `problems`
  and per-bot problems; edits are discovered without restarting the daemon.
  A valid bot configuration is retained in memory for that daemon lifetime.
  If a later bot-local config, routine or skill becomes invalid, execution uses
  that last-good bot configuration; with none, execution fails visibly.
  This fallback is not a saved copy of prompt/skill/routine file contents and
  does not promise last-good global configuration or team membership.
- **R6 — History exclusions.** Initialization excludes session runtime trees,
  bridge message logs, `log/`, `secrets/` and the `tasks/` task data from home history.
  The tidy archive is runtime data and is excluded too. Configuration,
  instructions and bridge definitions remain tracked. This local history is
  not a remote backup; optional backup is a separate feature
  ([VM backup](vm-backup.md)).

## Controls

Not applicable; config-editor controls belong to [config-editors](config-editors.md).

## Edge cases

- **E1 — Bad edits.** A diagnostic does not imply a file was repaired. Validate
  does not rewrite files or silently drop unknown keys. Fix the named file and
  reload its diagnostics; a daemon restart loses an in-memory last-good value.
- **E2 — Partial home.** Initialization fills missing scaffolding rather than
  erasing conversations or replacing config. Unwritable paths and Git failures
  produce a nonzero result, not a false completion.
- **E3 — Isolated runs.** Two homes must not share runtime directories or native
  engine state in verification. A home move carries the tidy archive; the engine
  sections must account separately for their native paths. No data migration
  command or shared-home concurrent-daemon guarantee is implied.

| Id | Given | When | Expect |
| --- | --- | --- | --- |
| **T1 — Skill errors and lifetime last good** | Unused shared skill plus bot-local skills, with a valid warmed bot and an invalid cold bot | Read diagnostics, invalidate local skill/config, request execution, repair and reload | Expose shared/per-bot problems without daemon restart. Warm bot uses last-good configuration for that daemon lifetime; without one execution fails visibly. Repair updates diagnostics/config. Do not rewrite bad files, claim cached skill/prompt contents, or promise last-good across restart (R4, R5, E1; [Library](library.md) R5). |
