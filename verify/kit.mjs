#!/usr/bin/env node
// The verification kit: one isolated harness instance, usable as a library (the conformance suite) and a CLI (the skill).
// Everything one run owns lives in ONE directory /tmp/byoh-XXXXXX (short: Chromium socket paths are capped at 108 bytes):
// the harness home, a throwaway OS HOME/XDG, the engine state, the app profile, logs and state.json. Every process the run
// starts carries BYOH_KIT_RUN=<run id> in its environment; that stamp, not a name or a port, is how the run finds its own
// processes again. The kit decides only from files and file descriptors it can read (daemon.json, the token file,
// /proc), never from another tool's printed text.
//   up --harness <descriptor.json> [--engines pi,claude] [--models N]   mock model, home, seed, daemon on a free port
//   doctor [--env]      identity and isolation checks of the run (or the host's prerequisites)
//   cli <args…>   api METHOD PATH [json]   engine pi|claude <args…>   mock [reset]
//   app                 Xvfb + the Electron app aimed at this run, with the loopback testing connection
//   ui <verb> …         drive the app window by role and accessible name (verbs: see driver.mjs)
//   run <scenario.mjs> --harness <d.json> [--engines pi,claude] [--only id] [--keep-at id] [--evidence dir]
//   down [--evidence dir]   stop only this run's processes, copy logs, remove only this run's directory
// Descriptor (JSON): { "cli": [argv…], "app": [electron, app-path…], "seed": [[cli args]…], "source": "<git dir>" }.
// The spec's names are fixed: MYHARNESS_HOME, <home>/log/daemon.json, <home>/secrets/owner-token, myharness.toml keys pi/claude,
// MYHARNESS_API and MYHARNESS_TOKEN_FILE for the app. A failing kit is a finding to fix or report, never a step to route around.
import { spawn, execFile, execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync, cpSync, openSync, chmodSync, realpathSync, readlinkSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { delimiter, dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { connect, cli as uiCli } from './driver.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
export const PINS = JSON.parse(readFileSync(join(HERE, 'pins.json'), 'utf8'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const readJson = (f) => JSON.parse(readFileSync(f, 'utf8'));
const onPath = (name) => process.env.PATH.split(delimiter).map((d) => join(d, name)).find((f) => existsSync(f) && statSync(f).isFile());
const fail = (msg) => { throw new Error(msg); };

function checkNode() {
  if (process.versions.node !== PINS.node) fail(`Node ${PINS.node} is pinned (verify/pins.json) and this is ${process.versions.node}. Fix: run the kit with Node ${PINS.node}.`);
}
// /proc reads. A process is this run's only if its environment carries the run's stamp and it is not a zombie.
function procEnv(pid) { try { return readFileSync(`/proc/${pid}/environ`, 'utf8').split('\0'); } catch { return null; } }
function alive(pid) { try { return readFileSync(`/proc/${pid}/stat`, 'utf8').replace(/^.*\) /, '')[0] !== 'Z'; } catch { return false; } }
const stamped = (pid, run) => alive(pid) && procEnv(pid)?.includes(`BYOH_KIT_RUN=${run}`);
// For a pid the kit recorded: /proc/<pid>/environ reads empty for a moment while the process execs (a wrapper becoming the app),
// so a missing stamp on a live process is looked at again before it counts as "not ours".
function owned(pid, run) {
  for (let i = 0; i < 5; i++) { if (!alive(pid)) return false; if (stamped(pid, run)) return true; Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 40); }
  return false;
}
function runPids(run) { return readdirSync('/proc').filter((p) => /^\d+$/.test(p) && stamped(p, run)).map(Number); }
// Listening sockets of a TCP port from /proc/net/tcp{,6}: are they all loopback?
function listeners(port) {
  const hex = port.toString(16).toUpperCase().padStart(4, '0'); const out = [];
  for (const f of ['/proc/net/tcp', '/proc/net/tcp6']) {
    for (const l of readFileSync(f, 'utf8').split('\n').slice(1)) {
      const [, local, , st] = l.trim().split(/\s+/);
      if (st === '0A' && local?.endsWith(`:${hex}`)) out.push(local.split(':')[0]);
    }
  }
  return out;
}
// Loopback ports in LISTEN state that these processes hold, found through their open sockets (inode in /proc/<pid>/fd and /proc/net/tcp*).
function socketPorts(pids) {
  const inodes = new Set();
  for (const pid of pids) { try { for (const fd of readdirSync(`/proc/${pid}/fd`)) { const m = /^socket:\[(\d+)\]$/.exec(readlinkSync(`/proc/${pid}/fd/${fd}`)); if (m) inodes.add(m[1]); } } catch {} }
  const ports = new Set();
  for (const f of ['/proc/net/tcp', '/proc/net/tcp6']) for (const l of readFileSync(f, 'utf8').split('\n').slice(1)) {
    const c = l.trim().split(/\s+/); const [addr, port] = (c[1] ?? ':').split(':');
    if (c[3] === '0A' && inodes.has(c[9]) && LOOPBACK.includes(addr)) ports.add(parseInt(port, 16));
  }
  return [...ports];
}
// Processes (not this one) whose working directory or an open file is under `root`: they would be orphaned by deleting it.
function holders(root) {
  const under = (p) => p === root || p.startsWith(`${root}/`); const out = [];
  for (const pid of readdirSync('/proc').filter((p) => /^\d+$/.test(p) && Number(p) !== process.pid)) {
    try {
      const links = [readlinkSync(`/proc/${pid}/cwd`), ...readdirSync(`/proc/${pid}/fd`).map((fd) => { try { return readlinkSync(`/proc/${pid}/fd/${fd}`); } catch { return ''; } })];
      if (alive(pid) && links.some(under)) out.push(Number(pid));
    } catch {}
  }
  return out;
}
const LOOPBACK = ['0100007F', '00000000000000000000000001000000'];

export function runDirs() {   // this user's live runs, found by marker file
  return readdirSync(tmpdir()).filter((d) => /^byoh-/.test(d)).map((d) => join(tmpdir(), d)).filter((d) => { try { return statSync(d).uid === process.getuid() && existsSync(join(d, '.byoh-kit-run')); } catch { return false; } });
}
export function resolveRun(dir) {
  if (dir ?? process.env.BYOH_KIT_DIR) return dir ?? process.env.BYOH_KIT_DIR;
  const all = runDirs();
  if (all.length !== 1) fail(all.length ? `${all.length} runs are up (${all.join(', ')}); pass --run <dir>` : 'no run is up: kit up --harness <descriptor.json>');
  return all[0];
}

// ---- an instance ------------------------------------------------------------------------------------------------------------
class Instance {
  constructor(root, descriptor) {
    this.root = root; this.state = readJson(join(root, 'state.json')); this.run = this.state.run; this.loaded = descriptor;
    this.home = join(root, 'home'); this.tokenFile = join(this.home, 'secrets', 'owner-token'); this.discovery = join(this.home, 'log', 'daemon.json');
  }
  get desc() { return (this.loaded ??= readJson(this.state.descriptor)); }   // read only when needed: `down` works without it
  save() { writeFileSync(join(this.root, 'state.json'), JSON.stringify(this.state, null, 2)); }
  get url() { return this.state.daemon?.url; }
  env(extra = {}) {   // like `env -i`: the live HOME, tokens and display are never seen. Engine state directories are the same
    // for every process of the run as in the engine wrappers, so the harness finds the native state its engines write
    const r = this.root;
    return { PATH: process.env.PATH, LANG: 'C.UTF-8', HOME: join(r, 'userhome'), TMPDIR: join(r, 'tmp'), MYHARNESS_HOME: this.home, PI_CODING_AGENT_DIR: join(r, 'pi-agent'), PI_OFFLINE: '1', CLAUDE_CONFIG_DIR: join(r, 'claude-config'),
      XDG_CONFIG_HOME: join(r, 'xdg/config'), XDG_CACHE_HOME: join(r, 'xdg/cache'), XDG_DATA_HOME: join(r, 'xdg/data'), XDG_STATE_HOME: join(r, 'xdg/state'), BYOH_KIT_RUN: this.run, ...extra };
  }
  spawnOwned(name, argv, extra = {}, stdio) {   // own process group, so a stop reaches its children
    const log = openSync(join(this.root, 'logs', `${name}.log`), 'a');
    const p = spawn(argv[0], argv.slice(1), { cwd: this.root, env: this.env(extra), detached: true, stdio: stdio ?? ['ignore', log, log] });
    p.unref(); this.state[name] = { ...this.state[name], pid: p.pid }; this.save(); return p;
  }
  run_(argv, { input, env = {}, timeout = 120000 } = {}) {
    return new Promise((ok) => {
      const p = execFile(argv[0], argv.slice(1), { cwd: this.root, env: this.env(env), timeout, maxBuffer: 64 << 20 }, (e, stdout, stderr) => ok({ code: e ? (typeof e.code === 'number' ? e.code : 1) : 0, stdout, stderr }));
      p.stdin.end(input ?? '');
    });
  }
  cli(args, o) { return this.run_([...this.desc.cli, ...args], o); }
  engineCommand(name) {   // the root key `pi` / `claude` of myharness.toml (the line the kit wrote): a string or an array of strings; default is the bare name
    const k = engineKey(existsSync(join(this.home, 'myharness.toml')) ? readFileSync(join(this.home, 'myharness.toml'), 'utf8') : '', name);
    if (k.kind === 'absent') return [name]; if (k.value === undefined) fail(`myharness.toml: the "${name}" key cannot be read`);
    const v = JSON.parse(k.value.trim()); return Array.isArray(v) ? v : [v];
  }
  engine(name, args, o) { return this.run_([...this.engineCommand(name), ...args], o); }
  async api(method, path, body) {
    const headers = { authorization: `Bearer ${readFileSync(this.tokenFile, 'utf8').trim()}`, ...(body === undefined ? {} : { 'content-type': 'application/json' }) };
    const r = await fetch(this.url + path, { method, headers, body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body), signal: AbortSignal.timeout(30000) });
    const text = await r.text(); let json; try { json = JSON.parse(text); } catch {}
    return { status: r.status, json, text };
  }
  get mock() {
    const base = `http://127.0.0.1:${this.state.mock.port}`;
    return { url: base, requests: async () => (await fetch(`${base}/requests`)).json(), reset: () => fetch(`${base}/reset`, { method: 'POST' }) };
  }
  async window() {
    if (!this.state.app?.cdp) fail('no app is running: kit app');
    return connect({ port: this.state.app.cdp, urlPrefix: this.url });
  }
  async app() {
    if (owned(this.state.app?.pid, this.run)) fail(`the app is already running (pid ${this.state.app.pid})`);
    if (!this.desc.app?.length) fail('the descriptor has no "app" command');
    try { return await this.launchApp(); } catch (e) { for (const n of ['app', 'xvfb']) { await this.kill(n, 'SIGTERM', 3); await this.kill(n, 'SIGKILL', 2); delete this.state[n]; } this.save(); throw e; }   // a failed launch leaves nothing running
  }
  async launchApp() {
    const prof = join(this.root, 'app-profile'); mkdirSync(prof, { recursive: true });
    const xvfb = this.spawnOwned('xvfb', ['Xvfb', '-screen', '0', '1400x1100x24', '-nolisten', 'tcp', '-displayfd', '3'], {}, ['ignore', openSync(join(this.root, 'logs', 'xvfb.log'), 'a'), openSync(join(this.root, 'logs', 'xvfb.log'), 'a'), 'pipe']);
    const display = await new Promise((ok, no) => { xvfb.stdio[3].once('data', (d) => ok(String(d).trim())); xvfb.once('exit', () => no(new Error('Xvfb exited before it chose a display, see logs/xvfb.log'))); setTimeout(() => no(new Error('Xvfb gave no display in 15 s')), 15000); });
    xvfb.stdio[3].destroy();
    const [exe, ...rest] = this.desc.app;
    this.spawnOwned('app', [exe, '--use-mock-keychain', '--password-store=basic', '--disable-gpu', '--ozone-platform=x11', `--user-data-dir=${prof}`, '--remote-debugging-port=0', ...rest],
      { DISPLAY: `:${display}`, MYHARNESS_API: this.url, MYHARNESS_TOKEN_FILE: this.tokenFile });
    // --remote-debugging-port=0 lets the OS choose. The port is found from /proc: the loopback listening sockets the app's own
    // processes hold (an app may move its own profile, so DevToolsActivePort is not a safe place to look), then the one that answers.
    let cdp;
    for (let i = 0; i < 150 && !cdp; i++) {
      if (!owned(this.state.app.pid, this.run)) fail('the app exited, see logs/app.log');
      for (const port of socketPorts(runPids(this.run))) { if ((await fetch(`http://127.0.0.1:${port}/json/version`, { signal: AbortSignal.timeout(2000) }).catch(() => null))?.ok) cdp = port; }
      if (!cdp) await sleep(200);
    }
    if (!cdp) fail('the app opened no testing connection in 30 s, see logs/app.log');
    this.state.app.cdp = cdp; this.state.xvfb.display = display; this.save();
    const w = await connect({ port: cdp, urlPrefix: this.url });   // the window is on this run's daemon
    return w;
  }
  async doctor() {
    const out = []; const ok = (c, m) => out.push({ ok: !!c, msg: m }); const s = this.state;
    out.push({ ok: true, msg: `run ${this.root}${s.source ? `  harness @ ${s.source}` : ''}` });
    ok(owned(s.mock?.pid, this.run), `mock model pid ${s.mock?.pid} on 127.0.0.1:${s.mock?.port}`);
    ok(owned(s.daemon?.pid, this.run), `daemon pid ${s.daemon?.pid} carries this run's stamp`);
    ok(procEnv(s.daemon?.pid)?.includes(`MYHARNESS_HOME=${this.home}`), `daemon environment selects MYHARNESS_HOME=${this.home}`);
    try {
      const d = readJson(this.discovery); const h = await this.api('GET', '/health');
      ok(h.status === 200 && h.json?.ok === true && h.json.pid === d.pid && h.json.home === this.home && h.json.url === d.url && d.url === s.daemon.url, `GET /health: pid ${h.json?.pid} home ${h.json?.home} url ${h.json?.url} agree with daemon.json (${d.pid}, ${d.url}) and this run`);
      ok(listeners(Number(new URL(d.url).port)).every((a) => LOOPBACK.includes(a)), `daemon port ${new URL(d.url).port} listens on loopback only`);
      const live = join(homedir(), '.myharness', 'log', 'daemon.json');
      ok(!existsSync(live) || readJson(live).url !== d.url, 'this daemon is not the live installation (~/.myharness is only read)');
    } catch (e) { ok(false, `identity check failed: ${e.message}`); }
    const t = statSync(this.tokenFile); ok((t.mode & 0o777) === 0o600 && (statSync(dirname(this.tokenFile)).mode & 0o777) === 0o700, `owner token at ${this.tokenFile}: mode ${(t.mode & 0o777).toString(8)}, ${t.size} bytes (never printed)`);
    ok(!existsSync(join(this.root, 'userhome', '.myharness')), 'the throwaway HOME holds no .myharness');
    if (s.app?.cdp) {
      ok(owned(s.app.pid, this.run), `app pid ${s.app.pid}, testing connection 127.0.0.1:${s.app.cdp}`);
      const l = listeners(s.app.cdp); ok(l.length && l.every((a) => LOOPBACK.includes(a)), `testing port ${s.app.cdp} listens on loopback only (${l.join(',')})`);
      const pages = await fetch(`http://127.0.0.1:${s.app.cdp}/json/list`).then((r) => r.json()).catch(() => []);
      ok(pages.some((p) => p.type === 'page' && p.url.startsWith(s.daemon.url)), `an app window shows ${s.daemon.url}`);
    }
    return out;
  }
  async kill(name, sig, wait) {   // the process group the kit made for it, only if the run's stamp is on the process
    const pid = this.state[name]?.pid; if (!owned(pid, this.run)) return;
    try { process.kill(-pid, sig); } catch { try { process.kill(pid, sig); } catch {} }
    for (let i = 0; i < wait * 10 && alive(pid); i++) await sleep(100);
  }
  async stop({ evidence } = {}) {
    this.release?.(); const s = this.state; const run = this.run;
    let evErr;   // the evidence is copied first, but a failed copy never stops the cleanup: it is reported after it
    if (evidence) { try { mkdirSync(evidence, { recursive: true }); cpSync(join(this.root, 'logs'), join(evidence, 'logs'), { recursive: true }); writeFileSync(join(evidence, 'state.json'), JSON.stringify(s, null, 2)); } catch (e) { evErr = e; } }
    for (const n of ['daemon', 'app', 'xvfb', 'mock']) { await this.kill(n, 'SIGTERM', n === 'daemon' ? 10 : 5); await this.kill(n, 'SIGKILL', 2); }   // daemon first: it stops its own engine children
    for (const p of runPids(run)) { try { process.kill(p, 'SIGKILL'); } catch {} }   // stamped stragglers (an engine child that left its group)
    await sleep(200);
    const left = [...new Set([...runPids(run), ...holders(realpathSync(this.root))])];   // stamped, or holding files here (an engine that dropped the stamp)
    if (left.length) fail(`processes of run ${run} are still alive or hold files in the run directory: ${left.join(' ')}; ${this.root} is NOT deleted${evErr ? `; evidence was not saved to ${evidence}: ${evErr.message}` : ''}`);
    removeRun(this.root, run);
    if (evErr) fail(`run ${run} is stopped and its directory removed, but its evidence was not saved to ${evidence}: ${evErr.message}`);
  }
}
function removeRun(root, run) {   // the only deletion the kit does: its own directory, proven by marker, prefix and parent
  const real = realpathSync(root);
  if (dirname(real) !== realpathSync(tmpdir()) || !basename(real).startsWith('byoh-') || readFileSync(join(real, '.byoh-kit-run'), 'utf8') !== run) fail(`refusing to delete ${root}: it is not this run's directory`);
  rmSync(real, { recursive: true, force: true });
}

// The engine key of myharness.toml, found without a TOML library: a small line scanner that knows strings (all four kinds,
// multi-line ones too), comments, brackets and table headers, so only a ROOT-level assignment counts. Returns
// { kind: 'absent', at } (insert at that line: before the first table header, or at the end), { kind: 'bare', at, indent }
// (the value is only the engine's own name, a string or a one-element list: the kit replaces that one line), or
// { kind: 'other' }: any other value (then with its line and value text), a dotted key or table under that name, more than one
// assignment, or text the scanner cannot read. It fails closed: anything it is not sure of is 'other', which the kit refuses.
export function engineKey(text, e) {
  const lines = text.split('\n'); const name = `(?:${e}|"${e}"|'${e}')`;
  const keyRe = new RegExp(`^(\\s*)${name}\\s*([=.])(.*)$`);
  const bareRe = new RegExp(`^\\s*(?:"${e}"|'${e}'|\\[\\s*(?:"${e}"|'${e}')\\s*,?\\s*\\])\\s*(?:#.*)?\\r?$`);
  const headRe = new RegExp(`^\\s*\\[\\[?\\s*${name}\\s*[\\].]`);
  // the text of a line before the first of `stops` outside quotes: the key (stops '=#') or the header (stop '#'), comments excluded
  const upTo = (l, stops) => { for (let j = 0; j < l.length; j++) { const c = l[j]; if (stops.includes(c)) return l.slice(0, j); if (c === '"') { j++; while (j < l.length && l[j] !== '"') j += l[j] === '\\' ? 2 : 1; } else if (c === "'") { const end = l.indexOf("'", j + 1); j = end < 0 ? l.length : end; } } return l; };
  let ml = null; let depth = 0; let firstHeader = -1; const found = [];
  for (const [i, l] of lines.entries()) {
    const header = ml === null && depth === 0 && /^\s*\[/.test(l);   // a line that starts outside any string, array or inline table
    if (header) { if (headRe.test(l) || upTo(l, '#').includes('\\')) return { kind: 'other' }; if (firstHeader < 0) firstHeader = i; continue; }   // an escape in a header could spell the key
    if (ml === null && depth === 0 && firstHeader < 0) {
      if (upTo(l, '=#').includes('\\')) return { kind: 'other' };   // an escape in a root key (\u0070i is pi): not read, refused; comments do not count
      const m = keyRe.exec(l); if (m) found.push({ i, indent: m[1], op: m[2], rest: m[3] });
    }
    for (let j = 0; j < l.length;) {
      if (ml) {   // inside a multi-line string: \ escapes one character in the basic kind; a run of 3 to 5 quotes closes it
        const q = ml[0]; if (q === '"' && l[j] === '\\') { j += 2; continue; }
        if (l[j] !== q) { j++; continue; }
        let n = 0; while (l[j + n] === q) n++; if (n > 5) return { kind: 'other' }; if (n >= 3) ml = null; j += n; continue;
      }
      const c = l[j]; const three = l.slice(j, j + 3);
      if (c === '#') break;
      if (three === '"""' || three === "'''") { ml = three; j += 3; continue; }
      if (c === '"') { j++; while (j < l.length && l[j] !== '"') j += l[j] === '\\' ? 2 : 1; if (j >= l.length) return { kind: 'other' }; j++; continue; }
      if (c === "'") { const end = l.indexOf("'", j + 1); if (end < 0) return { kind: 'other' }; j = end + 1; continue; }
      if (c === '[' || c === '{') depth++; else if (c === ']' || c === '}') depth--;
      if (depth < 0) return { kind: 'other' };
      j++;
    }
  }
  if (ml !== null || depth !== 0) return { kind: 'other' };
  if (!found.length) return { kind: 'absent', at: firstHeader >= 0 ? firstHeader : lines.length - (text.endsWith('\n') ? 1 : 0) };
  if (found.length > 1 || found[0].op !== '=') return { kind: 'other' };
  return { kind: bareRe.test(found[0].rest) ? 'bare' : 'other', at: found[0].i, indent: found[0].indent, value: found[0].rest };   // value: the text after '='
}

// ---- start / use / stop ------------------------------------------------------------------------------------------------------
export async function start({ harness, engines = ['pi', 'claude'], models = 1, keep = false, evidence } = {}) {
  checkNode();
  const dpath = typeof harness === 'string' ? harness : fail('start needs { harness: <descriptor.json> }'); const desc = readJson(dpath);
  if (!Array.isArray(desc.cli) || !desc.cli.length) fail(`${dpath}: "cli" must be a non-empty argv array`);
  const run = Math.random().toString(36).slice(2, 10); const root = mkdtempSync(join(tmpdir(), 'byoh-'));
  for (const d of ['logs', 'tmp', 'userhome', 'xdg/config', 'xdg/cache', 'xdg/data', 'xdg/state', 'bin']) mkdirSync(join(root, d), { recursive: true });
  writeFileSync(join(root, '.byoh-kit-run'), run);
  const source = desc.source ? (() => { try { const g = (...a) => execFileSync('git', ['-C', desc.source, ...a], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); return `${g('rev-parse', '--short', 'HEAD')}${g('status', '--porcelain', '--untracked-files=no') ? ' (+ uncommitted changes)' : ''}`; } catch { return 'not a git checkout'; } })() : undefined;
  writeFileSync(join(root, 'state.json'), JSON.stringify({ run, root, descriptor: realpathSync(dpath), source, engines }, null, 2));
  const inst = new Instance(root, desc);
  const cleanup = () => { for (const p of runPids(run)) { try { process.kill(p, 'SIGKILL'); } catch {} } };   // sync: also on process exit
  // an interrupted run keeps the evidence it had (stop copies the logs first)
  const onSig = async (sig) => { try { await inst.stop({ evidence }); } catch (e) { console.error(`kit: ${e.message}`); } process.exit(128 + (sig === 'SIGINT' ? 2 : 15)); };
  process.on('exit', cleanup); process.on('SIGINT', onSig); process.on('SIGTERM', onSig);
  try {
    for (const e of engines) if (!['pi', 'claude'].includes(e) || !onPath(e)) fail(`engine "${e}" is not installed (or not pi/claude). Install it at the harness's pinned version, or leave it out of --engines only if the harness does not choose it.`);
    inst.spawnOwned('mock', [process.execPath, join(HERE, 'mock-model.mjs'), '--port-file', join(root, 'mock.port'), '--pi-dir', join(root, 'pi-agent'), '--models', String(models)]);
    for (let i = 0; i < 100 && !existsSync(join(root, 'mock.port')); i++) { if (!owned(inst.state.mock.pid, run)) fail('the mock model exited, see logs/mock.log'); await sleep(100); }
    if (!existsSync(join(root, 'mock.port'))) fail('the mock model wrote no port file, see logs/mock.log');
    inst.state.mock.port = Number(readFileSync(join(root, 'mock.port'), 'utf8')); inst.save();
    for (const args of [['init'], ...(desc.seed ?? [])]) { const r = await inst.cli(args); if (r.code) fail(`myharness ${args.join(' ')} exited ${r.code}: ${(r.stderr || r.stdout).trim().slice(0, 400)}`); }
    for (const e of engines) {   // a small wrapper per engine: it stamps the run (so teardown finds the engine even if the harness filters its environment) and aims the REAL engine at the mock: no login, no quota
      const w = join(root, 'bin', `${e}-mock`); const toml = join(inst.home, 'myharness.toml');
      const env = e === 'claude' ? `CLAUDE_CONFIG_DIR='${join(root, 'claude-config')}' ANTHROPIC_BASE_URL='http://127.0.0.1:${inst.state.mock.port}' ANTHROPIC_API_KEY=mock-key CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1 DISABLE_AUTOUPDATER=1` : `PI_CODING_AGENT_DIR='${join(root, 'pi-agent')}' PI_OFFLINE=1`;
      writeFileSync(w, `#!/bin/sh\nexport BYOH_KIT_RUN='${run}' HOME='${join(root, 'userhome')}' ${env}\n${e === 'claude' ? 'unset CLAUDE_CODE_OAUTH_TOKEN ANTHROPIC_AUTH_TOKEN\n' : ''}exec '${onPath(e)}' "$@"\n`); chmodSync(w, 0o755);
      const text = existsSync(toml) ? readFileSync(toml, 'utf8') : undefined; const line = `${e} = "${w}"`;
      const k = text === undefined ? undefined : engineKey(text, e);   // the bare default is replaced; any other value is refused
      if (k?.kind === 'other') fail(`myharness.toml already sets "${e}": the kit will not overwrite it; remove it from the seed`);
      if (!k) writeFileSync(toml, `${line}\n`);
      else { const ls = text.split('\n'); if (k.kind === 'bare') ls[k.at] = `${k.indent}${line}`; else ls.splice(k.at, 0, line); const out = ls.join('\n'); writeFileSync(toml, out.endsWith('\n') ? out : `${out}\n`); }
    }
    inst.spawnOwned('daemon', [...desc.cli, 'daemon', '--port', '0']);
    for (let i = 0; i < 150 && !existsSync(inst.discovery); i++) { if (!owned(inst.state.daemon.pid, run)) fail('the daemon exited, see logs/daemon.log'); await sleep(200); }
    if (!existsSync(inst.discovery)) fail('the daemon wrote no daemon.json in 30 s, see logs/daemon.log');
    inst.state.daemon.url = readJson(inst.discovery).url; inst.save();
    const bad = (await inst.doctor()).filter((c) => !c.ok); if (bad.length) fail(`the new instance failed its identity checks:\n${bad.map((c) => c.msg).join('\n')}`);
    const v = await inst.cli(['validate']); if (v.code) fail(`myharness validate exited ${v.code} on the seeded home: ${(v.stderr || v.stdout).trim().slice(0, 400)}`);
  } catch (e) {   // a failed start keeps what explains it: the log tails go into the error, the logs into --evidence if there is one
    process.off('SIGINT', onSig); process.off('SIGTERM', onSig);
    const logs = join(root, 'logs'); const tails = (existsSync(logs) ? readdirSync(logs) : []).map((f) => ({ f, t: readFileSync(join(logs, f), 'utf8').trim().split('\n').slice(-8).join('\n') })).filter((x) => x.t);
    if (tails.length) e.message += `\n${tails.map((x) => `--- logs/${x.f} (last lines)\n${x.t}`).join('\n')}`;
    try { await inst.stop({ evidence }); process.off('exit', cleanup); }   // the exit fallback stays armed unless the stop fully succeeded
    catch (se) { e.message += `\n--- cleanup after the failed start: ${se.message}`; }
    throw e;
  }
  if (keep) { process.off('exit', cleanup); process.off('SIGINT', onSig); process.off('SIGTERM', onSig); }   // the state file owns the run now: kit down
  else inst.release = () => { process.off('exit', cleanup); process.off('SIGINT', onSig); process.off('SIGTERM', onSig); };
  return inst;
}
export const attach = (dir) => new Instance(resolveRun(dir));

// ---- CLI ---------------------------------------------------------------------------------------------------------------------
async function envChecks() {
  const out = []; const ok = (c, m, fix) => out.push(`${c ? 'ok  ' : 'FAIL'} ${m}${c ? '' : `\n     fix: ${fix}`}`);
  ok(process.versions.node === PINS.node, `Node ${process.versions.node} (pinned ${PINS.node})`, `install Node ${PINS.node} exactly`);
  ok(onPath('Xvfb'), 'Xvfb (virtual screen)', 'install the xvfb package');
  for (const e of ['pi', 'claude']) { const p = onPath(e); ok(p, `${e}: ${p ?? 'not installed'}`, `install ${e}; its pinned version is the harness's to state`); }
  const mem = Number(/MemAvailable:\s+(\d+)/.exec(readFileSync('/proc/meminfo', 'utf8'))?.[1]) / 1048576; ok(mem >= 1.5, `${mem.toFixed(1)} GB memory available (daemon, mock, Electron and Xvfb need about 1)`, 'stop other work or enlarge the host');
  return out;
}
const engineList = (o) => (o.engines ? o.engines.split(',') : undefined);   // up and run: same parsing, both engines by default
function parse(argv) { const o = {}; const pos = []; for (let i = 0; i < argv.length; i++) { const a = argv[i]; if (a.startsWith('--') && ['--harness', '--engines', '--models', '--run', '--only', '--keep-at', '--evidence'].includes(a)) o[a.slice(2)] = argv[++i]; else if (a.startsWith('--')) o[a.slice(2)] = true; else pos.push(a); } return { o, pos }; }

async function main(argv) {
  const [cmd, ...rest] = argv;   // cli, engine and ui pass everything after an optional leading `--run <dir>` to the tool
  const pass = ['cli', 'engine', 'ui'].includes(cmd); const { o, pos } = pass ? (rest[0] === '--run' ? { o: { run: rest[1] }, pos: rest.slice(2) } : { o: {}, pos: rest }) : parse(rest);
  const run = () => attach(o.run);
  switch (cmd) {
    case 'up': {
      const inst = await start({ harness: o.harness ?? fail('usage: up --harness <descriptor.json> [--engines pi,claude] [--models N]'), engines: engineList(o), models: Number(o.models ?? 1), keep: true });
      console.log(`READY ${inst.url}  run=${inst.root}  home=${inst.home}  daemon=${inst.state.daemon.pid} mock=${inst.state.mock.pid}${inst.state.source ? `  harness@${inst.state.source}` : ''}`); return 0;
    }
    case 'doctor': { if (o.env) { const l = await envChecks(); console.log(l.join('\n')); return l.some((x) => x.startsWith('FAIL')) ? 1 : 0; } const c = await run().doctor(); for (const x of c) console.log(`${x.ok ? 'ok  ' : 'FAIL'} ${x.msg}`); return c.every((x) => x.ok) ? 0 : 1; }
    case 'cli': { const r = await run().cli(pos); process.stdout.write(r.stdout); process.stderr.write(r.stderr); return r.code; }
    case 'engine': { const r = await run().engine(pos[0], pos.slice(1)); process.stdout.write(r.stdout); process.stderr.write(r.stderr); return r.code; }
    case 'api': { const r = await run().api(pos[0], pos[1], pos[2]); console.log(r.text); return r.status < 400 ? 0 : 22; }
    case 'mock': { const m = run().mock; if (pos[0] === 'reset') await m.reset(); else console.log(JSON.stringify(await m.requests(), null, 2)); return 0; }
    case 'app': { const inst = run(); const w = await inst.app(); w.close(); console.log(`APP READY pid=${inst.state.app.pid} cdp=127.0.0.1:${inst.state.app.cdp} window=${inst.url}`); return 0; }
    case 'ui': { const inst = run(); if (!inst.state.app?.cdp) fail('no app is running: kit app'); return uiCli({ port: inst.state.app.cdp, urlPrefix: inst.url }, pos); }
    case 'run': {
      const scenario = (await import(pathToUrl(pos[0] ?? fail('usage: run <scenario.mjs> --harness <d.json> [--engines pi,claude] [--only id] [--keep-at id]')))).default;
      const idx = scenario.cases.findIndex((c) => c.id === o['keep-at']); if (o['keep-at'] && idx < 0) fail(`no case ${o['keep-at']} in ${scenario.section}`);
      if (o.only && !scenario.cases.some((c) => c.id === o.only)) fail(`no case ${o.only} in ${scenario.section}`);
      const inst = await start({ harness: o.harness ?? fail('run needs --harness'), engines: engineList(o), keep: !!o['keep-at'], evidence: o.evidence }); const results = []; let bad = false;
      const flush = () => { if (o.evidence) { try { mkdirSync(o.evidence, { recursive: true }); writeFileSync(join(o.evidence, 'results.json'), JSON.stringify({ section: scenario.section, results }, null, 2)); } catch (e) { console.log(`FAIL evidence: results not saved to ${o.evidence}: ${e.message}`); bad = true; } } };   // after every case, so an interrupt keeps them; a failed write fails the run, never skips its stop
      for (const [i, c] of scenario.cases.entries()) {
        if (o.only && c.id !== o.only) continue;
        if (o['keep-at'] && i > idx) break;
        try { await c.run(inst); results.push({ id: c.id, ok: true }); console.log(`PASS ${c.id} ${c.title ?? ''}`); } catch (e) { results.push({ id: c.id, ok: false, error: e.message }); console.log(`FAIL ${c.id}: ${e.message}`); bad = true; }
        flush(); if (bad) break;
      }
      if (!results.length) { await inst.stop({ evidence: o.evidence }); fail('no case ran'); }
      if (o['keep-at'] && !bad) { console.log(`KEPT ${join(inst.root, 'state.json')}  (clean up with: kit down --run ${inst.root})`); return 0; }
      await inst.stop({ evidence: o.evidence }); return bad ? 1 : 0;
    }
    case 'down': { const inst = run(); await inst.stop({ evidence: o.evidence }); console.log(`DOWN no process of run ${inst.run} is alive; removed ${inst.root}${o.evidence ? `; logs in ${o.evidence}` : ''}`); return 0; }
    default: console.error(readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1, 16).map((l) => l.replace(/^\/\/ ?/, '')).join('\n')); return 2;
  }
}
const pathToUrl = (p) => new URL(p, `file://${process.cwd()}/`).href;
if (import.meta.url === `file://${process.argv[1]}`) {
  try { process.exitCode = await main(process.argv.slice(2)); } catch (e) { console.error(`kit: ${e.message}`); process.exitCode = 1; }
}
