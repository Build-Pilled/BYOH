# The supplied VM

Classification: Core. Prerequisites:
[host](host.md), [isolation](isolation.md).

## Purpose

Give a person with no Linux machine of their own a host that meets every
requirement in one pinned step on the Mac: Lima on Apple's virtualization,
Debian 13 arm64, one VM for all bots. This section owns how that VM is
created, sized, connected, started, kept awake, stopped cleanly and removed.
It is the default way to meet the isolation requirement, not the only one. The Mac gets Lima with its start-at-login job, one app, the two SSH
names, a private host-operation record/lock and, when chosen, the sleep setting. Removal saves are created only when removal is requested.

The recipe is [`vm/`](../vm/README.md): the template, host step and its removal helpers, and the environment check.

## Required behaviour

- **R1 — What the VM is.** One Lima instance named `myharness-vm` on `vz`, from
  the Debian 13 arm64 cloud image in the pinned Lima version's image list,
  checked by that list's digest. The base is the image list itself, never a
  Lima template that mounts the Mac home (P6). There are no mounts, no
  containers (containerd off, P8), SSH agent and X11 forwarding off, and only
  Lima's own key loaded, never the person's `~/.ssh` keys. The template carries
  the packages the harness, the kit and the bots need (Git, the GitHub CLI,
  curl, rsync, sqlite3, jq, Xvfb, xauth and Electron's runtime libraries) and
  installs them without recommended extras (P15); bots cannot install packages
  later ([isolation](isolation.md) R2). Every root step runs at every boot and
  is written check-then-act; every file is written to a temporary name,
  validated, then renamed (P2), and root-managed files are rewritten from the
  template at boot, so drift inside the VM resets on restart. Creation reports
  ready only after provisioning and a readiness probe (egress rule active, bot
  user present) pass, so a broken provision fails at creation, not later.
- **R2 — Pins and where their hashes come from.** Every third-party input is
  an exact version, and a version change is a reviewed change on its
  own.
  - Lima: the release archive from Lima's GitHub release, checked against that
    release's SHA-256 list, installed under `~/.local` with neither Homebrew
    nor sudo; a different `limactl` already on the PATH is bypassed by its
    absolute path.
  - The recipe: fetched from `Build-Pilled/BYOH` at the release named in the
    [top-level README](../README.md#release). Check the SHA-256 of `vm/SHA256SUMS`
    against that README, then check every recipe/helper file listed in
    `SHA256SUMS` before running them.
  - Node: the exact pinned version from the official Node build for
    the VM's architecture, checked against that release's `SHASUMS256.txt`,
    installed root-owned outside the bot home and never changed by automatic
    updates.
  - Engines: the selected engines at their pinned versions with automatic
    updates off ([engine Pi](engine-pi.md), [engine Claude Code](engine-claude-code.md)).
  - The interview tool and the desktop app's build tools: as pinned in
    [onboarding](onboarding.md) R3 and [app build](app-build.md) R4.
  - Debian packages come from Debian stable and its security archive and are
    not pinned within the release: security updates install automatically,
    reboots stay manual. The environment check reports versions, so drift
    shows.
- **R3 — Sizing.** Memory comes from this table by the Mac's RAM, not one size
  for everyone. The setup agent pre-selects the row for the Mac and
  shows the table; the default is one click. An 8 GB Mac is not
  recommended; if the person insists it gets 3 GB and is told to stop the VM
  when idle.

  | Mac RAM | VM memory | Left for the Mac | Bots working at once |
  | --- | --- | --- | --- |
  | 8 GB | not recommended (3 GB if insisted) | 5 GB | 1-2 |
  | 16 GB | 4 GB | 12 GB | 2-4 |
  | 24 GB | 6 GB | 18 GB | 4-8 |
  | 32 GB | 8 GB | 24 GB | 8-12 |
  | 48 GB or more | 8 GB, raised only on need | 40 GB or more | 8-12 |

  CPUs are half the Mac's cores, at least 2 and at most 6. The VM holds the
  memory it has touched while it runs and gives none back to the Mac; Linux
  fills spare memory with file cache, so over time the VM is charged its full
  size. Memory is sized to what programs need, because anything above that
  becomes cache. Changing it is the person's action: stop the VM, run
  `limactl edit --memory <GiB> myharness-vm`, start it again. The system disk is
  100 GiB sparse: the file on the Mac grows with use, never shrinks on its own
  and is capped at 100 GiB (P3). Swap is 4 GiB; inotify limits are raised for
  recursive watchers (P32).
- **R4 — Disks.** The default is one disk: the harness home lives on the system
  disk, and deleting the VM deletes the harness data unless
  [VM backup](vm-backup.md) was chosen. A separate data disk for the
  bot home is a choice asked in the host step, before creation, only after the
  agent explains it: for it, the home survives deleting or rebuilding the VM;
  against it, a second disk file on the Mac that only grows, a late mount that
  needs start guards, and a name limit that otherwise reformats the disk at
  every boot. The data disk is named `myharness-d` ("d" means disk; the name
  must be at most 11 characters, P1) and the recipe refuses any other; services that need the home check that
  it is mounted before starting and retry on failure without a start limit,
  and nothing blocks boot on it (P13); the file system's creation time is
  recorded at creation and compared at every check (P1). Switching layouts
  later is a migration the person asks for, never automatic.
- **R5 — Forwards and SSH names.** Lima forwards exactly three ports from the
  VM's loopback to the Mac's 127.0.0.1: 7797 (daemon UI and API), 4388 (the
  interview pages) and 1455 (Pi's sign-in callback, which listens only during a
  Pi login); a final rule ignores every other port on every guest
  address, TCP and UDP (P10). Claude Code's sign-in pastes a code and needs no
  port. Lima's SSH port on the Mac is fixed when the VM is created, so the SSH
  names survive restarts. The host step writes `~/.ssh/myharness-ssh.conf` with two
  names, `myharness-ssh` (the bot user) and `myharness-admin-ssh` (Lima's admin user),
  each with Lima's key, its port, agent forwarding off and connection sharing
  off, and adds one `Include ~/.ssh/myharness-ssh.conf` line at the top of
  `~/.ssh/config` (created 0600 when absent, edited through a temporary file).
  These are the [host](host.md) R3 names for this VM.
- **R6 — Accounts.** The bot user is `myharness-user`, UID 1500, with its own group
  `myharness-group`, GID 1500,
  a locked password, no sudo, Lima's key in its authorized keys, and linger on
  so its services run without a login. Its home is mode 0700 and is never
  loosened (P30). The admin is Lima's default user, named after the Mac user,
  with password-less sudo; admin steps run with umask 022 and act as the bot
  user (`runuser`) for anything the bot owns (P29).
- **R7 — Services.** The daemon is the system service `myharness-daemon.service`
  running as the bot user from the deployed build ([app build](app-build.md)
  R1), installed and changed only by the admin. It starts only
  when the egress unit is active (and, with a data disk, when the home is
  mounted), restarts on failure, stops with its own drain within 15 seconds,
  has a memory ceiling of five eighths of the VM's memory rounded down to whole
  GiB and a task limit of 4096, and has `/usr/local/bin` on its PATH, where the
  root-owned `myharness` launcher lives ([host](host.md) R6). The bot user's
  service manager also refuses to start without the egress unit. The host jobs
  of [host](host.md) R7 are systemd timers with catch-up after a missed run.
  Security updates install from Debian's daily timers.
- **R8 — Start at login and sleep.** The VM starts when the person logs in to
  the Mac (`limactl autostart enable myharness-vm --condition=login`), and with it
  the daemon. A VM the person stopped stays stopped until the next login or an
  explicit start; start at login never restarts it behind their back. The host
  step offers macOS's setting to prevent automatic sleep on the power adapter
  while the display is off, pre-selected, with one line saying why: a
  sleeping Mac pauses the VM, so bots stop and routines are logged as missed,
  not run late (P28). On battery the Mac sleeps normally; the person can undo
  the setting in System Settings.
- **R9 — Clean stop.** The clean-stop program ships inside the desktop app
  ([app pairing](app-pairing.md) R10 runs it; it also runs from Terminal). It
  takes no argument, or `--force`. Its steps, in order:
  1. `check`: `limactl` at its recorded absolute path and the instance
     `myharness-vm` exist; otherwise it fails.
  2. `already`: if the instance is already stopped it prints
     `result: already-stopped` and exits 0.
  3. `ask` (skipped only with `--force`): it asks the daemon at
     `http://127.0.0.1:7797` for `GET /bots` with the app's paired token, read
     inside the program and never placed in an argument list, with a 5-second
     limit. A refused connection means no daemon and nothing running. Each
     live session reported as running prints `busy: <bot>/<session>` to
     standard error, and the program exits 3. A timeout or a 401 also exits 3,
     with `busy: unknown (<reason>)`, because it cannot tell.
  4. `ask again` (skipped only with `--force`): immediately before stopping it
     asks once more exactly as in step 3, with the same outcomes.
  5. `stop`: it runs `limactl stop myharness-vm` and streams its output, with no
     shorter limit of its own; inside the VM the service manager stops the
     daemon with its drain.
  6. `stopped`: when the instance reports stopped it prints `result: stopped`
     and exits 0.

  A failure in any step prints `reason: <text>` to standard error and exits 1;
  an unknown argument exits 2. `--force` skips only `ask` and `ask again`; it
  never forces the VM off (`limactl stop --force` is the person's recovery for
  a Broken instance, P5). The daemon keeps accepting turns until its drain: a
  turn that starts in the seconds between `ask again` and the drain is
  interrupted by the stop, and after the next start its input shows that it
  may already have been picked up ([turns](turns.md) R5, E3), or as picked up
  when its pickup was already confirmed. On an own host there is no clean-stop
  program action ([settings](settings.md) R5, [host](host.md) R8).
- **R10 — The one habit.** Before a logout, restart, shutdown or macOS update
  the person stops the VM, with Shutdown VM in Settings or
  `limactl stop myharness-vm`. Otherwise macOS hard-stops the guest (P4):
  running turns are interrupted, the file system and SQLite recover at the next
  boot, and the environment check reports the recovery as INFO. After a Mac
  crash the instance may show Broken (P5); the person runs
  `limactl stop --force myharness-vm`, then `limactl start myharness-vm`.
- **R11 — Removal.** Trying it and judging is supported. The host step's
  `--remove` offers a one-time collection before deleting data. Save is the
  default; skipping requires `--discard-data`. `--save-first` explicitly selects
  saving, and these flags are mutually exclusive. `--yes` answers only the final
  deletion confirmation, never the save/discard question. On a terminal, no
  policy flag means ask to save; declining/EOF/cancel leaves the installation
  intact and says how to rerun with an explicit discard. Unattended removal
  requires one policy flag **and** `--yes`, or exits before any mutation.

  Show what goes and stays before asking, including that quitting can lose
  UI-only unsaved state. A backup selection or kept disk is not proof of a
  current saved copy. Saves may contain **anything typed into a conversation,
  in clear text**; no content scan is performed. The destination is a new private
  `~/myharness-removal-saves/<UTC time>-<unique>/` directory, never overwritten or
  automatically deleted. A private hidden partial sibling is labelled incomplete
  and kept on failure; print its path. Publish only after all required files and
  checks pass. Files are owner-only, directories 0700. No fetched VM script is
  executed on the Mac and no extra Mac runtime is installed.

  Collection includes the effective service home, definitions, notes, bridge
  logs, session metadata/attachments/durable input recovery, tidy archive and
  native conversations (including this harness's external Claude transcripts
  and their owned associated artifacts). Validate session/path ownership; a
  missing required native transcript or archived artifact fails collection.
  Known credential locations and `secrets/` are excluded **before traversal**;
  no SSH keys, account/login files, app profile, Git configuration/history,
  dependencies/caches/build output, session `work/` or VM image is collected.
  Links are not followed. Include a SQLite online backup of `tasks/factory.db`,
  checked with `integrity_check`, rather than its raw live DB/WAL/journals;
  a never-created DB is recorded absent. Include the owned `~/myharness-src`
  working tree, including uncommitted source, and a separately labelled filtered
  `/opt/myharness-deploy/src` worktree when present. The manifest records original
  paths, native mappings, revisions when available, file checksums, exclusions,
  absence and DB result. Source inventory is the saved working tree, not Git
  history. This is not a bootable image or automatic restore; fresh engine
  logins and pairing are required. It neither enables nor depends on optional
  [VM backup](vm-backup.md).

  Before collection, quit only the installed `~/Applications/myharness.app`,
  verified by exact bundle path, `local.myharness.app`, current UID and process
  identity. Ask it to quit without launching it; wait 30 seconds. Then send
  SIGTERM only to revalidated owned PID/start/executable identities (including
  exact-bundle helpers), wait 10 seconds and refuse if any remain/relaunch or
  identity is ambiguous. No name-matching, global Electron kill or SIGKILL.
  This fallback is removal-only, not a change to rebuild's polite-only policy.

  Pause `myharness-tidy.timer` first; refuse if tidy or a deploy is observed in
  progress. Ask the daemon about running turns, attached terminals and waiting
  input; busy/unknown refuses without stopping the service. Stop the idle
  service cleanly, then collect. Routine scheduling lives inside the daemon;
  there is no separate routines timer or new pause API. As with R9, a turn may
  start between the idle check and the stop and be cut off. Disclose this race
  before confirmation and identify a possible cutoff when changed final session
  metadata makes it detectable; detection is not guaranteed. Collection happens
  with the service stopped, not under a VM-side writer lock. Starting an offline
  terminal, tidy, source write or rebuild during removal is the person's own
  concurrent act; tell them not to. On failure, state that the service/tidy timer
  may remain stopped and print the explicit restart command. Never silently
  restart work. A failed save, transfer, checksum, DB check or publication blocks
  autostart disable and all VM/data/SSH/app deletion. Retry must collect afresh
  while the VM exists; an old success phase is not authorization to delete new
  data. A fresh explicit discard is the bypass for saving, not `--yes`.

  Only then use pinned `~/.local/bin/limactl` to disable start at login and delete
  `myharness-vm` and, unless kept, its `myharness-d` data disk. `--keep-data-disk`
  is independent of the save choice. A kept disk stays kept on future invocations,
  even if Lima is available again; print `~/.lima/_disks/myharness-d` and explain
  the person may delete it manually. Do not reinstall Lima to remove a disk.
  Other instances and disks stay. Shared `~/.lima/_config` and Lima's image cache
  are removed only when no other instance remains. A symlinked `~/.lima` and
  its target's shared contents stay, with explanation; only the named resources
  are removed through Lima. Never recursively remove the `.lima` root to erase
  unknown files. Remove only the pinned Lima files listed in the owned manifest.

  Remove the owned SSH file/known-hosts file and only the exact Include inserted
  by this install. A private Mac record at
  `~/.local/share/myharness-host-state/record` holds SSH provenance and phases,
  not tokens, conversation content or sleep fields; its lock excludes overlapping
  host operations. Record provenance before writing the Include. Restore shared
  `~/.ssh/config` absence only if this install created it, the owned lineage is
  unchanged and removing that line leaves it empty. Preserve pre-existing empty
  files and other content byte-for-byte. Preserve an unfamiliar replacement or
  moved/edited line with an explanation; refuse a concurrent edit rather than
  overwrite it. A missing/corrupt record cannot authorize guessed cleanup. Keep
  phases/kept-disk state for safe retry, including after partial VM deletion;
  an interrupted host lock needs confirmation its process ended before manual
  lock removal. New installs only; older installs use their own release's remover.

  After the identified app exits, remove only its fixed support folder
  `~/Library/Application Support/myharness` and exact preferences domain
  `local.myharness.app` through the platform preferences API. Refuse ambiguous
  linked/foreign-owned cleanup paths. Never search other support folders by
  display name or remove unrelated preferences, Downloads or backup collections.
  Removal does not change sleep settings; the person undoes prevent-sleep in
  System Settings if desired. Report complete only after required owned cleanup
  succeeds; failure names what remains for retry.

## States

```mermaid
---
title: "Shut down VM"
---
stateDiagram-v2
  state "Legend" as legend {
    lg0: VM running
    lg1: program running
    lg2: VM stopped
  }
  class lg0 teal
  class lg1 orange
  class lg2 tan
  s0: VM running
  s1: Checking the VM, then asking the daemon
  s2: Asking again, just before the stop
  s3: Refused, running turns listed
  s4: Stopping
  s5: Stopping, a turn runs and will be cut off
  s6: Stop anyway: checking the VM only
  s7: VM stopped
  [*] --> s0
  s0 --> s1: you press Shut down VM
  s1 --> s2: it finds no running turn
  s1 --> s3: it finds a running turn
  s2 --> s4: it finds no running turn
  s3 --> s1: you press Shut down VM
  s3 --> s6: you press Stop anyway
  s2 --> s3: it finds a running turn
  s4 --> s5: a turn starts
  s4 --> s7: limactl stop finishes
  s5 --> s4: the turn ends
  s5 --> s7: limactl stop finishes, cutting the turn off
  s6 --> s5: it stops without asking
  s7 --> s0: you start the VM
  s6 --> s4: it stops without asking
  class s0 teal
  class s1 orange
  class s2 orange
  class s3 teal
  class s4 orange
  class s5 orange
  class s6 orange
  class s7 tan
  classDef orange fill:#f0d3bf,color:#1c1c1c
  classDef tan fill:#e5d9ce,color:#1c1c1c
  classDef teal fill:#bfe3df,color:#1c1c1c
```

The clean-stop program started by Shut down VM (R9). Not shown: an already
stopped VM, which ends at `already` with exit 0, failures (exit 1) and the
daemon going down by itself.

## Controls

Not applicable; Shutdown VM's controls belong to [settings](settings.md).

## Edge cases

- **E1 — Busy Mac port.** Ports 7797, 4388 or 1455 held on the Mac stop the
  host step before creation (P24); the fixed ports are not changed silently.
- **E2 — Existing instance or Lima-wide configuration.** An instance already
  named `myharness-vm`, or a Lima-wide default or override file, stops the host
  step and is shown to the person; nothing is replaced (P7).
- **E3 — Hash mismatch.** A Lima archive, template or Node build that does not
  match its pinned hash stops the step with nothing installed.
- **E4 — Dated image gone.** When Debian removes the dated image, Lima falls
  back to its daily image; creation continues and the environment check warns.
- **E5 — Stopped on purpose.** A VM stopped with Shutdown VM stays stopped
  through app relaunches; the app shows the unreachable state, not an error.
- **E6 — Busy at shutdown.** A busy refusal leaves the VM running and lists the
  turns; only an explicit Stop anyway passes `--force`, which interrupts them.

| Id | Given | When | Expect |
| --- | --- | --- | --- |
| **T1 — Clean-stop protocol and force boundary** | Supplied VM or owned limactl/daemon stand-ins and clean-stop program | Run ordinary or explicit --force stop through documented exits | Check the recorded program/instance; already stopped returns result already-stopped/0. Ordinary asks twice; busy, timeout or401 refuse3, refused connection means absent daemon. Force skips only both asks, never forces Lima off. Stop streams until instance stopped/result stopped/0; failures print reason/1, unknown arg2. Token stays inside process, never argv (R9, E6; [app pairing](app-pairing.md) R10). |
| **T2 — A turn between asks refuses stop** | First ordinary ask sees idle; a turn begins before the second ask | Read ask-again result and instance state | Exit3 with busy line naming that turn, leaving VM running; no stop invocation. The second check is immediately before stop, not a promise that no later turn can start (R9, E6). |
| **T3 — Late input keeps honest pickup status** | A routine input starts after final ask and before drain, with pickup not confirmed | Complete stop and restart the owned rehearsal instance | Stop may interrupt it: unconfirmed pickup is possibly-picked-up/delivery_unknown and is not replayed automatically. Already confirmed pickup stays known as picked up, not forcibly uncertain; do not claim completion merely because stop finished (R9; [turns](turns.md) R5, E3). |
