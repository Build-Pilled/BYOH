// ui-shell: window behaviour that the layout pack fixes, proved on the real app at the pack's window size (1280 x 795). Effect
// first: the seeded session's transcript from the daemon, then the window, found by role and exact accessible name from the
// Controls table. Geometry that has no role (the composer box, the transcript, the steps block and result panel) is read through
// the pack's data-role attributes `composer`, `transcript`, `toolSteps` and `toolResult`. Numbers are CSS px with a 2 px tolerance
// (the layout pack's fixed class). Nothing here judges paint, so a case passes on any look.
import assert from 'node:assert/strict';
import { cliOk, detail, evidencePath, firstEngine, mockBot, newSession, saveJson, until, windowStep } from './lib.mjs';

const TOL = 2;
const near = (a, b, tol = TOL) => Math.abs(a - b) <= tol;
const lines = (n, word = 'line') => Array.from({ length: n }, (_, i) => `${word} ${i + 1}`).join('\n');
const TOOL = { pi: ['bash', (c) => ({ command: c })], claude: ['Bash', (c) => ({ command: c, description: 'ui-shell tool collapse' })] };
const rect = (m) => ({ x: m.rect.x, y: m.rect.y, w: m.rect.width, h: m.rect.height });

// A bot with one session holding the given turns, then the window on that conversation.
async function seed(kit, bot, title, texts, ev) {
  const engine = firstEngine(kit);
  await mockBot(kit, bot, engine, ev.commands); await cliOk(kit, ['validate'], ev.commands);
  const sid = ev.session = await newSession(kit, bot, title, ev.commands);
  for (const t of texts) await cliOk(kit, ['say', bot, '--session', sid, t], ev.commands, { timeout: 300000 });
  const d = await until('the seeded reply in the session', async () => { const x = await detail(kit, bot, sid); return x.messages.some((m) => m.role === 'assistant') ? x : null; }, { timeout: 120000, every: 500 });
  return { engine, sid, messages: d.messages };
}
async function openConversation(w, bot, sid) {
  await w.viewport();
  await w.waitFor('tree', 'Bots and threads');
  await w.waitFor('treeitem', `Bot ${bot}`);
  await w.click('treeitem', `Bot ${bot}`);
  await w.waitFor('region', `Conversation ${bot}/${sid}`);
}

