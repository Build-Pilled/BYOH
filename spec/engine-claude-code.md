# Claude Code adapter

Classification: Core (selected adapter). Prerequisites: Claude Code selected by the power-source answer; [engine contract](engine-contract.md).

## Purpose

Run Anthropic models through unmodified Claude Code on the person's own login.
This is an adapter, not a reimplementation of its subscription protocol. Native
engine additions and external transcript paths are made explicit here.

## Required behaviour

- **R1 — Conditional configuration.** A selected Claude adapter accepts global
  `claude` (default executable `claude`, literal string or nonempty argv array).
  Bot `claude_settings` optionally names an absolute or `~/`-expanded path to a
  readable JSON settings file; reject unreadable/invalid JSON at launch with a
  useful path-specific error. A relative path is never resolved against any
  directory: `myharness validate` reports it as a problem naming
  `claude_settings` and the absolute or `~/` rule, the bot has no valid
  configuration, and launching it is refused. Bot `context_files` is boolean, default false,
  also declared by Pi when selected. The Pi bot `command` override and
  `extensions` do not override Claude's global start command. Unselected Claude
  adds no `claude`/`claude_settings` keys.
- **R2 — Native invocation.** Strip `claude-code/` from the configured model id
  before passing it to the engine. Use bidirectional stream JSON with partial
  output for daemon sessions and native interactive mode for terminal sessions.
  Supply the assembled prompt through a per-session system-prompt file under
  the bot sessions directory, created owner-only; disable prompt snapshots.
  Use explicit tools, strict MCP configuration and empty setting sources, with
  optional `claude_settings` loaded explicitly. The default prompt is replaced;
  do not discover unrelated global/project settings, hooks, skills or memory.
  Per-step permission prompts are bypassed only inside the isolated host; that
  is not an additional OS permission or a removal of the host boundary.
- **R3 — Native tools and effort.** Default tools are Read, Bash, Edit, Write,
  WebSearch and WebFetch. Translate bot tool names: `read`/`bash`/`edit`/`write`
  to their native names, `grep` to Grep, `find` and `ls` to Glob,
  `web_search`/`web_fetch` to WebSearch/WebFetch, removing duplicates. MCP tools
  are separate. Map `off`, `minimal`, `low` to native `low`, and preserve
  `medium`, `high`, `xhigh`, `max`. Show the effective launch rather than
  promising native support for every effort on every model. Same-engine changes
  use native live control when available, with a bounded timeout and resume
  fallback; preserve context and record effective launch or a visible failure.
  [Model-picker](model-picker.md) owns the common change/refusal UI.
- **R4 — Account boundary and fake-model seam.** Remove inherited
  `ANTHROPIC_API_KEY`, `ANTHROPIC_AUTH_TOKEN`, `ANTHROPIC_BASE_URL`,
  `ANTHROPIC_CUSTOM_HEADERS`, `CLAUDE_CODE_USE_BEDROCK`,
  `CLAUDE_CODE_USE_VERTEX` and `CLAUDE_CODE_USE_FOUNDRY` on normal adapter launch.
  Use Claude Code's native login, covering the person's Claude subscription or
  Anthropic Console account; other provider/API-key setups use Pi. No new
  harness API-account setting is required. The kit uses a
  `claude` command wrapper to set a loopback fake endpoint and dummy API key
  *after* this preparation, then exec unmodified Claude Code. It uses disposable
  OS HOME and `CLAUDE_CONFIG_DIR`, with no subscription token. Do not relax
  production filtering to make tests work.
- **R5 — Prompt isolation and disclosed additions.** Disable auto updates,
  attachments/context notes, auto memory and Git instructions on every launch.
  Disable CLAUDE.md discovery unless `context_files` is true. These native
  switches are version-sensitive and must be rechecked before a pin changes.
  Claude Code still supplies its billing/identity headers, native tool
  schemas/descriptions, an environment message (cwd, platform, shell, OS, model,
  date and native untrusted-download guidance), possibly the signed-in account
  email, background-task notices and native compaction continuation/command
  records. The harness does not author those additions or claim to remove them;
  do not add a duplicate safety paragraph or suppress engine security guidance.
