#!/bin/sh
# The pinned host step: the only thing from this repository that runs on the Mac (spec/vm.md, spec/onboarding.md R1).
# Installs the pinned Lima under ~/.local, creates the VM, writes the SSH names and turns on start at login.
# Removal: host-step.sh --remove [--keep-data-disk] [--yes] (spec/vm.md R11).
set -eu

LIMA_VERSION=2.3.0
LIMA_SHA256=b7af444bd8f91d3c307477e562f2cf3bd7595d62b9429185e4fa841563578cfc  # lima-2.3.0-Darwin-arm64.tar.gz, from the release's SHA256SUMS
LIMACTL="$HOME/.local/bin/limactl"
LIMA_DIR="$HOME/.lima"
MANIFEST="$HOME/.local/share/myharness-lima.files"
SSH_FILE="$HOME/.ssh/myharness.conf"
INCLUDE="Include ~/.ssh/myharness.conf"
HERE=$(CDPATH="" cd -- "$(dirname -- "$0")" && pwd)

say() { printf '%s\n' "$*"; }
die() { printf 'reason: %s\n' "$*" >&2; exit 1; }

drop_include() {
  [ -f "$HOME/.ssh/config" ] || return 0
  grep -vxF "$INCLUDE" "$HOME/.ssh/config" > "$HOME/.ssh/config.myharness.new" || true
  chmod 600 "$HOME/.ssh/config.myharness.new"
  mv "$HOME/.ssh/config.myharness.new" "$HOME/.ssh/config"
}

remove() {
  keep=0; yes=0
  for a in "$@"; do
    case "$a" in --keep-data-disk) keep=1 ;; --yes) yes=1 ;; *) printf 'usage: host-step.sh --remove [--keep-data-disk] [--yes]\n' >&2; exit 2 ;; esac
  done
  say "This deletes the VM and the harness data inside it, unless VM backup was chosen or the data disk is kept."
  if [ "$yes" = 0 ]; then
    printf 'Type yes to go on: '
    read -r answer
    [ "$answer" = yes ] || { say "Nothing was removed."; exit 0; }
  fi
  if [ -x "$LIMACTL" ]; then
    "$LIMACTL" autostart disable myharness 2>/dev/null || true
    "$LIMACTL" delete -f myharness 2>/dev/null || true
  fi
  rm -f "$SSH_FILE" "$HOME/.ssh/myharness_known_hosts"
  drop_include
  rm -rf "$HOME/Applications/myharness.app" "$HOME/Library/Application Support/myharness" "$HOME/Library/Caches/lima"
  if [ "$keep" = 1 ] && [ -e "$LIMA_DIR/_disks/mhhome" ]; then
    find "$LIMA_DIR" -mindepth 1 -maxdepth 1 ! -name _disks -exec rm -rf {} +
    say "The data disk stays at $LIMA_DIR/_disks/mhhome."
  else
    rm -rf "$LIMA_DIR"
  fi
  if [ -f "$MANIFEST" ]; then
    # Files first, then directories, deepest first; only what Lima's archive installed. Shared directories stay when not empty.
    sort -r "$MANIFEST" | while IFS= read -r p; do
      if [ -d "$HOME/.local/$p" ] && [ ! -L "$HOME/.local/$p" ]; then rmdir "$HOME/.local/$p" 2>/dev/null || true; else rm -f "$HOME/.local/$p"; fi
    done
    rm -f "$MANIFEST"
  fi
  say "result: removed"
  say "Undo the prevent-sleep setting in System Settings if you turned it on."
  exit 0
}

ENGINES=claude,pi; DISK=one; SLEEP=yes; MEMORY=""; CPUS=""
while [ $# -gt 0 ]; do
  case "$1" in
    --remove) shift; remove "$@" ;;
    --engines) ENGINES=${2:?}; shift 2 ;;
    --disk) DISK=${2:?}; shift 2 ;;
    --prevent-sleep) SLEEP=${2:?}; shift 2 ;;
    --memory) MEMORY=${2:?}; shift 2 ;;
    *) printf 'usage: host-step.sh [--engines claude,pi] [--disk one|data] [--prevent-sleep yes|no] [--memory GiB] | --remove [--keep-data-disk] [--yes]\n' >&2; exit 2 ;;
  esac
done
case "$ENGINES" in claude|pi|claude,pi|pi,claude) ;; *) die "--engines takes claude, pi or both" ;; esac
case "$DISK" in one|data) ;; *) die "--disk takes one or data" ;; esac
case "$SLEEP" in yes|no) ;; *) die "--prevent-sleep takes yes or no" ;; esac

