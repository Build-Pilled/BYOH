// daemon: the owner credential, request authentication, separate bot-session authority and the CLI's client errors (daemon R2 to
// R7, E1, E2, E4). Outward only: the CLI, the API, and files on disk. Start and stop cases use a disposable home inside the run
// with its own `myharness daemon`; the run's own daemon is used only where a case says so. Every
// daemon a case starts is checked (process group, run stamp, authenticated health naming its pid, home and address) before the
// case drives or signals it. Token bytes are never recorded: evidence holds statuses, lengths, modes and booleans.
// Each case names the broken implementation it catches. A case passes only on an outcome it observed: a timeout, an unresolved
// process or an unobservable step is a failure or NOT RUN, never a pass.
import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chmodSync, existsSync, lstatSync, mkdirSync, openSync, readdirSync, readFileSync, readlinkSync, renameSync, rmSync, symlinkSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { join } from 'node:path';
import { MOCK_MODEL, checkDaemon, firstEngine, mockBot, mockSaw, newSession, pgroupOf, saveJson, sleep, stampOf, stubEngine, until } from './lib.mjs';

const B64URL = /^[A-Za-z0-9_-]+$/;
const digest = (b) => createHash('sha256').update(b).digest('hex');
const tokenPath = (home) => join(home, 'secrets', 'owner-token');
const discoveryPath = (home) => join(home, 'log', 'daemon.json');
const readDiscovery = (home) => { try { return JSON.parse(readFileSync(discoveryPath(home), 'utf8')); } catch { return null; } };
const alive = (pid) => { try { process.kill(pid, 0); return true; } catch { return false; } };
const homeToken = (home) => readFileSync(tokenPath(home), 'utf8').trim();

// What a token path is, without its bytes: type, mode, owner, size, and a digest kept only in memory for "unchanged" checks.
function pathState(file) {
  let st; try { st = lstatSync(file); } catch { return { exists: false }; }
  const type = st.isSymbolicLink() ? 'symlink' : st.isDirectory() ? 'directory' : st.isFile() ? 'file' : 'other';
  const s = { exists: true, type, mode: (st.mode & 0o777).toString(8), uid: st.uid, size: st.size, ino: st.ino };
  Object.defineProperty(s, 'sum', { enumerable: false, value: type === 'file' ? digest(readFileSync(file)) : type === 'symlink' ? `link:${readlinkSync(file)}` : null });
  return s;
}
const same = (a, b) => a.exists === b.exists && a.type === b.type && a.mode === b.mode && a.size === b.size && a.ino === b.ino && a.sum === b.sum;
// The format of a token file's content (daemon R4): 43 to 256 base64url characters, at most one final newline.
function tokenFormat(buf) {
  const t = buf.toString('utf8'); const body = t.endsWith('\n') ? t.slice(0, -1) : t;
  return { length: body.length, finalNewline: t.endsWith('\n'), base64url: B64URL.test(body), valid: body.length >= 43 && body.length <= 256 && B64URL.test(body) };
}

// A fresh initialized home inside the run (home R1).
async function freshHome(kit, name, log) {
  const home = join(kit.root, 'homes', name); mkdirSync(join(kit.root, 'homes'), { recursive: true });
  const r = await kit.cli(['init'], { env: { MYHARNESS_HOME: home } }); log.push({ cmd: 'init', home, code: r.code });
  assert.equal(r.code, 0, `myharness init in ${home} exited ${r.code}`);
  return home;
}
// A CLI call in a disposable home. Only the exit code, the elapsed time and booleans are kept; `secrets` are the token values
// known to the case, and every result is checked for them. A call that runs into its time limit is marked and never passes.
const CLI_LIMIT = 60000;
async function cliIn(kit, home, args, secrets, log) {
  const t0 = Date.now(); const r = await kit.cli(args, { env: { MYHARNESS_HOME: home }, timeout: CLI_LIMIT });
  const out = { code: r.code, ms: Date.now() - t0, timedOut: Date.now() - t0 >= CLI_LIMIT - 1000, leaks: secrets().some((t) => t && (r.stdout.includes(t) || r.stderr.includes(t))) };
  log.push({ cmd: args.join(' '), home, ...out }); return { ...out, stdout: r.stdout, stderr: r.stderr };
}

// `myharness daemon` for a disposable home, started detached as its own process group with the run's stamp (kit.env()). Its
// output is not captured: a daemon that printed its token would otherwise put it in the run's logs, which are exported as
// evidence. The cases keep only exit statuses, HTTP statuses and booleans.
function homeDaemon(kit, name, home, log, port = 0, stderrFile) {
  const argv = [...kit.desc.cli, 'daemon', '--port', String(port)];
  // a case that must read the daemon's error output gives a file inside the run directory (never logs/, which is exported); the
  // case keeps only the lines its rule names, after checking them for the token
  const stdio = stderrFile ? ['ignore', 'ignore', openSync(stderrFile, 'a')] : 'ignore';
  const p = spawn(argv[0], argv.slice(1), { cwd: kit.root, env: kit.env({ MYHARNESS_HOME: home }), detached: true, stdio });
  let exit = null; const done = new Promise((ok) => p.on('exit', (code, signal) => { exit = { code, signal }; ok(exit); }));
  const d = { name, home, port, leader: p.pid, done, get exit() { return exit; }, started: Date.now() };
  log.push({ start: name, home, port }); return d;
}
// Wait for the daemon's announcement, then check it before anything else touches it.
async function listening(kit, d, token, ms = 60000) {
  const disc = await until(`${d.name} wrote its discovery file`, async () => {
    if (d.exit) throw new Error(`${d.name} exited ${JSON.stringify(d.exit)} before announcing itself`);
    const x = readDiscovery(d.home); return x && pgroupOf(x.pid) === d.leader ? x : null;
  }, { timeout: ms, every: 50 });
  d.health = await checkDaemon(kit, { pid: disc.pid, url: disc.url, leader: d.leader, home: d.home, token: token ?? homeToken(d.home) }, d.name);
  d.pid = disc.pid; d.url = disc.url; return disc;
}
// Stop a checked daemon: check it again, signal only its pid, and require the clean stop (daemon R1, R2).
async function stopDaemon(kit, d, token, log) {
  await checkDaemon(kit, { pid: d.pid, url: d.url, leader: d.leader, home: d.home, token }, `${d.name} before its stop`);
  process.kill(d.pid, 'SIGTERM');
  await until(`${d.name} stopped and removed its discovery file`, async () => !alive(d.pid) && !existsSync(discoveryPath(d.home)), { timeout: 30000, every: 100 });
  log.push({ stop: d.name, pid: d.pid, discoveryRemoved: true });
  await Promise.race([d.done, sleep(10000)]);
}
// Cleanup of a process group this case started, only while its leader still carries the run's stamp.
async function reap(kit, d) {
  if (!d || d.exit) return;
  if (stampOf(d.leader) === `BYOH_KIT_RUN=${kit.run}`) { try { process.kill(-d.leader, 'SIGKILL'); } catch {} }
  await Promise.race([d.done, sleep(5000)]);
}
async function raw(url, method, path, headers = {}, body) {
  const r = await fetch(url + path, { method, headers: body === undefined ? headers : { ...headers, 'content-type': 'application/json' }, body, signal: AbortSignal.timeout(30000) });
  return { status: r.status, text: await r.text() };
}
const freePort = () => new Promise((ok, no) => { const s = createServer(); s.once('error', no); s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => ok(port)); }); });

