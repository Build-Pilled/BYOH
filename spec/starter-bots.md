# Starter bots

Classification: Core. Prerequisites: [bots](bots.md), [teams](teams.md), selected engine/account; [onboarding](onboarding.md).

## Purpose

Provide a small working crew instead of an empty bot list. These roles are bot
instructions, not daemon privileges or a new task service. Keep starter context
small; do not turn the plain bot into another project worker.

## Required behaviour

- **R1 — Core crew.** The starter set contains Firstmate, Bot Maker and Code
  Reviewer in a led crew, with Firstmate as lead, plus a plain general-purpose
  bot, at the addresses and wiring in this single table. The ids are the
  release-one contract; scenarios read this table rather than
  repeating address literals. These roles are core, not interview toggles. The
  three crew bots ship seeded from [`starter/`](../starter/), whose paths mirror
  the harness home. Firstmate has its charter, MEMORY.md and the skills ahoy,
  bearings (including its board page and scripts), lavish, project-management
  and onboarding-resume. Bot Maker has its
  charter, design-bot skill (including crew-context.md and crewmate-template.md),
  crew-healthcheck skill and weekly crew-healthcheck routine. Code Reviewer has
  its charter. The shared myharness-config skill is assigned to Firstmate and
  Bot Maker. Each bot has a bot.toml with no model id; teams/crew.toml wires the
  crew. These are working, neutral skeletons, with nothing personal.

  | Role | Fixed bot id | Team id | Membership |
  | --- | --- | --- | --- |
  | Firstmate | `firstmate` | `crew` | Lead |
  | Bot Maker | `bot-maker` | `crew` | Member |
  | Code Reviewer | `code-reviewer` | `crew` | Member |
  | Plain bot | `plain` | none | Unteamed, no default bridges |

  The person names the plain bot in the interview, and
  [onboarding](onboarding.md) R6 records that display name in its `bot.toml`
  `name`; on the all-defaults path the name is `plain`. Its address is
  `plain` whatever the answer. The plain bot is for quick questions and
  web search, with almost no background context and no task-management remit.
  Its system prompt is completely blank: its `SYSTEM.md` is empty and
  no starter text is written into it; the engine contract's own framing still
  applies.
- **R2 — Responsibilities.** Firstmate is the person's coordination point:
  hand work to an appropriate existing bot, keep task ids and replies associated
  with their threads, surface decisions/blockers to the person, and relay
  results. Firstmate records the tasks it hands off, and the decisions it puts to
  the person, as rows of the task table that the [Tasks view](tasks.md) reads,
  through its seeded project-management skill, which creates the file and the
  table on first use; the daemon only reads the table, apart from that view's narrow
  edits. The table's 13-column contract is owned by [tasks](tasks.md) and shared
  by the skill and the view. Bot Maker creates/maintains bot instructions and configuration on
  request, checking for an existing matching remit rather than duplicating it.
  Code Reviewer reviews a supplied change against its brief and reports concrete
  findings; it does not become the implementer. Role descriptions, instructions
  and necessary configuration skills make those boundaries inspectable. No role
  gains admin rights or permission to merge, deploy, publish or delete on the
  person's behalf merely by existing.
- **R3 — Installation and preservation.** `myharness init --examples` supplies
  the starter material through [home](home.md)'s initialization path;
  [onboarding](onboarding.md) configures the selected engine/model/account and the plain name
  before first chat. Preserve existing files on repeated initialization; fill
  missing starter files rather than replacing edited charters or conversations.
  Do not install an unselected adapter's keys or an unsupported default model.
  Install starter/bots/, starter/teams/, starter/skills/ and starter/bin/ at the
  same paths under the home, preserving executable bits. This installs the
  wrapper at `<home>/bin/factory-db`, executable and callable by bare name
  from bot processes ([engine contract](engine-contract.md) R7). Install
  starter/NOTICE.md as the single home-root NOTICE.md (R5).
  Installation is a plain copy, with no install-time placeholders or interview
  record dependency. Firstmate reads both SSH names from `host` in
  `~/myharness-src/interview.json` when needed (R7), rather than having them
  substituted into starter files.
  The starter set is these four roles; no extra demonstration workers ship.
- **R4 — Minimal context and reach.** Use the engine contract's framing and
  roster instead of duplicating it in every charter. The plain bot gets no
  task ledger, project history or general crew roster by default, and its prompt
  stays blank (R1). Any messaging
  reach comes only from actual teams/bridges, never a charter sentence. Skills
  required for configuration are supplied through [Library](library.md); notes
  are not automatically prompt-loaded. Starter routines, if supplied, use the
  grammar in [routines](routines.md), not extra scheduling infrastructure.
