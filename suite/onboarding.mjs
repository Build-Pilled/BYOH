// Mock stage smokes S1/S2/S4/S5 (onboarding R4 stages 5/6/8/9). Real login is onboarding T3, not a kit case.
// Run in order on one instance: `node verify/kit.mjs run suite/onboarding.mjs --harness <d.json> --evidence <dir>`.
// The kit stops at its first failing case; full onboarding additionally requires the real-host stage gates, not just this mock run.
// Run one stage with --only <case id>. Evidence per case: logs/evidence/<case id>.json (and .png for the window).
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MOCK_FORMAT, MOCK_MODEL, NotRun, cliOk, evidencePath, lastUserText, mockSaw, saveJson, selectedEngines, setBotField, starterTable, until } from './lib.mjs';

const SPEC = join(dirname(fileURLToPath(import.meta.url)), '..', 'spec');
const byRole = (role) => starterTable(SPEC).find((r) => r.role === role);
// Every case that needs the starter set installs it itself, so it also runs alone with --only: repeating init keeps an existing
// config and files and fills only what is missing (home R1, starter-bots R3).
const examples = (kit, log) => cliOk(kit, ['init', '--examples'], log);

// --- S1 -----------------------------------------------------------------------------------------------------------------------
const s1 = { id: 'onboarding-stage-1-daemon', title: 'onboarding R4 stage 1, daemon R1, verifiability: the daemon starts on an isolated instance and answers authenticated health that agrees with its discovery file', run: async (kit) => {
  const ev = {};   // filled step by step and saved in the finally, so a failure keeps what was observed before it
  try {
    const discovery = ev.discovery = JSON.parse(readFileSync(kit.discovery, 'utf8'));
    const health = await kit.api('GET', '/health'); ev.health = { status: health.status, json: health.json };
    const token = statSync(kit.tokenFile); ev.token = { mode: (token.mode & 0o777).toString(8), bytes: token.size };
    const checks = ev.doctor = await kit.doctor();
    assert.equal(health.status, 200); assert.equal(health.json?.ok, true);
    assert.equal(health.json.pid, discovery.pid); assert.equal(health.json.url, discovery.url); assert.equal(health.json.home, kit.home);
    const bad = checks.filter((c) => !c.ok); assert.deepEqual(bad, [], `isolation checks failed: ${bad.map((c) => c.msg).join('; ')}`);
  } finally { saveJson(kit, 'onboarding-stage-1-daemon', ev); }
} };

// --- S2 -----------------------------------------------------------------------------------------------------------------------
const s2installed = { id: 'onboarding-stage-2-plain-installed', title: 'starter-bots R1, R3, R6: init --examples installs the Plain bot at its fixed address, unteamed, with an empty SYSTEM.md', run: async (kit) => {
  const log = []; const ev = { commands: log };
  try {
    await examples(kit, log);
    const plain = byRole('Plain bot'); assert.ok(plain, 'starter-bots R1 table has no Plain bot row');
    const dir = join(kit.home, 'bots', plain.id); const sys = join(dir, 'SYSTEM.md');
    const facts = ev.facts = { id: plain.id, botToml: existsSync(join(dir, 'bot.toml')), systemMdBytes: existsSync(sys) ? statSync(sys).size : null };
    const bots = await kit.api('GET', '/bots'); facts.apiStatus = bots.status; ev.bots = bots.json;
    assert.ok(facts.botToml, `bots/${plain.id}/bot.toml is missing`);
    assert.equal(facts.systemMdBytes, 0, `bots/${plain.id}/SYSTEM.md must exist and be empty (starter-bots R1)`);
    await cliOk(kit, ['validate'], log);
  } finally { saveJson(kit, 'onboarding-stage-2-plain-installed', ev); }
} };

