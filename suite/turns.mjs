// turns: the cases of the follow-up queue and the stopped-say and CLI-say rules.
// Each `-model-` case follows one path through the section's states step by step. Effect first: outbound items and what the model received, read through
// owner session detail (turns R5) and the mock.
// A case runs on the first engine the run selected; the stopped-say case runs once per selected engine (cli R6).
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { NotRun, cliOk, cliStream, detail, durable, firstEngine, holdTurn, missingEngine, mockBot, mockSaw, newId, newSession,
  openTerminal, attachedWithin, outboundItem, queueAction, restartDaemon, running, saveJson, seenWithin, selectedEngines, setEngineCommand, sleep,
  treeDiff, treeState, until } from './lib.mjs';

const QUIET = 8000;   // how long a case watches the model to show that nothing started

// The settled state of one outbound item: neither accepted nor dispatching (nothing left sending, turns R4, R5).
const settledItem = (kit, bot, sid, id) => until(`outbound ${id} settled`, async () => { const i = await outboundItem(kit, bot, sid, id); return i && !['accepted', 'dispatching'].includes(i.state) ? i : null; }, { timeout: 120000, every: 500 });

// model:turns 2. Send, queue a follow-up, the engine fails: the follow-up is kept and not started; a CLI say does not resume it
//; Steer on the queued item does.
const failKeepsFollowUp = { id: 'turns-model-failure-keeps-follow-up', title: 'turns R2, R3, R4, E1: a failed turn keeps the queued follow-up without starting it, a CLI say runs its own turn and leaves it paused, and Steer on the queued item resumes it', run: async (kit) => {
  const engine = firstEngine(kit); const bot = 'tfailq'; const ev = { engine, commands: [], steps: {} };
  try {
    await mockBot(kit, bot, engine, ev.commands); const sid = ev.session = await newSession(kit, bot, 'failure keeps follow-up', ev.commands);
    await holdTurn(kit, bot, sid, `turns failing ${engine}`, 6000, ev.commands, '\nMOCK_FAIL');
    const fu = `turns kept follow-up ${engine}`; const q = await durable(kit, bot, sid, 'followUp', fu, ev.commands);
    assert.ok(q.status < 300 && q.json?.item?.state === 'queued', `the follow-up during the turn was not queued: ${q.status} ${JSON.stringify(q.json)}`);
    // the turn fails; the follow-up stays queued and the model does not get it
    await until('the failed turn settled', async () => !(await running(kit, bot, sid)), { timeout: 120000, every: 500 });
    ev.steps.afterFailure = { started: await seenWithin(kit, fu, QUIET), item: await outboundItem(kit, bot, sid, q.id) };
    assert.equal(ev.steps.afterFailure.started, false, 'the follow-up started after the failed turn (turns R4)');
    assert.equal(ev.steps.afterFailure.item.state, 'queued', `the follow-up is ${ev.steps.afterFailure.item.state}, not kept queued`);
    // a plain CLI say runs its own turn and leaves the queue paused
    const own = `turns cli own turn ${engine}`; const out = await cliOk(kit, ['say', bot, '--session', sid, own], ev.commands, { timeout: 300000 });
    assert.match(out, new RegExp(`echo: ${own}`));
    ev.steps.afterCliSay = { started: await seenWithin(kit, fu, QUIET), item: await outboundItem(kit, bot, sid, q.id) };
    assert.equal(ev.steps.afterCliSay.started, false, 'a CLI say resumed the paused follow-up (turns R4)');
    assert.equal(ev.steps.afterCliSay.item.state, 'queued');
    // Steer on the queued item resumes (R3, R4)
    const st = await queueAction(kit, bot, sid, q.id, { action: 'steer' }, ev.commands);
    assert.ok(st.status < 300, `Steer on the queued follow-up returned ${st.status}: ${st.text}`);
    await until('the steered follow-up at the model', async () => (await mockSaw(kit, fu)).length > 0, { timeout: 180000, every: 1000 });
    ev.steps.final = await settledItem(kit, bot, sid, q.id);
    assert.ok(['picked_up', 'handled'].includes(ev.steps.final.state), `the steered follow-up is ${ev.steps.final.state}`);
  } finally { saveJson(kit, 'turns-model-failure-keeps-follow-up', ev); }
} };

