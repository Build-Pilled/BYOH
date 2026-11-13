// Shared helpers for suite scenarios. Outward only: CLI, API, files on disk, the mock model's record of what it
// received, and the app's accessibility tree. Nothing here reads harness internals.
import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chmodSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, readlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Evidence: JSON and PNG per case, under the run's logs directory, which `kit run --evidence <dir>` keeps
// (it copies logs/ there) and `kit down` removes with the run. Token bytes are never written: callers pass redacted data.
export function evidenceDir(kit) { const d = join(kit.root, 'logs', 'evidence'); mkdirSync(d, { recursive: true }); return d; }
export function saveJson(kit, name, data) { const f = join(evidenceDir(kit), `${name}.json`); writeFileSync(f, JSON.stringify(data, null, 2)); return f; }
export const evidencePath = (kit, name) => join(evidenceDir(kit), name);

// A prerequisite that is absent makes the case "not run", never a green skip.
// The kit has two results only, so a not-run case fails with this prefix and the report counts it apart.
export class NotRun extends Error { constructor(why) { super(`NOT RUN: ${why}`); this.notRun = true; } }

// CLI call that must succeed; returns stdout. Keeps argv, exit and output for the evidence.
export async function cliOk(kit, args, log, o) {
  const r = await kit.cli(args, o);
  log?.push({ argv: ['myharness', ...args], exit: r.code, stdout: r.stdout, stderr: r.stderr });
  assert.equal(r.code, 0, `myharness ${args.join(' ')} exited ${r.code}: ${(r.stderr || r.stdout).trim().slice(0, 600)}`);
  return r.stdout;
}

