// macOS built-ins only (JXA/Foundation/AppKit). No app is launched by this file.
ObjC.import('Foundation');
ObjC.import('AppKit');
function run(argv) {
  var current = Application.currentApplication(); current.includeStandardAdditions = true;
  var env = $.NSProcessInfo.processInfo.environment;
  var home = ObjC.unwrap(env.objectForKey('HOME'));
  if (argv[0] === 'preferences') {
    var prefs = $.NSUserDefaults.standardUserDefaults;
    prefs.removePersistentDomainForName('local.myharness.app');
    if (!prefs.synchronize) throw Error('could not synchronize the exact preferences domain');
    if (!prefs.persistentDomainForName('local.myharness.app').isNil()) throw Error('preferences domain still exists');
    return 'Exact preferences domain removed (or already absent).';
  }
  if (argv[0] !== 'quit') throw Error('expected quit or preferences');
  var bundle = home + '/Applications/myharness.app';
  var uid = Number(current.doShellScript('/usr/bin/id -u'));
  function processes() {
    var rows = current.doShellScript('/bin/ps -ww -axo pid=,uid=,lstart=,comm=').split('\n');
    var result = [];
    rows.forEach(function (row) {
      var m = row.match(/^\s*(\d+)\s+(\d+)\s+(\S+\s+\S+\s+\d+\s+\d\d:\d\d:\d\d\s+\d+)\s+(.+)$/);
      if (!m || m[4].indexOf(bundle + '/') !== 0) return;
      if (Number(m[2]) !== uid) throw Error('installed-bundle process belongs to another user');
      result.push({pid:Number(m[1]), start:m[3], exe:m[4]});
    });
    return result;
  }
  function same(a, b) { return a.pid === b.pid && a.start === b.start && a.exe === b.exe; }
  var apps = $.NSWorkspace.sharedWorkspace.runningApplications;
  for (var i = 0; i < apps.count; i++) {
    var app = apps.objectAtIndex(i);
    if (!app.bundleURL || app.bundleURL.isNil()) continue;
    var at = ObjC.unwrap(app.bundleURL.URLByStandardizingPath.URLByResolvingSymlinksInPath.path);
    if (at !== bundle) continue;
    if (ObjC.unwrap(app.bundleIdentifier) !== 'local.myharness.app') throw Error('running installed app has an unexpected identity');
    var pid = Number(app.processIdentifier);
    if (!processes().some(function (p) { return p.pid === pid; })) throw Error('cannot verify running app process');
    app.terminate;
  }
  function wait(seconds) {
    for (var n = 0; n < seconds; n++) {
      if (processes().length === 0) return true;
      $.NSThread.sleepForTimeInterval(1);
    }
    return processes().length === 0;
  }
  if (wait(30)) return 'Owned app is not running.';
  var owned = processes();
  // Fixed numeric PID, current UID, start time and exact executable path are
  // rechecked immediately before each signal. Never kill by display name.
  owned.forEach(function (p) {
    if (!processes().some(function (q) { return same(p, q); })) throw Error('app PID changed before SIGTERM; quit it manually and retry');
    try { current.doShellScript('/bin/kill -TERM ' + String(p.pid)); }
    catch (e) { if (processes().some(function (q) { return same(p,q); })) throw e; }
  });
  if (!wait(10)) throw Error('owned app/helpers remain after 30 s quit and 10 s SIGTERM; quit them manually and retry');
  return 'Owned app exited after SIGTERM.';
}
