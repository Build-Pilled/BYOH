// status: the cases of "working". A session is working only when a turn runs or bot input waits for pickup
// without an error (status R1); Mark as read (owner PATCH {idle: true}) is refused with 409 exactly while it is working
// (status R3). Effect only, not the window lights.
import assert from 'node:assert/strict';
import { botSends, detail, durable, firstEngine, holdTurn, mockBot, newSession, outboundItem, running, saveJson, seenWithin, sessionIds, setBotField,
  until, writeTeam } from './lib.mjs';

const markRead = async (kit, bot, sid, log) => { const r = await kit.api('PATCH', `/sessions/${bot}/${sid}`, { idle: true }); log.push({ api: `PATCH /sessions/${bot}/${sid}`, body: { idle: true }, status: r.status }); return r; };

// model:status 1. A teammate's message whose delivery fails before pickup: not working, and Mark as read is accepted.
const failedBotInput = { id: 'status-model-failed-bot-input-not-working', title: 'status R1, R3, messaging R6: a teammate message that fails before pickup stays pending with its error, the recipient session is not working, and Mark as read is accepted', run: async (kit) => {
  const engine = firstEngine(kit); const ev = { engine, commands: [], steps: {} };
  try {
    await mockBot(kit, 'sta', engine, ev.commands); await mockBot(kit, 'stb', engine, ev.commands);
    // the recipient's engine cannot start: its model does not exist (a launch failure, messaging R6)
    setBotField(kit, 'stb', 'model', engine === 'pi' ? 'nosuch/none-1' : 'claude-code/nosuch-none-1');
    writeTeam(kit, 'stt', 'sta', ['stb']);
    const sid = ev.session = await newSession(kit, 'sta', 'status lead', ev.commands);
    ev.steps.send = await botSends(kit, 'sta', sid, engine, { to: 'stb', text: 'status first message', new_session: 'status failed' }, ev.commands);
    const target = await until('the recipient session', async () => sessionIds(kit, 'stb').find((s) => s.meta.title === 'status failed'), { timeout: 60000, every: 500 });
    const d = await until('the incoming message settled with an error', async () => { const x = await detail(kit, 'stb', target.id); return x.incoming.some((i) => i.error) ? x : null; }, { timeout: 120000, every: 1000 });
    ev.steps.incoming = d.incoming.map((i) => ({ id: i.id, state: i.state, error: i.error }));
    assert.ok(d.incoming.every((i) => i.state === 'pending' && i.error), `the failed message is not pending with its error: ${JSON.stringify(ev.steps.incoming)}`);
    ev.steps.running = await running(kit, 'stb', target.id); assert.equal(ev.steps.running, false);
    const m = await markRead(kit, 'stb', target.id, ev.commands); ev.steps.markRead = { status: m.status, json: m.json ?? null };
    assert.ok(m.status < 300, `Mark as read returned ${m.status}: errored bot input made the session working (status R1, R3)`);
  } finally { saveJson(kit, 'status-model-failed-bot-input-not-working', ev); }
} };

// model:status 1 (second path). Stop with a follow-up queued: the paused follow-up does not make the session working.
const pausedNotWorking = { id: 'status-model-paused-follow-up-not-working', title: 'status R1, R3, turns R4: after Stop with a follow-up queued, the paused follow-up does not count as work, so Mark as read is accepted and the follow-up stays queued', run: async (kit) => {
  const engine = firstEngine(kit); const bot = 'stpause'; const ev = { engine, commands: [], steps: {} };
  try {
    await mockBot(kit, bot, engine, ev.commands); const sid = ev.session = await newSession(kit, bot, 'status paused', ev.commands);
    await holdTurn(kit, bot, sid, `status hold ${engine}`, 120000, ev.commands);
    const q = await durable(kit, bot, sid, 'followUp', `status queued ${engine}`, ev.commands); assert.equal(q.json?.item?.state, 'queued');
    const during = await markRead(kit, bot, sid, ev.commands); ev.steps.markReadWhileRunning = during.status;
    assert.equal(during.status, 409, `Mark as read during the turn returned ${during.status}, not 409 (status R3)`);
    assert.ok((await kit.api('POST', `/sessions/${bot}/${sid}/abort`)).status < 300);
    await until('the stopped turn settled', async () => !(await running(kit, bot, sid)), { timeout: 60000, every: 500 });
    const m = await markRead(kit, bot, sid, ev.commands); ev.steps.markRead = { status: m.status };
    assert.ok(m.status < 300, `Mark as read after Stop returned ${m.status}: the paused follow-up counted as work (status R1)`);
    ev.steps.item = await outboundItem(kit, bot, sid, q.id); assert.equal(ev.steps.item.state, 'queued', 'Mark as read changed the follow-up (status R3: marks never cancel)');
    ev.steps.started = await seenWithin(kit, `status queued ${engine}`, 5000); assert.equal(ev.steps.started, false);
  } finally { saveJson(kit, 'status-model-paused-follow-up-not-working', ev); }
} };

export default { section: 'status', cases: [failedBotInput, pausedNotWorking] };
