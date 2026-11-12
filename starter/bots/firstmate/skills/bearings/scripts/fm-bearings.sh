#!/usr/bin/env bash
# fm-bearings.sh - the /bearings digest: four sections of factory facts. Read-only.
# Scripts own the mechanics, agents own the judgment: no verdicts, no thresholds, no writes.
#
# Usage: fm-bearings.sh [--since <N>h|<N>d]   (Landed window; default 24h)
#
# Output format (stable; a later view may parse it). Four sections in this order, each a
# header line followed by rows indented two spaces, or by "  none":
#   Captain's Call       blocked decision rows, and open tasks with gate_kind captain
#   Underway             other open tasks with status underway
#   Landed (last <N>h|d) done or cancelled tasks updated within the window, newest first
#   Charted Next         other open tasks (status queued, or blocked without a captain gate)
# Each open task appears once, in the first section that matches.
# Open-task rows are fm-crew-state.sh lines verbatim (format in its header); a decision
# row appends:  | q "<title>"
# Landed rows:  <id> | <kind> | <status> | <YYYY-MM-DD HH:MM> | <result>
#   <result> is the full result, newlines as spaces, or "-" if empty.
#   A timestamp that is not valid unix seconds prints as "raw <value>".
# Needs factory-db on PATH and fm-crew-state.sh beside this script.
set -euo pipefail
since=24h
[ "${1:-}" = --since ] && since=${2:-}
[[ $since =~ ^([0-9]+)([hd])$ ]] || { echo "usage: fm-bearings.sh [--since <N>h|<N>d]" >&2; exit 2; }
if [ "${BASH_REMATCH[2]}" = h ]; then secs=$((BASH_REMATCH[1] * 3600)); else secs=$((BASH_REMATCH[1] * 86400)); fi

state=$("$(dirname "$0")/fm-crew-state.sh")
export TITLES=$(factory-db -separator $'\t' \
  "SELECT id, replace(title, char(10), ' ') FROM tasks WHERE kind = 'decision' AND status = 'blocked';")
pick() { awk -v want="$1" '
  BEGIN { n = split(ENVIRON["TITLES"], L, "\n")
          for (i = 1; i <= n; i++) { p = index(L[i], "\t"); q[substr(L[i], 1, p - 1)] = substr(L[i], p + 1) } }
  NF { split($0, f, " [|] ")
       b = (f[1] in q || f[4] ~ /^gate captain /) ? "call" : f[3] == "underway" ? "underway" : "next"
       if (b == want) print (f[1] in q) ? $0 " | q \"" q[f[1]] "\"" : $0 }' <<<"$state"; }
landed=$(factory-db -separator ' | ' "
  SELECT id, kind, status, IFNULL(strftime('%Y-%m-%d %H:%M', IFNULL(updated_at, created_at), 'unixepoch', 'localtime'),
      'raw ' || IFNULL(updated_at, created_at)),
    IFNULL(NULLIF(replace(replace(result, char(13), ' '), char(10), ' '), ''), '-')
  FROM tasks WHERE status IN ('done', 'cancelled')
    AND IFNULL(updated_at, created_at) >= strftime('%s', 'now') - $secs
  ORDER BY IFNULL(updated_at, created_at) DESC;")

section() { echo "$1"; if [ -n "$2" ]; then sed 's/^/  /' <<<"$2"; else echo "  none"; fi; }
section "Captain's Call" "$(pick call)"
section "Underway" "$(pick underway)"
section "Landed (last $since)" "$landed"
section "Charted Next" "$(pick next)"
