#!/usr/bin/env node
// The kit's own test. Run it with:   node verify/test/selftest.mjs [--worktree]
// It copies the COMMITTED tree (git archive HEAD; --worktree copies the working tree instead, for development) into a fresh
// temporary directory that has no node_modules and no lockfile, then runs every check from there with a scrubbed environment:
// the kit must start from a fresh checkout with nothing installed. The only thing fetched is the pinned Electron, into the
// kit cache (BYOH_KIT_CACHE, default ~/.cache/myharness-kit), in a directory that has its own package.json.
// Checks run against test/stub, a stub of the harness contract, so no real harness is needed. Missing prerequisites
// (an engine binary, Electron, Xvfb) FAIL; nothing is skipped silently. Exit 0 only if every check passed.
import assert from 'node:assert/strict';
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { chmodSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const arg = (n) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : undefined; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

if (!arg('--in-fresh')) {   // ---- bootstrap: a fresh copy, nothing installed, scrubbed environment ----------------------------------------------------
  const repo = execFileSync('git', ['-C', HERE, 'rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
  const fresh = mkdtempSync(join(tmpdir(), 'fhs-')); const tree = join(fresh, 'checkout'); mkdirSync(tree);
  if (process.argv.includes('--worktree')) {
    for (const f of execFileSync('git', ['-C', repo, 'ls-files', '-co', '--exclude-standard', '-z', '--', 'verify'], { encoding: 'utf8' }).split('\0').filter(Boolean)) { mkdirSync(dirname(join(tree, f)), { recursive: true }); cpSync(join(repo, f), join(tree, f)); }
  } else execFileSync('sh', ['-c', 'git -C "$1" archive HEAD verify | tar -x -C "$2"', 'sh', repo, tree]);
  const cache = process.env.BYOH_KIT_CACHE ?? join(process.env.XDG_CACHE_HOME ?? join(homedir(), '.cache'), 'myharness-kit');
  const sha = execFileSync('git', ['-C', repo, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  console.log(`fresh checkout of ${process.argv.includes('--worktree') ? 'the working tree' : sha} in ${tree}; node ${process.version}; cache ${cache}`);
  const r = spawnSync(process.execPath, [join(tree, 'verify/test/selftest.mjs'), '--in-fresh', tree], {
    stdio: 'inherit', env: { PATH: process.env.PATH, LANG: 'C.UTF-8', HOME: join(fresh, 'home'), TMPDIR: tmpdir(), BYOH_KIT_CACHE: cache } });
  rmSync(fresh, { recursive: true, force: true });   // the one directory this process made
  process.exit(r.status ?? 1);
}

// ---- the checks, run inside the fresh checkout --------------------------------------------------------------------------------
const tree = arg('--in-fresh'); mkdirSync(process.env.HOME, { recursive: true });
const { start, runDirs, PINS, engineKey } = await import(join(tree, 'verify/kit.mjs'));
const { startMock } = await import(join(tree, 'verify/mock-model.mjs'));
const KIT = join(tree, 'verify/kit.mjs'); const STUB = join(tree, 'verify/test/stub'); const SCENARIO = join(tree, 'verify/test/sample-scenario.mjs');
let passed = 0; const failed = [];
async function check(name, fn) {
  try { await fn(); passed++; console.log(`PASS ${name}`); } catch (e) { failed.push(name); console.log(`FAIL ${name}\n     ${String(e.message ?? e).split('\n').join('\n     ')}`); }
}
const kit = (args, o = {}) => spawnSync(process.execPath, [KIT, ...args], { encoding: 'utf8', env: { PATH: process.env.PATH, HOME: process.env.HOME, TMPDIR: tmpdir(), BYOH_KIT_CACHE: process.env.BYOH_KIT_CACHE }, timeout: 180000, ...o });

// Electron at the pinned version, installed once into the kit cache. npm 11 may skip package install scripts, so the binary is
// fetched explicitly and located through path.txt, a file, not through any printed output.
function ensureElectron() {
  const dir = join(process.env.BYOH_KIT_CACHE, `electron-${PINS.electron}`); const pkg = join(dir, 'node_modules/electron');
  const env = { PATH: process.env.PATH, HOME: process.env.HOME, ELECTRON_CACHE: join(process.env.BYOH_KIT_CACHE, 'electron-dl'), electron_config_cache: join(process.env.BYOH_KIT_CACHE, 'electron-dl'), npm_config_cache: join(process.env.BYOH_KIT_CACHE, 'npm') };
  if (!existsSync(join(pkg, 'path.txt'))) {
    mkdirSync(dir, { recursive: true }); writeFileSync(join(dir, 'package.json'), '{"private":true}\n');   // npm acts on the nearest package.json: this one
    const run = (cmd, a) => { const r = spawnSync(cmd, a, { cwd: dir, env, encoding: 'utf8', timeout: 600000 }); if (r.status) throw new Error(`${cmd} ${a.join(' ')} failed: ${(r.stderr || r.stdout).slice(-400)}`); };
    run('npm', ['install', '--no-audit', '--no-fund', '--no-save', '--ignore-scripts', `electron@${PINS.electron}`]);
    run(process.execPath, [join(pkg, 'install.js')]);
  }
  assert.equal(JSON.parse(readFileSync(join(pkg, 'package.json'), 'utf8')).version, PINS.electron, 'installed Electron is not the pinned version');
  return join(pkg, 'dist', readFileSync(join(pkg, 'path.txt'), 'utf8').trim());
}

const scratch = join(process.env.HOME, 'scratch'); mkdirSync(scratch, { recursive: true });
let electron; await check('prerequisites: node pin, Xvfb, pinned Electron present', async () => {
  electron = ensureElectron(); assert.ok(existsSync(electron), `no Electron binary at ${electron}`);
  const d = kit(['doctor', '--env']); assert.equal(d.status, 0, d.stdout + d.stderr);
});
const descriptor = join(scratch, 'descriptor.json');
writeFileSync(descriptor, JSON.stringify({ cli: [process.execPath, join(STUB, 'myharness.mjs')], app: [electron, join(STUB, 'app/main.cjs')], seed: [['bot', 'new', 'helper', '--model', 'mock/mock-1'], ['bot', 'new', 'other']], source: tree }));
const before = runDirs();

// -- the mock model, both wire formats, directly -----------------------------------------------------------------------------
await check('mock: OpenAI and Anthropic formats, one directive language', async () => {
  const m = await startMock({ models: 3 });
  try {
    const oa = async (content, extra = {}) => (await fetch(`${m.url}/v1/chat/completions`, { method: 'POST', body: JSON.stringify({ model: 'x', stream: true, messages: [{ role: 'user', content }], ...extra }) })).text();
    const an = async (content, extra = {}) => (await fetch(`${m.url}/v1/messages`, { method: 'POST', body: JSON.stringify({ model: 'x', stream: true, tools: [{ name: 'mcp__myharness__say' }], messages: [{ role: 'user', content }], ...extra }) })).text();
    const oaText = (s) => s.split('\n').filter((l) => l.startsWith('data: {')).map((l) => JSON.parse(l.slice(6)).choices[0]?.delta?.content ?? '').join('');
    const anText = (s) => s.split('\n').filter((l) => l.startsWith('data: {')).map((l) => JSON.parse(l.slice(6))).filter((e) => e.delta?.text).map((e) => e.delta.text).join('');
    assert.equal(oaText(await oa('[hdr]\nhello')), 'echo: hello'); assert.equal(anText(await an([{ type: 'text', text: '<system-reminder>x</system-reminder>' }, { type: 'text', text: 'hello' }])), 'echo: hello');
    const reply = 'a\n> [!NOTE]\n> b'; assert.equal(oaText(await oa(`MOCK_REPLY\n${reply}`)), reply); assert.equal(anText(await an(`MOCK_REPLY\n${reply}`)), reply);
    const b64 = Buffer.from('abc').toString('base64'); assert.equal(oaText(await oa(`MOCK_STREAM 1 ${b64}`)), 'abc'); assert.equal(anText(await an(`MOCK_STREAM 1 ${b64}`)), 'abc');
    assert.match(await oa('MOCK_USAGE 777'), /"prompt_tokens":777/); assert.match(await an('MOCK_USAGE 777'), /"input_tokens":777/);
    assert.equal((await fetch(`${m.url}/v1/chat/completions`, { method: 'POST', body: JSON.stringify({ model: 'x', messages: [{ role: 'user', content: 'MOCK_FAIL' }] }) })).status, 400);
    assert.equal((await fetch(`${m.url}/v1/messages`, { method: 'POST', body: JSON.stringify({ model: 'x', stream: true, messages: [{ role: 'user', content: 'MOCK_FAIL' }] }) })).status, 400);
    const t0 = Date.now(); await oa('MOCK_SLOW 300'); assert.ok(Date.now() - t0 >= 280, 'MOCK_SLOW did not wait');
    const tool = await an('MOCK_TOOL say {"text":"x"}'); assert.match(tool, /"name":"mcp__myharness__say"/); assert.match(tool, /"stop_reason":"tool_use"/);   // a bare tool name maps to the engine's prefixed one
    assert.match(await oa('MOCK_TOOL say {"text":"x"}'), /"finish_reason":"tool_calls"/);
    assert.equal(oaText(await oa('', { messages: [{ role: 'user', content: 'MOCK_TOOL say {}' }, { role: 'assistant', content: null, tool_calls: [] }, { role: 'tool', content: 'result line\nmore' }] })), 'done: result line');
    assert.deepEqual((await (await fetch(`${m.url}/v1/models`)).json()).data.map((x) => x.id), ['mock-1', 'mock-2', 'mock-3']);
    assert.ok((await (await fetch(`${m.url}/requests`)).json()).length >= 10); await fetch(`${m.url}/reset`, { method: 'POST' }); assert.equal(m.requests().length, 0);
    assert.equal((await fetch(`${m.url}/v1/messages/count_tokens`, { method: 'POST', body: '{}' })).status, 404);
  } finally { await m.stop(); }
});

// -- one instance, driven through every public surface -----------------------------------------------------------------------
let inst; let win;
await check('up: home, free port, discovery, health, token, identity, validate', async () => {
  inst = await start({ harness: descriptor });
  const d = JSON.parse(readFileSync(inst.discovery, 'utf8')); assert.ok(d.url.startsWith('http://127.0.0.1:') && Number(new URL(d.url).port) > 0 && !d.url.endsWith(':7797'));
  assert.ok(inst.home.startsWith(inst.root), 'home is inside the run directory');
  const bad = (await inst.doctor()).filter((c) => !c.ok); assert.deepEqual(bad, []);
  assert.ok(!existsSync(join(inst.root, 'userhome', '.myharness')));
});
await check('engines: the real pi and the real claude run on the mock (no login)', async () => {
  const pi = await inst.engine('pi', ['-p', 'hello pi']); assert.equal(pi.code, 0, pi.stderr); assert.match(pi.stdout, /echo: hello pi/);
  const cc = await inst.engine('claude', ['-p', 'hello claude']); assert.equal(cc.code, 0, cc.stderr); assert.match(cc.stdout, /echo: hello claude/);
  const cct = await inst.engine('claude', ['-p', '--allowedTools=Bash', 'MOCK_TOOL Bash {"command":"echo ran-tool","description":"t"}']); assert.match(cct.stdout, /done: ran-tool/, cct.stdout + cct.stderr);
  const pit = await inst.engine('pi', ['-p', 'MOCK_TOOL bash {"command":"echo ran-tool"}']); assert.match(pit.stdout, /done: ran-tool/, pit.stdout + pit.stderr);
  assert.notEqual((await inst.engine('claude', ['-p', 'MOCK_FAIL'])).code, 0);
  const seen = await inst.mock.requests(); assert.ok(seen.some((r) => r.format === 'openai') && seen.some((r) => r.format === 'anthropic'));
  const toml = readFileSync(join(inst.home, 'myharness.toml'), 'utf8'); assert.match(toml, /^claude = ".*claude-mock"$/m); assert.match(toml, /^pi = ".*pi-mock"$/m);
  const stamp = (await inst.engine('pi', ['-p', 'MOCK_TOOL bash {"command":"echo $BYOH_KIT_RUN"}'], { env: { BYOH_KIT_RUN: 'dropped' } })).stdout; assert.match(stamp, new RegExp(`done: ${inst.run}`), 'the engine wrapper must stamp the run even if the caller drops it');
});
await check('engine state: the daemon and the engine wrappers use the same Pi and Claude Code directories inside the run', async () => {
  const environ = Object.fromEntries(readFileSync(`/proc/${inst.state.daemon.pid}/environ`, 'utf8').split('\0').filter(Boolean).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]));
  for (const [e, key] of [['claude', 'CLAUDE_CONFIG_DIR'], ['pi', 'PI_CODING_AGENT_DIR']]) {
    const wrapped = new RegExp(`${key}='([^']+)'`).exec(readFileSync(join(inst.root, 'bin', `${e}-mock`), 'utf8'))?.[1];
    assert.ok(wrapped && wrapped.startsWith(inst.root + '/'), `the ${e} wrapper sets no ${key} inside the run`);
    assert.equal(environ[key], wrapped, `the daemon's ${key} differs from the ${e} wrapper's`);
    assert.equal(inst.env()[key], wrapped, `the run environment's ${key} differs from the ${e} wrapper's`);
  }
});
await check('api and files: the daemon effect is read first (reply, transcript file)', async () => {
  const r = await inst.api('POST', '/sessions/helper/messages', { text: 'api hello' }); assert.equal(r.status, 200); assert.equal(r.json.reply, 'echo: api hello');
  const file = readFileSync(join(inst.home, 'sessions', 'helper.jsonl'), 'utf8'); assert.match(file, /api hello/);
  assert.equal((await inst.api('GET', '/nope')).status, 404);
  const cli = await inst.cli(['bots']); assert.equal(cli.code, 0); assert.deepEqual(cli.stdout.trim().split('\n').sort(), ['helper', 'other']);
});
await check('app: Electron on a private Xvfb, loopback testing connection, window on this daemon', async () => {
  win = await inst.app(); const bad = (await inst.doctor()).filter((c) => !c.ok); assert.deepEqual(bad, []);
  const tree = await win.tree(join(scratch, 'tree.json')); assert.ok(tree.some((n) => n.role === 'button' && n.name === 'Send'));
  win.onConsoleError(() => {}); await win.eval("console.error('boom')"); await sleep(100); assert.ok(win.errors.some((e) => /boom/.test(e)), 'console errors are reported');
});
await check('driver: role + exact name, effect first then screen, state, text, regex, scope, hit-test, key, select, shot', async () => {
  await win.fill('textbox', 'Message', 'driver hi'); await win.click('button', 'Send');
  let stored; for (let i = 0; i < 50; i++) { stored = (await inst.api('GET', '/sessions/helper/messages')).json; if (stored.at(-1).text === 'echo: driver hi') break; await sleep(100); }   // the side effect first
  assert.equal(stored.at(-1).text, 'echo: driver hi');
  await win.waitFor('article', 'Reply: echo: driver hi'); await win.waitFor('article', /^You: driver/);
  const r = await win.read('article', /^Reply: echo/); assert.equal(r.text, 'echo: driver hi'); assert.ok(r.box.w > 0);
  assert.equal(await win.select('article', 'You: driver hi'), 'driver hi');
  await assert.rejects(win.click('listitem', /./), /2 matches.*listitem "helper".*listitem "other"/);
  assert.equal((await win.read('listitem', 'other', { in: { role: 'list', name: 'Sessions' } })).name, 'other');
  await assert.rejects(win.click('button', 'No such control'), /no button "No such control"/);
  await win.fill('textbox', 'Message', ''); await win.key('x'); await win.key('Shift+Y'); assert.equal((await win.read('textbox', 'Message')).value, 'xY');
  await win.fill('textbox', 'Message', 'ab'); await win.fill('textbox', 'Message', 'cd', { append: true }); assert.equal((await win.read('textbox', 'Message')).value, 'abcd');
  await win.key('Mod+A'); await win.key('Backspace'); assert.equal((await win.read('textbox', 'Message')).value, '');
  assert.deepEqual(await win.focus(), { role: 'textbox', name: 'Message' }); await win.waitFor('textbox', 'Message', { state: 'focused' });
  await win.hover('button', 'Hover target'); await win.waitFor('status', 'Hover: on');
  await win.click('button', 'Cover');   // an overlay now sits over everything: a click must be refused, not sent to the wrong control
  await assert.rejects(win.click('button', 'Send'), /covered by button "Overlay"/);
  await win.click('button', 'Overlay'); await win.waitFor('button', 'Overlay', { gone: true }); await win.click('button', 'Send');
  await assert.rejects(win.waitFor('button', 'Missing', { timeout: 300 }), /timed out waiting for button "Missing"/);
  await win.scheme('dark'); assert.equal(await win.eval("matchMedia('(prefers-color-scheme: dark)').matches"), true);
  assert.equal((await win.size(640, 500)).w <= 640, true);
  for (const [f, args] of [['w.png', []], ['send.png', ['button', 'Send']]]) { await win.shot(join(scratch, f), ...args); const b = readFileSync(join(scratch, f)); assert.equal(b.subarray(1, 4).toString(), 'PNG'); assert.ok(b.length > 500); }
  assert.deepEqual(win.crashes, []);
  const ui = kit(['ui', 'read', 'button', 'Send'], { env: { PATH: process.env.PATH, HOME: process.env.HOME, TMPDIR: tmpdir(), BYOH_KIT_DIR: inst.root } }); assert.equal(ui.status, 0, ui.stderr); assert.equal(JSON.parse(ui.stdout).name, 'Send');   // the CLI face is the same driver
  win.close();
});
await check('down: stops only this run, copies logs, removes only its own directory', async () => {
  const decoyA = mkdtempSync(join(tmpdir(), 'byoh-decoy-')); const decoyB = mkdtempSync(join(tmpdir(), 'byoh-decoy-')); writeFileSync(join(decoyB, '.byoh-kit-run'), 'someone-elses-run');
  const root = inst.root; const run = inst.run; const ev = join(scratch, 'evidence');
  try {
    await inst.stop({ evidence: ev });
    assert.ok(!existsSync(root), 'run directory still exists');
    assert.ok(existsSync(join(ev, 'logs', 'daemon.log')) && existsSync(join(ev, 'logs', 'app.log')));
    assert.deepEqual(readdirSync('/proc').filter((p) => /^\d+$/.test(p)).filter((p) => { try { return readFileSync(`/proc/${p}/environ`, 'utf8').includes(`BYOH_KIT_RUN=${run}\0`) && !/^Z/.test(readFileSync(`/proc/${p}/stat`, 'utf8').replace(/^.*\) /, '')); } catch { return false; } }), [], 'a process of the run is alive');
    assert.ok(existsSync(decoyA) && existsSync(decoyB), 'a directory that is not this run was removed');
  } finally { rmSync(decoyA, { recursive: true, force: true }); rmSync(decoyB, { recursive: true, force: true }); }   // the test's own decoys
});

// -- the CLI face: keep-at, then down; an interrupted run -----------------------------------------------------------------------
await check('run --keep-at: stops after the named case, leaves the instance up, down cleans it', async () => {
  const moved = join(scratch, 'descriptor-moved.json'); cpSync(descriptor, moved);
  const r = kit(['run', SCENARIO, '--harness', moved, '--keep-at', 'message']); assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /PASS start/); assert.match(r.stdout, /PASS message/); assert.doesNotMatch(r.stdout, /reply|hang/); assert.match(r.stdout, /KEPT /);
  const [dir] = runDirs().filter((d) => !before.includes(d)); assert.ok(dir, 'no kept run directory');
  const doc = kit(['doctor', '--run', dir]); assert.equal(doc.status, 0, doc.stdout);   // still up, still this run's
  rmSync(moved);   // down must not need the descriptor again
  const down = kit(['down', '--run', dir]); assert.equal(down.status, 0, down.stdout + down.stderr); assert.ok(!existsSync(dir));
});
await check('SIGTERM mid-run: no process or directory of the run is left; a decoy directory survives', async () => {
  const decoy = mkdtempSync(join(tmpdir(), 'byoh-decoy-')); writeFileSync(join(decoy, '.byoh-kit-run'), 'someone-elses-run');
  const ev = join(scratch, 'evidence-interrupted');
  const p = spawn(process.execPath, [KIT, 'run', SCENARIO, '--harness', descriptor, '--evidence', ev], { env: { PATH: process.env.PATH, HOME: process.env.HOME, TMPDIR: tmpdir() }, stdio: ['ignore', 'pipe', 'pipe'] });
  let out = ''; p.stdout.on('data', (d) => (out += d)); const exited = new Promise((ok) => p.on('exit', (code, sig) => ok({ code, sig })));
  try {
    for (let i = 0; i < 300 && !/PASS reply/.test(out); i++) await sleep(100);
    assert.match(out, /PASS reply/, `the scenario did not reach its hanging case:\n${out}`);
    const [dir] = runDirs().filter((d) => !before.includes(d) && d !== decoy); assert.ok(dir, 'no run directory while running');
    const run = readFileSync(join(dir, '.byoh-kit-run'), 'utf8');
    p.kill('SIGTERM'); await Promise.race([exited, sleep(30000).then(() => { throw new Error('the kit did not exit after SIGTERM'); })]);
    assert.ok(!existsSync(dir), 'run directory left behind');
    const left = readdirSync('/proc').filter((q) => /^\d+$/.test(q)).filter((q) => { try { return readFileSync(`/proc/${q}/environ`, 'utf8').includes(`BYOH_KIT_RUN=${run}\0`) && !/^Z/.test(readFileSync(`/proc/${q}/stat`, 'utf8').replace(/^.*\) /, '')); } catch { return false; } });
    assert.deepEqual(left, [], 'processes of the run are alive');
    assert.ok(existsSync(decoy), 'the decoy directory was removed');
    assert.ok(existsSync(join(ev, 'logs', 'daemon.log')), 'an interrupted run must keep its logs');
    assert.deepEqual(JSON.parse(readFileSync(join(ev, 'results.json'), 'utf8')).results.map((r) => r.id), ['start', 'message', 'reply'], 'results of the finished cases must survive');
  } finally { p.kill('SIGKILL'); rmSync(decoy, { recursive: true, force: true }); }
});
await check('two runs: --run picks one for cli, engine and ui; an unknown --only fails; a holder without the stamp blocks deletion', async () => {
  const a = await start({ harness: descriptor, engines: [] }); const b = await start({ harness: descriptor, engines: [] });
  try {
    const bare = kit(['cli', 'bots']); assert.notEqual(bare.status, 0); assert.match(bare.stderr, /2 runs are up/);
    const pick = kit(['cli', '--run', a.root, 'bots']); assert.equal(pick.status, 0, pick.stderr); assert.match(pick.stdout, /helper/);
    assert.match(kit(['ui', '--run', a.root, 'focus']).stderr, /no app is running/);   // reached run a: the verb was not mistaken for --run
    const only = kit(['run', SCENARIO, '--harness', descriptor, '--only', 'typo']); assert.notEqual(only.status, 0); assert.match(only.stderr, /no case typo/);
    // an engine child that dropped the stamp but sits in the run directory: down refuses to delete, then succeeds once it is gone
    const holder = spawn('sleep', ['60'], { cwd: b.root, env: {}, detached: true, stdio: 'ignore' });
    try { await assert.rejects(b.stop(), /hold files in the run directory/); assert.ok(existsSync(b.root), 'the run directory was deleted under a live process'); }
    finally { holder.kill('SIGKILL'); await sleep(300); }
    await b.stop(); assert.ok(!existsSync(b.root));
  } finally { await a.stop().catch(() => {}); await b.stop().catch(() => {}); }
});
await check('a daemon that dies at start: the error carries its log, --evidence keeps it, nothing is left', async () => {
  const bad = join(scratch, 'bad-descriptor.json'); const crash = join(scratch, 'crash.mjs');
  writeFileSync(crash, "if (process.argv[2] === 'daemon') { console.error('DAEMON-CRASH-MARKER'); process.exit(3); } console.log('ok');\n");
  writeFileSync(bad, JSON.stringify({ cli: [process.execPath, crash] }));
  const ev = join(scratch, 'evidence-failed-start');
  await assert.rejects(start({ harness: bad, engines: [], evidence: ev }), /the daemon exited[\s\S]*DAEMON-CRASH-MARKER/);
  assert.match(readFileSync(join(ev, 'logs', 'daemon.log'), 'utf8'), /DAEMON-CRASH-MARKER/);
  assert.deepEqual(runDirs().filter((d) => !before.includes(d)), []);
});
await check('a missing engine fails loudly and leaves nothing behind', async () => {
  const saved = process.env.PATH; process.env.PATH = join(scratch, 'empty-bin'); mkdirSync(process.env.PATH, { recursive: true });
  try { await assert.rejects(start({ harness: descriptor, engines: ['claude'] }), /engine "claude" is not installed/); } finally { process.env.PATH = saved; }
  assert.deepEqual(runDirs().filter((d) => !before.includes(d)), []);
});
const withLines = (name, lines) => { const f = join(scratch, name); writeFileSync(f, JSON.stringify({ ...JSON.parse(readFileSync(descriptor, 'utf8')), cli: [process.execPath, join(STUB, 'myharness.mjs'), ...lines.flatMap((l) => ['--init-line', l])] })); return f; };
await check('up: only the root engine key holding the bare default is replaced by the wrapper; anything else or unclear is refused', async () => {
  // the scanner on its own: root key only, strings and tables excluded, key spacing and quoting handled, fail closed
  const k = (t, e = 'pi') => engineKey(t, e).kind;
  for (const t of ['pi = "pi"\n', "pi='pi' # default\n", 'pi = [ "pi", ]\n', '  pi = "pi"\n', '"pi" = "pi"\n', "'pi'= ['pi']\n", 'a = [\n  "x",\n]\npi = "pi"\n[t]\npi = "/x"\n']) assert.equal(k(t), 'bare', t);
  for (const t of ['pi = "/opt/other/pi"\n', 'pi = ["pi", "--flag"]\n', 'pi = "claude"\n', 'notify = """\npi = "pi"\n"""\npi = "/opt/other/pi"\n', 'pi = "pi"\npi = "pi"\n', 'pi.cmd = "x"\n', '[pi]\ncmd = "x"\n', '[[pi.x]]\n', 'a = "open\n', 'a = [\n']) assert.equal(k(t), 'other', t);
  for (const t of ['', 'notify = \'\'\'\npi = "pi"\n\'\'\'\n', '[bots]\npi = "pi"\n', 'piper = 1\n', 'claude = "claude"\n']) assert.equal(k(t), 'absent', t);
  // escapes: a key spelled with an escape is refused; an escaped quote inside a multi-line basic string keeps the string open
  const bs = '\\';
  for (const t of [`"${bs}u0070i" = "/opt/x"\n`, `"${bs}u0070i" = "pi"\n`, `["${bs}u0070i"]\nx = 1\n`, `notify = ["""\n${bs}"""\n]\npi = "pi" # """]\npi = "/opt/other/pi"\n`, 'a = """x""""""\n']) assert.equal(k(t), 'other', t);
  for (const t of [`notify = ["""\n${bs}"""\n]\npi = "pi" # """]\n`, `# myharness daemon ${bs}\n#   --port 0\n`, `a = 1 # C:${bs}tools\n[t] # D:${bs}x\npi = "pi"\n`]) assert.equal(k(t), 'absent', t);   // a backslash in a comment is not a key escape
  for (const t of [`# myharness daemon ${bs}\npi = "pi" # C:${bs}pi\n`, `  # ${bs}\n"pi" = 'pi'\n`]) assert.equal(k(t), 'bare', t);
  for (const t of [`a = """x ${bs}""" y"""\npi = "pi"\n`, 'a = """x""""\npi = "pi"\n', "a = '''x'''''\npi = 'pi'\n"]) assert.equal(k(t), 'bare', t);
  assert.deepEqual(engineKey('a = 1\n[t]\npi = "pi"\n', 'pi'), { kind: 'absent', at: 1 }, 'a missing root key goes before the first table');
  // through up
  const ok = await start({ harness: withLines('descriptor-default.json', ['  pi = "pi"', "\"claude\" = [ 'claude' ]", '[table]', 'pi = "kept"']) });
  try {
    const toml = readFileSync(join(ok.home, 'myharness.toml'), 'utf8'); const ls = toml.split('\n');
    assert.match(ls[1], /^ {2}pi = ".*pi-mock"$/, toml); assert.match(ls[2], /^claude = ".*claude-mock"$/, toml); assert.deepEqual(ls.slice(3), ['[table]', 'pi = "kept"', ''], toml);
    const pi = await ok.engine('pi', ['-p', 'default replaced']); assert.equal(pi.code, 0, pi.stderr); assert.match(pi.stdout, /echo: default replaced/);
  } finally { await ok.stop(); }
  const tabled = await start({ harness: withLines('descriptor-tabled.json', ['[table]', 'x = 1']), engines: ['pi'] });
  try { assert.deepEqual(readFileSync(join(tabled.home, 'myharness.toml'), 'utf8').split('\n').slice(1).map((l) => l.replace(/".*pi-mock"/, '"<w>"')), ['pi = "<w>"', '[table]', 'x = 1', '']); }
  finally { await tabled.stop(); }
  await assert.rejects(start({ harness: withLines('descriptor-custom.json', ['pi = "/opt/other/pi"']), engines: ['pi'] }), /myharness.toml already sets "pi": the kit will not overwrite it/);
  await assert.rejects(start({ harness: withLines('descriptor-hidden.json', ['notify = """', 'pi = "pi"', '"""', 'pi = "/opt/other/pi"']), engines: ['pi'] }), /myharness.toml already sets "pi"/);
  await assert.rejects(start({ harness: withLines('descriptor-pair.json', ['claude = ["claude", "--flag"]']), engines: ['claude'] }), /myharness.toml already sets "claude"/);
  assert.deepEqual(runDirs().filter((d) => !before.includes(d)), [], 'run directories left behind');
});
await check('run --engines: one engine is wired and the other is not; an unknown engine fails', async () => {
  // this check's own runs only: its own snapshot, and runs whose state names this check's own descriptor file
  const { realpathSync } = await import('node:fs');
  const own = join(scratch, 'descriptor-engines.json'); cpSync(descriptor, own); const ownReal = realpathSync(own); const was = runDirs();
  const mine = () => runDirs().filter((d) => !was.includes(d)).filter((d) => { try { return JSON.parse(readFileSync(join(d, 'state.json'), 'utf8')).descriptor === ownReal; } catch { return false; } });
  try {
    const r = kit(['run', SCENARIO, '--harness', own, '--engines', 'pi', '--keep-at', 'start']); assert.equal(r.status, 0, r.stdout + r.stderr); assert.match(r.stdout, /PASS start/);
    const runs = mine(); assert.equal(runs.length, 1, `expected one kept run of this check, found ${runs.length}`); const [dir] = runs;
    assert.deepEqual(JSON.parse(readFileSync(join(dir, 'state.json'), 'utf8')).engines, ['pi']);
    const toml = readFileSync(join(dir, 'home', 'myharness.toml'), 'utf8'); assert.match(toml, /^pi = ".*pi-mock"$/m); assert.doesNotMatch(toml, /^claude\s*=/m);
    assert.ok(existsSync(join(dir, 'bin', 'pi-mock')) && !existsSync(join(dir, 'bin', 'claude-mock')));
    const down = kit(['down', '--run', dir]); assert.equal(down.status, 0, down.stdout + down.stderr);
    const bad = kit(['run', SCENARIO, '--harness', own, '--engines', 'pi,nope', '--only', 'start']); assert.notEqual(bad.status, 0); assert.match(bad.stderr, /engine "nope" is not installed/);
    assert.deepEqual(mine(), [], 'a run of this check was left behind');
  } finally { for (const d of mine()) kit(['down', '--run', d]); }   // only this check's runs, whatever failed above
});
await check('a failed start whose --evidence cannot be written still stops every process and removes its directory', async () => {
  const stamped = () => readdirSync('/proc').filter((q) => /^\d+$/.test(q)).filter((q) => { try { return readFileSync(`/proc/${q}/environ`, 'utf8').includes('BYOH_KIT_RUN=') && !/^Z/.test(readFileSync(`/proc/${q}/stat`, 'utf8').replace(/^.*\) /, '')); } catch { return false; } });
  const was = stamped(); const blocker = join(scratch, 'not-a-dir'); writeFileSync(blocker, 'x'); const ev = join(blocker, 'evidence');   // mkdir under a file fails
  await assert.rejects(start({ harness: withLines('descriptor-refused.json', ['pi = "/opt/other/pi"']), engines: ['pi'], evidence: ev }), (e) => /already sets "pi"/.test(e.message) && /evidence was not saved/.test(e.message));
  await assert.rejects(start({ harness: descriptor, engines: ['nope'], evidence: ev }), /engine "nope" is not installed[\s\S]*evidence was not saved/);
  await sleep(300); assert.deepEqual(stamped().filter((q) => !was.includes(q)), [], 'a process of a failed run is alive (the mock was running when the start failed)');
  assert.deepEqual(runDirs().filter((d) => !before.includes(d)), [], 'run directories left behind');
});
await check('fresh checkout: nothing was installed into it', async () => {
  for (const f of ['node_modules', 'package.json', 'package-lock.json', 'verify/node_modules', 'verify/package.json']) assert.ok(!existsSync(join(tree, f)), `${f} appeared in the checkout`);
  assert.deepEqual(runDirs().filter((d) => !before.includes(d)), [], 'run directories left behind');
});

console.log(`\nSELFTEST: ${passed} passed, ${failed.length} failed${failed.length ? ` (${failed.join('; ')})` : ''}`);
process.exit(failed.length ? 1 : 0);
