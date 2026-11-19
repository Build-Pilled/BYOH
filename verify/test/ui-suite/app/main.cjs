// Stub app for the ui-shell cases: an Electron window on the daemon's page, as the kit's stub app does. A second argument
// `--mutant=<name>` (after this file in the descriptor's app list) breaks one rule on purpose.
const { app, BrowserWindow, session } = require('electron');
const { readFileSync } = require('node:fs');
const api = process.env.MYHARNESS_API; const tokenFile = process.env.MYHARNESS_TOKEN_FILE;
if (!api || !tokenFile) { console.error('MYHARNESS_API and MYHARNESS_TOKEN_FILE are required'); app.exit(2); }
const mutant = (process.argv.find((a) => a.startsWith('--mutant=')) ?? '').slice(9);
app.whenReady().then(async () => {
  const token = readFileSync(tokenFile, 'utf8').trim();
  session.defaultSession.webRequest.onBeforeSendHeaders({ urls: [`${api}/*`] }, (d, cb) => cb({ requestHeaders: { ...d.requestHeaders, Authorization: `Bearer ${token}` } }));
  const w = new BrowserWindow({ width: 1280, height: 795, useContentSize: true, title: 'Stub' });
  await w.loadURL(`${api}/${mutant ? `?mutant=${mutant}` : ''}`);
});
app.on('window-all-closed', () => app.quit());
