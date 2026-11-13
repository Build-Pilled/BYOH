# Spec index

Each section states what a harness must do, as behaviour you can observe from
outside it. One Markdown file per section.

Before the host-side build, read the [verification skill](../verify/SKILL.md)
in this pinned blueprint checkout. The setup agent and later harness keeper use
it with the same [kit](../verify/README.md) and suite to retain evidence of their work.

## What done means

A build is done when the [suite](../suite/README.md) is green on it and the
person has reached `first-use` ([onboarding](onboarding.md) R4). Mac-only items
follow [verifiability](verifiability.md) R12. The suite is the only pass/fail
gate. Numbered rules say what to build. Edge-case tables are reference: read a
table when building or debugging that behaviour. They are not a checklist, and
they ask for no new tests or fault hooks.

## Reading a section

- Numbered rules are normative. A `## States` diagram is a summary: where a
  diagram and a rule disagree, the rule wins.
- A section owns its rules. Follow its links for shared requirements. A missing
  listed requirement permits an explicit skip, not a pass. Green requires every
  remaining case to pass or have such an explicit skip.
- UI sections list every control they own as role plus exact accessible name.
  Build those names: tests select only by role and accessible name, not CSS, DOM
  structure, test-only tags or a private bridge.
- Tests read a UI action's daemon effect through the API or files first, then
  the screen. Pure UI changes use the accessibility tree for pass/fail and
  screenshots for visual judgement. Evidence is PNG and JSON per run. Mac-only
  evidence stays `mac-pending` until the user answers.
- The command, home and environment prefix are `myharness`, `~/.myharness` and
  `MYHARNESS_`; only the display name is user-selected. Production keeps the
  fixed names and ports these sections state; isolated verification uses a free
  port ([verifiability](verifiability.md)), not the live daemon.
- Appearance's three modes remain core even when look and palette is declined.
  Core pointer-accessible controls do not require the deferred shortcut feature.

## Section inventory

Core is included for every user. The two engine sections are conditional core:
at least one adapter is required, and the user's power-source answer selects
which adapter sections apply. They are not extra interview features. The five
choice sections ship in release one; their cases apply when chosen. Keyboard
shortcuts and the phone companion are deferred and are not offered by the
release-one interview.

