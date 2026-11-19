(function(){
var LOOKS=window.LOOKS, ORDER=LOOKS.order, CO=LOOKS.callouts;
var $=function(s,r){return (r||document).querySelector(s)}, $$=function(s,r){return [].slice.call((r||document).querySelectorAll(s))};
var state={look:'instrument',mode:'system',motion:'still',chosen:'instrument'};
var q=new URLSearchParams(location.search);
if(q.get('look')&&LOOKS[q.get('look')])state.look=q.get('look');
if(['system','dark','light'].includes(q.get('mode')))state.mode=q.get('mode'); if(['still','motion'].includes(q.get('motion')))state.motion=q.get('motion');
if(q.get('stage')==='1')document.body.classList.add('stage-only');
var mqDark=matchMedia('(prefers-color-scheme: dark)'), mqRM=matchMedia('(prefers-reduced-motion: reduce)');
function resolved(){return state.mode==='system'?(mqDark.matches?'dark':'light'):state.mode}

/* ---------- CSS from tokens ---------- */
function kebab(k){return k.replace(/[A-Z]/g,function(c){return '-'+c.toLowerCase()})}
(function(){var css='';ORDER.forEach(function(k){['dark','light'].forEach(function(m){var t=LOOKS[k][m],v=[];
 Object.keys(t).forEach(function(n){var x=t[n];if(n==='mk')return;if(CO.indexOf(n)>=0){v.push('--co-'+n+'-bar:'+x[0],'--co-'+n+'-bg:'+x[1],'--co-'+n+'-ink:'+x[2]);return}
  if(['working','waiting','unread','attention'].indexOf(n)>=0){v.push('--st-'+n+':'+x);return}
  v.push('--'+kebab(n)+':'+x)});
 css+='[data-look="'+k+'"][data-mode="'+m+'"]{'+v.join(';')+';color-scheme:'+m+'}\n'})});
 var s=document.createElement('style');s.id='tokens';s.textContent=css;document.head.appendChild(s)})();

/* ---------- marks ---------- */
var GRIDS=[['cc....','cc.yy.','cc.yy.','ccrrr.','..rrp.','..rrp.'],
           ['..pp..','..ppyy','aaayyy','aaa...','sss.bb','sss.bb'],
           ['llllll','ll..ll','..gg..','..gg..','.sgg..','.ss...'],
           ['pp.cc.','pp.cc.','..aa..','yy.aa.','yy..bb','....bb']];
var KEY={p:0,c:1,y:2,r:3,g:4,a:5,s:6,l:7,b:8};
var BOTS=['Firstmate','Bot Maker','Code Reviewer','Plain'];
function mark(i,look,mode,px,working){
 var L=LOOKS[look],t=L[mode],m=L.marks,g=GRIDS[i],cell=m.size-m.gap,pad=m.gap/2,out='';
 out+='<rect x="0" y="0" width="32" height="32" rx="'+m.tileR+'" fill="'+t.mkTile+'"/>';
 if(t.mkRim&&t.mkRim.indexOf('rgba(0,0,0,0)')<0)out+='<rect x=".5" y=".5" width="31" height="31" rx="'+(m.tileR-.5)+'" fill="none" stroke="'+t.mkRim+'" stroke-width="1"/>';
 g.forEach(function(row,r){row.split('').forEach(function(ch,c){if(ch==='.')return;
  var fill=m.ink==='single'?t.mkInk:t.mk[KEY[ch]];
  out+='<rect x="'+(4+c*4+pad)+'" y="'+(4+r*4+pad)+'" width="'+cell+'" height="'+cell+'" rx="'+m.cellR+'" fill="'+fill+'"'+(m.crisp?' shape-rendering="crispEdges"':'')+'/>'})});
 return '<svg viewBox="0 0 32 32" width="'+px+'" height="'+px+'" aria-hidden="true" focusable="false">'+out+'</svg>'}

/* ---------- stage ---------- */
var IC={
 search:'<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.2-4.2"/>',pulse:'<path d="M3 12h4l2.5-6 4 12 2.5-6H21"/>',swap:'<path d="M4 8h15m-4-4l4 4-4 4M20 16H5m4-4l-4 4 4 4"/>',plus:'<path d="M12 5v14M5 12h14"/>',
 down:'<path d="M12 4v11m-5-4l5 5 5-5M5 20h14"/>',chev:'<path d="M6 9l6 6 6-6"/>',chevr:'<path d="M9 6l6 6-6 6"/>',crown:'<path d="M4 17l-1-9 5 4 4-7 4 7 5-4-1 9z"/>',
 doc:'<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4M10 12h5M10 16h5"/>',gear:'<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/>',
 copy:'<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M15 9V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7a2 2 0 002 2h3"/>',fork:'<path d="M7 4v8a4 4 0 004 4h6m-3-3l3 3-3 3M7 4v0"/>',
 wrench:'<path d="M14.5 6.5a4 4 0 005 5l-9.5 9.5a2.1 2.1 0 01-3-3z"/>',clip:'<path d="M20 11l-8.5 8.5a5 5 0 01-7-7L13 4a3.3 3.3 0 014.7 4.7L9.5 17a1.7 1.7 0 01-2.4-2.4L14 7.7"/>',up:'<path d="M12 19V6m-6 6l6-6 6 6"/>'};
function ic(n,c){return '<svg class="i '+(c||'')+'" viewBox="0 0 24 24" aria-hidden="true">'+IC[n]+'</svg>'}
var SLOT_ROWS=[ // name, preview, state, status word, top, height, selected
 {n:'Firstmate',p:'The plan is ready.',s:'unread',w:'Unread',t:124,h:75,sel:1,lead:1,chev:'chev'},
 {n:'Bot Maker',p:'Needs your OK.',s:'attention',w:'Attention',t:261,h:56,chev:'chevr'},
 {n:'Code Reviewer',p:'Review is ready.',s:'waiting',w:'Waiting',t:317,h:56,chev:'chevr'},
 {n:'Plain',p:'Drafting outline.',s:'working',w:'Working',t:412,h:56,chev:'chevr'}];
var CALL=[['note','Note','Sharing stays out of this version, as you decided last week.'],
 ['tip','Tip','Back up the reading list first. The export takes about ten seconds.'],
 ['important','Important','Publish today? I recommend yes: dark mode only affects colours.'],
 ['warning','Warning','The list syncs once an hour, so new books can show up late.'],
 ['caution','Caution','Publishing swaps the test database for an empty one. The 30 test books will be deleted.']];
function buildStage(){
 var h='';
 h+='<aside class="side a" aria-label="Sidebar"><div class="band a" aria-hidden="true"></div>'+
 '<button class="ibtn btn a live" style="left:216px;top:8px" aria-label="Recent activity">'+ic('pulse')+'</button>'+
 '<button class="ibtn btn a" style="left:250px;top:8px" aria-label="Active sessions">'+ic('swap')+'</button>'+
 '<button class="ibtn btn a" style="left:284px;top:8px" aria-label="New">'+ic('plus')+'</button>'+
 '<div class="field a">'+ic('search')+'<span>Search</span></div>'+
 '<div class="head a lbl" style="top:98px">Crew '+ic('chev')+'</div>';
 SLOT_ROWS.forEach(function(r,i){
  h+='<div class="brow hov a'+(r.sel?' sel':'')+'" style="top:'+r.t+'px;height:'+r.h+'px" role="button" aria-label="'+r.n+', '+r.w+'">'+ic(r.chev,'chev')+
  '<span class="mkslot'+(r.s==='working'?' working':'')+'" data-bot="'+i+'" style="top:'+(r.lead?21:12)+'px"></span>'+
  '<span class="name clip" style="top:'+(r.lead?10:9)+'px">'+r.n+'</span>'+
  (r.lead?'<span class="leadb">'+ic('crown')+'Lead</span>':'')+
  '<span class="prev clip" style="top:'+(r.lead?49:30)+'px">'+r.p+'</span>'+
  '<span class="age data" style="top:'+(r.lead?10:9)+'px">Now</span>'+
  '<span class="stat" style="top:'+(r.h-26)+'px"><span class="w">'+r.w+'</span><span class="light '+r.s+'" style="--c:var(--st-'+r.s+')"></span></span></div>';
  if(i===0){h+='<div class="sess hov a" aria-label="Session: Ready to publish"><span class="t clip">Ready to publish</span><span class="data">Now</span></div><div class="more a">Show all 3 sessions</div>'}
  if(i===2){h+='<div class="head a lbl" style="top:386px">Bots '+ic('chev')+'</div><div class="a lbl" style="left:280px;top:386px;width:20px;color:var(--muted)">'+ic('plus')+'</div>'}
 });
 h+='<div class="head a lbl" style="top:481px">Bot threads '+ic('chevr')+'</div>'+
 '<div class="head a lbl" style="top:556px">Tools '+ic('chev')+'</div><div class="a" style="left:276px;top:552px;width:24px;height:24px;color:var(--muted)">'+ic('wrench')+'</div>';
 ['Team map','Tasks','Routines','Skills &amp; MCP','Changes'].forEach(function(n,i){h+='<div class="tool hov a" style="top:'+(584+i*33)+'px">'+n+'</div>'});
 h+='<div class="tool hov a" style="top:752px">'+ic('gear')+'Settings</div></aside>';
 h+='<header class="hdr a"><span class="mkslot" data-bot="0"></span><span class="nm a clip">Firstmate</span>'+
 '<span class="lead a"><span class="leadb">'+ic('crown')+'Lead</span></span>'+
 '<button class="pillb btn a" style="left:472px;top:10px;width:28px;padding:0" aria-label="Save conversation">'+ic('down')+'</button>'+
 '<button class="pillb btn a" style="left:508px;top:10px;width:150px">All sessions <span class="mut">3</span> '+ic('chev')+'</button>'+
 '<button class="pillb btn a" style="left:667px;top:10px;width:196px">Opus 5.5 <span class="tag">API</span><span class="mut">· high</span> '+ic('chev')+'</button>'+
 '<button class="pillb btn a" style="left:872px;top:10px;width:28px;padding:0" aria-label="Prompt">'+ic('doc')+'</button>'+
 '<button class="pillb btn a" style="left:911px;top:10px;width:28px;padding:0" aria-label="Settings">'+ic('gear')+'</button></header>';
 h+='<main><div class="person a">Is the reading list ready to publish?</div>'+
 '<div class="ts data a" style="left:1000px;top:121px;width:260px">'+ic('copy')+'11:32 AM</div>'+
 '<article class="card a arrive" aria-label="Firstmate reply"><p class="intro">Almost. Code Reviewer passed the last change and all 48 tests pass.</p>';
 CALL.forEach(function(c,i){h+='<div class="co '+c[0]+'" role="note" style="top:'+(42+i*78)+'px"><div class="lbl">'+c[1]+'</div><div class="bd">'+c[2]+'</div></div>'});
 h+='</article><div class="meta data a">'+ic('copy')+ic('fork')+'<span>11:32 AM</span><span>OPUS 5.5</span><span>6.2k</span></div></main>';
 h+='<footer class="comp a"><span class="clipb">'+ic('clip')+'</span><span class="clip2"><span class="caret"></span>Publish today, and keep the 30 test books.</span><span class="queue">Queue</span>'+
 '<button class="send btn" aria-label="Send">'+ic('up')+'</button></footer>';
 var st=$('#stage');st.innerHTML=h;
}
function paintMarks(){var look=state.look,mode=resolved();
 $$('#stage .mkslot').forEach(function(s){s.innerHTML=mark(+s.getAttribute('data-bot'),look,mode,32)})}
function applyStage(){var st=$('#stage'),mode=resolved();
 st.setAttribute('data-look',state.look);st.setAttribute('data-mode',mode);st.setAttribute('data-motion',state.motion==='motion'&&!mqRM.matches?'on':'still');
 st.dataset.arrival='off';st.dataset.markAnimation=window.LOOK_SETS[ORDER.indexOf(state.look)].markStyle.working;paintMarks();fit();
 [].forEach.call($$('#looks button'),function(b){b.setAttribute('aria-pressed',b.dataset.look===state.look)});
 [].forEach.call($$('#mode button'),function(b){b.setAttribute('aria-pressed',b.dataset.mode===state.mode)});
 [].forEach.call($$('#motion button'),function(b){b.setAttribute('aria-pressed',b.dataset.motion===state.motion)});
 $('#cur').textContent=LOOKS[state.look].name;$('#fullsize').href=new URL('index.html?stage=1&look='+state.look+'&mode='+state.mode+'&motion='+state.motion,document.querySelector('script[type=module]').src).href;
 $$('.row').forEach(function(r){var on=state.motion==='motion'&&!mqRM.matches;r.setAttribute('data-motion',on?'on':'still')});
 renderRowsMode()}
function fit(){var w=$('.stagewrap'),avail=w.clientWidth,s=Math.min(1,avail/1280),st=$('#stage');
 st.style.transform=s<1?'scale('+s+')':'none';w.style.height=(795*s+2)+'px'}

/* ---------- rows ---------- */
var PAL=['display','chassis','surface','text','muted','accent','working','waiting','unread','attention','important','caution'];
function swatches(k,m){var t=LOOKS[k][m];return PAL.map(function(n){var v=(CO.indexOf(n)>=0)?t[n][0]:t[n];return '<i style="background:'+v+'" title="'+n+' '+v+'"></i>'}).join('')}
function rowHTML(k){var L=LOOKS[k],mode=resolved(),marks='';
 BOTS.forEach(function(b,i){marks+='<figure>'+mark(i,k,mode,64)+b+'</figure>'});
 var gallery=new URL('../../screenshots/',document.querySelector('script[type=module]').src).href;
 var shots=k==='instrument'?'<div class="shots"><figure><img src="'+gallery+'hero.png" alt="Instrument, dark: Firstmate with a reply and callouts"><figcaption>Instrument, dark. <a href="'+gallery+'hero.png">Open full size</a></figcaption></figure>'+
  '<figure><img src="'+gallery+'main-chat-light.png" alt="Instrument, light: the same conversation"><figcaption>Instrument, light. <a href="'+gallery+'main-chat-light.png">Open full size</a></figcaption></figure></div>':'';
 var motionLine={instrument:'None.',lab:'Functional only: a 100ms hover and a press.',dusk:'Marks breathe only while their bot is working and rest when idle; 180ms ease-out, nothing under 0.95 scale.',paper:'Almost none: things appear.'}[k];
 return '<section class="row" data-look="'+k+'" data-mode="'+mode+'" data-chosen="'+(state.chosen===k)+'" data-motion="still" aria-label="'+L.name+'">'+
 '<input type="radio" name="look" aria-label="'+L.name+'"'+(state.chosen===k?' checked':'')+' value="'+k+'" style="margin-top:6px">'+
 '<div><h2>'+L.name+'</h2><div class="ch">'+L.character+'</div><div class="tags">'+L.tags+'</div>'+
 '<div class="pal"><span class="grp">Dark <span class="sw">'+swatches(k,'dark')+'</span></span><span class="grp">Light <span class="sw">'+swatches(k,'light')+'</span></span></div>'+
 '<div class="spec" data-look="'+k+'" data-mode="'+mode+'" data-mark-animation="'+window.LOOK_SETS[ORDER.indexOf(k)].markStyle.working+'">'+
 '<div class="sp"><div class="k">Text</div><div class="big">Aa 0123 Almost, all 48 tests pass</div></div>'+
 '<div class="sp"><div class="k">Code</div><div class="cd">readingList.add(book)</div><div class="lb2" style="margin-top:8px">'+L.fonts+'</div></div>'+
 '<div class="sp"><div class="k">Labels and data</div><div class="lb">Crew · Working · Opus 5.5</div><div class="lb2">11:32 AM · 6.2k tokens · 0123456789</div><div class="lb2" style="margin-top:8px">Motion: '+motionLine+'</div></div>'+
 '<div class="sp"><div class="k">The four starter marks, working state</div><div class="marks">'+marks+'</div></div>'+
 '<div class="d90"><b>Day 90</b>'+L.day90+'</div></div>'+shots+'</div>'+
 '<div class="actions"><button type="button" data-a="pick" data-look="'+k+'" aria-pressed="'+(state.chosen===k)+'">'+(state.chosen===k?'Chosen':'Choose')+'</button>'+
 '<button type="button" data-a="ask" data-look="'+k+'">Ask for changes</button></div>'+
 '<div class="ask" id="ask-'+k+'"><textarea aria-label="What should change in '+L.name+'?" placeholder="For example: warmer, less busy, less contrast in the rules"></textarea><p>Your agent can use this request to revise the '+L.name+' row. <button type="button" data-a="queue" data-look="'+k+'" style="font:13px system-ui">Use request</button> <span class="qd"></span></p></div></section>'}
function renderRows(){var open={};$$('.ask.open').forEach(function(a){open[a.id]=a.querySelector('textarea').value});
 $('#rows').innerHTML=ORDER.map(rowHTML).join('');Object.keys(open).forEach(function(id){var a=$('#'+id);a.classList.add('open');a.querySelector('textarea').value=open[id]});
 $('#chosen').innerHTML='Chosen: <b>'+LOOKS[state.chosen].name+'</b>'}
var lastRowMode=null;
function renderRowsMode(){var m=resolved()+state.chosen;if(lastRowMode===m)return;lastRowMode=m;renderRows();
 $$('.row').forEach(function(r){r.setAttribute('data-motion',state.motion==='motion'&&!mqRM.matches?'on':'still')})}

/* ---------- wiring ---------- */
function setLook(k){state.look=k;applyStage()}
function choose(k){state.chosen=k;lastRowMode=null;applyStage();document.dispatchEvent(new CustomEvent('look-choice',{detail:{look:k}}))}
$('#rows').addEventListener('change',function(e){if(e.target.matches('input[type=radio]'))choose(e.target.value)});
$('#looks').addEventListener('click',function(e){var b=e.target.closest('button');if(b)setLook(b.dataset.look)});
$('#mode').addEventListener('click',function(e){var b=e.target.closest('button');if(b){state.mode=b.dataset.mode;applyStage()}});
$('#motion').addEventListener('click',function(e){var b=e.target.closest('button');if(b&&!b.disabled){state.motion=b.dataset.motion;applyStage();
 if(state.motion==='motion'&&e.detail>0){var st=$('#stage'),c=$('#stage .arrive');st.dataset.arrival='off';void c.offsetWidth;st.dataset.arrival='on'}}});
$('#rows').addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;var k=b.dataset.look,a=b.dataset.a;
 if(a==='pick'){choose(k)}
 if(a==='ask'){$('#ask-'+k).classList.toggle('open')}
 if(a==='queue'){$('#ask-'+k+' .qd').textContent='Request ready for your agent.';document.dispatchEvent(new CustomEvent('look-request',{detail:{look:k,text:$('#ask-'+k+' textarea').value}}))}});
