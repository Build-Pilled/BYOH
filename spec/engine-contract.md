# Engine adapter contract

Classification: Core. Prerequisites: initialized [home](home.md), isolated host, at least one selected adapter.

## Purpose

Connect persistent conversations to the engines the person chose, without making
queueing, messaging or the app depend on one engine. The selected
[Pi](engine-pi.md) and [Claude Code](engine-claude-code.md) sections own native
launch and account details. This is an outward contract, not a required class layout.

## Required behaviour

- **R1 — Selection and identity.** At least one adapter is present. Models with
  the `claude-code/` prefix select Claude Code; other model ids select Pi. An
  omitted model uses the selected adapter's native default; a Claude-only build
  must not silently select an absent Pi adapter. Unselected adapters add no
  keys, dependencies or tests. A session records its engine when first
  run; transcript reading uses that engine even after the bot's model changes.
  Cross-engine continuation follows [sessions](sessions.md), never native resume
  of an incompatible transcript.
- **R2 — Configurable starts.** Each selected adapter declares a global launch
  command in `myharness.toml`. Accept an executable string as one literal argv
  element, or a nonempty string array containing executable and initial args.
  Append the adapter's ordinary arguments; never evaluate a shell command string.
  This is the fake-model seam: a wrapper executable can set the fake
  endpoint and dummy credentials after the adapter has prepared its environment,
  then exec the real engine. No production API-env bypass, test-only daemon route
  or replacement account is needed. Keep mock state in a disposable OS HOME,
  engine state directory and app profile as well as a selected harness home.
- **R3 — Live and stored surfaces.** A live adapter accepts text and supported
  images, ordinary input, follow-ups and steering; reports streamed text, tool
  calls/results, usage when available, settlement, errors and process exit;
  supports Stop, compaction, title updates and orderly close. It exposes native
  transcript messages with stable entry ids, roles, text, tool calls/results,
  images, timestamps, model and context counts when reported ([reply
  details](reply-details.md)). Missing usage is unknown, not zero. Transcript/image
  reads and forks ([conversation branching](conversation-branching.md)) do not
  require a model turn.
  [Turns](turns.md) owns durable acceptance, pickup and uncertain delivery; an
  engine's successful write is not proof of model pickup or completion.
- **R4 — Prompt order.** `myharness prompt <bot>` and owner
  `GET /bots/<id>/prompt` expose the harness-assembled system prompt offline and
  online. Join nonempty parts with one blank line: the bot's `SYSTEM.md` with
  trailing whitespace removed; a small harness identity/framing block; then
  available automatic skills from [Library](library.md). Missing/empty SYSTEM
  contributes no substitute persona. The identity block states bot id, display
  name, bot directory, notes directory (not implicitly loaded), and
  `MYHARNESS_WORKSPACE`. A lead with a nonempty roster gets its members sorted
  by id with one-line descriptions shortened to at most 200 characters, including
  ellipsis. Other bots get no roster, contact or bridge list. Explain person,
  bot and routine framing and, only for that nonempty lead roster, incident
  framing; plain transcript replies do not deliver messages to peers.
- **R5 — No invisible policy.** Do not append delegation policy, a persona,
  memory/note-taking rules, tool-use guidance or app instructions to the harness
  block. Those belong in chosen bot instructions or skills. Engine-native
  additions are identified in each adapter section, not represented as harness
  text. The session metadata records the prompt contract version used at
  creation. [Messaging](messaging.md), [routines](routines.md) and
  [failure alerts](failure-alerts.md) own automation frames; [annotations](annotations.md) own quoted person input. Automation is never relabelled as a person request.
- **R6 — Tool boundaries.** Native tool selection is separate from shared skills,
  MCP tools and `send_message`. Expose messaging only when the bot has reachable
  peers under [teams](teams.md)/bridges, and reconcile eligibility as it changes.
  A first bridge can make it available without recreating the conversation.
  No peers and no configured MCP servers add no model tools from the harness.
  Adapter-private control commands are not model tools or extra prompt text.