say "step: preflight"
[ "$(uname -s)" = Darwin ] && [ "$(uname -m)" = arm64 ] || die "an Apple Silicon Mac is required"
os=$(sw_vers -productVersion); major=${os%%.*}; rest=${os#*.}; minor=${rest%%.*}
if [ "$major" -lt 13 ] || { [ "$major" -eq 13 ] && [ "${minor:-0}" -lt 5 ]; }; then die "macOS 13.5 or later is required, this is $os"; fi
free_gib=$(df -g "$HOME" | awk 'NR==2 { print $4 }')
[ "$free_gib" -ge 30 ] || die "at least 30 GiB must be free in your home, $free_gib GiB is"
for p in 7797 4388 1455; do
  if lsof -nP -iTCP:"$p" -sTCP:LISTEN >/dev/null 2>&1; then die "port $p on this Mac is in use; free it and run this again (P24)"; fi
done
for f in default.yaml override.yaml; do
  [ ! -e "$LIMA_DIR/_config/$f" ] || die "$LIMA_DIR/_config/$f applies to every Lima instance; remove it or decide with your agent (P7)"
done
if [ -e "$LIMA_DIR/myharness" ]; then die "a Lima instance named myharness already exists; nothing was replaced"; fi

ram=$(( $(sysctl -n hw.memsize) / 1073741824 ))
if [ -z "$MEMORY" ]; then
  if [ "$ram" -ge 32 ]; then MEMORY=8; elif [ "$ram" -ge 24 ]; then MEMORY=6; elif [ "$ram" -ge 16 ]; then MEMORY=4
  else die "this Mac has $ram GB, which is not recommended; pass --memory 3 to go on, and stop the VM when idle"; fi
fi
cores=$(sysctl -n hw.ncpu); CPUS=$(( cores / 2 ))
[ "$CPUS" -ge 2 ] || CPUS=2
[ "$CPUS" -le 6 ] || CPUS=6
say "VM: $CPUS CPUs, $MEMORY GiB memory, a disk file on this Mac that grows to at most 100 GiB"

say "step: files"
( cd "$HERE" && shasum -a 256 -c SHA256SUMS >/dev/null ) || die "the files next to this program do not match SHA256SUMS; nothing was installed"

say "step: lima"
if [ "$("$LIMACTL" --version 2>/dev/null)" != "limactl version $LIMA_VERSION" ]; then
  t=$(mktemp -d)
  a="lima-$LIMA_VERSION-Darwin-arm64.tar.gz"
  curl -fsSL "https://github.com/lima-vm/lima/releases/download/v$LIMA_VERSION/$a" -o "$t/$a"
  printf '%s  %s\n' "$LIMA_SHA256" "$t/$a" | shasum -a 256 -c >/dev/null || { rm -rf "$t"; die "the Lima archive does not match its pinned hash; nothing was installed"; }
  mkdir -p "$HOME/.local/share"
  tar -tzf "$t/$a" | sed -e 's#^\./##' -e 's#/$##' | grep -v '^$' > "$MANIFEST"
  tar -C "$HOME/.local" -xzf "$t/$a"
  rm -rf "$t"
fi
[ "$("$LIMACTL" --version)" = "limactl version $LIMA_VERSION" ] || die "limactl is not at $LIMA_VERSION"

say "step: create"
"$LIMACTL" validate "$HERE/myharness.yaml" >/dev/null 2>&1 || die "the template does not validate"
port=60022
while lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; do port=$(( port + 1 )); done
disk_set=""
if [ "$DISK" = data ]; then
  [ -e "$LIMA_DIR/_disks/mhhome" ] || "$LIMACTL" disk create mhhome --size 100GiB
  disk_set='.additionalDisks=[{"name":"mhhome","format":true,"fsType":"ext4"}] | .param.DATA_DISK="yes"'
fi
"$LIMACTL" create --name=myharness --tty=false --cpus="$CPUS" --memory="$MEMORY" \
  --set ".ssh.localPort=$port | .param.ENGINES=\"$ENGINES\"${disk_set:+ | $disk_set}" "$HERE/myharness.yaml"
say "step: start (the first start takes several minutes)"
"$LIMACTL" start myharness --timeout=30m

say "step: ssh names"
admin=$("$LIMACTL" shell --workdir / myharness id -un)
mkdir -p "$HOME/.ssh"; chmod 700 "$HOME/.ssh"
{
  for pair in "myharness myharness" "myharness-admin $admin"; do
    set -- $pair
    printf 'Host %s\n  HostName 127.0.0.1\n  Port %s\n  User %s\n' "$1" "$port" "$2"
    printf '  IdentityFile %s/_config/user\n  IdentitiesOnly yes\n  BatchMode yes\n' "$LIMA_DIR"
    printf '  ForwardAgent no\n  ForwardX11 no\n  ControlMaster no\n  ControlPath none\n'
    printf '  StrictHostKeyChecking accept-new\n  UserKnownHostsFile ~/.ssh/myharness_known_hosts\n\n'
  done
} > "$SSH_FILE.new"
chmod 600 "$SSH_FILE.new"; mv "$SSH_FILE.new" "$SSH_FILE"
if ! grep -qxF "$INCLUDE" "$HOME/.ssh/config" 2>/dev/null; then
  { printf '%s\n' "$INCLUDE"; cat "$HOME/.ssh/config" 2>/dev/null || true; } > "$HOME/.ssh/config.myharness.new"
  chmod 600 "$HOME/.ssh/config.myharness.new"; mv "$HOME/.ssh/config.myharness.new" "$HOME/.ssh/config"
fi

say "step: start at login"
"$LIMACTL" autostart enable myharness --condition=login --keep-alive=false

if [ "$SLEEP" = yes ]; then
  say "step: prevent sleep (a sleeping Mac pauses the VM, so bots stop and routines are missed; on battery the Mac still sleeps; undo it in System Settings)"
  sudo pmset -c sleep 0 || say "The sleep setting was not changed; you can set it in System Settings."
fi
{ printf 'prevent_sleep=%s\n' "$SLEEP"; printf 'memory=%s\ncpus=%s\n' "$MEMORY" "$CPUS"; } > "$LIMA_DIR/myharness/myharness-host-step.env"

say "step: check"
sh "$HERE/check.sh" --mac
say "result: ready. Next: ssh myharness"
