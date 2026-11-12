# Verification kit

One kit serves the conformance suite and the verification skill. It starts an
isolated copy of a harness with a scripted model, and it drives the real app
window by role and accessible name. It needs Node at the exact version in
`pins.json`, Xvfb, and no npm package. Spec: [verifiability](../spec/verifiability.md).

**Coding agents:** read [the verification skill](SKILL.md) before the host-side
build and for later harness changes. It covers isolation, the drive loop,
evidence and reporting; this page is the command reference. Read it directly
from the pinned blueprint checkout, with no separate skill installation.

| File | What it is |
| --- | --- |
| `SKILL.md` | Instructions for the setup agent and permanent harness keeper, using this same kit. |
| `kit.mjs` | CLI and library: one run directory, the daemon on a free port, the engines pointed at the mock, the app on a private virtual screen, cleanup. |
| `driver.mjs` | The window driver. Controls are found in Chromium's accessibility tree, clicks are hit-tested, input is real. |
| `mock-model.mjs` | One server, two wire formats (OpenAI for Pi, Anthropic for Claude Code), one set of directives. Its header lists them. |
| `fixtures/` | Two scripted replies for `MOCK_REPLY`: callouts and a table. |
| `test/selftest.mjs` | The kit's own test, against `test/stub`, a stub of the harness contract. |

## Check the kit itself

```sh
node verify/test/selftest.mjs
```

It copies the committed tree into a fresh directory with nothing installed and runs
every check there. The first run fetches the pinned Electron into `BYOH_KIT_CACHE`
(default `~/.cache/myharness-kit`). A missing prerequisite fails; nothing is skipped.

## Commands

```sh
node verify/kit.mjs doctor --env                 # host prerequisites, one fix line per failure
node verify/kit.mjs up --harness descriptor.json [--engines pi,claude] [--models N]
                                                 # prints READY with the run directory; both engines by default,
                                                 # and a chosen engine that is not installed fails
node verify/kit.mjs doctor                       # identity and isolation checks of the run
node verify/kit.mjs cli <args>                   # the harness CLI against this run
node verify/kit.mjs api GET /health              # authenticated API call
node verify/kit.mjs engine claude -p "hello"     # the configured engine command, on the mock
node verify/kit.mjs mock [reset]                 # what the model received (second read), or empty it
node verify/kit.mjs app                          # Xvfb + the app, with a loopback testing connection
node verify/kit.mjs ui click button "Send"       # verbs: see the header of driver.mjs
node verify/kit.mjs run scenario.mjs --harness descriptor.json [--engines pi,claude] [--only <case>] [--keep-at <case>] [--evidence <dir>]
                                                 # --engines as for up
node verify/kit.mjs down [--evidence <dir>]      # stop this run, keep its logs, remove its directory
```

### Window commands

All are `node verify/kit.mjs ui --run <dir> <verb> ...`. Names are exact;
`/regex/` matches dynamic names. Multiple matches fail; `--in <role> <name>`
scopes `click` and `hover` to a container. `eval` is for read-only capture,
not for acting on the app.

| Verb and arguments | Result |
| --- | --- |
| `click` / `hover <role> <name> [--in <role> <name>]` | Real pointer input; clicks are hit-tested. |
| `fill <role> <name> <text> [--append]` | Click to focus and type, replacing existing text unless appending. |
| `key <chord>` | Real key press; e.g. `Enter`, `Tab`, `Ctrl+Shift+P`, `Mod+K` (`Mod` is Ctrl on Linux). |
| `wait <role> <name> [--gone] [--state S] [--timeout ms]` | Wait for presence, absence or a state, e.g. `expanded=true`; default timeout 20000 ms. |
| `read <role> <name>` / `focus` | JSON state of a control / identity of the focused control. |
| `tree <file.json>` / `shot <file.png> [<role> <name>]` | JSON accessibility snapshot / PNG window or control screenshot. |
| `select <role> <name> [<end-role> <end-name>]` | Real mouse-drag text selection; prints selected text. |
| `scheme dark\|light` / `size <w> <h>` | Emulated colour scheme / window size. |
| `eval <js>` | Read-only capture, e.g. loaded fonts or computed style. |

For mock directives and wire endpoints, see the header of `mock-model.mjs`;
`fixtures/` contains `MOCK_REPLY` bodies.

### Run selection and descriptor

A command after `up` finds its run through `--run <dir>`, `BYOH_KIT_DIR`, or the only
run this user has up. For `cli`, `engine` and `ui`, `--run <dir>` goes first; everything
after it belongs to the tool. The descriptor is JSON:
`{"cli": [argv…], "app": [electron, app-path…], "seed": [[cli args]…], "source": "<git dir>"}`.
The kit appends its own flags after `app[0]`. For each chosen engine it writes a wrapper
into the run, sets `pi` and `claude` in `myharness.toml` to those wrappers, and the wrappers
point the real engine at the mock. Every process of the run (daemon, CLI, app and
engines) sees the same engine state directories (`PI_CODING_AGENT_DIR`, `CLAUDE_CONFIG_DIR`)
inside the run, so the harness can read the native transcripts its engines write. A key that already holds the bare engine name
(`pi = "pi"`, or the one-element list `pi = ["pi"]`) is replaced by the wrapper; any other
existing value is refused, so a seed never loses a setting silently. Engine versions are the harness's to pin; the kit checks
only that the binaries exist. A scenario file exports `{ section, cases: [{ id, title, run(kit) }] }`;
`--keep-at` runs the cases in order up to and including that one and leaves the instance up
for `ui`. An interrupted or failed `run` keeps the logs and the results so far in `--evidence`; a failed `up` prints the last lines of the logs in its error.

## Rules the kit keeps

- A run owns one directory under the system temporary directory. `down` removes that
  directory only after its marker file matches, and signals only processes that carry
  the run's stamp. It never uses a pattern or a process name. It refuses to delete while
  any process still holds a file in the directory.
- The kit decides from files and sockets it can read, never from another tool's text.
- A failing kit is a finding: fix it or report it. Do not route around it, and do not
  edit the kit to make a run pass. Record a local change with its reason.