- **R7 — Process and drift proof.** Run in bot `cwd`, with per-session scratch
  at `MYHARNESS_WORKSPACE` and the fixed CLI on PATH. Put `<home>/bin` on the
  PATH of every bot process the harness starts, so the executable `factory-db`
  installed by `init --examples` is available by bare name and follows the
  selected `MYHARNESS_HOME` ([home](home.md) R2). Scope daemon credentials
  to the bot/session, not the owner token. Apply home process/idle limits and
  close owned children on normal exit and SIGINT/SIGTERM. Each selected adapter
  has a pinned-version contract scenario covering launch, input pickup,
  streamed reply/tool result, native resume and Stop against the fake model.
  Record exact engine and Node versions; no bare/latest third-party installs
  or silent engine upgrades. Recipe pins and a candidate
  version's drift proof are dependencies of release, not a claim of proof here.

## Controls

Not applicable; shared composer and model controls belong to turns and the
[model-picker](model-picker.md) section. Each adapter's sign-in entry belongs to Settings.

## Edge cases

- **E1 — Missing engine or login.** Fail visibly with useful engine diagnostics;
  do not substitute another adapter, account or provider. Preserve accepted
  input/recovery state according to turns. Offline prompt inspection is not
  real-login proof.
- **E2 — Broken native protocol.** Invalid events, missing receipt support or
  unexpected exit cannot count as successful delivery. Retain useful bounded
  error output without exposing tokens; uncertain pickup requires manual Retry,
  not replay based on matching text.
- **E3 — Prompt changes.** Notes are never silently added. Changes to instruction
  files affect future assembled prompts, not stored historical messages. Native
  engine wrappers and compaction summaries may remain in model context; do not
  promise that the offline prompt is the entire engine request.

| Id | Given | When | Expect |
| --- | --- | --- | --- |
| **T1 — Assemble without a leaked roster** | Lead with members, member or solo bot; empty/nonempty instructions and automatic skills | Read offline/online assembled prompts and the native prompt supplied to a turn | Join only the R4 parts in order with one blank line and trimmed instruction tail; missing instructions add no persona. Only a nonempty lead roster gets sorted member descriptions, at most 200 characters including ellipsis. Other bots get no harness roster/contact/bridge list; native additions remain disclosed, not claimed absent (R4, R5, E3). |
| **T2 — Changed instructions, unchanged history** | Live or resumed session with stored replies and edited SYSTEM.md | Assemble the next prompt and run the next turn | Future assembled prompts use the new instructions without rewriting old messages or silently adding notes. Pi replaces its default before a turn; Claude supplies its assembled prompt through its native prompt file. Do not equate the offline prompt to the entire native request (R4, R5, E3; [Pi](engine-pi.md) R4; [Claude Code](engine-claude-code.md) R2, R5). |
| **T3 — Tools follow reach, not built-in selection** | Live bot with a native built-in selection and changing team/bridge reach | Lose/restore a lead or add/remove the only bridge, then list/use tools | Honor configured native built-ins; their selection does not remove eligible messaging or configured MCP tools. Messaging follows actual reachable peers and reconciles without recreating the conversation; no peers and no MCP configuration add no harness model tools. A stale listing never grants delivery permission (R6; [Pi](engine-pi.md) R2; [Claude Code](engine-claude-code.md) R3; [teams](teams.md) R2, R3; [MCP](mcp.md) R4, R5, E2). |
| **T4 — CLI from the bot process** | A supported daemon launch and bot engine that can run bash | Invoke the fixed CLI from the bot process, including a non-interactive launch | myharness and <home>/bin are on PATH, so the example-installed executable factory-db resolves by bare name under the selected home; the engine runs in bot cwd with its session workspace, and credentials are bot/session-scoped rather than the owner token (R7; [host](host.md) R6; [CLI](cli.md) R5). |

Proof: For each selected engine at its pinned version, `suite/engine-contract.mjs` runs against the mock and checks launch, input pickup, a reply streamed before settling, a tool call and its result, native resume after the engine closed, and Stop pausing the queued follow-up. Without a pin the case is not run. Real login is proved separately. Evidence: JSON.