// Catches: a token written with the default umask (0644) or in a broad secrets folder, a short, padded or standard-base64 token,
// a token committed to the home history, a token regenerated at every start, and a clean stop that leaves the discovery file.
const tokenNewAndKept = { id: 'daemon-owner-token-new-and-kept', title: 'daemon R2, R3, R4 (home R6): a daemon start on a home without a token makes one of 32 random bytes as 43 base64url characters and a newline, at 0600 in a 0700 folder outside the home history, and keeps it across a clean restart', run: async (kit) => {
  const ev = { catches: 'a token at the default umask or in a broad folder; a short, padded or standard-base64 token; a token in the home history; a token regenerated at each start; a clean stop that leaves discovery', commands: [], steps: {} }; let d;
  try {
    const home = await freshHome(kit, 'token-new', ev.commands);
    ev.steps.tokenBeforeStart = pathState(tokenPath(home));
    assert.equal(ev.steps.tokenBeforeStart.exists, false, 'the fresh home already holds a token; a new token cannot be observed');
    d = homeDaemon(kit, 'daemon-token-new', home, ev.commands); await listening(kit, d); ev.steps.health = d.health;
    const st = pathState(tokenPath(home)); const fmt = tokenFormat(readFileSync(tokenPath(home)));
    ev.steps.token = { ...st, format: fmt, secretsMode: (statSync(join(home, 'secrets')).mode & 0o777).toString(8) };
    assert.equal(st.type, 'file', 'the owner token is not a regular file');
    assert.equal(st.mode, '600', 'a new owner token is not mode 0600');
    assert.equal(st.uid, process.getuid(), 'the owner token is not owned by the daemon user');
    assert.equal(ev.steps.token.secretsMode, '700', 'a new secrets directory is not mode 0700');
    assert.deepEqual([fmt.length, fmt.finalNewline, fmt.base64url], [43, true, true], 'a new token is not 43 base64url characters and a newline');
    assert.equal(Buffer.from(homeToken(home), 'base64url').length, 32, 'a new token does not hold 32 bytes');
    assert.deepEqual(readdirSync(join(home, 'secrets')), ['owner-token'], 'the secrets directory holds more than the token');
    let ignored = true; try { execFileSync('git', ['-C', home, 'check-ignore', '-q', 'secrets/owner-token']); } catch { ignored = false; }
    const tracked = execFileSync('git', ['-C', home, 'log', '--all', '--name-only', '--format='], { encoding: 'utf8' }).split('\n').filter((l) => l.startsWith('secrets/'));
    ev.steps.history = { ignored, trackedSecrets: tracked.length };
    assert.equal(ignored, true, 'secrets/owner-token is not excluded from the home history (home R6)');
    assert.equal(tracked.length, 0, 'the home history holds a path under secrets/ (home R6)');
    const token = homeToken(home);
    await stopDaemon(kit, d, token, ev.commands); d = null;
    assert.equal(existsSync(discoveryPath(home)), false, 'a clean stop left the discovery file (daemon R2)');
    d = homeDaemon(kit, 'daemon-token-new-2', home, ev.commands); await listening(kit, d, token); ev.steps.healthAfterRestart = d.health;
    const st2 = pathState(tokenPath(home)); ev.steps.afterRestart = { ...st2, unchanged: same(st, st2) };
    assert.equal(same(st, st2), true, 'a clean restart changed the owner token (daemon R4: a valid token is kept)');
    await stopDaemon(kit, d, token, ev.commands); d = null;
  } finally { await reap(kit, d); saveJson(kit, 'daemon-owner-token-new-and-kept', ev); }
} };