// Bot configuration is a file on disk (home R2, bots): set one top-level string field of bots/<id>/bot.toml.
export function setBotField(kit, bot, field, value) {
  const f = join(kit.home, 'bots', bot, 'bot.toml'); assert.ok(existsSync(f), `bots/${bot}/bot.toml is missing`);
  const src = readFileSync(f, 'utf8'); const line = `${field} = ${JSON.stringify(value)}`;
  const re = new RegExp(`^${field}\\s*=.*$`, 'm');
  // top-level fields come before the first [table]; insert there when absent
  const out = re.test(src) ? src.replace(re, line) : (/^\[/m.test(src) ? src.replace(/^\[/m, `${line}\n[`) : `${src.replace(/\n*$/, '\n')}${line}\n`);
  writeFileSync(f, out);
}

// Model ids that reach the kit's mock: Pi reads the mock provider from its agent directory (verify/mock-model.mjs), and the
// `claude-code/` prefix selects Claude Code (engine-contract R1), whose wrapper points ANTHROPIC_BASE_URL at the mock.
export const MOCK_MODEL = { pi: 'mock/mock-1', claude: 'claude-code/mock-1' };
export const MOCK_FORMAT = { pi: 'openai', claude: 'anthropic' };

// The engines this run selected (kit state), so a case runs per selected adapter (starter-bots R6).
export const selectedEngines = (kit) => kit.state.engines ?? ['pi', 'claude'];

// What the model received, filtered to requests whose last user text contains `needle`.
export function lastUserText(r) {
  const u = [...(r.messages ?? [])].reverse().find((m) => m.role === 'user'); if (!u) return '';
  const c = u.content; return typeof c === 'string' ? c : (c ?? []).map((b) => b?.text ?? (typeof b?.content === 'string' ? b.content : '')).join('\n');
}
export async function mockSaw(kit, needle) { return (await kit.mock.requests()).filter((r) => lastUserText(r).includes(needle)); }

export async function until(what, fn, { timeout = 300000, every = 1000 } = {}) {
  const end = Date.now() + timeout; let last;
  while (Date.now() < end) { last = await fn(); if (last) return last; await sleep(every); }
  throw new Error(`timed out after ${timeout / 1000} s waiting for ${what}`);
}

// A CLI call observed while it runs: every stdout/stderr chunk with the time it arrived, and the exit, so a case can prove
// that output came before settlement (cli R4: ordinary say streams model text). Same command, environment and directory as
// kit.cli; nothing is parsed from decorative text.
export function cliStream(kit, args, { timeout = 300000 } = {}) {
  return new Promise((ok) => {
    const t0 = Date.now(); const chunks = []; let out = ''; let err = '';
    const p = spawn(kit.desc.cli[0], [...kit.desc.cli.slice(1), ...args], { cwd: kit.root, env: kit.env(), stdio: ['ignore', 'pipe', 'pipe'] });
    const timer = setTimeout(() => p.kill('SIGKILL'), timeout);
    p.stdout.on('data', (d) => { out += d; chunks.push({ ms: Date.now() - t0, stream: 'stdout', text: String(d) }); });
    p.stderr.on('data', (d) => { err += d; chunks.push({ ms: Date.now() - t0, stream: 'stderr', text: String(d) }); });
    p.on('close', (code, signal) => { clearTimeout(timer); ok({ code: code ?? 1, signal, ms: Date.now() - t0, stdout: out, stderr: err, chunks }); });
  });
}

// The sessions that have a live engine process for a bot, from owner GET /bots (bots R4: live session/running summaries).
export async function liveSessions(kit, bot) {
  const r = await kit.api('GET', '/bots'); assert.equal(r.status, 200, `GET /bots returned ${r.status}`);
  const b = r.json.bots.find((x) => x.id === bot); assert.ok(b, `GET /bots does not list ${bot}`);
  return b.live.map((x) => x.session);
}

// Durable person input (turns R1): a fresh lowercase UUID per item.
export const newId = () => crypto.randomUUID();

// The R1 address table of starter-bots, read from the spec rather than repeated as literals (starter-bots R1).
export function starterTable(specDir) {
  const md = readFileSync(join(specDir, 'starter-bots.md'), 'utf8');
  const rows = md.split('\n').filter((l) => /^\s*\|\s*[A-Z][^|]*\|\s*`[a-z-]+`\s*\|/.test(l));
  return rows.map((l) => { const c = l.trim().split('|').slice(1, -1).map((s) => s.trim().replace(/`/g, '')); return { role: c[0], id: c[1], team: c[2] === 'none' ? null : c[2], membership: c[3] }; });
}

// ---- Helpers --------------------------------------------------------------------------------------------------------------------

// The engine a single-engine case runs on: the first adapter this run selected.
export const firstEngine = (kit) => selectedEngines(kit)[0];

// A bot on the mock model of one engine (bots R2, R3).
export async function mockBot(kit, id, engine, log) {
  if (!existsSync(join(kit.home, 'bots', id, 'bot.toml'))) await cliOk(kit, ['bot', 'new', id, '--model', MOCK_MODEL[engine]], log);
  setBotField(kit, id, 'model', MOCK_MODEL[engine]);
}
export async function newSession(kit, bot, title, log) { return (await cliOk(kit, ['new', bot, '--title', title], log)).trim().split('\n').at(-1).trim(); }

// Whether a turn runs in a session: the live summary of owner GET /bots (bots R4: live entries {session, running}).
export async function running(kit, bot, sid) {
  const r = await kit.api('GET', '/bots'); assert.equal(r.status, 200, `GET /bots returned ${r.status}`);
  const b = r.json.bots.find((x) => x.id === bot); assert.ok(b, `GET /bots does not list ${bot}`);
  return b.live.some((x) => x.session === sid && x.running === true);
}

// Owner session detail (sessions R5) and its pinned lists: outbound (turns R5), incoming (messaging R6), attached (terminal-chat R2).
export async function detail(kit, bot, sid) {
  const r = await kit.api('GET', `/sessions/${bot}/${sid}`); assert.equal(r.status, 200, `GET /sessions/${bot}/${sid} returned ${r.status}`); return r.json;
}
export async function outboundItem(kit, bot, sid, id) { return (await detail(kit, bot, sid)).outbound.find((i) => i.id === id); }

// Durable person input (turns R1): {id, mode, text}; the response is {session, item?}.
export async function durable(kit, bot, sid, mode, text, log) {
  const id = newId(); const r = await kit.api('POST', `/sessions/${bot}/${sid}/say`, { id, mode, text });
  log?.push({ api: `POST /sessions/${bot}/${sid}/say`, body: { id, mode, text }, status: r.status, json: r.json ?? null });
  return { id, status: r.status, json: r.json };
}
// A queue action on one follow-up (turns R3).
export async function queueAction(kit, bot, sid, id, body, log) {
  const r = await kit.api('POST', `/sessions/${bot}/${sid}/queue/${id}`, body);
  log?.push({ api: `POST /sessions/${bot}/${sid}/queue/${id}`, body, status: r.status, json: r.json ?? null });
  return r;
}

// Held mock turn: the model waits `ms` before answering (verify/mock-model.mjs MOCK_SLOW); resolves once the model has the request.
export async function holdTurn(kit, bot, sid, marker, ms, log, extra = '') {
  const r = await durable(kit, bot, sid, 'steer', `${marker}\nMOCK_SLOW ${ms}${extra}`, log);
  assert.ok(r.status < 300 && r.json?.item, `the held turn was not accepted: ${r.status} ${JSON.stringify(r.json)}`);
  await until(`the model holds "${marker}"`, async () => (await mockSaw(kit, marker)).length > 0, { timeout: 240000, every: 300 });
  return r;
}
// Whether the model received a request whose last user text contains `needle` within `ms` (polled).
export async function seenWithin(kit, needle, ms) {
  const end = Date.now() + ms; while (Date.now() < end) { if ((await mockSaw(kit, needle)).length) return true; await sleep(500); } return false;
}

// Daemon restart through its public lifecycle (daemon R1, R2): SIGTERM to the pid in the discovery file, wait for the
// clean stop (the discovery file goes), then start `myharness daemon` on the same port so the run's address stays valid. The new
// daemon is started as a process of this run (kit finding K9: the kit has no restart verb yet). The descriptor's cli may be a
// launcher (for example `sh launcher.sh`), so the daemon can be a child of the process the kit started: what is checked is that
// the discovered daemon is in the process group the kit created for it (the kit starts it detached, as a group leader) and
// carries the run's stamp, and that authenticated health names that same pid, this home and the address. Only that pid is signalled.
export const pgroupOf = (pid) => { try { return Number(readFileSync(`/proc/${pid}/stat`, 'utf8').replace(/^.*\) /, '').split(' ')[2]); } catch { return null; } };
export const stampOf = (pid) => { try { return readFileSync(`/proc/${pid}/environ`, 'utf8').split('\0').find((x) => x.startsWith('BYOH_KIT_RUN=')) ?? null; } catch { return null; } };
// A daemon this run started, checked before it is driven or signalled: the pid is in the process group that was started for it
// and carries the run's stamp, and owner-authenticated GET /health (daemon R3) names that pid, the expected home and the URL.
export async function checkDaemon(kit, { pid, url, leader, home, token }, what) {
  assert.ok(Number.isInteger(pid) && pid > 0, `${what}: no valid pid`);
  assert.equal(pgroupOf(pid), leader, `${what}: pid ${pid} is in process group ${pgroupOf(pid)}, not the group ${leader} started for it`);
  assert.equal(stampOf(pid), `BYOH_KIT_RUN=${kit.run}`, `${what}: process ${pid} does not carry this run's stamp`);
  const r = await fetch(`${url}/health`, { headers: { authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(30000) });
  let j = {}; try { j = JSON.parse(await r.text()); } catch {}
  const seen = { status: r.status, ok: j?.ok, pid: j?.pid, home: j?.home, url: j?.url };
  assert.deepEqual(seen, { status: 200, ok: true, pid, home, url }, `${what}: GET /health does not name this pid, home and address`);
  return seen;
}
async function verifiedDaemon(kit, disc, leader, what) {
  assert.equal(disc.url, kit.url, `${what}: discovery names ${disc.url}, not this run's daemon address ${kit.url}`);
  return checkDaemon(kit, { pid: disc.pid, url: disc.url, leader, home: kit.home, token: readFileSync(kit.tokenFile, 'utf8').trim() }, what);
}
export async function restartDaemon(kit, log) {
  const stopped = await stopRunDaemon(kit, log);
  return startRunDaemon(kit, stopped, log);
}
// The two halves of that restart, for cases whose path needs time to pass, or a file to change, while the daemon is down (still a stop,
// then a start on the same port). The stop returns what the start needs; the start checks the new daemon the same way.
export async function stopRunDaemon(kit, log) {
  const before = JSON.parse(readFileSync(kit.discovery, 'utf8'));
  const healthBefore = await verifiedDaemon(kit, before, kit.state.daemon?.pid, 'before the restart');
  process.kill(before.pid, 'SIGTERM');
  await until('the daemon stopped and removed its discovery file', async () => { try { process.kill(before.pid, 0); return false; } catch { return !existsSync(kit.discovery); } }, { timeout: 30000, every: 100 });
  const stopped = { pid: before.pid, url: before.url, port: new URL(before.url).port, healthBefore, at: new Date().toISOString() };
  log?.push({ stop: { stoppedPid: stopped.pid, healthBefore, at: stopped.at } });
  return stopped;
}
export async function startRunDaemon(kit, stopped, log) {
  const leader = kit.spawnOwned('daemon', [...kit.desc.cli, 'daemon', '--port', stopped.port]).pid;
  const after = await until('the restarted daemon wrote its discovery file', async () => { try { const d = JSON.parse(readFileSync(kit.discovery, 'utf8')); return d.pid !== stopped.pid ? d : null; } catch { return null; } }, { timeout: 30000, every: 200 });
  const entry = { stoppedPid: stopped.pid, healthBefore: stopped.healthBefore, leader, discovery: { pid: after.pid, url: after.url }, at: new Date().toISOString() }; log?.push({ restart: entry });
  entry.healthAfter = await verifiedDaemon(kit, after, leader, 'after the restart');
  assert.equal(after.url, stopped.url, 'the restarted daemon is not on the same address');
  return after;
}

// The engine launch command of the run's home (verifiability R5: the root key `pi` or `claude` of myharness.toml, a string or a
// list of strings). The kit wrote that line; a case replaces it with its own stub and gets back a function that restores the
// exact earlier file. The daemon reads the new command once it is restarted, which is how the cases apply it.
export function setEngineCommand(kit, engine, argv) {
  const f = join(kit.home, 'myharness.toml'); const before = readFileSync(f, 'utf8');
  const re = new RegExp(`^${engine}\\s*=.*$`, 'm'); assert.ok(re.test(before), `myharness.toml has no root "${engine}" line to replace`);
  writeFileSync(f, before.replace(re, `${engine} = ${JSON.stringify(argv)}`));
  return () => writeFileSync(f, before);
}
// A stub engine command: a small sh script in the run's bin directory that carries the run's stamp (so the kit's stop finds it)
// and runs `body`. It is never a real engine; a case uses it only to make the engine fail in the way its rule names.
export function stubEngine(kit, name, body) {
  const f = join(kit.root, 'bin', name);
  writeFileSync(f, `#!/bin/sh\nexport BYOH_KIT_RUN='${kit.run}'\n${body}\n`); chmodSync(f, 0o755);
  return f;
}
// One-use configured start: the sender execs the real mock-backed wrapper after moving this executable aside.
// The recipient's subsequent start then fails before spawning (missing command), on either adapter, without dispatching input.
export function refuseRecipientStart(kit, engine, sender) {
  const quote = (s) => `'${String(s).replace(/'/g, `'\\''`)}'`;
  const real = kit.engineCommand(engine).map(quote).join(' ');
  const cwd = join(kit.home, 'bots', sender);
  setBotField(kit, sender, 'cwd', cwd);
  const stub = stubEngine(kit, `refuse-recipient-${sender}`, `test "$PWD" = ${quote(cwd)} || exit 71\nmv -- "$0" "$0.refused" || exit 72\nexec ${real} "$@"`);
  return setEngineCommand(kit, engine, [stub]);
}
// A path that does not exist: an engine command that cannot start (bots E3: a missing chosen engine is an explicit failure).
export const missingEngine = (kit) => join(kit.root, 'bin', 'no-such-engine');

// Every regular file and symlink below `root` with its bytes digest (symlinks by target), as a map of relative path -> digest.
// `skip(rel)` leaves a subtree out. Used to show that an operation removed exactly its own files and changed nothing else.
export function treeState(root, skip = () => false) {
  const out = {};
  const walk = (dir, rel) => {
    let names; try { names = readdirSync(dir); } catch { return; }
    for (const n of names.sort()) {
      const r = rel ? `${rel}/${n}` : n; if (skip(r)) continue; const p = join(dir, n); let st; try { st = lstatSync(p); } catch { continue; }
      if (st.isSymbolicLink()) out[r] = `link:${readlinkSync(p)}`;
      else if (st.isDirectory()) { out[`${r}/`] = 'dir'; walk(p, r); }
      else if (st.isFile()) out[r] = createHash('sha256').update(readFileSync(p)).digest('hex');
    }
  };
  walk(root, ''); return out;
}
// The difference of two treeState maps: added, removed and changed paths.
export function treeDiff(a, b) {
  const added = Object.keys(b).filter((k) => !(k in a)); const removed = Object.keys(a).filter((k) => !(k in b));
  const changed = Object.keys(a).filter((k) => k in b && a[k] !== b[k]); return { added, removed, changed };
}

// Terminal chat in a pseudo-terminal (terminal-chat R1, R2; its Proof line): `myharness pi <bot> [session]` under util-linux
// `script`, which gives the command a real terminal. A missing `script` makes the case not run.
export function openTerminal(kit, bot, sid) {
  try { execFileSync('script', ['--version'], { stdio: 'ignore' }); } catch { throw new NotRun('util-linux `script` is needed to give terminal chat a pseudo-terminal'); }
  const q = (s) => `'${String(s).replace(/'/g, `'\\''`)}'`;
  const argv = [...kit.desc.cli, 'pi', bot, ...(sid ? [sid] : [])];
  const p = spawn('script', ['-qfec', argv.map(q).join(' '), '/dev/null'], { cwd: kit.root, env: { ...kit.env(), TERM: 'xterm-256color', COLUMNS: '120', LINES: '40' }, stdio: ['pipe', 'pipe', 'pipe'] });
  let out = ''; let exit; p.stdout.on('data', (d) => { out += d; }); p.stderr.on('data', (d) => { out += d; });
  const done = new Promise((ok) => p.on('exit', (code, signal) => { exit = { code, signal }; ok(exit); }));
  // the screen text without terminal control sequences
  const screen = () => out.replace(/\x1b\][^\x07]*\x07/g, '').replace(/\x1b\[[0-9;?]*[ -\/]*[@-~]/g, '').replace(/\r/g, '');
  const close = async () => { if (exit) return exit; p.stdin.write('\x03'); await Promise.race([done, sleep(1500)]); if (!exit) { p.stdin.write('\x04'); await Promise.race([done, sleep(1500)]); } if (!exit) { p.kill('SIGTERM'); await Promise.race([done, sleep(3000)]); } if (!exit) p.kill('SIGKILL'); return done; };
  return { argv, screen, done, close, get exit() { return exit; } };
}
export async function attachedWithin(kit, bot, sid, want, ms = 60000) {
  return until(`session ${bot}/${sid} attached=${want}`, async () => (await detail(kit, bot, sid)).attached === want, { timeout: ms, every: 500 }).then(() => true);
}

// Session ids a bot has on disk (sessions R2: bots/<bot>/sessions/<uuid>.json), oldest first by file name order of creation time.
export function sessionIds(kit, bot) {
  const d = join(kit.home, 'bots', bot, 'sessions'); if (!existsSync(d)) return [];
  return readdirSync(d).filter((f) => /^[0-9a-f-]{36}\.json$/.test(f)).map((f) => ({ id: f.slice(0, 36), meta: JSON.parse(readFileSync(join(d, f), 'utf8')) }));
}
// A team file (teams R1).
export function writeTeam(kit, id, lead, members) {
  mkdirSync(join(kit.home, 'teams'), { recursive: true });
  writeFileSync(join(kit.home, 'teams', `${id}.toml`), `name = ${JSON.stringify(id)}\n${lead ? `lead = ${JSON.stringify(lead)}\n` : ''}members = ${JSON.stringify(members)}\n`);
}
// The engine-facing send_message tool (messaging R1) driven through the mock: the bot's model calls it in this turn.
export const SEND_TOOL = { pi: 'send_message', claude: 'mcp__myharness__send_message' };
// Mock directives inside the message (for the recipient's model) are written as \u005f in the JSON, so the mock does not also apply
// them to the sender's own request; the engine decodes the JSON, and the recipient receives the plain directive.
export async function botSends(kit, bot, sid, engine, args, log) {
  const json = JSON.stringify(args).replace(/MOCK_/g, 'MOCK\\u005f');
  return cliOk(kit, ['say', bot, '--session', sid, `MOCK_TOOL ${SEND_TOOL[engine]} ${json}`], log, { timeout: 300000 });
}

// A window step: starts the app if needed, runs `body(w)`, then always attempts both captures, the screenshot and
// the accessibility tree. A capture error fails a step whose body passed and never replaces a body failure.
// A descriptor without an app makes the case not run.
export async function windowStep(kit, ev, name, body) {
  if (!kit.desc.app?.length) throw new NotRun('the harness descriptor has no "app" command for the window step');
  const w = kit.state.app?.cdp ? await kit.window() : await kit.app(); let bodyFailed = false;
  try { return await body(w); } catch (e) { bodyFailed = true; throw e; }
  finally {
    await w.shot(evidencePath(kit, `${name}.png`)).catch((e) => { ev.shotError = e.message; });
    await w.tree(evidencePath(kit, `${name}-tree.json`)).catch((e) => { ev.treeError = e.message; });
    w.close();
    if (!bodyFailed && (ev.shotError || ev.treeError)) throw new Error(`evidence capture failed: ${[ev.shotError && `screenshot: ${ev.shotError}`, ev.treeError && `accessibility tree: ${ev.treeError}`].filter(Boolean).join('; ')}`);
  }
}
// The Bot threads sidebar section (messaging Controls, ui-shell R1): expand if collapsed,
// then open the pair directly. There is no Tools entry or bridge-list page.
export async function openBotThread(w, a, b) {
  const heading = await w.read('button', 'Bot threads', { in: { role: 'tree', name: 'Bots and threads' } });
  if (!heading.states.expanded) await w.click('button', 'Bot threads', { in: { role: 'tree', name: 'Bots and threads' } });
  const [first, second] = [a, b].sort();
  await w.click('button', `Thread ${first} and ${second}`, { in: { role: 'tree', name: 'Bots and threads' } });
}
