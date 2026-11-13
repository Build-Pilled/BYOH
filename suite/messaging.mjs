// messaging: the model-found cases of bridges. A first message between led teammates leaves a bridge, which
// keeps the two bots in reach after one leaves the team, until the person disconnects them in Bot threads (messaging R4,
// teams E2). Effect first: the bridge files (messaging R5) and what each bot's model received; the window second.
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { botSends, cliOk, detail, firstEngine, lastUserText, mockBot, newSession, openBotThread, refuseRecipientStart, restartDaemon, running, saveJson, sessionIds,
  sleep, startRunDaemon, stopRunDaemon, until, windowStep, writeTeam } from './lib.mjs';

const A = 'ma'; const B = 'mb'; const TEAM = 'mt';
const pair = (kit) => join(kit.home, 'bridges', `${A}--${B}`);
const link = (kit) => (existsSync(join(pair(kit), 'link.toml')) ? readFileSync(join(pair(kit), 'link.toml'), 'utf8') : null);
const logLines = (kit) => (existsSync(join(pair(kit), 'log.jsonl')) ? readFileSync(join(pair(kit), 'log.jsonl'), 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []);
// requests that carried a framed message from A with this body to a model (messaging R5 framing), not A's own tool call
const framedSeen = async (kit, body) => (await kit.mock.requests()).filter((r) => { const u = lastUserText(r); return u.includes(`[from ${A}`) && u.includes(body) && !u.includes('MOCK_TOOL'); });

async function teammatesBridged(kit, ev) {
  const engine = firstEngine(kit); ev.engine = engine;
  await mockBot(kit, A, engine, ev.commands); await mockBot(kit, B, engine, ev.commands); writeTeam(kit, TEAM, A, [B]);
  await cliOk(kit, ['validate'], ev.commands);
  const sid = ev.session = await newSession(kit, A, 'messaging lead', ev.commands);
  ev.steps.first = await botSends(kit, A, sid, engine, { to: B, text: 'messaging first between teammates', new_session: 'messaging first' }, ev.commands);
  await until('the first message at the recipient model', async () => (await framedSeen(kit, 'messaging first between teammates')).length > 0, { timeout: 180000, every: 1000 });
  return { engine, sid };
}

// model:messaging 2. Teammates A and B; A's first message to B leaves a first-message bridge, shown in the Bot threads sidebar; after B leaves
// the team, A still reaches B.
const firstMessageBridge = { id: 'messaging-model-first-message-bridge-survives-team-move', title: 'messaging R4, R5, teams E2: a first message between led teammates creates a first-message bridge, the Bot threads sidebar lists it, and after the member leaves the team the lead still reaches it', run: async (kit) => {
  const ev = { commands: [], steps: {} };
  try {
    const { engine, sid } = await teammatesBridged(kit, ev);
    ev.steps.link = link(kit); ev.steps.log = logLines(kit).map((m) => ({ id: m.id, kind: m.kind }));
    assert.ok(ev.steps.link, `no bridges/${A}--${B}/link.toml after the first message between teammates (messaging R4)`);
    assert.match(ev.steps.link, /^kind\s*=\s*"first-message"\s*$/m, 'link.toml kind is not "first-message" (messaging R5)');
    assert.match(ev.steps.link, new RegExp(`^by\\s*=\\s*"${A}"\\s*$`, 'm'), `link.toml by is not the sender ${A}`);
    assert.ok(ev.steps.log.length >= 1, 'log.jsonl holds no message');
    await windowStep(kit, ev, 'messaging-model-first-message-bridge-survives-team-move', async (w) => {
      await openBotThread(w, A, B); await w.waitFor('button', 'Bridge actions');
    });
    // B leaves the team (now unteamed): the bridge keeps A's reach (teams E2)
    writeTeam(kit, TEAM, A, []); await cliOk(kit, ['validate'], ev.commands); await sleep(1500);
    ev.steps.afterMove = await botSends(kit, A, sid, engine, { to: B, text: 'messaging after the move', new_session: 'messaging after move' }, ev.commands);
    await until('the message after the move at the recipient model', async () => (await framedSeen(kit, 'messaging after the move')).length > 0, { timeout: 180000, every: 1000 });
  } finally { saveJson(kit, 'messaging-model-first-message-bridge-survives-team-move', ev); }
} };

// model:messaging 2 (second path). After that move, the person disconnects A and B from their sidebar pair: A no longer reaches B, and the
// message log stays.
const disconnectEndsReach = { id: 'messaging-model-disconnect-ends-reach', title: 'messaging R4, R5, R7, teams E2: disconnecting the bridge opened from the sidebar after the member left the team removes link.toml but not log.jsonl, and the lead no longer reaches that bot', run: async (kit) => {
  const ev = { commands: [], steps: {} };
  try {
    let engine = firstEngine(kit); let sid;
    if (!link(kit)) { ({ engine, sid } = await teammatesBridged(kit, ev)); writeTeam(kit, TEAM, A, []); await cliOk(kit, ['validate'], ev.commands); }
    else sid = (await newSession(kit, A, 'messaging after move lead', ev.commands));
    const before = logLines(kit).length; ev.steps.logBefore = before;
    await windowStep(kit, ev, 'messaging-model-disconnect-ends-reach', async (w) => {
      await openBotThread(w, A, B);
      await w.click('button', 'Bridge actions'); await w.click('menuitem', 'Disconnect');
      await w.waitFor('dialog', 'Disconnect bots'); await w.click('button', 'Disconnect', { in: { role: 'dialog', name: 'Disconnect bots' } });
      await until('link.toml removed', async () => !link(kit), { timeout: 20000, every: 300 });
    });
    ev.steps.link = link(kit); ev.steps.logAfter = logLines(kit).length;
    assert.equal(ev.steps.link, null, 'link.toml is still there after Disconnect (messaging R4)');
    assert.ok(ev.steps.logAfter >= before && before > 0, 'the message log did not stay (messaging R4: DELETE removes the link, not the log)');
    ev.steps.afterDisconnect = await botSends(kit, A, sid, engine, { to: B, text: 'messaging after disconnect', new_session: 'messaging after disconnect' }, ev.commands);
    await sleep(8000);
    ev.steps.delivered = (await framedSeen(kit, 'messaging after disconnect')).length;
    assert.equal(ev.steps.delivered, 0, 'the lead still reached the bot after the disconnect (messaging R4, teams E2)');
    assert.equal(logLines(kit).length, ev.steps.logAfter, 'a refused send wrote a log entry (messaging R5)');
  } finally { saveJson(kit, 'messaging-model-disconnect-ends-reach', ev); }
} };

// ---- Each case names the broken implementation it catches; every wait is bounded and a timeout fails the
// case; observations go into the evidence as they are made.
const QUIET = 8000;
// The bridge log's messages: delivery updates merge by message id (messaging R5), so lines with one id are one message, later fields winning.
const pairLog = (kit, a, b) => {
  const f = join(kit.home, 'bridges', [a, b].sort().join('--'), 'log.jsonl'); if (!existsSync(f)) return [];
  const byId = new Map(); for (const l of readFileSync(f, 'utf8').trim().split('\n').filter(Boolean)) { const m = JSON.parse(l); byId.set(m.id, { ...byId.get(m.id), ...m }); }
  return [...byId.values()];
};
const framedFrom = async (kit, from, body) => (await kit.mock.requests()).filter((r) => { const u = lastUserText(r); return u.includes(`[from ${from}`) && (body === undefined || u.includes(body)) && !u.includes('MOCK_TOOL'); });
const sessionTitled = (kit, bot, title) => until(`the ${bot} session "${title}"`, async () => sessionIds(kit, bot).find((s) => s.meta.title === title), { timeout: 60000, every: 500 });

// Catches: a harness that sends the recipient's last plain text, an error notice or an abort notice back to the bot that wrote to
// it (an automatic reply), or logs such an entry in the bridge.
const turnEndSendsNothing = { id: 'messaging-turn-end-sends-nothing', title: 'messaging R5: when the recipient\'s turn ends in plain text, in a model error or in an abort, nothing reaches the bot that wrote to it and the bridge log gains no entry', run: async (kit) => {
  const engine = firstEngine(kit); const P = 'mpa'; const C = 'mpb'; const ev = { catches: 'an automatic reply of the last plain text, error or abort to the writing bot; a log entry for it', engine, commands: [], steps: [] };
  try {
    await mockBot(kit, P, engine, ev.commands); await mockBot(kit, C, engine, ev.commands); writeTeam(kit, 'mpt', P, [C]); await cliOk(kit, ['validate'], ev.commands);
    const sid = ev.session = await newSession(kit, P, 'messaging parent', ev.commands); let sends = 0;
    for (const [how, first, extra] of [['plain', 'messaging child plain text', ''], ['error', 'messaging child model error', '\nMOCK_FAIL'], ['abort', 'messaging child aborted', '\nMOCK_SLOW 120000']]) {
      const step = { how }; ev.steps.push(step);
      step.send = await botSends(kit, P, sid, engine, { to: C, text: `${first}${extra}`, new_session: `child ${how}` }, ev.commands); sends++;
      await until(`"${first}" at the recipient model`, async () => (await framedFrom(kit, P, first)).length > 0, { timeout: 180000, every: 500 });
      const child = await sessionTitled(kit, C, `child ${how}`); step.childSession = child.id;
      if (how === 'abort') { const a = await kit.api('POST', `/sessions/${C}/${child.id}/abort`); step.abort = a.status; assert.ok(a.status < 300, `abort returned ${a.status}`); }
      await until('the recipient turn settled', async () => !(await running(kit, C, child.id)), { timeout: 120000, every: 500 });
      await sleep(QUIET);
      step.backAtParent = (await framedFrom(kit, C)).length; step.logEntries = pairLog(kit, P, C).length;
      step.parentIncoming = (await detail(kit, P, sid)).incoming.length; step.parentSessions = sessionIds(kit, P).length;
      assert.equal(step.backAtParent, 0, `after the ${how} ending a message from ${C} reached a model (messaging R5)`);
      assert.equal(step.logEntries, sends, `after the ${how} ending the bridge log holds ${step.logEntries} entries for ${sends} explicit messages (messaging R5)`);
      assert.equal(step.parentIncoming, 0, `after the ${how} ending the writing session has incoming input`);
      assert.equal(step.parentSessions, 1, `after the ${how} ending the writing bot got another session`);
    }
  } finally { saveJson(kit, 'messaging-turn-end-sends-nothing', ev); }
} };

// Catches: a daemon that drops a message it accepted but could not send, or never sends it once the recipient can start again,
// and one that sends it again at every later start.
const unsentAtNextStart = { id: 'messaging-unsent-delivered-at-next-start', title: 'messaging R6: a bot message whose recipient could not start stays pending with its error, is delivered once at the next daemon start after the recipient is fixed, and a further restart does not send it again', run: async (kit) => {
  const engine = firstEngine(kit); const A = 'mua'; const B = 'mub'; const ev = { catches: 'an accepted but unsent message dropped or never sent at the next start; the same message sent again at a later start', engine, commands: [], steps: {} };
  const body = 'messaging unsent until the next start'; let restore;
  try {
    await mockBot(kit, A, engine, ev.commands); await mockBot(kit, B, engine, ev.commands);
    restore = refuseRecipientStart(kit, engine, A); writeTeam(kit, 'mut', A, [B]); await cliOk(kit, ['validate'], ev.commands);
    await restartDaemon(kit, ev.commands);
    const sid = ev.session = await newSession(kit, A, 'messaging unsent lead', ev.commands);
    ev.steps.send = await botSends(kit, A, sid, engine, { to: B, text: body, new_session: 'messaging unsent' }, ev.commands);
    const target = ev.steps.target = (await sessionTitled(kit, B, 'messaging unsent')).id;
    const pend = await until('the message pending with its error', async () => { const d = await detail(kit, B, target); return d.incoming.some((i) => i.error) ? d.incoming : null; }, { timeout: 120000, every: 1000 });
    ev.steps.pending = pend.map((i) => ({ id: i.id, state: i.state, error: i.error }));
    assert.ok(pend.length === 1 && pend[0].state === 'pending', `the unsent message is not one pending item: ${JSON.stringify(ev.steps.pending)}`);
    assert.equal((await framedFrom(kit, A, body)).length, 0, 'the message reached a model although the recipient could not start');
    const stopped = await stopRunDaemon(kit, ev.commands);
    restore(); restore = null; ev.steps.fixedWhileStopped = true;
    await startRunDaemon(kit, stopped, ev.commands);
    await until('the pending message at the recipient model after the start', async () => (await framedFrom(kit, A, body)).length > 0, { timeout: 180000, every: 1000 });
    const item = ev.steps.afterStart = await until('the message picked up', async () => { const d = await detail(kit, B, target); const i = d.incoming.find((x) => x.id === pend[0].id); return i && i.state === 'picked_up' ? i : null; }, { timeout: 120000, every: 1000 });
    assert.equal(item.state, 'picked_up');
    await until('the recipient turn settled', async () => !(await running(kit, B, target)), { timeout: 120000, every: 500 });
    await restartDaemon(kit, ev.commands); await sleep(QUIET);
    ev.steps.timesAtModel = (await framedFrom(kit, A, body)).length;
    assert.equal(ev.steps.timesAtModel, 1, `the message reached the recipient model ${ev.steps.timesAtModel} times, not once`);
  } finally {
    try { if (restore) { restore(); await restartDaemon(kit, ev.commands); } }
    catch (e) { ev.restoreError = e.message; }
    finally { saveJson(kit, 'messaging-unsent-delivered-at-next-start', ev); }
  }
} };

// Catches: a send to a bot that cannot start which the sender is told succeeded, which drops the message, or which marks it as
// uncertain although it was never sent.
const cannotStartSenderTold = { id: 'messaging-cannot-start-sender-told', title: 'messaging R6, E2: when the recipient cannot start, the sending bot\'s tool result says the message was not delivered, the message stays pending with its error at the recipient, and the bridge log keeps the error', run: async (kit) => {
  const engine = firstEngine(kit); const A = 'mca'; const B = 'mcb'; const ev = { catches: 'a send to a bot that cannot start reported as delivered, dropped, or marked uncertain although never sent', engine, commands: [], steps: {} };
  const body = 'messaging to a bot that cannot start'; let restore;
  try {
    await mockBot(kit, A, engine, ev.commands); await mockBot(kit, B, engine, ev.commands);
    restore = refuseRecipientStart(kit, engine, A); writeTeam(kit, 'mct', A, [B]); await cliOk(kit, ['validate'], ev.commands);
    await restartDaemon(kit, ev.commands);
    const sid = ev.session = await newSession(kit, A, 'messaging cannot start', ev.commands);
    const out = await botSends(kit, A, sid, engine, { to: B, text: body, new_session: 'messaging cannot start' }, ev.commands);
    const told = ev.steps.toolResultFirstLine = (/^done: (.*)$/m.exec(out) ?? [])[1] ?? null;
    assert.ok(told, `the sending turn shows no tool result: ${JSON.stringify(out.slice(0, 400))}`);
    assert.match(told, new RegExp(B), 'the tool result does not name the recipient');
    assert.match(told, /not delivered|unsent|not sent|nothing was sent|could not start/i, `the sender was not told the message was not delivered: ${told}`);
    const target = (await sessionTitled(kit, B, 'messaging cannot start')).id;
    const d = await until('the incoming item with its error', async () => { const x = await detail(kit, B, target); return x.incoming.some((i) => i.error) ? x : null; }, { timeout: 60000, every: 500 });
    ev.steps.incoming = d.incoming.map((i) => ({ id: i.id, state: i.state, error: i.error }));
    assert.ok(d.incoming.length === 1 && d.incoming[0].state === 'pending', `the never-sent message is not one pending item: ${JSON.stringify(ev.steps.incoming)} (messaging R6: definitely unsent stays pending)`);
    const lines = ev.steps.log = pairLog(kit, A, B).map((m) => ({ id: m.id, hasError: !!m.error }));
    assert.ok(lines.length === 1 && lines[0].hasError, `the bridge log does not keep the delivery error: ${JSON.stringify(lines)} (messaging E2)`);
    ev.steps.atModel = (await framedFrom(kit, A, body)).length; assert.equal(ev.steps.atModel, 0, 'the message reached a model');
  } finally {
    try { if (restore) { restore(); await restartDaemon(kit, ev.commands); } }
    catch (e) { ev.restoreError = e.message; }
    finally { saveJson(kit, 'messaging-cannot-start-sender-told', ev); }
  }
} };

export default { section: 'messaging', cases: [firstMessageBridge, disconnectEndsReach, turnEndSendsNothing, unsentAtNextStart, cannotStartSenderTold] };
