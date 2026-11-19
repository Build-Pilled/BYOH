// Runs only inside the supplied VM, with its already pinned Node. The Mac feeds
// this checked file to Node over Lima; it never executes code fetched from bots.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { once } from 'node:events';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const botId = /^[a-z0-9][a-z0-9-]*$/;
const fail = message => { throw new Error(message); };
const exists = p => { try { fs.lstatSync(p); return true; } catch (e) { if (e.code === 'ENOENT') return false; throw e; } };
export function safePath(p) {
  if (typeof p !== 'string' || !p || /[\x00-\x1f\x7f]/.test(p) || p.split('/').some(x => x === '..' || x === '.')) fail('unsafe path');
  return p;
}
// Exclude by path BEFORE lstat, directory traversal, opening files or hashing.
// No content scan: conversation text is saved as-is, including typed secrets.
export function excluded(rel, source = false) {
  const parts = rel.split('/');
  const dirs = new Set(['secrets', '.git', '.ssh', '.aws', '.azure', '.gnupg', '.kube', '.docker', '.claude', '.pi']);
  const rebuildable = new Set(['node_modules', '.cache', '.npm', 'dist', 'build', 'coverage', 'tmp', 'temp']);
  if (source && parts.some(p => rebuildable.has(p))) return true;
  return /(?:^|\/)\.config\/(?:gh|gcloud|op)(?:\/|$)/.test(rel) || /(?:^|\/)\.local\/share\/keyrings(?:\/|$)/.test(rel) || parts.some(p => dirs.has(p) || /^(?:\.env(?:\..*)?|\.npmrc|\.netrc|\.pypirc|owner-token|session-token|\.gitconfig|\.git-credentials|\.claude\.json|auth\.json|credentials(?:\..*)?|id_(?:rsa|dsa|ecdsa|ed25519)(?:\.pub)?|.*\.(?:pem|key|p12|pfx))$/i.test(p)) ||
    /(?:^|\/)sessions\/[^/]+\/work(?:\/|$)/.test(rel) ||
    /(?:^|\/)log\/daemon\.json$/.test(rel) || /(?:^|\/)factory\.db(?:-wal|-shm|-journal)?$/.test(rel);
}
function noLinks(p) {
  safePath(p);
  if (!path.isAbsolute(p)) fail('expected an absolute source path');
  let at = '/';
  for (const bit of p.split('/').filter(Boolean)) {
    at = path.join(at, bit);
    if (fs.lstatSync(at).isSymbolicLink()) fail(`source path contains a link: ${at}`);
  }
}
function anchoredOpen(p, flags) {
  safePath(p);
  if (!path.isAbsolute(p)) fail('expected an absolute source path');
  // Anchor each parent so a replaced link cannot redirect this open.
  let dir = fs.openSync('/', fs.constants.O_RDONLY | fs.constants.O_DIRECTORY);
  try {
    const bits = p.split('/').filter(Boolean);
    for (const bit of bits.slice(0, -1)) {
      const next = fs.openSync(`/proc/self/fd/${dir}/${bit}`, fs.constants.O_RDONLY | fs.constants.O_DIRECTORY | fs.constants.O_NOFOLLOW);
      fs.closeSync(dir); dir = next;
    }
    return fs.openSync(`/proc/self/fd/${dir}/${bits.at(-1)}`, flags | fs.constants.O_NOFOLLOW);
  } finally { fs.closeSync(dir); }
}
function directoryEntries(p) {
  const fd = anchoredOpen(p, fs.constants.O_RDONLY | fs.constants.O_DIRECTORY);
  try { return fs.readdirSync(`/proc/self/fd/${fd}`).sort(); } finally { fs.closeSync(fd); }
}
function regular(p, uid) {
  const fd = anchoredOpen(p, fs.constants.O_RDONLY);
  const st = fs.fstatSync(fd);
  if (!st.isFile() || st.uid !== uid || st.nlink !== 1) { fs.closeSync(fd); fail(`not an owned, unlinked regular file: ${p}`); }
  return { fd, st };
}
function readOwned(p, uid) {
  const {fd, st} = regular(p, uid);
  try {
    const bytes = fs.readFileSync(fd); const after = fs.fstatSync(fd);
    if (after.size !== st.size || after.mtimeNs !== st.mtimeNs || after.mtimeMs !== st.mtimeMs || after.ctimeMs !== st.ctimeMs || bytes.length !== st.size) fail(`source changed during collection: ${p}`);
    return bytes;
  } finally { fs.closeSync(fd); }
}
function jsonOwned(p, uid) { try { return JSON.parse(readOwned(p, uid)); } catch { fail(`unreadable JSON metadata: ${p}`); } }
const hash = b => crypto.createHash('sha256').update(b).digest('hex');
function revision(root, uid) {
  // Do not load Git configuration, hooks, remotes, index filters or object history.
  try {
    noLinks(path.join(root, '.git/HEAD'));
    const head = readOwned(path.join(root, '.git/HEAD'), uid).toString().trim();
    if (/^[0-9a-f]{40}$/.test(head)) return head;
    if (/^ref: refs\/[a-zA-Z0-9_./-]+$/.test(head) && !head.includes('..')) {
      const ref = path.join(root, '.git', head.slice(5)); noLinks(ref);
      const value = readOwned(ref, uid).toString().trim();
      if (/^[0-9a-f]{40}$/.test(value)) return value;
    }
  } catch { /* absent or packed reference: report unknown, do not read objects */ }
  return null;
}
export function inventory(root, uid, prefix, manifest) {
  if (!exists(root)) { manifest.absent.push(root); return []; }
  const entries = [];
  function visit(dir, rel) {
    if (fs.fstatSync(dir).uid !== uid) fail(`source directory not owned by expected account: ${root}/${rel}`);
    for (const name of fs.readdirSync(`/proc/self/fd/${dir}`).sort()) {
      safePath(name);
      const sub = path.join(rel, name), from = path.join(root, sub);
      if (excluded(sub, prefix === 'source' || prefix === 'deployed-source')) { manifest.excluded.push(from); continue; }
      const pointer = `/proc/self/fd/${dir}/${name}`, st = fs.lstatSync(pointer);
      if (st.isSymbolicLink()) { manifest.excluded.push(`${from} (link, not followed)`); continue; }
      if (st.uid !== uid) fail(`source is not owned by the expected account: ${from}`);
      if (st.isDirectory()) {
        const child = fs.openSync(pointer, fs.constants.O_RDONLY | fs.constants.O_DIRECTORY | fs.constants.O_NOFOLLOW);
        try { visit(child, sub); } finally { fs.closeSync(child); }
      } else if (st.isFile() && st.nlink === 1) entries.push({ from, to: `${prefix}/${sub}`, uid });
      else fail(`unsupported source type or hard link: ${from}`);
    }
  }
  const dir = anchoredOpen(root, fs.constants.O_RDONLY | fs.constants.O_DIRECTORY);
  try { visit(dir, ''); } finally { fs.closeSync(dir); }
  return entries;
}