// Catches an init that copies raw starter templates or omits the single notice.
const s2starterFiles = { id: 'onboarding-stage-2-starter-files', title: 'starter-bots R3, R5, home R1: init --examples installs the single NOTICE.md and leaves no unresolved template text in installed starter files', run: async (kit) => {
  const log = []; const ev = { commands: log, files: [], unresolved: [] };
  try {
    await examples(kit, log);
    const notice = join(kit.home, 'NOTICE.md');
    ev.noticeInstalled = existsSync(notice) && statSync(notice).isFile();
    assert.ok(ev.noticeInstalled, 'init --examples must install home-root NOTICE.md (starter-bots R5)');
    const scan = (rel) => {
      const file = join(kit.home, rel);
      if (statSync(file).isDirectory()) {
        for (const name of readdirSync(file).sort()) scan(join(rel, name));
      } else {
        ev.files.push(rel);
        if (readFileSync(file, 'utf8').includes('{{')) ev.unresolved.push(rel);
      }
    };
    // The installed starter trees and notice, not daemon secrets or engine state.
    for (const rel of ['bots', 'teams', 'skills', 'bin', 'NOTICE.md']) if (existsSync(join(kit.home, rel))) scan(rel);
    assert.deepEqual(ev.unresolved, [], `unresolved starter placeholders in: ${ev.unresolved.join(', ')}`);
  } finally { saveJson(kit, 'onboarding-stage-2-starter-files', ev); }
} };

// One mock turn through each selected adapter, on a new person session (sessions R1, cli R6).
const s2chat = (engine) => ({ id: `onboarding-stage-2-mock-chat-${engine}`, title: `onboarding R4 stage 2, starter-bots R6, engine-contract R1: the Plain bot answers a simple question through ${engine === 'pi' ? 'Pi' : 'Claude Code'} against the mock model`, run: async (kit) => {
  if (!selectedEngines(kit).includes(engine)) throw new NotRun(`${engine} is not a selected adapter of this run`);
  const plain = byRole('Plain bot').id; const log = []; const ev = { commands: log };
  try {
    await examples(kit, log);
    setBotField(kit, plain, 'model', MOCK_MODEL[engine]);
    await cliOk(kit, ['validate'], log);
    const sid = ev.session = (await cliOk(kit, ['new', plain, '--title', `stage 2 ${engine}`], log)).trim().split('\n').at(-1).trim();
    assert.match(sid, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/, 'new prints the full session UUID (sessions R1)');
    const question = `stage two question via ${engine}`;
    const out = await cliOk(kit, ['say', plain, '--session', sid, question], log, { timeout: 300000 });
    const seen = await mockSaw(kit, question);   // effect first: the engine reached the model with the person's words
    ev.model = seen.map((r) => ({ format: r.format, model: r.model, tools: r.tools, systemBytes: r.system.length }));
    const meta = join(kit.home, 'bots', plain, 'sessions', `${sid}.json`);
    const metadata = ev.metadata = existsSync(meta) ? JSON.parse(readFileSync(meta, 'utf8')) : null;
    assert.ok(seen.length >= 1, 'the mock model never received the question');
    assert.ok(seen.every((r) => r.format === MOCK_FORMAT[engine]), `the question reached the model through ${seen.map((r) => r.format).join(',')}, not ${MOCK_FORMAT[engine]}`);
    assert.match(out, new RegExp(`echo: ${question}`), 'say printed the model reply after settlement (cli R6)');
    assert.ok(metadata, `bots/${plain}/sessions/${sid}.json is missing (sessions R2)`);
    assert.equal(metadata.id, sid); assert.equal(metadata.origin, 'person');
  } finally { saveJson(kit, `onboarding-stage-2-mock-chat-${engine}`, ev); }
} });

// --- S4 -----------------------------------------------------------------------------------------------------------------------
const crew = () => ({ lead: byRole('Firstmate'), members: [byRole('Bot Maker'), byRole('Code Reviewer')] });

const s4wired = { id: 'onboarding-stage-4-crew-wired', title: 'starter-bots R1, R6, teams R1, R2, R4, bots R4: the starter crew is a led team with Firstmate as lead and Bot Maker and Code Reviewer as members, read from the live team view, and it validates', run: async (kit) => {
  const log = []; const ev = { commands: log };
  try {
    await examples(kit, log);
    const { lead, members } = crew(); assert.ok(lead && members.every(Boolean), 'starter-bots R1 table lacks a crew row');
    assert.ok(existsSync(join(kit.home, 'teams', `${lead.team}.toml`)), `teams/${lead.team}.toml is missing (teams R1)`);
    // the public team data: owner GET /bots exposes per-bot roster and leads (bots R4, teams R4); the lead's roster is its
    // members (teams R2) and each member's leads name the lead
    const bots = await kit.api('GET', '/bots'); ev.bots = bots.json;
    assert.equal(bots.status, 200, `GET /bots returned ${bots.status}`);
    const entry = (id) => { const b = bots.json.bots.find((x) => x.id === id); assert.ok(b, `GET /bots does not list ${id}`); return b; };
    assert.deepEqual([...entry(lead.id).roster].sort(), members.map((m) => m.id).sort(), `${lead.id}'s roster is not its crew`);
    assert.deepEqual(entry(lead.id).leads, [], `${lead.id} is a lead, not led`);
    for (const m of members) { assert.deepEqual(entry(m.id).leads, [lead.id], `${m.id} is not led by ${lead.id}`); assert.deepEqual(entry(m.id).roster, [], `${m.id} has a roster as a member`); }
    await cliOk(kit, ['validate'], log);
  } finally { saveJson(kit, 'onboarding-stage-4-crew-wired', ev); }
} };