// Catches: authentication applied only to known routes (unknown paths, the app root or OPTIONS answered without a token), a token
// accepted from the query, a cookie, a bare or Basic header or another header, a case-sensitive scheme, and a 401 that echoes it.
const needOwnerToken = { id: 'daemon-requests-need-owner-token', title: 'daemon R3, R5: health and every other route answer 401 without the owner token in a Bearer header, whatever the method or path, unknown paths and OPTIONS included; a token in the query, a cookie, a bare or Basic header or another header does not count, and no 401 echoes it', run: async (kit) => {
  const ev = { catches: 'authentication only on known routes; a token taken from the query, a cookie, a bare, Basic or other header; a case-sensitive scheme; a 401 echoing the token', commands: [], steps: { rejected: 0, failures: [] } };
  try {
    const engine = firstEngine(kit); await mockBot(kit, 'dauth', engine, ev.commands);
    const sid = await newSession(kit, 'dauth', 'auth matrix', ev.commands);
    const token = readFileSync(kit.tokenFile, 'utf8').trim(); const wrong = 'w'.repeat(43);
    const routes = [['GET', '/health'], ['GET', '/'], ['GET', '/bots'], ['GET', '/byoh-suite-no-such-route'], ['OPTIONS', '/bots'], ['OPTIONS', '/health'],
      ['POST', `/sessions/dauth/${sid}/token`], ['GET', `/sessions/dauth/${sid}`], ['PATCH', `/sessions/dauth/${sid}`, '{}'], ['DELETE', '/byoh-suite-no-such-route'],
      ['PUT', '/byoh-suite-no-such-route', '{}'], ['POST', '/attach', '{}'], ['GET', '/mailbox']];
    const attempts = [['no credential', {}, ''], ['a wrong token', { authorization: `Bearer ${wrong}` }, ''],
      ['the owner token as Basic', { authorization: `Basic ${token}` }, ''], ['the owner token as Basic user:password', { authorization: `Basic ${Buffer.from(`x:${token}`).toString('base64')}` }, ''],
      ['the owner token bare', { authorization: token }, ''], ['the owner token in the query', {}, `token=${token}`], ['the owner token as access_token', {}, `access_token=${token}`],
      ['the owner token in a cookie', { cookie: `token=${token}; owner-token=${token}` }, ''], ['the owner token in another header', { 'x-api-key': token, 'x-owner-token': token }, '']];
    for (const [method, path, body] of routes) for (const [what, headers, q] of attempts) {
      const p = q ? `${path}${path.includes('?') ? '&' : '?'}${q}` : path;
      const r = await raw(kit.url, method, p, headers, body);
      ev.steps.rejected++;
      if (r.status !== 401) ev.steps.failures.push(`${method} ${path} with ${what}: ${r.status}`);
      if (r.text.includes(token) || r.text.includes(wrong)) ev.steps.failures.push(`${method} ${path} with ${what}: the reply echoes a token`);
    }
    ev.steps.accepted = {};
    for (const [what, auth] of [['Bearer', `Bearer ${token}`], ['bearer, three spaces', `bearer   ${token}`], ['BEARER, a tab', `BEARER\t${token}`]]) {
      ev.steps.accepted[what] = { health: (await raw(kit.url, 'GET', '/health', { authorization: auth })).status, bots: (await raw(kit.url, 'GET', '/bots', { authorization: auth })).status };
    }
    assert.equal(ev.steps.rejected, routes.length * attempts.length, 'not every attempt was made');
    assert.deepEqual(ev.steps.failures, [], `requests without a valid owner Bearer header were not refused with a clean 401 (daemon R5): ${ev.steps.failures.slice(0, 5).join('; ')}`);
    for (const [what, s] of Object.entries(ev.steps.accepted)) assert.deepEqual(s, { health: 200, bots: 200 }, `the owner token with the scheme written ${what} was not accepted (daemon R5)`);
  } finally { saveJson(kit, 'daemon-requests-need-owner-token', ev); }
} };

// Catches: one token table for both credentials (the owner token accepted on bot routes, a session token on owner routes),
// a token route open without owner authentication, and a mailbox that answers a session holding no attachment as if it did.
const separateAuthority = { id: 'daemon-credentials-stay-separate', title: 'daemon R6 (terminal-chat R2, R3): only the owner token issues a session token; the session token reaches the bot-facing mailbox, which answers 409 not attached for a session no terminal holds, and opens no owner route; the owner token does not open a bot-facing route', run: async (kit) => {
  const ev = { catches: 'one token table for both credentials; a token route open without the owner token; a mailbox read answered as attached when no terminal holds the session', commands: [], steps: {} };
  try {
    const engine = firstEngine(kit); await mockBot(kit, 'dsep', engine, ev.commands);
    const sid = await newSession(kit, 'dsep', 'credential split', ev.commands);
    const owner = { authorization: `Bearer ${readFileSync(kit.tokenFile, 'utf8').trim()}` };
    ev.steps.issueWithout = (await raw(kit.url, 'POST', `/sessions/dsep/${sid}/token`)).status;
    const issued = await raw(kit.url, 'POST', `/sessions/dsep/${sid}/token`, owner);
    let body = {}; try { body = JSON.parse(issued.text); } catch {}
    ev.steps.issue = { status: issued.status, session: body.session, tokenLength: typeof body.token === 'string' ? body.token.length : null };
    assert.equal(ev.steps.issueWithout, 401, 'a session token was issued without owner authentication (daemon R6)');
    assert.equal(issued.status, 200, `the owner could not issue a session token: ${issued.status}`);
    assert.equal(body.session, sid, 'the token reply does not name the resolved session (terminal-chat R2)');
    assert.equal(typeof body.token, 'string', 'the token reply has no token (terminal-chat R2)');
    const session = { authorization: `Bearer ${body.token}` };
    const mailSession = await raw(kit.url, 'GET', '/mailbox?wait=1', session);
    const mailOwner = await raw(kit.url, 'GET', '/mailbox?wait=1', owner);
    const mailNone = await raw(kit.url, 'GET', '/mailbox?wait=1');
    ev.steps.botRoute = { session: mailSession.status, sessionSaysNotAttached: /not attached/.test(mailSession.text), owner: mailOwner.status, none: mailNone.status };
    ev.steps.ownerRoutes = {};
    for (const [method, path] of [['GET', '/health'], ['GET', '/bots'], ['GET', '/'], ['GET', `/sessions/dsep/${sid}`], ['POST', `/sessions/dsep/${sid}/token`]]) {
      ev.steps.ownerRoutes[`${method} ${path}`] = (await raw(kit.url, method, path, session)).status;
    }
    assert.equal(mailOwner.status, 401, 'the owner token opened a bot-facing route (daemon R6: it cannot impersonate a session)');
    assert.equal(mailNone.status, 401, 'the bot-facing route answered without a credential');
    for (const [k, s] of Object.entries(ev.steps.ownerRoutes)) assert.equal(s, 401, `the session token opened the owner route ${k} (daemon R6)`);
    assert.deepEqual([mailSession.status, ev.steps.botRoute.sessionSaysNotAttached], [409, true], `the session token's mailbox read for a session no terminal holds answered ${mailSession.status}, not 409 not attached (terminal-chat R3)`);
  } finally { saveJson(kit, 'daemon-credentials-stay-separate', ev); }
} };

