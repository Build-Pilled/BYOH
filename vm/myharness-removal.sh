# Sourced by the checked host step. POSIX shell and macOS built-ins only.
STATE_DIR="$HOME/.local/share/myharness-host-state"
RECORD="$STATE_DIR/record"
LOCK="$STATE_DIR/lock"
phase=installed; disk_phase=none; ssh_created=0; ssh_inserted=0; ssh_inode=0; ssh_hash=none
locked=0

owned_path() (
  # Refuse links in any existing component, not just the final leaf.
  p=$1
  while [ "$p" != / ] && [ "$p" != . ]; do
    [ ! -L "$p" ] || die "ambiguous linked path; kept: $1"
    if [ -e "$p" ]; then
      [ "$(stat -f %u "$p")" = "$(id -u)" ] || die "path is not owned by this user; kept: $1"
    fi
    [ "$p" != "$HOME" ] || break
    p=${p%/*}; [ -n "$p" ] || p=/
  done
)
file_hash() {
  hashed=$(shasum -a 256 "$1") || return 1
  printf '%s\n' "${hashed%% *}"
}
file_inode() { stat -f '%d:%i' "$1"; }
state_write() {
  ( umask 077
    t=$(mktemp "$STATE_DIR/.record.XXXXXX") || exit 1
    { printf 'version=1\nphase=%s\ndisk_phase=%s\n' "$phase" "$disk_phase"
      printf 'ssh_created=%s\nssh_inserted=%s\nssh_inode=%s\nssh_hash=%s\nend=1\n' "$ssh_created" "$ssh_inserted" "$ssh_inode" "$ssh_hash"
    } > "$t" && chmod 600 "$t" && mv "$t" "$RECORD"
  ) || die "could not record the phase; installation files were kept"
}
state_read() {
  [ -f "$RECORD" ] || die "the new-install host record is missing; use this installation's original release remover"
  owned_path "$RECORD"
  [ "$(stat -f %Lp "$RECORD")" = 600 ] || die "host record permissions are not 600"
  [ "$(wc -l < "$RECORD" | tr -d ' ')" = 8 ] || die "invalid host record"
  [ "$(sed -n '1p' "$RECORD")" = version=1 ] || die "unknown host record version"
  phase=$(sed -n '2s/^phase=//p' "$RECORD")
  disk_phase=$(sed -n '3s/^disk_phase=//p' "$RECORD")
  ssh_created=$(sed -n '4s/^ssh_created=//p' "$RECORD")
  ssh_inserted=$(sed -n '5s/^ssh_inserted=//p' "$RECORD")
  ssh_inode=$(sed -n '6s/^ssh_inode=//p' "$RECORD")
  ssh_hash=$(sed -n '7s/^ssh_hash=//p' "$RECORD")
  # The eighth line is a fixed end marker, not executable or extensible state.
  [ "$(sed -n '8p' "$RECORD")" = end=1 ] || die "incomplete host record"
  case "$phase" in installed|preparing|collected|deleting-vm|vm-removed|data-removed|complete) ;; *) die "unknown removal phase" ;; esac
  case "$disk_phase" in none|kept|removed) ;; *) die "unknown disk phase" ;; esac
  case "$ssh_created:$ssh_inserted" in 0:0|0:1|1:1) ;; *) die "invalid SSH provenance" ;; esac
  case "$ssh_inode" in *[!0-9:]*|'') die "invalid SSH file identity" ;; esac
  case "$ssh_hash" in none) ;; *) [ "${#ssh_hash}" = 64 ] || die "invalid SSH digest"; case "$ssh_hash" in *[!0-9a-f]*) die "invalid SSH digest" ;; esac ;; esac
}
release_lock() {
  if [ "$locked" = 1 ]; then rm -f "$LOCK/pid"; rmdir "$LOCK" 2>/dev/null || :; fi
}
state_lock() {
  owned_path "$STATE_DIR"
  ( umask 077; mkdir -p "$STATE_DIR" ) || die "cannot create the host-state directory"
  chmod 700 "$STATE_DIR"
  if ! ( umask 077; mkdir "$LOCK" ) 2>/dev/null; then
    die "another host operation owns $LOCK; if interrupted, verify it has ended before removing that lock directory and retrying"
  fi
  locked=1; printf '%s\n' "$$" > "$LOCK/pid"
  trap 'release_lock' EXIT
  trap 'exit 1' HUP INT TERM
}
ssh_install_include() {
  config="$HOME/.ssh/config"
  owned_path "$HOME/.ssh"; owned_path "$config"
  if [ -e "$config" ]; then [ -f "$config" ] || die "SSH config is not a regular file"; fi
  if [ -f "$config" ] && grep -qxF "$INCLUDE" "$config"; then return; fi
  ssh_created=0; [ -e "$config" ] || ssh_created=1
  before=none; [ ! -e "$config" ] || before=$(file_hash "$config")
  t=$(mktemp "$HOME/.ssh/.myharness-include.XXXXXX") || die "cannot prepare SSH Include"
  chmod 600 "$t"
  { printf '%s\n' "$INCLUDE"; if [ -f "$config" ]; then cat "$config"; fi; } > "$t" || die "could not read SSH config; kept"
  ssh_inserted=1; ssh_inode=$(file_inode "$t"); ssh_hash=$(file_hash "$t")
  # Record intention and the prepared replacement's lineage BEFORE publishing it.
  state_write
  if [ "$before" = none ]; then [ ! -e "$config" ] || die "SSH config appeared during setup; kept"
  else [ "$(file_hash "$config")" = "$before" ] || die "SSH config changed during setup; kept"; fi
  mv "$t" "$config" || die "cannot publish SSH Include"
}
drop_include() {
  [ "$ssh_inserted" = 1 ] || return 0
  config="$HOME/.ssh/config"
  [ -e "$config" ] || return 0
  owned_path "$config"
  [ -f "$config" ] || die "SSH config is not a regular file; kept"
  # A replacement is not our lineage. Preserve it and explain rather than guess.
  if [ "$(file_inode "$config")" != "$ssh_inode" ]; then
    say "Kept SSH config: its file identity changed; remove only the exact Include manually if it remains."
    return 0
  fi
  before=$(file_hash "$config")
  t=$(mktemp "$HOME/.ssh/.myharness-include.XXXXXX") || die "cannot prepare SSH cleanup"
  chmod 600 "$t"
  # Byte-preserving removal, including no-final-newline and non-ASCII tails.
  # The installed line is first. Later edits are never reformatted or restored.
  first=$(LC_ALL=C head -n 1 "$config")
  if [ "$first" != "$INCLUDE" ]; then rm -f "$t"; say "Kept changed SSH config: the inserted first line was moved/edited."; return 0; fi
  skip=$((${#INCLUDE} + 1))
  dd if="$config" of="$t" bs=1 skip="$skip" 2>/dev/null || die "cannot read SSH config; kept"
  [ "$(file_inode "$config")" = "$ssh_inode" ] && [ "$(file_hash "$config")" = "$before" ] || die "SSH config changed during cleanup; kept for retry"
  if [ "$ssh_created" = 1 ] && [ ! -s "$t" ] && [ "$before" = "$ssh_hash" ]; then
    rm "$config" "$t" || die "cannot restore SSH config absence"
  else
    mv "$t" "$config" || die "cannot atomically remove SSH Include; retry needed"
  fi
  ssh_inserted=0; ssh_created=0; state_write
}
receive_collection() {
  # No archive extraction, links, remote commands, executable metadata or modes.
  # All names are hex framed, validated, and confined below a new private root.
  root=$1; stream=$2; count=0; ended=0
  while IFS=' ' read -r kind hex size digest extra; do
    if [ "$kind" = END ]; then
      [ "$hex" = "$count" ] && [ -z "$size$digest$extra" ] || die "invalid collection end count"
      trailing=""
      if IFS= read -r trailing || [ -n "$trailing" ]; then die "trailing collection data"; fi
      ended=1; break
    fi
    [ "$kind" = F ] && [ -z "$extra" ] || die "invalid collection frame"
    case "$hex" in ''|*[!0-9a-f]*) die "invalid encoded collection path" ;; esac
    rel=$(printf '%s' "$hex" | xxd -r -p) || die "cannot decode collection path"
    [ "$(printf '%s' "$rel" | xxd -p | tr -d '\n')" = "$hex" ] || die "noncanonical collection path"
    case "$rel" in ''|/*|../*|*/../*|*/..|./*|*/./*|*/.|*//*|*/) die "unsafe collection path" ;; esac
    # Also reject control bytes, including embedded newlines and NULs.
    [ "$(printf '%s' "$rel" | LC_ALL=C tr -d '\000-\037\177')" = "$rel" ] || die "control byte in collection path"
    case "$rel" in home/*|source/*|deployed-source/*|native/*|READ-ME.txt|manifest.json) ;; *) die "unknown collection root" ;; esac
    case "$size" in ''|*[!0-9]*) die "invalid collection size" ;; esac
    [ "${#digest}" = 64 ] || die "invalid collection digest"
    case "$digest" in *[!0-9a-f]*) die "invalid collection digest" ;; esac
    target="$root/$rel"
    [ ! -e "$target" ] && [ ! -L "$target" ] || die "duplicate collection destination"
    ( umask 077; mkdir -p "${target%/*}" ) || die "cannot create collection directory"
    : > "$root/.encoded"
    finished=0
    while IFS= read -r data; do
      if [ "$data" = . ]; then finished=1; break; fi
      case "$data" in *[!A-Za-z0-9+/=]*|'') die "invalid file transfer encoding" ;; esac
      printf '%s\n' "$data" >> "$root/.encoded" || die "collection disk full"
    done
    [ "$finished" = 1 ] || die "incomplete collection file"
    base64 -D -i "$root/.encoded" > "$target" || die "could not decode saved file"
    chmod 600 "$target"
    [ "$(wc -c < "$target" | tr -d ' ')" = "$size" ] && [ "$(file_hash "$target")" = "$digest" ] || die "saved file size/checksum mismatch"
    count=$((count + 1))
  done < "$stream"
  [ "$ended" = 1 ] && [ -f "$root/manifest.json" ] && [ -f "$root/READ-ME.txt" ] || die "collection was not completed"
  # No trailing frame/data can silently escape verification.
  [ "$(tail -n 1 "$stream")" = "END $count" ] || die "trailing collection data"
  rm -f "$root/.encoded" "$stream"
}
remove() {
  keep=0; yes=0; policy=""
  for a in "$@"; do
    case "$a" in
      --keep-data-disk) keep=1 ;;
      --yes) yes=1 ;;
      --save-first|--discard-data)
        [ -z "$policy" ] || die "choose exactly one of --save-first and --discard-data"
        case "$a" in --save-first) policy=save ;; *) policy=discard ;; esac ;;
      *) printf 'usage: myharness-host-step.sh --remove [--save-first|--discard-data] [--keep-data-disk] [--yes]\n' >&2; exit 2 ;;
    esac
  done
  say "Removal quits the installed app and deletes this harness VM, data, exact app/support/preferences and owned SSH/Lima files. Other instances, saved collections and previously kept disks stay."
  say "A kept disk or a backup setting is not proof of a current saved copy. Saving may include anything typed into a conversation, in clear text. Credentials at known locations, Git history and VM images are excluded; no content scan is done."
  say "Quit can lose UI-only unsaved state. The service is stopped before collection; a just-started turn may be cut off. Do not start terminals, tidy, source writes or rebuilds during removal."
  if [ ! -t 0 ]; then
    [ -n "$policy" ] && [ "$yes" = 1 ] || die "unattended removal needs --save-first --yes or --discard-data --yes; nothing changed"
  fi
  save_uuid=$(uuidgen) || die "cannot create a unique save name; nothing changed"
  case "$save_uuid" in ''|*[!A-Za-z0-9-]*) die "invalid unique save name; nothing changed" ;; esac
  proposed_save="$HOME/myharness-removal-saves/$(date -u +%Y%m%dT%H%M%SZ)-$(printf '%s' "$save_uuid" | tr 'A-Z' 'a-z')"
  say "Save destination (if chosen): $proposed_save"
  if [ -z "$policy" ]; then
    printf 'Save first? [Y/n/cancel] (to skip, cancel and rerun with --discard-data): '
    IFS= read -r answer || { say "Nothing was removed."; exit 0; }
    case "$answer" in ''|y|Y|yes) policy=save ;; *) say "Nothing was removed. Skipping requires --discard-data."; exit 0 ;; esac
  fi
  if [ "$yes" = 0 ]; then
    printf 'Type yes for the final removal confirmation: '
    IFS= read -r answer || { say "Nothing was removed."; exit 0; }
    [ "$answer" = yes ] || { say "Nothing was removed."; exit 0; }
  fi
  # No state/lock/app/service mutation until both choices have been made.
  umask 077
  state_lock; state_read
  [ "$disk_phase" != kept ] || keep=1
  for p in "$SSH_FILE" "$HOME/.ssh/myharness-known-hosts" "$HOME/Applications/myharness.app" "$HOME/Library/Application Support/myharness" "$HOME/Library/Preferences/local.myharness.app.plist" "$MANIFEST"; do owned_path "$p"; done
  if [ -d "$HOME/Applications/myharness.app" ]; then
    bundle_id=$(plutil -extract CFBundleIdentifier raw -o - "$HOME/Applications/myharness.app/Contents/Info.plist") || die "cannot identify installed app"
    [ "$bundle_id" = local.myharness.app ] || die "installed app has a different identifier; kept"
  fi
  osascript -l JavaScript "$HERE/myharness-removal-app.js" quit || die "owned app did not quit safely; installation kept"
  save_path=""
  if [ -e "$LIMA_DIR/myharness-vm" ]; then
    [ -x "$LIMACTL" ] && [ "$("$LIMACTL" --version)" = "limactl version $LIMA_VERSION" ] || die "the pinned limactl is missing or changed; VM/data kept"
    phase=preparing; state_write
    if [ "$policy" = save ]; then
      parent="$HOME/myharness-removal-saves"; owned_path "$parent"
      ( umask 077; mkdir -p "$parent" ) || die "cannot create removal saves"
      chmod 700 "$parent"
      partial=$(mktemp -d "$parent/.$(basename "$proposed_save").partial.XXXXXX") || die "cannot create private partial save"
      chmod 700 "$partial"
      save_path="$proposed_save"
      say "Saving to $save_path. On failure, incomplete recovery bytes stay at $partial (not a complete save)."
      LIMA_HOME="$LIMA_DIR" "$LIMACTL" shell --workdir / myharness-vm sudo -n /usr/local/bin/node --input-type=module - save < "$HERE/myharness-removal-collect.mjs" > "$partial/.stream" || die "collection failed; VM/data kept; partial save: $partial. The service/tidy timer may be stopped; use the printed restart command"
      receive_collection "$partial" "$partial/.stream"
      [ ! -e "$save_path" ] && [ ! -L "$save_path" ] || die "save destination already exists; kept private partial at $partial"
      mv "$partial" "$save_path" || die "cannot publish save; VM/data kept, partial: $partial"
      phase=collected; state_write
      say "Verified save: $save_path (never automatically removed)."
    else
      vm_status=$(LIMA_HOME="$LIMA_DIR" "$LIMACTL" list --format '{{.Status}}' myharness-vm) || die "cannot determine VM state; kept"
      if [ "$vm_status" = Stopped ]; then
        printf 'QUIESCED\n' > "$STATE_DIR/.quiesced"
      elif [ "$vm_status" = Running ]; then
      LIMA_HOME="$LIMA_DIR" "$LIMACTL" shell --workdir / myharness-vm sudo -n /usr/local/bin/node --input-type=module - discard < "$HERE/myharness-removal-collect.mjs" > "$STATE_DIR/.quiesced" || die "busy or unable to stop cleanly; VM/data kept"
      else die "VM is not Running or Stopped; recover it with its own release tools before retrying"; fi
      [ "$(cat "$STATE_DIR/.quiesced")" = QUIESCED ] || die "missing clean-stop acknowledgement; VM/data kept"
      rm "$STATE_DIR/.quiesced"
    fi
    # The gate is deliberately volatile. A retry with a VM repeats quiescence
    # and collection; it never trusts phase=collected from a prior invocation.
    [ "$keep" = 0 ] || disk_phase=kept
    phase=deleting-vm; state_write
    LIMA_HOME="$LIMA_DIR" "$LIMACTL" autostart disable myharness-vm || die "cannot disable owned autostart; VM kept"
    LIMA_HOME="$LIMA_DIR" "$LIMACTL" delete -f myharness-vm || die "could not delete myharness-vm; retry keeps earlier saves"
    phase=vm-removed; state_write
  else
    case "$phase" in deleting-vm|vm-removed|data-removed|complete) ;; *) die "VM is missing before a recorded teardown; refusing to guess whether its data was saved" ;; esac
  fi
  [ ! -e "$LIMA_DIR/myharness-vm" ] || die "myharness-vm still exists; Lima files kept"
  if [ "$keep" = 1 ]; then
    disk_phase=kept; state_write
    say "The data disk stays in ~/.lima/_disks/myharness-d; you may delete that folder yourself. It is never automatically deleted later."
  elif [ "$disk_phase" != removed ] && [ -e "$LIMA_DIR/_disks/myharness-d" ]; then
    [ -x "$LIMACTL" ] && [ "$("$LIMACTL" --version)" = "limactl version $LIMA_VERSION" ] || die "pinned limactl missing; kept ~/.lima/_disks/myharness-d. You may delete a previously kept disk yourself"
    LIMA_HOME="$LIMA_DIR" "$LIMACTL" disk delete myharness-d || die "could not delete owned data disk; Lima files kept"
    disk_phase=removed
  fi
  [ "$keep" = 1 ] || disk_phase=removed
  phase=data-removed; state_write
  drop_include
  rm -f "$SSH_FILE" "$HOME/.ssh/myharness-known-hosts"
  # Recheck: a relaunched app must not recreate the profile while deleting it.
  osascript -l JavaScript "$HERE/myharness-removal-app.js" quit || die "app relaunched; remaining cleanup kept for retry"
  osascript -l JavaScript "$HERE/myharness-removal-app.js" preferences || die "exact preferences cleanup failed; retry needed"
  rm -rf "$HOME/Applications/myharness.app" "$HOME/Library/Application Support/myharness"
  cleanup_lima
  phase=complete; state_write
  say "result: removed"
  [ -z "$save_path" ] || say "Saved files stay at $save_path."
  say "Undo the prevent-sleep setting in System Settings if you turned it on."
  exit 0
}