// Firstmate's one turn sends to both members; each member's turn sends one explicit reply back with no selector, which
// continuation routes to the Firstmate session that asked (messaging R1 to R4). Mock directives: verify/mock-model.mjs header.
const s4roundTrip = { id: 'onboarding-stage-4-crew-round-trip', title: 'onboarding R4 stage 4, starter-bots R6, messaging R1 to R4, teams R2, activity R1: Firstmate reaches both crew members in new sessions, their explicit replies come back to its session, and each first message records a bridge', run: async (kit) => {
  const { lead, members } = crew(); const log = []; const ev = { commands: log };
  try {
    await examples(kit, log);
    const engine = ev.engine = selectedEngines(kit)[0]; if (!engine) throw new NotRun('no adapter selected');
    for (const b of [lead, ...members]) setBotField(kit, b.id, 'model', MOCK_MODEL[engine]);
    await cliOk(kit, ['validate'], log);
    const sid = ev.leadSession = (await cliOk(kit, ['new', lead.id, '--title', 'stage 4'], log)).trim().split('\n').at(-1).trim();
    const reply = (m) => `${m.id} replies to stage 4`;
    const directive = (m) => `MOCK_TOOL send_message ${JSON.stringify({ to: m.id, new_session: 'stage 4', text: `MOCK_TOOL send_message ${JSON.stringify({ to: lead.id, text: reply(m) })}` })}`;
    await cliOk(kit, ['say', lead.id, '--session', sid, ['stage 4: ask the crew', ...members.map(directive)].join('\n')], log, { timeout: 300000 });
    // effect first: the activity feed (activity R1: `items`, each with from/to as {bot, session} and a delivered timestamp)
    // holds the four messages, then the lead's model received each reply in a lead turn
    const flows = await until('four delivered crew messages', async () => {
      const r = await kit.api('GET', '/bridge-messages'); assert.equal(r.status, 200, `GET /bridge-messages returned ${r.status}`); const it = r.json.items; ev.bridgeMessages = it;
      const pair = (a, b, toSession) => it.find((x) => x.from.bot === a && x.to.bot === b && x.delivered && (!toSession || x.to.session === toSession));
      const want = [...members.map((m) => pair(lead.id, m.id)), ...members.map((m) => pair(m.id, lead.id, sid))];   // each reply lands in the asking session (messaging R3)
      return want.every(Boolean) ? { want } : null;
    }, { timeout: 480000, every: 3000 });
    // a member's own turn also carries the reply text inside its directive; the lead's turn carries the reply as plain text
    const inLeadTurn = async (m) => (await mockSaw(kit, reply(m))).filter((r) => !lastUserText(r).includes('MOCK_TOOL'));
    const received = await until('both replies reached the lead\'s model', async () => { const s = await Promise.all(members.map(inLeadTurn)); return s.every((x) => x.length) ? s : null; }, { timeout: 480000, every: 3000 });
    ev.replyTurns = received.map((x) => x.map((r) => ({ format: r.format, tools: r.tools })));
    for (const [i, m] of members.entries()) assert.ok(received[i].length >= 1, `${lead.id} never received ${m.id}'s reply`);
    // the hand-off opened a new recipient session with that title, origin bot and reply_to the asking session (messaging R2, sessions R2)
    ev.handoffSessions = {};
    for (const [i, m] of members.entries()) {
      const out = flows.want[i]; const f = join(kit.home, 'bots', m.id, 'sessions', `${out.to.session}.json`);
      assert.ok(out.to.session && existsSync(f), `no session metadata for ${m.id}'s hand-off session`);
      const meta = ev.handoffSessions[m.id] = JSON.parse(readFileSync(f, 'utf8'));
      assert.equal(meta.title, 'stage 4'); assert.equal(meta.origin, 'bot'); assert.deepEqual({ bot: meta.reply_to?.bot, session: meta.reply_to?.session }, { bot: lead.id, session: sid });
    }
    // the first message between led teammates records a bridge (messaging R4) at bridges/<sorted-a>--<sorted-b>/ (home R2)
    for (const m of members) { const link = join(kit.home, 'bridges', [lead.id, m.id].sort().join('--'), 'link.toml'); assert.ok(existsSync(link), `no bridge record ${link.slice(kit.home.length + 1)}`); }
  } finally { saveJson(kit, 'onboarding-stage-4-crew-round-trip', ev); }
} };

