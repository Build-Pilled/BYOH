# VM backup

Classification: Choice (VM backup). Prerequisites: a host reached by an SSH name ([host](host.md) and [isolation](isolation.md)), [home](home.md), [tasks](tasks.md), [session tidy](session-tidy.md).

## Purpose

Keep a copy of the harness home somewhere the host cannot reach, so that losing,
deleting or rebuilding the host does not lose the person's conversations,
configuration and tasks. It is off unless the person asks for it. A
job on the Mac pulls the home over the host's SSH
name, scans what it is about to publish for tokens, pushes to the person's own
private repository with a key only the Mac holds, and keeps snapshots on the Mac.
The host never holds write access to the backup, so a misled bot cannot destroy
it. This section owns that job, its stop conditions and the restore. The
[host](host.md) owns the SSH name and the account behind it (R3: the job uses
the bot name) and the job that produces the task-database copy of R7 (R7).

## Required behaviour

- **R1 — The choice, and what an unticked choice means.** The choice is unticked
  by default, so nothing backup-related is installed on the Mac unless the person
  asks. "Go with the default" is offered and means no backup. The
  interview asks one question, "Back up your harness to a private repository and
  to snapshots on this Mac?", default no, and only if the person says yes asks
  for the repository, the snapshot folder and an optional external volume (R3, R10). Because the default leaves the person
  with no backup, the interview and the VM recipe say plainly, in the
  places listed in R2, that deleting the VM deletes the harness data. The README
  carries that one-line warning and a link to this section, not the full disclosure.
  The answer is recorded in the interview record that
  [onboarding](onboarding.md) owns. The same choice applies to an own-machine host.
- **R2 — Where the warning is required.** Wherever the interview or the VM recipe
  offers or mentions deleting or rebuilding the VM, or asks the backup
  question, the disk-layout question (the separate data disk) or the
  one-disk default, it states that with one disk and no backup the deletion removes
  every conversation, bot configuration, archive and task, and that a separate data
  disk is not a backup, since it still sits on the same Mac. [Session
  tidy](session-tidy.md) E2 already says the same where it touches it.
- **R3 — What a ticked choice adds, and nothing else.** With backup chosen, the Mac
  also carries this job, its configuration, the push key, a scheduled launch for
  it, a bare mirror of the host's history, a state folder, a log and the snapshot
  folder. The setup shows each of these to the person before it is made and
  creates it only where nothing exists: an existing key, configuration or launch
  file is left untouched, and the setup stops and asks. Switching backup off
  removes only the scheduled launch; the mirror, snapshots and the repository stay
  until the person deletes them, and nothing is deleted automatically.
- **R4 — The host is only a source.** The job reads the host with read-only
  commands (a Git pack upload and the sending side of rsync) over the host's SSH
  name, never executes anything it fetched, and never writes to the host. The host
  is given no credential for the backup repository, no copy of the Mac's key and
  no write access to the mirror or the snapshots. The push key lives only on the
  Mac, is a key for that one repository, is named explicitly on the push command
  with no SSH host alias, and is never opened or read by the job. The account and
  key behind the SSH name are the bot name's ([host](host.md) R3); the job's read-only
  property comes from the commands it runs, not from that key (R12).
- **R5 — Schedule and runs.** The job runs when the scheduled launch loads and then
  every 600 seconds. One run at a time: a run that finds another running exits
  quietly, and a lock older than 30 minutes is taken over and is released only by
  the run that owns it. A run needs Git, rsync, SQLite and Perl on the Mac; a
  missing one stops the run with a logged error before anything is changed. Exit
  status is 0 for success (also when there was nothing to do), 1 for an error, 2
  for a blocked token scan and 3 for diverged history; the worst status wins. A
  run that cannot reach the host fails with 1 and changes nothing already kept.
- **R6 — History: pull, compare, push.** The job fetches the host home's Git
  history into a bare mirror on the Mac with object checking on, and runs a Git
  integrity check of the mirror on every run. The mirror's copy only moves
  forward: if the host history is not a fast-forward of it (rewritten or reset),
  the run reports **diverged**, pushes nothing and keeps the mirror's tip. A tag
  per day pins that day's tip, so a later rewrite cannot make earlier objects
  unreachable. Before pushing, the job also compares with the repository: if the
  repository holds commits the mirror lacks, the run reports diverged, never
  forces and refuses again on every run until a person reconciles. The push is a
  fast-forward only, to a named branch of the person's private repository, using
  the Mac-only key.
