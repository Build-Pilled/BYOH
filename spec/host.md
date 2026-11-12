# Host requirements and environment check

Classification: Core. Prerequisites: none; this is the first section of the
build.

## Purpose

Say what any machine must provide before it may run the harness, how the
supplied VM provides it, and how the person's agent proves both. A host is any
Linux machine the person's Mac reaches by an SSH name and that passes the
capability check. This section owns the capability requirements, the
SSH names, persistence, the host's own scheduled jobs, own-host administration,
the environment check, its resource warnings and the known-pitfalls list.
[Isolation](isolation.md) owns the isolation floor and what bots can reach,
[VM](vm.md) owns the supplied VM, [app pairing](app-pairing.md) and
[app build](app-build.md) own the Mac-side steps that use the SSH names.

## Required behaviour

### What a host must provide

- **R1 — Platform.** The Mac is an Apple Silicon Mac on macOS 13.5 or later,
  the only computer this spec is proven on end to end. The host runs a glibc-based Linux
  distribution on arm64 or x86_64; official Node builds and Electron need glibc,
  so musl distributions such as Alpine are out. Node runs at the exact pinned
  version. The host has SSH, Git, curl, rsync, sqlite3 and jq.
- **R2 — Persistence.** The daemon runs as a service of the host's service
  manager as the bot user: it starts at host boot, keeps running when every
  interactive session logs out, is restarted on failure, and needs no open
  terminal or desktop app. Who may install, restart or change that service is
  [isolation](isolation.md) R3.
- **R3 — SSH names.** The Mac reaches the host through two names in the
  person's SSH configuration. The **bot name** logs in as the bot user; it is
  used for pairing, the app's lasting connection, opening files in VS Code
  Remote-SSH, the [VM backup](vm-backup.md) pull and a terminal on the host.
  The **admin name** logs in as an account with admin rights; it is used only
  by the rebuild line ([app build](app-build.md)) and for installing a system
  package on the person's word ([isolation](isolation.md) R2). Both use key
  authentication that works without a prompt (`BatchMode=yes`), with agent
  forwarding off and connection sharing off (`ControlMaster=no`,
  `ControlPath=none`), so a bot-name session can never land in an admin
  session (P17). Scripted calls close standard input (`ssh -n`, P19). Every
  Mac-side step uses these names; only steps that are about the supplied VM
  itself (create, start at login, clean stop) use the VM tool ([VM](vm.md)).
  The names are recorded in the interview record ([onboarding](onboarding.md)
  R5); for the supplied VM they are fixed ([VM](vm.md) R5).
- **R4 — Virtual display.** The host provides a virtual X display (Xvfb with
  xauth) and Electron's Linux runtime libraries, so the kit and the suite run
  the real app and take screenshots ([verifiability](verifiability.md) R8). Electron's
  built-in headless mode is unusable for this (the page stays hidden, screenshots and accessibility queries hang), so
  the virtual display is required, not optional.
- **R5 — Isolation floor.** The host meets [isolation](isolation.md) R1. A host
  that does not is refused, whatever else it passes.
- **R6 — Service environment.** The fixed `myharness` command is on the PATH of
  the daemon's service environment, so engine children run it from their shell
  ([engine contract](engine-contract.md) R7, [CLI](cli.md) R5), and on the PATH
  of a non-interactive bot-name session (`ssh -n <bot name> myharness bots`).
  It runs the deployed build, not a bot's working copy; a root-owned launcher
  in a system directory (`/usr/local/bin/myharness`) satisfies both.
