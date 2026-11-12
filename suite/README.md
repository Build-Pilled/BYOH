# Conformance suite

A frozen core of outward scenarios. This suite is the build's pass/fail
gate. The Given/When/Expect edge-case tables in the [spec](../spec/) are reference
only: they are not kit scenarios and ask for no new tests or fault hooks.

One file per covered spec section: `suite/<section>.mjs` proves
[`spec/<section>.md`](../spec/). Each file exports
`{ section, cases: [{ id, title, run(kit) }] }`, the scenario shape of the
[verification kit](../verify/README.md). A case id is `<section>-<short-slug>`
and stays stable once published. Every case title says the behaviour in plain
words and cites the rules it proves.

A case uses only what any harness exposes: the CLI, the API,
files on disk, engine connections through the kit's mock model, and the app's
accessibility tree. Where an action has a daemon effect, the case reads that
effect first and the screen second. Window controls are found by
role and accessible name from the section's Controls table, never by CSS, test
ids or a private bridge.

## Run

Use the kit's runner; the suite has no runner of its own. With the pinned Node
first on the PATH, Xvfb for window cases, and the selected engines installed:

```sh
# one section, in order, on one instance; stops at the first failing case
node verify/kit.mjs run suite/onboarding.mjs --harness descriptor.json --evidence out/onboarding
# one engine only (both are the default; a chosen engine that is not installed fails)
node verify/kit.mjs run suite/onboarding.mjs --harness descriptor.json --engines pi --evidence out/onboarding-pi
# one case on a fresh instance
node verify/kit.mjs run suite/onboarding.mjs --harness descriptor.json --only onboarding-stage-1-daemon --evidence out/s1
# every section in order
for f in suite/*.mjs; do [ "$f" = suite/lib.mjs ] || node verify/kit.mjs run "$f" --harness descriptor.json --evidence "out/$(basename "$f" .mjs)" || break; done
```

`suite/lib.mjs` holds shared helpers and is not a scenario.

## Stages

The build is proven in the stage order of [onboarding](../spec/onboarding.md) R4. `suite/onboarding.mjs` holds the mock stage smokes. Actual onboarding enters
a stage only after the previous proof passes; S3 is a real-host check, not a mock
kit case:

| Stage | Case ids | Needs |
| --- | --- | --- |
| S1 daemon | `onboarding-stage-1-daemon` | the harness CLI |
| S2 mock chat | `onboarding-stage-2-plain-installed`, `onboarding-stage-2-starter-files`, `onboarding-stage-2-mock-chat-pi`, `onboarding-stage-2-mock-chat-claude` | each selected engine |
| S3 real login | [onboarding T3](../spec/onboarding.md), not a suite case | the person's own login and go-ahead; proved in the real-host rehearsal, never a mock kit turn |
| S4 messaging | `onboarding-stage-4-crew-wired`, `onboarding-stage-4-crew-round-trip` | one selected engine |
| S5 window | `onboarding-stage-5-ui` | the descriptor's `app` command and Xvfb |

The engine drift case is in `suite/engine-contract.mjs`. It needs the
exact engine pins of the host recipe ([VM](../spec/vm.md) R2, listed in [vm/README.md](../vm/README.md)) in
`BYOH_SUITE_PIN_PI` and `BYOH_SUITE_PIN_CLAUDE`:

```sh
BYOH_SUITE_PIN_PI=<version> BYOH_SUITE_PIN_CLAUDE=<version> node verify/kit.mjs run suite/engine-contract.mjs --harness descriptor.json --evidence out/engine-contract
```

## Cases that need more than one kit run

A `<section>-model-<slug>` case follows one path through the section's states step
by step. Some cases need more than a kit run on one Linux host:

- Terminal chat runs in a pseudo-terminal made by util-linux `script`; without it
  those cases are not run.
- Cases that restart the daemon stop it with SIGTERM to the pid in its discovery
  file and start `myharness daemon` again on the same port ([daemon](../spec/daemon.md)
  R1, R2).

The daemon cases that start, stop or race daemons (`suite/daemon.mjs`) use
disposable homes inside the run directory, each with its own `myharness daemon`.
Before a case drives or signals such a daemon
it checks the process group and run stamp of its pid and that authenticated
`GET /health` names that pid, the home and the address; it signals only that pid.
The run's own daemon is used only for the request and credential cases.

Engine failures are caused through the harness's own seam, never by signalling an
engine the daemon started: a case points the home's `pi` or `claude` key
([verifiability](../spec/verifiability.md) R5) at a missing command or at a small
stub script in the run's `bin/` directory (one that ignores SIGTERM, or that runs
the kit's engine wrapper and ends it on a trigger file, or that forwards the
sender to that wrapper and moves its own executable aside so the recipient cannot
start), restarts the daemon so it
reads the key, and restores the exact earlier file afterwards. A daemon case that
must read the daemon's error output writes it to a file inside the run directory,
outside `logs/`, and keeps only the lines its rule names, after checking them for
the token.

Each case comment names the broken implementation the case catches. A case passes
only on an outcome it observed: a timeout, an unresolved process or a step no
driver can observe is a failure or `NOT RUN:`, never a pass.

## Results and evidence

Green means every remaining case passed or was explicitly skipped because a
listed requirement is missing. A skip names the case and missing
requirement; it is never counted as a pass or proof of that requirement. Choice
sections apply only when chosen. Mac proof stays `mac-pending` until answered;
suite green does not complete a pending real-host rehearsal.

The kit encodes `NOT RUN:` as a failing result/exit, not a native
skip status. Reports distinguish explicit missing-requirement skips from actual
failures without rewriting the raw evidence. A timeout, unresolved
process or unobserved outcome is not a missing-requirement skip.

Each case writes its evidence as JSON (and PNG for the window) to `logs/evidence/` in the run directory; `--evidence <dir>`
keeps it under `<dir>/logs/evidence/` together with the logs and `results.json`.
Evidence never holds token bytes. A case that runs its checks saves what it
observed in a `finally`, so a failing case keeps what it saw up to the failure; the
failure stays a failure. A case that is not run reports `NOT RUN:` with the
reason; where it has something to record first (a missing
engine pin), it writes that evidence directly before it stops.
