#!/usr/bin/env node
// Window driver: real input events over the Chrome DevTools Protocol, controls found by ROLE and exact ACCESSIBLE NAME
// from Chromium's own accessibility tree. No dependency. One driver for the suite (library) and the skill (CLI).
//   Library: const w = await connect({ port, urlPrefix }); await w.click('button', 'Send'); await w.waitFor('article', /echo: hi/);
//   CLI:     node driver.mjs <cdp-port> <url-prefix> <verb> [args]      (the kit runs this as `kit ui <verb> [args]`)
// A name is matched exactly; /regex/ matches a name built at run time. One match is required; more than one is an error that
// lists them, and `--in <role> "<name>"` narrows the search to that container. A click is hit-tested first, and refused with
// "covered by <role "name">" when something else sits at the point, so a failure means the app, not the driver.
//   click|hover <role> <name> [--in <role> <name>]      real mouse at the centre of the control
//   fill <role> <name> <text> [--append]                click to focus, select all (unless --append), insert text as typing
//   key <chord>                                         Mod+K, Ctrl+Shift+P, Enter, Escape, Tab, ArrowDown... (Mod = Ctrl on Linux)
//   wait <role> <name> [--gone] [--state S] [--timeout ms]   S: focused expanded selected checked disabled (value after =, e.g. checked=true)
//   read <role> <name>                                  JSON {role,name,value,states,text,box}
//   focus                                               JSON {role,name} of the focused control
//   tree <file.json>                                    the accessibility tree as JSON [{depth,role,name,value,states}]
//   shot <file.png> [<role> <name>]                     the window, or one control
//   select <role> <name> [<end-role> <end-name>]        mouse-drag over the control's text (to the end control's text); prints it
//   scheme dark|light     size <w> <h>     eval '<js>'  (eval is for capture only, never for acting)
import { writeFileSync } from 'node:fs';

const STATES = ['focused', 'expanded', 'selected', 'checked', 'disabled', 'pressed', 'invalid', 'required', 'readonly', 'busy'];
const KEYS = { Enter: 13, Escape: 27, Tab: 9, Space: 32, ArrowDown: 40, ArrowUp: 38, ArrowLeft: 37, ArrowRight: 39, Home: 36, End: 35, PageUp: 33, PageDown: 34, Backspace: 8, Delete: 46 };
const PUNCT = { '/': ['Slash', 191], '.': ['Period', 190], ',': ['Comma', 188], '-': ['Minus', 189], '=': ['Equal', 187], ';': ['Semicolon', 186], "'": ['Quote', 222], '[': ['BracketLeft', 219], ']': ['BracketRight', 221], '\\': ['Backslash', 220], '`': ['Backquote', 192] };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const parseName = (n) => { const m = typeof n === 'string' && /^\/(.+)\/([a-z]*)$/.exec(n); return m ? new RegExp(m[1], m[2]) : n; };
const label = (n) => `${n.role} ${JSON.stringify(n.name)}`;

