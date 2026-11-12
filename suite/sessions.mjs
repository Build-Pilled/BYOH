// sessions: persistence across a daemon restart, the session workspace, idle engine exit and deletion. Effect only:
// session metadata and files on disk (sessions R2, R3, R7), owner session lists and detail (sessions R5), and what the mock model
// received. The daemon is restarted through its public lifecycle. Each case names the broken implementation it catches;
// every wait is bounded and a timeout fails the case; observations go into the evidence as they are made.
import assert from 'node:assert/strict';
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { isAbsolute, join, relative, sep } from 'node:path';
import { cliOk, detail, firstEngine, lastUserText, liveSessions, mockBot, newSession, restartDaemon, saveJson, sessionIds, setBotField, sleep, treeDiff, treeState,
  until } from './lib.mjs';

const QUIET = 8000;
const TOOL = { pi: ['bash', (c) => ({ command: c })], claude: ['Bash', (c) => ({ command: c, description: 'sessions workspace check' })] };
const say = (kit, bot, sid, text, log) => cliOk(kit, ['say', bot, '--session', sid, text], log, { timeout: 300000 });
const listOf = async (kit, bot) => { const r = await kit.api('GET', `/bots/${bot}/sessions`); assert.equal(r.status, 200, `GET /bots/${bot}/sessions returned ${r.status}`); return r.json.sessions.map((s) => ({ id: s.id, title: s.title })); };
const transcript = async (kit, bot, sid) => (await detail(kit, bot, sid)).messages.map((m) => ({ entry: m.entry, role: m.role, text: m.text }));
const atModel = async (kit, needle) => (await kit.mock.requests()).filter((r) => lastUserText(r).includes(needle));

// Catches: a restart that loses sessions or their titles, rewrites or drops transcript entries, starts a new engine conversation
// instead of resuming the old one (the model no longer sees the earlier turns), resolves `latest` to another session, or replays
// an earlier input.
const continueAcrossRestart = { id: 'sessions-continue-across-restart', title: 'sessions R3, R4, R5, E4: after a daemon restart the bot lists the same sessions and titles, a transcript reads the same, latest is still the most recent session, and a new turn continues the earlier conversation without replaying it', run: async (kit) => {
  const engine = firstEngine(kit); const bot = 'srestart'; const ev = { catches: 'sessions or titles lost at restart; transcript entries rewritten; a fresh engine conversation instead of a resume; latest resolving elsewhere; an input replayed', engine, commands: [], steps: {} };
  try {
    await mockBot(kit, bot, engine, ev.commands);
    const a = ev.sessionA = await newSession(kit, bot, 'sessions first', ev.commands); await say(kit, bot, a, 'sessions alpha turn', ev.commands);
    const b = ev.sessionB = await newSession(kit, bot, 'sessions second', ev.commands); await say(kit, bot, b, 'sessions beta turn', ev.commands);
    const before = ev.steps.before = { list: await listOf(kit, bot), transcriptA: await transcript(kit, bot, a), alpha: (await atModel(kit, 'sessions alpha turn')).length };
    assert.ok(before.transcriptA.some((m) => m.role === 'user' && m.text.includes('sessions alpha turn')), 'the first transcript has no user entry before the restart');
    await restartDaemon(kit, ev.commands);
    const after = ev.steps.after = { list: await listOf(kit, bot), transcriptA: await transcript(kit, bot, a) };
    const key = (l) => l.map((s) => `${s.id} ${s.title}`).sort();
    assert.deepEqual(key(after.list), key(before.list), 'the restart changed the sessions or titles the bot lists');
    assert.deepEqual(after.transcriptA, before.transcriptA, 'the restart changed the transcript of the first session');
    const latest = await kit.api('POST', `/sessions/${bot}/latest/say`, { text: 'sessions gamma latest' }); ev.steps.latest = { status: latest.status, session: latest.json?.session ?? null };
    assert.ok(latest.status < 300, `say to latest returned ${latest.status}`);
    assert.equal(latest.json?.session, b, 'after the restart latest is not the most recent session (sessions R4)');
    await until('the latest turn at the model', async () => (await atModel(kit, 'sessions gamma latest')).length > 0, { timeout: 180000, every: 500 });
    await sleep(3000);
    await say(kit, bot, a, 'sessions delta continues', ev.commands);
    const req = (await atModel(kit, 'sessions delta continues'))[0]; const history = JSON.stringify(req?.messages ?? []);
    ev.steps.continued = { alphaInHistory: history.includes('sessions alpha turn'), betaInHistory: history.includes('sessions beta turn') };
    assert.equal(ev.steps.continued.alphaInHistory, true, 'the new turn of the first session does not carry its earlier conversation (sessions R3: restart reopens the transcript)');
    assert.equal(ev.steps.continued.betaInHistory, false, 'the first session continued with another session\'s conversation');
    ev.steps.alphaAfter = (await atModel(kit, 'sessions alpha turn')).length;
    assert.equal(ev.steps.alphaAfter, before.alpha, 'an earlier input was sent to the model again as a new turn');
  } finally { saveJson(kit, 'sessions-continue-across-restart', ev); }
} };

