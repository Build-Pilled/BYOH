# Daemon lifecycle and API credentials

Classification: Core. Prerequisites: an isolated host and an initialized harness home.

## Purpose

Keep bots and conversations available independently of the app window, and
restrict the daemon API to its intended clients. This section owns startup,
discovery, health and the distinction between owner and bot-session credentials.
[Host](host.md) R2 owns service persistence across logout and reboot, and
[isolation](isolation.md) R3 who may install or change the service: bots share
the daemon's OS user and cannot change it, but can kill its process.
The messaging section owns the operations a bot-session credential permits.
[App pairing](app-pairing.md) owns the Mac's copy and origin-scoped use of the
owner token.

## Required behaviour

- **R1 — Lifecycle.** `myharness daemon` runs the daemon for the selected home.
  Its default listener is `127.0.0.1:7797`; a configured `listen` address is
  loopback only. `--port <port>` overrides the port, including `--port 0` for
  an OS-selected free port. The app does not start the daemon. Closing the app
  does not stop it. SIGINT or SIGTERM closes the listener and shuts down engine
  children started by that daemon without deleting persistent conversations.
  Stopping finishes within 20 seconds, including with an engine that ignores SIGTERM.
- **R2 — Discovery.** Once listening, the daemon writes UTF-8 JSON at
  `<home>/log/daemon.json`, with `pid` (positive integer), `url` (absolute HTTP
  loopback URL including the actual port) and `started` (ISO timestamp).
  A clean stop removes that file. Discovery is not a liveness guarantee after
  a crash: clients probe the address rather than treating the file as proof.
- **R3 — Health.** Owner-authenticated `GET /health` returns HTTP 200 and a JSON
  object containing `ok: true`, `pid`, `home` (absolute selected home), and `url`.
  The pid and URL agree with discovery. Health is authenticated just like the
  other owner API routes; it is not a credential-free exception.
- **R4 — Owner credential.** Before listening, the daemon creates
  `<home>/secrets/owner-token` if absent. A new token contains 32 random bytes
  encoded as 43 unpadded base64url characters, followed by a newline. A new
  `secrets` directory has mode 0700 and a new token file has mode 0600.
  The home history excludes `secrets/`. A valid existing token is retained
  across restarts. The file is a regular file owned by the daemon's OS user,
  readable by that user, with no executable or group/other permission bits.
  Accepted existing values are 43–256 base64url characters, with at most one
  final newline. Invalid or unreadable files block startup; no silent repair,
  replacement or permission broadening occurs.
- **R5 — Request authentication.** Owner routes accept the token only in
  `Authorization: Bearer <token>`; the scheme is case-insensitive and separated
  from the token by whitespace. Missing, wrong or misplaced credentials return
  HTTP 401 without echoing them. This check precedes route dispatch, including
  unknown paths, static app assets, event streams and OPTIONS requests. A query
  parameter, cookie, bare token, Basic credential or unrelated header does not
  authenticate a request.
- **R6 — Separate authority.** Bot-facing messaging routes accept only a live
  bot-session token and act as its bot and session. The owner token cannot
  impersonate it, and a session token cannot access owner routes such as health,
  configuration or issuing a session token. Issuing a bot-session token through
  `POST /sessions/<bot>/<session>/token` requires owner authentication.
- **R7 — Client errors.** CLI clients distinguish an unreachable daemon from a
  reachable daemon rejecting a token. Both fail with exit status 1. Rejection
  names the token-file location and does not say “not running”; a missing or
  unusable local token explains that a daemon start/restart creates it. Clients
  do not create an owner token themselves. No diagnostic prints its value.

- **R8 — Bot directory retired mid-run.** Moving or deleting `bots/<id>` while
  that bot's engine runs is not a supported operation ([bots](bots.md) E2), but
  it must not take the daemon down. When the engine then exits and the daemon's
  own file writes for that bot or session fail, the daemon writes a scoped error
  line to its error output naming the bot, the session, the operation, the path
  and the system error, and carries on: `GET /health` stays `ok` and sessions of
  other bots keep working. Only file-system failures are contained this way;
  other errors stay fatal. Nothing the daemon does afterwards, including a late
  callback, recreates `bots/<id>` or anything below it, and a session's own
  folders are created below an existing bot directory, never with the bot
  directory itself.

## Controls

Not applicable; this section has no UI controls.

## Edge cases

- **E1 — Bad token on disk.** Empty, malformed, multi-line, symlink or directory
  token paths, wrong ownership and overbroad permissions prevent a listener and
  discovery announcement for that start. The offending file is left unchanged.
  Deleting the token and restarting is an explicit rotation operation, not a
  client fallback; a running daemon retains the token it loaded at startup.
- **E2 — Concurrent creation.** Starts racing to create an absent token converge
  on one complete token; no partial credential or temporary token file remains.
  This does not promise multiple live daemons safely sharing one home. The kit
  uses a different home for each instance.
- **E3 — Busy port or non-loopback configuration.** Startup fails visibly rather
  than exposing a different network interface or announcing an unbound address.
  The normal fixed port is not silently changed; isolated runs request port 0.
  Refusal is required.
- **E4 — Stale discovery.** After a crash, a discovery file may remain. A stopped
  listener is “not running”, not a credential rejection. A pid match alone does
  not justify killing a process that the client did not start.
- **E5 — File access is not a token transport.** Even an owner-authenticated
  files API cannot read, write, delete or list the credential directory, including
  case/Unicode-normalized aliases and symlinks into it. A denial leaves its bytes
  unchanged and never returns credential contents. The config-editors section
  owns the wider protected-file contract.

| Id | Given | When | Expect |
| --- | --- | --- | --- |
| **T1 — Token before bind** | Fresh home without token | Daemon reaches listener bind | Complete R4 token already exists, with required permissions and history exclusion; retain it on restart (R4). |

Proof: `suite/daemon.mjs` runs disposable homes, each with its own `myharness daemon`, and checks: owner-token creation, format, modes and retention; 401 on every route without the Bearer token; owner and session token separation; refusal of bad token files; concurrent token creation; CLI messages for a rejected token, a missing token and a stopped daemon; loopback-only listening; a stop with an engine that ignores SIGTERM; and, for R8, that the daemon stays up and serves another bot when a bot directory is moved away mid-turn. Evidence: JSON with no token bytes.