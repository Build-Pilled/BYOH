#!/bin/sh
# The environment check (spec/host.md R10, R11). Reads only: it never starts, stops, installs or repairs anything,
# and prints names, modes and types, never credential contents.
#   check.sh --mac  [--bot <name>] [--admin <name>] [--own-host] [--login-stage]
#   check.sh --host [--own-host] [--login-stage] [--engines claude,pi]
# Each line: LEVEL id: message [fix: <reference>]. Any FAIL exits 1.
set -u

LIMA_VERSION=2.3.0
NODE_VERSION=26.12.1
CLAUDE_VERSION=2.1.307
PI_VERSION=0.99.1
LIMACTL_SHA256=807fe2112a5524392153494f07b989eccd9f7c92bb45053966a2e83816631d3b   # bin/limactl inside the pinned Lima archive; recorded with the Lima pin
LIMACTL="$HOME/.local/bin/limactl"

PART=""; BOT=myharness; ADMIN=myharness-admin; OWN=0; LOGIN=0; ENGINES=""
while [ $# -gt 0 ]; do
  case "$1" in
    --mac) PART=mac; shift ;;
    --host) PART=host; shift ;;
    --bot) BOT=${2:?}; shift 2 ;;
    --admin) ADMIN=${2:?}; shift 2 ;;
    --own-host) OWN=1; shift ;;
    --login-stage) LOGIN=1; shift ;;
    --engines) ENGINES=${2:?}; shift 2 ;;
    *) printf 'usage: check.sh --mac|--host [options]\n' >&2; exit 2 ;;
  esac
done
[ -n "$PART" ] || { printf 'usage: check.sh --mac|--host [options]\n' >&2; exit 2; }

failed=0
line() { # LEVEL id message [fix]
  [ "$1" = FAIL ] && failed=1
  if [ -n "${4:-}" ]; then printf '%s %s: %s [fix: %s]\n' "$1" "$2" "$3" "$4"; else printf '%s %s: %s\n' "$1" "$2" "$3"; fi
}
vm_only() { # id: true when the check applies; an own host gets an INFO line, never a silent PASS
  if [ "$OWN" = 1 ]; then line INFO "$1" "supplied VM only, skipped on an own host"; return 1; fi
  return 0
}
rssh() { n=$1; shift; ssh -n -o BatchMode=yes -o ConnectTimeout=10 "$n" "$@" 2>/dev/null; }

