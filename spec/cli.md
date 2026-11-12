# Command-line contract

Classification: Core. Prerequisites: Node at the project pin; initialized home for commands that read it.

## Purpose

Provide scriptable access without making an app window a prerequisite. This
section owns syntax, offline validation and output boundaries; feature sections
own the operations and their side effects. [Terminal chat](terminal-chat.md)
owns the engine terminal UI, not the parser.

## Required behaviour

- **R1 — Help before effects.** `myharness`, `myharness help`, `myharness --help`
  and `myharness -h` print global help and exit 0. A known command's `--help`
  before `--` prints its usage/flags without reading config, connecting to the
  daemon or launching an engine, even with other malformed arguments. Unknown
  commands/subcommands remain usage errors. Extra arguments to global help
  are errors. Help uses only fixed command/home/environment names.
- **R2 — Arguments.** Accept long flags `--key value` and `--key=value` for
  value flags; boolean flags have no value (`--all=false` is invalid).
  `--` ends parsing and makes all later words positional, including `--help`.
  Reject unknown flags, unsupported short flags, missing values/arguments and
  extra positionals before side effects. Repeated flags use the last value.
  Numeric values must be finite and in the documented range; ports are integers
  0–65535, size and idle days positive, activity limits positive integers.
- **R3 — Core inventory.** The release-one commands and flags are:

  | Command arguments | Flags | Owner |
  | --- | --- | --- |
  | `init` | `--examples` | [home](home.md) |
  | `bot new <id>` | `--name`, `--description`, `--model` | [bots](bots.md) |
  | `validate`, `prompt <bot>`, `log` | none | home, bots, instruction-history |
  | `mark <bot>` | `--light`, `--size` | bots |
  | `daemon` | `--port` | [daemon](daemon.md) |
  | `bots` | none | bots |
  | `new <bot>` | `--folder`, `--title` | [sessions](sessions.md) |
  | `sessions <bot>` | `--folder`, `--all` | sessions |
  | `say <bot-or-team> <text...>` | `--session`, `--no-wait` | [turns](turns.md), teams |
  | `fork <bot> <session>` | `--at`, `--before` (mutually exclusive, nonempty entry id) | [conversation-branching](conversation-branching.md) |
  | `pi <bot> [session]` | none | [terminal-chat](terminal-chat.md) (selected engine's UI) |
  | `mcp` | none | [mcp](mcp.md) (stdio server) |
  | `tidy` | `--days`, `--list`, `--put-back` | [session-tidy](session-tidy.md) |
  | `bridges [bot]` | none | [messaging](messaging.md) |
  | `connect <a> <b>` | `--note` | messaging |
  | `disconnect <a> <b>` | none | messaging |
  | `activity` | `--since`, `--bot`, `--grep`, `--limit`, `--full` | [activity](activity.md) |
  | `routines [bot]`, `routine run <bot>/<name>` | none | [routines](routines.md) |

  All commands also accept R1 help. Value flags take strings unless R2 or the
  owning section gives a number. The deferred phone commands and Mac-only
  `tidy --at-login` are not core Linux commands.
- **R4 — Outputs and exits.** Success exits 0; usage errors exit 2 with an
  `error:` diagnostic and relevant usage/valid flags on stderr; operational
  failures exit 1 on stderr. Validate's findings/count are stdout and exit 1.
  Lists are readable text, with an explicit count when empty, not silent blank
  success. `new` prints a UUID, `mark` SVG, `prompt` the assembled text, and
  ordinary `say` streams model text/tool-start names. Do not add an undocumented
  JSON-output switch or require callers to parse decorative app strings.
- **R5 — Local versus remote.** Help/parsing, init, bot creation, validate,
  prompt, mark, log, tidy and activity work offline. Remote operations discover
  the daemon and owner credential using [daemon](daemon.md), fail without
  spawning a production service, and distinguish unreachable from rejected
  authentication. Terminal chat may run offline but messaging then is not
  available; its section owns attach/detach.
- **R6 — Delivery is not success.** `say` joins text words with spaces and
  defaults to session `latest`. A bot id wins over a team id; a team resolves
  to its lead. Ordinary say waits for the turn's settlement; model/engine failure
  retains already streamed stdout, reports failure on stderr and exits 1. A
  turn stopped while say waits ([turns](turns.md) R4) is not success either:
  say keeps the already streamed stdout, reports a diagnostic containing
  `stopped` on stderr and exits 1, whichever engine ran the turn.
  `--no-wait` prints the destination UUID and exits 0 upon delivery acknowledgement,
  not upon model success. Compaction requests are handled by the compaction
  section, not delivered as ordinary chat.

## Controls

Not applicable; these are terminal commands, not app controls.

## Edge cases

- **E1 — Offline misuse.** Malformed say/port/ids/flags fail as usage errors even
  with the daemon down. No config, transcript or token is created by parsing.
- **E2 — Literal flag text.** `myharness say helper -- --help` sends literal text
  rather than opening help. Nonempty text is required by the command grammar.
- **E3 — Removed scope.** Core help must not offer deferred phone/shortcut
  features. Host scheduling belongs to [host](host.md) R7 rather than
  installing a Mac job from a Linux CLI. Features not selected are not
  shown as broken core commands.

| Id | Given | When | Expect |
| --- | --- | --- | --- |
| **T1 — Help and misuse before effects** | Core R3 commands, a disposable home snapshot and no daemon | Request global/known-command help or give malformed flags, values, ids and arguments | R1 help before -- succeeds without config/network/engine effects even beside malformed arguments; unknown commands and extra global-help arguments remain errors. R2 rejects invalid syntax/ranges with exit2/error and usage on stderr before effects. -- ends parsing and preserves later literal --help. Offer only selected/core command scope (R1–R3, E1–E3). |
| **T2 — Offline help, operational failure** | No discovery file or unreachable/rejecting owner service | Run help, offline commands and an otherwise valid remote operation | Help and R5 local operations need no daemon. Remote failure is operational exit1, not parser exit2 or implicit production-daemon startup; distinguish unreachable from rejected authentication (R1, R4, R5; [daemon](daemon.md) R7). |
| **T3 — UUIDs, literal delivery and readable lists** | Mock-backed bot/team, default and explicit sessions and scoped empty lists | Create, fork, say with variadic/literal words or --no-wait, then list bots/sessions | Join say words with spaces; --help after -- is text. New prints UUID; fork first line is its full UUID. No-wait UUID acknowledges delivery only. Lists retain required identity/time/folder/title and applicable state/live/unread/origin data or explicit zero; operational errors are not fabricated empty success (R2–R6; [sessions](sessions.md) R5; [bots](bots.md) R4; [branching](conversation-branching.md) R1). |
| **T4 — Prompt and mark are their own outputs** | Known bot instruction text and deterministic mark seed | Run offline prompt and mark with defaults or valid size/light options | Print the harness-assembled prompt as text and the deterministic SVG mark, not decorative app strings or an undocumented JSON wrapper. Apply prompt assembly and mark seed/dark128/size rules, not a private serializer golden (R3–R5; [engine contract](engine-contract.md) R4; [bots](bots.md) R5). |
| **T5 — Launch refusal versus turn failure** | Existing mock-backed session with a refused model switch, or failing/stopped default/explicit session turn | Run ordinary waiting say and observe settlement | Refused switch retains effective old model/thinking and visible notice; a successful old-model reply can still exit0. Actual model/engine failure or Stop preserves streamed stdout, reports stderr and exits1; --no-wait remains delivery-only (R4, R6; [model picker](model-picker.md) R5; [turns](turns.md) E1). |
