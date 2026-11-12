# Completion sound

Classification: Core. Prerequisites: [status](status.md), [turns](turns.md), [teams](teams.md), the Electron desktop app ([shell](ui-shell.md)).

## Purpose

Give the person one short audible cue when a conversation they would want to
return to has just finished. It is not a notification: the choice feature for
[desktop notifications](desktop-notifications.md) is separate
and independent of it. [Status](status.md) owns the unread state this section listens for. This section
specifies when the cue plays and the properties of the sound; the audio file and
its regenerating script are a separate asset deliverable.

## Required behaviour

- **R1 — What qualifies.** The cue is considered only when a turn settles and
  the session's new status is Unread (the green state) having been Working.
  Failure, an unanswered question to the person (attention), waiting on a
  teammate, an idle result because the person was viewing the session, and any
  routine session are silent. A run that leaves queued work behind keeps the
  session Working, so it is silent; only the run that finally leaves the session
  Unread is judged.
- **R2 — Whose work.** An eligible completion also needs one of: the bot leads a
  team in the current team configuration (read at each settle, never by name),
  or the settling run was started by the person. A run is started by the person
  when at least one input it consumed carries no recorded bot, incident or
  routine sender. Work a lead hands to a teammate is silent when the teammate
  finishes, and the lead sounds when the teammate's reply wakes it. A teammate the
  person messages directly sounds for that run, but not for its bot-started runs.
  A person's mid-turn steering counts for the run that consumes it only after
  pickup. Follow-ups the daemon starts afterwards are separate runs, judged one
  at a time on both engines. A run with no recorded input (background native
  output) is not person-started.
- **R3 — Wire fact.** The daemon decides eligibility once, on the settled
  `session_state` event of the authenticated event stream, which carries the
  status `transition` (`from`, `to`) and a boolean `completionSound`. The app
  plays only on such a live event. Initial status snapshots, reconnects and
  Last-Event-ID catch-up, thread switches, session loads, raw unread marks, turn
  starts and every other event type never play, and nothing missed while the
  app was disconnected is replayed.
- **R4 — Playback.** In the Electron app only (not in a plain browser tab) an
  eligible event plays the bundled sound from its start, at once, without any
  prior click or key press. Window focus does not matter; whether a completion in
  a different session than the open one counts is decided by R1–R2 alone.
- **R5 — Bursts.** One immediate sound per burst. A further eligible completion
  less than one second after the previous eligible one (whether that one played
  or was itself suppressed) is silent and restarts the one-second window, so a
  continuing burst stays silent. A completion after a quiet gap of one second or
  more sounds again, including a later turn in the same session.
- **R6 — No setting.** There is no mute switch, volume control, choice or
  configuration key in release one; the system volume governs. The phone
  companion is unchanged and no request or question sound exists.
- **R7 — The sound.** The shipped sound is original, synthesized from
  mathematical expressions with no samples, recordings or third-party audio. It is a
  short two-note cue of roughly two-thirds of a second at a moderate level. The
  repository carries the audio file together with the script that regenerates
  it and a provenance note; no earlier replaced sound file is carried.
  Producing, regenerating and licence-checking that asset is its own task; until
  it lands no file is claimed to exist.

## Controls

Not applicable; this section has no UI controls and no visible indicator. A
missing sound is never a state shown to the person.

## Edge cases

- **E1 — Playback fails.** An absent or undecodable file, a missing audio device
  or a blocked play call writes one warning to the app console, shows nothing,
  does not change status or unread marks and does not stop later cues.
- **E2 — Reconnect and duplicates.** An event stream that drops and returns
  neither repeats a settled cue nor sounds for a completion that happened during
  the gap. A session that was already unread still sounds when a new run
  finishes working into unread.
- **E3 — Mixed queue.** A person input followed by a bot input in one queue
  produces two runs; only the last run's origin decides. A bot input followed by
  a person input sounds, the reverse order does not, unless the bot is a lead.
- **E4 — Configuration changes.** Making a bot a lead or removing its lead role
  applies to the next settle; no restart is implied. A routine-origin session
  stays silent even for a lead.
- **E5 — Other clients.** The phone companion is not a sound client. Two app
  windows connected to one daemon each decide R4–R5 on their own.

| Id | Given | When | Expect |
| --- | --- | --- | --- |
| **T1 — Eligible events extend the burst window** | Several live eligible completions, including different sessions | Deliver at controlled elapsed times 0, 500, 1200 and 2200 ms | Play immediately at0 and2200 only. Each eligible event, even a suppressed one, resets the one-second quiet window; a later turn in the same session is not permanently muted (R5). |
| **T2 — Unread data is not a live completion** | Snapshots, raw unread marks, starts, loads, thread switches and non-Unread settles | Present each to the app, including absent/false completionSound and Unread-to-Unread without Working | No cue from any of them. Only the authenticated live settled session_state event with Working-to-Unread and true completionSound is eligible; question, failure, waiting, still-working, routine and viewed/idle outcomes stay silent (R1, R3). |
| **T3 — App playback needs no gesture** | Eligible live event, Electron app or plain browser, focused or not; bundled asset delivered under R7 | Settle with no prior click/key, then exercise a playback failure and a later eligible cue | Electron plays from the start immediately regardless of focus/open session, subject to R1–R2/R5; browser never plays. Failure writes one app-console warning, no UI/status/unread change and no permanent disabling. No new permission, mute or volume control (R4, R6, E1). |
| **T4 — Each actual settle, not reconnect, decides** | Person-started nonlead runs, already-unread session, question/failure/viewed/routine and queued runs | Settle, reconnect/load, run again after a quiet gap, and let two queued runs finish | One eligible live cue per qualifying turn, including a new Working-to-Unread in an already-unread session. Reconnect/Last-Event-ID never replays missed cues; excluded outcomes remain silent and queued work keeps Working until the final run can qualify (R1, R3, R5, E2). |
| **T5 — Recorded sender, not typed framing or session origin** | Current lead and member, delegated and directly person-started runs; both queue orders | Settle delegated work, explicitly reply to wake lead, type bot-looking text as person, and queue person/bot inputs | Delegated member silent; reply-woken lead can qualify, directly messaged member can qualify regardless of typed prefix. Bot/incident/routine sender is not person input. Judge each run from consumed recorded inputs, not title/session origin; mid-turn person steering counts only after pickup. Last queued run decides, current lead role at settle applies, routine stays silent (R1–R3, E3, E4). |
| **T6 — Follow-ups have their own origin** | Both adapters with a nonlead session and controllable queued/native background runs | Run bot-then-person, person-then-bot, bot-then-bot and a later native result with no recorded input | Queued first run stays Working/silent; final eligible person run can sound, bot-started final run cannot. No-input background is not person-started, not a continuation of prior person eligibility. Apply current-lead and other R1–R2 exceptions independently, on both engines (R1–R3, E3). |
