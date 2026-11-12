# Verifiability contract

Classification: Core. Prerequisites: the selected engine adapters and a host passing the capability check.

## Purpose

Make a harness independently provable through its public surfaces, on an
isolated instance, without changing the live installation or spending a real
model login's quota. The conformance suite decides pass/fail on behaviour; the
verification kit gathers evidence the user's agent can inspect. They share
one real-window driver and the suite's scenario states, not separate recipes
that drift apart. This section specifies the harness seams and evidence contract,
not an implementation of the kit's commands. The [verification skill](../verify/SKILL.md)
in the pinned blueprint checkout tells the setup agent and permanent harness
keeper how to use the existing [kit](../verify/README.md) during the build and
later changes. Read it directly there; no separately installed skill is required.
It adds neither a second pass/fail gate nor new suite cases.

## Required behaviour

### Seven harness seams

1. **R1 — One home setting.** `MYHARNESS_HOME` selects the whole harness home
   for the CLI, daemon and engine children. Its default is `~/.myharness`.
   Relative paths inside the harness configuration resolve against that home
   where specified, not the live default. Test runs also use a disposable OS
   HOME, app profile and engine state so engine login/configuration files cannot
   fall back to the person's real ones. A home override is not permission to
   reuse the live app profile or engine credentials.
2. **R2 — Free-port discovery.** `myharness daemon --port 0` chooses an available
   loopback port and writes its actual URL to `<home>/log/daemon.json`, using
   the daemon section's JSON format. Explicit free ports also work. The kit
   discovers the chosen port from that file, not stdout scraping or an assumed
   production port.
3. **R3 — Instance identity.** Owner-authenticated `GET /health` returns at least
   `pid` and the absolute selected `home`. The kit compares both, and the address,
   against its own launched instance before driving it; a health response is
   not sufficient if it identifies the live installation.
4. **R4 — Named credential.** The owner token is at
   `<home>/secrets/owner-token`, with the creation, protection and rejection
   rules in the daemon section. The kit can authenticate its own instance by
   that path. Evidence records its path/metadata and authentication results,
   never the token bytes.
5. **R5 — Configurable engine launch.** In `<home>/myharness.toml`, `pi` and
   `claude` select launch commands for their installed adapters. Each accepts
   an executable string or a nonempty array of strings (executable then literal
   arguments), not shell syntax. The defaults are `pi` and `claude` respectively.
   A wrapper can point the real engine at the isolated mock model; an unchosen
   adapter is not required just to satisfy this seam. Mock turns use no real
   login and never fall back to a production provider.
6. **R6 — Launch-time app target.** The Electron app reads `MYHARNESS_API`
   (absolute daemon URL) and `MYHARNESS_TOKEN_FILE` (owner-token file path) at
   launch. The same app build can target another instance without rebuilding.
   The token is added only for that configured daemon origin, not arbitrary
   links or redirected destinations. An isolated launch supplies both values
   and a disposable app profile; production pairing remains a separate flow.
7. **R7 — Opt-in local testing connection.** The Electron copy started by the kit
   accepts `--remote-debugging-port=<port>` only when explicitly requested and
   binds its testing connection only to loopback. An ordinary app launch,
   including the desktop app, has no testing listener. The test
   connection is never forwarded to the Mac or exposed on the network.

### Reproducible proof

- **R8 — Public driving surfaces.** Tests use the CLI, authenticated API, files,
  engine connections and the real app accessibility tree, not internal imports
  or test-only tags. Both suite and kit use the same small window driver, which
  selects controls by exact role and accessible name. The real Electron app,
  not a browser stand-in, runs on the virtual display [host](host.md) R4 requires, because Electron's
  built-in headless mode is unusable for it.
- **R9 — Reachable states.** Each scenario names its spec section and carries
  inline case tables. Its `--keep-at <case>` facility retains the state the kit
  needs for inspection. There are no per-section guide files. Retained state
  stays owned by that run and is cleaned up explicitly. The kit stops every
  browser/child it starts on exit, SIGINT or SIGTERM, and never kills another
  run's or the live installation's processes.