- **R5 — Credit and notices.** Give explicit credit to Kun Chen and
  [Firstmate](https://github.com/kunchenguid/firstmate) for the borrowed Firstmate
  idea and implementation. When distributing the
  Firstmate SYSTEM.md, ahoy skill, bearings board page
  (`bearings/scripts/board-template.html`) and Lavish skill, place Kun Chen's MIT
  copyright and permission notice next to that credit. Verify the actual source
  notice/year when that material is bundled; do not relicense it under the
  repository's own licence or scatter redundant notices across unrelated files.
  The single [`starter/NOTICE.md`](../starter/NOTICE.md) carries that credit
  and the verified MIT notice (Copyright (c) 2026 Kun Chen). Install it once at
  the home root with the files, not in each prompt or skill. The repository's
  own licence does not replace that notice.
- **R6 — Working first use.** A new default crew validates, Firstmate can reach
  its two crew members and receives their explicit replies, and the plain bot
  can answer a simple question through a selected adapter. Establish this with
  the fake model before the separate native-login/real-chat check. Guide the
  person through a bots' own GitHub account in [onboarding](onboarding.md) R7; no
  real account credentials are shipped in starter files.


- **R7 — Resume onboarding.** Firstmate's seeded configuration material also
  includes a focused, temporary resume skill for [onboarding](onboarding.md) R9.
  The seeded Firstmate `MEMORY.md` tells it to delete the skill and that memory
  instruction once onboarding reaches `done`.
  On the person's hand-over/resume request it reads
  `~/myharness-src/interview.json`, uses the recorded answers and progress under
  onboarding R5/R8, and leads the remaining setup from inside the harness. Its
  first reply opens with onboarding R10's progress line and plain what/why
  narration, then demonstrates the record context and next unpassed stage; it
  does not invent remembered answers or bypass a stage proof. The hand-over
  message names the blueprint folder; Firstmate records that path as one line
  in its MEMORY.md the first time it reads it, so a later resume can find the
  blueprint's spec without a new interview field. Both SSH names come from
  `host` in the interview record, never guessed defaults. If the record is
  missing or unreadable, the resume skill stops and names the error, without
  rebuilding answers from memory. The setup agent
  remains available on the host. This adds neither the interview to the plain
  bot's blank prompt nor new daemon privileges; R2/R4 boundaries still apply.
  Every remaining step message follows onboarding R10, with progress derived
  from the existing record and the same first-mention glossary, not a new
  progress field or repeated explanations at the switch.
  Page two and its choice build are complete before the switch. At
  `keeper-ready`, Firstmate's first job is to task Bot Maker to sign on a harness
  keeper for `~/myharness-src` from the crewmate template. Firstmate shows the
  person each step as it happens: the brief, Bot Maker's overlap check and
  files, and the live check. The keeper owns the source from sign-on and gets
  a small read-only scout/handover audit: read the source and interview record,
  identify source/build/test entry points and chosen features, run existing
  safe local checks and report the source map plus one next-maintenance
  recommendation to Firstmate. This first task has no edits, pull request,
  installation, real-login turn or deploy. It does not rebuild page-two choices
  or require a second initial installation. The keeper is signed on during
  onboarding, not shipped as a fourth crew bot. The sign-on brief includes the
  absolute blueprint path and its [verification skill](../verify/SKILL.md).
  The keeper records the skill path in its project context and reads that
  canonical file for later harness changes. No starter copy is installed, and
  the existing Code Reviewer/merge policy for later ship tasks is unchanged.

## Controls

Not applicable; onboarding owns name/account questions and the [bot-panel](config-editors.md)
editors own instruction controls. Starter roles introduce no special app control.

## Edge cases

- **E1 — Existing home.** Re-running examples is not a reset or rename. Existing
  display names, modified prompts, teams and skills stay intact; report a
  resulting configuration problem rather than erase the user's work.
- **E2 — Absent role material.** A missing charter/skill or an uncleared derived
  text notice is not a complete starter-set delivery. The licence cleanup must
  finish before that material is distributed. The bundled assets do not by
  themselves prove a built harness installs them or completes onboarding.
- **E3 — No tasks for plain chat.** Do not silently install task routines or
  project charters into the plain bot in order to make it resemble the crew.
  A later explicit customization is not the core default.

| Id | Given | When | Expect |
| --- | --- | --- | --- |
| **T1 — Minimal charter, explicit resume context** | Seeded Firstmate resume skill, known interview record and unchanged plain-bot blank prompt | Person asks Firstmate to resume onboarding at the switch | Read the record and demonstrate actual answers/progress/next stage, not invented minimal-charter memory. Lead the remaining work within R2 permissions and onboarding gates. Do not place interview/task context in the plain bot by default (R1, R2, R4, R7; [onboarding](onboarding.md) R5, R8, R9). |