- **R7 — The task database.** `tasks/factory.db` is outside the Git history ([home](home.md)
  R6), so the host provides, for the job to pull, a consistent, verified copy of
  it: made with the database's own online copy and not a raw file copy, checked
  for integrity before it takes its final name, visible under its final name only
  when complete, made at least nightly, the newest 14 kept, in a folder outside
  the Git-tracked home, and absent when the home has no `factory.db`. [Host](host.md) R7
  installs and schedules it, and a bot must not be able to edit what produces it. On the Mac the job takes the newest copy with the
  snapshot and runs an integrity check on it. A missing or failing newest copy is
  an error: the run exits 1, no database stamp or task dump is made from it, and
  the rest of the snapshot is still kept. From a verified copy the job dumps the task rows as SQL
  text, commits it on a chain of its own in the mirror (a commit only when the text
  changed), and pushes it to a second branch, `task-dump`, of the same repository
  under the same rules as R6 and R8. A mirror that is rebuilt adopts the
  repository's existing `task-dump` chain instead of starting another.
- **R8 — The token scan.** The job scans the lines added by the commits it is
  about to push, merges included, before every push of either branch, and on the
  first push it scans the whole history. It treats every added line after a hunk
  header as content, so a file line that starts `++ b/` cannot pass for a diff
  header. A hit stops that push, writes the **token-blocked** flag and exits 2;
  the log and the flag name the short commit and the file and never print the
  line. The block holds back only the branch it was found on, so a token in a
  task row stops the dump while history keeps flowing. A scan that did not run, or
  failed, stops the push as a hit does; it is never read as "no hits". The scan
  does not rewrite history and is not skippable by configuration. It matches
  these shapes (a `sk-` key with an optional `ant-` or `proj-` and at least 20
  further characters; `ghp_`, `gho_`, `ghu_`, `ghs_`, `ghr_` with at least 30;
  `github_pat_` with at least 20; `xoxa-`, `xoxb-`, `xoxp-`, `xoxr-`, `xoxs-` with
  at least 10; `AKIA` or `ASIA` and 16 capitals or digits as a whole word; `AIza`
  with 35; `Bearer` and at least 20 token characters; a private-key header). It
  is a check on shapes, not proof that no secret is in the data.
- **R9 — Snapshots.** When the newest snapshot is older than 55 minutes, the job takes
  a new one on the Mac with rsync, the Mac always the receiver, copying symbolic links as links and never
  following them, with unchanged files hard-linked to the previous snapshot so it
  costs only what changed. The items
  are, by default: the home's files; the selected engine's native transcripts that
  live outside the home (for Claude Code the `projects/` trees of its config
  directory, per [engine Claude Code](engine-claude-code.md) R6); and the task
  database copies. Each item has a name, a path under the host's home directory,
  a required flag and exclusions. The job always excludes the live `tasks/factory.db` with its journal files (the
  database travels only as the verified copies of R7), the credentials (the
  `secrets/` folder with the owner token, Pi's login file, every engine login or
  token file), session scratch (`work/`), `log/`, and the `.git/` folder, whose history travels by R6. A
  required item that fails, or an rsync error other than "some files vanished",
  discards the whole snapshot and exits 1; a failing optional item is logged and
  skipped. The snapshot is built under a hidden name and renamed when complete, so a
  half-built one never appears as a snapshot, and a snapshot name that already
  exists is never reused or replaced. The first snapshot of each local day
  is also kept as a daily one. After a new snapshot completes, the job keeps the
  newest 24 hourly and 30 daily snapshots and removes the rest.