// Catches: a composer that stays one line however much is typed, one that grows past its cap instead of scrolling, a transcript that
// keeps the old bottom reserve so the last message ends under the taller composer, a scrollbar before the cap, and a Send that
// drifts from the composer's bottom edge.
const growth = { id: 'ui-shell-composer-grows-to-cap-then-scrolls', title: 'ui-shell R1, R8 and the layout behaviours (composer growth): the composer grows with what is typed from a 33 high field in a 57 high composer up to a 240 high field in a 264 high composer, then scrolls inside itself; the transcript keeps its last message above it, Send stays at the bottom edge and idle while empty, and it shrinks back as text is deleted', run: async (kit) => {
  const ev = { catches: 'a fixed one-line composer; no cap; no bottom reserve; an early scrollbar; a drifting Send', commands: [], steps: {} };
  try {
    const bot = 'uigrow';
    const seeded = await seed(kit, bot, 'ui-shell growth', [`MOCK_REPLY\n${lines(40, 'earlier reply line')}`], ev);
    const last = seeded.messages.at(-1).entry; ev.lastEntry = last;
    await windowStep(kit, ev, 'ui-shell-composer', async (w) => {
      await openConversation(w, bot, seeded.sid);
      const FIELD = { role: 'textbox', name: 'Message' }, COMPOSER = { selector: '[data-role="composer"]' }, TRANSCRIPT = { selector: '[data-role="transcript"]' };
      const sample = async (name) => {
        const fm = await w.measure(FIELD); const f = rect(fm); const c = rect(await w.measure(COMPOSER));
        const send = await w.read('button', 'Send'); const msg = (await w.read('region', `Message ${last}`)).box;
        const t = await w.eval(`(() => { const t = document.querySelector('[data-role="transcript"]'); return { top: t.scrollTop, height: t.scrollHeight, client: t.clientHeight, inner: innerHeight }; })()`);
        // where the last message's bottom edge lies once the transcript is scrolled to its end
        const lastBottomAtEnd = msg.y + msg.h - (t.height - t.client - t.top);
        const s = { name, field: f, fieldScrolls: fm.overflow, composer: c, send: { x: send.box.x, y: send.box.y, w: send.box.w, h: send.box.h, disabled: !!send.states.disabled }, lastBottomAtEnd, innerHeight: t.inner };
        ev.steps[name] = s; await w.shot(evidencePath(kit, `ui-shell-composer-${name}.png`)); return s;
      };
      const rest = await sample('rest');
      assert.ok(near(rest.field.h, 33), `an empty composer's field is ${rest.field.h} high, expected 33`);
      assert.ok(near(rest.composer.h, 57), `an empty composer is ${rest.composer.h} high, expected 57`);
      assert.ok(near(rest.composer.y + rest.composer.h, rest.innerHeight), 'the composer is not docked to the bottom of the window');
      assert.equal(rest.send.disabled, true, 'Send is not idle (disabled) while the draft is empty');
      assert.ok(near(rest.send.w, 32) && near(rest.send.h, 32), `Send is ${rest.send.w} x ${rest.send.h}, expected 32 x 32`);
      assert.ok(near(rest.send.y + rest.send.h, rest.field.y + rest.field.h), 'Send is not bottom-aligned with the field');
      assert.equal(rest.fieldScrolls, false, 'the empty field already scrolls');
      assert.ok(rest.lastBottomAtEnd <= rest.composer.y + 1, `the last message ends at ${rest.lastBottomAtEnd}, under the composer that starts at ${rest.composer.y}`);

      await w.fill('textbox', 'Message', 'one line');
      const one = await sample('one-line');
      assert.ok(near(one.field.h, 33) && near(one.composer.h, 57), `one line of text changed the composer to ${one.field.h} / ${one.composer.h}`);
      assert.equal(one.send.disabled, false, 'Send stays idle with text in the draft');

      await w.fill('textbox', 'Message', lines(6));
      const mid = await sample('six-lines');
      assert.ok(mid.field.h > 33 + 20 && mid.field.h < 240 - 20, `six lines make the field ${mid.field.h} high: it must grow, and stay below the 240 cap`);
      assert.ok(near(mid.composer.h, mid.field.h + 24), `the composer is ${mid.composer.h} high around a ${mid.field.h} field, expected the field plus 24`);
      assert.equal(mid.fieldScrolls, false, 'the field scrolls before it reaches its cap');
      assert.ok(near(mid.composer.y + mid.composer.h, mid.innerHeight), 'the composer left the bottom of the window as it grew');
      assert.ok(near(mid.send.y + mid.send.h, rest.send.y + rest.send.h, 1), `Send moved from y ${rest.send.y + rest.send.h} to ${mid.send.y + mid.send.h} while the composer grew`);
      assert.ok(mid.lastBottomAtEnd <= mid.composer.y + 1, `the last message ends at ${mid.lastBottomAtEnd}, under the grown composer that starts at ${mid.composer.y}`);

      await w.fill('textbox', 'Message', lines(28));
      const cap = await sample('twenty-eight-lines');
      assert.ok(near(cap.field.h, 240), `28 pasted lines make the field ${cap.field.h} high, expected the 240 cap`);
      assert.ok(near(cap.composer.h, 264), `28 pasted lines make the composer ${cap.composer.h} high, expected 264`);
      assert.equal(cap.fieldScrolls, true, 'the field does not scroll inside itself at the cap');
      assert.ok(cap.lastBottomAtEnd <= cap.composer.y + 1, `the last message ends at ${cap.lastBottomAtEnd}, under the capped composer that starts at ${cap.composer.y}`);
      assert.ok(near(cap.send.y + cap.send.h, rest.send.y + rest.send.h, 1), 'Send moved at the cap');

      await w.fill('textbox', 'Message', lines(60));
      const over = await sample('sixty-lines');
      assert.ok(near(over.field.h, 240) && near(over.composer.h, 264), `60 lines make the field ${over.field.h} and the composer ${over.composer.h} high: the cap is 240 / 264`);
      assert.equal(over.fieldScrolls, true, 'the field does not scroll beyond its cap');

      await w.fill('textbox', 'Message', '');
      const back = await sample('emptied');
      assert.ok(near(back.field.h, 33) && near(back.composer.h, 57), `deleting the text left the composer at ${back.field.h} / ${back.composer.h}, expected 33 / 57`);
      assert.equal(back.send.disabled, true, 'Send is not idle again with an empty draft');
      assert.equal(back.fieldScrolls, false, 'the emptied field still scrolls');
    });
  } finally { saveJson(kit, 'ui-shell-composer-grows-to-cap-then-scrolls', ev); }
} };

