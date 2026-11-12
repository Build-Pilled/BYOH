// engine-contract: the engine drift case.
// For each selected adapter it records the installed engine version against the harness's pin and runs the pinned-version
// contract path of engine-contract R7 against the mock: launch, input pickup, a streamed reply seen before the turn settles,
// one tool call and its result, native resume after the engine was closed, and Stop. A changed upstream engine that breaks
// the connection fails here before a person meets it.
// Pins: BYOH_SUITE_PIN_PI and BYOH_SUITE_PIN_CLAUDE hold the exact versions the host recipe pins (vm R2). Without the pin
// the case is not run: a drift check needs something to compare with.
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { MOCK_FORMAT, MOCK_MODEL, NotRun, cliOk, cliStream, liveSessions, mockSaw, newId, saveJson, selectedEngines, setBotField, sleep, until } from './lib.mjs';

const PIN_ENV = { pi: 'BYOH_SUITE_PIN_PI', claude: 'BYOH_SUITE_PIN_CLAUDE' };
const BOT = 'drift';
const IDLE = '15s';   // the bot's idle timeout (home R3, bots R2), short so the case can watch the engine close
// One tool per adapter that the engine runs itself and whose result is its stdout (the mock answers "done: <first line>").
const TOOL = { pi: ['bash', (t) => ({ command: `echo ${t}` })], claude: ['Bash', (t) => ({ command: `echo ${t}`, description: 'drift check' })] };
const transcript = async (kit, sid) => { const r = await kit.api('GET', `/sessions/${BOT}/${sid}`); assert.equal(r.status, 200, `GET /sessions/${BOT}/${sid} returned ${r.status}`); return r.json.messages; };

