# The supplied VM recipe

The Mac side of the host step and the environment check. Spec: [VM](../spec/vm.md),
[host](../spec/host.md).

| File | What it is |
| --- | --- |
| `myharness.yaml` | The Lima template: Debian 13 arm64 on `vz`, no mounts, the three forwards, the bot user, the output rule, Node, the engines, the daemon unit, the launcher, the nightly tidy and the deploy program. |
| `host-step.sh` | Runs on the Mac: preflight, the pinned Lima under `~/.local`, create and start, the SSH names, start at login, the sleep setting. `--remove` undoes all of it. |
| `check.sh` | The environment check: `--mac` on the Mac, `--host` inside the host as the bot user. Reads only. |
| `SHA256SUMS` | Hashes of the three files above. |

## Pins

| Input | Version | Where |
| --- | --- | --- |
| Lima | 2.3.0 | `host-step.sh`, `check.sh` |
| Debian 13 arm64 cloud image | the digest in that Lima version's image list | Lima |
| Node | 26.12.1 | `myharness.yaml`, `check.sh`, `../verify/pins.json` |
| Claude Code | 2.1.307 | `myharness.yaml`, `check.sh` |
| Pi | 0.99.1 | `myharness.yaml`, `check.sh` |

A version change is a reviewed change on its own. Prove an engine pin through the
[engine contract](../suite/README.md) before changing it.

## Run it

Fetch all four files from `vm/` in `akshay-karanjkar/BYOH` at `v1.0.0`, the
release named in the top-level README. Check `SHA256SUMS` against the hash
published in that README, then verify the three files with
`shasum -a 256 -c SHA256SUMS` before running anything. On the Mac:

```sh
sh host-step.sh                                  # the defaults: both engines, one disk, prevent sleep on
sh host-step.sh --engines pi --disk data --prevent-sleep no --memory 6
sh check.sh --mac
ssh myharness                                    # then, inside the host, with the repository cloned:
sh vm/check.sh --host
```

Before the real-login stage engine logins report INFO; pass `--login-stage` after it.
Before a logout, restart, shutdown or macOS update: `~/.local/bin/limactl stop myharness`.
