// compaction: the model-found case of a compaction that only ends by finishing, Stop or failure. Effect first: what the
// model's summarizer received (the mock), the compaction reply (compaction R1) and the terminal command's exit (terminal-chat R2).
import assert from 'node:assert/strict';
import { NotRun, detail, durable, mockBot, mockSaw, newSession, cliOk, openTerminal, outboundItem, saveJson, selectedEngines, sleep, until } from './lib.mjs';

// model:compaction 6. Opening a terminal on a session during a held compaction is refused, and the compaction runs to its end.
const terminalDuringCompaction = { id: 'compaction-model-terminal-refused-while-compacting', title: 'compaction R2, R3, terminal-chat R2, cli R4: while a compaction is held, the terminal handoff is refused with 409 and terminal chat on that session exits 1 without attaching, and the compaction still finishes and reports ok', run: async (kit) => {
  if (!selectedEngines(kit).includes('pi')) throw new NotRun('terminal chat on Pi needs the pi adapter in this run');
  const bot = 'cterm'; const ev = { commands: [], steps: {} }; let term;
  try {
    await mockBot(kit, bot, 'pi', ev.commands); const sid = ev.session = await newSession(kit, bot, 'compaction hold', ev.commands);
    // enough transcript for the engine's summarizer to have something to fold
    for (const n of ['one', 'two', 'three', 'four', 'five']) await cliOk(kit, ['say', bot, '--session', sid, `compaction ${n} ${'filler words '.repeat(2500)}`], null, { timeout: 300000 });
    const marker = 'compaction-hold-marker'; const t0 = Date.now();
    const pending = kit.api('POST', `/sessions/${bot}/${sid}/say`, { text: `/compact ${marker}\nMOCK_SLOW 25000` });
    await until('the summarizer request at the model', async () => (await mockSaw(kit, marker)).length > 0, { timeout: 60000, every: 300 });
    // the handoff entry point itself refuses while the compaction is held (terminal-chat R2: owner POST .../token, 409); status only
    const handoff = await kit.api('POST', `/sessions/${bot}/${sid}/token`); ev.steps.handoffStatus = handoff.status;
    assert.equal(handoff.status, 409, `the terminal handoff of a compacting session returned ${handoff.status}, not 409 (terminal-chat R2)`);
    // and the terminal command reaches that refusal: it exits 1 without attaching
    term = openTerminal(kit, bot, sid); ev.steps.terminal = term.argv.slice(-3);
    const exit = await Promise.race([term.done, sleep(20000).then(() => null)]);
    ev.steps.terminalExit = exit; ev.steps.screen = term.screen().slice(-600);
    ev.steps.attachedDuring = (await detail(kit, bot, sid)).attached;
    const r = await pending; ev.steps.compact = { status: r.status, json: r.json ?? null, ms: Date.now() - t0 };
    assert.ok(exit, 'terminal chat was not refused while the session was compacting: the command is still running');
    assert.equal(exit.code, 1, `terminal chat exited ${exit.code}, not 1 (terminal-chat R2)`);
    assert.equal(ev.steps.attachedDuring, false, 'the terminal attached to a compacting session');
    assert.equal(r.status, 200, `the compaction returned ${r.status}: ${r.text}`);
    assert.equal(r.json?.compact?.ok, true, 'the compaction did not report ok (compaction R1)');
    assert.ok(ev.steps.compact.ms >= 24000, `the compaction ended after ${ev.steps.compact.ms} ms, before the held summarizer answered`);
  } finally { if (term) await term.close(); saveJson(kit, 'compaction-model-terminal-refused-while-compacting', ev); }
} };

// Catches: refusing Send while compacting, accepting it as immediate steering instead of a queued follow-up,
// dispatching it before compaction succeeds, or leaving it queued afterward without confirmed pickup.
const sendDuringCompaction = { id: 'compaction-send-queues-until-success', title: 'compaction R3, turns R1, R2, R5: a person Send during held compaction is accepted as a queued follow-up and picked up after compaction succeeds', run: async (kit) => {
  const ev = { runs: [] };
  try {
    for (const engine of selectedEngines(kit)) {
      const bot = `csend${engine}`; const run = { engine, commands: [], steps: {} }; ev.runs.push(run);
      let pending; let compactFinished = false;
      try {
        await mockBot(kit, bot, engine, run.commands);
        const sid = run.session = await newSession(kit, bot, 'send during compaction', run.commands);
        for (const n of ['one', 'two', 'three', 'four', 'five']) await cliOk(kit, ['say', bot, '--session', sid, `compaction ${n} ${'filler words '.repeat(2500)}`], null, { timeout: 300000 });
        const marker = `compaction-send-hold-${engine}`; const text = `person-message-after-compaction-${engine}`;
        pending = kit.api('POST', `/sessions/${bot}/${sid}/say`, { text: `/compact ${marker}\nMOCK_SLOW 25000` }).then((r) => {
          compactFinished = true;
          run.steps.compact = { status: r.status, json: r.json ?? null };
          return r;
        }).catch((e) => { compactFinished = true; run.steps.compactError = e.message; return null; });
        run.steps.summarizer = await until('the held summarizer request', async () => {
          const requests = await mockSaw(kit, marker); return requests.length ? requests : null;
        }, { timeout: 60000, every: 300 });
        assert.equal(compactFinished, false, 'compaction finished before the person could send');
        // The ordinary durable Send path uses steer, not a caller-selected followUp that would bypass conversion.
        const sent = run.steps.send = await durable(kit, bot, sid, 'steer', text, run.commands);
        run.steps.whileHeld = await outboundItem(kit, bot, sid, sent.id);
        run.steps.modelWhileHeld = await mockSaw(kit, text);
        assert.equal(compactFinished, false, 'compaction finished before queued acceptance was observed');
        assert.equal(sent.status, 200, `Send during compaction was refused: ${sent.status} ${JSON.stringify(sent.json)}`);
        assert.equal(sent.json?.session, sid);
        assert.equal(sent.json?.item?.id, sent.id, 'Send did not return its durable item');
        assert.equal(sent.json?.item?.state, 'queued', 'Send during compaction was not accepted as queued');
        assert.equal(run.steps.whileHeld?.mode, 'followUp', 'the ledger did not classify Send as a follow-up');
        assert.equal(run.steps.whileHeld?.state, 'queued', 'the ledger did not hold the input queued');
        assert.equal(run.steps.modelWhileHeld.length, 0, 'the model received the message before compaction succeeded');
        const compact = await pending;
        assert.equal(compact?.status, 200, 'compaction did not succeed');
        assert.equal(compact.json?.compact?.ok, true, 'compaction did not report ok');
        // No second Send, queue action or other input releases the item.
        run.steps.modelAfterSuccess = await until('the queued message at the model after compaction', async () => {
          const requests = await mockSaw(kit, text); return requests.length ? requests : null;
        }, { timeout: 60000, every: 300 });
        run.steps.pickedUp = await until('confirmed pickup of the queued message', async () => {
          const item = await outboundItem(kit, bot, sid, sent.id); return item && ['picked_up', 'handled'].includes(item.state) ? item : null;
        }, { timeout: 60000, every: 300 });
      } finally { if (pending) await pending; }
    }
  } finally { saveJson(kit, 'compaction-send-queues-until-success', ev); }
} };

export default { section: 'compaction', cases: [terminalDuringCompaction, sendDuringCompaction] };
