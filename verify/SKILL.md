---
name: verify-myharness
description: "Use while building the harness and before reporting a later harness change as working. Run the conformance suite on an isolated instance with the scripted model; drive the real CLI, API and desktop app and retain evidence without touching the live installation."
---
# Verify the harness

## When to use

Read this skill before the host-side build, at each build stage in
[onboarding](../spec/onboarding.md), and for later harness changes. The setup
agent and the permanent harness keeper use this same file in the pinned
blueprint checkout. It does not need to be installed into an agent-specific
skill directory. Keep its absolute path in the harness keeper's project context
so later tasks find it; do not maintain a second copy.

Read the relevant [spec sections](../spec/README.md), the change brief and the
harness commit's `interview.json` first. Those define expected behaviour, not the
observed output or this skill. Use the stage's existing cases during the build;
run the full applicable suite before the first-use hand-over. For a later change,
run the existing cases it affects and state the run's scope.

**The suite is the only pass/fail gate.** This skill explains how to collect and
inspect evidence, not a second ship gate or a per-feature checklist. It does not
replace Code Reviewer or authorize a merge, deploy or real login. Edge-case
tables are reference only: no new scenarios, tests or fault hooks are required
by this skill. A section or entry point without a case remains **not covered**.

## Prepare the build and descriptor

Run on the isolated Linux host as the bot user, without admin rights. Use the
exact Node version in [pins.json](pins.json), Xvfb and the selected engines at
the harness's pinned versions. Build the harness CLI and real Electron app from
the commit being checked, using that project's documented build commands. The
blueprint supplies no generated harness build command.

Create a JSON descriptor outside the checkout and the live harness home:

```json
{
  "cli": ["/absolute/path/to/built/myharness"],
  "app": ["/absolute/path/to/electron", "/absolute/path/to/built/app"],
  "seed": [["init", "--examples"]],
  "source": "/absolute/path/to/harness-source"
}
```

Replace the example paths with this build's actual absolute paths. An argv array
can include a runtime before the CLI entry file. The kit inserts its Electron
flags after `app[0]`; it must be the Electron executable. `source` is the harness
Git checkout, not the blueprint. The kit runs `init` before the descriptor's seed
commands. Add only the seed/configuration needed for the existing scenario or
user path; do not create conversations by writing session files. Seeded engine
keys must be absent or bare defaults, so the kit can install its mock wrappers.

Use a fresh evidence directory per run, outside both checkouts, the live
`~/.myharness` and the kit's temporary run directory. For an agent with
`MYHARNESS_WORKSPACE`, put it below that workspace. Otherwise choose a disposable
workspace explicitly. Point build/test caches and any prerequisite installation
at that workspace too, not the live OS HOME. Do not install dependencies where
the package manager could walk up into an unrelated parent project.

From the blueprint root, set `V` to the absolute `verify/kit.mjs` path, `D` to the
absolute descriptor path, `E` to this run's evidence directory and `ENGINES` to
`pi,claude`, `pi` or `claude`, matching the person's selected adapters. Keep that
selection throughout the run; never omit a selected engine to hide a failure.
[Commands and descriptor details](README.md) are the one-page reference.

## Isolation rules

- Use the kit, never a bare `myharness` from PATH or a paired live app. It supplies
  disposable OS/harness homes, XDG directories, app profile and engine state;
  CLI, daemon and engines share the run's isolated engine directories.
- Both real engine binaries can run against the kit's scripted model. The mock
  replaces the provider only, not the engine, daemon, CLI or app. Never sign in
  inside a kit run or substitute a real provider. Stage-three real login is a
  separate user-authorized real-host smoke, not a mock verification step.
- Use one active run per workspace. Never run the kit selftest beside a kit run.
  Keep the printed run path and pass it explicitly to subsequent commands; do
  not rely on automatic selection when other agents may have runs up.