// Catches: a daemon that repairs, replaces or chmods a bad token file, follows a symlink, accepts a directory or a malformed,
// multi-line or over-permissive file, or keeps running without announcing itself; and one that rewrites a valid existing token.
const badTokens = [
  ['empty', (f) => writeFileSync(f, '', { mode: 0o600 })],
  ['not base64url', (f) => writeFileSync(f, `${'a+/b'.repeat(11)}\n`, { mode: 0o600 })],
  ['too short', (f) => writeFileSync(f, `${'g'.repeat(42)}\n`, { mode: 0o600 })],
  ['too long', (f) => writeFileSync(f, `${'g'.repeat(257)}\n`, { mode: 0o600 })],
  ['two lines', (f) => writeFileSync(f, `${'g'.repeat(43)}\n${'h'.repeat(43)}\n`, { mode: 0o600 })],
  ['two final newlines', (f) => writeFileSync(f, `${'g'.repeat(43)}\n\n`, { mode: 0o600 })],
  ['mode 0644', (f) => { writeFileSync(f, `${'g'.repeat(43)}\n`); chmodSync(f, 0o644); }],
  ['mode 0640', (f) => { writeFileSync(f, `${'g'.repeat(43)}\n`); chmodSync(f, 0o640); }],
  ['mode 0700', (f) => { writeFileSync(f, `${'g'.repeat(43)}\n`); chmodSync(f, 0o700); }],
  ['a symlink to a valid token', (f, home) => { writeFileSync(join(home, 'elsewhere-token'), `${'g'.repeat(43)}\n`, { mode: 0o600 }); symlinkSync(join(home, 'elsewhere-token'), f); }],
  ['a directory', (f) => mkdirSync(f)],
];
const goodTokens = [['43 characters, no newline', 'k'.repeat(43)], ['256 characters and a newline', `${'K'.repeat(256)}\n`]];
const badTokenBlocks = { id: 'daemon-bad-token-blocks-start', title: 'daemon R4, E1: a start on an empty, malformed, too short or too long, multi-line, symlinked, directory or over-permissive token file is refused (it exits with a failure status and writes no discovery file) and leaves the file exactly as it was; valid existing tokens of 43 to 256 characters start the daemon and are kept as they are', run: async (kit) => {
  const ev = { catches: 'a daemon that repairs, replaces or chmods a bad token, follows a symlink, accepts a malformed, multi-line, directory or over-permissive token, or hangs without refusing; one that rewrites a valid existing token',
    commands: [], steps: { good: {}, bad: {} }, notDriven: { wrongOwner: 'a token file owned by another OS user needs a second account; not driven here' } }; const started = [];
  try {
    let slowest = 0;
    for (const [i, [what, content]] of goodTokens.entries()) {
      const home = await freshHome(kit, `token-good-${i}`, ev.commands);
      mkdirSync(join(home, 'secrets'), { recursive: true, mode: 0o700 }); writeFileSync(tokenPath(home), content, { mode: 0o600 });
      const before = pathState(tokenPath(home)); const d = homeDaemon(kit, `daemon-good-${i}`, home, ev.commands); started.push(d);
      const g = ev.steps.good[what] = { started: true };
      await listening(kit, d, content.trim()); slowest = Math.max(slowest, Date.now() - d.started);
      const after = pathState(tokenPath(home)); Object.assign(g, { health: d.health.status, unchanged: same(before, after), startMs: Date.now() - d.started });
      await stopDaemon(kit, d, content.trim(), ev.commands);
      assert.equal(ev.steps.good[what].unchanged, true, `a valid existing token (${what}) was rewritten`);
    }
    // the window: three times the slowest good start, at least 15 s; a start still unresolved at its end fails the case
    const window = Math.max(15000, 3 * slowest); ev.steps.windowMs = window;
    for (const [i, [what, make]] of badTokens.entries()) {
      const home = await freshHome(kit, `token-bad-${i}`, ev.commands);
      mkdirSync(join(home, 'secrets'), { recursive: true, mode: 0o700 }); make(tokenPath(home), home);
      const before = pathState(tokenPath(home)); const d = homeDaemon(kit, `daemon-bad-${i}`, home, ev.commands); started.push(d);
      const b = ev.steps.bad[what] = { before, announced: false, exit: null, unresolved: true, watchedMs: 0 }; const t0 = Date.now();
      while (!d.exit && Date.now() - t0 < window) { if (existsSync(discoveryPath(home))) b.announced = true; b.watchedMs = Date.now() - t0; await sleep(50); }
      b.announced ||= existsSync(discoveryPath(home));
      const after = pathState(tokenPath(home));
      Object.assign(b, { exit: d.exit, unresolved: !d.exit, refused: !!d.exit && d.exit.signal === null && d.exit.code !== 0, watchedMs: Date.now() - t0, unchanged: same(before, after) });
      await reap(kit, d);
    }
    for (const [what, s] of Object.entries(ev.steps.bad)) {
      assert.equal(s.unresolved, false, `a start on a bad token file (${what}) neither exited nor was refused within ${window} ms`);
      assert.equal(s.refused, true, `a start on a bad token file (${what}) was not refused with a failure status: ${JSON.stringify(s.exit)} (daemon E1)`);
      assert.equal(s.announced, false, `a daemon announced itself on a bad token file: ${what} (daemon E1)`);
      assert.equal(s.unchanged, true, `the bad token file was changed: ${what} (daemon R4: no repair, replacement or broadening)`);
    }
  } finally { for (const d of started) await reap(kit, d); saveJson(kit, 'daemon-bad-token-blocks-start', ev); }
} };

