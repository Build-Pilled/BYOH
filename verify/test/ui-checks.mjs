#!/usr/bin/env node
// Deliberately good and bad miniature builds: appearance-check proof, not conformance cases.
// node verify/test/ui-checks.mjs --evidence /absolute/new-dir --electron /path/to/pinned/electron
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { connect } from '../driver.mjs';
import { checkUI } from '../ui-checks.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const arg=k=>process.argv[process.argv.indexOf(k)+1];
assert.ok(process.argv.includes('--evidence')&&process.argv.includes('--electron'),'need --evidence and --electron');
const out=resolve(arg('--evidence'));mkdirSync(out);const home=join(out,'home');mkdirSync(home);
const electron=resolve(arg('--electron')),pins=JSON.parse(readFileSync(join(root,'verify/pins.json')));
assert.equal(process.versions.node,pins.node,'run with pinned Node');assert.equal(readFileSync(join(dirname(electron),'version'),'utf8').trim(),pins.electron,'pinned Electron');
const children=[];let server,w;
const stop=()=>{for(const child of children)try{process.kill(-child.pid,'SIGTERM');}catch{}};
process.on('exit',stop);for(const sig of ['SIGINT','SIGTERM'])process.on(sig,()=>{stop();process.exit(128+(sig==='SIGINT'?2:15));});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const own=(cmd,args,extra={})=>{const child=spawn(cmd,args,{detached:true,stdio:['ignore','pipe','pipe','pipe'],env:{PATH:process.env.PATH,HOME:home,XDG_CONFIG_HOME:join(home,'config'),XDG_CACHE_HOME:join(home,'cache'),...extra}});children.push(child);child.stderr.on('data',d=>writeFileSync(join(out,basename(cmd)+'.log'),d,{flag:'a'}));return child;};
try {
  const packs=Object.fromEntries(['instrument','lab'].map(look=>[look,JSON.parse(readFileSync(join(root,`ui-specifications/look/${look}/tokens.json`)))]));
  const patterns=[];let state=82731;const random=()=>{state^=state<<13;state^=state>>>17;state^=state<<5;return state>>>0;};
  while(patterns.length<200){const pattern=Array.from({length:36},()=>!!(random()&1));if(patterns.every(p=>p.filter((v,i)=>v!==pattern[i]).length>=10))patterns.push(pattern);}
  const html=`<!doctype html><meta charset="utf-8"><title>UI proof</title><style>
  @font-face{font-family:Literata;src:url(/fonts/literata-latin.woff2)}
  @font-face{font-family:Inter;src:url(/fonts/inter-latin.woff2)}
  *{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;background:var(--display);color:var(--text);font-size:20px;line-height:30px}
  main{position:absolute;left:64px;top:64px;width:600px;height:320px;background:var(--display);color:var(--text);font-family:var(--font-body)}
  main{isolation:isolate}main[data-alternate]{background:var(--surface-card);background-image:linear-gradient(var(--surface-card),var(--chassis))}main[data-alternate]::before{content:'';position:absolute;inset:0;z-index:-1;background:var(--menu-glass);backdrop-filter:blur(18px)}
  p{margin:0}#panel{position:absolute;inset:0;background:#000;color:#fff}#panel[hidden],main[hidden],#tile[hidden]{display:none}
  input,button{width:160px;height:40px}#tile{position:absolute;left:100px;top:100px;width:88px;height:88px;background:var(--mark-ground)}
  [data-ui-check-cell]{position:absolute;width:calc(100% / 6);height:calc(100% / 6)}[data-ui-check-cell] span{position:absolute;inset:5%;background:var(--mark-1)}
  </style><style id="look-layer"></style><main aria-label="Proof page"><p>Ready to build.</p><svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"></svg></main><div id="tile" role="img" aria-label="Bot mark" hidden></div>
  <form id="panel" hidden><label>Look<input aria-label="Look" value="instrument"></label><label>Seed<input aria-label="Seed" value="0"></label><label>View<input aria-label="View" value="page"></label><label>Fault<input aria-label="Fault" value="none"></label><button>Apply</button></form>
  <script>const packs=${JSON.stringify(packs)},patterns=${JSON.stringify(patterns)};let look='instrument',seed=0,view='page',fault='none';
  const panel=document.querySelector('#panel'),main=document.querySelector('main'),tile=document.querySelector('#tile');
  function paint(){document.querySelector('#look-layer').textContent=':root { --display: #14171c; --text: #e3e7ed; --font-body: Inter; }'+(fault==='all'?' main { padding: 9px; }':'');const mode=matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';if(fault==='all'&&look==='lab')document.querySelector('#look-layer').textContent+=' main::before { content: ""; position: absolute; right: 0; top: 0; width: 4px; height: 4px; background: '+packs.instrument.tokens.accent[mode]+'; }';for(const [k,v]of Object.entries(packs[look].tokens))document.documentElement.style.setProperty('--'+k,v[mode]);document.documentElement.style.setProperty('--font-body',look==='instrument'?'Literata':'Inter');
  main.querySelector('svg').innerHTML=look==='lab'?'<circle cx="8" cy="12" r="3"/><circle cx="16" cy="12" r="3"/>':'<circle cx="12" cy="12" r="6"/>';main.toggleAttribute('data-alternate',look==='lab'&&view!=='wrapper');main.hidden=!['page','wrapper'].includes(view);tile.hidden=view!=='mark';main.style.left=fault==='all'&&look==='lab'?'70px':'64px';main.style.color=fault==='all'&&look==='lab'?'rgb(90,90,90)':'';main.style.outline=fault==='all'&&look==='lab'?'3px solid '+packs.instrument.tokens.accent[mode]:'';
  if(view==='wrapper'){main.style.background=packs.instrument.tokens['person-bubble'][mode];main.style.color=fault==='wrong-ink'?(mode==='dark'?'#cdcdcd':'color(srgb 0.17 0.17 0.17)'):packs.instrument.tokens['faint-wrapper'][mode];}else main.style.background='';
  tile.replaceChildren();patterns[fault==='all'?0:seed].forEach((ink,i)=>{const cell=document.createElement('div');cell.setAttribute('data-ui-check-cell','');cell.style.left=(i%6)*100/6+'%';cell.style.top=Math.floor(i/6)*100/6+'%';if(ink)cell.append(document.createElement('span'));tile.append(cell);});}
  addEventListener('keydown',e=>{if(e.ctrlKey&&e.shiftKey&&e.key.toLowerCase()==='l'){e.preventDefault();panel.hidden=false;}});
  panel.addEventListener('submit',e=>{e.preventDefault();look=panel.elements[0].value;seed=Number(panel.elements[1].value);view=panel.elements[2].value;fault=panel.elements[3].value;panel.hidden=true;document.activeElement.blur();paint();});matchMedia('(prefers-color-scheme: light)').addEventListener('change',paint);paint();</script>`;
  server=createServer((req,res)=>{if(req.url.startsWith('/fonts/')){res.setHeader('content-type','font/woff2');res.end(readFileSync(join(root,'ui-specifications/choice/fonts',basename(req.url))));}else {res.setHeader('content-type','text/html');res.end(html);}});
  await new Promise(ok=>server.listen(0,'127.0.0.1',ok));const url=`http://127.0.0.1:${server.address().port}`;
  const xvfb=own('Xvfb',['-screen','0','1400x1100x24','-nolisten','tcp','-displayfd','3']);
  const display=await new Promise((ok,no)=>{xvfb.stdio[3].once('data',d=>ok(':'+d.toString().trim()));xvfb.once('error',no);});
  const app=join(out,'app.cjs'),profile=join(out,'profile');mkdirSync(profile);
  writeFileSync(app,`const {app,BrowserWindow}=require('electron');app.whenReady().then(()=>{const w=new BrowserWindow({width:1280,height:795,webPreferences:{sandbox:true}});w.loadURL(${JSON.stringify(url)});});`);
  own(electron,['--no-sandbox','--disable-dev-shm-usage','--remote-debugging-address=127.0.0.1','--remote-debugging-port=0',`--user-data-dir=${profile}`,app],{DISPLAY:display});
  const active=join(profile,'DevToolsActivePort');for(let i=0;i<150&&!existsSync(active);i++)await sleep(100);assert.ok(existsSync(active),'Electron CDP started');
  w=await connect({port:Number(readFileSync(active,'utf8').split('\n')[0]),urlPrefix:url});
  async function stage(w,{look,seed=0,view='page',fault='none'}) {await w.key('Ctrl+Shift+L');for(const [name,value] of Object.entries({Look:look,Seed:String(seed),View:view,Fault:fault}))await w.fill('textbox',name,value);await w.click('button','Apply');await w.ready();}
  await w.viewport();await w.scheme('dark');await stage(w,{look:'instrument'});
  const reference=join(out,'F00-fixture.png');await w.shot(reference);
  const roles={display:{class:'fixed',variants:[{rect:{x:64,y:64,width:600,height:320},fontSize:'20px',lineHeight:'30px',frames:['F00']}]}};
  const paint={display:{family:'Literata',color:['{text}'],background:['{display}']}};
  const css=join(out,'good.css');writeFileSync(css,':root { --display: #14171c; --text: #e3e7ed; --font-body: Inter; --presentation-status-shape: ring; }\n');
  const badCSS=join(out,'bad.css');writeFileSync(badCSS,readFileSync(css,'utf8')+'\nmain { padding: 9px; }\n');
  // The failing build has wrong padding in its shipped layer, changed geometry, wrong paint/contrast and duplicate marks.
  for(const fault of ['none','all']) {
    const plan={tokens:join(root,'ui-specifications/look/lab/tokens.json'),stylesheets:[fault==='all'?badCSS:css],reference:{layout:{roles},roles:paint},variations:[{page:'proof',kind:'hover'}],pages:[{id:'proof',frame:reference,nodes:[{layout:'display',role:'main',name:'Proof page'}],stage:(w,o)=>stage(w,{...o,fault})}],mark:async(w,o)=>{await stage(w,{...o,fault,view:'mark'});return {role:'image',name:'Bot mark',cells:'[data-ui-check-cell]'};}};
    const result=await checkUI(w,plan,{sample:true,evidence:join(out,fault==='none'?'correct':'wrong')});
    console.log(`${fault==='none'?'correct':'wrong'}: pass=${result.pass}, complete=${result.complete}`);
    for(const check of ['C1','C2','C3','C4','C5']) {
      const rows=result.results.filter(r=>r.check===check);const ok=rows.every(r=>r.pass);console.log(`${fault==='none'?'PASS':'FAIL expected'} ${check}: ${rows.filter(r=>r.pass).length}/${rows.length} assertions pass`);
      assert.ok(rows.length);assert.equal(ok,fault==='none',`${check}: ${JSON.stringify(rows.filter(r=>!r.pass))}`);
    }
    assert.ok(result.results.filter(r=>r.check==='C5').every(r=>r.measure==='200-seed mark distinctness and geometry'),'C5 must check marks only');
    if(fault==='none') {
      assert.ok(result.results.some(r=>r.check==='C4'&&r.measure==='rendered contrast'&&r.pass),'gradient/frosted effective-background contrast must pass');
      const capture=JSON.parse(readFileSync(join(out,'correct','00-dark-lab.json')));
      assert.ok(capture.data.texts.some(t=>t.backgroundCapture),'gradient/frosted contrast must use captured background pixels');
    }
    assert.equal(result.pass,fault==='none');assert.equal(result.complete,false,'a sample never completes setup');
  }
  // One regression case: the exact sent-wrapper exception is bound to look, role,
  // mapping name, mode and colour pair; it never licenses other faint text.
  for(const [name,look,mappedRole,exception,fault,expected] of [
    ['exact-wrapper','instrument','annotationWrapper','Sent annotation wrapper','none',true],
    ['wrong-surface','instrument','display','Sent annotation wrapper','none',false],
    ['unnamed-wrapper','instrument','annotationWrapper',undefined,'none',false],
    ['wrong-ink','instrument','annotationWrapper','Sent annotation wrapper','wrong-ink',false],
    ['other-look','lab','annotationWrapper','Sent annotation wrapper','none',false],
  ]) {
    const wrapperPaint={family:'Literata',color:['{faint-wrapper}'],background:['{person-bubble}']};
    const plan={tokens:join(root,`ui-specifications/look/${look}/tokens.json`),stylesheets:[css],
      reference:{layout:{roles:{annotationWrapper:roles.display,display:roles.display}},roles:{annotationWrapper:wrapperPaint,display:wrapperPaint}},
      pages:[{id:name,frame:reference,nodes:[{layout:mappedRole,role:'main',name:'Proof page',exception}],stage:(w,o)=>stage(w,{...o,view:'wrapper',fault})}],
      mark:async()=>{throw new Error('marks already proved above; this case isolates wrapper contrast');}};
    const result=await checkUI(w,plan,{sample:true,evidence:join(out,name)});
    const rendered=result.results.filter(r=>r.check==='C4'&&r.measure==='rendered contrast');
    assert.equal(rendered.length,2,'both modes must be measured');
    for(const row of rendered)assert.equal(row.pass,expected,`${name} ${row.mode}: wrapper contrast ${row.error??''}`);
    if(expected)for(const mode of ['dark','light']) {
      const reads=JSON.parse(readFileSync(join(out,name,`00-${mode}-c4-rendered.json`)));
      assert.ok(reads.length&&reads.every(r=>r.exception==='Sent annotation wrapper'&&r.minimum===3&&r.ratio<3),'exact low-contrast pair must use only the named faint exception');
    }
  }
  console.log('PASS sent annotation wrapper: exact pair in both modes only; wrong surface/name/ink/look rejected');
  console.log('PASS good build and assertion-level rejection for each of C1–C5; report.md and raw PNG/JSON retained');
} finally {
  w?.close();server?.closeAllConnections();server?.close();stop();
  for(const child of children)await new Promise(ok=>{if(child.exitCode!==null||child.signalCode)ok();else child.once('exit',ok);});
}