// model:turns 3 and 3 (delete). The head under edit blocks; releasing it (Cancel or Save) starts it, deleting it starts the next.
const editRelease = (how) => ({ id: `turns-model-edit-${how}-starts`, title: how === 'delete'
  ? 'turns R2, R3: with two follow-ups queued and the first under edit when the turn ends, nothing starts; deleting the held first follow-up from the window that holds its edit, while idle, starts the second'
  : `turns R2, R3: a follow-up under edit when the turn ends does not start; ${how === 'cancel' ? 'Cancel' : 'Save'} on it while idle starts it`, run: async (kit) => {
  const engine = firstEngine(kit); const bot = `tedit${how}`; const ev = { engine, how, commands: [], steps: {} };
  try {
    await mockBot(kit, bot, engine, ev.commands); const sid = ev.session = await newSession(kit, bot, `edit ${how}`, ev.commands);
    await holdTurn(kit, bot, sid, `turns edit hold ${how} ${engine}`, 6000, ev.commands);
    const first = `turns head ${how} ${engine}`; const second = `turns second ${how} ${engine}`;
    const a = await durable(kit, bot, sid, 'followUp', first, ev.commands); assert.equal(a.json?.item?.state, 'queued', `first follow-up: ${JSON.stringify(a.json)}`);
    const b = how === 'delete' ? await durable(kit, bot, sid, 'followUp', second, ev.commands) : null; if (b) assert.equal(b.json?.item?.state, 'queued');
    const token = newId();
    const ed = await queueAction(kit, bot, sid, a.id, { action: 'edit', edit: token }, ev.commands); assert.ok(ed.status < 300, `edit returned ${ed.status}: ${ed.text}`);
    await until('the held turn settled', async () => !(await running(kit, bot, sid)), { timeout: 120000, every: 500 });
    ev.steps.idleWithEdit = { firstStarted: await seenWithin(kit, first, QUIET), secondStarted: b ? (await mockSaw(kit, second)).length > 0 : null };
    assert.equal(ev.steps.idleWithEdit.firstStarted, false, 'the follow-up under edit started (turns R2)');
    if (b) assert.equal(ev.steps.idleWithEdit.secondStarted, false, 'the second follow-up overtook the held head (turns R2)');
    const body = how === 'delete' ? { action: 'delete', edit: token } : how === 'save' ? { action: 'save', edit: token, text: `${first} saved` } : { action: 'cancel', edit: token };
    const rel = await queueAction(kit, bot, sid, a.id, body, ev.commands); assert.ok(rel.status < 300, `${how} returned ${rel.status}: ${rel.text}`);
    const want = how === 'delete' ? second : how === 'save' ? `${first} saved` : first;
    await until(`"${want}" at the model after ${how}`, async () => (await mockSaw(kit, want)).length > 0, { timeout: 60000, every: 500 });
    ev.steps.final = (await detail(kit, bot, sid)).outbound.map((i) => ({ id: i.id, state: i.state }));
    if (how === 'delete') assert.equal((await outboundItem(kit, bot, sid, a.id)).state, 'cancelled', 'the deleted follow-up is not cancelled (turns R3)');
  } finally { saveJson(kit, `turns-model-edit-${how}-starts`, ev); }
} });

// model:turns 5. The head under edit, the turn ends, a terminal opens on the session, the edit is saved: nothing starts while the
// terminal holds it (turns R2; terminal-chat R2), and the handoff paused the follow-up (turns R4).
const terminalHolds = { id: 'turns-model-terminal-holds-saved-edit', title: 'turns R2, R4, terminal-chat R2: saving the held follow-up while a terminal holds the idle session starts nothing, and after the terminal closes it still waits for a Send', run: async (kit) => {
  const engine = 'pi'; const bot = 'tterm'; const ev = { engine, commands: [], steps: {} };
  if (!selectedEngines(kit).includes('pi')) throw new NotRun('terminal chat on Pi needs the pi adapter in this run');
  let term;
  try {
    await mockBot(kit, bot, engine, ev.commands); const sid = ev.session = await newSession(kit, bot, 'terminal holds', ev.commands);
    await holdTurn(kit, bot, sid, 'turns terminal hold', 6000, ev.commands);
    const fu = 'turns held under terminal'; const a = await durable(kit, bot, sid, 'followUp', fu, ev.commands); assert.equal(a.json?.item?.state, 'queued');
    const token = newId(); assert.ok((await queueAction(kit, bot, sid, a.id, { action: 'edit', edit: token }, ev.commands)).status < 300);
    await until('the held turn settled', async () => !(await running(kit, bot, sid)), { timeout: 120000, every: 500 });
    term = openTerminal(kit, bot, sid); ev.steps.terminal = term.argv.slice(-3);
    await attachedWithin(kit, bot, sid, true);
    const sv = await queueAction(kit, bot, sid, a.id, { action: 'save', edit: token, text: `${fu} saved` }, ev.commands);
    ev.steps.save = { status: sv.status };
    ev.steps.whileAttached = { started: await seenWithin(kit, `${fu} saved`, QUIET), item: await outboundItem(kit, bot, sid, a.id) };
    assert.equal(ev.steps.whileAttached.started, false, 'the saved follow-up started while a terminal holds the session');
    assert.equal(ev.steps.whileAttached.item.state, 'queued');
    ev.steps.terminalExit = await term.close(); await attachedWithin(kit, bot, sid, false);
    ev.steps.afterClose = { started: await seenWithin(kit, `${fu} saved`, QUIET) };
    assert.equal(ev.steps.afterClose.started, false, 'the follow-up started after the terminal closed without a Send (turns R4: the handoff paused it)');
    const send = await durable(kit, bot, sid, 'steer', 'turns send after terminal', ev.commands); assert.ok(send.status < 300 && send.json?.item);
    await until('the follow-up after the Send', async () => (await mockSaw(kit, `${fu} saved`)).length > 0, { timeout: 180000, every: 1000 });
  } finally { if (term) { ev.steps.screenTail = term.screen().slice(-600); await term.close(); } saveJson(kit, 'turns-model-terminal-holds-saved-edit', ev); }
} };