- **R10 — Evidence ordering and contents.** Where a UI action has a daemon-side
  effect, independently read that effect through the API/files first, then
  assert the screen. For UI-only actions, assert accessibility state and retain
  a screenshot for judgement. One evidence directory per run contains the
  build commit and dirty flag, exact commands, output and exit status, versions,
  isolation checks, PNG screenshots, JSON accessibility trees and side-effect
  reads, copied logs and a Markdown result report. Redact credentials; expected
  values come from the spec and the user's answers, not the observed output.
- **R11 — Honest coverage.** Report each suite case as passed, failed, skipped
  (with its missing prerequisite), or `mac-pending`. A section or entry point no
  case drives is reported as not covered, not as a failure and not as proved.
  It needs no new scenario. Missing prerequisites are not passed or
  silently skipped for selected features. Stage-three real
  login is a separate, user-authorized smoke test, not a mock verification turn.
- **R12 — Mac boundary.** A Linux window cannot prove Mac pairing, installation,
  Gatekeeper, window placement, physical shortcuts, notifications, audible sound,
  real OS appearance or external-app integration. For applicable items the kit
  records a short user check, presents pass/fail and a note on an interview
  page, and retains the answers with the evidence. Unanswered items stay
  `mac-pending`; they are never included in a fully verified claim. Core sound
  and appearance need this boundary too, not just choice features.
- **R13 — Failure integrity.** Keep failed evidence. A harness failure is fixed
  in the harness and rerun; a suspected spec/test error is reported to the user,
  not quietly edited into success. A failing kit is a finding to fix or report,
  never a step to bypass. Cleanup removes only that run's resources. Each known
  pitfall names a catching case or an environmental check line.

## Controls

Not applicable; this section defines verification surfaces, not app controls.
The kit drives the controls owned and named by the relevant UI sections.

## Edge cases

- **E1 — Wrong instance.** A matching port with the wrong home or pid fails the
  identity check. A discovery file alone never authorizes a drive or a kill.
  Two runs need separate homes, profiles, engine state and evidence directories.
- **E2 — Auth or target failure.** An absent token, 401, refused connection or
  missing explicit isolated target stops that run; the kit does not reconnect
  to a paired live app or manufacture a credential.
- **E3 — Engine isolation.** A chosen engine missing its pinned binary is
  unreachable, not green. A mock setup that could reach a real provider is an
  isolation failure; do not try a real login to get verification unstuck.
- **E4 — Incomplete platform proof.** A passing Linux screenshot cannot close a
  Mac check. Mac-only choice features require the user's Mac answers. UI cases
  are proved by runs of the harness itself, through its accessibility tree and
  screenshots.
- **E5 — Fresh checkout and interruption.** The kit's own checks include startup
  from a fresh checkout with nothing installed. Setup decisions use files on
  disk rather than another tool's presentation text. An interrupted run retains
  evidence already collected and cleans up only its own children/resources.

| Id | Given | When | Expect |
| --- | --- | --- | --- |
| **T1 — Real window with isolated state** | Fresh committed checkout, disposable OS/harness homes and app/engine profiles | Start the real Electron build on its virtual display for an isolated mock run | Use independent home/profile/native state and explicit isolated target, not the live installation or a browser stand-in. Start checks from a fresh checkout with nothing installed; setup decisions use disk facts. Preserve selected-engine isolation and applicable Mac-pending boundaries (R1, R5–R8, E3–E5). |
| **T2 — Cleanup belongs to this run** | Owned kit/browser/child processes and a separate decoy run | Exit normally, fail an assertion, or interrupt the controller with SIGINT/SIGTERM | Stop every child/browser started by this run, retain already collected/failed evidence and clean only its resources. Do not kill the decoy/live installation or let an otherwise passing assertion hide cleanup failure (R9, R10, R13, E1, E5). |
| **T3 — Isolation failure overrides a passing assertion** | Disposable per-run homes and a separate fake off-limits OS-home sentinel, never the real HOME | A synthetic passing assertion attempts an off-limits write, versus a clean control run | An observed isolation breach is a failed finding even if the assertion passed; retain evidence rather than claim green or bypass a failing check. A clean isolated run is not failed for legitimate writes in its own disposable home (R1, R10, R13, E5). |