export function nativeEntries(home, config, uid, manifest) {
  const entries = [];
  const bots = path.join(home, 'bots');
  if (!exists(bots)) return entries;
  noLinks(bots);
  for (const bot of directoryEntries(bots)) {
    if (!botId.test(bot)) continue;
    const sessions = path.join(bots, bot, 'sessions');
    if (!exists(sessions)) continue;
    noLinks(sessions);
    for (const name of directoryEntries(sessions)) {
      const id = name.slice(0, -5);
      if (!name.endsWith('.json') || !uuid.test(id)) continue;
      const meta = jsonOwned(path.join(sessions, name), uid);
      if (meta.id !== id) fail(`session identity mismatch: ${bot}/${id}`);
      if (!meta.file) { if (meta.last_turn) fail(`missing required native transcript: ${bot}/${id}`); continue; }
      if (typeof meta.file !== 'string') fail(`invalid native path: ${bot}/${id}`);
      let from;
      if (path.isAbsolute(meta.file)) {
        from = safePath(meta.file);
        const projects = path.join(config, 'projects');
        if (!from.startsWith(`${projects}/`) || path.basename(from) !== `${id}.jsonl`) fail(`native transcript is outside its selected projects/session: ${bot}/${id}`);
        // No walk of the config root: login/config files are never visited.
        const to = `native/${bot}/${id}/${id}.jsonl`;
        const {fd} = regular(from, uid); fs.closeSync(fd);
        entries.push({ from, to, uid });
        const artifacts = from.slice(0, -6);
        if (exists(artifacts)) entries.push(...inventory(artifacts, uid, `native/${bot}/${id}/artifacts`, manifest));
        manifest.native.push({ bot, id, from, to });
      } else {
        if (path.basename(meta.file) !== meta.file || !meta.file.endsWith('.jsonl')) fail(`invalid home-native transcript name: ${bot}/${id}`);
        from = path.join(sessions, meta.file);
        const {fd} = regular(from, uid); fs.closeSync(fd);
      }
    }
  }
  return entries;
}
export function archivedEntries(home, config, uid, manifest) {
  const root = path.join(home, 'session-archive'), entries = [];
  if (!exists(root)) return entries;
  for (const date of directoryEntries(root)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    const records = path.join(root, date, '@sessions');
    if (!exists(records)) continue;
    for (const name of directoryEntries(records)) {
      if (!name.endsWith('.json')) continue;
      const m = jsonOwned(path.join(records, name), uid);
      if (!botId.test(m.bot) || !uuid.test(m.id) || !Array.isArray(m.moved)) fail('invalid archive manifest identity');
      const metadata = `bots/${m.bot}/sessions/${m.id}.json`;
      const metaEntry = m.moved.find(x => x.from === metadata);
      if (!metaEntry || typeof metaEntry.to !== 'string' || !metaEntry.to.startsWith(`session-archive/${date}/`)) fail('archive is missing its session metadata');
      safePath(metaEntry.to);
      if (path.isAbsolute(metaEntry.to)) fail('absolute archived metadata destination');
      const meta = jsonOwned(path.join(home, metaEntry.to), uid);
      if (meta.id !== m.id || (!meta.file && meta.last_turn)) fail('archive is missing required native transcript metadata');
      if (meta.file) {
        const nativeFrom = path.isAbsolute(meta.file) ? meta.file : `bots/${m.bot}/sessions/${meta.file}`;
        if (!m.moved.some(x => x.from === nativeFrom)) fail('archive is missing its required native transcript mapping');
      }
      for (const item of m.moved) {
        safePath(item.from); safePath(item.to);
        if (path.isAbsolute(item.to) || !item.to.startsWith(`session-archive/${date}/`)) fail('archive destination escapes its dated home slot');
        const to = path.join(home, item.to);
        // Missing sources must not masquerade as a successful empty archive.
        if (!exists(to)) fail(`missing required archived artifact: ${item.to}`);
        if (path.isAbsolute(item.from)) {
          const projects = path.join(config, 'projects');
          if (!item.from.startsWith(`${projects}/`) || !(path.basename(item.from) === `${m.id}.jsonl` || item.from.includes(`/${m.id}/`) || path.basename(item.from) === m.id)) fail('external archived artifact is not owned by its native session');
          const target = `native/archive/${date}/${m.bot}/${m.id}/${path.relative(projects,item.from)}`;
          noLinks(to);
          if (fs.lstatSync(to).isDirectory()) entries.push(...inventory(to, uid, target, manifest));
          else { const {fd} = regular(to,uid); fs.closeSync(fd); entries.push({from:to,to:target,uid}); }
          manifest.native.push({bot:m.bot,id:m.id,from:item.from,archived:to,to:target});
        }
      }
    }
  }
  return entries;
}
const run = (cmd, args) => execFileSync(cmd, args, { encoding: 'utf8', timeout: 30000, stdio: ['ignore', 'pipe', 'pipe'], env: { PATH: '/usr/local/bin:/usr/bin:/bin', LANG: 'C' } }).trim();
function property(name) { return run('systemctl', ['show', 'myharness-daemon.service', `--property=${name}`, '--value']); }
function active(unit) { return run('systemctl', ['show', unit, '--property=ActiveState', '--value']); }
function selectedEnvironment(pid) {
  if (/^[1-9][0-9]*$/.test(pid)) return Object.fromEntries(fs.readFileSync(`/proc/${pid}/environ`, 'utf8').split('\0').filter(Boolean).map(x => { const n = x.indexOf('='); return [x.slice(0,n), x.slice(n+1)]; }));
  const env = property('Environment'); const result = {};
  for (const key of ['MYHARNESS_HOME', 'CLAUDE_CONFIG_DIR']) {
    if (!env.includes(`${key}=`)) continue;
    const m = env.match(new RegExp(`(?:^| )${key}=([^\\s"\\\\]+)(?: |$)`));
    if (!m) fail(`cannot resolve stopped service's ${key}; start it and retry, or explicitly discard`);
    result[key] = m[1];
  }
  return result;
}
export async function checkIdle(api) {
  const details = [];
    const bots = (await api('/bots')).bots;
    if (!Array.isArray(bots)) fail('busy: unreadable bot list');
    for (const bot of bots) {
      if (!botId.test(bot.id) || !Array.isArray(bot.live)) fail('busy: unreadable bot identity/live state');
      if (bot.live.some(s => typeof s.running !== 'boolean' || !uuid.test(s.session))) fail('busy: unreadable live session state');
      if (bot.live.some(s => s.running)) fail(`busy: ${bot.id} has a running turn; finish it and retry`);
      const sessions = (await api(`/bots/${bot.id}/sessions`)).sessions;
      if (!Array.isArray(sessions)) fail('busy: unreadable session list');
      for (const s of sessions) {
        if (!uuid.test(s.id)) fail('busy: unreadable session identity');
        const d = await api(`/sessions/${bot.id}/${s.id}`); details.push({ bot: bot.id, id: s.id, before: d });
        if (typeof d.attached !== 'boolean') fail('busy: cannot determine terminal ownership');
        if (d.attached || [...(d.outbound || []), ...(d.incoming || [])].some(i => ['accepted','queued','pending','dispatching'].includes(i.state))) fail(`busy: ${bot.id}/${s.id} is held or has waiting input; finish/close it and retry`);
      }
    }
  return details;
}
export async function quiesce() {
  if (process.getuid() !== 0) fail('collection must run through the supplied VM admin channel');
  if (property('User') !== 'myharness-user') fail('unexpected daemon service identity');
  const base = '/home/myharness-user';
  const env = selectedEnvironment(property('MainPID'));
  const home = env.MYHARNESS_HOME || path.join(base, '.myharness-home');
  const config = env.CLAUDE_CONFIG_DIR || path.join(base, '.claude');
  if (!path.isAbsolute(home) || !path.isAbsolute(config)) fail('service paths must be absolute');
  if (exists(home)) noLinks(home);
  const uid = Number(run('id', ['-u', 'myharness-user']));
  if (exists(home) && fs.statSync(home).uid !== uid) fail('harness home is not owned by the bot account');
  run('systemctl', ['stop', 'myharness-tidy.timer']);
  process.stderr.write('Tidy timer paused; if removal refuses, resume it with: ssh myharness-admin-ssh sudo systemctl start myharness-tidy.timer\n');
  if (['active', 'activating', 'deactivating'].includes(active('myharness-tidy.service'))) fail('busy: nightly tidy is running; finish it and retry');
  // Check the existing deploy exclusion, without adding a new VM lock/hold.
  run('flock', ['-n', '/run/lock/myharness-deploy.lock', 'true']);
  let details = [];
  if (active('myharness-daemon.service') === 'active') {
    const token = readOwned(path.join(home, 'secrets/owner-token'), uid).toString().trim();
    if (!/^[A-Za-z0-9_-]{43,256}$/.test(token)) fail('unusable owner credential');
    const api = async route => {
      const r = await fetch(`http://127.0.0.1:7797${route}`, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(5000) });
      if (!r.ok) fail(`busy: cannot check daemon (HTTP ${r.status})`);
      return r.json();
    };
    details = await checkIdle(api);
  } else if (!['inactive', 'failed'].includes(active('myharness-daemon.service'))) fail('busy: service is changing state');
  // Accepted check-then-stop race: a newly arriving turn can be cut off here.
  // No force, signal to bot-user processes, or new admission/maintenance API.
  process.stderr.write('Stopping the owned service. A turn starting after the idle check can be cut off. Do not start terminals, tidy or rebuilds during removal.\n');
  run('systemctl', ['stop', 'myharness-daemon.service']);
  if (active('myharness-daemon.service') !== 'inactive') fail('the owned service did not stop');
  for (const d of details) {
    const meta = path.join(home, 'bots', d.bot, 'sessions', `${d.id}.json`);
    try {
      const after = jsonOwned(meta, uid);
      if (after.last_turn && after.last_turn !== d.before.last_turn) process.stderr.write(`A turn may have started just before stop: ${d.bot}/${d.id}; it may have been cut off.\n`);
    } catch { process.stderr.write(`Could not compare final turn metadata for ${d.bot}/${d.id}; a last-moment cutoff cannot be ruled out.\n`); }
  }
  process.stderr.write('Service and tidy timer are stopped. If removal fails, restart with: ssh myharness-admin-ssh sudo systemctl start myharness-daemon.service myharness-tidy.timer\n');
  return { home, config, uid, source: path.join(base, 'myharness-src'), deployed: '/opt/myharness-deploy/src', deployedUid: exists('/opt/myharness-deploy/src') ? fs.statSync('/opt/myharness-deploy/src').uid : 0 };
}
export async function collect(options, output = process.stdout) {
  const {home, config, uid, source, deployed, deployedUid} = options;
  const manifest = { version: 1, home, native: [], absent: [], excluded: [], files: [], sourceRevision: revision(source, uid), deployedRevision: revision(deployed, deployedUid), database: 'absent', privacy: 'Clear text; may include anything typed into a conversation. No content scan. Not a VM image or automatic restore; fresh logins and pairing required.' };
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'myharness-removal-')); fs.chmodSync(temp, 0o700);
  const cleanup = () => fs.rmSync(temp, { recursive: true, force: true });
  if (/[\x00-\x1f\x7f']/.test(temp)) { cleanup(); fail('unsupported temporary-directory path'); }
  const interrupted = () => { cleanup(); process.exit(1); };
  process.once('SIGINT', interrupted); process.once('SIGTERM', interrupted);
  async function write(s) { if (!output.write(s)) await once(output, 'drain'); }
  let count = 0;
  async function emit(to, bytes, from) {
    safePath(to);
    const digest = hash(bytes);
    await write(`F ${Buffer.from(to).toString('hex')} ${bytes.length} ${digest}\n`);
    for (let at = 0; at < bytes.length; at += 49152) await write(`${bytes.subarray(at, at + 49152).toString('base64')}\n`);
    await write('.\n'); count++;
    manifest.files.push({ to, from, size: bytes.length, sha256: digest });
  }
  try {
    let entries = inventory(home, uid, 'home', manifest);
    const sourceEntries = inventory(source, uid, 'source', manifest);
    // Keep a separately labelled deployed worktree whenever present: this also
    // preserves deployed files absent/modified in the person's working tree.
    const deployedEntries = inventory(deployed, deployedUid, 'deployed-source', manifest);
    entries.push(...sourceEntries, ...deployedEntries, ...nativeEntries(home, config, uid, manifest), ...archivedEntries(home, config, uid, manifest));
    const db = path.join(home, 'tasks/factory.db');
    if (exists(db)) {
      const {fd} = regular(db, uid); fs.closeSync(fd);
      const copy = path.join(temp, 'tasks.db');
      // Fixed destination generated by us, not SQL interpolated from VM content.
      run('sqlite3', ['-init', '/dev/null', '-readonly', db, `.backup '${copy}'`]);
      if (run('sqlite3', ['-init', '/dev/null', '-readonly', copy, 'PRAGMA integrity_check;']) !== 'ok') fail('task database copy failed integrity_check');
      await emit('home/tasks/factory.db', fs.readFileSync(copy), db);
      manifest.database = 'SQLite online backup; integrity_check: ok';
    } else manifest.absent.push(db);
    const seen = new Set();
    for (const entry of entries) {
      if (seen.has(entry.to)) fail('duplicate collection destination'); seen.add(entry.to);
      await emit(entry.to, readOwned(entry.from, entry.uid), entry.from);
    }
    await emit('READ-ME.txt', Buffer.from(`${manifest.privacy}\nCredential locations, secrets/, Git history, source dependencies/caches/build output, session work/ and VM images are excluded. Home definitions/notes are not excluded just because a folder is named build, tmp or dist. Links are not followed. Source snapshots include uncommitted files but not Git history. See manifest.json for mappings, exclusions and checksums.\n`), null);
    const summary = Buffer.from(JSON.stringify(manifest, null, 2) + '\n');
    await emit('manifest.json', summary, null);
    await write(`END ${count}\n`);
  } finally { cleanup(); process.removeListener('SIGINT', interrupted); process.removeListener('SIGTERM', interrupted); }
}
if (process.argv[1] === '-') {
  try {
    if (!['save', 'discard'].includes(process.argv[2])) fail('expected save or discard');
    const options = await quiesce();
    if (process.argv[2] === 'save') await collect(options);
    else process.stdout.write('QUIESCED\n');
  } catch (e) { process.stderr.write(`reason: ${e.message}\n`); process.exitCode = 1; }
}