// Catches: a session without its own workspace (or one shared with another session), an idle engine that never exits, an idle exit
// that removes the session, and a deletion that leaves the session's files or workspace, or removes or changes another session's,
// another bot's or the bridge's files.
const deleteRemovesOwn = { id: 'sessions-delete-removes-only-its-own', title: 'sessions R3, R7, E4, engine-contract R7: each session gets its own MYHARNESS_WORKSPACE; an idle engine exits while the sessions stay; deleting one session removes its metadata, transcript, records and workspace and leaves every other session, bot and bridge file unchanged', run: async (kit) => {
  const engine = firstEngine(kit); const X = 'sdel'; const Y = 'sother'; const ev = { catches: 'no own workspace; an idle engine that never exits; idle exit removing sessions; deletion leaving own files or touching others', engine, commands: [], steps: {} };
  const [tool, args] = TOOL[engine];
  const workspaceOf = async (sid) => {
    const cmd = 'echo "WS=$MYHARNESS_WORKSPACE"; printf kept > "$MYHARNESS_WORKSPACE/marker.txt"';
    const out = await say(kit, X, sid, `MOCK_TOOL ${tool} ${JSON.stringify(args(cmd))}`, ev.commands);
    return (/done: WS=(\S+)/.exec(out) ?? [])[1] ?? null;
  };
  try {
    await mockBot(kit, X, engine, ev.commands); await mockBot(kit, Y, engine, ev.commands); setBotField(kit, X, 'idle_timeout', '15s'); await cliOk(kit, ['validate'], ev.commands);
    const s1 = ev.s1 = await newSession(kit, X, 'sessions doomed', ev.commands); const s2 = ev.s2 = await newSession(kit, X, 'sessions kept', ev.commands);
    const s3 = ev.s3 = await newSession(kit, Y, 'sessions other bot', ev.commands);
    const ws1 = ev.steps.ws1 = await workspaceOf(s1); const ws2 = ev.steps.ws2 = await workspaceOf(s2);
    assert.equal(ws1, join(kit.home, 'bots', X, 'sessions', s1, 'work'), `the first session's MYHARNESS_WORKSPACE is ${ws1} (sessions R3)`);
    assert.equal(ws2, join(kit.home, 'bots', X, 'sessions', s2, 'work'), `the second session's MYHARNESS_WORKSPACE is ${ws2}`);
    assert.equal(readFileSync(join(ws1, 'marker.txt'), 'utf8'), 'kept', 'the first workspace does not hold the file its engine wrote');
    await say(kit, Y, s3, 'sessions other bot turn', ev.commands);
    const br = await kit.api('POST', '/bridges', { a: X, b: Y, note: 'sessions delete check' }); ev.steps.bridge = br.status; assert.ok(br.status < 300, `POST /bridges returned ${br.status}`);
    // idle engines exit; the sessions stay (sessions E4, engine-contract R7)
    ev.steps.liveBeforeIdle = await liveSessions(kit, X);
    ev.steps.idleExit = await until('the idle engines of the bot exited', async () => { const l = await liveSessions(kit, X); return l.length === 0 ? { at: new Date().toISOString() } : null; }, { timeout: 120000, every: 1000 });
    ev.steps.listAfterIdle = (await listOf(kit, X)).map((s) => s.id);
    assert.ok([s1, s2].every((s) => ev.steps.listAfterIdle.includes(s)), 'an idle engine exit removed a session');
    assert.ok(existsSync(join(ws1, 'marker.txt')), 'an idle engine exit removed the workspace');
    const skip = (r) => r === '.git' || r === 'log';
    // Claude's native transcripts are outside the harness home, but inside this run's disposable engine state.
    let native;
    if (engine === 'claude') {
      const state = realpathSync(kit.env().CLAUDE_CONFIG_DIR);
      assert.equal(state, join(realpathSync(kit.root), 'claude-config'), 'native state is not this run\'s disposable Claude state');
      const records = [[X, s1], [X, s2], [Y, s3]].map(([bot, id]) => {
        const meta = sessionIds(kit, bot).find((s) => s.id === id)?.meta;
        assert.ok(meta?.file && isAbsolute(meta.file), `no absolute native transcript path in metadata for ${bot}/${id}`);
        const file = realpathSync(meta.file); const rel = relative(state, file);
        assert.ok(rel.startsWith(`projects${sep}`) && !isAbsolute(rel) && !rel.split(sep).includes('..'), 'transcript escapes this run\'s native projects');
        return { id, file, bytes: readFileSync(file) };
      });
      assert.equal(new Set(records.map((x) => x.file)).size, 3, 'sessions share a native transcript');
      native = records; ev.steps.nativeBefore = records.map(({ id, file, bytes }) => ({ id, file, size: bytes.length }));
    }
    const before = treeState(kit.home, skip);
    const del = await kit.api('DELETE', `/sessions/${X}/${s1}`); ev.steps.delete = del.status; assert.ok(del.status < 300, `DELETE returned ${del.status}: ${del.text}`);
    await sleep(2000);
    if (native) {
      ev.steps.nativeAfter = native.map(({ id, file }) => ({ id, file, exists: existsSync(file) }));
      assert.equal(ev.steps.nativeAfter[0].exists, false, 'the owned native transcript was not removed');
      for (const other of native.slice(1)) {
        assert.ok(existsSync(other.file), `an unrelated native transcript was removed: ${other.id}`);
        assert.deepEqual(readFileSync(other.file), other.bytes, `an unrelated native transcript changed: ${other.id}`);
      }
    }
    const diff = ev.steps.diff = treeDiff(before, treeState(kit.home, skip));
    const own = (p) => p.includes(s1);
    assert.ok(diff.removed.includes(`bots/${X}/sessions/${s1}.json`), `the session metadata was not removed: ${JSON.stringify(diff.removed)}`);
    assert.ok(diff.removed.some((p) => p.startsWith(`bots/${X}/sessions/${s1}/work`)), 'the session workspace was not removed');
    assert.deepEqual(diff.removed.filter((p) => !own(p)), [], `deletion removed files of something else: ${JSON.stringify(diff.removed.filter((p) => !own(p)))}`);
    assert.deepEqual(diff.added, [], `deletion added files: ${JSON.stringify(diff.added)}`);
    const foreign = diff.changed.filter((p) => p.includes(s2) || p.includes(s3) || p.startsWith(`bots/${Y}/`) || p.startsWith('bridges/'));
    assert.deepEqual(foreign, [], `deletion changed another session's, bot's or the bridge's files: ${JSON.stringify(foreign)}`);
    ev.steps.leftOfOwn = Object.keys(treeState(kit.home, skip)).filter(own);
    assert.deepEqual(ev.steps.leftOfOwn, [], `files of the deleted session remain: ${JSON.stringify(ev.steps.leftOfOwn)}`);
    assert.ok(existsSync(join(ws2, 'marker.txt')), 'the other session\'s workspace is gone');
    const gone = await kit.api('GET', `/sessions/${X}/${s1}`); ev.steps.deletedDetail = gone.status; assert.equal(gone.status, 404, `the deleted session answers ${gone.status}, not 404`);
    ev.steps.keptMessages = (await transcript(kit, X, s2)).length; assert.ok(ev.steps.keptMessages > 0, 'the other session lost its transcript');
  } finally { saveJson(kit, 'sessions-delete-removes-only-its-own', ev); }
} };

export default { section: 'sessions', cases: [continueAcrossRestart, deleteRemovesOwn] };