// cli R6: a waiting say whose turn is stopped exits 1, says `stopped` on stderr and keeps what it streamed.
const stoppedSay = (engine) => ({ id: `turns-stopped-say-exits-1-${engine}`, title: `cli R6, turns R4: on ${engine === 'pi' ? 'Pi' : 'Claude Code'}, a waiting say whose turn is stopped keeps the streamed stdout, reports stopped on stderr and exits 1`, run: async (kit) => {
  if (!selectedEngines(kit).includes(engine)) throw new NotRun(`${engine} is not a selected adapter of this run`);
  const bot = `tstop${engine}`; const ev = { engine, commands: [], steps: {} };
  try {
    await mockBot(kit, bot, engine, ev.commands); const sid = ev.session = await newSession(kit, bot, 'stopped say', ev.commands);
    const reply = 'turns stopped reply that streams slowly and never finishes before the stop';
    const p = cliStream(kit, ['say', bot, '--session', sid, `turns stop ask ${engine}\nMOCK_STREAM 400 ${Buffer.from(reply).toString('base64')}`]);
    // stop once some of the reply has streamed (the model sends one character every 400 ms)
    await until('the reply started streaming', async () => (await mockSaw(kit, `turns stop ask ${engine}`)).length > 0, { timeout: 240000, every: 300 });
    await sleep(6000);
    const stop = await kit.api('POST', `/sessions/${bot}/${sid}/abort`); ev.steps.abort = { status: stop.status };
    assert.ok(stop.status < 300, `abort returned ${stop.status}`);
    const r = await p; ev.commands.push({ argv: ['myharness', 'say', bot, '--session', sid, '<stream>'], exit: r.code, ms: r.ms, stdout: r.stdout, stderr: r.stderr });
    assert.equal(r.code, 1, `the stopped say exited ${r.code}, not 1 (cli R6)`);
    assert.match(r.stderr, /stopped/, 'stderr has no diagnostic containing "stopped"');
    assert.ok(r.stdout.trim().length > 0 && reply.startsWith(r.stdout.trim()), `the streamed stdout was not kept as a prefix of the reply: ${JSON.stringify(r.stdout)}`);
    assert.ok(r.stdout.trim().length < reply.length, 'the whole reply arrived: the turn was not stopped mid-stream');
  } finally { saveJson(kit, `turns-stopped-say-exits-1-${engine}`, ev); }
} });

// turns R4: after a Stop, a CLI say runs its own turn and leaves the follow-up paused; the app's Send resumes it.
const cliSayLeavesPaused = { id: 'turns-cli-say-leaves-queue-paused', title: 'turns R1, R4, cli R6: after Stop, a CLI say runs and settles its own turn while the queued follow-up stays paused, and a durable Send resumes it', run: async (kit) => {
  const engine = firstEngine(kit); const bot = 'tclisay'; const ev = { engine, commands: [], steps: {} };
  try {
    await mockBot(kit, bot, engine, ev.commands); const sid = ev.session = await newSession(kit, bot, 'cli say paused', ev.commands);
    await holdTurn(kit, bot, sid, `turns stop hold ${engine}`, 120000, ev.commands);
    const fu = `turns paused follow-up ${engine}`; const q = await durable(kit, bot, sid, 'followUp', fu, ev.commands); assert.equal(q.json?.item?.state, 'queued');
    const stop = await kit.api('POST', `/sessions/${bot}/${sid}/abort`); assert.ok(stop.status < 300, `abort returned ${stop.status}`);
    await until('the stopped turn settled', async () => !(await running(kit, bot, sid)), { timeout: 60000, every: 500 });
    const own = `turns cli after stop ${engine}`; const out = await cliOk(kit, ['say', bot, '--session', sid, own], ev.commands, { timeout: 300000 });
    assert.match(out, new RegExp(`echo: ${own}`), 'the CLI say did not run its own turn');
    ev.steps.afterCliSay = { started: await seenWithin(kit, fu, QUIET), item: await outboundItem(kit, bot, sid, q.id) };
    assert.equal(ev.steps.afterCliSay.started, false, 'the CLI say resumed the paused follow-up');
    assert.equal(ev.steps.afterCliSay.item.state, 'queued');
    const send = await durable(kit, bot, sid, 'steer', `turns send resumes ${engine}`, ev.commands); assert.ok(send.status < 300 && send.json?.item);
    await until('the follow-up after the Send', async () => (await mockSaw(kit, fu)).length > 0, { timeout: 180000, every: 1000 });
    ev.steps.final = await settledItem(kit, bot, sid, q.id);
  } finally { saveJson(kit, 'turns-cli-say-leaves-queue-paused', ev); }
} };

// ---- Restart, races, recovery and the app recovery copies. Each case names the broken implementation it
// catches. A case passes only on an outcome it observed: every wait is bounded and a timeout fails it; evidence is written as it
// is collected (ev is saved in the finally, and a loop pushes each observation before it asserts).
const count = async (kit, needle) => (await mockSaw(kit, needle)).length;
const outboundOf = async (kit, bot, sid) => (await detail(kit, bot, sid)).outbound.map((i) => ({ id: i.id, mode: i.mode, text: i.text, state: i.state, error: i.error ?? null }));

