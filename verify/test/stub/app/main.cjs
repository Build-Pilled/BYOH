// Stub app: an Electron window on the daemon's page. Seam 6: the daemon address and token file come from the launch
// environment, and the token is added only to requests for that one origin. It opens no testing connection of its own;
// the kit passes --remote-debugging-port, a plain launch has none (seam 7).
const { app, BrowserWindow, session } = require('electron');
const { readFileSync } = require('node:fs');
const api = process.env.MYHARNESS_API; const tokenFile = process.env.MYHARNESS_TOKEN_FILE;
if (!api || !tokenFile) { console.error('MYHARNESS_API and MYHARNESS_TOKEN_FILE are required'); app.exit(2); }
app.whenReady().then(async () => {
  const token = readFileSync(tokenFile, 'utf8').trim();
  session.defaultSession.webRequest.onBeforeSendHeaders({ urls: [`${api}/*`] }, (d, cb) => cb({ requestHeaders: { ...d.requestHeaders, Authorization: `Bearer ${token}` } }));
  const w = new BrowserWindow({ width: 900, height: 640, title: 'Stub' });
  await w.loadURL(`${api}/`);
});
app.on('window-all-closed', () => app.quit());
