# MCP connections

Classification: Core. Prerequisites: selected [engine adapter](engine-contract.md), configured bot and server.

## Purpose

Connect a bot to explicitly selected external tools, without conflating a tool
server with permission to message arbitrary bots. [Library](library.md) owns
server-file creation; [config-editors](config-editors.md) owns bot selection controls.

## Required behaviour

- **R1 — Server definitions.** A bot's `mcp` string array names shared
  `mcp/<name>.toml` files; default empty. A definition accepts `command` (stdio
  executable string), `args` (string array), `env` (table), `cwd` (string), `url`
  (HTTP endpoint string), `headers` (table), `exposure` (string) and `timeout`
  (number). A usable server needs command or URL. Table values are strings for
  environment/header use. [Home](home.md)'s offline validation checks named-file
  existence, not complete MCP definition/schema or connection validity; do not
  claim an OK result establishes these. Native setup/connection errors remain
  engine diagnostics. Reference resolution when both command
  and URL exist is adapter-specific under R3/R4, not a cross-engine portability
  promise. A missing named file is a problem, not a new implicit server.
- **R2 — Expansion and authority.** In env/header string values, `$NAME`
  references are passed through the engine's environment-substitution syntax,
  using the daemon launch environment. Do not copy secrets into evidence or
  substitute credentials from another account. Executable plus args is literal
  argv, never a shell command. An MCP server runs with the bot user's authority;
  selecting one does not grant admin access or bypass host egress. Third-party
  commands use exact pinned versions, never an unversioned package
  runner or `@latest` starter template.
- **R3 — Pi mapping.** Load Pi's native MCP integration when servers are selected.
  Register each named definition with supplied stdio/HTTP options, environment,
  headers, working directory and timeout. A definition containing both transport
  sets passes both to native Pi; do not promise a portable winner. Default
  exposure is `direct`; native alternatives are `deferred`, `codemode`,
  `codemode-deferred`, `hidden`. Direct exposure presents server tools as
  `mcp__<server>__<tool>`, subject to native sanitization/length limits, with the
  server's descriptions/schema. Native Pi owns other exposure protocols and
  timeout behaviour; a configured positive timeout is in seconds.
- **R4 — Claude mapping.** Supply strict explicit native MCP config. External
  definitions with a command use stdio (command, args, env); otherwise use HTTP
  (url, headers). `cwd`, Pi exposure and Pi timeout do not affect Claude's
  mapping; do not pretend these options are implemented by Claude. Reserve
  server name `myharness` for the harness's own messaging server, launched as
  `myharness mcp` with scoped home/bot/session/API/token environment. A shared
  external definition with that name does not replace it. External tools use
  Claude's native names/sanitization. Built-in tool filtering does not remove
  configured external tools.
- **R5 — Messaging server.** `myharness mcp` serves newline-delimited JSON-RPC
  over stdin/stdout, requires `MYHARNESS_BOT`, and ends at stdin EOF. Support
  initialize, tools/list and tools/call, advertising tool-list changes. Echo
  the requested protocol version (default `2025-06-18`) at initialization.
  Offer `send_message` only when actual team/bridge reach exists; recheck reach
  for calls in the daemon. Its arguments and routing are those of
  [messaging](messaging.md). Claude sees `mcp__myharness__send_message`. Success
  reports recipient/session; failure is a text tool result with `isError`, not
  a successful delivery. Tool-list changes reflect gained/lost peers without
  restarting the conversation. Protocol stdout contains no human log chatter.
- **R6 — Connection failures.** A failed server start, connection, schema or
  tool call is observable as a native error/diagnostic, not a fabricated tool
  response or a reason to silently route to a different server. Definitions
  are prepared for a new engine process; editing them does not promise hot
  reconfiguration of an already connected external server. No configured
  servers means no external MCP tools.

## Controls

Not applicable; Library owns `New MCP server` and file rows; [config-editors](config-editors.md) owns the bot's server selections and shared editor controls.

## Edge cases

- **E1 — Definition versus connection.** Offline validation does not start a
  server or prove login/network reach. A valid definition with a dead endpoint
  still needs a failed-connection proof, never a green skip.
- **E2 — Revoked reach.** A stale messaging tool listing grants no permission.
  Daemon authorization remains authoritative; a rejected call leaves message
  delivery unchanged. External server selection grants no peer reach.
- **E3 — Unavailable environment.** Environment substitution is native-engine
  behaviour, not a guarantee of a present credential. A missing value cannot
  be repaired by reading another engine's login or by recording token bytes.

| Id | Given | When | Expect |
| --- | --- | --- | --- |
| **T1 — Messaging crosses adapters, not permission boundaries** | Claude sender with a reachable Pi peer, then revoked reach or an unreachable peer | Call messaging through the native MCP tool and inspect recipient/session effects | Use myharness messaging with scoped bot/session authority and messaging routing/framing; success identifies recipient/session, failure is an isError text tool result, not delivery. Recheck reach in the daemon even with a stale tool listing. Configured external tools do not grant peer reach (R4, R5, E2; [messaging](messaging.md) R2, R3). |