// Catches: a daemon that loses queued follow-ups at restart, one that starts them by itself after the restart, one that sends the
// picked-up input to the model again, and one whose restart erases the record that the input was picked up.
const restartKeepsQueue = { id: 'turns-restart-keeps-queue-without-replay', title: 'turns R4, R5: a daemon restart during a turn keeps the queued follow-ups in order and the picked-up record, starts nothing by itself and replays nothing, and a Send then runs each follow-up once', run: async (kit) => {
  const engine = firstEngine(kit); const bot = 'trestart'; const ev = { catches: 'queued follow-ups lost at restart; follow-ups started by the restart; the picked-up input replayed; the picked-up record erased', engine, commands: [], steps: {} };
  try {
    await mockBot(kit, bot, engine, ev.commands); const sid = ev.session = await newSession(kit, bot, 'restart keeps queue', ev.commands);
    const held = `turns restart held ${engine}`; const h = await holdTurn(kit, bot, sid, held, 120000, ev.commands);
    const f1 = `turns restart first ${engine}`; const f2 = `turns restart second ${engine}`;
    const q1 = await durable(kit, bot, sid, 'followUp', f1, ev.commands); const q2 = await durable(kit, bot, sid, 'followUp', f2, ev.commands);
    assert.equal(q1.json?.item?.state, 'queued', `first follow-up: ${JSON.stringify(q1.json)}`); assert.equal(q2.json?.item?.state, 'queued', `second follow-up: ${JSON.stringify(q2.json)}`);
    const heldItem = await until('the held input picked up', async () => { const i = await outboundItem(kit, bot, sid, h.id); return i && ['picked_up', 'handled'].includes(i.state) ? i : null; }, { timeout: 60000, every: 500 });
    ev.steps.before = { outbound: await outboundOf(kit, bot, sid), heldAtModel: await count(kit, held) };
    await restartDaemon(kit, ev.commands);
    const after = ev.steps.afterRestart = { outbound: await outboundOf(kit, bot, sid) };
    const ids = after.outbound.map((i) => i.id);
    assert.deepEqual(ids.filter((x) => [h.id, q1.id, q2.id].includes(x)), [h.id, q1.id, q2.id], `after the restart outbound lost or reordered the items: ${JSON.stringify(after.outbound)}`);
    assert.equal(after.outbound.length, ev.steps.before.outbound.length, 'the restart added or removed outbound items');
    const hAfter = after.outbound.find((i) => i.id === h.id);
    assert.ok(['picked_up', 'handled'].includes(hAfter.state), `the picked-up input is ${hAfter.state} after the restart, was ${heldItem.state} (turns R5: a later failure does not erase pickup)`);
    for (const q of [q1, q2]) assert.equal(after.outbound.find((i) => i.id === q.id).state, 'queued', `follow-up ${q.id} is not queued after the restart`);
    ev.steps.quiet = { f1: await seenWithin(kit, f1, QUIET), f2: await count(kit, f2), held: await count(kit, held) };
    assert.equal(ev.steps.quiet.f1, false, 'a follow-up started by itself after the restart (turns R5: advancement is paused)');
    assert.equal(ev.steps.quiet.f2, 0, 'the second follow-up started by itself after the restart');
    assert.equal(ev.steps.quiet.held, ev.steps.before.heldAtModel, 'the picked-up input reached the model again after the restart (turns R5: never auto-replay)');
    ev.steps.queuedAfterQuiet = (await outboundOf(kit, bot, sid)).filter((i) => [q1.id, q2.id].includes(i.id)).map((i) => i.state);
    assert.deepEqual(ev.steps.queuedAfterQuiet, ['queued', 'queued']);
    const send = await durable(kit, bot, sid, 'steer', `turns restart send ${engine}`, ev.commands); assert.ok(send.status < 300 && send.json?.item, `the Send was not accepted: ${send.status}`);
    await until('the second follow-up at the model', async () => (await count(kit, f2)) > 0, { timeout: 240000, every: 1000 });
    await until('the queue settled', async () => !(await running(kit, bot, sid)), { timeout: 120000, every: 500 });
    ev.steps.final = { outbound: await outboundOf(kit, bot, sid), f1: await count(kit, f1), f2: await count(kit, f2), held: await count(kit, held) };
    assert.deepEqual([ev.steps.final.f1, ev.steps.final.f2], [1, 1], 'a follow-up reached the model more or less than once after the Send');
    assert.equal(ev.steps.final.held, ev.steps.before.heldAtModel, 'the picked-up input was replayed after the Send');
  } finally { saveJson(kit, 'turns-restart-keeps-queue-without-replay', ev); }
} };