export async function connect({ port, urlPrefix = '', timeout = 20000 }) {
  let page;
  for (let i = 0; i < 100 && !page; i++) {   // the page can be missing for a moment while a window loads or reloads
    if (i) await sleep(100);
    const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json().catch(() => []);
    page = list.find((t) => t.type === 'page' && t.url.startsWith(urlPrefix));
  }
  if (!page) throw new Error(`no page starting with ${JSON.stringify(urlPrefix)} on CDP port ${port}`);
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((ok, no) => { ws.addEventListener('open', ok, { once: true }); ws.addEventListener('error', no, { once: true }); });
  let seq = 0; const pending = new Map(); const errors = []; const crashes = []; const errorHooks = []; const crashHooks = [];
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); return; }
    const err = m.method === 'Runtime.exceptionThrown' ? m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text
      : m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error' ? m.params.args.map((a) => a.value ?? a.description).join(' ') : null;
    if (err) { errors.push(err); errorHooks.forEach((f) => f(err)); }
    if (m.method === 'Inspector.targetCrashed') { crashes.push(Date.now()); crashHooks.forEach((f) => f()); }
  });
  ws.addEventListener('close', () => { for (const f of pending.values()) f({ error: { message: 'connection closed' } }); crashHooks.forEach((f) => f()); });
  const send = (method, params = {}) => new Promise((ok, no) => {
    const id = ++seq; pending.set(id, (m) => (m.error ? no(new Error(`${method}: ${m.error.message}`)) : ok(m.result)));
    ws.send(JSON.stringify({ id, method, params }));
  });
  const js = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
    return r.result.value;
  };
  for (const d of ['Accessibility', 'Runtime', 'Page', 'Inspector']) await send(`${d}.enable`);
  // Xvfb has no window manager: a resized page can report itself hidden and render no frames, so show it before acting.
  const show = async () => { if (await js('document.visibilityState').catch(() => 'visible') === 'hidden') await send('Page.bringToFront'); };
  const props = (n) => Object.fromEntries((n.properties ?? []).filter((p) => STATES.includes(p.name) && ![false, 'false'].includes(p.value.value)).map((p) => [p.name, p.value.value]));   // only states that are on
  const rootOf = async (container) => (container ? (await one(container.role, container.name)).backendDOMNodeId : (await send('DOM.getDocument', { depth: 0 })).root.backendNodeId);

  async function find(role, name, container) {
    await show();
    const root = await rootOf(container);
    const re = parseName(name) instanceof RegExp ? parseName(name) : null;
    const { nodes } = await send('Accessibility.queryAXTree', { backendNodeId: root, role, ...(re ? {} : { accessibleName: name }) });
    return nodes.filter((n) => !n.ignored && n.backendDOMNodeId && n.role?.value === role && (!re || re.test(n.name?.value ?? '')))
      .map((n) => ({ role, name: n.name?.value ?? '', value: n.value?.value ?? '', states: props(n), backendDOMNodeId: n.backendDOMNodeId }));
  }
  async function one(role, name, container) {
    const hits = await find(role, name, container);
    const where = `${role} ${JSON.stringify(String(name))}${container ? ` in ${container.role} ${JSON.stringify(String(container.name))}` : ''}`;
    if (!hits.length) throw new Error(`no ${where}`);
    if (hits.length > 1) throw new Error(`${hits.length} matches for ${where}: ${hits.map(label).join('; ')} (narrow with --in or an exact name)`);
    return hits[0];
  }
  const box = async (n) => {
    await send('DOM.scrollIntoViewIfNeeded', { backendNodeId: n.backendDOMNodeId }).catch(() => {});
    const { quads } = await send('DOM.getContentQuads', { backendNodeId: n.backendDOMNodeId });
    if (!quads?.length) throw new Error(`${label(n)} has no visible box`);
    const q = quads[0]; const xs = [q[0], q[2], q[4], q[6]]; const ys = [q[1], q[3], q[5], q[7]];
    const b = { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
    if (!b.w || !b.h) throw new Error(`${label(n)} has a 0-size box`);
    return { ...b, cx: b.x + b.w / 2, cy: b.y + b.h / 2 };
  };
  const objectOf = async (id) => (await send('DOM.resolveNode', { backendNodeId: id })).object.objectId;
  async function point(n) {
    await show();
    const b = await box(n);
    const hit = await send('DOM.getNodeForLocation', { x: Math.round(b.cx), y: Math.round(b.cy), includeUserAgentShadowDOM: true });
    if (hit.backendNodeId !== n.backendDOMNodeId) {   // the hit may be inside the control (a text field's inner node); .host steps out of a shadow root
      const inside = await send('Runtime.callFunctionOn', { objectId: await objectOf(n.backendDOMNodeId), functionDeclaration: 'function (h) { for (let n = h; n; n = n.parentNode || n.host) if (n === this) return true; return false; }', arguments: [{ objectId: await objectOf(hit.backendNodeId) }], returnByValue: true });
      if (!inside.result.value) {
        const { nodes } = await send('Accessibility.getPartialAXTree', { backendNodeId: hit.backendNodeId, fetchRelatives: false });
        throw new Error(`${label(n)} is covered by ${nodes[0] ? `${nodes[0].role?.value} ${JSON.stringify(nodes[0].name?.value ?? '')}` : 'another element'} at (${Math.round(b.cx)}, ${Math.round(b.cy)})`);
      }
    }
    return b;
  }
  const mouse = (type, x, y, extra = {}) => send('Input.dispatchMouseEvent', { type, x, y, ...extra });
  const tap = async (n) => { const { cx, cy } = await point(n); await mouse('mouseMoved', cx, cy); await mouse('mousePressed', cx, cy, { button: 'left', clickCount: 1 }); await mouse('mouseReleased', cx, cy, { button: 'left', clickCount: 1 }); };

  async function key(chord) {
    const parts = chord.split('+'); const k = parts.pop() || '+'; const mods = parts.map((m) => (m === 'Mod' ? 'Ctrl' : m));
    for (const m of mods) if (!['Ctrl', 'Alt', 'Shift', 'Meta'].includes(m)) throw new Error(`unknown modifier ${m} in ${chord}`);
    const modifiers = (mods.includes('Alt') ? 1 : 0) | (mods.includes('Ctrl') ? 2 : 0) | (mods.includes('Meta') ? 4 : 0) | (mods.includes('Shift') ? 8 : 0);
    const [kk, code, vk] = KEYS[k] ? [k === 'Space' ? ' ' : k, k, KEYS[k]] : /^[A-Za-z]$/.test(k) ? [modifiers & 8 ? k.toUpperCase() : k.toLowerCase(), `Key${k.toUpperCase()}`, k.toUpperCase().charCodeAt(0)]
      : /^\d$/.test(k) ? [k, `Digit${k}`, k.charCodeAt(0)] : PUNCT[k] ? [k, ...PUNCT[k]] : [];
    if (!kk) throw new Error(`unknown key ${chord}; use [Mod|Ctrl|Alt|Shift|Meta+]one of ${Object.keys(KEYS).join(' ')}, a letter, a digit or ${Object.keys(PUNCT).join('')}`);
    const base = { key: kk, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, modifiers };
    const typed = k === 'Enter' ? '\r' : kk.length === 1 && !(modifiers & 3) ? kk : undefined;   // a plain character also types itself, as a real key does
    await show();
    await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', ...base, ...(typed ? { text: typed } : {}) });
    if (typed) await send('Input.dispatchKeyEvent', { type: 'char', ...base, text: typed });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', ...base });
  }
  const focusNode = async () => (await send('Accessibility.getFullAXTree')).nodes.filter((n) => !n.ignored && props(n).focused === true).at(-1);   // the page root is focused too; the deepest one is the control
  const textOf = async (n) => (await send('Runtime.callFunctionOn', { objectId: await objectOf(n.backendDOMNodeId), functionDeclaration: 'function () { return this.innerText ?? this.textContent ?? ""; }', returnByValue: true })).result.value;
  const shotTo = async (file, clip) => { const { data } = await send('Page.captureScreenshot', { format: 'png', ...(clip ? { clip: { x: clip.x, y: clip.y, width: clip.w, height: clip.h, scale: 1 } } : {}) }); writeFileSync(file, Buffer.from(data, 'base64')); return file; };
  const textRect = async (n) => (await send('Runtime.callFunctionOn', { objectId: await objectOf(n.backendDOMNodeId), returnByValue: true, functionDeclaration: `function () {
    this.scrollIntoView({ block: 'center' }); const g = document.createRange(); g.selectNodeContents(this);
    const rs = [...g.getClientRects()].filter((r) => r.width && r.height); return rs.length ? { l: rs[0].left, t: rs[0].top + rs[0].height / 2, r: rs.at(-1).right, b: rs.at(-1).top + rs.at(-1).height / 2 } : null; }` })).result.value;

  return {
    errors, crashes,
    onConsoleError: (f) => errorHooks.push(f), onCrash: (f) => crashHooks.push(f),
    click: async (role, name, o = {}) => tap(await one(role, name, o.in)),
    hover: async (role, name, o = {}) => { const { cx, cy } = await point(await one(role, name, o.in)); await mouse('mouseMoved', cx, cy); },
    async fill(role, name, value, o = {}) { await tap(await one(role, name, o.in)); if (!o.append) await key('Mod+A'); if (value === '' && !o.append) await key('Backspace'); else await send('Input.insertText', { text: value }); },
    key,
    async waitFor(role, name, o = {}) {
      const end = Date.now() + (o.timeout ?? timeout); const [sk, sv] = o.state ? String(o.state).split('=') : []; let last = '';
      for (;;) {
        await show();
        try {
          const hits = await find(role, name, o.in);
          if (o.gone ? !hits.length : hits.length === 1 && (!sk || String(hits[0].states[sk] ?? false) === (sv ?? 'true'))) return hits[0];
          last = hits.length > 1 ? `${hits.length} matches` : hits.length ? `found, ${sk} is ${hits[0].states[sk] ?? false}` : 'not found';
        } catch (e) { last = e.message; }
        if (Date.now() > end) throw new Error(`timed out waiting for ${role} ${JSON.stringify(String(name))}${o.gone ? ' to go' : ''}${sk ? ` (${sk}${sv ? '=' + sv : ''})` : ''}: ${last}`);
        await sleep(150);
      }
    },
    async read(role, name, o = {}) { const n = await one(role, name, o.in); const { backendDOMNodeId, ...rest } = n; return { ...rest, text: await textOf(n), box: await box(n) }; },
    async focus() { const n = await focusNode(); return n ? { role: n.role.value, name: n.name?.value ?? '' } : null; },
    async tree(file) {
      const { nodes } = await send('Accessibility.getFullAXTree'); const by = new Map(nodes.map((n) => [n.nodeId, n])); const out = [];
      const walk = (n, d) => { if (!n.ignored && n.role?.value && !['generic', 'none', 'InlineTextBox', 'StaticText', 'LineBreak'].includes(n.role.value)) out.push({ depth: d, role: n.role.value, name: n.name?.value ?? '', value: n.value?.value, states: props(n) }); (n.childIds ?? []).forEach((c) => by.has(c) && walk(by.get(c), n.ignored ? d : d + 1)); };
      if (nodes[0]) walk(nodes[0], 0);
      if (file) writeFileSync(file, JSON.stringify(out, null, 2) + '\n');
      return out;
    },
    async shot(file, role, name, o = {}) { await show(); return shotTo(file, role ? await box(await one(role, name, o.in)) : undefined); },
    async select(role, name, endRole, endName) {
      const a = await textRect(await one(role, name)); const z = endRole ? await textRect(await one(endRole, endName)) : a;
      if (!a || !z) throw new Error(`no visible text in ${role} ${JSON.stringify(String(name))}`);
      await show(); await mouse('mouseMoved', a.l, a.t); await mouse('mousePressed', a.l, a.t, { button: 'left', buttons: 1, clickCount: 1 });
      await mouse('mouseMoved', z.r + 1, z.b, { button: 'left', buttons: 1 }); await mouse('mouseReleased', z.r + 1, z.b, { button: 'left', buttons: 0, clickCount: 1 });
      return js('getSelection().toString()');
    },
    async scheme(v) { if (!['dark', 'light'].includes(v)) throw new Error('scheme takes dark or light'); await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: v }] }); await sleep(100); },
    async size(w, h) {   // the window, not the page: Xvfb has no window manager to do it
      await js(`resizeTo(${Number(w)}, ${Number(h)})`); await show(); await sleep(300); return js('({ w: innerWidth, h: innerHeight })');
    },
    eval: js,
    close: () => ws.close(),
  };
}