// --- S5 -----------------------------------------------------------------------------------------------------------------------
// The real app on the host's virtual display, with screenshots and the accessibility tree (onboarding R4 stage 5, ui-shell R1,
// verifiability). Effect first: the daemon's bot list and the bot's sessions, then the window. Mac checks stay mac-pending.
const s5 = { id: 'onboarding-stage-5-ui', title: 'onboarding R4 stage 5, ui-shell R1, bots R4, sessions R5: the real app runs on the virtual display, shows the bots and threads tree with the Plain bot, and opens its chat on one of its sessions', run: async (kit) => {
  if (!kit.desc.app?.length) throw new NotRun('the harness descriptor has no "app" command');
  const plain = byRole('Plain bot').id; const log = []; const ev = { commands: log, mac: { 'Mac window, menu bar and notarised app': 'mac-pending' } };
  try {
    await examples(kit, log);
    // effect first: the daemon lists the Plain bot (bots R4) before any window is driven
    const bots = await kit.api('GET', '/bots'); ev.bots = { status: bots.status, json: bots.json };
    assert.equal(bots.status, 200, `GET /bots returned ${bots.status}`);
    const entry = bots.json.bots.find((b) => b.id === plain); assert.ok(entry, `GET /bots does not list ${plain}`); ev.plainEntry = entry;
    const w = await kit.app(); let bodyFailed = false;
    try {
      await w.waitFor('tree', 'Bots and threads');
      await w.click('treeitem', `Bot ${plain}`);
      // selecting a bot opens its chat (ui-shell R1), on an existing session or one the navigation creates: read the bot's
      // sessions from the API first (sessions R5), then require the conversation region to name one of them exactly
      const sessions = await until(`a session of ${plain}`, async () => { const r = await kit.api('GET', `/bots/${plain}/sessions`); assert.equal(r.status, 200, `GET /bots/${plain}/sessions returned ${r.status}`); return r.json.sessions.length ? r.json.sessions : null; }, { timeout: 60000, every: 1000 });
      ev.sessions = sessions.map((x) => ({ id: x.id, title: x.title, origin: x.origin }));
      const names = sessions.map((x) => `Conversation ${plain}/${x.id}`);
      const region = await w.waitFor('region', new RegExp(`^(${names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})$`));
      ev.ui = { region: region?.name ?? 'found' };
    } catch (e) { bodyFailed = true; throw e; }
    finally {
      // both captures are always attempted; a capture error fails a case whose body passed, and never
      // replaces a body failure, which stays the reported one
      await w.shot(evidencePath(kit, 'onboarding-stage-5-ui.png')).catch((e) => { ev.shotError = e.message; });
      await w.tree(evidencePath(kit, 'onboarding-stage-5-ui-tree.json')).catch((e) => { ev.treeError = e.message; });
      w.close();
      if (!bodyFailed && (ev.shotError || ev.treeError)) throw new Error(`evidence capture failed: ${[ev.shotError && `screenshot: ${ev.shotError}`, ev.treeError && `accessibility tree: ${ev.treeError}`].filter(Boolean).join('; ')}`);
    }
  } finally { saveJson(kit, 'onboarding-stage-5-ui', ev); }
} };

export default {
  section: 'onboarding',
  cases: [s1, s2installed, s2starterFiles, s2chat('pi'), s2chat('claude'), s4wired, s4roundTrip, s5],
};