// Catches: racing starts that each write their own token (a later write replaces the file while an earlier daemon keeps serving
// with its own), a non-atomic write that exposes a partial token, and a temporary file left in secrets. Each contender has its
// own address, so every one gets an observed outcome: refused (it exited) or listening with the converged token.
const concurrentCreation = { id: 'daemon-concurrent-token-creation', title: 'daemon R4, E2: starts racing on a home without a token converge on one complete token that never changes once it appears; every contender either exits or listens with that token, and no partial or temporary file is left in secrets', run: async (kit) => {
  const ev = { catches: 'racing starts that each write their own token; a partial token visible during the race; a temporary file left behind', commands: [], steps: {} }; const started = [];
  try {
    const home = await freshHome(kit, 'token-race', ev.commands);
    assert.equal(existsSync(tokenPath(home)), false, 'the fresh home already holds a token; the race cannot be observed');
    const ports = []; while (ports.length < 3) { const p = await freePort(); if (!ports.includes(p)) ports.push(p); }
    for (let i = 0; i < 3; i++) started.push(homeDaemon(kit, `daemon-race-${i}`, home, ev.commands, ports[i]));
    // everything the loop observes is written into the evidence as it is collected, so a failure inside the loop keeps it
    const t0 = Date.now(); const DEADLINE = 60000; let first = null;
    const sm = ev.steps.samples = { count: 0, changed: 0, incomplete: 0, firstMs: null };
    const outcomes = ev.steps.outcomes = Object.fromEntries(started.map((d) => [d.name, { unresolved: true }]));
    const outcome = new Map(); const settle = (d, o) => { outcome.set(d.name, o); outcomes[d.name] = o; };
    while (Date.now() - t0 < DEADLINE && outcome.size < started.length) {
      const st = pathState(tokenPath(home));
      if (st.exists && st.type === 'file') {
        const fmt = tokenFormat(readFileSync(tokenPath(home))); sm.count++;
        if (!(fmt.valid && fmt.length === 43 && fmt.finalNewline)) sm.incomplete++;
        if (first === null) { first = st.sum; sm.firstMs = Date.now() - t0; } else if (st.sum !== first) sm.changed++;
      }
      for (const d of started) {
        if (outcome.has(d.name)) continue;
        if (d.exit) { settle(d, { exited: d.exit }); continue; }
        if (first === null) continue;
        const r = await fetch(`http://127.0.0.1:${d.port}/health`, { headers: { authorization: `Bearer ${homeToken(home)}` }, signal: AbortSignal.timeout(5000) }).catch(() => null);
        if (!r) continue;   // not listening yet
        let j = {}; try { j = JSON.parse(await r.text()); } catch {}
        if (r.status !== 200) { settle(d, { listening: true, status: r.status }); continue; }
        settle(d, { listening: true, status: 200, checked: false });
        const health = await checkDaemon(kit, { pid: j.pid, url: `http://127.0.0.1:${d.port}`, leader: d.leader, home, token: homeToken(home) }, d.name);
        d.pid = health.pid; d.url = health.url; outcomes[d.name].checked = true;
      }
      await sleep(20);
    }
    ev.steps.secrets = existsSync(join(home, 'secrets')) ? readdirSync(join(home, 'secrets')) : null; ev.steps.mode = pathState(tokenPath(home)).mode;
    const unresolved = started.filter((d) => !outcome.has(d.name)).map((d) => d.name);
    assert.deepEqual(unresolved, [], `contenders without an observed outcome by the ${DEADLINE} ms deadline: ${unresolved.join(', ')}`);
    assert.ok(first !== null, 'no token appeared');
    assert.equal(sm.incomplete, 0, 'a partial or malformed token was visible during the race (daemon E2)');
    assert.equal(sm.changed, 0, 'the token changed after it first appeared: the starts did not converge on one token (daemon E2)');
    const listeners = [...outcome.entries()].filter(([, o]) => o.listening);
    assert.ok(listeners.length >= 1, 'no contender listened');
    for (const [name, o] of listeners) assert.equal(o.status, 200, `${name} listens but refuses the converged token (${o.status}): it serves another token (daemon E2)`);
    // after every outcome is known: each listening contender accepts the token now on disk, the one first seen
    const final = homeToken(home); ev.steps.finalCheck = {};
    assert.equal(digest(readFileSync(tokenPath(home))), first, 'the token on disk at the end is not the one first seen (daemon E2)');
    for (const d of started.filter((x) => outcome.get(x.name)?.listening)) {
      ev.steps.finalCheck[d.name] = 'checking';
      ev.steps.finalCheck[d.name] = (await checkDaemon(kit, { pid: d.pid, url: d.url, leader: d.leader, home, token: final }, `${d.name} at the end of the race`)).status;
    }
    assert.deepEqual(ev.steps.secrets, ['owner-token'], 'a temporary or partial file was left in secrets (daemon E2)');
    assert.equal(ev.steps.mode, '600', 'the token is not mode 0600');
    for (const d of started) if (d.pid && !d.exit) { process.kill(d.pid, 'SIGTERM'); }
    await Promise.race([Promise.all(started.map((d) => d.done)), sleep(15000)]);
  } finally { for (const d of started) await reap(kit, d); saveJson(kit, 'daemon-concurrent-token-creation', ev); }
} };

