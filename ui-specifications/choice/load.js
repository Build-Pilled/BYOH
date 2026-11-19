// These are the app's token files, not a second palette for the preview.
const order = ['instrument', 'lab', 'dusk', 'paper'];
const callouts = ['note', 'tip', 'important', 'warning', 'caution'];
const read = async path => {
  const response = await fetch(new URL(path, import.meta.url));
  if (!response.ok) throw new Error(`Cannot load ${path}: ${response.status}`);
  return response.json();
};
try {
  const [layout, ...sets] = await Promise.all([
    read('../layout/layout.json'), ...order.map(k => read(`../look/${k}/tokens.json`))
  ]);
  const instrument = {
    description: {name:'Instrument', character:'Device. A black display, grey chassis and one backlit orange light.', tags:'Black and orange / serif with mono labels / no motion', day90:'The panel you stop noticing: nothing moves merely to be noticed.', fontCaption:'Literata (text), system monospace (labels), Recursive Mono (code)'},
    fonts:{body:'Literata, Georgia, serif', ui:'Literata, Georgia, serif', person:'Literata, Georgia, serif', label:'ui-monospace, "SF Mono", monospace', data:'ui-monospace, "SF Mono", monospace', code:'Recursive, ui-monospace, monospace', bodyWeight:400, strongWeight:600, labelWeight:600, tracking:'0', labelTracking:'.06em', bodyFeatures:'normal', labelFeatures:'normal', dataFeatures:'normal', codeVariations:'"MONO" 1, "CASL" 0'},
    radius:{control:4,card:4,callout:4},
    ruleStrength:{region:1.5,control:1.5,card:1.5,calloutEdge:.45,glow:.9,personShadow:.18,composerAccent:0,primaryTexture:1},
    motion:{preset:'none',durationScale:1,hoverDuration:0,arrivalDuration:0,easing:'linear',pressScale:1},
    markStyle:{cellShape:'square',gap:0,radius:0,tileRadius:5.12,ink:'multi',idle:'none',working:'none',duration:0}
  };
  const looks = {order, callouts};
  let css = '';
  sets.forEach((set, i) => {
    if (i === 0) Object.assign(set, instrument);
    const k = order[i], f = set.fonts, r = set.radius, rule = set.ruleStrength, motion = set.motion;
    const L = looks[k] = {...set.description, fonts:set.description.fontCaption,
      marks:{tileR:set.markStyle.tileRadius,cellR:set.markStyle.radius,gap:set.markStyle.gap,size:4,ink:set.markStyle.ink,crisp:set.markStyle.cellShape==='square'}};
    for (const mode of ['dark','light']) {
      const t = Object.fromEntries(Object.entries(set.tokens).map(([n,v])=>[n,v[mode]]));
      L[mode] = {display:t.display,chassis:t.chassis,surface:t['surface-card'],raised:t['surface-raised'],rule:t.rule,hi:t['edge-light'],text:t.text,muted:t['text-muted'],dim:t['text-faint'],accent:t.accent,onAccent:t['on-accent'],accentInk:t.link,personBg:t['person-bubble'],personText:t.display,codeBg:t['surface-inline-code'],glow:rule.glow,mkTile:t['mark-ground'],mkRim:t['mark-ground-grid'],mkInk:t.text,mk:Array.from({length:9},(_,i)=>t['mark-'+(i+1)])};
      for (const s of ['working','waiting','unread','attention']) L[mode][s]=t['status-'+s];
      for (const c of callouts) L[mode][c]=['bar','bg','ink'].map(part=>t[`callout-${c}-${part}`]);
      // Every token is available by its published name to consumers of the stage.
      css += `[data-look="${k}"][data-mode="${mode}"]{`+Object.entries(t).map(([n,v])=>`--${n}:${v}`).join(';')+'}\n';
    }
    const vars = {'ff-ui':f.ui,'ff-text':f.body,'ff-person':f.person,'ff-data':f.data,'ff-label':f.label,'ff-code':f.code,'code-var':f.codeVariations,'fw-ui':f.bodyWeight,'fw-name':f.strongWeight,'lbl-fw':f.labelWeight,'lbl-ls':f.labelTracking,'lbl-feat':f.labelFeatures,'data-feat':f.dataFeatures,'body-ls':f.tracking,'body-feat':f.bodyFeatures,'dur':motion.hoverDuration*motion.durationScale+'ms','arrival-duration':motion.arrivalDuration*motion.durationScale+'ms','ease':motion.easing,'press':motion.pressScale,'sel':k==='paper'?'var(--accent)':'var(--rule)','band':'none','dot-rad':k==='instrument'?'1.5px':'50%','dot-glow':rule.glow? '6px':'0px','co-frame':rule.calloutEdge*100+'%','lead-ring':rule.control+'px','radius-control':r.control+'px','radius-card':r.card+'px','radius-callout':r.callout+'px','rule-region':rule.region+'px','rule-control':rule.control+'px','rule-card':rule.card+'px','person-shadow-alpha':rule.personShadow,'mark-duration':set.markStyle.duration*motion.durationScale+'ms','composer-accent':rule.composerAccent+'px','primary-texture':rule.primaryTexture};
    css += `[data-look="${k}"]{`+Object.entries(vars).map(([n,v])=>`--${n}:${v}`).join(';')+'}\n';
  });
  const style = document.createElement('style'); style.textContent=css; document.head.append(style);
  window.LOOKS=looks;window.LOOK_SETS=sets;window.PACK_LAYOUT=layout;
  await import('./app.js');
} catch (error) {
  document.querySelector('#stage').textContent='The look assets could not load. Serve the repository over local HTTP, then reload.';
  console.error(error);
}
