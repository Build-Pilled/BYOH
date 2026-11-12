#!/usr/bin/env node
// Scripted model server. One HTTP server, two wire formats, one directive language:
//   OpenAI Chat Completions (POST /v1/chat/completions) for Pi, Anthropic Messages (POST /v1/messages) for Claude Code.
// The directives are read from the LAST user message (never the system prompt), one per line:
//   (none)                       reply "echo: <first line not starting with [>"
//   MOCK_TOOL <tool> <json>      call the tool with those arguments; the next turn replies "done: <first line of the result>"
//   MOCK_FAIL                    HTTP 400 for this request
//   MOCK_SLOW <ms>               wait before answering a user turn;  MOCK_SLOW_TOOLS <ms>  wait before answering a tool result
//   MOCK_USAGE <n>               report n prompt (input) tokens
//   MOCK_REPLY                   everything after this line is the reply, verbatim, streamed one line per chunk
//   MOCK_STREAM <ms> <base64>    the decoded text is the reply, one character per chunk, <ms> apart
// GET /requests lists what the model received (system, messages, tool names); POST /reset empties it; GET /v1/models lists MOCK_MODELS models.
// Library: startMock({ models, host }) -> { port, url, requests(), reset(), stop() }.
// CLI: node mock-model.mjs --port-file <file> [--pi-dir <dir>] [--models N]; the port file is written last and atomically.
import { createServer } from 'node:http';
import { mkdirSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const text = (c) => (typeof c === 'string' ? c : Array.isArray(c) ? c.map((p) => (typeof p === 'string' ? p : p?.type === 'text' || p?.text ? p.text ?? '' : '')).join('') : '');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// What to answer, independent of the wire format. `user` is the last user text, `result` the first tool result (or undefined), `history` all user text.
function plan({ user, result, history }) {
  const slowTools = Number(/MOCK_SLOW_TOOLS (\d+)/.exec(history)?.[1] ?? 0);
  if (result !== undefined) return { delay: slowTools, chunks: [`done: ${text(result).split('\n')[0]}`], tools: [], tokens: 10 };
  const lines = user.split('\n');
  const stream = lines.map((l) => /^MOCK_STREAM (\d+) ([A-Za-z0-9+/=]+)$/.exec(l.trim())).find(Boolean);
  const at = lines.findIndex((l) => l.trim() === 'MOCK_REPLY');
  const tools = lines.map((l) => /^\s*MOCK_TOOL (\S+) (.*)$/.exec(l)).filter(Boolean).map((m) => ({ name: m[1], args: m[2] }));
  const out = {
    delay: Number(/MOCK_SLOW (\d+)/.exec(user)?.[1] ?? 0), tools, step: 0, tokens: Number(/MOCK_USAGE (\d+)/.exec(user)?.[1] ?? 10),
    fail: lines.some((l) => /MOCK_FAIL/.test(l) && !/^\s*MOCK_TOOL /.test(l)),
  };
  if (stream) return { ...out, chunks: [...Buffer.from(stream[2], 'base64').toString('utf8')], step: Number(stream[1]) };
  if (at >= 0) { const rest = lines.slice(at + 1); return { ...out, chunks: rest.map((l, i) => (i < rest.length - 1 ? `${l}\n` : l)) }; }
  return { ...out, chunks: [`echo: ${(lines.find((l) => l.trim() && !l.startsWith('[')) ?? '').trim()}`] };
}

export async function startMock({ models = 1, host = '127.0.0.1' } = {}) {
  let log = []; let seq = 0;
  const ids = Array.from({ length: models }, (_, i) => `mock-${i + 1}`);
  const json = (res, code, body) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(body)); };
  const sse = (res) => res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive' });

  async function openai(payload, res) {
    const msgs = payload.messages ?? []; const last = msgs.at(-1) ?? {};
    const sys = msgs.filter((m) => m.role === 'system' || m.role === 'developer').map((m) => text(m.content)).join('\n');
    const rest = msgs.filter((m) => m.role !== 'system' && m.role !== 'developer');
    log.push({ format: 'openai', model: payload.model, system: sys, messages: rest, tools: (payload.tools ?? []).map((t) => t.function?.name ?? t.name) });
    const p = plan({ user: last.role === 'user' ? text(last.content) : '', result: last.role === 'tool' ? text(last.content) : undefined, history: msgs.map((m) => text(m.content)).join('\n') });
    if (p.delay) await sleep(p.delay);
    if (p.fail) return json(res, 400, { error: { message: 'mock failure: the model refused this request', type: 'invalid_request_error' } });
    sse(res);
    const chunk = (delta, finish = null, usage) => res.write(`data: ${JSON.stringify({ id: 'mock', object: 'chat.completion.chunk', created: 0, model: payload.model, choices: [{ index: 0, delta, finish_reason: finish }], ...(usage ? { usage } : {}) })}\n\n`);
    const usage = { prompt_tokens: p.tokens, completion_tokens: 5, total_tokens: p.tokens + 5 };
    if (p.tools.length) {
      chunk({ role: 'assistant', content: null });
      p.tools.forEach((t, index) => chunk({ tool_calls: [{ index, id: `call_${++seq}`, type: 'function', function: { name: t.name, arguments: t.args } }] }));
      chunk({}, 'tool_calls', usage);
    } else {
      chunk({ role: 'assistant', content: '' });
      for (const c of p.chunks) { chunk({ content: c }); if (p.step) await sleep(p.step); }
      chunk({}, 'stop', usage);
    }
    res.end('data: [DONE]\n\n');
  }

  async function anthropic(payload, res) {
    if (!payload.stream) return json(res, 200, { id: 'msg_mock', type: 'message', role: 'assistant', model: payload.model, content: [{ type: 'text', text: 'ok' }], stop_reason: 'end_turn', usage: { input_tokens: 1, output_tokens: 1 } });
    const names = (payload.tools ?? []).map((t) => t.name);
    const sys = typeof payload.system === 'string' ? payload.system : (payload.system ?? []).map((b) => b.text ?? '').join('\n');
    const msgs = (payload.messages ?? []).filter((m) => m.role !== 'system');
    log.push({ format: 'anthropic', model: payload.model, system: sys, messages: msgs, tools: names });
    // <system-reminder> blocks are Claude Code's own context, not the user's words.
    const own = (c) => (typeof c === 'string' ? c : (c ?? []).filter((b) => b?.type === 'text' && !String(b.text).startsWith('<system-reminder>')).map((b) => b.text).join('\n'));
    const last = msgs.at(-1) ?? {};
    const results = Array.isArray(last.content) ? last.content.filter((b) => b?.type === 'tool_result') : [];
    const p = plan({ user: own(last.content), result: results.length ? own(results[0].content) : undefined, history: msgs.filter((m) => m.role === 'user').map((m) => own(m.content)).join('\n') });
    if (p.delay) await sleep(p.delay);
    if (p.fail) return json(res, 400, { type: 'error', error: { type: 'invalid_request_error', message: 'mock failure: the model refused this request' } });
    sse(res);
    const send = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify({ type: event, ...data })}\n\n`);
    send('message_start', { message: { id: `msg_${++seq}`, type: 'message', role: 'assistant', model: payload.model, content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: p.tokens, output_tokens: 1 } } });
    if (p.tools.length) {
      p.tools.forEach((t, index) => {
        const name = names.find((n) => n === t.name || n.endsWith(`__${t.name}`)) ?? t.name;   // mcp__<server>__<tool> or bare
        send('content_block_start', { index, content_block: { type: 'tool_use', id: `toolu_mock_${++seq}`, name, input: {} } });
        send('content_block_delta', { index, delta: { type: 'input_json_delta', partial_json: t.args } });
        send('content_block_stop', { index });
      });
    } else {
      send('content_block_start', { index: 0, content_block: { type: 'text', text: '' } });
      for (const c of p.chunks) { send('content_block_delta', { index: 0, delta: { type: 'text_delta', text: c } }); if (p.step) await sleep(p.step); }
      send('content_block_stop', { index: 0 });
    }
    send('message_delta', { delta: { stop_reason: p.tools.length ? 'tool_use' : 'end_turn', stop_sequence: null }, usage: { output_tokens: 5 } });
    send('message_stop', {}); res.end();
  }

  const server = createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', async () => {
      try {
        const path = req.url.split('?')[0];
        if (req.method === 'GET' && path === '/requests') return json(res, 200, log);
        if (req.method === 'POST' && path === '/reset') { log = []; return void res.writeHead(204).end(); }
        if (req.method === 'GET' && path.endsWith('/models')) return json(res, 200, { data: ids.map((id) => ({ id })) });
        if (req.method !== 'POST') return void res.writeHead(404).end();
        const payload = JSON.parse(body || '{}');
        if (path.endsWith('/chat/completions')) return await openai(payload, res);
        if (path.endsWith('/v1/messages')) return await anthropic(payload, res);
        res.writeHead(404).end();   // includes /v1/messages/count_tokens, which Claude Code tolerates
      } catch (e) { if (!res.headersSent) json(res, 500, { error: { message: String(e) } }); else res.end(); }
    });
  });
  await new Promise((r) => server.listen(0, host, r));
  const port = server.address().port;
  return {
    port, url: `http://${host}:${port}`, ids, requests: () => log, reset: () => { log = []; },
    stop: () => new Promise((r) => { server.closeAllConnections(); server.close(() => r()); }),
  };
}

// A Pi agent directory that knows only this server (isolation: PI_CODING_AGENT_DIR points here).
export function writePiDir(dir, mock) {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'models.json'), JSON.stringify({ providers: { mock: { baseUrl: `${mock.url}/v1`, api: 'openai-completions', apiKey: 'mock', models: mock.ids.map((id) => ({ id, name: id, contextWindow: 128000, maxTokens: 4096 })) } } }, null, 2));
  writeFileSync(join(dir, 'settings.json'), JSON.stringify({ defaultProvider: 'mock', defaultModel: mock.ids[0], enableInstallTelemetry: false }, null, 2));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const arg = (n) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : undefined; };
  const portFile = arg('--port-file');
  if (!portFile) { console.error('usage: node mock-model.mjs --port-file <file> [--pi-dir <dir>] [--models N]'); process.exit(2); }
  const mock = await startMock({ models: Number(arg('--models') ?? 1) });
  if (arg('--pi-dir')) writePiDir(arg('--pi-dir'), mock);
  writeFileSync(`${portFile}.tmp`, String(mock.port)); renameSync(`${portFile}.tmp`, portFile);
  const stop = async () => { await mock.stop(); process.exit(0); };
  process.on('SIGTERM', stop); process.on('SIGINT', stop);
}