// Catches: a client that reports a rejected token as "not running" or without the token file, one that makes its own token when
// the file is missing, one that reports a stopped daemon or a stale discovery file as a token problem, one that kills the process
// a stale discovery file names, and any diagnostic that prints a token.
const cliTokenErrors = { id: 'daemon-cli-token-errors', title: 'daemon R7, E1, E4 (cli R5): the CLI tells a rejected token (exit 1, names the token file, never says not running) from a missing one (says a daemon start or restart makes it, creates nothing) and from a stopped daemon, stale discovery included (not running, not a token problem, no process killed); no CLI output prints a token', run: async (kit) => {
  const ev = { catches: 'a rejected token reported as not running or without the file; a client that makes its own token; a stopped daemon or stale discovery reported as a token problem; a client that kills the pid a stale discovery names; a printed token', commands: [], steps: {} };
  let d; let helper; let helperDone;
  try {
    const home = await freshHome(kit, 'token-cli', ev.commands); const file = tokenPath(home);
    d = homeDaemon(kit, 'daemon-token-cli', home, ev.commands); await listening(kit, d); ev.steps.health = d.health;
    const good = readFileSync(file); const goodText = good.toString('utf8').trim(); const other = 'x'.repeat(43);
    const secrets = () => [goodText, other];
    const ok = await cliIn(kit, home, ['bots'], secrets, ev.commands); ev.steps.ok = { code: ok.code, leaks: ok.leaks, timedOut: ok.timedOut };
    writeFileSync(file, `${other}\n`, { mode: 0o600 });
    const rej = await cliIn(kit, home, ['bots'], secrets, ev.commands);
    ev.steps.rejected = { code: rej.code, timedOut: rej.timedOut, namesFile: rej.stderr.includes(file), saysNotRunning: /not running/i.test(rej.stderr), leaks: rej.leaks };
    ev.steps.daemonKeepsLoadedToken = (await raw(d.url, 'GET', '/health', { authorization: `Bearer ${goodText}` })).status;
    rmSync(file);
    const miss = await cliIn(kit, home, ['bots'], secrets, ev.commands);
    ev.steps.missing = { code: miss.code, timedOut: miss.timedOut, namesFile: miss.stderr.includes(file), saysStart: /start/i.test(miss.stderr), leaks: miss.leaks, recreated: existsSync(file) };
    writeFileSync(file, good, { mode: 0o600 });
    const restored = await cliIn(kit, home, ['bots'], secrets, ev.commands); ev.steps.restored = { code: restored.code, leaks: restored.leaks, timedOut: restored.timedOut };
    await stopDaemon(kit, d, goodText, ev.commands); const stoppedUrl = d.url; d = null;
    const stopped = await cliIn(kit, home, ['bots'], secrets, ev.commands);
    ev.steps.stopped = { code: stopped.code, timedOut: stopped.timedOut, saysNotRunning: /not running/i.test(stopped.stderr), saysRejected: /reject/i.test(stopped.stderr), leaks: stopped.leaks };
    // a discovery file left by a crash, naming a live process of this run (stamped, its own group) and the closed address
    helper = spawn('sleep', ['120'], { cwd: kit.root, env: kit.env(), detached: true, stdio: 'ignore' });
    helperDone = new Promise((ok) => helper.on('exit', ok));
    await until('the helper process is up with the run stamp', async () => stampOf(helper.pid) === `BYOH_KIT_RUN=${kit.run}`, { timeout: 10000, every: 50 });
    mkdirSync(join(home, 'log'), { recursive: true });
    writeFileSync(discoveryPath(home), JSON.stringify({ pid: helper.pid, url: stoppedUrl, started: new Date().toISOString() }));
    const stale = await cliIn(kit, home, ['bots'], secrets, ev.commands);
    ev.steps.stale = { code: stale.code, timedOut: stale.timedOut, saysNotRunning: /not running/i.test(stale.stderr), saysRejected: /reject/i.test(stale.stderr), leaks: stale.leaks, namedProcessAlive: alive(helper.pid) };
    for (const k of ['ok', 'rejected', 'missing', 'restored', 'stopped', 'stale']) {
      assert.equal(ev.steps[k].timedOut, false, `the CLI call (${k}) ran into its time limit`);
      assert.equal(ev.steps[k].leaks, false, `a CLI output printed a token (${k}; daemon R7)`);
    }
    assert.equal(ev.steps.ok.code, 0, 'myharness bots failed with the right token');
    assert.equal(ev.steps.rejected.code, 1, 'a rejected token did not exit 1 (daemon R7)');
    assert.equal(ev.steps.rejected.namesFile, true, 'a rejected token does not name the token file (daemon R7)');
    assert.equal(ev.steps.rejected.saysNotRunning, false, 'a rejected token is reported as not running (daemon R7)');
    assert.equal(ev.steps.daemonKeepsLoadedToken, 200, 'the running daemon no longer accepts the token it loaded (daemon E1)');
    assert.equal(ev.steps.missing.code, 1, 'a missing token did not exit 1 (daemon R7)');
    assert.equal(ev.steps.missing.saysStart, true, 'a missing token does not say that a daemon start or restart makes it (daemon R7)');
    assert.equal(ev.steps.missing.recreated, false, 'the client created an owner token (daemon R7)');
    assert.equal(ev.steps.restored.code, 0, 'the restored token does not work again');
    assert.equal(ev.steps.stopped.code, 1, 'a stopped daemon did not exit 1 (daemon R7)');
    assert.deepEqual([ev.steps.stopped.saysNotRunning, ev.steps.stopped.saysRejected], [true, false], 'a stopped daemon is not reported as not running, or is reported as a token rejection (daemon E4)');
    assert.equal(ev.steps.stale.code, 1, 'a stale discovery file did not exit 1');
    assert.deepEqual([ev.steps.stale.saysNotRunning, ev.steps.stale.saysRejected], [true, false], 'a stale discovery file is not reported as not running, or as a token rejection (daemon E4)');
    assert.equal(ev.steps.stale.namedProcessAlive, true, 'the client killed the process a stale discovery file named (daemon E4)');
  } finally {
    await reap(kit, d);
    if (helper && helper.exitCode === null && helper.signalCode === null) { try { process.kill(-helper.pid, 'SIGKILL'); } catch {} }
    if (helperDone) { const joined = await Promise.race([helperDone.then(() => true), sleep(5000).then(() => false)]); ev.steps.helperJoined = joined; }
    saveJson(kit, 'daemon-cli-token-errors', ev);
  }
} };

// ---- Loopback only, a stop that never hangs, and an engine exit after its bot directory was retired. Each
// case starts its own daemon in a disposable home and checks it before driving it. Engine faults come
// from a stub engine command in that home's myharness.toml (verifiability R5), never from signalling an engine the daemon started.
const homeApi = async (d, token, method, path, body) => {
  const r = await raw(d.url, method, path, { authorization: `Bearer ${token}` }, body === undefined ? undefined : JSON.stringify(body)); let json; try { json = JSON.parse(r.text); } catch {}
  return { status: r.status, json };
};
// One root key of a disposable home's myharness.toml: replaced if present, else written first (root keys precede every table).
function setHomeKey(home, key, value) {
  const f = join(home, 'myharness.toml'); const src = existsSync(f) ? readFileSync(f, 'utf8') : '';
  const re = new RegExp(`^${key}\\s*=.*$`, 'm'); const line = `${key} = ${value}`;
  writeFileSync(f, re.test(src) ? src.replace(re, line) : `${line}\n${src}`);
}
async function homeBot(kit, home, id, engine, log) {
  const r = await kit.cli(['bot', 'new', id, '--model', MOCK_MODEL[engine]], { env: { MYHARNESS_HOME: home } }); log.push({ cmd: `bot new ${id}`, home, code: r.code });
  assert.equal(r.code, 0, `myharness bot new ${id} exited ${r.code}`);
  const f = join(home, 'bots', id, 'bot.toml'); const src = readFileSync(f, 'utf8');
  if (!src.includes(MOCK_MODEL[engine])) writeFileSync(f, /^model\s*=.*$/m.test(src) ? src.replace(/^model\s*=.*$/m, `model = ${JSON.stringify(MOCK_MODEL[engine])}`) : `model = ${JSON.stringify(MOCK_MODEL[engine])}\n${src}`);
}
// Listening TCP sockets on a port, from /proc/net/tcp and tcp6: their local addresses (hex, as the kernel writes them).
const LOOPBACK = ['0100007F', '00000000000000000000000001000000'];
function listenersOn(port) {
  const hex = port.toString(16).toUpperCase().padStart(4, '0'); const out = [];
  for (const f of ['/proc/net/tcp', '/proc/net/tcp6']) for (const l of readFileSync(f, 'utf8').split('\n').slice(1)) { const [, local, , st] = l.trim().split(/\s+/); if (st === '0A' && local?.endsWith(`:${hex}`)) out.push(local.split(':')[0]); }
  return out;
}
// Listening sockets that a process holds, by the socket inodes among its open files.
function listenersOf(pid) {
  const inodes = new Set(); try { for (const fd of readdirSync(`/proc/${pid}/fd`)) { const m = /^socket:\[(\d+)\]$/.exec((() => { try { return readlinkSync(`/proc/${pid}/fd/${fd}`); } catch { return ''; } })()); if (m) inodes.add(m[1]); } } catch {}
  const out = [];
  for (const f of ['/proc/net/tcp', '/proc/net/tcp6']) for (const l of readFileSync(f, 'utf8').split('\n').slice(1)) { const c = l.trim().split(/\s+/); if (c[3] === '0A' && inodes.has(c[9])) out.push(c[1]); }
  return out;
}