// Catches: a daemon that makes a second input for a repeated id, one that dispatches a repeated id again after its first dispatch
// (also after a restart), and one that lets a queue action on an already dispatched item make a new item or start a turn.
const repeatedIdOnce = { id: 'turns-repeated-id-accepted-once', title: 'turns R1, R3, R5: a repeated input id returns the existing item and makes no second input, before and after dispatch and after a daemon restart; queue actions on a dispatched item are conflicts that create nothing', run: async (kit) => {
  const engine = firstEngine(kit); const bot = 'trepeat'; const ev = { catches: 'a second input for a repeated id; a repeated id dispatched again (also after a restart); a queue action on a dispatched item that creates an item or starts a turn', engine, commands: [], steps: {}, repeats: [] };
  const again = async (id, mode, text, label) => {
    const r = await kit.api('POST', `/sessions/${bot}/${ev.session}/say`, { id, mode, text });
    const seen = { label, id, status: r.status, item: r.json?.item ?? null }; ev.repeats.push(seen); return seen;
  };
  try {
    await mockBot(kit, bot, engine, ev.commands); const sid = ev.session = await newSession(kit, bot, 'repeated id', ev.commands);
    const t1 = `turns repeat first ${engine}`; const x = newId(); const body1 = `${t1}\nMOCK_SLOW 10000`;
    const first = await kit.api('POST', `/sessions/${bot}/${sid}/say`, { id: x, mode: 'steer', text: body1 }); ev.commands.push({ api: 'say', id: x, status: first.status, json: first.json ?? null });
    assert.ok(first.status < 300 && first.json?.item?.id === x, `the first input was not accepted with its id: ${first.status} ${JSON.stringify(first.json)}`);
    const r1 = await again(x, 'steer', body1, 'same id, at once');
    assert.ok(r1.status < 300 && r1.item?.id === x, `repeating the id did not return the existing item: ${JSON.stringify(r1)} (turns R1)`);
    await until('the first input at the model', async () => (await count(kit, t1)) > 0, { timeout: 120000, every: 300 });
    const fu = `turns repeat follow-up ${engine}`; const y = newId();
    const q = await kit.api('POST', `/sessions/${bot}/${sid}/say`, { id: y, mode: 'followUp', text: fu }); ev.commands.push({ api: 'say', id: y, status: q.status, json: q.json ?? null });
    assert.equal(q.json?.item?.state, 'queued', `the follow-up was not queued: ${q.status} ${JSON.stringify(q.json)}`);
    const r2 = await again(y, 'followUp', fu, 'queued id repeated');
    assert.ok(r2.status < 300 && r2.item?.id === y && r2.item?.state === 'queued', `repeating the queued id did not return the queued item: ${JSON.stringify(r2)}`);
    ev.steps.whileRunning = await outboundOf(kit, bot, sid);
    assert.equal(ev.steps.whileRunning.filter((i) => i.id === x).length + ev.steps.whileRunning.filter((i) => i.id === y).length, 2, 'outbound holds a repeated id twice');
    assert.equal(ev.steps.whileRunning.length, 2, `outbound holds more than the two inputs: ${JSON.stringify(ev.steps.whileRunning)}`);
    // the turn ends, the free head starts and settles
    await until('the follow-up at the model', async () => (await count(kit, fu)) > 0, { timeout: 180000, every: 500 });
    await until('the session settled', async () => !(await running(kit, bot, sid)), { timeout: 120000, every: 500 });
    const dispatched = ev.steps.dispatched = await outboundOf(kit, bot, sid);
    for (const id of [x, y]) assert.ok(['picked_up', 'handled'].includes(dispatched.find((i) => i.id === id)?.state), `input ${id} is not picked up: ${JSON.stringify(dispatched)}`);
    for (const [id, mode, text] of [[x, 'steer', body1], [y, 'followUp', fu]]) {
      const r = await again(id, mode, text, 'after dispatch');
      assert.ok(r.status < 300 && r.item?.id === id && ['picked_up', 'handled'].includes(r.item?.state), `repeating ${id} after dispatch did not return the dispatched item: ${JSON.stringify(r)}`);
    }
    for (const body of [{ action: 'steer' }, { action: 'delete' }, { action: 'edit', edit: newId() }, { action: 'save', edit: newId(), text: 'turns repeat stale save' }]) {
      const r = await queueAction(kit, bot, sid, y, body, ev.commands);
      assert.equal(r.status, 409, `${body.action} on the dispatched follow-up returned ${r.status}, not a conflict (turns R3: a stale action is a conflict)`);
    }
    ev.steps.quiet = { first: await count(kit, t1), followUp: await count(kit, fu), stale: await seenWithin(kit, 'turns repeat stale save', QUIET) };
    assert.deepEqual([ev.steps.quiet.first, ev.steps.quiet.followUp, ev.steps.quiet.stale], [1, 1, false], `a repeated id or a stale action reached the model: ${JSON.stringify(ev.steps.quiet)}`);
    assert.deepEqual((await outboundOf(kit, bot, sid)).map((i) => i.id), [x, y], 'a repeated id or a stale action created an outbound item');
    await restartDaemon(kit, ev.commands);
    for (const [id, mode, text] of [[x, 'steer', body1], [y, 'followUp', fu]]) {
      const r = await again(id, mode, text, 'after the restart');
      assert.ok(r.status < 300 && r.item?.id === id && ['picked_up', 'handled'].includes(r.item?.state), `repeating ${id} after the restart did not return the dispatched item: ${JSON.stringify(r)}`);
    }
    await sleep(QUIET);
    ev.steps.afterRestart = { outbound: await outboundOf(kit, bot, sid), first: await count(kit, t1), followUp: await count(kit, fu) };
    assert.deepEqual([ev.steps.afterRestart.first, ev.steps.afterRestart.followUp], [1, 1], 'a repeated id was dispatched again after the restart');
    assert.deepEqual(ev.steps.afterRestart.outbound.map((i) => i.id), [x, y], 'the restart or a repeat created an outbound item');
  } finally { saveJson(kit, 'turns-repeated-id-accepted-once', ev); }
} };

