// compaction: the model-found case of a compaction that only ends by finishing, Stop or failure. Effect first: what the
// model's summarizer received (the mock), the compaction reply (compaction R1) and the terminal command's exit (terminal-chat R2).
import assert from 'node:assert/strict';
import { NotRun, detail, mockBot, mockSaw, newSession, cliOk, openTerminal, saveJson, selectedEngines, sleep, until } from './lib.mjs';

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

export default { section: 'compaction', cases: [terminalDuringCompaction] };
