#!/usr/bin/env node
// Focused recipe regressions; Node is used by tests/VM, never required on the Mac.
// node --test verify/test/removal.mjs
// MYHARNESS_TEST_SOURCE can point at an older source tree for fail-first proof.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { pathToFileURL, fileURLToPath } from 'node:url';
const repo = process.env.MYHARNESS_TEST_SOURCE || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const modern = fs.existsSync(path.join(repo, 'vm/myharness-removal.sh'));
const include = 'Include ~/.ssh/myharness-ssh.conf';
function put(p, text, mode) { fs.mkdirSync(path.dirname(p), {recursive:true}); fs.writeFileSync(p, text); if (mode) fs.chmodSync(p, mode); }
function frame(name, value, digest) {
  const b = Buffer.from(value); return `F ${Buffer.from(name).toString('hex')} ${b.length} ${digest || crypto.createHash('sha256').update(b).digest('hex')}\n${b.length ? b.toString('base64')+'\n' : ''}.\n`;
}
const goodStream = () => frame('home/bots/helper/sessions/conversation.jsonl', 'private conversation\n') + frame('source/main.js', 'source changes\n') + frame('READ-ME.txt', 'clear text\n') + frame('manifest.json', '{}\n') + 'END 4\n';
function fixture() {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'myharness-removal-test-')), home=path.join(root,'home'), bin=path.join(root,'bin');
  fs.mkdirSync(home); fs.mkdirSync(bin);
  const script=(name,body)=>put(path.join(bin,name),`#!${process.execPath}\n${body}\n`,0o755);
  script('stat', `const fs=require('fs'); const a=process.argv.slice(2),s=fs.lstatSync(a.at(-1)); console.log(a[1]==='%u'?s.uid:a[1]==='%Lp'?(s.mode&4095).toString(8):s.dev+':'+s.ino);`);
  script('base64', `const fs=require('fs'); const a=process.argv.slice(2); process.stdout.write(Buffer.from(fs.readFileSync(a[a.indexOf('-i')+1],'utf8'),'base64'));`);
  script('xxd', `const fs=require('fs');const a=process.argv.slice(2),b=fs.readFileSync(0);process.stdout.write(a.includes('-r')?Buffer.from(b.toString().trim(),'hex'):b.toString('hex').match(/.{1,60}/g)?.join('\\n')+'\\n');`);
  script('uuidgen', `console.log(require('crypto').randomUUID());`);
  script('plutil', `console.log('local.myharness.app');`);
  script('uname', `console.log(process.argv[2]==='-s'?'Darwin':'arm64');`);
  script('sw_vers', `console.log('13.6');`);
  script('df', `console.log('Filesystem Blocks Used Available Capacity');console.log('test 100 20 80 20%');`);
  script('sysctl', `console.log(process.argv.at(-1)==='hw.memsize'?'34359738368':'8');`);
  script('lsof', `process.exit(1);`);
  script('curl', `require('fs').appendFileSync(process.env.CALLS,'download-attempt\\n');process.stderr.write('test download unavailable\\n');process.exit(22);`);
  script('osascript', `const fs=require('fs');fs.appendFileSync(process.env.CALLS,process.argv.at(-1)+'\\n');if(process.argv.at(-1)==='quit'&&process.env.APP_FAIL==='1')process.exit(1);if(process.argv.at(-1)==='preferences')fs.rmSync(process.env.HOME+'/Library/Preferences/local.myharness.app.plist',{force:true});`);
  put(path.join(home,'.local/bin/limactl'), `#!${process.execPath}\nconst fs=require('fs'),p=require('path'),a=process.argv.slice(2),h=process.env.HOME;fs.appendFileSync(process.env.CALLS,a.join(' ')+'\\n');
if(a[0]==='--version')console.log('limactl version 2.3.0');
else if(a[0]==='list')console.log(process.env.VM_STATUS||'Running');
else if(a[0]==='shell'){if(process.env.COLLECT_FAIL==='1')process.exit(3);process.stdout.write(a.at(-1)==='save'?fs.readFileSync(process.env.STREAM):'QUIESCED\\n');}
else if(a[0]==='delete')fs.rmSync(p.join(h,'.lima/myharness-vm'),{recursive:true,force:true});
else if(a[0]==='disk'&&a[1]==='delete')fs.rmSync(p.join(h,'.lima/_disks/myharness-d'),{recursive:true,force:true});
`,0o755);
  fs.mkdirSync(path.join(home,'.lima/myharness-vm'),{recursive:true});
  fs.mkdirSync(path.join(home,'.lima/_disks/myharness-d'),{recursive:true});
  put(path.join(home,'Library/Preferences/local.myharness.app.plist'),'owned preferences');
  put(path.join(home,'Library/Preferences/local.other.app.plist'),'decoy');
  put(path.join(home,'Library/Application Support/Other App/keep'),'decoy');
  const calls=path.join(root,'calls'),stream=path.join(root,'stream'); put(calls,'');put(stream,goodStream());
  const state=path.join(home,'.local/share/myharness-host-state');fs.mkdirSync(state,{recursive:true,mode:0o700});
  function receipt({created=0,inserted=0,phase='installed',disk='none'}={}) {
    const cfg=path.join(home,'.ssh/config'); const st=fs.existsSync(cfg)?fs.statSync(cfg):null;
    put(path.join(state,'record'),`version=1\nphase=${phase}\ndisk_phase=${disk}\nssh_created=${created}\nssh_inserted=${inserted}\nssh_inode=${st?st.dev+':'+st.ino:'0'}\nssh_hash=${st?crypto.createHash('sha256').update(fs.readFileSync(cfg)).digest('hex'):'none'}\nend=1\n`,0o600);
  }
  receipt();
  function host(args,extra={}) {
    return spawnSync('sh',[path.join(repo,'vm/myharness-host-step.sh'),...args],{env:{PATH:bin+':'+process.env.PATH,HOME:home,LANG:'C',TMPDIR:root,CALLS:calls,STREAM:stream,...extra},encoding:'utf8',timeout:20000});
  }
  function remove(args=[],extra={}) {
    // The older remover has no policy flags. Exercise its existing unattended
    // destructive path, not an unknown-flag error, when proving the regressions.
    const flags=modern?args:args.filter(a=>!['--save-first','--discard-data'].includes(a));
    return host(['--remove',...flags],extra);
  }
  return {root,home,state,calls,stream,receipt,remove,install:(args=[])=>host(args),cleanup:()=>fs.rmSync(root,{recursive:true,force:true})};
}
function check(name,fn) { test(name,async()=>{const f=fixture();try{await fn(f);}finally{f.cleanup();}}); }
const vm=f=>fs.existsSync(path.join(f.home,'.lima/myharness-vm'));
check('unattended --yes cannot silently choose discard',f=>{
  const r=f.remove(['--yes']);assert.notEqual(r.status,0,'an explicit save/discard choice must be required');assert.ok(vm(f),'data was deleted without a policy choice');
});
check('collection failure leaves VM, disk and SSH intact',f=>{
  put(path.join(f.home,'.ssh/myharness-ssh.conf'),'owned');
  const r=f.remove(['--save-first','--yes'],{COLLECT_FAIL:'1'});
  assert.ok(vm(f),'failed collection deleted the VM');assert.notEqual(r.status,0);assert.ok(fs.existsSync(path.join(f.home,'.ssh/myharness-ssh.conf')));
});
check('verified save is published before teardown and never removed by retry',f=>{
  put(path.join(f.home,'.local/share/myharness-lima.files'),'bin/lima\nbin/limactl\nbin\n');
  fs.symlinkSync('limactl',path.join(f.home,'.local/bin/lima'));
  put(path.join(f.home,'.lima/other-vm/keep'),'other instance');put(path.join(f.home,'.lima/_config/keep'),'shared');put(path.join(f.home,'Library/Caches/lima/keep'),'shared');
  const r=f.remove(['--save-first','--yes']);assert.equal(r.status,0,r.stdout+r.stderr);
  const parent=path.join(f.home,'myharness-removal-saves');assert.ok(fs.existsSync(parent),'conversations/source were not saved');
  const saves=fs.readdirSync(parent);assert.equal(saves.length,1);assert.ok(!saves[0].startsWith('.'));
  const saved=path.join(parent,saves[0]);assert.equal(fs.readFileSync(path.join(saved,'source/main.js'),'utf8'),'source changes\n');
  assert.equal(fs.statSync(saved).mode&0o777,0o700);assert.equal(fs.statSync(path.join(saved,'source/main.js')).mode&0o777,0o600);
  assert.ok(!fs.existsSync(path.join(f.home,'.local/bin/limactl')),'owned install manifest files were not removed');
  assert.ok(!fs.existsSync(path.join(f.home,'.local/bin/lima')),'owned archive symlink was not unlinked');
  assert.equal(fs.readFileSync(path.join(f.home,'.lima/other-vm/keep'),'utf8'),'other instance');assert.equal(fs.readFileSync(path.join(f.home,'.lima/_config/keep'),'utf8'),'shared');assert.equal(fs.readFileSync(path.join(f.home,'Library/Caches/lima/keep'),'utf8'),'shared');
  const retry=f.remove(['--discard-data','--yes']);assert.equal(retry.status,0,retry.stdout+retry.stderr);assert.ok(fs.existsSync(saved));
});
check('app refusal blocks teardown instead of deleting a running profile',f=>{
  const r=f.remove(['--discard-data','--yes'],{APP_FAIL:'1'});assert.ok(vm(f),'VM deleted despite failed owned-app quit');assert.notEqual(r.status,0);
});
check('exact preferences domain is removed, unrelated app data stays',f=>{
  const r=f.remove(['--discard-data','--yes']);assert.equal(r.status,0,r.stdout+r.stderr);
  assert.ok(!fs.existsSync(path.join(f.home,'Library/Preferences/local.myharness.app.plist')),'owned preferences left behind');
  assert.equal(fs.readFileSync(path.join(f.home,'Library/Preferences/local.other.app.plist'),'utf8'),'decoy');
  assert.equal(fs.readFileSync(path.join(f.home,'Library/Application Support/Other App/keep'),'utf8'),'decoy');
});
check('SSH restores created absence but preserves a pre-existing empty file',f=>{
  const cfg=path.join(f.home,'.ssh/config');put(cfg,include+'\n',0o600);f.receipt({created:1,inserted:1});
  let r=f.remove(['--discard-data','--yes']);assert.equal(r.status,0,r.stdout+r.stderr);assert.ok(!fs.existsSync(cfg),'newly created empty SSH config was left behind');
  fs.mkdirSync(path.join(f.home,'.lima/myharness-vm'),{recursive:true});put(cfg,include+'\n',0o600);f.receipt({inserted:1});
  r=f.remove(['--discard-data','--yes']);assert.equal(r.status,0,r.stdout+r.stderr);assert.ok(fs.existsSync(cfg));assert.equal(fs.readFileSync(cfg,'utf8'),'');
});
check('SSH tail bytes and a previously kept disk survive reruns',f=>{
  const cfg=path.join(f.home,'.ssh/config'),tail='# custom\nHost elsewhere\n  HostName example.invalid';put(cfg,include+'\n'+tail,0o600);f.receipt({created:1,inserted:1});
  let r=f.remove(['--discard-data','--keep-data-disk','--yes']);assert.equal(r.status,0,r.stdout+r.stderr);assert.equal(fs.readFileSync(cfg,'utf8'),tail);
  r=f.remove(['--discard-data','--yes']);assert.equal(r.status,0,r.stdout+r.stderr);assert.ok(fs.existsSync(path.join(f.home,'.lima/_disks/myharness-d')),'retry automatically deleted a previously kept disk');
});
for(const [name,stream] of [
  ['traversal frame',frame('../escape','bad')+'END 1\n'],
  ['corrupt checksum',frame('source/main.js','bad','0'.repeat(64))+'END 1\n'],
  ['missing end frame',goodStream().replace('END 4\n','')],
  ['trailing unverified frames',goodStream()+frame('source/extra.js','extra')+'END 4\n']
])check(`${name} refuses deletion`,f=>{put(f.stream,stream);const r=f.remove(['--save-first','--yes']);assert.ok(vm(f),'unverified collection allowed data deletion');assert.notEqual(r.status,0);});

