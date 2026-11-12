# Window behaviour

Classification: Choice (window behaviour). Prerequisites: the Electron desktop app ([shell](ui-shell.md)); pairing and reconnection are owned by [app pairing](app-pairing.md).

## Purpose

Decide how the desktop app's window opens, goes away and comes back, and whether the
app starts when the person logs in to the Mac. The section is about the desktop app only. It never starts, stops or restarts the daemon, the VM or
any host service, which belong to the host sections. The shell owns what
is inside the window, and [desktop notifications](desktop-notifications.md)
owns when a notification asks the window to come back.

## Required behaviour

- **R1 — The choice.** By default the window opens
  maximised, closing it hides the app to a menu bar icon instead of quitting,
  and starting at login is off. These three behaviours are chosen together by
  one tick, and "go with the default" is offered. The interview asks one
  question, "Keep the app in the menu bar when you close the window, and open it
  maximised?", with the default yes, and a follow-up only when the person says
  yes: "Start it when you log in to this Mac?", with the default no. The answers
  are recorded in the interview record that [onboarding](onboarding.md) owns. The
  first sets the behaviours below; the second sets the initial state of the
  login switch in R6. If the first answer is no, the app is the plain app of E1.
- **R2 — Opening.** When the app is launched and shows its window, the window
  appears on the display that holds the pointer at that moment, already
  maximised to the display's usable area (not full screen), and is shown only
  after it is placed, so the person does not see it move. Unmaximised it is
  1280 by 820 points, centred on that display's usable area, and it cannot be
  made smaller than 900 by 560.
- **R3 — Closing hides.** Closing the window hides it. The app keeps running with
  the window's size, position, open conversation and drafts. The window is not
  destroyed, the connection to the host is not dropped by closing, and closing
  stops nothing on the host: no turn, daemon or VM ([shell](ui-shell.md) R7). The
  app quits only when the person chooses Quit in the menu bar menu or the system's
  Quit command for the app.
- **R4 — The menu bar menu.** While the app runs there is one menu bar icon, with
  the display name as its tooltip. Its menu has exactly the three items in
  Controls. Choosing Open shows the window. A plain click on the icon MAY also
  show the window; the menu is the required entry point, so nothing depends on a
  keyboard shortcut. Quit stops the app and says in its label that the
  harness keeps running, which it does.
- **R5 — Coming back.** Each of these shows the existing hidden or minimised
  window, in front, at the size and place the person left it, and never opens a
  second window or a second copy of the app: choosing Open; launching the app again
  (from the Dock, Finder, Spotlight or a command line); and a click on a
  notification when [desktop notifications](desktop-notifications.md) is chosen.
  A plain relaunch from the Dock or Finder counts too, so a hidden window never
  leaves the menu bar as the only way back.
- **R6 — Login.** The menu's checkbox item Run `<Name>` at login turns the
  login item on or off for the desktop app, and shows the state the system reports
  each time the menu opens. It starts in the state the person chose in R1. When
  the system asks the person to approve the item in System Settings (Login
  Items), the checkbox stays unchecked until the system reports it enabled, and
  the app shows no message of its own.
- **R7 — Starting at login.** When the system starts the app at login, the app
  starts in the menu bar with no window in front, and does nothing to the host:
  it does not start, probe-start or restart the daemon, the VM or any service.
  The first time the person then opens the window it opens as R2 says
  (maximised, on the pointer's display); later hides and returns keep the size
  they left it (R5). Opening the window while the host is down shows the shell's
  unreachable state ([shell](ui-shell.md) R1), not an error dialog. Whether the
  host is running after login is [VM](vm.md) R8's matter, not this section's.

## Controls

The menu bar icon and its menu are native to macOS. They are not part of the
renderer's accessibility tree, so the kit's window driver cannot find them and
the user's Mac check proves them (E6). Their names are fixed by this spec;
`<Name>` is the display name the person chose.

| Role | Accessible name | Scope, action and observable state |
| --- | --- | --- |
| menu bar item | `<Name>` | Menu bar; the icon, with the display name as tooltip. Present while the app runs when this choice is made. |
| menu item | Open `<Name>` | The menu; shows the window (R5). |
| menu item (checkbox) | Run `<Name>` at login | The menu; checked only while the login item is enabled (R6). |
| menu item | Quit (the harness keeps running) | The menu; quits the app only (R3). |

The menu is dismissed by choosing an item or clicking outside it. The window's own
traffic-light buttons, title bar and any system menus are the system's.

## Edge cases

- **E1 — Declined.** Without this choice the app is plain: the first window
  opens at the unmaximised size of R2 on the pointer's display, closing the last
  window quits the app, and there is no menu bar icon and no login item from the
  app. Quitting still stops nothing on the host.
- **E2 — Two displays.** With the pointer on the second display at launch, the
  window opens maximised there. With the pointer on the first display, a hidden
  window the person moved to the second display returns there (R5), not to the
  pointer's display.
- **E3 — Second launch.** Launching the app while it is already running and its
  window is visible brings that window forward and starts nothing new.
- **E4 — Running turns.** Closing the window or choosing Quit while a bot works
  does not interrupt it. Reopening shows the conversation as the host reports it.
- **E5 — Login blocked.** If the system does not allow the item or the person
  turns it off in System Settings, the checkbox shows unchecked the next time the
  menu opens. The app does not retry silently.
- **E6 — Hidden start not honoured.** A system that shows the window at login
  anyway fails R7; the app must hide it itself, and "the platform opened it
  visibly" is a failed check, not an accepted variance. [App build](app-build.md)
  R6 states how the built app does it; the Mac check decides.

| Id | Given | When | Expect |
| --- | --- | --- | --- |
| **T1 — First visible launch is placed before showing** | Window behaviour chosen, pointer on either display | Fresh launch, then unmaximise and try reducing size | First visible window already maximised to pointer display usable area, not full screen or a visible move. Restore1280×820points centred there; minimum900×560. Pairing/trust rules still apply (R2; [app pairing](app-pairing.md) R4). |
| **T2 — Returning keeps the existing window** | Chosen app resized/moved with conversation and draft; desktop notifications only if chosen | Close/hide, then Open, relaunch while hidden/minimised/visible, and click an eligible notification | Reuse one app/window in front at left size/place, no fresh maximisation or relocation to pointer display. Keep conversation/drafts/connection; close/quit does not interrupt host work. Open menu is required, plain tray click optional, notification route conditional (R3–R5, E2–E4). |
| **T3 — Login opens no host service** | Window behaviour/login enabled and host stopped | Start at login, then first user Open, resize/hide/return | Stay hidden/menu-bar-only even if platform would show it. Start/probe-start/restart no daemon, VM or service; first user Open maximises once on pointer display, later returns keep size. Host-down shows unreachable shell, not an error dialog (R2, R5, R7, E6). |
