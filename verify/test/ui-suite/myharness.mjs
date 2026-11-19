#!/usr/bin/env node
// A STUB harness for proving the window cases of suite/ui-shell.mjs, not a harness: no engines, no model. It keeps the seams the
// kit needs (home, discovery file, owner token, health) and a minimal bot, session, `say` and transcript surface, with a page
// (app/index.html) that is deliberately built to the layout rules, or broken in one named way (--mutant in app/main.cjs).
//   myharness init | bot new <id> [--model m] | validate | new <bot> --title <t> | say <bot> --session <sid> <text> | bots | daemon [--port N]
// `say` runs a `MOCK_TOOL <tool> {"command": ...}` line as a shell command, or uses the text after a `MOCK_REPLY` line, else echoes.
import { createServer } from 'node:http';
import { execFileSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { randomBytes, randomUUID } from 'node:crypto';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const home = resolve(process.env.MYHARNESS_HOME ?? join(homedir(), '.myharness-home'));
const discovery = join(home, 'log', 'daemon.json'); const tokenFile = join(home, 'secrets', 'owner-token');
const [cmd, ...args] = process.argv.slice(2);
const die = (m, code = 1) => { console.error(`myharness: ${m}`); process.exit(code); };
const flag = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
const sdir = (bot) => join(home, 'sessions', bot);
const sessions = (bot) => (existsSync(sdir(bot)) ? readdirSync(sdir(bot)).filter((f) => f.endsWith('.json')) : []).map((f) => JSON.parse(readFileSync(join(sdir(bot), f), 'utf8')));
const save = (s) => writeFileSync(join(sdir(s.bot), `${s.id}.json`), JSON.stringify(s));
const load = (bot, id) => JSON.parse(readFileSync(join(sdir(bot), `${id}.json`), 'utf8'));

if (cmd === 'init') {
  for (const d of ['bots', 'log', 'sessions']) mkdirSync(join(home, d), { recursive: true });
  if (!existsSync(join(home, 'myharness.toml'))) writeFileSync(join(home, 'myharness.toml'), '# stub harness configuration\n');
  console.log(`initialized ${home}`);
} else if (cmd === 'bot' && args[0] === 'new') {
  mkdirSync(join(home, 'bots', args[1]), { recursive: true });
  writeFileSync(join(home, 'bots', args[1], 'bot.toml'), `model = "${flag('--model') ?? 'mock/mock-1'}"\n`);
  console.log(`created ${args[1]}`);
} else if (cmd === 'validate') {
  if (!existsSync(join(home, 'myharness.toml'))) die(`${home} is not initialized`, 2);
  console.log('valid');
} else if (cmd === 'new') {
  mkdirSync(sdir(args[0]), { recursive: true });
  const s = { bot: args[0], id: randomUUID(), title: flag('--title') ?? '', messages: [] }; save(s); console.log(s.id);
} else if (cmd === 'say') {
  const bot = args[0]; const s = load(bot, flag('--session')); const text = args.at(-1); const n = s.messages.length;
  const lines = text.split('\n'); const tool = lines.map((l) => /^\s*MOCK_TOOL (\S+) (.*)$/.exec(l)).find(Boolean); const at = lines.findIndex((l) => l.trim() === 'MOCK_REPLY');
  s.messages.push({ entry: `e${n + 1}`, role: 'user', text });
  const a = { entry: `e${n + 2}`, role: 'assistant', text: '' };
  if (tool) {
    const cmdline = JSON.parse(tool[2]).command; const out = execFileSync('sh', ['-c', cmdline], { encoding: 'utf8' });
    a.steps = [{ tool: tool[1], arguments: cmdline, result: out.trimEnd() }]; a.text = `done: ${out.split('\n')[0]}`;
  } else a.text = at >= 0 ? lines.slice(at + 1).join('\n') : `echo: ${lines.find((l) => l.trim())?.trim() ?? ''}`;
  s.messages.push(a); save(s); console.log(a.text);
} else if (cmd === 'bots') {
  console.log((existsSync(join(home, 'bots')) ? readdirSync(join(home, 'bots')) : []).join('\n'));
} else if (cmd === 'daemon') {
  if (!existsSync(tokenFile)) { mkdirSync(dirname(tokenFile), { recursive: true, mode: 0o700 }); writeFileSync(tokenFile, `${randomBytes(32).toString('base64url')}\n`, { mode: 0o600 }); }
  chmodSync(tokenFile, 0o600); const token = readFileSync(tokenFile, 'utf8').trim();
  const page = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'app', 'index.html'), 'utf8');
  const bots = () => (existsSync(join(home, 'bots')) ? readdirSync(join(home, 'bots')) : []).map((id) => ({ id, live: [] }));
  let base;
  const server = createServer((req, res) => {
    const send = (code, body, type = 'application/json') => { res.writeHead(code, { 'content-type': type }); res.end(typeof body === 'string' ? body : JSON.stringify(body)); };
    if (req.headers.authorization !== `Bearer ${token}`) return send(401, { error: 'unauthorized' });
    const url = new URL(req.url, 'http://x'); const p = url.pathname.split('/').filter(Boolean);
    if (!p.length) return send(200, page, 'text/html');
    if (p[0] === 'health') return send(200, { ok: true, pid: process.pid, home, url: base });
    if (p[0] === 'bots' && p.length === 1) return send(200, { bots: bots() });
    if (p[0] === 'bots' && p[2] === 'sessions') return send(200, { sessions: sessions(p[1]).map(({ id, title }) => ({ id, title, origin: 'person' })) });
    if (p[0] === 'sessions' && p.length === 3) return send(200, load(p[1], p[2]));
    send(404, { error: 'not found' });
  });
  await new Promise((ok) => server.listen(Number(flag('--port') ?? '7797'), '127.0.0.1', ok));
  base = `http://127.0.0.1:${server.address().port}`;
  mkdirSync(dirname(discovery), { recursive: true });
  writeFileSync(`${discovery}.tmp`, JSON.stringify({ pid: process.pid, url: base, started: new Date().toISOString() })); renameSync(`${discovery}.tmp`, discovery);
  const stop = () => { rmSync(discovery, { force: true }); server.close(); server.closeAllConnections(); process.exit(0); };
  process.on('SIGTERM', stop); process.on('SIGINT', stop);
} else die(`unknown command ${JSON.stringify(cmd)}`, 2);