// Exercise the real VM collector against disposable files and a real SQLite DB.
check('collector saves native conversations, source and consistent tasks, excluding credential locations and history',async f=>{
  if(!modern){f.remove(['--yes']);assert.ok(fs.existsSync(path.join(f.home,'myharness-removal-saves')),'no conversations/source/tasks collection was made');return;}
  const {collect}=await import(pathToFileURL(path.join(repo,'vm/myharness-removal-collect.mjs')));
  const home=path.join(f.root,'payload'),source=path.join(f.root,'source'),deployed=path.join(f.root,'deploy'),config=path.join(f.root,'native');
  const uid=process.getuid(),id='11111111-1111-4111-8111-111111111111';
  const native=path.join(config,'projects/project',id+'.jsonl');put(native,'native conversation with arbitrary pasted password\n');
  put(path.join(home,'bots/helper/sessions',id+'.json'),JSON.stringify({id,file:native,last_turn:'2026-01-01T00:00:00Z'}));
  put(path.join(config,'projects/project',id,'subagents/owned.jsonl'),'associated native artifact');
  put(path.join(home,'bots/helper/sessions',id,'work/scratch'),'scratch');
  const archivedId='22222222-2222-4222-8222-222222222222', original=path.join(config,'projects/project',archivedId+'.jsonl');
  const archiveTo='session-archive/2026-01-01/@outside'+original;
  put(path.join(home,archiveTo),'archived external conversation');
  const archivedMeta='session-archive/2026-01-01/bots/helper/sessions/'+archivedId+'.json';
  put(path.join(home,archivedMeta),JSON.stringify({id:archivedId,file:original,last_turn:'2026-01-01T00:00:00Z'}));
  put(path.join(home,'session-archive/2026-01-01/@sessions/helper--'+archivedId+'.json'),JSON.stringify({bot:'helper',id:archivedId,moved:[{from:'bots/helper/sessions/'+archivedId+'.json',to:archivedMeta},{from:original,to:archiveTo}]}));
  put(path.join(home,'secrets/DO-NOT-OPEN'),'excluded');fs.chmodSync(path.join(home,'secrets'),0);
  put(path.join(source,'main.js'),'uncommitted source');put(path.join(source,'.env'),'excluded');put(path.join(source,'.config/gh/hosts.yml'),'excluded');put(path.join(source,'.git/config'),'excluded');put(path.join(deployed,'main.js'),'deployed source');
  fs.mkdirSync(path.join(home,'tasks'),{recursive:true});const db=path.join(home,'tasks/factory.db');const sql=spawnSync('sqlite3',[db,'CREATE TABLE tasks(id TEXT); INSERT INTO tasks VALUES (\'saved-task\');'],{encoding:'utf8'});assert.equal(sql.status,0,sql.stderr);
  const chunks=[];try{await collect({home,source,deployed,config,uid,deployedUid:uid},{write:b=>{chunks.push(String(b));return true;}});}finally{fs.chmodSync(path.join(home,'secrets'),0o700);}
  const stream=chunks.join('');assert.ok(stream.includes(Buffer.from('native/helper/'+id+'/'+id+'.jsonl').toString('hex')),'external native conversation missing');
  assert.ok(stream.includes(Buffer.from('home/tasks/factory.db').toString('hex')));assert.ok(stream.includes(Buffer.from('source/main.js').toString('hex')));
  const decoded=[];const lines=stream.split('\n');for(let i=0;i<lines.length;i++){if(!lines[i].startsWith('F '))continue;const name=Buffer.from(lines[i].split(' ')[1],'hex').toString();let data='';while(lines[++i]!=='.')data+=lines[i];decoded.push([name,Buffer.from(data,'base64')]);}
  const names=decoded.map(x=>x[0]);assert.ok(!names.some(n=>n.includes('secrets/')||n.includes('/.git/')||n.includes('/.env')||n.includes('/work/')||n.includes('/.config/gh/')));
  assert.ok(decoded.some(x=>x[0].startsWith('native/archive/')&&x[1].toString()==='archived external conversation'),'tidied external native transcript missing');
  assert.ok(decoded.find(x=>x[0].endsWith(id+'.jsonl'))[1].includes(Buffer.from('arbitrary pasted password')),'content scan/redaction altered conversation');
  const savedDb=path.join(f.root,'saved.db');fs.writeFileSync(savedDb,decoded.find(x=>x[0]==='home/tasks/factory.db')[1]);assert.equal(spawnSync('sqlite3',[savedDb,'PRAGMA integrity_check; SELECT id FROM tasks;'],{encoding:'utf8'}).stdout,'ok\nsaved-task\n');
});
check('missing required native transcript blocks a successful collection',async f=>{
  if(!modern){f.remove(['--yes']);assert.ok(vm(f),'missing native history did not stop data deletion');return;}
  const {collect}=await import(pathToFileURL(path.join(repo,'vm/myharness-removal-collect.mjs')));const home=path.join(f.root,'payload'),id='11111111-1111-4111-8111-111111111111';
  put(path.join(home,'bots/helper/sessions',id+'.json'),JSON.stringify({id,file:path.join(f.root,'native/projects/p',id+'.jsonl'),last_turn:'2026-01-01T00:00:00Z'}));
  await assert.rejects(collect({home,source:path.join(f.root,'absent-src'),deployed:path.join(f.root,'absent-deploy'),config:path.join(f.root,'native'),uid:process.getuid(),deployedUid:process.getuid()},{write:()=>true}));
});

