---
name: project-management
description: Use at factory intake, whenever work is handed to a crewmate or a merge is relayed or reported, and whenever a decision is put to the captain or answered by the captain.
---
# Project management

A local sqlite database is the factory backlog. Chat is not the source of truth.

## Database path

`~/.myharness/tasks/factory.db`

Create the parent directory if needed. Same path every time. Do not invent a second database.
Scout reports live beside it in `~/.myharness/tasks/reports/`, one file per task id. Run every later query through `factory-db "<SQL>"` (the executable `bin/factory-db` under the selected harness home, on bot PATH); it never creates the file.

## Schema

```sql
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  prompt TEXT NOT NULL,
  project_id TEXT,
  repo TEXT,
  branch TEXT,
  status TEXT NOT NULL,
  gate_kind TEXT,
  gate_ref TEXT,
  result TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER
);

CREATE TRIGGER IF NOT EXISTS tasks_ts_insert BEFORE INSERT ON tasks
WHEN NOT (NEW.created_at GLOB '[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]')
  OR (NEW.updated_at IS NOT NULL AND NOT (NEW.updated_at GLOB '[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]'))
BEGIN SELECT RAISE(ABORT, 'created_at/updated_at must be unix seconds: strftime(''%s'',''now'')'); END;

CREATE TRIGGER IF NOT EXISTS tasks_ts_update BEFORE UPDATE ON tasks
WHEN NOT (NEW.created_at GLOB '[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]')
  OR (NEW.updated_at IS NOT NULL AND NOT (NEW.updated_at GLOB '[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]'))
BEGIN SELECT RAISE(ABORT, 'created_at/updated_at must be unix seconds: strftime(''%s'',''now'')'); END;

CREATE TRIGGER IF NOT EXISTS tasks_gate_insert BEFORE INSERT ON tasks
WHEN NEW.gate_kind IS NOT NULL AND NEW.gate_kind NOT IN ('after-task','at-time','captain')
BEGIN SELECT RAISE(ABORT, 'gate_kind must be NULL, after-task, at-time or captain; review evidence belongs in result'); END;

CREATE TRIGGER IF NOT EXISTS tasks_gate_update BEFORE UPDATE ON tasks
WHEN NEW.gate_kind IS NOT NULL AND NEW.gate_kind NOT IN ('after-task','at-time','captain')
BEGIN SELECT RAISE(ABORT, 'gate_kind must be NULL, after-task, at-time or captain; review evidence belongs in result'); END;

CREATE TRIGGER IF NOT EXISTS tasks_status_insert BEFORE INSERT ON tasks
WHEN NEW.status NOT IN ('queued','underway','blocked','done','cancelled')
BEGIN SELECT RAISE(ABORT, 'status must be queued, underway, blocked, done or cancelled; phase detail (review, smoke) belongs in result'); END;

CREATE TRIGGER IF NOT EXISTS tasks_status_update BEFORE UPDATE ON tasks
WHEN NEW.status NOT IN ('queued','underway','blocked','done','cancelled')
BEGIN SELECT RAISE(ABORT, 'status must be queued, underway, blocked, done or cancelled; phase detail (review, smoke) belongs in result'); END;
```

`tasks.kind` is `scout`, `ship`, or `decision`.
`tasks.status` is `queued`, `underway`, `blocked`, `done`, or `cancelled`.
`tasks.result` is the outcome pointer: scout report path, ship PR URL, or the captain's answer on a decision row.
`created_at` and `updated_at` are unix seconds: `strftime('%s','now')`.
`gate_kind` is optional: `after-task`, `at-time`, or `captain`. On a scout or ship row, `captain` means the next step (e.g. merge) waits on the captain's word. Decision rows leave `gate_kind` NULL. A gate is what the task waits on (another task, a time, the captain), never the kind of work; review evidence goes in result. Unset means NULL, never ''.

The schema is deliberately minimal: enough to route work and find its results. Do not add tables speculatively.

## Setup

If `factory.db` does not exist, create it with `sqlite3 ~/.myharness/tasks/factory.db` and run the schema. If it exists, do not migrate inventively. Report the path to Firstmate.

## Intake

Firstmate writes a task row before handing work off. Reuse the task id in the crewmate message. A good `prompt` states the goal, acceptance criteria, and constraints - enough to act on without coming back for basics.

If a crewmate's charter already covers the repo, reuse that crewmate. Otherwise task bot-maker to sign one on from its crewmate template.

Non-software work uses `project_id='default'`.

## Promotion

When the captain authorizes implementation after a scout, do not open a duplicate task: flip the same row's kind to ship and hand it back to the crewmate with the scout report as context. The ship flow then applies unchanged.

## Captain decisions

An open decision lives in a row, not in chat. When you put a decision to the captain, insert its row in the same turn: a new task id, `kind='decision'`, `status='blocked'`, `title` = the question, `prompt` = context + numbered options + recommendation, `gate_ref` = the related task id if any.

The row closes only when the captain's answer is written into it: `result` = the captain's words (or `declined` / `skipped` plus the assumption you made), `status='done'`. A superseded decision gets `status='cancelled'` and the reason in `result`. A session ending, or a later unrelated message, closes nothing. Set `updated_at` on every change.

## Updates

The crewmate updates `status`, `branch`, `result`, and `updated_at` as it goes. Done means `result` holds the pointer: scout report path, or ship PR URL.

## Do not

- Do not keep the backlog only in chat
- Do not create one Firstmate per project
- Do not assume GitHub when recording `source_control`
