# Desktop notifications

Classification: Choice (desktop notifications). Prerequisites: [status](status.md) unread rules, the Electron desktop app ([shell](ui-shell.md)), the authenticated event stream of the [daemon](daemon.md).

## Purpose

Tell the person that a conversation needs them while they are not looking at the
app, with a macOS notification from the app and, for people who want it, a command
the host runs. It is not the [completion sound](completion-sound.md), which is
core, decided by different rules and independent of this choice. [Window
behaviour](window-behaviour.md) owns how a clicked notification brings the window
back; [status](status.md) owns what unread means.

## Required behaviour

- **R1 — The choice.** By default the app shows a native
  notification when a session becomes unread while the app is not in front, and
  no host command is set. "Go with the default" is offered. The interview
  asks two questions: "Show a macOS notification when a conversation you are not
  looking at finishes while the app is in the background?", default yes, and it
  says that a conversation that is open in the app, even in a hidden window, counts
  as looked at and does not notify (E2); and, only if the person
  wants it, "Run a command of your own on the host when a conversation becomes
  unread?", default no. The first answer is recorded in the interview record that
  [onboarding](onboarding.md) owns and sets whether the app shows notifications; the
  second is the `notify` field in `myharness.toml` (R5). When this choice is not
  made, the app shows no notification and `notify` is not a known field.
- **R2 — The trigger.** The daemon puts one `unread` event on its authenticated
  event stream, with the fields `bot`, `session` and `title` (the session title),
  each time the end of a turn sets a session unread under [status](status.md) R3:
  the session is not a routine one and no app is viewing it. The turn may have
  succeeded, failed or been stopped. A session that was already unread emits
  again when its next turn ends. Marking a session unread by hand, a routine
  session and a session an app is viewing emit nothing. Opening a session never
  emits.
- **R3 — Native notification.** The app shows one notification for each `unread`
  event it receives live while its window does not have focus: another app is in
  front, the window is hidden to the menu bar, or it is minimised. A focused window
  shows none. Only a running app with a window (hidden or not) receives events: an
  app that was started at login without a window ([window behaviour](window-behaviour.md)
  R7) shows none until the window is first opened, and a quit app shows none; the
  host command of R5 does not depend on the app. Nothing missed while the app was disconnected is shown later, and
  neither a reconnect nor a snapshot shows one. The title is `<Name>: <bot id>`
  and the body is the session title; the reply text is never put in the
  notification. Both are shown as plain text. The notification has no buttons and
  makes no network request.
- **R4 — Clicking.** Clicking the notification brings the app's window to the
  front, showing it first if it was hidden, and opens that exact conversation
  (the bot and session of the event). If the host cannot be reached, the shell's
  unreachable state shows instead ([shell](ui-shell.md) R1). It never opens a
  second window ([window behaviour](window-behaviour.md) R5).
- **R5 — The host command.** When `notify` is set, the daemon runs it each time it
  emits an `unread` event (R2), whether or not any app is connected or in front.
  `notify` is a list of strings: the executable, then its literal arguments. It is
  never passed to a shell. An empty list or an absent field means no command.
  `myharness validate` reports anything else as `"notify" must be a list of
  strings`, and does not check that the executable exists.
- **R6 — Placeholders.** In each argument after the executable, `{bot}`,
  `{session}`, `{title}` and `{text}` are replaced by the bot id, the session UUID,
  the session title and the text of the session's last assistant message that has
  text (the first 200 characters, counted as code points; empty if none). The
  replacement happens once, so a value that contains a placeholder is not expanded
  again, and control characters in a value, newlines included, become spaces.
  Each argument stays one argument, however its values read.
- **R7 — The command runs apart.** The command runs as the daemon's own user,
  detached, with no input, with its output discarded and without a time limit. The
  daemon does not wait for it, retry it or count its exit status, and the
  command's failure never changes a turn, a status or a notification.
- **R8 — Untrusted values.** `{title}` and `{text}` come from conversations and
  may have been shaped by anything a bot read. The interview says so when it asks
  the second question. It tells the person that the command runs on the host and
  not on the Mac, that it runs with the same rights the bots have there, that it
  is set in `myharness.toml`, which every process running as the daemon's user (a
  bot among them) can write ([isolation](isolation.md) R5), and that a value starting with a hyphen can look like
  an option to the command, so a command should take the value as data (after
  `--`, or as a message argument).

## Controls

The notification is native to macOS and outside the renderer's accessibility
tree, so the kit's window driver cannot find it; the user's Mac check proves it.
The `notify` field is edited in the Daemon page by the shared editor
([settings](settings.md) R4, [config editors](config-editors.md)); this section
owns no control of its own.

| Role | Accessible name | Scope, action and observable state |
| --- | --- | --- |
| notification | `<Name>: <bot id>` | macOS notification; body is the session title; the only action is the click in R4. |

## Edge cases

- **E1 — Permission.** The system asks for permission on the first notification.
  If the person refuses, or turns notifications off for the app later, nothing is
  shown, the app shows no error and does not ask again, and status, unread marks
  and the completion sound are unaffected. The interview tells the person to look
  under System Settings, Notifications.
- **E2 — Viewing, and the session in front.** A reply in the conversation that is
  open in an app (even one that is not in front) has a viewer, so it is not unread
  and emits no event (status R3). That absence of a notification is intended, not
  an error.
- **E3 — A bad command.** A missing or non-executable program, an empty
  executable, or any other failure to start never stops the daemon, a turn, the
  event stream or the native notification. The daemon writes one line to its
  diagnostic output naming the executable and the reason, and never the values
  substituted into the arguments.
- **E4 — Bursts.** Each event is one notification and one command run. There is no
  rate limit in release one; the system may group notifications.
- **E5 — Alongside the sound.** The completion sound has narrower rules (a lead's
  work or a run the person started, and never a routine) and plays whether or not
  the window has focus ([completion sound](completion-sound.md)). A completion can
  therefore notify without a sound, sound without a notification (the window has
  focus but another session was open), do both, or do neither.
- **E6 — Not chosen.** A harness without this choice has no `notify` field (it is
  an unknown field) and shows no notification; the other core marks are unchanged.
- **E7 — Nothing to show.** Notifications on the Linux test host are not the macOS
  system's; no check there stands in for the Mac.
