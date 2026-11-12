#!/usr/bin/env bash
# fm-crew-state.sh - facts about every open factory task, one line each. Read-only.
# Scripts own the mechanics, agents own the judgment: no verdicts, no thresholds, no writes.
#
# Usage: fm-crew-state.sh            every task with status queued, underway or blocked
#        fm-crew-state.sh <task-id>  that one task, whatever its status
#
# Line format (stable; fm-bearings.sh parses it). Fields are separated by " | ":
#   <id> | <kind> | <status> | gate <gate_kind|-> <gate_ref|-> | age <age> | <last>
#   <age>  time since updated_at (created_at if unset), as 12m, 5h3m or 4d2h
#   <last> "last <YYYY-MM-DD HH:MM:SS> <from> -> <to> \"<session title>\"", or "no crew traffic"
# <last> is the newest message in the task's own thread: a session whose title is the id,
# or starts with the id plus a space or colon (hand-offs use new_session titled with the id).
# Messages that merely mention the id elsewhere (digests, reports) are ignored.
# Searched with `myharness activity --grep <id>` from the row's created_at date.
# Needs factory-db and myharness. created_at/updated_at are unix seconds.
set -euo pipefail
where="status IN ('queued','underway','blocked')"
if [ $# -ge 1 ]; then
  [[ $1 =~ ^[A-Za-z0-9._-]+$ ]] || { echo "fm-crew-state.sh: bad task id: $1" >&2; exit 2; }
  where="id = '$1'"
  [ -n "$(factory-db "SELECT 1 FROM tasks WHERE $where")" ] || { echo "fm-crew-state.sh: no task $1" >&2; exit 1; }
fi

factory-db -separator $'\t' "
  SELECT id, kind, status, IFNULL(NULLIF(gate_kind,''),'-'), IFNULL(NULLIF(gate_ref,''),'-'),
    strftime('%s','now') - IFNULL(updated_at, created_at), date(created_at,'unixepoch','localtime')
  FROM tasks WHERE $where ORDER BY status, IFNULL(updated_at, created_at);" |
while IFS=$'\t' read -r id kind status gk gr age since; do
  d=$((age/86400)) h=$((age%86400/3600)) m=$((age%3600/60))
  if [ "$d" -gt 0 ]; then a="${d}d${h}h"; elif [ "$h" -gt 0 ]; then a="${h}h${m}m"; else a="${m}m"; fi
  last=$(myharness activity --grep "$id" --since "$since" --limit 100000 | awk -v id="$id" '
    /^-- [0-9]{4}-/ { day = $2 }
    /^[0-9][0-9]:[0-9][0-9]:[0-9][0-9]  / { n++; t[n] = day " " $1; ft[n] = $2 " -> " $5; s1[n] = $3; s2[n] = $6 }
    /^    [0-9a-f]+  "/ { title = $0; sub(/^ +[0-9a-f]+  "/, "", title); sub(/"  [0-9]+ msgs?$/, "", title)
      if (title == id || index(title, id " ") == 1 || index(title, id ":") == 1) own[$1] = title }
    END { for (i = n; i > 0; i--) { s = (s1[i] in own) ? s1[i] : (s2[i] in own) ? s2[i] : ""
            if (s != "") { printf "last %s %s \"%s\"\n", t[i], ft[i], own[s]; exit } }
          print "no crew traffic" }')
  echo "$id | $kind | $status | gate $gk $gr | age $a | $last"
done