// Catches: a queue whose promote/delete or edit claims are checked and then written in separate steps, so that two racing requests
// both succeed (a deleted item still sent, an item sent twice, or two windows both holding the edit).
const RACERS = 8;
const raceOneWinner = { id: 'turns-queue-race-one-winner', title: 'turns R3, E2: racing Steer and Delete requests on one queued follow-up, and racing edit requests with different tokens, each have exactly one winner; the others are conflicts and the outcome matches the winner', run: async (kit) => {
  const engine = firstEngine(kit); const bot = 'trace'; const ev = { catches: 'promote/delete or edit claims that two racing requests both win', engine, commands: [], steps: {}, races: [] };
  const race = async (label, id, bodies) => {
    const r = { label, item: id, answers: [] }; ev.races.push(r);
    await Promise.all(bodies.map((b, n) => kit.api('POST', `/sessions/${bot}/${ev.session}/queue/${id}`, b).then((x) => { r.answers.push({ n, action: b.action, status: x.status }); })));
    return r.answers;
  };
  try {
    await mockBot(kit, bot, engine, ev.commands); const sid = ev.session = await newSession(kit, bot, 'queue race', ev.commands);
    await holdTurn(kit, bot, sid, `turns race hold ${engine}`, 45000, ev.commands);
    // round 1: Steer and Delete racing on one queued item
    const fu = `turns race item ${engine}`; const q = await durable(kit, bot, sid, 'followUp', fu, ev.commands); assert.equal(q.json?.item?.state, 'queued');
    const a1 = await race('steer and delete', q.id, Array.from({ length: RACERS }, (_, n) => ({ action: n % 2 ? 'delete' : 'steer' })));
    const wins = a1.filter((x) => x.status < 300); const others = a1.filter((x) => x.status >= 300);
    assert.equal(wins.length, 1, `${wins.length} racing Steer/Delete requests succeeded, not exactly one (turns R3, E2): ${JSON.stringify(a1)}`);
    assert.ok(others.every((x) => x.status === 409), `a losing request was not a conflict: ${JSON.stringify(others)}`);
    const winner = wins[0].action; ev.steps.round1Winner = winner;
    // round 2: two edit tokens racing on another queued item
    const fu2 = `turns race edit ${engine}`; const q2 = await durable(kit, bot, sid, 'followUp', fu2, ev.commands); assert.equal(q2.json?.item?.state, 'queued');
    const a2 = await race('edit tokens', q2.id, Array.from({ length: RACERS }, () => ({ action: 'edit', edit: newId() })));
    const editWins = a2.filter((x) => x.status < 300);
    assert.equal(editWins.length, 1, `${editWins.length} racing edits with different tokens succeeded, not exactly one (turns R3: another window's token conflicts): ${JSON.stringify(a2)}`);
    assert.ok(a2.filter((x) => x.status >= 300).every((x) => x.status === 409), `a losing edit was not a conflict: ${JSON.stringify(a2)}`);
    // the outcome matches the winner of round 1: a deleted item never reaches the model; a steered one reaches it once
    const item = ev.steps.round1Item = await until('the raced item settled', async () => { const i = await outboundItem(kit, bot, sid, q.id); return i && !['accepted', 'dispatching', 'queued'].includes(i.state) ? i : null; }, { timeout: 120000, every: 500 });
    if (winner === 'delete') {
      assert.equal(item.state, 'cancelled', `Delete won but the item is ${item.state}`);
      await until('the held turn settled', async () => !(await running(kit, bot, sid)), { timeout: 120000, every: 500 });
      ev.steps.deletedSeen = await seenWithin(kit, fu, QUIET); assert.equal(ev.steps.deletedSeen, false, 'the deleted item reached the model');
    } else {
      await until('the steered item at the model', async () => (await count(kit, fu)) > 0, { timeout: 120000, every: 500 });
      await until('the session settled', async () => !(await running(kit, bot, sid)), { timeout: 180000, every: 500 });
      ev.steps.steeredSeen = await count(kit, fu); assert.equal(ev.steps.steeredSeen, 1, 'the steered item reached the model more than once');
      assert.ok(['picked_up', 'handled'].includes((await outboundItem(kit, bot, sid, q.id)).state), 'Steer won but the item was not picked up');
    }
    ev.steps.outbound = await outboundOf(kit, bot, sid);
    assert.equal(ev.steps.outbound.filter((i) => i.text === fu).length, 1, 'the race created another item with the raced text');
    assert.equal(ev.steps.outbound.find((i) => i.id === q2.id)?.state, 'queued', 'the item under the won edit did not stay queued');
  } finally { saveJson(kit, 'turns-queue-race-one-winner', ev); }
} };