check('idle check rejects running, terminal-held and queued work before service stop',async f=>{
  if(!modern){f.remove(['--yes']);assert.ok(vm(f),'busy work did not refuse removal');return;}
  const {checkIdle}=await import(pathToFileURL(path.join(repo,'vm/myharness-removal-collect.mjs')));
  const id='11111111-1111-4111-8111-111111111111';
  for(const reason of ['running','attached','queued']){
    let stopped=false;
    const api=async route=>route==='/bots'?{bots:[{id:'helper',live:[{session:id,running:reason==='running'}]}]}:route.endsWith('/sessions')?{sessions:[{id}]}:{attached:reason==='attached',outbound:reason==='queued'?[{state:'queued'}]:[],incoming:[]};
    await assert.rejects(async()=>{await checkIdle(api);stopped=true;},/busy:/);
    assert.equal(stopped,false,reason+' must refuse before stopping');
  }
  const details=await checkIdle(async route=>route==='/bots'?{bots:[{id:'helper',live:[]}]}:route.endsWith('/sessions')?{sessions:[{id}]}:{attached:false,outbound:[],incoming:[]});
  assert.equal(details.length,1);
});

function failBeforeVM(f) {
  fs.rmSync(path.join(f.home,'.lima'),{recursive:true,force:true});
  fs.rmSync(path.join(f.home,'.local/bin/limactl'));
  fs.rmSync(path.join(f.state,'record'));
  const r=f.install(['--prevent-sleep','no']);
  assert.notEqual(r.status,0,'offline install must fail');
  assert.match(fs.readFileSync(f.calls,'utf8'),/download-attempt/,'failure must occur at the download, not an earlier fixture prerequisite');
  assert.ok(fs.existsSync(path.join(f.state,'record')),'the failed install must leave its phase record');
}
check('pre-VM download failure permits a later install retry',f=>{
  failBeforeVM(f);
  const r=f.install(['--prevent-sleep','no']);
  assert.notEqual(r.status,0,'the retry is still offline');
  assert.equal(fs.readFileSync(f.calls,'utf8').split('download-attempt').length-1,2,'record from failed install prevented retrying the download');
  assert.doesNotMatch(r.stderr,/operation is incomplete/);
});
check('pre-VM download failure permits removal without manually deleting its record',f=>{
  failBeforeVM(f);
  const r=f.remove(['--save-first','--yes']);
  assert.equal(r.status,0,'no VM/data ever existed, so failed-install cleanup should finish: '+r.stdout+r.stderr);
  assert.match(fs.readFileSync(path.join(f.state,'record'),'utf8'),/phase=complete/);
});
check('home build/tmp/dist definitions are saved while source rebuildable outputs are excluded',async f=>{
  const {collect}=await import(pathToFileURL(path.join(repo,'vm/myharness-removal-collect.mjs')));
  const home=path.join(f.root,'payload'),source=path.join(f.root,'source'),deployed=path.join(f.root,'deployed');
  const names=['bots/helper/skills/build/SKILL.md','bots/helper/memory/tmp/notes.md','bots/helper/notes/dist/notes.md','bots/helper/notes/coverage/note.md','bots/helper/notes/.cache/note.md','bots/helper/notes/node_modules/note.md'];
  for(const name of names)put(path.join(home,name),'user-authored '+name);
  put(path.join(home,'secrets/auth.json'),'excluded');put(path.join(home,'bots/helper/auth.json'),'excluded');
  put(path.join(source,'main.js'),'source');put(path.join(deployed,'main.js'),'deployed source');
  for(const root of [source,deployed])for(const name of ['build/output.js','dist/output.js','tmp/output.js','node_modules/package/index.js'])put(path.join(root,name),'rebuildable output');
  const chunks=[];await collect({home,source,deployed,config:path.join(f.root,'native'),uid:process.getuid(),deployedUid:process.getuid()},{write:b=>{chunks.push(String(b));return true;}});
  const saved=chunks.join('').split('\n').filter(line=>line.startsWith('F ')).map(line=>Buffer.from(line.split(' ')[1],'hex').toString());
  for(const name of names)assert.ok(saved.includes('home/'+name),'user-authored home file omitted from verified save: '+name);
  assert.ok(!saved.some(name=>name.startsWith('home/secrets/')||name.endsWith('/auth.json')),'credential exclusions must remain');
  assert.ok(saved.includes('source/main.js')&&saved.includes('deployed-source/main.js'));
  assert.ok(!saved.some(name=>/^(?:source|deployed-source)\/(?:build|dist|tmp|node_modules)\//.test(name)),'source rebuildable outputs must still be excluded');
});
