# The supplied VM recipe

The Mac side of the host step and the environment check. Spec: [VM](../spec/vm.md),
[host](../spec/host.md).

| File | What it is |
| --- | --- |
| `myharness-vm.yaml` | The Lima template: Debian 13 arm64 on `vz`, no mounts, the three forwards, the bot user, the output rule, Node, the engines, the daemon unit, the launcher, the nightly tidy and the deploy program. |
| `myharness-host-step.sh` | Runs on the Mac: preflight, the pinned Lima under `~/.local`, create and start, the SSH names, start at login, the sleep setting. `--remove` removes only the harness instance and files; other Lima instances and their shared files stay. The sleep setting is undone manually. |
| `myharness-check.sh` | The environment check: `--mac` on the Mac, `--host` inside the host as the bot user. Reads only. |
| `myharness-removal.sh` | Mac-side save/discard, private host record/lock, safe file receiver and owned cleanup; sourced by the host step. |
| `myharness-removal-app.js` | macOS built-in JXA: bounded quit of the verified installed app/helpers and exact preferences-domain removal. |
| `myharness-removal-collect.mjs` | Runs with the VM's pinned Node after the service stops: filtered payload and native history, SQLite online backup and a checksummed per-file stream. Never runs on the Mac. |
| `SHA256SUMS` | Hashes of every recipe and helper file above. |

## Pins

| Input | Version | Where |
| --- | --- | --- |
| Lima | 2.3.0 | `myharness-host-step.sh`, `myharness-check.sh` |
| Debian 13 arm64 cloud image | the digest in that Lima version's image list | Lima |
| Node | 26.12.1 | `myharness-vm.yaml`, `myharness-check.sh`, `../verify/pins.json` |
| Claude Code | 2.1.307 | `myharness-vm.yaml`, `myharness-check.sh` |
| Pi | 0.99.1 | `myharness-vm.yaml`, `myharness-check.sh` |

A version change is a reviewed change on its own. Prove an engine pin through the
[engine contract](../suite/README.md) before changing it.

## Run it