// Catches: a launch failure shown as success or left sending; a failed input replayed by itself at restart; a Retry that keeps the
// old item next to the new one, sends twice for a repeated retry id, or is replayed again after the next restart.
const startupFailureRetry = { id: 'turns-startup-failure-retry-once', title: 'turns R4, R5, R6, bots E3: a Send whose engine cannot start ends failed with an error and is not replayed after a restart; Retry with a new id cancels it and makes one steering item in the same step, a repeated retry id makes nothing more, and the next restart replays nothing', run: async (kit) => {
  const engine = firstEngine(kit); const bot = 'tretry'; const ev = { catches: 'a launch failure reported as success or left sending; a failed input replayed at restart; a Retry that keeps the old item, sends twice for a repeated id, or replays after a restart', engine, commands: [], steps: {} };
  let restore;
  try {
    await mockBot(kit, bot, engine, ev.commands); const sid = ev.session = await newSession(kit, bot, 'startup failure', ev.commands);
    restore = setEngineCommand(kit, engine, [missingEngine(kit)]); await restartDaemon(kit, ev.commands); ev.steps.engine = 'missing command';
    const text = `turns startup failure ${engine}`; const s = await durable(kit, bot, sid, 'steer', text, ev.commands);
    assert.ok(s.status < 300 || s.status >= 500, `the Send got ${s.status}`);
    const failed = ev.steps.failed = await until('the input settled after the launch failure', async () => { const i = await outboundItem(kit, bot, sid, s.id); return i && !['accepted', 'dispatching'].includes(i.state) ? i : null; }, { timeout: 120000, every: 500 });
    assert.equal(failed.state, 'failed', `an input that never reached an engine is ${failed.state}, not failed (turns R4, R5)`);
    assert.ok(failed.error, 'the failed input has no error');
    restore(); restore = null; await restartDaemon(kit, ev.commands);
    ev.steps.afterRestart = { item: await outboundItem(kit, bot, sid, s.id), seen: await seenWithin(kit, text, QUIET) };
    assert.equal(ev.steps.afterRestart.seen, false, 'the failed input was sent by itself after the restart (turns R5)');
    assert.equal(ev.steps.afterRestart.item.state, 'failed', `the failed input is ${ev.steps.afterRestart.item.state} after the restart`);
    const z = newId(); const retry = (id) => kit.api('POST', `/sessions/${bot}/${sid}/outbound/${s.id}/retry`, { id });
    const r1 = await retry(z); ev.commands.push({ api: 'retry', id: z, status: r1.status, json: r1.json ?? null });
    assert.ok(r1.status < 300, `Retry returned ${r1.status}: ${r1.text}`);
    const atRetry = ev.steps.atRetry = await outboundOf(kit, bot, sid);
    assert.equal(atRetry.find((i) => i.id === s.id)?.state, 'cancelled', `after Retry the old input is ${atRetry.find((i) => i.id === s.id)?.state}, not cancelled (turns R6)`);
    const fresh = atRetry.find((i) => i.id === z); assert.ok(fresh && fresh.mode === 'steer' && fresh.text === text, `Retry made no steering item ${z} with the text: ${JSON.stringify(atRetry)}`);
    const r2 = await retry(z); ev.commands.push({ api: 'retry again', id: z, status: r2.status, json: r2.json ?? null });
    assert.ok(r2.status < 300 || r2.status === 409, `repeating the retry id returned ${r2.status}`);
    await until('the retried input at the model', async () => (await count(kit, text)) > 0, { timeout: 180000, every: 500 });
    await until('the retried turn settled', async () => !(await running(kit, bot, sid)), { timeout: 120000, every: 500 });
    ev.steps.afterRetry = { outbound: await outboundOf(kit, bot, sid), seen: await count(kit, text) };
    assert.equal(ev.steps.afterRetry.seen, 1, 'the retried input reached the model more than once');
    assert.equal(ev.steps.afterRetry.outbound.length, 2, `outbound holds other items than the old and the retried input: ${JSON.stringify(ev.steps.afterRetry.outbound)}`);
    await restartDaemon(kit, ev.commands); await sleep(QUIET);
    ev.steps.afterSecondRestart = { outbound: await outboundOf(kit, bot, sid), seen: await count(kit, text) };
    assert.equal(ev.steps.afterSecondRestart.seen, 1, 'the retried input was replayed after the restart');
    assert.ok(['picked_up', 'handled'].includes(ev.steps.afterSecondRestart.outbound.find((i) => i.id === z)?.state), 'the restart erased the pickup of the retried input');
    assert.equal(ev.steps.afterSecondRestart.outbound.find((i) => i.id === s.id)?.state, 'cancelled');
  } finally {
    if (restore) { try { restore(); await restartDaemon(kit, ev.commands); } catch (e) { ev.restoreError = e.message; } }
    saveJson(kit, 'turns-startup-failure-retry-once', ev);
  }
} };

