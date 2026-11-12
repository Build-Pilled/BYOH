// config-editors: the file boundary of the owner files API. Effect only: HTTP statuses and bodies of owner
// `GET /files/<path>`, `PUT /files/<path>` (config-editors R3), the generic owner deletion of a file (`DELETE /files/<path>`,
// config-editors R3) and the listing route (`GET /list/<path>`, config-editors R3), and the bytes of every file involved, read from disk
// before and after. Requests are sent with node:http so that `..` and percent-encoded segments reach the daemon as written (a
// URL parser would resolve them first). Token bytes are never recorded: the credential file is compared by digest in memory.
// Each case names the broken implementation it catches; observations go into the evidence as they are made.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { request } from 'node:http';
import { existsSync, mkdirSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { firstEngine, mockBot, newSession, saveJson, treeDiff, treeState } from './lib.mjs';

const send = (kit, method, path, body) => new Promise((ok, no) => {
  const u = new URL(kit.url); const token = readFileSync(kit.tokenFile, 'utf8').trim();
  const req = request({ host: u.hostname, port: u.port, method, path, headers: { authorization: `Bearer ${token}`, ...(body === undefined ? {} : { 'content-type': 'text/plain', 'content-length': Buffer.byteLength(body) }) }, timeout: 30000 }, (res) => {
    let text = ''; res.setEncoding('utf8'); res.on('data', (c) => { text += c; }); res.on('end', () => ok({ status: res.statusCode, text, leaks: text.includes(token) }));
  });
  req.on('timeout', () => req.destroy(new Error(`${method} ${path}: no answer in 30 s`))); req.on('error', no); if (body !== undefined) req.write(body); req.end();
});
const OPS = [['read', 'GET', '/files/'], ['write', 'PUT', '/files/'], ['delete', 'DELETE', '/files/'], ['list', 'GET', '/list/']];
const digest = (f) => createHash('sha256').update(readFileSync(f)).digest('hex');

// Catches: a files API that follows `..` (plain or percent-encoded) out of the home, follows a symlink whose target is outside the
// home (existing target or a missing leaf below it), opens .git or a daemon-owned path (bot sessions, a bridge log.jsonl, log/,
// secrets/) by its own name, a case or compatibility alias, or a symlink alias; that answers such a request with anything but 400
// naming the requested path, or changes any byte on the way; or that refuses ordinary in-home symlinks.
const fileBoundary = { id: 'config-editors-file-boundary', title: 'config-editors R5, E2, daemon E5: owner read, write, delete and list refuse traversal, symlink escapes out of the home (existing or missing leaf), .git and the protected paths (bot sessions, bridge log, log/, secrets/) under their own names and aliases with 400 naming the path, change no file inside or outside the home, and still serve an ordinary symlink inside the home', run: async (kit) => {
  const engine = firstEngine(kit); const ev = { catches: 'traversal or symlink escapes followed; .git or daemon-owned paths opened by name, alias or link; a refusal that is not 400 or does not name the path; changed bytes; in-home symlinks refused', engine, commands: [], denials: [], steps: {} };
  const bot = 'cfiles';
  try {
    await mockBot(kit, bot, engine, ev.commands); const sid = await newSession(kit, bot, 'files boundary', ev.commands);
    // fixtures: a directory outside the home with a file, links out of the home, a protected-path alias, a bridge log, an ordinary in-home link
    const outside = join(kit.root, 'files-outside'); mkdirSync(outside, { recursive: true }); writeFileSync(join(outside, 'secret.txt'), 'outside bytes\n');
    symlinkSync(outside, join(kit.home, 'out-dir')); symlinkSync(join(outside, 'secret.txt'), join(kit.home, 'out-file.md'));
    symlinkSync('secrets', join(kit.home, 'alias-secrets')); symlinkSync('log', join(kit.home, 'alias-log'));
    const notes = join(kit.home, 'bots', bot, 'notes'); mkdirSync(notes, { recursive: true }); writeFileSync(join(notes, 'real.md'), 'in-home note\n'); symlinkSync('real.md', join(notes, 'link.md'));
    const pair = join(kit.home, 'bridges', `${bot}--zz`); mkdirSync(pair, { recursive: true }); if (!existsSync(join(pair, 'log.jsonl'))) writeFileSync(join(pair, 'log.jsonl'), '');
    const tokenSum = digest(kit.tokenFile);
    const denied = [
      ['traversal with an encoded slash', '..%2Ffiles-outside%2Fsecret.txt'], ['traversal below a folder, encoded slashes', `bots%2F${bot}%2F..%2F..%2F..%2Ffiles-outside%2Fsecret.txt`],
      ['link out of the home', 'out-file.md'], ['link to a directory out of the home', 'out-dir/secret.txt'], ['missing leaf through an outside link', 'out-dir/missing.md'],
      ['.git', '.git/config'], ['.git by case', '.GIT/config'],
      ['credential directory', 'secrets/owner-token'], ['credential directory by case', 'Secrets/owner-token'], ['credential directory by compatibility form', '%EF%BD%93ecrets/owner-token'],
      ['credential directory by link', 'alias-secrets/owner-token'], ['log', 'log/daemon.json'], ['log by link', 'alias-log/daemon.json'],
      ['bot sessions', `bots/${bot}/sessions/${sid}.json`], ['bridge log', `bridges/${bot}--zz/log.jsonl`],
    ];
    // Keep the attacked protected files; only unrelated history and live logs may change.
    const skip = (r) => (r.startsWith('.git/') && r !== '.git/config') || (r.startsWith('log/') && r !== 'log/daemon.json');
    const homeBefore = treeState(kit.home, skip); const outsideBefore = treeState(outside);
    for (const [why, path] of denied) for (const [op, method, prefix] of OPS) {
      if (op === 'list' && /\.(md|json|txt|jsonl|token)$|owner-token$|config$/.test(path)) continue;   // listing applies to directories
      const r = await send(kit, method, `${prefix}${path}`, op === 'write' ? 'config-editors overwrite attempt\n' : undefined);
      const seen = { why, path, op, status: r.status, namesPath: r.text.includes(decodeURIComponent(path)) || r.text.includes(path), leaks: r.leaks }; ev.denials.push(seen);
    }
    for (const [why, path] of [['credential directory', 'secrets'], ['log', 'log'], ['bot sessions', `bots/${bot}/sessions`], ['link to a directory out of the home', 'out-dir'], ['.git', '.git']]) {
      const r = await send(kit, 'GET', `/list/${path}`); ev.denials.push({ why, path, op: 'list', status: r.status, namesPath: r.text.includes(path), leaks: r.leaks });
    }
    // `..` segments written as such (plain or as %2e) are removed by HTTP path normalisation (RFC 3986 dot segments) before any
    // route: the request then names a path outside the files routes, so it may be refused as 400 or answered 404, but it must never
    // reach a file. The encoded-slash forms above carry the traversal into the file path itself and must be 400.
    ev.dotSegments = [];
    for (const path of ['../files-outside/secret.txt', '%2e%2e/files-outside/secret.txt', `bots/${bot}/../../../files-outside/secret.txt`]) for (const [op, method, prefix] of OPS.slice(0, 3)) {
      const r = await send(kit, method, `${prefix}${path}`, op === 'write' ? 'config-editors overwrite attempt\n' : undefined);
      ev.dotSegments.push({ path, op, status: r.status, outsideBytes: r.text.includes('outside bytes'), leaks: r.leaks });
    }
    ev.steps.homeChanges = treeDiff(homeBefore, treeState(kit.home, skip)); ev.steps.outsideChanges = treeDiff(outsideBefore, treeState(outside));
    ev.steps.tokenUnchanged = digest(kit.tokenFile) === tokenSum;
    // an ordinary symlink inside the home stays readable, writable and listable
    const rd = await send(kit, 'GET', `/files/bots/${bot}/notes/link.md`); const wr = await send(kit, 'PUT', `/files/bots/${bot}/notes/link.md`, 'in-home note edited\n'); const ls = await send(kit, 'GET', `/list/bots/${bot}/notes`);
    ev.steps.inHomeLink = { read: rd.status, readBody: rd.text, write: wr.status, list: ls.status, listNames: ls.text.includes('link.md'), realAfter: readFileSync(join(notes, 'real.md'), 'utf8') };
    // judgement: every denial is 400 and leaks nothing; nothing changed; the in-home link works
    const bad = ev.denials.filter((x) => x.status !== 400);
    assert.deepEqual(bad.map((x) => `${x.op} ${x.path}: ${x.status}`), [], 'a protected, escaping or traversing request was not refused with 400 (config-editors R5)');
    assert.deepEqual(ev.dotSegments.filter((x) => ![400, 404].includes(x.status) || x.outsideBytes).map((x) => `${x.op} ${x.path}: ${x.status}`), [], 'a request with dot segments reached a file');
    assert.deepEqual(ev.denials.concat(ev.dotSegments).filter((x) => x.leaks).map((x) => `${x.op} ${x.path}`), [], 'a refusal returned the owner token');
    assert.equal(ev.steps.tokenUnchanged, true, 'the owner token file changed');
    assert.deepEqual(ev.steps.outsideChanges, { added: [], removed: [], changed: [] }, `files outside the home changed: ${JSON.stringify(ev.steps.outsideChanges)}`);
    assert.deepEqual(ev.steps.homeChanges, { added: [], removed: [], changed: [] }, `refused requests changed files in the home: ${JSON.stringify(ev.steps.homeChanges)}`);
    assert.equal(rd.status, 200, `reading an ordinary in-home symlink returned ${rd.status}`); assert.equal(rd.text, 'in-home note\n');
    assert.ok(wr.status < 300, `writing through an ordinary in-home symlink returned ${wr.status}`); assert.equal(ev.steps.inHomeLink.realAfter, 'in-home note edited\n', 'the write did not reach the linked file');
    assert.equal(ls.status, 200, `listing a folder with an in-home symlink returned ${ls.status}`); assert.equal(ev.steps.inHomeLink.listNames, true, 'the listing does not show the in-home link');
    const unnamed = ev.denials.filter((x) => !x.namesPath);
    assert.deepEqual(unnamed.map((x) => `${x.op} ${x.path}`), [], 'a refusal does not name the requested path (config-editors R5)');
  } finally { saveJson(kit, 'config-editors-file-boundary', ev); }
} };

export default { section: 'config-editors', cases: [fileBoundary] };