- **R10 — Where snapshots go.** The snapshot folder is on the Mac, chosen in the
  interview; the default is a folder in the person's home. If the person places it
  on an external volume, that volume is recorded, and the job takes a snapshot only
  while the volume is a real mount (its device differs from its parent's). If not,
  it logs the error, exits 1, leaves the last-snapshot stamp unchanged and creates
  nothing under the missing volume's path; the history half runs as usual.
- **R11 — Stamps.** The job keeps a state folder of files that hold one line each,
  written atomically: `last-success` (a whole run succeeded), `last-pull` (the
  mirror was updated and checked), `last-snapshot`, `last-sqlite-copy` (the
  creation time of the newest verified database copy, from its name) and
  `last-run-exit` (the exit status and the time of the latest run). Times are
  epoch seconds. `DIVERGED` and `TOKEN-BLOCKED` exist only while the condition
  holds for any branch, and hold the reason. Nothing in the app shows these in
  release one; the interview tells the person how to ask
  their agent to read them and the log.
- **R12 — What the person is told, in proportion.** The interview states, for
  backup: that the repository must be private, because the
  history holds bot instructions and notes and the dump holds task text; that
  snapshots hold full conversations in clear on the Mac and are not scanned; that
  the scan checks token shapes only; that the key which lets the job read the host
  may allow more than the job does; that a misled bot can still damage what is
  pulled next (delete files or rewrite history), which the divergence check, the
  daily tags and the rolling snapshots limit but do not remove, since the snapshots
  keep only the last 24 hours and 30 days; that backup runs only while the Mac is
  awake and the host is up; and that credentials are never backed up (R14).
- **R13 — The restore.** The restore recreates the home from the mirror (or a fresh
  clone of the private repository) and the newest snapshot, or a snapshot the
  person names, in one new place, where each snapshot item returns to its recorded path
  below the target, so the target looks like the host's home directory; the history
  is checked out into the harness home, and the newest verified database copy is
  installed there as `tasks/factory.db`. The target must be missing or empty after
  resolving links; it must not be the app's profile folder or any folder the job
  itself uses. Otherwise the restore refuses before it writes and leaves every byte
  as it was. Nothing is overwritten, merged or removed. After restoring, it checks
  the restored history with Git's integrity check, the restored database with an
  integrity check, and that the task dump equals the restored database. With a
  read-only copy of the source it also compares the history and every snapshot
  item and prints the first difference. It exits 0 only when all of these hold.
- **R14 — Putting it back on a host.** The restore does not install anything on a
  host. Moving a restored home onto a rebuilt or new host is a step the person's
  agent does with the person's word, only into a home that does not exist or is
  empty. If a home already exists there, the agent stops and asks; it moves an
  existing home aside under a new name only on the person's word and never deletes
  it. Credentials are not in any backup: the owner token and the engine logins are
  issued again after a restore, and the restore says so. The agent then runs
  `myharness validate` before starting the daemon.
- **R15 — A rehearsal.** After the first successful run, the setup runs the restore
  once into a scratch folder, compares it with a read-only copy of the host, and
  shows the person the result before it calls the backup working.

## Controls

Not applicable; this section has no UI controls and nothing in the app. The job
runs on the Mac outside the app, and release one adds no backup page or notice.

## Edge cases

- **E1 — Not chosen.** The Mac carries no job, key, mirror, state or snapshots. The
  warnings of R2 are present, and deleting the one-disk VM deletes the harness data.
- **E2 — Host down.** A run fails with 1, writes the log, leaves the mirror and
  snapshots as they were, and lets the stamps age; the next run tries again. A VM
  that is down because the Mac was asleep or shut down is an expected cause.
- **E3 — Rewritten host history.** The run reports diverged, pushes nothing and
  keeps the mirror's tip, and reports it again on every run. To reconcile, any
  exposed credential is revoked first and the host history is corrected there; then,
  on the person's word, the rejected tip is pinned under a tag in the mirror and
  the mirror's host ref is moved to the new tip, and the next run pushes.
- **E4 — Repository ahead.** The repository has commits the mirror lacks. The run
  reports diverged, never forces, and a person finds where they came from and decides.
- **E5 — Token in a task row.** Only the dump is held back (token-blocked names
  `task-dump`); history keeps flowing. The blocked dump commit was never pushed and
  is dropped, so after the row is fixed and revoked, the next copy and snapshot make
  a clean dump and the flag clears without a Git step.
- **E6 — Token in history.** The commit is in the host history and so in the mirror,
  and it never reached the repository. Revoke first; removing it on the host later
  makes the mirror call the rewrite diverged, which is the check working.
- **E7 — Unmounted volume, full disk.** A snapshot that cannot be built is discarded
  whole and exits 1; earlier snapshots are not pruned by a failed run.
- **E8 — Files vanish.** Sessions change while rsync runs; files that disappear
  mid-copy are normal and do not fail the snapshot.
- **E9 — Occupied or linked restore target.** A non-empty folder, a folder that is
  a link to the app's profile, or the mirror itself is refused unchanged. The check
  follows links, not the path text alone, so a link cannot slip past it.
- **E10 — A lost mirror.** The next run rebuilds the mirror from the host and adopts
  the repository's `task-dump` chain; snapshots are unaffected.
- **E11 — Own-machine host.** The same job and rules apply over that host's SSH name;
  the copy of R7 is the host's to provide, and the Linux-specific parts of
  the host are the user's agent's to adapt.

| Id | Given | When | Expect |
| --- | --- | --- | --- |
| **T1 — Read-only source, clean push and snapshot** | Backup selected, owned source home/verified task copy, private-repository stand-in and Mac snapshot state | Run clean, repeat without changes, then change tracked instructions/task rows and age snapshot eligibility | Read source only/no fetched-code execution or host backup key/write access. Integrity-check mirror and fast-forward push; dump commit only when SQL changes. Snapshot excludes live DB/journals, credentials, scratch/log/Git, includes selected native transcripts and verified copies, links unchanged files, retains24hourly/30daily. Atomically maintain accurate R11 stamps/flags, no new app status (R4–R9, R11). |
| **T2 — Fail-closed publication scan** | Unpushed added lines/merge history with synthetic token shapes or a scan process that cannot complete | Attempt initial/incremental push, repeat and repair the owned fixture | Scan all to-be-pushed added content including ++ b/ lines/merges, whole history on first push. Hit holds only affected branch with token-blocked2/file+short-commit but no line/token text. Failed/missing scan also prevents push and is never no-hits; never rewrite or bypass scan. Unaffected history/dump can flow, worst status wins (R5, R6, R8, R11, E3, E5, E6). |
| **T3 — Task dump self-heals within its rule** | Verified snapshot DB copy, token-blocked unpublished dump and an otherwise valid history branch | Repeat block, fix/revoke dummy row and take new verified copy/snapshot | Hold only dump while history flows; do not advance whole-run success falsely. Drop the unpublished token-blocked dump so the next clean SQL can push/clear flag without a Git repair, no extra commit for unchanged SQL. Rebuilt mirror adopts existing task-dump chain; bad/missing newest verified copy creates no DB stamp/dump but keeps other snapshot (R7, R8, R11, E5, E10). |
| **T4 — Diverged history stays refused until the person reconciles** | Host rewrite/reset or repository commits absent from mirror, including task-dump branch | Run repeatedly and inspect both sides | Refuse with exit 3/no force; retain mirror tip on a host rewrite and remote commits when the repository is ahead, preserve daily pins; neither retry nor a token fix overrides the diverged state. Reconcile only with person/revocation/pinning rules, not automatic destructive reset (R5, R6, E3, E4). |
| **T5 — Missing volume never becomes a snapshot directory** | Snapshot path under recorded external volume that is missing/unmounted or a snapshot write fails | Run a due snapshot while history can advance | Verify real mount by device relationship. Without it create nothing under that path, leave snapshot stamp aging, log/error1 while history flows. Failed/incomplete snapshot is discarded whole without pruning prior snapshots; only successful new snapshot triggers retention (R9, R10, R11, E7). |
| **T6 — Restore proves a new place, not live replacement** | Mirror/repository and chosen verified snapshot, target missing/empty after canonical resolution or occupied/protected | Run scratch restore/rehearsal and compare with a read-only source copy | Restore only allowed new place; refuse occupied/linked app-profile/job paths unchanged before writes. Recreate recorded item paths, checkout/integrity-check history, restore verified DB/integrity and equal task dump. Compare every item/source and report first difference; exit0 only all hold. Rehearsal required before calling backup working, no automatic host install/credential restoration (R13–R15, E9). |
| **T7 — Verified nightly DB copies publish atomically** | Host has a task DB or none; old copies including more than14 | Produce scheduled online DB copy, or fail copy/integrity check | Use DB online copy, integrity-check before final rename outside Git-tracked home, keep newest14 at least nightly and no incomplete final copy. Corrupt input fails without publishing an unverified copy or losing the newest14 existing verified copies; absent task DB yields no copy. Producer is not bot-editable (R7; [host](host.md) R7). |
