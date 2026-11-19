# The supplied VM recipe

The Mac side of the host step and the environment check. Spec: [VM](../spec/vm.md),
[host](../spec/host.md).

| File | What it is |
| --- | --- |
| `myharness-vm.yaml` | The Lima template: Debian 13 arm64 on `vz`, no mounts, the three forwards, the bot user, the output rule, Node, the engines, the daemon unit, the launcher, the nightly tidy and the deploy program. |
| `myharness-host-step.sh` | Runs on the Mac: preflight, the pinned Lima under `~/.local`, create and start, the SSH names, start at login, the sleep setting. `--remove` removes only the harness instance and files; other Lima instances and their shared files stay. The sleep setting is undone manually. |
| `myharness-check.sh` | The environment check: `--mac` on the Mac, `--host` inside the host as the bot user. Reads only. |
| `SHA256SUMS` | Hashes of the three files above. |

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

> **Upgrade warning:** The new resource names are for new installs only; there is no in-place migration. Before installing a release with these names, remove an older installation using **that older release’s own remover**, not the new release’s remover. Save any data you want to keep before removal. The desktop app’s bundle, support folder and identifier are unchanged. The release pinned in the top-level README predates this naming layout.

Fetch all four files from `vm/` in `Build-Pilled/BYOH` at the release named in
the [top-level README](../README.md#release). Check `SHA256SUMS` against the hash
published in that README, then verify the three files with
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

To remove the supplied VM and app, run one of these on the Mac. The first
asks for confirmation, then deletes the harness's VM and data; the second
keeps only its optional data disk named `myharness-d`. Neither removes other Lima
instances:

```sh
sh myharness-host-step.sh --remove                         # confirms before deleting harness data
sh myharness-host-step.sh --remove --keep-data-disk        # keeps only the harness's myharness-d data disk
```

Other Lima instances and disks are left alone. When another instance remains,
`~/.lima`, its shared key/config and Lima's image cache stay. A symlinked
`~/.lima` and its target's shared contents are kept too; the output explains
what stayed and why. Only the pinned Lima install files in the host step's
manifest are removed from `~/.local`. Undo prevent-sleep in System Settings
if you enabled it.

A kept data disk is the folder `~/.lima/_disks/myharness-d`. The pinned Lima install
is removed even when that disk is kept, so a later `--remove` fails closed
rather than reinstalling Lima or deleting the disk itself. You may delete that
folder yourself when you no longer want its data.

Before the real-login stage engine logins report INFO; pass `--login-stage` after it.
Before a logout, restart, shutdown or macOS update, run
`~/.local/bin/limactl stop myharness-vm` on the Mac. This uses the pinned Lima
control program to stop the VM instance named `myharness-vm`; it is not an SSH
connection or a command to rename the harness.
