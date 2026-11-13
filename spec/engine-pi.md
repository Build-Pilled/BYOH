# Pi adapter

Classification: Core (selected adapter). Prerequisites: Pi selected by the power-source answer; [engine contract](engine-contract.md).

## Purpose

Run Pi with the person's chosen provider and native account setup. This section
owns Pi launch/isolation, not a recommendation of subscription versus API billing.
The [terminal](terminal-chat.md) and [compaction](compaction.md) sections own those
entry points; the [model picker](model-picker.md) owns selection controls.

## Required behaviour

- **R1 — Conditional keys.** Only a harness selecting Pi accepts global `pi`
  (default executable `pi`) and bot `extensions` (string array, default empty).
  Bot `command` overrides the global Pi command; both are literal argv under
  the engine contract. Bot `context_files` is boolean, default false; this key
  is also available when Claude Code is selected, with its adapter-specific
  meaning. An unselected adapter adds no dead keys.
- **R2 — Native launch.** Daemon sessions use Pi's JSON RPC mode, selected
  session directory and native session id/file. Terminal sessions use Pi's
  interactive mode. Disable automatic extensions, skills, prompt templates,
  themes and per-step approval; load the harness integration explicitly, then
  the configured extensions, and the native MCP integration when needed.
  Skills come from the harness's selected skill paths, not unrelated global
  discovery. Suppress project context-file discovery unless `context_files`
  is true. Do not confuse discovery permission with adding those files to the
  harness-authored prompt; the latter is replaced by the engine contract.
  Default built-in tools are `read`, `bash`, `edit`, `write`; configured tools
  select from the bot schema's known names. Messaging/MCP tools remain separate.
- **R3 — Resume and launch changes.** Native JSONL transcripts live in the bot's
  sessions directory; metadata stores the basename. Resume the native session
  file without overriding its saved launch blindly. Same-engine model/thinking
  changes are applied for the next turn, including a live process. Resolve the
  requested model against Pi's available registry, check login and native
  context capacity/reserve before switching. Unknown size/capacity, unavailable
  model, missing login or too-small window retain the previous launch, including
  thinking, rather than blocking the next turn. Record requested and effective
  launch plus a visible refusal notice; retain a refused request across reaping
  and daemon restart until the requested configuration changes. Do not rewrite
  `bot.toml`. Report effective thinking, not an assumption that all seven values
  are distinct on every model.
- **R4 — Prompt and delivery.** Replace the native default system prompt with
  the harness-assembled prompt before a turn. Native tool descriptions and
  native compaction wrappers remain engine-owned. Use native steering/follow-up
  operations and correlate stable input ids with positive native pickup
  observations as required by [turns](turns.md); missing or broken receipt
  support is an explicit error/unknown state, never text-based matching.
- **R5 — Account choice.** The user configures their own provider through Pi's
  native login or API-key mechanism. OpenAI models on a subscription use Pi's
  `openai` provider with Sign in with ChatGPT, not a legacy route. That route
  is permitted under OpenAI's Sign in with ChatGPT terms when used as designed:
  one person, their own account, on a machine/VM they control, within plan
  limits, without sharing or rotating accounts. Serving others or acting on
  their activity requires an API key. Anthropic subscription use goes
  through unmodified Claude Code, not Pi; an Anthropic API key can use Pi.
  Do not import, extract or transfer another engine's subscription credentials.
- **R6 — Login boundary and pin.** Native Pi account state is outside harness
  home, under Pi's own OS-home state directory; do not treat moving harness
  home as an account migration. The supplied VM forwards native login callback port
  1455, listening only during login; own hosts use a temporary SSH forward or
  native paste route. Settings owns sign-in controls. Record an exact
  installed Pi version in the host recipe ([VM](vm.md) R2) and evidence, disable unrequested
  upgrades and prove protocol/receipt compatibility before changing that pin.
  A mock run uses a disposable native state directory and fake provider, never
  a production login. A real chosen-provider login check is distinct evidence.

## Controls

Not applicable; Connections sign-in controls belong to [Settings](settings.md), model
selection to model-picker, and the interactive terminal is engine-native.

## Edge cases

- **E1 — No selected provider.** A successful mock reply is not evidence of a
  usable real account. An unavailable requested provider fails or produces the
  retained-launch notice under R3; never silently borrow another account.
- **E2 — Custom launch.** A configured extension or executable can change engine
  behaviour and has the bot user's authority. A failed extension/receipt bridge
  cannot be hidden as a successful harness turn. Literal arguments containing
  spaces stay single arguments; there is no implicit shell splitting.
- **E3 — External state.** Verification supplies a throwaway OS HOME/native state
  as well as a separate harness home. Never read the person's real Pi login to
  seed mock proof; a missing native transcript is not an empty successful resume.

| Id | Given | When | Expect |
| --- | --- | --- | --- |
| **T1 — Refusal retains the paired launch** | Live idle or non-live resumed session with a known effective model/thinking | Request an unavailable, unauthenticated, unknown-capacity or too-small model, or reject thinking after model selection | Retain the previous model and thinking together, with requested/effective launch and visible refusal, rather than blocking the next turn or rewriting bot.toml. Retain refusal across reaping/restart until requested configuration changes; then check the new request (R3; [model picker](model-picker.md) R5). |
| **T2 — Context and pending input survive a change** | A growing reply with an accepted follow-up, or a native resume whose physical model differs from the recorded effective launch | Save a same-engine change during the reply, then settle/resume and dispatch | Apply checks for the next turn, not halfway through the reply; account for native context capacity/reserve and retain the previous launch on refusal. Preserve the queued follow-up and native history; observed next-turn launch must agree with the checked effective launch, not merely the saved request (R3; [model picker](model-picker.md) R5; [turns](turns.md) R2; [sessions](sessions.md) R3). |
| **T3 — Literal text and expanded skills** | Native user entries with literal markup/UUID-like text and a manual skill invocation | Read/resume/fork the history and correlate the skill-expanded input | Preserve the native person text rather than deleting text that only resembles protocol markup. Skill expansion follows Skills & MCP R4, while positive native pickup identifies the accepted input rather than matching its pre-expansion text; native reads/forks need no model turn (R4; [engine contract](engine-contract.md) R3; [Skills & MCP](skills-mcp.md) R4; [branching](conversation-branching.md) R3). |
| **T4 — Broken correlation is not pickup** | Distinct accepted inputs with identical text; native receipts/history may cross a scope or ordering boundary | Interpose another native message, fork history, break ordering or clear a native queue before a later identical input | Confirm only positive pickup of the correct input in its session, never text equality or an older receipt copied with history. Broken/missing support is an explicit error/unknown state, not fabricated success; uncertain input is not auto-replayed. Keep bounded diagnostics free of tokens (R4; [engine contract](engine-contract.md) E2; [turns](turns.md) R5, R6; [branching](conversation-branching.md) R2). |
