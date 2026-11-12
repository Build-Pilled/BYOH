// terminal-chat: the model-found cases of the Pi attachment across a daemon restart. Terminal chat runs in a
// pseudo-terminal (the section's Proof line). Effect first: owner session detail `attached` (terminal-chat R2), the live summary
// of GET /bots (bots R4) and what the terminal shows; the daemon is restarted through its public lifecycle.
import assert from 'node:assert/strict';
import { attachedWithin, botSends, cliOk, detail, lastUserText, mockBot, NotRun, newSession, openTerminal, restartDaemon, saveJson, selectedEngines,
  sessionIds, sleep, until } from './lib.mjs';

// model:terminal 3. A Pi terminal is open, the daemon restarts, a bot message arrives: no daemon turn starts on that session and
// the message reaches the terminal (mailbox delivery).
const mailboxAcrossRestart = { id: 'terminal-chat-model-pi-mailbox-across-restart', title: 'terminal-chat R2, R3, R5: with a Pi terminal open on a session, a daemon restart keeps the attachment, and a bot message to that session reaches the terminal while no daemon turn starts there', run: async (kit) => {
  if (!selectedEngines(kit).includes('pi')) throw new NotRun('Pi terminal chat needs the pi adapter in this run');
  const ev = { commands: [], steps: {} }; let term;
  try {
    await mockBot(kit, 'tca', 'pi', ev.commands); await mockBot(kit, 'tcb', 'pi', ev.commands);
    await cliOk(kit, ['connect', 'tca', 'tcb', '--note', 'terminal case'], ev.commands);
    const sa = await newSession(kit, 'tca', 'terminal sender', ev.commands);
    await botSends(kit, 'tca', sa, 'pi', { to: 'tcb', text: 'terminal hello', new_session: 'terminal mail' }, ev.commands);
    const s = await until('the recipient session', async () => sessionIds(kit, 'tcb').find((x) => x.meta.title === 'terminal mail'), { timeout: 60000, every: 500 });
    const sid = ev.session = s.id;
    await until('the recipient answered in a daemon turn', async () => (await detail(kit, 'tcb', sid)).messages.some((m) => m.role === 'assistant'), { timeout: 180000, every: 1000 });
    await until('the recipient turn settled', async () => { const b = (await kit.api('GET', '/bots')).json.bots.find((x) => x.id === 'tcb'); return !b.live.some((l) => l.session === sid && l.running); }, { timeout: 60000, every: 500 });
    term = openTerminal(kit, 'tcb', sid); ev.steps.terminal = term.argv.slice(-3);
    await attachedWithin(kit, 'tcb', sid, true);
    ev.steps.restart = await restartDaemon(kit, ev.commands);
    ev.steps.attachedAfterRestart = (await detail(kit, 'tcb', sid)).attached;
    assert.equal(ev.steps.attachedAfterRestart, true, 'the Pi attachment did not survive the daemon restart (terminal-chat R5)');
    // the recipient's model holds whatever request carries this message for 40 s (MOCK_SLOW), so a daemon writer started on that
    // session would still be live and running when it is checked; the observer starts before the send
    const body = 'terminal after restart'; const HOLD = 40000;
    const samples = []; let observing = true; let observerError = null;
    // the observer's failure is caught at once (kept with its samples) and raised after it is joined, so it never escapes unhandled
    const observer = (async () => { while (observing) { const r = await kit.api('GET', '/bots'); assert.equal(r.status, 200, `GET /bots returned ${r.status}`); const b = r.json.bots.find((x) => x.id === 'tcb'); samples.push({ ms: Date.now(), live: b.live.filter((l) => l.session === sid) }); await sleep(250); } })()
      .catch((e) => { observerError = e; observing = false; });
    const framed = async () => (await kit.mock.requests()).filter((r) => lastUserText(r).includes(body) && !lastUserText(r).includes('MOCK_TOOL'));
    try {
      await botSends(kit, 'tca', sa, 'pi', { to: 'tcb', text: `${body}\nMOCK_SLOW ${HOLD}`, session: sid }, ev.commands);
      // pickup evidence: the held request reaches the model, and the terminal shows the message
      const first = await until('the message at the recipient model', async () => { const f = await framed(); return f.length ? Date.now() : null; }, { timeout: 120000, every: 500 });
      ev.steps.shownInTerminal = await until('the message in the terminal', async () => term.screen().includes(body), { timeout: 60000, every: 500 }).catch(() => false);
      // keep observing for most of the hold, while any writer for it is still waiting on the model
      while (Date.now() < first + HOLD - 5000 && !observerError) await sleep(500);
    } finally {
      // the observer's evidence is kept whatever failed (the observer, the send or the pickup wait), before anything is raised
      observing = false; await observer; ev.steps.observerError = observerError?.message ?? null;
      ev.steps.observer = { samples: samples.length, firstMs: samples[0]?.ms, lastMs: samples.at(-1)?.ms, withDaemonEngine: samples.filter((s) => s.live.length).slice(0, 5) };
    }
    if (observerError) throw observerError;
    const writers = samples.filter((s) => s.live.length);
    ev.steps.framedRequests = (await framed()).length;
    assert.ok(samples.length > 20, 'the observer took too few samples to watch the dispatch');
    assert.equal(writers.length, 0, 'a daemon engine ran on the session the terminal holds (terminal-chat R3, R5: never two writers)');
    assert.equal(ev.steps.framedRequests, 1, `the message reached a model ${ev.steps.framedRequests} times; one pickup, by the terminal, was expected`);
    assert.equal(ev.steps.shownInTerminal, true, 'the bot message did not reach the terminal (terminal-chat R3 mailbox)');
  } finally { if (term) { ev.steps.screenTail = term.screen().slice(-800); await term.close(); } saveJson(kit, 'terminal-chat-model-pi-mailbox-across-restart', ev); }
} };

export default { section: 'terminal-chat', cases: [mailboxAcrossRestart] };
