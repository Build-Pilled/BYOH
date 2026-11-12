// routines: the model-found case of missed time across a switched-off stretch. Effect only: the routine's run
// records (routines R6, `<name>.runs.jsonl` beside the routine file); the daemon is restarted through its public lifecycle.
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { cliOk, firstEngine, lastUserText, missingEngine, mockBot, restartDaemon, saveJson, setEngineCommand, sleep, startRunDaemon, stopRunDaemon, until } from './lib.mjs';

const BOT = 'rtick'; const NAME = 'tick';
const file = (kit) => join(kit.home, 'bots', BOT, 'routines', `${NAME}.md`);
const runs = (kit) => { const f = join(kit.home, 'bots', BOT, 'routines', `${NAME}.runs.jsonl`); return existsSync(f) ? readFileSync(f, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []; };
const write = (kit, schedule, enabled) => { mkdirSync(join(kit.home, 'bots', BOT, 'routines'), { recursive: true }); writeFileSync(file(kit), `---\nname: ${NAME}\nschedule: "${schedule}"\ntz: UTC\nenabled: ${enabled}\nsession: routine tick\n---\nroutines tick body\n`); };

// model:routines 4. A routine switched off across a due time, switched on again, then the daemon restarts: the run log shows that
// due time as missed; a second restart adds nothing.
const missedWhileOff = { id: 'routines-model-missed-while-off', title: 'routines R4, R6: a due time that passes while the routine is switched off is logged as missed at the next startup once it is on again, without a run, and a second restart logs nothing more', run: async (kit) => {
  const engine = firstEngine(kit); const ev = { engine, commands: [], steps: {} };
  try {
    await mockBot(kit, BOT, engine, ev.commands);
    // one daily due time a little over a minute ahead, in UTC
    const due = new Date(Math.ceil((Date.now() + 75000) / 60000) * 60000); const schedule = `${due.getUTCMinutes()} ${due.getUTCHours()} * * *`;
    ev.steps.due = due.toISOString(); ev.steps.schedule = schedule;
    write(kit, schedule, true); await cliOk(kit, ['validate'], ev.commands);
    // a prior run record: run it once by hand (routines R6) and let it settle
    await cliOk(kit, ['routine', 'run', `${BOT}/${NAME}`], ev.commands, { timeout: 300000 });
    await until('the manual run settled', async () => runs(kit).some((r) => r.status === 'started' && r.ended), { timeout: 180000, every: 1000 });
    const prior = runs(kit); ev.steps.prior = prior;
    // switched off across the due time
    write(kit, schedule, false); ev.steps.offAt = new Date().toISOString();
    while (Date.now() < due.getTime() + 5000) await sleep(1000);
    ev.steps.whileOff = runs(kit).slice(prior.length); assert.equal(ev.steps.whileOff.length, 0, `records were written while the routine was off: ${JSON.stringify(ev.steps.whileOff)}`);
    write(kit, schedule, true); ev.steps.onAt = new Date().toISOString(); await sleep(1500);
    await restartDaemon(kit, ev.commands);
    const added = await until('the startup missed record', async () => { const a = runs(kit).slice(prior.length); return a.length ? a : null; }, { timeout: 30000, every: 500 });
    await sleep(3000); const afterFirst = runs(kit); ev.steps.afterFirstRestart = afterFirst.slice(prior.length);
    const missed = ev.steps.afterFirstRestart.filter((r) => r.status === 'missed');
    assert.ok(added.length && missed.length === ev.steps.afterFirstRestart.length, `the startup wrote ${JSON.stringify(ev.steps.afterFirstRestart)}, not only missed records (routines R4: no backlog run)`);
    assert.ok(missed.some((r) => Date.parse(r.ts) === due.getTime()), `no missed record for the due time ${due.toISOString()}`);
    await restartDaemon(kit, ev.commands); await sleep(5000);
    ev.steps.afterSecondRestart = runs(kit).slice(afterFirst.length);
    assert.equal(ev.steps.afterSecondRestart.length, 0, `the second restart logged again: ${JSON.stringify(ev.steps.afterSecondRestart)} (no due time logged twice)`);
  } finally { saveJson(kit, 'routines-model-missed-while-off', ev); }
} };

// ---- The daemon is stopped and started again on the same port through its public lifecycle;
// time passes while it is down. Each case names the broken implementation it catches; every wait is bounded and a timeout fails it.
const routineFile = (kit, bot, name) => join(kit.home, 'bots', bot, 'routines', `${name}.md`);
const runsOf = (kit, bot, name) => { const f = join(kit.home, 'bots', bot, 'routines', `${name}.runs.jsonl`); return existsSync(f) ? readFileSync(f, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []; };
const writeRoutine = (kit, bot, name, schedule, body) => { mkdirSync(join(kit.home, 'bots', bot, 'routines'), { recursive: true }); writeFileSync(routineFile(kit, bot, name), `---\nname: ${name}\nschedule: "${schedule}"\ntz: UTC\nenabled: true\nsession: routine ${name}\n---\n${body}\n`); };
const atModel = async (kit, needle) => (await kit.mock.requests()).filter((r) => lastUserText(r).includes(needle)).map((r) => lastUserText(r));
const pad = (n) => String(n).padStart(2, '0');
const listed = async (kit, bot, name) => { const r = await kit.api('GET', `/routines?bot=${bot}`); assert.equal(r.status, 200, `GET /routines returned ${r.status}`); return (Array.isArray(r.json) ? r.json : r.json?.routines ?? []).some((x) => x.name === name); };

// Catches: a startup that runs the backlog of due times missed while the daemon was down, or that forgets them instead of logging
// them as missed, or logs them again at the next start.
const missedWhileDown = { id: 'routines-missed-while-down', title: 'routines R4, R6: due times of an enabled routine that pass while the daemon is stopped are logged as missed at the next start without a run, and a further restart logs nothing more', run: async (kit) => {
  const engine = firstEngine(kit); const bot = 'rdown'; const name = 'downtick'; const body = 'routines down body'; const ev = { catches: 'a backlog run at startup; missed due times not logged; due times logged again at a later start', engine, commands: [], steps: {} };
  try {
    await mockBot(kit, bot, engine, ev.commands);
    const d1 = new Date(Math.ceil((Date.now() + 75000) / 60000) * 60000); const d2 = new Date(d1.getTime() + 60000);
    const schedule = `${d1.getUTCMinutes()},${d2.getUTCMinutes()} ${[...new Set([d1.getUTCHours(), d2.getUTCHours()])].join(',')} * * *`;
    ev.steps.due = [d1.toISOString(), d2.toISOString()]; ev.steps.schedule = schedule;
    writeRoutine(kit, bot, name, schedule, body); await cliOk(kit, ['validate'], ev.commands);
    await cliOk(kit, ['routine', 'run', `${bot}/${name}`], ev.commands, { timeout: 300000 });
    await until('the manual run settled', async () => runsOf(kit, bot, name).some((r) => r.status === 'started' && r.ended), { timeout: 180000, every: 1000 });
    const prior = ev.steps.prior = runsOf(kit, bot, name); const seenBefore = (await atModel(kit, body)).length;
    const stopped = await stopRunDaemon(kit, ev.commands);
    while (Date.now() < d2.getTime() + 5000) await sleep(1000);
    ev.steps.whileDown = runsOf(kit, bot, name).slice(prior.length);
    await startRunDaemon(kit, stopped, ev.commands);
    await until('the missed records of the start', async () => runsOf(kit, bot, name).length > prior.length, { timeout: 30000, every: 500 });
    await sleep(QUIET_R);
    const added = ev.steps.afterStart = runsOf(kit, bot, name).slice(prior.length); ev.steps.seenAfterStart = (await atModel(kit, body)).length - seenBefore;
    assert.ok(added.every((r) => r.status === 'missed'), `the start wrote other records than missed: ${JSON.stringify(added)} (routines R4: no backlog run)`);
    for (const d of [d1, d2]) assert.ok(added.some((r) => Date.parse(r.ts) === d.getTime()), `no missed record for ${d.toISOString()}`);
    assert.equal(ev.steps.seenAfterStart, 0, 'the routine prompt reached the model at the start (a backlog run)');
    const afterFirst = runsOf(kit, bot, name).length;
    await restartDaemon(kit, ev.commands); await sleep(QUIET_R);
    ev.steps.afterSecondStart = runsOf(kit, bot, name).slice(afterFirst);
    assert.equal(ev.steps.afterSecondStart.length, 0, `the next start logged again: ${JSON.stringify(ev.steps.afterSecondStart)}`);
  } finally { saveJson(kit, 'routines-missed-while-down', ev); }
} };
const QUIET_R = 6000;

// Catches: a one-shot that is kept, offered again or retried every check after its engine could not start.
const oneShotStartFailure = { id: 'routines-one-shot-start-failure-consumed', title: 'routines R5, E2, bots E3: a one-shot whose engine cannot start is consumed: its routine and run-log files are removed, it is no longer listed, and after the engine is fixed and the daemon restarted it is not run again as a routine', run: async (kit) => {
  const engine = firstEngine(kit); const bot = 'rfail'; const name = 'failonce'; const body = 'routines failed one-shot body'; const ev = { catches: 'a one-shot kept, listed again or retried after a could-not-start result', engine, commands: [], steps: {} };
  let restore;
  try {
    await mockBot(kit, bot, engine, ev.commands);
    restore = setEngineCommand(kit, engine, [missingEngine(kit)]); await restartDaemon(kit, ev.commands); ev.steps.engine = 'missing command';
    const due = new Date(Math.ceil((Date.now() + 15000) / 1000) * 1000);
    const when = `${due.getUTCFullYear()}-${pad(due.getUTCMonth() + 1)}-${pad(due.getUTCDate())}T${pad(due.getUTCHours())}:${pad(due.getUTCMinutes())}:${pad(due.getUTCSeconds())}`;
    ev.steps.due = due.toISOString(); writeRoutine(kit, bot, name, when, body); await cliOk(kit, ['validate'], ev.commands);
    ev.steps.listedBefore = await listed(kit, bot, name); assert.equal(ev.steps.listedBefore, true, 'the one-shot is not listed before its due time');
    await until('the one-shot consumed after its failed start', async () => !existsSync(routineFile(kit, bot, name)) && !existsSync(join(kit.home, 'bots', bot, 'routines', `${name}.runs.jsonl`)), { timeout: 150000, every: 1000 });
    ev.steps.consumedAt = new Date().toISOString();
    ev.steps.listedAfter = await listed(kit, bot, name); assert.equal(ev.steps.listedAfter, false, 'the consumed one-shot is still listed');
    assert.equal((await atModel(kit, body)).length, 0, 'the one-shot prompt reached a model although the engine could not start');
    restore(); restore = null; await restartDaemon(kit, ev.commands); await sleep(QUIET_R * 2);
    ev.steps.afterFix = { file: existsSync(routineFile(kit, bot, name)), listed: await listed(kit, bot, name), atModel: (await atModel(kit, body)).length };
    assert.equal(ev.steps.afterFix.file, false, 'the routine file came back');
    assert.equal(ev.steps.afterFix.listed, false, 'the one-shot is listed again after the restart');
    assert.ok(ev.steps.afterFix.atModel <= 1, `the one-shot prompt reached the model ${ev.steps.afterFix.atModel} times after the fix (attempted again)`);
  } finally {
    if (restore) { try { restore(); await restartDaemon(kit, ev.commands); } catch (e) { ev.restoreError = e.message; } }
    saveJson(kit, 'routines-one-shot-start-failure-consumed', ev);
  }
} };

export default { section: 'routines', cases: [missedWhileOff, missedWhileDown, oneShotStartFailure] };
