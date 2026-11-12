#!/usr/bin/env node
// A STUB of the BYOH contract, written only so the kit can test itself before (and without) a real harness.
// It implements the seven verifiability seams of spec/verifiability.md and a one-page chat, nothing else:
//   myharness [--init-line <toml line>]… init | bot new <id> [--model m] | validate | bots | daemon [--port N]
// --init-line (repeatable, before the command) adds that line to the myharness.toml that init writes, so the kit's
// selftest can model a harness whose init already names its engines.
// It is not a harness: no engines, no sessions beyond one transcript per bot, no real credential rules.
import { createServer } from 'node:http';
import { chmodSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, appendFileSync, rmSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const home = resolve(process.env.MYHARNESS_HOME ?? join(homedir(), '.myharness'));   // seam 1
const discovery = join(home, 'log', 'daemon.json'); const tokenFile = join(home, 'secrets', 'owner-token');
const argv = process.argv.slice(2); const initLines = [];
while (argv[0] === '--init-line') { initLines.push(argv[1]); argv.splice(0, 2); }
const [cmd, ...args] = argv;
const die = (m, code = 1) => { console.error(`myharness: ${m}`); process.exit(code); };
const flag = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };

if (cmd === 'init') {
  for (const d of ['bots', 'log', 'sessions']) mkdirSync(join(home, d), { recursive: true });
  if (!existsSync(join(home, 'myharness.toml'))) writeFileSync(join(home, 'myharness.toml'), ['# stub harness configuration', ...initLines, ''].join('\n'));
  console.log(`initialized ${home}`);
} else if (cmd === 'bot' && args[0] === 'new') {
  if (!args[1]) die('usage: bot new <id> [--model m]');
  mkdirSync(join(home, 'bots', args[1]), { recursive: true });
  writeFileSync(join(home, 'bots', args[1], 'bot.toml'), `model = "${flag('--model') ?? 'mock/mock-1'}"\n`);
  console.log(`created ${args[1]}`);
} else if (cmd === 'validate') {
  if (!existsSync(join(home, 'myharness.toml'))) die(`${home} is not initialized`, 2);
  console.log('valid');
} else if (cmd === 'bots' || cmd === 'daemon') {
  if (cmd === 'bots') {   // a client: finds the daemon through the discovery file, authenticates with the owner token
    const d = JSON.parse(readFileSync(discovery, 'utf8'));
    const r = await fetch(`${d.url}/bots`, { headers: { authorization: `Bearer ${readFileSync(tokenFile, 'utf8').trim()}` } });
    if (!r.ok) die(`daemon answered ${r.status}`);
    console.log((await r.json()).map((b) => b.id).join('\n'));
  } else {
    // seam 4: the owner token, created before listening; 43 base64url characters, mode 0600 in a 0700 directory
    if (!existsSync(tokenFile)) { mkdirSync(dirname(tokenFile), { recursive: true, mode: 0o700 }); writeFileSync(tokenFile, `${randomBytes(32).toString('base64url')}\n`, { mode: 0o600 }); }
    const token = readFileSync(tokenFile, 'utf8').trim();
    const mock = () => JSON.parse(readFileSync(join(process.env.PI_CODING_AGENT_DIR ?? '', 'models.json'), 'utf8')).providers.mock;   // the engine state this process was given
    const page = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'app', 'index.html'), 'utf8');
    const bots = () => (existsSync(join(home, 'bots')) ? readdirSync(join(home, 'bots')) : []).map((id) => ({ id }));
    const transcript = (bot) => join(home, 'sessions', `${bot}.jsonl`);
    const server = createServer(async (req, res) => {
      const send = (code, body, type = 'application/json') => { res.writeHead(code, { 'content-type': type }); res.end(typeof body === 'string' ? body : JSON.stringify(body)); };
      if (req.headers.authorization !== `Bearer ${token}`) return send(401, { error: 'unauthorized' });
      let body = ''; for await (const c of req) body += c;
      const url = new URL(req.url, 'http://x'); const [, kind, bot, rest] = url.pathname.split('/');
      if (url.pathname === '/') return send(200, page, 'text/html');
      if (url.pathname === '/health') return send(200, { ok: true, pid: process.pid, home, url: base });   // seam 3
      if (url.pathname === '/bots') return send(200, bots());
      if (kind === 'sessions' && rest === 'messages' && req.method === 'GET') return send(200, existsSync(transcript(bot)) ? readFileSync(transcript(bot), 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []);
      if (kind === 'sessions' && rest === 'messages' && req.method === 'POST') {
        const text = JSON.parse(body).text; const m = mock();
        const r = await (await fetch(`${m.baseUrl}/chat/completions`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ model: m.models[0].id, stream: false, messages: [{ role: 'user', content: text }] }) })).text();
        const reply = r.split('\n').filter((l) => l.startsWith('data: {')).map((l) => JSON.parse(l.slice(6)).choices[0].delta.content ?? '').join('');
        appendFileSync(transcript(bot), `${JSON.stringify({ role: 'user', text })}\n${JSON.stringify({ role: 'assistant', text: reply })}\n`);
        return send(200, { reply });
      }
      send(404, { error: 'not found' });
    });
    const want = flag('--port') ?? '7797'; let base;   // seam 2: --port 0 chooses a free loopback port
    await new Promise((ok) => server.listen(Number(want), '127.0.0.1', ok));
    base = `http://127.0.0.1:${server.address().port}`;
    mkdirSync(dirname(discovery), { recursive: true });
    writeFileSync(`${discovery}.tmp`, JSON.stringify({ pid: process.pid, url: base, started: new Date().toISOString() })); renameSync(`${discovery}.tmp`, discovery);
    const stop = () => { rmSync(discovery, { force: true }); server.close(); server.closeAllConnections(); process.exit(0); };
    process.on('SIGTERM', stop); process.on('SIGINT', stop);
  }
} else die(`unknown command ${JSON.stringify(cmd)}`, 2);