// Catches: a daemon that binds a non-loopback `listen` setting (or quietly moves to another address and starts anyway), and one
// whose default listener is reachable from other interfaces.
const NON_LOOPBACK = ['"0.0.0.0:0"', '"[::]:0"'];
const loopbackOnly = { id: 'daemon-listens-on-loopback-only', title: 'daemon R1, E3 (home R3): a start whose listen setting is not loopback is refused: the daemon exits non-zero without a discovery file and never listens; a start with the default setting listens on loopback only', run: async (kit) => {
  const ev = { catches: 'a non-loopback listen setting bound, or replaced by another address so the start goes on; a default listener on other interfaces', commands: [], steps: { refused: [] } }; const started = [];
  try {
    for (const [n, value] of NON_LOOPBACK.entries()) {
      const home = await freshHome(kit, `listen-${n}`, ev.commands); setHomeKey(home, 'listen', value);
      const d = homeDaemon(kit, `daemon-listen-${n}`, home, ev.commands); started.push(d);
      const seen = { listen: value, sockets: [] }; ev.steps.refused.push(seen);
      const end = Date.now() + 30000;   // until it exits, or announces or holds a listener (then it already broke the rule)
      while (!d.exit && Date.now() < end && !seen.discovery && !seen.sockets.length) { const disc = readDiscovery(home); if (disc) seen.discovery = { pid: disc.pid, url: disc.url }; if (disc?.pid) seen.sockets.push(...listenersOf(disc.pid)); seen.sockets.push(...listenersOf(d.leader)); await sleep(100); }
      seen.exit = d.exit; seen.discoveryLeft = existsSync(discoveryPath(home));
      assert.equal(seen.discoveryLeft, false, `a refused start with listen = ${value} left a discovery file (daemon E3)`);
      assert.equal(seen.discovery, undefined, `a start with listen = ${value} announced ${seen.discovery?.url} in the discovery file (daemon E3: refusal is required)`);
      assert.deepEqual(seen.sockets, [], `a start with listen = ${value} held a listening socket`);
      assert.ok(d.exit, `a start with listen = ${value} was still running after 30 s without refusing (daemon E3)`);
      assert.notEqual(d.exit.code, 0, `a start with listen = ${value} exited 0`);
      await reap(kit, d);
    }
    const home = await freshHome(kit, 'listen-default', ev.commands); const d = homeDaemon(kit, 'daemon-listen-default', home, ev.commands); started.push(d);
    const disc = await listening(kit, d); const port = Number(new URL(disc.url).port);
    const addrs = ev.steps.defaultListeners = listenersOn(port); const own = ev.steps.defaultOwnSockets = listenersOf(disc.pid);
    assert.equal(new URL(disc.url).hostname, '127.0.0.1', `the default start announced ${disc.url}`);
    assert.ok(addrs.length > 0 && addrs.every((a) => LOOPBACK.includes(a)), `the default start listens on ${addrs.join(', ')}, not loopback only (daemon R1)`);
    assert.ok(own.length > 0 && own.every((a) => LOOPBACK.includes(a.split(':')[0])), `the daemon holds non-loopback listeners: ${own.join(', ')}`);
    await stopDaemon(kit, d, homeToken(home), ev.commands); started.pop();
  } finally { for (const d of started) await reap(kit, d); saveJson(kit, 'daemon-listens-on-loopback-only', ev); }
} };

// Catches: a daemon stop that waits for an engine child which ignores SIGTERM (it hangs), and one that exits but leaves that child
// running.
const STOP_LIMIT = 20000;
const stopNeverHangs = { id: 'daemon-stop-never-hangs', title: 'daemon R1, engine-contract R7: with a running engine that ignores SIGTERM, SIGTERM to the daemon still stops it within 20 s, removes its discovery file, and leaves no engine child running', run: async (kit) => {
  const engine = firstEngine(kit); const ev = { catches: 'a stop that hangs on an engine ignoring SIGTERM; a stop that leaves that engine running', engine, commands: [], steps: {} }; let d; let stub;
  try {
    const home = await freshHome(kit, 'stop-stubborn', ev.commands); await homeBot(kit, home, 'stubborn', engine, ev.commands);
    const pidFile = join(kit.root, 'homes', 'stubborn-engine.pid');
    const cmd = stubEngine(kit, 'stubborn-engine', `echo $$ > '${pidFile}'\ntrap '' TERM\nexec sleep 600`);
    setHomeKey(home, engine, JSON.stringify([cmd])); ev.steps.engine = 'stub that ignores SIGTERM';
    d = homeDaemon(kit, 'daemon-stop-stubborn', home, ev.commands); await listening(kit, d); const token = homeToken(home);
    const say = homeApi(d, token, 'POST', '/sessions/stubborn/latest/say', { text: 'daemon stop with a stubborn engine' }).then((r) => { ev.steps.say = r.status; }, (e) => { ev.steps.say = `no answer: ${e.message}`; });
    stub = await until('the stub engine is running', async () => { try { const p = Number(readFileSync(pidFile, 'utf8')); return alive(p) ? p : null; } catch { return null; } }, { timeout: 60000, every: 200 });
    ev.steps.enginePid = stub;
    await checkDaemon(kit, { pid: d.pid, url: d.url, leader: d.leader, home, token }, 'before its stop');
    const t0 = Date.now(); process.kill(d.pid, 'SIGTERM');
    await until('the daemon stopped and removed its discovery file', async () => !alive(d.pid) && !existsSync(discoveryPath(home)), { timeout: STOP_LIMIT, every: 100 });
    ev.steps.stopMs = Date.now() - t0;
    await Promise.race([say, sleep(5000)]);
    ev.steps.engineGone = await until('the engine child gone after the stop', async () => !alive(stub), { timeout: 10000, every: 100 }).then(() => true, () => false);
    assert.equal(ev.steps.engineGone, true, `the engine child ${stub} that ignores SIGTERM is still running after the daemon stopped (daemon R1)`);
    await Promise.race([d.done, sleep(5000)]); d = null;
  } finally {
    if (stub && alive(stub) && stampOf(stub) === `BYOH_KIT_RUN=${kit.run}`) { try { process.kill(stub, 'SIGKILL'); } catch {} }
    await reap(kit, d); saveJson(kit, 'daemon-stop-never-hangs', ev);
  }
} };

