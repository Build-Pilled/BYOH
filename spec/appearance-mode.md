# Appearance mode

Classification: Core. Prerequisites: the Electron app and Settings.

## Purpose

Let the person choose System, dark or light appearance without requiring the
optional [look-and-palette](look-and-palette.md) feature. This section owns the mode selector inside
Settings → Appearance. Settings owns the app-wide Settings entry, section
navigation, search and dialog dismissal; [look-and-palette](look-and-palette.md) owns palette values
and interview-selected styling, not whether these three modes exist.

## Required behaviour

- **R1 — Availability.** Settings → Appearance offers System, Dark and Light
  to every user, including a harness with no choice features selected. The
  controls have the roles and exact accessible names below. Descriptive hints
  do not change those names.
- **R2 — Resolution.** With no saved choice, System is selected. When the app
  opens or reloads, System resolves to light when that app environment reports
  a light preference, and to dark otherwise. Dark and Light resolve to their
  respective modes regardless of the system preference. This section does not
  require live tracking of an OS change while the window remains open.
- **R3 — Activation.** Activating a mode applies it immediately, without a Save
  action or daemon restart. A renderer reload is permitted. Exactly one mode
  has the accessible pressed state `true`, and the others have `false`.
  The selected mode and the resolved appearance agree. In System mode the
  System control stays selected even when the resolved appearance is light.
- **R4 — Scope and persistence.** The selection is local to this app profile on
  this machine and daemon origin (scheme, host and port). It survives closing
  and reopening that profile against the same daemon address; it does not
  edit the daemon configuration or change another app profile's choice.
  A mode change neither deletes conversations nor changes bot configuration.
- **R5 — Visual evidence.** The whole rendered app uses the resolved mode,
  including conversation [callouts](callouts.md). Exact palette colours and layout follow the
  user's chosen look, not a fixed screenshot. A pass requires the accessible
  selection state; screenshots supply visual evidence, not a substitute for it.

## Controls

All three controls are unique within the visible Appearance page of Settings.
They remain available after changing modes, by reopening Settings if the renderer
reloads. These names do not impose a palette name or a keyboard shortcut.

| Role | Accessible name | Action and observable state |
| --- | --- | --- |
| button | System | Follow the environment at open/reload; pressed only when System is selected. |
| button | Dark | Choose dark mode; pressed only when Dark is selected. |
| button | Light | Choose light mode; pressed only when Light is selected. |

No additional control is owned by this page. App-wide navigation/dismissal is
specified in [Settings](settings.md), not silently given a second name here.

## Edge cases

- **E1 — Fresh profile.** In both a light and dark emulated environment, System
  is initially pressed and resolves to that environment's mode; the default is
  not a forced dark preference.
- **E2 — Override and reopen.** Dark stays dark in a light environment after
  reopen; Light stays light in a dark environment. Returning to System removes
  the override and resolves again on open/reload.
- **E3 — Daemon restart.** Restarting the daemon at the same address does not
  reset the profile's selected mode. A persistence scenario reuses that address
  rather than requesting another free port. A changed daemon origin is a
  different preference scope and may start at System. The mode is not a field
  in the harness configuration file.
- **E4 — Choice feature absent.** Declining [look-and-palette](look-and-palette.md) does not remove or
  disable any of the three mode controls. No deferred shortcut feature is needed
  to operate the page with the pointer.
- **E5 — Mac-only appearance.** Emulated colour scheme on the Linux test host
  proves resolution logic, not the real macOS setting. The user's Mac check
  remains `mac-pending` until they confirm System resolves correctly there.