- Never print tokens, read live credential files, copy live user/session data or
  forward the app's testing connection. Use authenticated `kit api` for the
  isolated instance; the kit reads its own token without printing it.
- A failed identity/isolation check stops the drive even if assertions passed.
  A failing kit is a finding to fix or report, never a step to bypass. Do not
  edit the kit or a scenario to manufacture success. Record any authorized local
  kit/skill change and its reason with the evidence and report it to the user.

## Record commands and run cases

Record the harness SHA and dirty flag explicitly; record the blueprint revision,
Node/engine versions, descriptor without credentials and build commands too.
`doctor` records the kit's view of the source and instance identity, not the
provenance of an arbitrary stale binary. Rebuild after source changes and start
a new run; committed-head evidence must name the exact commit tested.

This Bash helper retains the exact command, combined output and its exit status
without mistaking `tee`'s status for the command's. Use unique step labels:

```bash
mkdir -p "$E"
record() {
  local step="$1"; shift
  printf '%q ' "$@" > "$E/$step.txt"
  printf '\n' >> "$E/$step.txt"
  local statuses
  if "$@" 2>&1 | tee -a "$E/$step.txt"; then
    statuses=("${PIPESTATUS[@]}")
  else
    statuses=("${PIPESTATUS[@]}")
  fi
  printf 'exit=%s capture_exit=%s\n' "${statuses[0]}" "${statuses[1]}" | tee -a "$E/$step.txt"
  (( statuses[0] == 0 && statuses[1] == 0 ))
}
record 00-source git -C "$HARNESS_SOURCE" rev-parse HEAD
record 01-dirty git -C "$HARNESS_SOURCE" status --porcelain
record 02-host node "$V" doctor --env
```

Set `HARNESS_SOURCE` to the descriptor's source path. Do not continue after a
failed required step. `doctor --env` checks for both engine binaries even for a
single-engine harness; record an unselected engine's absence as inapplicable,
not as a pass. Other missing host requirements need fixing. `up`/`run` enforce
`--engines`; a missing selected binary is a blocker.

Run an existing section or case, using absolute scenario and evidence paths:

```bash
record 03-suite node "$V" run "$BLUEPRINT/suite/onboarding.mjs" \
  --harness "$D" --engines "$ENGINES" --evidence "$E/suite"
```

Set `BLUEPRINT` to the pinned blueprint checkout. See [suite stages and full-suite
commands](../suite/README.md) for stage case ids, engine-pin variables and section
runs. `--only <case>` starts that case on a fresh instance; it does not run earlier
cases. `--keep-at <case>` runs through that case and retains its resulting state,
not the state before it. The `KEPT` line starts with the path to `state.json`;
set `R` to its containing directory, which is also the path in the printed
`kit down --run` hint, not to the `state.json` file. Inspect with the commands
below and explicitly clean it up. A failed run is not an
invitation to keep driving; retain its evidence and diagnose the failure.

For manual inspection when no existing case reaches the desired state:

```bash
record 04-up node "$V" up --harness "$D" --engines "$ENGINES"
# Set R to the run directory printed by READY, not its home or state.json file.
record 05-doctor node "$V" doctor --run "$R"
record 06-app node "$V" app --run "$R"
record 07-window-doctor node "$V" doctor --run "$R"
```

Manual observations do not add suite coverage. `up` and `--keep-at` intentionally
leave owned processes running for later commands. Finish the drive and `down`
in the same active work session: do not leave background work waiting for an
agent session that may be stopped. Run each command in the foreground.

## Drive, then inspect the evidence

Drive the entry point the change concerns, not a convenient substitute. Examples
for the installed Plain bot (adapt the composer name to its recorded display name):

```bash
record 08-cli node "$V" cli --run "$R" bots
record 09-fill node "$V" ui --run "$R" fill textbox "Message Plain" "hello"
record 10-send node "$V" ui --run "$R" click button "Send"
```