mac() {
  os=$(sw_vers -productVersion 2>/dev/null || echo 0); a=$(uname -m); major=${os%%.*}; rest=${os#*.}; minor=${rest%%.*}
  if [ "$a" = arm64 ] && { [ "$major" -gt 13 ] || { [ "$major" -eq 13 ] && [ "${minor:-0}" -ge 5 ]; }; }; then line PASS M-os "macOS $os on $a"
  else line FAIL M-os "macOS 13.5 or later on arm64 is required, this is $os on $a" "R1"; fi

  ok=1
  for n in "$BOT" "$ADMIN"; do
    u=$(rssh "$n" id -un) || { ok=0; line FAIL M-ssh "$n does not log in within 10 s" P19; continue; }
    g=$(ssh -G "$n" 2>/dev/null)
    printf '%s\n' "$g" | grep -qx 'forwardagent no' || { ok=0; line FAIL M-ssh "$n has agent forwarding on" P17; }
    printf '%s\n' "$g" | grep -qx 'controlmaster false' || { ok=0; line FAIL M-ssh "$n has connection sharing on" P17; }
    printf '%s\n' "$g" | grep -qx 'controlpath none' || { ok=0; line FAIL M-ssh "$n has a shared connection path" P17; }
    [ "$n" = "$BOT" ] && botuser=$u
  done
  [ "$ok" = 1 ] && line PASS M-ssh "both names log in; agent forwarding and connection sharing are off (bot user ${botuser:-unknown})"

  busy=""
  for p in 7797 4388 1455; do
    who=$(lsof -nP -iTCP:"$p" -sTCP:LISTEN -Fc 2>/dev/null | sed -n 's/^c//p' | head -1)
    case "$who" in ""|limactl*|ssh|myharness*) ;; *) busy="$busy $p($who)" ;; esac
  done
  if [ -n "$busy" ]; then line FAIL M-ports "held by another program:$busy" P24
  else
    h=$(curl -s -m 5 -o /dev/null -w '%{http_code}' http://127.0.0.1:7797/health)
    case "$h" in 000|401) line PASS M-ports "7797, 4388 and 1455 are free or held by the VM's forwarder" ;;
      *) line FAIL M-ports "/health without a token answered $h, expected 401" P24 ;; esac
  fi

  if vm_only M-lima; then
    if [ -x "$LIMACTL" ] && [ "$("$LIMACTL" --version 2>/dev/null)" = "limactl version $LIMA_VERSION" ] && \
       [ "$(shasum -a 256 "$LIMACTL" 2>/dev/null | cut -d' ' -f1)" = "$LIMACTL_SHA256" ]; then line PASS M-lima "limactl $LIMA_VERSION at its pinned hash"
    else line FAIL M-lima "$LIMACTL is not the pinned $LIMA_VERSION" P25; fi
  fi
  if vm_only M-cfg; then
    if [ -e "$HOME/.lima/_config/default.yaml" ] || [ -e "$HOME/.lima/_config/override.yaml" ]; then line FAIL M-cfg "a Lima-wide default or override file exists" P7
    else line PASS M-cfg "no Lima-wide configuration"; fi
  fi
  if vm_only M-vm; then
    st=$("$LIMACTL" list --json myharness 2>/dev/null)
    status=$(printf '%s' "$st" | sed -n 's/.*"status":"\([^"]*\)".*/\1/p')
    vmtype=$(printf '%s' "$st" | sed -n 's/.*"vmType":"\([^"]*\)".*/\1/p')
    case "$status" in
      Running) if [ "$vmtype" = vz ]; then line PASS M-vm "running on vz"; else line FAIL M-vm "running on $vmtype, not vz" R1; fi ;;
      Broken) line FAIL M-vm "the instance shows Broken" P5 ;;
      *) line FAIL M-vm "the instance is ${status:-absent}" P5 ;;
    esac
  fi
  if vm_only M-iso; then
    y="$HOME/.lima/myharness/lima.yaml"; bad=""
    if [ ! -r "$y" ]; then bad=" no instance file"; else
      grep -q '^mounts: \[\]' "$y" || bad="$bad mounts"
      grep -Eq '^ *forwardAgent: false' "$y" || bad="$bad agent-forwarding"
      grep -Eq '^ *forwardX11: false' "$y" || bad="$bad x11-forwarding"
      grep -Eq '^ *loadDotSSHPubKeys: false' "$y" || bad="$bad own-keys"
      [ "$(grep -Ec '^ *(system|user): false' "$y")" -ge 2 ] || bad="$bad containerd"
      grep -Eq '^ *hostLoopback: false' "$y" || bad="$bad host-loopback"
      for p in 7797 4388 1455; do grep -Eq "guestPort: $p( |$)" "$y" || bad="$bad forward-$p"; done
      [ "$(grep -Ec '^ *- guestPort:|^ *guestPort:' "$y")" = 3 ] || bad="$bad extra-forward"
      grep -Eq '^ *ignore: true' "$y" || bad="$bad ignore-all"
    fi
    if [ -z "$bad" ]; then line PASS M-iso "no mounts, forwarding off, own keys not loaded, containerd off, exact forwards ending in ignore-all"
    else line FAIL M-iso "not as the template says:$bad" P6; fi
  fi
  if vm_only M-auto; then
    if ls "$HOME"/Library/LaunchAgents/*lima*myharness*.plist >/dev/null 2>&1; then line PASS M-auto "start at login is enabled"
    else line WARN M-auto "start at login is not enabled" P25; fi
  fi
  if vm_only M-sleep; then
    want=$(sed -n 's/^prevent_sleep=//p' "$HOME/.lima/myharness/myharness-host-step.env" 2>/dev/null)
    if [ "$want" = yes ]; then
      if pmset -g custom 2>/dev/null | awk '/AC Power/{a=1} a&&/^ *sleep /{print $2; exit}' | grep -qx 0; then line PASS M-sleep "the prevent-sleep setting is on"
      else line WARN M-sleep "you chose prevent-sleep and it is off" P28; fi
    else line PASS M-sleep "prevent-sleep was not chosen"; fi
  fi
  if vm_only M-disk; then
    f=$(df -g "$HOME" | awk 'NR==2 { print $4 }'); u=$(du -sg "$HOME/.lima/myharness" 2>/dev/null | cut -f1)
    if [ "${f:-0}" -ge 30 ] && [ "${u:-0}" -lt 80 ]; then line PASS M-disk "$f GiB free; VM disk at $u GiB"
    else line WARN M-disk "$f GiB free; VM disk at ${u:-unknown} GiB" P3; fi
  fi
  if vm_only M-fw; then
    t=$(rssh "$ADMIN" sudo -n nft list table inet myharness_egress) || t=""
    if printf '%s' "$t" | grep -q 'hook output' && printf '%s' "$t" | grep -q 'meta skuid 1500 jump bots' && \
       printf '%s' "$t" | grep -q '192.168.0.0/16' && printf '%s' "$t" | grep -q 'meta nfproto ipv6 jump refuse'; then line PASS M-fw "the output rule is loaded with its positive UID match and refusals"
    else line FAIL M-fw "the output rule is missing or changed" P11; fi
  fi
}

host() {
  # On the supplied VM the bot user is UID 1500; an own host passes --own-host.
  libc=$(ldd --version 2>&1 | head -1); arch=$(uname -m)
  case "$libc:$arch" in
    *GLIBC*:aarch64|*GNU\ libc*:aarch64|*GLIBC*:x86_64|*GNU\ libc*:x86_64)
      if [ "$OWN" = 1 ]; then line PASS H-os "glibc Linux on $arch"
      else
        . /etc/os-release
        if [ "${VERSION_ID:-}" != 13 ] || [ "${ID:-}" != debian ]; then line FAIL H-os "the supplied VM runs Debian 13, this is ${ID:-?} ${VERSION_ID:-?}" R1
        elif grep -q daily /var/lib/cloud/instance/datasource 2>/dev/null; then line WARN H-os "running from the daily image" R1
        else line PASS H-os "Debian 13 on $arch"; fi
      fi ;;
    *) line FAIL H-os "glibc Linux on arm64 or x86_64 is required" R1 ;;
  esac

  g=$(id -Gn)
  if [ "$g" != "$(id -un)" ]; then line FAIL H-user "extra groups: $g" R2
  elif sudo -n true 2>/dev/null; then line FAIL H-user "the bot user has sudo" R2
  elif ! loginctl show-user "$(id -un)" 2>/dev/null | grep -q '^Linger=yes'; then line FAIL H-user "services do not persist without a login" R2
  else line PASS H-user "own group only, no sudo, services persist"; fi

  m=$(findmnt -rno TARGET,FSTYPE 2>/dev/null | awk '$2 ~ /^(9p|virtiofs|fuse\.sshfs|nfs|nfs4|cifs|smb3)$/ { print $1 }')
  if [ -n "$m" ]; then line FAIL H-mounts "a shared folder is mounted: $m" P6; else line PASS H-mounts "no Mac or personal folder is mounted"; fi

  refused=1
  for t in 192.168.5.2 10.0.0.1; do
    curl -s -m 1 -o /dev/null "http://$t/"; [ $? = 7 ] || refused=0   # 7: refused. A timeout is not a refusal within 1 s.
  done
  code=$(curl -s -m 10 -o /dev/null -w '%{http_code}' https://api.github.com)
  if [ "$refused" = 1 ] && [ "$code" = 200 ]; then line PASS H-egress "private addresses refused; DNS and api.github.com answer"
  else
    lvl=FAIL; [ "$OWN" = 1 ] && lvl=WARN
    line "$lvl" H-egress "private addresses refused: $refused; api.github.com answered $code" P9
  fi

  if [ "$OWN" = 1 ]; then
    line INFO H-units "egress unit is supplied VM only"
  else
    bad=""
    systemctl is-active --quiet myharness-egress.service || bad="$bad egress-not-active"
    systemctl is-enabled --quiet myharness-egress.service || bad="$bad egress-not-enabled"
    systemctl is-active --quiet "user@$(id -u).service" || bad="$bad user-manager"
    f=$(systemctl list-units --state=failed --no-legend --plain 2>/dev/null | awk '{print $1}' | tr '\n' ' ')
    [ -z "$f" ] || bad="$bad failed:$f"
    if [ -x /opt/myharness/src/bin/myharness ]; then systemctl is-active --quiet myharness.service || bad="$bad daemon"; fi
    if [ -z "$bad" ]; then line PASS H-units "egress unit active and enabled, service manager running, no failed units"; else line FAIL H-units "$bad" P14; fi
  fi

  free_g=$(df -BG --output=avail / | tail -1 | tr -dc 0-9)
  sw=$(awk '/SwapTotal/{print int($2/1048576+0.5)}' /proc/meminfo); swf=$(awk '/SwapFree/{f=$2} /SwapTotal/{t=$2} END{print (t>0 && f<t/2)?"high":"ok"}' /proc/meminfo)
  w=$(cat /proc/sys/fs/inotify/max_user_watches)
  oom=$(journalctl -k -b --no-pager -q 2>/dev/null | grep -c -i 'out of memory: killed')
  if [ "$free_g" -lt 20 ]; then line FAIL H-res "$free_g GiB free on the root file system" P32
  elif [ "$w" -lt 524288 ]; then line FAIL H-res "inotify limit is $w" P32
  elif [ "$OWN" = 0 ] && [ "$sw" != 4 ]; then line FAIL H-res "swap is $sw GiB, expected 4" P32
  elif [ "$swf" = high ] || [ "$oom" -gt 0 ]; then
    line WARN H-res "memory pressure (swap $swf, $oom out-of-memory kills): stop the VM, run limactl edit --memory <next row of the sizing table> myharness, start it again" P32
  else line PASS H-res "$free_g GiB free, swap $sw GiB, inotify $w"; fi

  bad=""
  [ "$(node -v 2>/dev/null)" = "v$NODE_VERSION" ] || bad="$bad node"
  for t in git curl rsync sqlite3 jq Xvfb xauth; do command -v "$t" >/dev/null || bad="$bad $t"; done
  for so in libgtk-3.so.0 libnss3.so libasound.so.2 libgbm.so.1; do ldconfig -p 2>/dev/null | grep -q "$so" || bad="$bad $so"; done
  [ -n "$ENGINES" ] || ENGINES=claude,pi
  case ",$ENGINES," in *,claude,*)
    [ "$("$HOME/.local/bin/claude" --version 2>/dev/null | cut -d' ' -f1)" = "$CLAUDE_VERSION" ] || bad="$bad claude-pin"
    grep -q 'DISABLE_AUTOUPDATER' "$HOME/.claude/settings.json" 2>/dev/null || bad="$bad claude-updates-on" ;;
  esac
  case ",$ENGINES," in *,pi,*)
    [ "$("$HOME/.local/bin/pi" --version 2>/dev/null)" = "$PI_VERSION" ] || bad="$bad pi-pin" ;;
  esac
  if [ -z "$bad" ]; then line PASS H-tools "Node $NODE_VERSION, tools and libraries present, engines at their pins"; else line FAIL H-tools "missing or off pin:$bad" P2; fi

  if timedatectl show -p NTPSynchronized --value 2>/dev/null | grep -qx yes; then line PASS H-time "the clock is synchronised"; else line WARN H-time "the clock is not synchronised" P28; fi

  if vm_only H-upd; then
    a=$(systemctl is-active apt-daily.timer 2>/dev/null); b=$(systemctl is-active apt-daily-upgrade.timer 2>/dev/null)
    old=0
    if [ -f /var/lib/apt/periodic/upgrade-stamp ] && [ -n "$(find /var/lib/apt/periodic/upgrade-stamp -mtime +3 2>/dev/null)" ]; then old=1; fi
    if [ "$a:$b" = active:active ] && [ "$old" = 0 ]; then line PASS H-upd "security update timers active"
    else line WARN H-upd "update timers $a/$b; last upgrade run older than 3 days: $old" P27; fi
  fi

  l=$(ss -H -ltnu 2>/dev/null | awk '{print $5}' | grep -Ev '^(127\.[0-9.]+|\[::1\]|::1)[:%]' | grep -Ev ':22$' | grep -Ev '%[a-z0-9]+:68$' | grep -Ev '^127\.0\.0\.53' | tr '\n' ' ')
  if [ -n "$l" ]; then lvl=FAIL; [ "$OWN" = 1 ] && lvl=WARN; line "$lvl" H-listen "listening beyond loopback: $l" P10
  else line PASS H-listen "only sshd listens beyond loopback"; fi

  jr=$(journalctl -b -p err --no-pager -q 2>/dev/null | wc -l)
  if journalctl -k -b --no-pager -q 2>/dev/null | grep -qi 'recovery complete\|orphan cleanup'; then line INFO H-boot "the file system recovered at this boot; stop the VM first next time" P4
  elif [ "$jr" -gt 0 ]; then line WARN H-boot "$jr boot errors in the journal" P5
  else line PASS H-boot "clean boot"; fi

  lvl=INFO; [ "$LOGIN" = 1 ] && lvl=FAIL
  bad=""
  case ",$ENGINES," in *,claude,*)
    f="$HOME/.claude/.credentials.json"
    { [ -f "$f" ] && [ "$(stat -c %a "$f")" = 600 ] && jq -e 'has("claudeAiOauth")' "$f" >/dev/null 2>&1; } || bad="$bad claude-login" ;;
  esac
  case ",$ENGINES," in *,pi,*)
    f="$HOME/.pi/agent/auth.json"
    { [ -f "$f" ] && [ "$(stat -c %a "$f")" = 600 ] && jq -e 'length > 0' "$f" >/dev/null 2>&1; } || bad="$bad pi-login" ;;
  esac
  if [ -z "$bad" ]; then line PASS H-login "engine login files present with mode 0600"; else line "$lvl" H-login "not signed in yet:$bad" P21; fi

  if [ -d /opt/myharness/src/.git ]; then
    # The bot may read the deployed checkout; Git's ownership check needs the exact path allowed.
    d=$(git -c safe.directory=/opt/myharness/src -C /opt/myharness/src rev-parse HEAD 2>/dev/null)
    if [ -n "$d" ] && systemctl is-active --quiet myharness.service; then line PASS H-build "the live daemon runs deployed commit $d"; else line FAIL H-build "the deployed checkout or the daemon is not healthy" R6; fi
  else line INFO H-build "nothing is deployed yet"; fi

  if [ "$OWN" = 0 ] && [ -r /etc/myharness/home-fs-created ]; then
    if mountpoint -q "$HOME"; then line PASS H-disk2 "the data disk is mounted at the bot home"; else line FAIL H-disk2 "the data disk is not mounted at the bot home" P13; fi
  fi
}

"$PART"
exit "$failed"
