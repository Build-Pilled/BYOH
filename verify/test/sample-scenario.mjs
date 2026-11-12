// A sample scenario in the shape the suite will use: a section, and inline cases run in order on one instance.
// `kit run <this file> --keep-at message` stops after the case "message" and leaves the instance up.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

export default {
  section: 'kit-selftest',
  cases: [
    { id: 'start', title: 'the instance is healthy and owned by this run', run: async (kit) => {
      const h = await kit.api('GET', '/health');
      assert.equal(h.status, 200); assert.equal(h.json.home, kit.home);
    } },
    { id: 'message', title: 'a message is stored by the daemon', run: async (kit) => {
      const r = await kit.api('POST', '/sessions/helper/messages', { text: 'scenario hello' });
      assert.equal(r.json.reply, 'echo: scenario hello');
    } },
    { id: 'reply', title: 'the transcript file holds both sides', run: async (kit) => {
      const lines = readFileSync(`${kit.home}/sessions/helper.jsonl`, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
      assert.deepEqual(lines.map((l) => l.role), ['user', 'assistant']);
    } },
    { id: 'hang', title: 'never finishes by itself (the interrupt check ends it)', run: () => new Promise((r) => setTimeout(r, 120000)) },
  ],
};
