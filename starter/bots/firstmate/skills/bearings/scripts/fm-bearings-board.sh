#!/usr/bin/env bash
# fm-bearings-board.sh - the /bearings lavish board: Kun Chen's board-template.html (vendored
# unchanged, MIT, see the home-root NOTICE.md) filled with one fm-bearings-board.v1 JSON payload.
# Read-only: no writes to factory.db, no verdicts.
#
# Usage: fm-bearings-board.sh [--since <N>h|<N>d]   (passed to fm-bearings.sh; default 24h)
# Writes the board to $OUT (git-ignored, overwritten each run) and prints that path.
# Open it with: LAVISH_AXI_TELEMETRY=0 npx -y lavish-axi@0.1.96 <path>
#
# Sections and their order come from fm-bearings.sh (one bucketing rule for chat and board);
# titles, prompts, gates, results and repos are read from factory.db. Payload mapping:
#   captains_call  {key:id, type:kind, title, repo, about:id[ · re <gate_ref>], options:[],
#                   decide: decision row -> its prompt verbatim; captain-gated task -> its gate_ref}
#                  options stay [] (they exist only as free text in prompt), so the card shows
#                  the prompt and its "Queue answer" button does nothing.
#   underway       {id, name:title, state:"working", doing:"age <age> · <last crew message>", kind, repo}
#   landed         {id, what:title, owner:status, filed:ISO, repo, pr_url: first github.com/.../pull/N in result or null}
#   charted        {id, title, filed:ISO, repo, dispatchable:false, reason: "" or "<status> · gate <kind> <ref>"}
# repo: tasks.repo, else the first non-path entry of the project's repos, as owner/name; null
# when unknown, and the template then shows the task id instead.
# Needs factory-db and jq on PATH; fm-bearings.sh and fm-crew-state.sh beside this script.
set -euo pipefail
dir=$(cd "$(dirname "$0")" && pwd)
OUT=${MYHARNESS_HOME:-$HOME/.myharness}/tasks/board/bearings.html
since=24h
[ "${1:-}" = --since ] && since=${2:-}
digest=$("$dir/fm-bearings.sh" --since "$since")
mkdir -p "$(dirname "$OUT")"

# digest -> TSV: section, id, age, last (age/last only on open-task rows)
rows=$(awk '
  /^[^ ]/ { sec = /^Captain/ ? "call" : /^Underway/ ? "underway" : /^Landed/ ? "landed" : "charted"; next }
  $0 == "  none" { next }
  { line = substr($0, 3); p = index(line, " | q \""); if (p) line = substr(line, 1, p - 1)
    n = split(line, f, / [|] /); age = f[5]; sub(/^age /, "", age); last = f[6]
    for (i = 7; i <= n; i++) last = last " | " f[i]
    print sec "\t" f[1] "\t" (sec == "landed" ? "" : age) "\t" (sec == "landed" ? "" : last) }' <<<"$digest")

# only the tasks the digest shows, so the query stays the size of the board, not of history
ids=$(cut -f2 <<<"$rows" | sed "/^\$/d; s/'/''/g; s/.*/'&'/" | paste -sd, -)
tasks=$(factory-db -json "SELECT id, kind, title, prompt, status, gate_kind, gate_ref, result, repo, project_id,
  IFNULL(updated_at, created_at) AS ts FROM tasks WHERE id IN (${ids:-''});")
projects="[]"  # no projects table in the seed; repo comes from tasks.repo

# data goes to jq and awk on stdin: one argv or env string over 128 KB fails exec with exit 126
payload=$({ jq -Rs . <<<"$rows"; echo "${tasks:-[]}"; echo "${projects:-[]}"; } |
 jq -cn 'input as $rows | input as $tasks | input as $projects |
  def slug: sub("^https?://github\\.com/"; "") | sub("\\.git$"; "") | sub("^.*/(?<a>[^/]+/[^/]+)$"; "\(.a)");
  def nz: if . == null or . == "" then null else . end;
  ($tasks | map({key: .id, value: .}) | from_entries) as $T
  | ($projects | map({key: .id, value: ((.repos | try fromjson catch []) | map(select(startswith("/") | not)) | first)})
     | from_entries) as $P
  | [$rows | split("\n")[] | select(length > 0) | split("\t") | {sec: .[0], id: .[1], age: .[2], last: .[3]}
     | . + {t: $T[.id]} | select(.t != null)] as $R
  | def repo: (.t.repo | nz | if . == null then null elif startswith("/") then split("/") | last else slug end)
              // ($P[.t.project_id // ""] | nz | if . then slug else . end);
    def iso: .t.ts | if type == "number" then todate else null end;
    def gate: "gate \(.t.gate_kind // "-") \(.t.gate_ref | nz // "-")";
    def lastmsg: .last | (capture("^last (?<d>\\S+) (?<hm>\\d\\d:\\d\\d):\\d\\d (?<who>\\S+ -> \\S+)")
                          | "last \(.d) \(.hm) \(.who)") // .;
  { schema: "fm-bearings-board.v1", home: "factory", generated: (now | todate), prs_live: false,
    captains_call: [$R[] | select(.sec == "call") | {key: .id, type: .t.kind, title: .t.title, repo: repo,
      about: (.id + (if .t.kind == "decision" and (.t.gate_ref | nz) then " · re \(.t.gate_ref)" else "" end)),
      decide: (if .t.kind == "decision" then .t.prompt else .t.gate_ref | nz // "gate captain, no condition recorded" end),
      options: []}],
    underway: [$R[] | select(.sec == "underway") | {id, name: .t.title, state: "working",
      doing: "age \(.age) · \(lastmsg)", kind: .t.kind, repo: repo}],
    landed: [$R[] | select(.sec == "landed") | {id, what: .t.title, owner: .t.status, filed: iso, repo: repo,
      pr_url: ((.t.result // "") | [match("https://github\\.com/[^/\\s]+/[^/\\s]+/pull/[0-9]+").string] | first)}],
    charted: [$R[] | select(.sec == "charted") | {id, title: .t.title, filed: iso, repo: repo, dispatchable: false,
      reason: (if .t.status == "queued" and (.t.gate_kind | nz) == null then "" else "\(.t.status) · \(gate)" end)}] }' |
  sed 's/</\\u003c/g')   # no "</script>" can end the data block; JSON reads \u003c back as "<"

printf '%s\n' "$payload" | awk 'NR == FNR { data = $0; next }
  $0 == "__FM_BEARINGS_BOARD_DATA__" { print data; next } { print }' - "$dir/board-template.html" >"$OUT.tmp"
mv "$OUT.tmp" "$OUT"
echo "$OUT"