- **R6 — Transcript and login paths.** Native account/config state defaults to
  the OS-home `.claude` directory or explicit `CLAUDE_CONFIG_DIR`; login also
  owns native account metadata outside harness home. Native JSONL transcripts
  live under that config directory's `projects/` trees. Metadata records the
  absolute transcript path once known; look up the session UUID there when
  needed. Moving harness home alone does not move native account/transcripts.
  Resume the native UUID, not a fabricated copy of rendered text. Transcript
  readers follow the active branch, suppress duplicate/meta/sidechain noise,
  preserve tool-use/result association and images, and expose native compact
  boundaries through [compaction](compaction.md). Missing native history is
  reported, never represented as successfully loaded empty history.
- **R7 — Terms and pin.** Used as designed, this adapter stays within the
  engines' terms: unmodified Claude Code, one person on their own login, no
  account sharing/rotation, machine/VM they control and use within plan limits.
  Serving others or acting on their activity needs an API key; the
  setup agent follows the selected adapter/account route, not token extraction.
  Login uses Claude Code's own code/paste flow and needs no callback port.
  Record an exact Claude Code pin in the host recipe ([VM](vm.md) R2) and evidence; no silent
  update. Prove prompt isolation, native input/pickup, resume and Stop on a
  candidate pin through the fake model before changing it.

## Controls

Not applicable; Connections owns sign-in controls in [Settings](settings.md). Native
terminal interaction and its explicit limitation belong to [terminal chat](terminal-chat.md).

## Edge cases

- **E1 — Broken settings or account.** A launch error names its cause; it is not
  a reason to import ambient credentials, enable unrelated settings, or fall
  back to another engine. No model call is needed to reject unreadable JSON.
- **E2 — Mock versus real account.** Fake-model proof establishes adapter
  behaviour, not real account eligibility, provider billing or successful login.
  Keep real login proof separate and never include credentials/email in evidence.
- **E3 — Engine limitations.** Do not promise that the offline harness prompt
  exhausts native model context or that all historical native entries remain
  forkable after compaction. The compaction and [branching](conversation-branching.md) sections own
  those limits; terminal ownership must prevent a second writer.

| Id | Given | When | Expect |
| --- | --- | --- | --- |
| **T1 — Re-emitted branch is not extra history** | Native active history with compact boundaries and re-emitted duplicate/meta/sidechain entries | Read it alongside a clean active-history control | Suppress duplicate/meta/sidechain noise while preserving the active conversation, native compact records, tool association and images; a duplicate block must not add another copy or reorder the same active messages (R6; [engine contract](engine-contract.md) R3; [compaction](compaction.md) R4). |
| **T2 — Live launch controls and fallback** | Idle or busy session, concurrent configuration saves and a queued next turn | Apply model/effort changes; native live control succeeds, refuses or times out | Do not change halfway through the reply. Use available live control with bounded timeout and native resume fallback, preserving context; record the effective launch or visible failure. Later checked changes govern later turns without losing the queued input (R3, R6; [model picker](model-picker.md) R5; [turns](turns.md) R2). |
| **T3 — Close during launch control** | An owned live process with a launch change awaiting native control | Close the session/process while control is pending | Orderly close and child cleanup still apply; delayed control/fallback must not leave an unowned child or revive a closed process as hidden work (R3; [engine contract](engine-contract.md) R7). |
| **T4 — Bad settings are not a fallback account** | Daemon or terminal launch or relaunch; claude_settings absent, absolute, tilde, relative or unreadable/invalid JSON | Validate and launch with isolated native settings and conflicting inherited update flags | Relative paths are invalid and never resolved; unreadable/invalid JSON is rejected with useful path-specific diagnostics, without borrowing ambient settings/account or making a model call to validate it. Keep diagnostics/evidence free of credentials. Valid launch uses explicit settings/empty setting sources and preserves R5 update/context isolation (R1, R2, R5, E1, E2). |