document.addEventListener('keydown',function(e){var t=e.target.tagName;if(t==='TEXTAREA'||t==='INPUT'||e.metaKey||e.ctrlKey||e.altKey)return;
 if('1234'.indexOf(e.key)>=0&&e.key.length===1)setLook(ORDER[+e.key-1])});
mqDark.addEventListener('change',applyStage);
mqRM.addEventListener('change',function(){syncRM();applyStage()});
function syncRM(){var b=$('#motion button[data-motion=motion]');b.disabled=mqRM.matches;if(mqRM.matches)state.motion='still';$('#rmnote').hidden=!mqRM.matches}
window.addEventListener('resize',fit);
buildStage();
var roles=window.PACK_LAYOUT.roles;
function frame(role,id){return roles[role].variants.find(function(v){return v.frames.includes(id)})}
function rect(selector,role,id){var v=frame(role,id),e=$(selector);Object.assign(e.style,{left:v.rect.x+'px',top:v.rect.y+'px',width:v.rect.width+'px',height:v.rect.height+'px'});e.dataset.role=role}
rect('#stage .side','sidebar','F29');rect('#stage .hdr','header','F29');
var assistant=frame('assistant','F29');$('#stage .card').style.left=assistant.rect.x+'px';$('#stage .card').style.width=assistant.rect.width+'px';$('#stage .card').dataset.role='assistant';
var co=frame('callout','F29');$$('#stage .co').forEach(function(e){e.style.width=co.rect.width+'px';e.style.height=co.rect.height+'px';e.dataset.role='callout'});
var lead=frame('botRow','F29');$('#stage .brow').style.top=lead.rect.y+'px';
var botVariants=roles.botRow.variants.filter(function(v){return v.rect.width===294&&v.rect.height===56&&v.frames.includes('F29')});
$$('#stage .brow').slice(1).forEach(function(e,i){e.style.top=botVariants[i].rect.y+'px'});
$('#stage .head[style*="386px"]').style.top='445px';
$('#stage .a.lbl[style*="386px"]').style.top='445px';
$('#stage .more').style.top='289px';$('#stage .head[style*="481px"]').style.top='535px';
var firstSession=$('#stage .sess');firstSession.style.top='200.5px';firstSession.style.height='29.5px';
['Reading notes','Earlier plan'].forEach(function(name,i){var e=firstSession.cloneNode(true);e.setAttribute('aria-label','Session: '+name);e.style.top=(230+i*29.5)+'px';e.querySelector('.t').textContent=name;firstSession.parentNode.append(e)});

var comp=frame('composer','F35');$('#stage .comp').style.top=comp.rect.y+'px';
var send=frame('send','F35');$('#stage .send').style.top=(send.rect.y-comp.rect.y)+'px';
$$('#stage .mkslot').forEach(function(e){e.dataset.role='mark'});
syncRM();renderRows();applyStage();
window.__ready=true;
})();