// Catches: tool steps that show expanded when the reply settles, a Worked group that shows its raw results before it is opened,
// a chip that does not open the step list, a step list that does not push the reply down by its height, and a tool summary that
// does not open its result.
const collapse = { id: 'ui-shell-tool-steps-collapsed-until-clicked', title: 'ui-shell R8 and the layout behaviours (collapsed tool steps): a settled tool-using reply shows its Worked group collapsed with the raw tool output hidden; the Worked button opens the step list and moves the reply down by its height; a tool result button opens that result', run: async (kit) => {
  const ev = { catches: 'tool steps expanded by default; raw output visible while collapsed; a chip or summary that opens nothing; a step list that overlaps the reply', commands: [], steps: {} };
  try {
    const bot = 'uitool'; const engine = firstEngine(kit); const [tool, args] = TOOL[engine];
    // the raw result's second line is computed, so the text 42xRAW is in the tool output only: not in the arguments and not in the reply
    const cmd = "printf 'head\\n%sxRAW\\n' \"$((6*7))\"";
    const seeded = await seed(kit, bot, 'ui-shell tools', [`MOCK_TOOL ${tool} ${JSON.stringify(args(cmd))}`], ev);
    const reply = seeded.messages.at(-1); ev.reply = { entry: reply.entry, text: reply.text };
    assert.ok(reply.text.includes('head') && !reply.text.includes('42xRAW'), `the settled reply is ${JSON.stringify(reply.text)}: the tool did not run or the raw output leaked into the reply`);
    await windowStep(kit, ev, 'ui-shell-tools', async (w) => {
      await openConversation(w, bot, seeded.sid);
      const shown = (text) => w.eval(`document.body.innerText.includes(${JSON.stringify(text)})`);
      const WORKED = /^Worked \d+$/, RESULT = /^Tool result \d+$/;
      const chip = await w.waitFor('button', WORKED);
      await w.waitFor('region', `Message ${reply.entry}`);
      assert.equal(!!chip.states.expanded, false, `the Worked group is expanded when the reply settles (${chip.name})`);
      await w.waitFor('button', RESULT, { gone: true, timeout: 3000 }).catch(() => { throw new Error('tool result buttons are shown while the Worked group is collapsed'); });
      assert.equal(await shown('42xRAW'), false, 'raw tool output is visible while the Worked group is collapsed');
      const before = (await w.read('region', `Message ${reply.entry}`)).box; ev.steps.collapsed = { chip: chip.name, replyY: before.y };
      await w.shot(evidencePath(kit, 'ui-shell-tools-collapsed.png'));

      await w.click('button', WORKED);
      await w.waitFor('button', WORKED, { state: 'expanded=true', timeout: 5000 });
      const step = await w.waitFor('button', RESULT, { timeout: 5000 });
      assert.equal(!!step.states.expanded, false, 'a tool result is open before its button is clicked');
      assert.equal(await shown('42xRAW'), false, 'raw tool output is visible before its tool result button is clicked');
      const block = await w.measure({ selector: '[data-role="toolSteps"]' }); const after = (await w.read('region', `Message ${reply.entry}`)).box;
      ev.steps.groupOpen = { stepsBlock: rect(block), replyY: after.y, moved: after.y - before.y };
      assert.ok(block.rect.height > 0, 'the step list has no height after the Worked button is clicked');
      assert.ok(near(after.y - before.y, block.rect.height), `the reply moved down ${after.y - before.y}, expected the step list's height ${block.rect.height}`);
      await w.shot(evidencePath(kit, 'ui-shell-tools-group-open.png'));

      await w.click('button', RESULT);
      await w.waitFor('button', RESULT, { state: 'expanded=true', timeout: 5000 });
      assert.equal(await shown('42xRAW'), true, 'the tool result button did not show the raw tool output');
      const panel = await w.measure({ selector: '[data-role="toolResult"]' }); ev.steps.resultOpen = { panel: rect(panel) };
      assert.ok(panel.rect.height > 0, 'the result panel has no height after its button is clicked');
      await w.shot(evidencePath(kit, 'ui-shell-tools-result-open.png'));
    });
  } finally { saveJson(kit, 'ui-shell-tool-steps-collapsed-until-clicked', ev); }
} };

export default { section: 'ui-shell', cases: [growth, collapse] };