Open the bot/session through the window's own controls first, as named by the
section's Controls table. Find dynamic ids through the CLI/API, not a private
bridge. The examples are not a replacement for those reach steps.

Use `ui wait` for a role/name/state, never a fixed sleep to guess when the app is
ready. Exact role and accessible name are the handles; use `--in` to resolve
ambiguity, not CSS or test ids. Use real `click`, `fill`, `key` or `select` input.
`ui eval` is for read-only capture, never for navigation, calling handlers or
changing application state. A screenshot is visual evidence, not a second read
of a daemon effect.

| Changed surface | Retain for the observation |
| --- | --- |
| CLI/API | Exact invocation, output and exit status; for changes of state, a separate read through the API or files. Read an existing documented route, not an internal store chosen to fit the result. |
| Desktop window | Action/result screenshots and JSON accessibility snapshots; for a daemon effect, independently read it through API/files **before** asserting the resulting screen. For UI-only actions, read the accessibility state and inspect the PNG. |
| Model/tool interaction | `kit mock` request read plus actual transcript/state result: what reached the provider boundary and what the harness did. Existing mock directives/fixtures can supply delays, tools, failures or Markdown; see the command reference. |
| Platform-only behaviour | A short user action and expected result from the spec/answers, plus the user's pass/fail/note; unreturned checks stay `mac-pending`. |

For example, after finding a session id, use authenticated
`api GET /sessions/plain/<id>` as the independent transcript read; retain it
before asserting the reply's screen state. Do not paste `<id>` literally. Use
`ui read <role> <name>` for a control's current state. Capture files with unique
labels after relevant actions:

```bash
record 11-model node "$V" mock --run "$R"
record 12-tree node "$V" ui --run "$R" tree "$E/12-result.ax.json"
record 13-shot node "$V" ui --run "$R" shot "$E/13-result.png"
```

Only collect relevant data; no credential bytes in commands, output, PNG, JSON
or logs. Inspect evidence before sharing it. Preserve failed runs and screenshots;
fix a harness failure in the harness and rerun, without rewording the expected
result. Suspected spec/test errors go to the user rather than being quietly
edited. A timeout or unresolved process is not a missing-prerequisite skip.

## Platform boundary and report

A virtual-screen run proves neither installation/pairing on the user's Mac nor
Gatekeeper, physical shortcuts, native notifications, window placement, audible
sound, real OS appearance or external-app integration. For applicable work,
write short checks in `mac-checks.md`, present pass/fail and a note on an interview
page, and retain the user's answers alongside the evidence. No answer means
`mac-pending`, never a verified platform claim. Do not add unrelated platform
checks to a feature task.

Write `REPORT.md` beside the evidence. Include:

- exact source/build revision, dirty flag, versions, commands and evidence paths;
- existing suite cases run and their outcomes: passed, failed, explicit
  missing-prerequisite skip or `mac-pending`; name every missing prerequisite;
- sections/entry points not driven by a case as **not covered**; label manual
  observations separately, without promoting them into suite proof;
- expected versus observed for failures, with evidence, and applicable user
  checks and answers. Keep the raw `results.json` unchanged: the kit encodes
  `NOT RUN:` as a failing result/exit, not a native skip status;
- cleanup outcome and any kit/isolation findings. Do not claim complete proof
  with a pending platform check or missing selected prerequisite.

## Cleanup

After success or failure, copy logs and stop only this run:

```bash
record 99-down node "$V" down --run "$R" --evidence "$E"
```

For suite runs without retained state the runner already stops its instance and
copies logs into the requested evidence directory. Manual/retained runs require
`down`. It checks ownership, stops stamped processes, copies logs and removes
only that run's directory. If cleanup fails, report the error and whether the
run directory remains; do not delete a remaining directory yourself. Never use a name-based kill, signal an unowned process or
remove temporary directories by wildcard. Evidence outside the run survives.
