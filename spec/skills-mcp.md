# Skills & MCP

Classification: Core. Prerequisites: initialized [home](home.md), owner API and app; [engine contract](engine-contract.md).

## Purpose

Keep reusable skill instructions and MCP definitions in one inspectable place.
Skills & MCP is not an online package store or a grant of tool authority. Shared
file-editor operations belong to [config-editors](config-editors.md); [MCP](mcp.md) owns
server semantics and connections.

## Required behaviour

- **R1 — Page and files.** The Skills & MCP page reached through the [Tools](tools.md) menu
  has `Shared skills` and `MCP servers` regions. List files, including nested
  skill files, in sorted relative-path order within each root. Selecting a row
  opens that home-relative file in the shared editor. A root with no files shows
  `Empty.`; before selection show `Choose a file.`. Read through owner
  `GET /list/skills`, `/list/mcp` and `GET /files/<path>`; filesystem edits
  refresh the listing. No model call is required.
- **R2 — Creation.** The dialogs are the outward creation contract; no new
  owner API, header or response status is fixed here. `New shared skill` asks
  for Name and creates `skills/<name>/SKILL.md`. Assert these scaffold properties:
  YAML `name` equals the submitted name; YAML `description` is `Use when ...`;
  the Markdown body has only a level-one heading equal to that name and blank
  lines, with no other instructions. `New MCP server` asks for Name and creates
  `mcp/<name>.toml` containing comments only: explain that the person must set
  either a stdio command/args or an HTTP url, and that third-party commands must
  be pinned. There is no executable, runnable command, package runner or install
  action. Do not pretend that scaffold is a configured server.
  Successful creation selects the file. Existing target paths are refused
  with a visible error naming the path and exactly unchanged file bytes.
  Create-only must remain true for simultaneous submissions from independent
  dialogs, not a racy existence-check followed by unconditional replacement.
  Ordinary `PUT /files/<path>` editing keeps replacement semantics; a New
  action never overwrites an existing file. Cancel or empty Name makes no write. The lowercase/digit/
  hyphen name hint is not a promise of a stricter validator than shared file
  policy; the underlying create-only mechanism is an implementation choice.
- **R3 — Assignment and discovery.** A shared skill lives at
  `skills/<directory>/SKILL.md` and is available only to bots naming that
  directory in `skills`; bot-local skills under `bots/<id>/skills/` are included
  without a shared assignment. Support a direct SKILL.md or sorted immediate
  skill subdirectories. YAML string `name` overrides the directory fallback;
  description defaults empty when absent. Bot-local discovery precedes shared
  skills in configured order; first discovered skill of a given name wins.
  Duplicate names do not create two invocations. `GET /bots/<id>/skills` returns
  name, description and manual flag, including manual skills.
- **R4 — Automatic versus manual.** YAML `disable-model-invocation: true` marks
  a manual skill. The prompt lists only automatic skills with escaped name,
  description and absolute location in Pi's skills format; it does not preload
  their bodies. Preserve the native skills-prompt wording/format on both
  adapters. All resolved skills, including manual ones,
  can be invoked by a person's message starting `/skill:<name>`, optionally
  followed by a space and arguments. Expand to the trimmed body without front
  matter in a skill block naming its location and relative-path base, followed
  by the arguments. Pi handles this natively; Claude uses equivalent harness
  expansion. Unknown names remain ordinary text. A manual skill is omitted
  from discovery text, not an OS security boundary.
- **R5 — Editing and validation.** Use shared Save/Reload/conflict/file-boundary
  rules from [config-editors](config-editors.md), and attributed
  [instruction history](instruction-history.md). Skill YAML syntax and
  non-mapping front matter produce path-specific validation problems, including
  unused shared and bot-local skills. Preserve other native metadata fields;
  do not reject them as new harness settings. Repair the file to fix its prompt
  metadata; the last-good bot config is not a cached skill body. MCP validation
  does not prove the server can connect. Selecting a skill does not add an MCP
  server or built-in tool.

## Controls

The [Tools](tools.md) section owns the Skills & MCP entry; config-editors owns the
shared editor text surface, Save, Reload, file actions and conflict UI. No
Skills & MCP-specific delete, install, download or skill-run button is introduced.

| Role | Accessible name | Scope, action and observable state |
| --- | --- | --- |
| region | Shared skills | File list and its create control. |
| region | MCP servers | Definition list and its create control. |
| button | New shared skill | Opens dialog of the same name. |
| button | New MCP server | Opens dialog of the same name. |
| button | Open <relative-path> | Within its root region; selects the file, with pressed state when selected. Name uses path relative to that root, e.g. report/SKILL.md. |
| dialog | New shared skill | Creation prompt; contains Name, OK and Cancel. |
| dialog | New MCP server | Creation prompt; contains Name, OK and Cancel. |
| textbox | Name | Unique within the open creation dialog; file/directory name, not bot display name. |
| button | OK | In the open dialog; submits the name. |
| button | Cancel | In the open dialog; dismisses without writing; outside dismissal has the same result. |

## Edge cases

- **E1 — Existing name.** Both New actions refuse an existing path without
  changing its bytes; the error names that path. Open the existing row to edit
  it instead. Instruction history covers Skills & MCP skill/MCP files, but recovery
  history does not substitute for this create-only refusal. Test simultaneous
  same-name creations too: at most one creates the file, the other cannot
  replace it.
- **E2 — Invalid path or write failure.** Shared file policy remains authoritative
  for containment, protected paths and write errors. A failed write is not a
  created skill or a working server. A fresh comments-only MCP scaffold can
  pass offline validation (which checks references, not definition bodies), but
  is not usable until edited to supply its transport/command. An empty-looking
  listing is not proof of
  a successful API read; verification separately checks the list response and
  on-disk files before claiming an empty-state pass.
- **E3 — Missing or duplicate skill.** Missing shared references are validation
  problems; duplicate metadata names use R3 precedence. A skill omitted from
  the automatic prompt may still exist for manual invocation; do not silently
  reclassify it or rewrite its metadata.

| Id | Given | When | Expect |
| --- | --- | --- | --- |
| **T1 — Manual skill expands on either engine** | Assigned shared manual skill with valid YAML/body and equivalent Pi/Claude sessions | Read discovery/prompt and send /skill:<name> followed by arguments | GET /bots/<id>/skills includes manual skill; automatic skills prompt omits it. Both adapters give explicit invocation the same native skill-block body/location/relative-base plus arguments, no front matter, per R4 preserved native wording. Unknown name stays ordinary text; manual is not an OS security boundary (R3, R4, E3). |
| **T2 — Broken YAML names the file and repair is read** | Otherwise valid home with shared and bot-local SKILL.md front matter | Use an unquoted description containing colon-space, validate, quote the description and validate/read prompt again | Malformed YAML reports each relative skill path/useful reason, problem count/exit1, never false OK. Quoted valid scalar repairs metadata, exit0 and current prompt description, not stale cached body; validate unused shared skills too (R5; [home](home.md) R4). |