// CLI face: argv is `<verb> [args]`; prints the result, returns the exit code.
export async function cli(opts, argv) {
  const [verb, ...rest] = argv; const flags = {}; const pos = [];
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (a === '--in') { flags.in = { role: rest[i + 1], name: parseName(rest[i + 2]) }; i += 2; }
    else if (a === '--gone' || a === '--append') flags[a.slice(2)] = true;
    else if (a === '--state' || a === '--timeout') flags[a.slice(2)] = rest[++i];
    else pos.push(a);
  }
  if (flags.timeout) flags.timeout = Number(flags.timeout);
  const w = await connect(opts);
  try {
    const t = (i) => [pos[i], parseName(pos[i + 1])];
    const need = (n, usage) => { if (pos.length < n) throw new Error(`usage: ui ${verb} ${usage}`); };
    const print = (v) => console.log(typeof v === 'string' ? v : JSON.stringify(v));
    switch (verb) {
      case 'click': case 'hover': need(2, '<role> <name> [--in <role> <name>]'); await w[verb](...t(0), flags); break;
      case 'fill': need(3, '<role> <name> <text> [--append]'); await w.fill(...t(0), pos[2], flags); break;
      case 'key': need(1, '<chord>'); await w.key(pos[0]); break;
      case 'wait': need(2, '<role> <name> [--gone] [--state S] [--timeout ms]'); await w.waitFor(...t(0), flags); break;
      case 'read': need(2, '<role> <name>'); print(await w.read(...t(0), flags)); break;
      case 'focus': print(await w.focus()); break;
      case 'tree': need(1, '<file.json>'); await w.tree(pos[0]); print(pos[0]); break;
      case 'shot': need(1, '<file.png> [<role> <name>]'); print(await w.shot(pos[0], pos[1], parseName(pos[2]), flags)); break;
      case 'select': need(2, '<role> <name> [<end-role> <end-name>]'); print(await w.select(...t(0), ...(pos[2] ? t(2) : []))); break;
      case 'scheme': need(1, 'dark|light'); await w.scheme(pos[0]); break;
      case 'size': need(2, '<w> <h>'); print(await w.size(pos[0], pos[1])); break;
      case 'eval': need(1, "'<js>'"); print(await w.eval(pos[0])); break;
      default: throw new Error(`unknown ui verb ${JSON.stringify(verb)}; verbs: click hover fill key wait read focus tree shot select scheme size eval`);
    }
    return 0;
  } catch (e) { console.error(`ui ${verb}: ${e.message}`); return 1; } finally { w.close(); }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [port, urlPrefix, ...argv] = process.argv.slice(2);
  if (!port || !argv.length) { console.error('usage: node driver.mjs <cdp-port> <url-prefix> <verb> [args]'); process.exit(2); }
  process.exit(await cli({ port, urlPrefix }, argv));
}