const drift = (engine) => ({ id: `engine-contract-pinned-drift-${engine}`, title: `engine-contract R1, R3, R7, turns R2, R4, cli R4: ${engine === 'pi' ? 'Pi' : 'Claude Code'} at its pinned version launches, picks up input, streams a reply before settling, runs a tool and returns its result, resumes natively after its engine closed, and stops a running turn, pausing the queued follow-up until the next Send`, run: async (kit) => {
  if (!selectedEngines(kit).includes(engine)) throw new NotRun(`${engine} is not a selected adapter of this run`);
  const pin = process.env[PIN_ENV[engine]];
  const ver = await kit.engine(engine, ['--version']);
  const installed = `${ver.stdout}${ver.stderr}`.trim();
  const ev = { engine, pin: pin ?? null, versionCommand: { exit: ver.code, output: installed }, node: process.versions.node, commands: [], steps: {} };
  const save = () => saveJson(kit, `engine-contract-pinned-drift-${engine}`, ev);
  if (!pin) { save(); throw new NotRun(`${PIN_ENV[engine]} is not set: the exact ${engine} pin comes from the host recipe (vm R2)`); }
  try {
    assert.equal(ver.code, 0, `${engine} --version exited ${ver.code}`);
    assert.ok(installed.split(/\s+/).includes(pin), `installed ${engine} reports "${installed}", the pin is ${pin}: an unreviewed engine change (engine-contract R7)`);

    // 1. launch and input pickup
    if (!existsSync(join(kit.home, 'bots', BOT, 'bot.toml'))) await cliOk(kit, ['bot', 'new', BOT, '--model', MOCK_MODEL[engine]], ev.commands);
    setBotField(kit, BOT, 'model', MOCK_MODEL[engine]); setBotField(kit, BOT, 'idle_timeout', IDLE);
    await cliOk(kit, ['validate'], ev.commands);
    const sid = (await cliOk(kit, ['new', BOT, '--title', `drift ${engine}`], ev.commands)).trim().split('\n').at(-1).trim(); ev.session = sid;
    const first = `drift first ${engine}`;
    const out1 = await cliOk(kit, ['say', BOT, '--session', sid, first], ev.commands, { timeout: 300000 });
    const seen1 = await mockSaw(kit, first); ev.steps.pickup = { requests: seen1.map((r) => r.format) };
    assert.ok(seen1.length && seen1.every((r) => r.format === MOCK_FORMAT[engine]), 'the first input did not reach the model through this adapter');
    assert.match(out1, new RegExp(`echo: ${first}`));

    // 2. streamed reply (engine-contract R3, cli R4): a reply streamed one character every 250 ms reaches say's stdout in
    // several pieces, the first of them well before the command settles, and each piece so far is a prefix of the reply
    const reply = `drift stream ${engine} arrives in pieces`;
    const streamed = await cliStream(kit, ['say', BOT, '--session', sid, `drift stream ask ${engine}\nMOCK_STREAM 250 ${Buffer.from(reply).toString('base64')}`]);
    const outChunks = streamed.chunks.filter((c) => c.stream === 'stdout' && c.text.trim());
    ev.commands.push({ argv: ['myharness', 'say', BOT, '--session', sid, '<stream>'], exit: streamed.code, ms: streamed.ms, chunks: streamed.chunks, stderr: streamed.stderr });
    assert.equal(streamed.code, 0, `say exited ${streamed.code}: ${streamed.stderr.trim()}`);
    assert.ok(outChunks.length >= 2, `say printed the reply in ${outChunks.length} piece(s), not streamed`);
    assert.ok(streamed.ms - outChunks[0].ms >= 2000, `the first reply text came ${streamed.ms - outChunks[0].ms} ms before settlement; a reply streamed over ${reply.length * 250} ms was expected earlier`);
    let sofar = ''; for (const c of streamed.chunks.filter((x) => x.stream === 'stdout').slice(0, -1)) { sofar += c.text; assert.ok(reply.startsWith(sofar.trimStart()), `stdout before settlement "${sofar}" is not a prefix of the reply`); }
    assert.equal(streamed.stdout.trim(), reply, 'the settled stdout is not the whole reply');
    ev.steps.stream = { pieces: outChunks.length, firstMs: outChunks[0].ms, settledMs: streamed.ms };

    // 3. one tool call and its result: the engine runs the tool, the result goes back to the model, the model's answer
    // quotes the result's first line (verify/mock-model.mjs), and the native transcript holds the call and the answer
    const token = `drift-tool-${engine}-${Date.now()}`; const [tool, args] = TOOL[engine];
    const out3 = await cliOk(kit, ['say', BOT, '--session', sid, `MOCK_TOOL ${tool} ${JSON.stringify(args(token))}`], ev.commands, { timeout: 300000 });
    const withResult = (await kit.mock.requests()).filter((r) => JSON.stringify(r.messages.at(-1) ?? {}).includes(token) && !JSON.stringify(r.messages.at(-1) ?? {}).includes('MOCK_TOOL'));
    const t3 = await transcript(kit, sid);
    ev.steps.tool = { resultRequests: withResult.length, transcriptTail: t3.slice(-3).map((m) => ({ entry: m.entry, role: m.role, text: m.text, toolCalls: m.toolCalls })) };
    assert.ok(withResult.length >= 1, 'the tool result never went back to the model');
    assert.match(out3, new RegExp(`done: ${token}`), 'the reply after the tool does not quote its result');
    assert.ok(t3.some((m) => (m.toolCalls ?? []).some((c) => c.name === tool)), `the native transcript has no ${tool} call`);
    assert.equal(t3.at(-1).text, `done: ${token}`);

    // 4. native resume after the engine closed (engine-contract R7, sessions R6): the idle timeout ends the engine through
    // the public lifecycle; the next input in the same session reopens it with the earlier turns, and the transcript continues
    const before = (await transcript(kit, sid)).map((m) => m.entry);
    await until(`the ${engine} engine of ${BOT}/${sid} closed after ${IDLE} idle`, async () => !(await liveSessions(kit, BOT)).includes(sid), { timeout: 180000, every: 3000 });
    const closedAt = new Date().toISOString();
    const third = `drift resume ${engine}`;
    await cliOk(kit, ['say', BOT, '--session', sid, third], ev.commands, { timeout: 300000 });
    const seen3 = await mockSaw(kit, third); const after = await transcript(kit, sid);
    ev.steps.resume = { closedAt, liveAfter: await liveSessions(kit, BOT), requests: seen3.length, before, after: after.map((m) => ({ entry: m.entry, role: m.role, text: m.text })) };
    assert.ok(seen3.length >= 1, 'the input after the close never reached the model');
    assert.ok(seen3.every((r) => JSON.stringify(r.messages).includes(first) && JSON.stringify(r.messages).includes(`done: ${token}`)), 'the reopened engine did not carry the earlier turns (native resume)');
    assert.deepEqual(after.slice(0, before.length).map((m) => m.entry), before, 'the earlier transcript entries changed after the reopen');
    assert.deepEqual(after.slice(before.length).map((m) => [m.role, m.text]), [['user', third], ['assistant', `echo: ${third}`]], 'the transcript did not continue with the new turn');

    // 5. Stop (turns R4): the model holds a slow turn; a follow-up is accepted only because a turn is running (R2);
    // abort settles the turn (a new follow-up then creates no item) and pauses the queued one, which a later Send resumes
    const slow = `drift stop ${engine}`; const queued = `drift queued ${engine}`; const t0 = Date.now();
    const pending = kit.cli(['say', BOT, '--session', sid, `${slow}\nMOCK_SLOW 120000`], { timeout: 300000 });
    await until('the slow turn reached the model', async () => (await mockSaw(kit, slow)).length > 0, { timeout: 240000, every: 500 });
    const follow = await kit.api('POST', `/sessions/${BOT}/${sid}/say`, { id: newId(), mode: 'followUp', text: queued });
    ev.steps.stop = { followUpWhileRunning: { status: follow.status, json: follow.json } };
    assert.ok(follow.status < 300 && follow.json?.item, `a follow-up during the held turn was not accepted as an item (turns R2): ${follow.status} ${follow.text}`);
    const stop = await kit.api('POST', `/sessions/${BOT}/${sid}/abort`); ev.steps.stop.abort = { status: stop.status, json: stop.json ?? null };
    assert.ok(stop.status < 300, `abort returned ${stop.status}`);
    const r = await pending; const took = Date.now() - t0;
    ev.commands.push({ argv: ['myharness', 'say', BOT, '--session', sid, '<slow>'], exit: r.code, stdout: r.stdout, stderr: r.stderr, ms: took });
    ev.steps.stop.sayExit = r.code;   // evidence only; cli R6 owns the exit code of a stopped waiting say
    assert.ok(took < 115000, `the stopped say returned after ${took} ms, as late as the model's delay`);
    const probe = await kit.api('POST', `/sessions/${BOT}/${sid}/say`, { id: newId(), mode: 'followUp', text: `drift probe ${engine}` });
    ev.steps.stop.followUpAfterStop = { status: probe.status, json: probe.json ?? null };
    assert.ok(!probe.json?.item, 'a follow-up after Stop still created an item: the turn did not settle (turns R2)');
    await sleep(8000);
    const early = await mockSaw(kit, queued); ev.steps.stop.queuedSeenWhilePaused = early.length;
    assert.equal(early.length, 0, 'the queued follow-up was dispatched after Stop without a new Send (turns R4)');
    // the deliberate Send is the person's durable input (turns R1: the app's Send posts {id, mode, text}; an idle session takes it as a turn)
    const send = await kit.api('POST', `/sessions/${BOT}/${sid}/say`, { id: newId(), mode: 'steer', text: `drift send after stop ${engine}` });
    ev.steps.stop.send = { status: send.status, json: send.json ?? null };
    assert.ok(send.status < 300 && send.json?.item, `the Send after Stop was not accepted as an item: ${send.status} ${send.text}`);
    const resumed = await until('the queued follow-up after the next Send', async () => { const s = await mockSaw(kit, queued); return s.length ? s : null; }, { timeout: 240000, every: 2000 });
    ev.steps.stop.queuedSeenAfterSend = resumed.length;
  } finally { save(); }
} });

export default { section: 'engine-contract', cases: [drift('pi'), drift('claude')] };