// Catches: a daemon that goes down (or stops serving) when an engine exits after its bot directory was moved away, one whose late
// writes recreate the moved bot directory, and one that hides the failed write instead of naming its bot, session, path and error.
const engineExitAfterRetire = { id: 'daemon-survives-engine-exit-after-bot-retired', title: 'daemon R8, bots E2: when a bot directory is moved away during a turn and its engine then exits, the daemon stays up and healthy, writes a scoped error naming the bot, session, path and system error, serves another bot\'s turn, and never recreates the moved directory', run: async (kit) => {
  const engine = firstEngine(kit); const ev = { catches: 'a daemon taken down by an engine exit after its bot directory moved; late writes recreating the directory; a failed write hidden or unscoped', engine, commands: [], steps: {} }; let d;
  try {
    const home = await freshHome(kit, 'retire', ev.commands); await homeBot(kit, home, 'retiring', engine, ev.commands); await homeBot(kit, home, 'healthy', engine, ev.commands);
    const trigger = join(kit.root, 'homes', 'retire-end-engine'); const ended = join(kit.root, 'homes', 'retire-engine-ended');
    const real = kit.engineCommand(engine).map((a) => `'${a.replace(/'/g, `'\\''`)}'`).join(' ');
    // the stub runs the real engine (pointed at the mock); for the retiring bot it ends the engine once the case creates the trigger file
    const cmd = stubEngine(kit, 'retire-engine', [
      `case "$PWD $*" in *"/bots/retiring"*) ;; *) exec ${real} "$@" ;; esac`,
      'exec 3<&0', `${real} "$@" <&3 &`, 'child=$!', 'trap \'kill $child 2>/dev/null\' TERM INT',
      `while kill -0 $child 2>/dev/null; do if [ -e '${trigger}' ]; then kill $child 2>/dev/null; fi; sleep 0.2; done`,
      `wait $child; echo ended > '${ended}'`,
    ].join('\n'));
    setHomeKey(home, engine, JSON.stringify([cmd])); ev.steps.engine = 'real engine behind a stub that ends it on a trigger file';
    const errFile = join(kit.root, 'homes', 'retire-daemon.err');
    d = homeDaemon(kit, 'daemon-retire', home, ev.commands, 0, errFile); await listening(kit, d); const token = homeToken(home);
    const h1 = await homeApi(d, token, 'POST', '/sessions/healthy/latest/say', { text: 'daemon healthy before' }); assert.ok(h1.status < 300, `healthy say returned ${h1.status}`);
    await until('the healthy turn at the model', async () => (await mockSaw(kit, 'daemon healthy before')).length > 0, { timeout: 120000, every: 500 });
    const r = await homeApi(d, token, 'POST', '/sessions/retiring/latest/say', { text: 'daemon retiring held\nMOCK_SLOW 60000' }); assert.ok(r.status < 300 && r.json?.session, `retiring say returned ${r.status}`);
    const rsid = ev.steps.retiringSession = r.json.session;
    await until('the retiring turn at the model', async () => (await mockSaw(kit, 'daemon retiring held')).length > 0, { timeout: 120000, every: 500 });
    mkdirSync(join(home, 'retired'), { recursive: true }); renameSync(join(home, 'bots', 'retiring'), join(home, 'retired', 'retiring')); ev.steps.movedAt = new Date().toISOString();
    writeFileSync(trigger, 'end');
    await until('the retiring engine ended', async () => existsSync(ended), { timeout: 30000, every: 200 }); ev.steps.engineEndedAt = new Date().toISOString();
    await sleep(5000);
    ev.steps.daemonAlive = alive(d.pid); assert.equal(ev.steps.daemonAlive, true, 'the daemon exited after the engine of the moved bot ended (daemon R8)');
    ev.steps.health = await checkDaemon(kit, { pid: d.pid, url: d.url, leader: d.leader, home, token }, 'after the engine exit');
    const h2 = await homeApi(d, token, 'POST', '/sessions/healthy/latest/say', { text: 'daemon healthy after' }); ev.steps.healthyAfter = h2.status;
    assert.ok(h2.status < 300, `a turn on another bot returned ${h2.status} after the engine exit`);
    await until('the healthy reply after the engine exit', async () => { const x = await homeApi(d, token, 'GET', `/sessions/healthy/${h2.json.session}`); return (x.json?.messages ?? []).some((m) => m.role === 'assistant' && (m.text ?? '').includes('daemon healthy after')); }, { timeout: 120000, every: 1000 });
    await sleep(3000);
    ev.steps.recreated = existsSync(join(home, 'bots', 'retiring')); assert.equal(ev.steps.recreated, false, 'the moved bot directory was recreated (daemon R8)');
    const lines = existsSync(errFile) ? readFileSync(errFile, 'utf8').split('\n') : [];
    const scoped = lines.filter((l) => l.includes('retiring') && l.includes(rsid) && l.includes(join(home, 'bots', 'retiring')) && /\bE[A-Z]{3,}\b/.test(l));
    assert.ok(!scoped.some((l) => l.includes(token)), 'a scoped error line holds the owner token');
    ev.steps.scopedErrorLines = scoped.slice(0, 5); ev.steps.errorLineCount = lines.filter(Boolean).length;
    assert.ok(scoped.length > 0, 'no error line names the bot, the session, a path below the moved bot directory and a system error (daemon R8)');
    await stopDaemon(kit, d, token, ev.commands); d = null;
  } finally { await reap(kit, d); saveJson(kit, 'daemon-survives-engine-exit-after-bot-retired', ev); }
} };

export default { section: 'daemon', cases: [tokenNewAndKept, needOwnerToken, separateAuthority, badTokenBlocks, concurrentCreation, cliTokenErrors,
  loopbackOnly, stopNeverHangs, engineExitAfterRetire] };
