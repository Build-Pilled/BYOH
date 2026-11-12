# Settings

Classification: Core. Prerequisites: [shell](ui-shell.md), [home](home.md), selected engine adapters.

## Purpose

Give the person appearance, engine connection, daemon configuration and host
information in one place. This section owns the shared entry/navigation/search
and dismissal used by [appearance-mode](appearance-mode.md); that section owns
System, Dark and Light. No new account storage or privilege mechanism is implied.

## Required behaviour

- **R1 — Shared frame.** Settings opens a dialog at Appearance with section
  navigation for Appearance, Connections, Daemon, About and Shutdown VM. Search
  filters navigation by case-insensitive section label/keywords, not a config
  mutation. Filtering does not itself switch the displayed section. Clear the
  query to restore the full list. Close or backdrop dismisses without writing
  drafts. All five sections are core; a capability limitation is explained in
  the page, not a reason to drop navigation.
- **R2 — Appearance.** Use exactly the core mode names/states and profile/origin
  persistence in [appearance-mode](appearance-mode.md). Optional
  [palettes](look-and-palette.md) cannot replace System/Dark/Light. A mode may reload the renderer immediately; this
  is not a daemon restart or a Save of configuration drafts.
- **R3 — Connections.** Show only selected adapters' setup/status. Identify the
  Linux host as the place native sign-in lives, not this Mac. Claude status
  distinguishes absent/unsupported engine, not signed in and native account
  method; do not call a supported Console login unusable merely because it is
  not a subscription. Show sign-in/switch commands to run on that host, using
  native flow, followed by Check again. Sign out confirms its effect on the
  host's same native login and bots using it; cancellation has no effect. Never
  display/extract native token bytes or copy another engine's login. Pi shows
  native `pi` then `/login` instructions for the user's selected provider and
  the adapter's forward/paste requirement. An environment-key status is presence
  only and cannot prove Pi has no native login. [Engine Pi](engine-pi.md) and
  [Claude Code](engine-claude-code.md) own account/terms/launch behaviour. Missing
  engines use the pinned install ([VM](vm.md) R2), not an unpinned update command.
- **R4 — Daemon and About.** Daemon edits `myharness.toml` with the shared
  [file editor](config-editors.md), validation, Save and conflict rules. About
  displays the harness display name/build version, selected home, daemon URL
  and PID from health; unreachable health says so, not fabricated metadata.
  Saving config is not proof it applies to a running process; [home](home.md)
  and [daemon](daemon.md) govern reload/startup.
- **R5 — Clean stop.** Shutdown VM explains that it stops the user's supplied
  VM cleanly and only on a person's action, so the Mac can then shut down.
  Check availability, show reason/error if unavailable, stream bounded command
  output and distinguish stopped, already stopped, busy refusal and failed.
  Disable repeat start while stopping. A busy refusal lists working turns;
  Stop anyway is offered only then, with an explicit warning it interrupts them.
  No shorter UI timeout may abort the clean-stop wait. Daemon disconnection
  after successful stop is expected, not failure. For an own-machine host show
  this VM action unavailable; do not power off arbitrary Linux machines or add
  a privileged daemon endpoint. [VM](vm.md) R9 owns the clean-stop program and its exit
  codes; [app pairing](app-pairing.md) R10 owns how the app runs it.

## Controls

Each name is unique within dialog Settings or its named page region. These are
also the shared entry names used by Appearance, with no alias or shortcut suffix.
Shared file controls are defined once in config-editors, not renamed here.

| Role | Accessible name | Scope, action and observable state |
| --- | --- | --- |
| button | Settings | Sidebar; opens Settings. |
| dialog | Settings | Shared frame, modal. |
| searchbox | Search settings | Filters section navigation; empty restores all. |
| button | Appearance / Connections / Daemon / About / Shutdown VM | Individually named navigation buttons; pressed on current page. |
| region | Appearance / Connections / Daemon / About / Shutdown VM | Individually named displayed page. |
| button | Close | Settings frame; dismisses dialog. |
| button | System / Dark / Light | Appearance; owned by appearance-mode with exact pressed states. |
| region | Claude Code / Pi | Connections; each only when adapter selected. |
| button | Show sign-in command | Claude Code region; unsigned native account. |
| button | Show switch command | Claude Code region; signed native account. |
| button | Sign out | Claude Code region; disabled during logout. |
| button | Check again | Connections; refresh status, not proof of a login merely by click. |
| dialog | Sign out of Claude Code | Explains shared host-native login effect. |
| button | Sign out / Cancel | Confirmation dialog only; confirm or leave login unchanged. |
| button | Shut down VM | Shutdown VM page; disabled during stop or unavailable. |
| button | Stop anyway | Shutdown VM page; only after busy refusal, interrupts listed turns. |
| log | Shutdown output | Streaming stdout/stderr, bounded to latest 1000 lines. |

## Edge cases

- **E1 — Search and dismissal.** No matching navigation gives a visible no-match
  state; clearing restores it. Close/backdrop does not save daemon drafts.
  Profile preferences are not written into daemon configuration.
- **E2 — Account failure.** Show command/status errors and let Check again
  refresh. A mock-backed reply is not a real login proof. Do not print emails
  or account details into public proof artifacts; record redacted status only.
- **E3 — Stop result.** Availability failure prevents a start. Busy refusal is
  not stopped; a failed command is not success just because the connection
  dropped. The real Mac/VM stop and shared native login require user-side proof.
  The busy, failed and already-stopped outcomes come from the clean-stop
  program's exit status and lines ([VM](vm.md) R9), not from the connection.

| Id | Given | When | Expect |
| --- | --- | --- | --- |
| **T1 — A press is not a successful stop** | Shutdown VM available/unavailable, with a busy or successful/failed clean-stop result | Open its page, press Shut down VM, then explicitly Stop anyway only after busy refusal | Opening alone never stops anything. Explain unavailable capability; start one run at a time only by person action, stream bounded ordered output and do not cut short the clean-stop wait. Busy is refusal with working turns, not success; only explicit warned Stop anyway passes force. Result/exit lines distinguish stopped/already-stopped/failed; disconnection alone is not proof. Own hosts remain unavailable, never powered off (R5, E3; [app pairing](app-pairing.md) R10; [VM](vm.md) R9). |