- **R7 — Scheduled host jobs.** The host's own scheduler runs the jobs the
  harness needs; nothing on the Mac starts them.
  1. Automatic [session tidy](session-tidy.md) runs `myharness tidy` as the bot
     user once a night at 04:00 host time, and a missed night runs at the next
     boot. Before tidying it asks the daemon whether any session is in use: it
     has a live engine process (`GET /bots`), a terminal holds it (the session
     detail's `attached`, [terminal chat](terminal-chat.md) R2), or input waits
     for pickup in its durable queues ([turns](turns.md) R5,
     [messaging](messaging.md) R6). When any session is in use the run moves
     nothing, logs which session and why, and waits for the next night. When
     the daemon is not running the run proceeds: no engine runs and the daemon
     reports nothing in use, a terminal opened without the daemon is not
     detected, and input left waiting moves into the archive with its
     session and returns with put-back ([session tidy](session-tidy.md) R2,
     R3). Tidy writes nothing under `bin/`, so no `bin/` exclusion is added to
     the home.
  2. When [VM backup](vm-backup.md) is chosen, the host installs the task
     database copy of vm-backup R7: a producer owned by root, run nightly as
     the bot user with a missed night caught up at boot, using SQLite's online
     backup (never a raw file copy), checking integrity before the copy takes
     its final name `~/backups/tasks-db/tasks-<UTC yyyymmddThhmmssZ>.db`,
     keeping the newest 14, writing nothing when `tasks/factory.db` is absent.
     The folder lies outside the harness home and its history; a bot can
     delete copies in it but cannot edit the producer. Without the backup
     choice nothing of this is installed.
- **R8 — Own-host administration.** On a host of the person's own, BYOH proves
  nothing end to end: the person's agent adapts package names and the
  service manager, and the suite and the kit run on that host are the proof;
  problems specific to that distribution are the person's. BYOH never powers off,
  reboots, upgrades or reconfigures an own host: Shutdown VM is unavailable for
  it ([settings](settings.md) R5). Before a planned reboot or shutdown the
  person stops the service through the admin name (for systemd,
  `ssh -n <admin name> sudo systemctl stop myharness`), so the daemon's drain
  runs ([daemon](daemon.md) R1). Operating-system updates and reboots stay the
  person's.

### How the supplied VM provides it

- **R9 — The supplied VM.** Each requirement above is met by the
  [VM](vm.md) rule named here, and only the supplied VM is proven end to end.

  | Requirement | How the supplied VM meets it |
  | --- | --- |
  | R1 platform | Debian 13 arm64 on Apple's virtualization, pinned Node from its official build ([VM](vm.md) R1, R2). |
  | R2 persistence | System service with restart on failure ([VM](vm.md) R7), VM start at login ([VM](vm.md) R8). |
  | R3 SSH names | `myharness` and `myharness-admin`, written by the host step ([VM](vm.md) R5). |
  | R4 virtual display | Xvfb, xauth and Electron's libraries in the template ([VM](vm.md) R1). |
  | R5 isolation floor | No host mounts, bot user without sudo, loopback daemon, egress rule ([VM](vm.md) R1, R6; [isolation](isolation.md) R4). |
  | R6 service environment | The launcher and the unit's PATH ([VM](vm.md) R7). |
  | R7 scheduled jobs | systemd timers with catch-up after a missed run ([VM](vm.md) R7). |

### Environment check

- **R10 — Form.** The environment check is a POSIX `sh` program in the BYOH
  repository; it needs nothing beyond the base system, `ssh`, and `limactl`
  for the supplied VM, so it runs on a Mac without Node. It has two parts:
  `--mac`, run on the Mac, which reaches into the host only with read-only
  commands over the SSH names (root-only facts through the admin name with
  `sudo -n`), and `--host`, run inside the host as the bot user without sudo.
  The `--mac` part is part of the pinned host step: it is fetched at the pinned
  BYOH tag and checked against its published SHA-256, like the template
  ([VM](vm.md) R2).
  Each output line reads `LEVEL id: message [fix: <reference>]` with LEVEL one
  of PASS, INFO, WARN, FAIL; the fix reference names a pitfall (R12) or a
  setup step. Any FAIL exits 1, otherwise the exit is 0. The check never
  starts, stops, installs or repairs anything, and never prints credential
  contents, only names, modes and types. Engine logins report INFO before the
  real-login stage ([onboarding](onboarding.md) R4) and FAIL after it.
  The person's agent runs it before the build and again whenever asked:
  it fixes the first FAIL by its reference and reruns, and after three runs
  ending on the same FAIL it stops and asks the person.
- **R11 — Checks.** "VM" marks a check for the supplied VM only; an own host
  skips it with an INFO line, never a silent PASS.

  | id | Part | Applies | PASS when | Otherwise | Covers |
  | --- | --- | --- | --- | --- | --- |
  | M-os | mac | all | macOS 13.5 or later on arm64 | FAIL | R1 |
  | M-ssh | mac | all | both names log in as the bot user and the admin account within 10 s; the effective configuration (`ssh -G`) has agent forwarding and connection sharing off | FAIL | P17, P19 |
  | M-ports | mac | all | Mac loopback 7797, 4388 and 1455 are free or held by the VM's forwarder or the app's connection; once the daemon runs, `/health` without a token answers 401 | FAIL | P24 |
  | M-lima | mac | VM | `limactl` at its absolute path reports the pinned version and its binary matches the pinned SHA-256 | FAIL | P25 |
  | M-cfg | mac | VM | no Lima-wide default or override configuration exists | FAIL | P7 |
  | M-vm | mac | VM | the instance is running on vz with the memory and CPUs it was created with | FAIL, with the P5 fix when it shows Broken | P5 |
  | M-iso | mac | VM | effective instance configuration: no mounts, agent and X11 forwarding off, the person's own SSH keys not loaded, containerd off, port forwards exactly those of [VM](vm.md) R5 ending in ignore-all | FAIL | P6, P7, P8, P10 |
  | M-auto | mac | VM | start at login is enabled | WARN | P25 |
  | M-sleep | mac | VM | the prevent-sleep setting is on when the person chose it | WARN | P28 |
  | M-disk | mac | VM | at least 30 GiB free in the Mac home; VM disk allocation under 80 GiB measured with `du` | WARN | P3 |
  | M-fw | mac | VM | through the admin name: table `myharness_egress` has its output hook, a positive match on the bot user's UID, and the private-range and IPv6 refusals | FAIL | P11, P12 |
  | H-os | host | all | glibc Linux on arm64 or x86_64; on the VM, Debian 13 and the pinned image digest | FAIL; on the VM the daily-image fallback is WARN | R1 |
  | H-user | host | all | the bot user has only its own group, `sudo -n true` fails, its services persist without a login (linger on systemd) | FAIL | R2 |
  | H-mounts | host | all | no 9p, virtiofs, sshfs, NFS or SMB mount of a Mac or personal folder | FAIL | P6 |
  | H-egress | host | all | as the bot user, TCP to a private-range address (on the VM also to the Mac's loopback gateway) is refused within 1 s, DNS resolves and `https://api.github.com` answers 200 | FAIL on the VM, WARN on an own host | P9, P23 |
  | H-units | host | all | the egress unit is active and enabled; the bot user's service manager is running; no failed units; after the first install the daemon service is active | FAIL | P13, P14, P18 |
  | H-res | host | all | on the VM, swap of 4 GiB and memory as created; root file system at least 20 GiB free; inotify limits raised; swap under half used and no out-of-memory kill since boot | FAIL for space; WARN for swap pressure or an OOM kill, with R13's proposal | P32 |
  | H-tools | host | all | Node at the exact pin; Git, curl, rsync, sqlite3, jq, Xvfb, xauth and Electron's libraries present; each selected engine at its pin with automatic updates off | FAIL | P2, P20, P33 |
  | H-time | host | all | the clock is synchronised | WARN | P28 |
  | H-upd | host | VM | security update timers active; WARN only for security updates pending more than 3 days | WARN | P27 |
  | H-listen | host | all | nothing listens on a non-loopback address except sshd | FAIL on the VM, WARN on an own host | P10, P15 |
  | H-boot | host | all | journal: a file-system journal recovery is INFO, other boot errors WARN | INFO or WARN | P4, P5 |
  | H-login | host | all | each selected engine's login file is present with mode 0600 and the expected provider key and type; after its setup, the bot GitHub login answers as the bots' account; names only | INFO before the real-login stage, FAIL after | P21, P22 |
  | H-build | host | all | the `Build-Pilled/BYOH` checkout is at `v1.1.0`, the release named in the README; the live daemon runs the commit the last rebuild line deployed | FAIL | R6 |
  | H-disk2 | host | VM, data disk | the data disk is mounted at the bot home before the daemon starts, and its file-system creation time equals the baseline recorded at creation | FAIL | P1, P13 |

- **R12 — Known pitfalls.** Each pitfall names the check or the spec rule whose
  case catches it. "Check" means environmental: the environment check
  line covers it.

  | id | Symptom | Cause | Fix | Caught by |
  | --- | --- | --- | --- | --- |
  | P1 | The data disk is empty after every boot | A disk name longer than the file-system label allows was truncated, so the disk was not recognised and was formatted again | Disk names of 11 characters at most; compare the file-system creation time with its baseline | check H-disk2; case [VM](vm.md) R4 |
  | P2 | A configuration file is suddenly empty | A redirect into the live file truncated it before the producing command failed | Check the tool exists, write a temporary file, validate it, then rename | check H-tools; case [VM](vm.md) R1 |
  | P3 | The Mac disk fills although the VM freed space | VM disk files only grow; trimming in the guest returns nothing to the Mac | Size deliberately, measure with `du`, clean inside the VM; reclaiming means recreating the disk | check M-disk |
  | P4 | File-system recovery after a Mac logout or shutdown; interrupted turns | macOS quits the VM service without a guest shutdown | Stop the VM first ([VM](vm.md) R10); otherwise the journal and SQLite recover | check H-boot |
  | P5 | The instance shows Broken after a Mac crash | A stale process file or dead host agent | `limactl stop --force myharness-vm`, then `limactl start myharness-vm` | check M-vm |
  | P6 | The Mac home is visible in the VM | A Lima template that mounts the home | Base on the image list only, no mounts | checks M-iso, H-mounts |
  | P7 | Mounts or forwards that the template lacks | A Lima-wide default or override file applies to every instance | Never create one; stop and show it if present | checks M-cfg, M-iso |
  | P8 | Slow first boot; containers running | Lima enables user containers for Linux guests by default | Containers off in the template | check M-iso |
  | P9 | A bot reaches services on the Mac's loopback | The VM gateway maps to the Mac's 127.0.0.1 | The egress rule; Lima's host-loopback block where the pin has it | check H-egress; case [isolation](isolation.md) R4 |
  | P10 | A port a bot opened is reachable on the Mac | Lima forwards every guest listener unless told otherwise | Explicit forwards ending in ignore-all | checks M-iso, H-listen |
  | P11 | Neighbour discovery and resets break after the firewall loads | A negative UID match sent socket-less packets into the refusals | Positive match on the bot UID only | check M-fw |
  | P12 | VM networking breaks after enabling a firewall service | The distribution's firewall service flushes every table, Lima's included | Never enable it; an own table added and removed atomically | check M-fw |
  | P13 | Boot hangs, or data lands on the system disk | The data disk mounts late; blocking dependencies deadlock | Start guards with restart on failure, no blocking dependency | checks H-disk2, H-units |
  | P14 | A job shows success but never ran | A skipped condition or a reset timestamp | Read the exit timestamp or the journal, not the result field | check H-units |
  | P15 | Unexpected services listen on all addresses | Recommended packages pulled in extra daemons | Install without recommends | check H-listen |
  | P16 | Validation fails on files starting with `._` | macOS archivers add AppleDouble files | Archive with `COPYFILE_DISABLE=1`; reject `._*` before installing | case [app build](app-build.md) R4 |
  | P17 | A bot-user SSH login lands in the admin session | A shared SSH connection socket | Connection sharing off on both names | check M-ssh |
  | P18 | `systemctl --user` cannot reach the bus | A switched-user shell has no runtime directory | Log in as the bot over SSH, or set the runtime directory in the profile | check H-units |
  | P19 | Later commands in a scripted block are skipped | A remote call read the rest of standard input | `ssh -n` or closed input on every remote call | check M-ssh |
  | P20 | An engine drifts from its pin | The engine's own updater ran | Exact-version install with automatic updates off | check H-tools |
  | P21 | Bots fail after a successful OpenAI login | Model ids named for another provider route | Model ids that match the chosen route ([engine Pi](engine-pi.md)) | check H-login |
  | P22 | Pi's ChatGPT login never completes | Its callback listens on host port 1455, not forwarded | Forward 1455 ([VM](vm.md) R5) or paste the redirect URL | check H-login |
  | P23 | No internet behind a proxy on the Mac's loopback | The proxy address maps to the refused gateway | Allow that one port (a person's decision) or a direct route | check H-egress |
  | P24 | The window does not open although the daemon runs | Another program holds Mac port 7797 | Free the port before creating the VM | check M-ports |
  | P25 | Start at login cannot find `limactl` or the VM | Login jobs do not read the shell profile | Default Lima home and absolute paths | checks M-lima, M-auto |
  | P26 | A Mac job cannot read an external volume | macOS privacy controls block launch jobs on removable volumes | Grant the job access, or keep its folder on the internal disk | case [VM backup](vm-backup.md) R10 |
  | P27 | Security updates pending right after a refresh | The installer runs before the next list refresh | WARN only after 3 days | check H-upd |
  | P28 | Routines logged as missed; sessions expire | The Mac slept and paused the VM | The prevent-sleep setting; a missed routine is logged, not run late | checks M-sleep, H-time; case [routines](routines.md) R4 |
  | P29 | Files written by the admin are group-writable | The admin's umask is 0002 | umask 022 in admin steps; act as the bot for bot files | case [app build](app-build.md) R3 |
  | P30 | An admin clone into the bot home fails | The bot home is 0700 | Act as the bot; never loosen the home | case [app build](app-build.md) R3 |
  | P31 | Git refuses a checkout owned by another user | Git's ownership safety check | Read the bot's repository as the bot; never trust every directory | case [app build](app-build.md) R3 |
  | P32 | Slow daemon start; watcher errors | One inotify watch per directory under the home | Raised inotify limits; watch selectively | check H-res |
  | P33 | Pi refuses to start | The distribution's Node is older than Pi needs | The pinned official Node | check H-tools |

- **R13 — Resource warnings.** On swap pressure or an out-of-memory kill the
  check names it, and for the supplied VM proposes the next row of
  [VM](vm.md) R3 with the exact commands to change it (stop, edit memory,
  start). It never changes memory itself. A busy period that only fills the
  file cache is not a warning.

## Controls

Not applicable; this section has no UI controls.

## Edge cases

- **E1 — Unsupported Mac.** An Intel Mac or a macOS older than 13.5 stops the
  host step before anything is installed, with the reason; no fallback runs the
  harness on the Mac.
- **E2 — Own host fails the check.** A musl distribution, a host without a
  persistent service manager, a missing virtual display or a failed isolation
  floor stops the setup with the failed check ids; the agent offers the
  supplied VM instead and never weakens a check to pass.
- **E3 — Same failure three times.** After three runs ending on the same FAIL
  the agent stops, shows the line and asks the person; it does not loop.
- **E4 — Daemon unreachable for the tidy job.** A daemon that answers neither
  yes nor no (a timeout) leaves the night's tidy undone and logged, not run.
- **E5 — No task database.** With backup chosen but no `tasks/factory.db` yet,
  the copy job writes nothing and exits 0; vm-backup R7 treats the missing
  copy as its error, not this job.