| File | Classification | Scope |
| --- | --- | --- |
| [onboarding.md](onboarding.md) | Core | Host-step questions, interview pages, stages and gates, the interview record, display and Plain-bot names. |
| [home.md](home.md) | Core | Home layout, configuration, validation and last-good bot configuration. |
| [daemon.md](daemon.md) | Core | Daemon lifecycle, discovery, health and API credentials. |
| [cli.md](cli.md) | Core | Offline help, validation, command outputs and client failures. |
| [bots.md](bots.md) | Core | Bot creation, identity, marks and live discovery. |
| [sessions.md](sessions.md) | Core | Session identity, workspace, persistence and deletion. |
| [engine-contract.md](engine-contract.md) | Core | Adapter contract, prompt assembly, tool boundaries and version drift. |
| [engine-pi.md](engine-pi.md) | Core (selected adapter) | Pi adapter and chosen provider login, with mock and real-login proof. |
| [engine-claude-code.md](engine-claude-code.md) | Core (selected adapter) | Claude Code adapter, unmodified engine and chosen login. |
| [turns.md](turns.md) | Core | Chat turns, durable queue, steering, Stop, Retry and recovery. |
| [messaging.md](messaging.md) | Core | Explicit messages, routing, delivery, bridge connection controls and the Bot threads view. |
| [teams.md](teams.md) | Core | Led teams, leadless teams, unteamed bots and permitted reach. |
| [starter-bots.md](starter-bots.md) | Core | Seeded Firstmate, Bot Maker and Code Reviewer, and the user-named Plain bot with a blank prompt. |
| [routines.md](routines.md) | Core | Cron and one-shot routines, time zones and missed runs. |
| [instruction-history.md](instruction-history.md) | Core | Attributed history and reversal of prompt-bearing configuration. |
| [failure-alerts.md](failure-alerts.md) | Core | Failure reports to the team lead and leadless exclusions. |
| [status.md](status.md) | Core | Working, unread, waiting, attention, idle marks and Active sessions. |
| [model-picker.md](model-picker.md) | Core | Model search, selection, autosave and next-turn changes. |
| [search.md](search.md) | Core | Cross-thread search, archives and find in the open thread. |
| [compaction.md](compaction.md) | Core | On-demand engine compaction and folded transcript records. |
| [mcp.md](mcp.md) | Core | MCP server configuration and engine tool connections. |
| [config-editors.md](config-editors.md) | Core | Bot panel, configuration edits, conflicts and protected file boundaries. |
| [activity.md](activity.md) | Core | Activity timeline and observable hand-offs. |
| [session-organization.md](session-organization.md) | Core | Folders, row actions and archive without adding conversation context. |
| [annotations.md](annotations.md) | Core | Quoted numbered comments attached to a message. |
| [team-map.md](team-map.md) | Core | Team map, roster editing and ordering. |
| [conversation-branching.md](conversation-branching.md) | Core | Fork and duplicate without modifying the source conversation. |
| [completion-sound.md](completion-sound.md) | Core | Completion eligibility and the original synthesized sound. |
| [reply-details.md](reply-details.md) | Core | Model changes, context used and added, and local timestamps. |
| [callouts.md](callouts.md) | Core | Outward rendering of callout boxes in replies. |
| [tasks.md](tasks.md) | Core | Tasks view over the shared task table and its narrow editing surface. |
| [changes.md](changes.md) | Core | Changes view, diffs and reversal. |
| [library.md](library.md) | Core | Shared skills and the Library view. |
| [terminal-chat.md](terminal-chat.md) | Core | Native terminal chat, Pi mailbox delivery and safe Claude ownership. |
| [session-tidy.md](session-tidy.md) | Core | Archive after 15 idle days and restore at any time. |
| [ui-shell.md](ui-shell.md) | Core | Electron conversation shell, safe rendering, links and remote files. |
| [tools.md](tools.md) | Core | Tools menu and access to its core pages, including Bot threads. |
| [settings.md](settings.md) | Core | Settings entry, Connections, Daemon, About and clean Shutdown VM. |
| [appearance-mode.md](appearance-mode.md) | Core | Core System, dark and light modes, independent of palette choices. |
| [host.md](host.md) | Core | Host requirements, SSH names, persistence, scheduled host jobs, own-host administration, environment check and known pitfalls. |
| [isolation.md](isolation.md) | Core | Isolation floor, the bot user, daemon control and the accepted kill risk, egress boundary and what bots can reach. |
| [vm.md](vm.md) | Core | Supplied Debian 13 Lima VM: pins, sizing, disks, forwards and SSH names, services, start at login, sleep, clean stop and removal. |
| [app-pairing.md](app-pairing.md) | Core | Desktop app target, pairing line, token use and rotation, connection states, lasting SSH connection, VS Code and Shutdown action. |
| [app-build.md](app-build.md) | Core | The rebuild line: admin deploy from an exact commit, busy refusal, desktop app build, Mac pull, checks, swap and rollback. |
| [verifiability.md](verifiability.md) | Core | Seven isolation seams, scenario reuse, evidence and Mac-only checks. |
| [look-and-palette.md](look-and-palette.md) | Choice | Interview-selected look and palettes on top of core appearance modes. |
| [window-behaviour.md](window-behaviour.md) | Choice | Chosen window and login behaviour, proven on the Mac. |
| [desktop-notifications.md](desktop-notifications.md) | Choice | Chosen unfocused-reply notifications and shell notification command. |
| [conversation-export.md](conversation-export.md) | Choice | Self-contained inert HTML conversation archive. |
| [vm-backup.md](vm-backup.md) | Choice | Opt-in Mac-pull private backup, secret scan, snapshots and restore. |

The separate-data-disk option belongs to the VM's host-step disk-layout question,
before creation; it is not a sixth release-one feature-menu item. Explain its
migration cost and the one-disk data-loss consequence before the user chooses.
Backup ([VM backup](vm-backup.md)) is off by default; deleting the one-disk VM
then deletes the harness data. Own-machine hosts meet the same isolation floor,
but only the supplied Debian 13 VM is proven end to end by BYOH.
Distribution-specific adaptation is the user's agent's responsibility.