// Catches: an app recovery store that accepts a scope that is not two plain parts (so a name can reach another file), follows a
// symlinked file or directory out of the home, writes copies readable by others, or writes anything outside the home.
const BAD_SCOPES = ['solo', 'a/b/c', '../x', 'a/..', '/a/b', 'a/b/', 'a b/c', 'a/b.json', 'a/%2e%2e', 'é/b', `${'a'.repeat(100)}/${'b'.repeat(100)}`, ''];
const appOutboxConfined = { id: 'turns-app-outbox-confined', title: 'turns R8: app-outbox scopes that are not two plain parts of at most 200 characters, items for another scope, and a symlinked directory or file are refused with 409 and write nothing; the directory is 0700, the files 0600, and nothing is written outside the home', run: async (kit) => {
  const engine = firstEngine(kit); const bot = 'toutbox'; const ev = { catches: 'a scope that is not two plain parts accepted; a symlinked file or directory followed; copies readable by others; writes outside the home', engine, commands: [], steps: {}, refusals: [] };
  const dir = join(kit.home, 'log', 'app-outbox'); const outside = join(kit.root, 'outbox-outside');
  const post = async (body, label) => { const r = await kit.api('POST', '/app-outbox', body); const x = { label, scope: body.scope, action: body.action, status: r.status }; ev.refusals.push(x); return x; };
  const outsideState = () => treeState(kit.root, (r) => r === 'home' || r === 'logs' || r === 'tmp');
  let movedDir;
  try {
    await mockBot(kit, bot, engine, ev.commands); const sid = ev.session = await newSession(kit, bot, 'outbox', ev.commands);
    const scope = `${bot}/${sid}`; const item = (sc, s2 = sc) => ({ id: newId(), scope: s2, text: `turns outbox ${sc}`, files: [] });
    const ok = await kit.api('POST', '/app-outbox', { scope, action: 'put', item: item(scope) }); ev.steps.validPut = ok.status;
    assert.ok(ok.status < 300, `a valid put returned ${ok.status}: ${ok.text}`);
    const file = join(dir, `${encodeURIComponent(scope)}.json`); assert.ok(existsSync(file), `no recovery file at ${file}`);
    ev.steps.modes = { dir: (statSync(dir).mode & 0o777).toString(8), file: (statSync(file).mode & 0o777).toString(8) };
    assert.deepEqual(ev.steps.modes, { dir: '700', file: '600' }, 'the recovery directory is not 0700 or a file is not 0600 (turns R8)');
    mkdirSync(outside, { recursive: true }); writeFileSync(join(outside, 'target.json'), '{"inputs":[]}\n');
    const homeBefore = treeState(kit.home, (r) => r === '.git' || r === 'log/daemon.json'); const outBefore = outsideState();
    for (const bad of BAD_SCOPES) for (const action of ['put', 'read', 'draft', 'delete']) {
      const body = { scope: bad, action, ...(action === 'put' ? { item: item(bad) } : action === 'draft' ? { item: { text: 'turns outbox draft', files: [] } } : {}) };
      const r = await post(body, 'bad scope'); assert.equal(r.status, 409, `scope ${JSON.stringify(bad)} ${action} returned ${r.status}, not 409 (turns R8)`);
    }
    const mismatch = await post({ scope, action: 'put', item: item(scope, `${bot}/other`) }, 'item for another scope');
    assert.equal(mismatch.status, 409, `an item whose scope differs from the request returned ${mismatch.status}`);
    ev.steps.afterBadScopes = { home: treeDiff(homeBefore, treeState(kit.home, (r) => r === '.git' || r === 'log/daemon.json')), outside: treeDiff(outBefore, outsideState()) };
    assert.deepEqual(ev.steps.afterBadScopes.home, { added: [], removed: [], changed: [] }, `refused requests changed the home: ${JSON.stringify(ev.steps.afterBadScopes.home)}`);
    assert.deepEqual(ev.steps.afterBadScopes.outside, { added: [], removed: [], changed: [] }, `refused requests wrote outside the home: ${JSON.stringify(ev.steps.afterBadScopes.outside)}`);
    // a symlinked file: the scope's file is a link to a file outside the home
    const linked = `${bot}/linked`; const linkFile = join(dir, `${encodeURIComponent(linked)}.json`); symlinkSync(join(outside, 'target.json'), linkFile);
    for (const action of ['put', 'read']) { const r = await post({ scope: linked, action, ...(action === 'put' ? { item: item(linked) } : {}) }, 'symlinked file'); assert.equal(r.status, 409, `a symlinked recovery file: ${action} returned ${r.status}, not 409`); }
    assert.equal(readFileSync(join(outside, 'target.json'), 'utf8'), '{"inputs":[]}\n', 'the file outside the home behind the link changed');
    rmSync(linkFile);
    // a symlinked directory: log/app-outbox is a link to a directory outside the home
    movedDir = `${dir}.kept`; renameSync(dir, movedDir); symlinkSync(outside, dir);
    const before = readdirSync(outside).sort();
    const r = await post({ scope, action: 'put', item: item(scope) }, 'symlinked directory'); assert.equal(r.status, 409, `a symlinked recovery directory: put returned ${r.status}, not 409`);
    ev.steps.outsideAfterDirLink = readdirSync(outside).sort(); assert.deepEqual(ev.steps.outsideAfterDirLink, before, 'a put through the symlinked directory wrote outside the home');
    rmSync(dir); renameSync(movedDir, dir); movedDir = null;
    ev.steps.outsideFinal = treeDiff(outBefore, outsideState());
    assert.deepEqual(ev.steps.outsideFinal, { added: [], removed: [], changed: [] }, 'something was added, removed or changed outside the home');
  } finally {
    if (movedDir) { try { rmSync(dir, { force: true }); renameSync(movedDir, dir); } catch (e) { ev.restoreError = e.message; } }
    saveJson(kit, 'turns-app-outbox-confined', ev);
  }
} };

export default { section: 'turns', cases: [failKeepsFollowUp, editRelease('cancel'), editRelease('save'), editRelease('delete'), terminalHolds, stoppedSay('pi'), stoppedSay('claude'), cliSayLeavesPaused,
  restartKeepsQueue, repeatedIdOnce, raceOneWinner, startupFailureRetry, appOutboxConfined] };