> **Before upgrading:** see the [upgrade warning in the top-level README](../README.md#release).

Fetch all seven files listed above from `vm/` in `Build-Pilled/BYOH` at the release named in
the [top-level README](../README.md#release). Check `SHA256SUMS` against the hash
published in that README, then verify all six recipe/helper files with
`shasum -a 256 -c SHA256SUMS` before running anything.

The setup agent explains every command it hands you, including what its
names refer to ([onboarding](../spec/onboarding.md) R10). The Lima instance is
`myharness-vm`; the SSH connection name `myharness-ssh` reaches its bot user `myharness-user`, while
`myharness-admin-ssh` reaches its admin account. They connect to the same VM but
are not its instance name. The `myharness` CLI runs the harness itself.

Run this on the Mac to install the pinned Lima, create/start `myharness-vm`,
set up its SSH connections and start-at-login, and enable prevent-sleep on
power. Defaults are both engines and one disk:

```sh
sh myharness-host-step.sh
```

Alternatively, this Mac command creates the VM with Pi only, the separate
`myharness-d` data disk, prevent-sleep off and 6 GiB of memory. `myharness-d` is the
optional disk's Lima name, not an SSH connection. Choose one creation command,
not both:

```sh
sh myharness-host-step.sh --engines pi --disk data --prevent-sleep no --memory 6
```

This Mac command reads the environment checks without changing the setup:

```sh
sh myharness-check.sh --mac
```

This Mac command opens a shell inside `myharness-vm` as the bot user through
the SSH connection named `myharness-ssh`:

```sh
ssh myharness-ssh
```

Then, inside that host with the repository cloned, run this from its root to
read the host-side environment checks:

```sh
sh vm/myharness-check.sh --host
```

## Remove it

Removal offers to save first, even when optional VM backup is off. With one
VM disk, deleting it without a current saved copy deletes every conversation,
bot configuration, archive and task. A kept data disk still sits on this Mac;
it is not a backup. A backup selection is not proof that a current copy exists.

Run this on the Mac for the default save offer and final deletion confirmation:

```sh
sh myharness-host-step.sh --remove
```

Save is the default. To skip saving, cancel and choose `--discard-data` explicitly.
`--yes` skips **only** the final deletion confirmation, not the save choice.
EOF/cancel removes nothing. Unattended examples (choose only one):

```sh
sh myharness-host-step.sh --remove --save-first --yes
sh myharness-host-step.sh --remove --discard-data --yes
```

Add `--keep-data-disk` to either policy to keep only the optional `myharness-d`
data disk. It does not remove the save offer or prove that a current save exists.

Before confirmation, the command shows what will go/stay, the proposed save path
and the risks. It quits only the verified installed `~/Applications/myharness.app`
and its exact-bundle helpers: 30 seconds polite quit, then SIGTERM to revalidated
owned PIDs for 10 seconds, then refusal. It never launches an app, kills by name
or uses SIGKILL. Quitting can lose UI-only unsaved state.

The VM-side step pauses only `myharness-tidy.timer`, refuses observed running
turns, terminal ownership, waiting input, tidy or a deploy, then stops the daemon
cleanly. Routine scheduling stops with that daemon; there is no separate routines
timer or new VM-side lock/pause protocol. A turn starting between the idle check
and stop can be cut off; a possible cutoff is named when final metadata makes
it detectable, not guaranteed. **Do not open offline terminals, start tidy,
change source or rebuild during removal.** Such concurrent work is your own act;
collection is made with the service stopped, not a universal writer lock.

A successful save is published under
`~/myharness-removal-saves/<UTC time>-<unique>/`, with directories 0700/files 0600.
It holds:

- harness home, definitions, notes, bridge logs, native conversations and their
  owned attachments, durable input/draft recovery and the tidy archive;
- this harness's external Claude transcripts and associated session artifacts,
  not unrelated project histories or the whole engine account directory;
- an immediate SQLite online backup of `tasks/factory.db`, integrity-checked,
  and the separate task edit journal/reports;
- the filtered `~/myharness-src` working tree, including uncommitted source,
  plus a separately labelled `/opt/myharness-deploy/src` working tree when present;
- `manifest.json` with original/native path mappings, source revisions when
  available, file sizes/checksums, exclusions, absence and DB result, and a read-me.

`secrets/` and known credential locations are excluded **before traversal**.
There is no Git history/config, VM image, app profile, account/login state,
session `work/`; links are not followed. Dependency/cache/build-output names
are excluded only from the source and deployed-source worktrees. Home skills,
memory and notes named `build`, `tmp`, `dist` or similar are still saved.
**The save may contain anything typed into a conversation, in clear text.**
No content scan or redaction is done. Protect the save as private conversation
history. It is not a bootable VM, scheduled backup, automatic restore or migration;
restoring later needs fresh logins and pairing. The command never deletes saves.

A failed save/DB/transfer/checksum/publication stops before autostart disable or
VM/data/SSH/app deletion. An incomplete hidden partial directory stays at the
printed path, not labelled successful; each retry makes a new partial save.
The service/tidy timer may be left stopped, never silently restarted. The step
prints the relevant restart command; after a service stop it is:

```sh
ssh myharness-admin-ssh sudo systemctl start myharness-daemon.service myharness-tidy.timer
```

A stopped/unreachable VM cannot be collected: start/recover it with its own
release tools and retry, or explicitly choose discard. Discard can remove an
already stopped VM without starting it; a Broken/unknown VM state requires recovery.
A previous completed save/phase never bypasses collection for a VM that still
exists. Earlier completed saves stay intact when later cleanup needs a retry.

Owned cleanup removes the fixed support folder
`~/Library/Application Support/myharness` and exact preferences domain
`local.myharness.app`, not support folders guessed from the display name. App
builds pin all persistent profiles there regardless of display name. Unrelated
apps, preferences and files in Downloads stay.

Only the Include this install inserted is undone. A shared `~/.ssh/config`
created by the install is removed only if its owned lineage is unchanged and
it is still otherwise empty. Pre-existing empty configs and later content stay;
changed/replaced/ambiguous files are preserved and explained, not restored from
an old whole-file snapshot. The Mac record
`~/.local/share/myharness-host-state/record` holds SSH provenance and phases only,
with an operation lock beside it. It contains no conversation text, credentials
or sleep fields. On interruption, verify the recorded host process has ended
before manually removing its stale lock directory and retrying. Keep the record:
it permits safe residual cleanup and remembers a previously kept disk. A failed
install before instance creation records `installing`: with no VM, rerun the
install to retry, or run removal to finish cleanup without collecting nonexistent
VM data. Once instance creation is recorded, unexplained VM absence still refuses
cleanup rather than guessing whether data was saved. These steps are for new installs; older installations use their own release's remover.

Other Lima instances/disks are left alone. When another instance remains,
`~/.lima`, its shared key/config and Lima's image cache stay. A symlinked
`~/.lima` and its target's shared contents stay too; output explains what stayed.
Only the pinned Lima install files in the owned manifest are removed from
`~/.local`, never unknown files to erase a shared directory. A kept disk is
`~/.lima/_disks/myharness-d`, never automatically deleted on a later retry, even
if Lima becomes available again. You may delete that folder yourself when you
no longer want its data; removal does not reinstall Lima for it.

Removal does **not** change sleep settings. Undo prevent-sleep in System Settings
if you enabled it. Optional backup repositories/snapshots and removal collections
stay until you delete them yourself.

Before the real-login stage engine logins report INFO; pass `--login-stage` after it.
Before a logout, restart, shutdown or macOS update, run
`~/.local/bin/limactl stop myharness-vm` on the Mac. This uses the pinned Lima
control program to stop the VM instance named `myharness-vm`; it is not an SSH
connection or a command to rename the harness.
