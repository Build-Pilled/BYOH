// Appearance checks share the kit's window driver; staging remains the build agent's responsibility.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { lintLook } from './ui-style.mjs';
import { png, ssim, difference, cellPattern, rgb, over, contrast, deltaE } from './ui-pixels.mjs';
const PACK = resolve(dirname(fileURLToPath(import.meta.url)), '../ui-specifications');
const json = p => JSON.parse(readFileSync(p, 'utf8'));
const hash = v => createHash('sha256').update(JSON.stringify(v)).digest('hex');
const close = (a,b,t=.5) => Math.abs(a-b)<=t;
const sameRGB = (a,b) => a.length===b.length && a.every((v,i)=>Math.abs(v-b[i])<.0001);
const rectKeys=['x','y','width','height'];
const within = (a,b,t) => rectKeys.every(k=>close(a[k],b[k],t));
const contains = (parent,child) => child===parent || child.startsWith(parent+'/');
const family = s => s.split(',')[0].trim().replace(/^['"]|['"]$/g,'');
const EXCEPTIONS = [
  { name:'Selected-row age', mode:'dark', foreground:'#6c6c6c', background:'#2a2a2a' },
  { name:'Raised-control detail', mode:'dark', foreground:'#6c6c6c', background:'#2a2a2a' },
  { name:'Selected-task time', mode:'dark', foreground:'#6c6c6c', background:'#262626' },
  { name:'Chassis detail', mode:'light', foreground:'#777777', background:'#cfd0d2' },
  { name:'Hovered-sidebar age', mode:'light', foreground:'#777777', background:'rgb(198.2 199.2 201.2)' },
];
export function compareGeometry(a,b,kind='fixed') {
  assert.deepEqual(a.geometry,b.geometry,'computed layout properties changed');
  if(kind==='intrinsic-width') {
    assert.ok(close(a.rect.height,b.rect.height),'intrinsic height changed');
    assert.ok(close(a.rect.width,b.rect.width,Math.max(8,a.rect.width*.04)),'intrinsic width exceeds allowance');
    assert.equal(a.overflow,b.overflow,'text clipping changed');
  } else if(kind==='flow') {
    assert.ok(!a.overflow&&!b.overflow,'flow overflow');
    const line=parseFloat(a.geometry.lineHeight); assert.ok(line>0,'flow line height must be numeric');
    assert.ok(close((b.rect.height-a.rect.height)/line,Math.round((b.rect.height-a.rect.height)/line),.01),'flow height differs by a fractional line');
  } else assert.ok(within(a.rect,b.rect,.5),'fixed rectangle changed by more than 0.5 px');
}

export async function checkUI(w, plan, { evidence, sample=false }={}) {
  assert.ok(evidence,'UI checks need a fresh evidence directory'); mkdirSync(evidence,{recursive:false});
  const instrument=json(join(PACK,'look/instrument/tokens.json'));
  const chosen=json(resolve(plan.tokens));
  const layout=sample&&plan.reference ? plan.reference.layout : json(join(PACK,'layout/layout.json'));
  const rolePaint=sample&&plan.reference ? plan.reference.roles : json(join(PACK,'look/instrument/roles.json')).roles;
  const frames=readdirSync(join(PACK,'frames')).filter(f=>f.endsWith('.png')).sort();
  const results=[], pages=[], failures=[];
  const save=(file,value)=>writeFileSync(join(evidence,file),JSON.stringify(value,null,2)+'\n');
  const record=(check,page,mode,measure,threshold,fn)=>{
    try { const measured=fn(); results.push({check,page,mode,measure,threshold,measured:measured??true,pass:true}); }
    catch(e) { const row={check,page,mode,measure,threshold,pass:false,error:e.message};results.push(row);failures.push(row); }
  };
  const asyncRecord=async(check,page,mode,measure,threshold,fn)=>{try {const measured=await fn();results.push({check,page,mode,measure,threshold,measured:measured??true,pass:true});return measured;}catch(e){const row={check,page,mode,measure,threshold,pass:false,error:e.message};results.push(row);failures.push(row);return null;}};
  const token=(set,k,m)=>{assert.ok(set.tokens[k],`missing token ${k}`);return set.tokens[k][m];};
  const color=(set,k,m)=>rgb(token(set,k,m));
  const resolvePaint=(value,set,mode)=>value.replace(/\{([^}]+)\}/g,(_,key)=>token(set,key,mode));
  const cssFiles=plan.stylesheets??[];
  record('C1','look','both','look stylesheet purity','only root paint, allowed font rules and transform/opacity keyframes',()=>{
    assert.ok(cssFiles.length,'supply the actual built look stylesheet(s)');
    const findings=cssFiles.flatMap(file=>lintLook(readFileSync(file,'utf8'),json(join(PACK,'look-template/tokens.json')).tokens,chosen).map(v=>({file,...v}))); save('c1-lint.json',findings); assert.equal(findings.length,0,JSON.stringify(findings)); return {files:cssFiles};
  });
  record('coverage','all','both','frame coverage','every pack frame, unique page IDs, both modes',()=>{
    assert.ok(plan.pages?.length,'no pages'); assert.equal(new Set(plan.pages.map(p=>p.id)).size,plan.pages.length,'duplicate page ID');
    if(!sample) assert.deepEqual([...new Set(plan.pages.map(p=>p.frame))].sort(),frames,'missing or unknown frames');
    const kinds=['hover','focus','selected','open'],variations=plan.variations??[];
    for(const v of variations){assert.ok(plan.pages.some(p=>p.id===v.page),`variation names unknown page ${v.page}`);assert.ok(kinds.includes(v.kind),`unknown variation kind ${v.kind}`);}
    const covered=kinds.filter(k=>variations.some(v=>v.kind===k));
    if(!sample) assert.deepEqual(covered,kinds,`plan.variations must list a staged page for each of: ${kinds.filter(k=>!covered.includes(k))}`);
    return {sample,frames:plan.pages.map(p=>p.frame),variations,variationKinds:covered,complete:!sample};
  });
  for(const mode of ['dark','light']) {
    record('C4','tokens',mode,'token contrast pairs','3:1 faint; 4.5:1 other text; exact default exceptions only',()=>{
      const pairs=[]; const add=(ink,bg,faint=false)=>pairs.push([ink,bg,faint]);
      for(const ink of ['text','text-muted','text-faint']) for(const bg of ['display','chassis'])add(ink,bg,ink==='text-faint');
      add('link','display');add('on-accent','accent');
      for(const kind of ['important','note','tip','warning','caution']) {add(`callout-${kind}-ink`,`callout-${kind}-bg`);if(chosen.tokens[`callout-${kind}-strip`])add(`callout-${kind}-ink`,`callout-${kind}-strip`);}
      for(const ink of ['text','text-muted','text-faint'])add(ink,'surface-card',ink==='text-faint');
      for(let i=1;i<=3;i++)add('annotation-ink',`annotation-${i}`);
      const measurements=pairs.map(([ink,bg,faint])=>{
        const b=over(color(chosen,bg,mode),color(chosen,'display',mode)),a=over(color(chosen,ink,mode),b),ratio=contrast(a,b);
        const exception=chosen.look==='instrument'&&faint&&bg==='chassis'&&mode==='light'&&sameRGB(a,rgb('#777777'))&&sameRGB(b,rgb('#cfd0d2'));
        return {ink,bg,ratio,minimum:faint?3:4.5,exception:exception?'Chassis detail':null};
      });save(`c4-token-pairs-${mode}.json`,measurements);
      assert.ok(measurements.every(v=>v.ratio>=v.minimum||v.exception),JSON.stringify(measurements.filter(v=>v.ratio<v.minimum&&!v.exception)));return measurements;
    });
    record('C4','tokens',mode,'state colour distinctness','status and callout bar pairs >=20 CIE76 delta E',()=>{
      const sets=[['status-unread','status-working','status-waiting','status-attention'],['important','note','tip','warning','caution'].map(k=>`callout-${k}-bar`)];
      const pairs=[];for(const set of sets)for(let i=0;i<set.length;i++)for(let j=i+1;j<set.length;j++) {
        const a=set[i],b=set[j],value=deltaE(color(chosen,a,mode),color(chosen,b,mode));
        const exception=chosen.look==='instrument'&&a==='callout-important-bar'&&b==='callout-warning-bar'&&sameRGB(color(chosen,a,mode),color(instrument,a,mode))&&sameRGB(color(chosen,b,mode),color(instrument,b,mode));
        if(exception)assert.ok(Math.abs(value-19.09059333594837)<1e-6,`important/warning exception expects delta E 19.09059333594837, got ${value}`);
        pairs.push({a,b,deltaE:value,exception:exception?'Instrument important/warning bars':null});
      }
      save(`c4-distinctness-${mode}.json`,pairs);assert.ok(pairs.every(p=>p.deltaE>=20||p.exception),JSON.stringify(pairs.filter(p=>p.deltaE<20&&!p.exception)));return pairs;
    });
  }
  for(const [index,page] of (plan.pages??[]).entries()) for(const mode of ['dark','light']) {
    const id=String(index).padStart(2,'0')+'-'+mode;
    const samples={};
    for(const look of [...new Set(['instrument',chosen.look])]) {
      const prefix=id+'-'+look.replace(/[^a-z0-9-]/gi,'_');
      samples[look]=await asyncRecord('capture',page.id,mode,look,'state staged and all mappings measured',async()=>{
        await w.viewport();await w.scheme(mode);await w.motion(false);await page.stage(w,{look,mode});await w.ready();
        const nodes=[];assert.ok(page.nodes?.length,'page needs explicit region mappings');
        for(const node of page.nodes) { assert.ok(layout.roles[node.layout],`unknown layout role ${node.layout}`);nodes.push({...node,...await w.measure(node)}); }
        const data=await w.captureUI(),tree=await w.tree();
        await w.captureTextBackgrounds(data, join(evidence,prefix+'-background')); await w.shot(join(evidence,prefix+'.png'));
        const shot=png(readFileSync(join(evidence,prefix+'.png')));
        assert.ok(data.width===1280&&data.height===795&&data.scale===2&&shot.width===2560&&shot.height===1590,'pack viewport must be 1280x795 at scale 2');
        save(prefix+'.json',{nodes,data,tree,accessibilityHash:hash(tree)});
        return {nodes,data,tree,shot,prefix};
      });
    }
    const a=samples.instrument,b=samples[chosen.look];
    if(a&&b) {
      record('C2',page.id,mode,'look-swap invariance','C2 tolerance classes and identical accessibility tree',()=>{
        assert.deepEqual(a.tree,b.tree,'accessibility tree changed');
        const boxes=data=>data.boxes.filter(v=>!v.decorativeArtwork);
        const byPath=new Map(boxes(b.data).map(v=>[v.path,v]));assert.equal(boxes(a.data).length,boxes(b.data).length,'element count changed');
        for(const box of boxes(a.data)) { const other=byPath.get(box.path);assert.ok(other,`element missing ${box.path}`);const mapped=a.nodes.find(n=>n.path===box.path);compareGeometry(box,other,mapped?layout.roles[mapped.layout].class:'fixed'); }
        for(const sample of [a,b]) {
          const flows=sample.nodes.filter(n=>layout.roles[n.layout].class==='flow');
          for(const flow of flows)for(const other of sample.nodes)if(flow.path!==other.path&&!contains(flow.path,other.path)&&!contains(other.path,flow.path)) {
            const x=Math.min(flow.rect.x+flow.rect.width,other.rect.x+other.rect.width)-Math.max(flow.rect.x,other.rect.x),y=Math.min(flow.rect.y+flow.rect.height,other.rect.y+other.rect.height)-Math.max(flow.rect.y,other.rect.y);
            assert.ok(x<=.5||y<=.5,`flow overlaps ${other.layout}`);
          }
        }
        return {accessibilityHash:hash(b.tree),elements:a.data.boxes.length};
      });
      record('C3',page.id,mode,'reference geometry','fixed roles within 2 CSS px of this frame variant',()=>{
        const frameID=basename(page.frame??'').split('-')[0];
        const required=Object.entries(layout.roles).filter(([,v])=>v.variants.some(x=>x.frames.includes(frameID))).map(([k])=>k);
        assert.ok(required.every(k=>a.nodes.some(n=>n.layout===k)),`missing frame roles: ${required.filter(k=>!a.nodes.some(n=>n.layout===k))}`);
        for(const n of a.nodes) {
          const spec=layout.roles[n.layout];if(spec.class!=='fixed')continue;
          const variants=spec.variants.filter(v=>v.frames.includes(frameID));assert.ok(variants.length,`no ${n.layout} variant for ${page.frame}`);
          assert.ok(variants.some(v=>within(n.rect,v.rect,2)),`${n.layout} rectangle ${JSON.stringify(n.rect)} differs from frame`);
          assert.ok(variants.some(v=>v.fontSize===n.geometry.fontSize&&v.lineHeight===n.geometry.lineHeight),`${n.layout} size/line height differs from layout`);
        }
        for(const key of required) if(layout.roles[key].class==='fixed')for(const variant of layout.roles[key].variants.filter(v=>v.frames.includes(frameID)))assert.ok(a.nodes.some(n=>n.layout===key&&within(n.rect,variant.rect,2)),`unmatched ${key} frame rectangle ${JSON.stringify(variant.rect)}`);
        return {roles:a.nodes.length};
      });
      if(mode==='dark')record('C3',page.id,mode,'frame similarity','grayscale SSIM >=0.90, 8x8 windows',()=>{
        const reference=sample&&plan.reference ? resolve(page.frame) : join(PACK,'frames',page.frame);
        const score=ssim(a.shot,png(readFileSync(reference)),page.masks??[]);assert.ok(score>=.90,`SSIM ${score} < 0.90`);return score;
      });
      record('C3',page.id,mode,'chosen colour and rendered fonts','Instrument role paint; chosen-token colours and rendered font families',()=>{
        for(const n of b.nodes) {
          const role=rolePaint[n.layout];assert.ok(role,`missing paint role ${n.layout}`);
          const own = Object.values(chosen.tokens).map(v=>rgb(v[mode]));
          const fromOwn = value => {const c=rgb(value);return c[3]===0||own.some(t=>sameRGB(t,c));};
          if(chosen.look==='instrument') {
            for(const [side,values] of Object.entries(role.border??{}))assert.ok(values.some(v=>sameRGB(rgb(resolvePaint(v,chosen,mode)),rgb(n.paint['border'+side[0].toUpperCase()+side.slice(1)+'Color']))),`${n.layout} ${side} border colour differs`);
            for(const [property,values] of Object.entries(role)) {
              if(!['color','background'].includes(property))continue;
              const actual=rgb(n.paint[property==='background'?'backgroundColor':property]);
              assert.ok(values.some(v=>sameRGB(rgb(resolvePaint(v,chosen,mode)),actual)),`${n.layout} ${property}: ${JSON.stringify(actual)} is not the resolved token`);
            }
          } else {
            for(const property of ['color','backgroundColor'])assert.ok(fromOwn(n.paint[property]),`${n.layout} ${property} is not a chosen token`);
            for(const side of ['Top','Right','Bottom','Left'])if(parseFloat(n.geometry['border'+side+'Width'])>0)assert.ok(fromOwn(n.paint['border'+side+'Color']),`${n.layout} border is not a chosen token`);
          }
          const expected=chosen.look==='instrument'?role.family:chosen.fonts?.[n.font??(role.family==='Recursive Mono Linear'?'code':role.family==='ui-monospace'?'label':'body')];
          assert.ok(expected,`no chosen family for ${n.layout}`);assert.equal(family(n.paint.fontFamily),family(expected),`${n.layout} declared family`);
          if(!['ui-monospace','system-ui'].includes(family(expected))&&n.fonts.length) assert.ok(n.fonts.every(f=>f.familyName===family(expected)),`${n.layout} rendered fallback: ${JSON.stringify(n.fonts)}`);
        }
        for(const text of b.data.texts) {
          const n=b.nodes.filter(n=>contains(n.path,text.path)).sort((x,y)=>y.path.length-x.path.length)[0];assert.ok(n,`unmapped text ${text.text}`);
          const role=rolePaint[n.layout];assert.ok(chosen.look==='instrument'?role.color.some(v=>sameRGB(rgb(resolvePaint(v,chosen,mode)),rgb(text.color))):Object.values(chosen.tokens).some(v=>sameRGB(rgb(v[mode]),rgb(text.color))),`text colour differs from ${n.layout}: ${text.text}`);
          const expected=chosen.look==='instrument'?role.family:chosen.fonts?.[n.font??(role.family==='Recursive Mono Linear'?'code':role.family==='ui-monospace'?'label':'body')];assert.equal(family(text.family),family(expected),`text family differs: ${text.text}`);
        }
        return {roles:b.nodes.length};
      });
      record('C4',page.id,mode,'rendered contrast','every visible text pair >=3 faint or >=4.5 other; named default exceptions only',()=>{
        assert.equal(b.data.unsupported.length,0,'unsupported text filter/blend or uncaptured effective background');
        const measures=b.data.texts.map(text=>{
          const node=b.nodes.filter(n=>contains(n.path,text.path)).sort((x,y)=>y.path.length-x.path.length)[0];
          let bg=[0,0,0,0],fg=rgb(text.color);
          for(const layer of text.layers) { bg=over(bg,rgb(layer.background));fg=over(fg,rgb(layer.background));bg[3]*=layer.opacity;fg[3]*=layer.opacity; }
          bg=over(bg,[255,255,255,1]);fg=over(fg,[255,255,255,1]);
          let pixelRatio=null;
          if(text.backgroundCapture) {
            const image=png(readFileSync(text.backgroundCapture.file));
            const {clip}=text.backgroundCapture;let minimum=Infinity,count=0;
            for(const rect of text.textRects)for(let y=Math.max(0,Math.ceil((rect.y-clip.y)*2));y<Math.min(image.height,Math.floor((rect.y+rect.height-clip.y)*2));y++)for(let x=Math.max(0,Math.ceil((rect.x-clip.x)*2));x<Math.min(image.width,Math.floor((rect.x+rect.width-clip.x)*2));x++) {
              const i=(y*image.width+x)*4,background=[...image.data.subarray(i,i+3),1];
              const foreground=over([...rgb(text.color).slice(0,3),rgb(text.color)[3]*text.opacity],background);
              minimum=Math.min(minimum,contrast(foreground,background));count++;
            }
            assert.ok(count,'no effective-background pixels captured');pixelRatio=minimum;
          }
          const faint=sameRGB(rgb(text.color),color(chosen,'text-faint',mode)),ratio=pixelRatio??contrast(fg,bg),minimum=faint?3:4.5;
          const exception=chosen.look==='instrument'&&faint&&EXCEPTIONS.find(e=>e.name===node?.exception&&e.mode===mode&&sameRGB(fg,rgb(e.foreground))&&sameRGB(bg,rgb(e.background)));
          return {...text,foreground:fg,background:bg,effectiveBackground:pixelRatio!==null?'captured PNG minimum':'computed layers',ratio,minimum,exception:exception?.name??null,pass:ratio>=minimum||!!exception};
        });save(id+'-c4-rendered.json',measures);assert.ok(measures.length,'no rendered text measured');assert.ok(measures.every(m=>m.pass),JSON.stringify(measures.filter(m=>!m.pass)));return {texts:measures.length};
      });
      record('C4',page.id,mode,'state labels','every mapped status and callout carries words',()=>{
        for(const n of b.nodes.filter(n=>n.layout==='statusLight'||n.layout.startsWith('callout')))assert.ok(b.data.texts.some(t=>contains(n.path,t.path)&&t.text.trim()),`missing words for ${n.layout}`);
        return true;
      });
      pages.push({id:page.id,mode,screenshots:[a.prefix+'.png',b.prefix+'.png']});
    }
    // Do not serialize image buffers into result.json; the PNG and capture JSON are the raw evidence.
    for(const r of results) if(r.check==='capture'&&r.measured?.shot)r.measured={prefix:r.measured.prefix};
  }
  await asyncRecord('C5','marks','both','200-seed mark distinctness and geometry','88x88 tiles; every pair >=12%; same occupied 6x6 cells per seed',async()=>{
    assert.equal(typeof plan.mark,'function','plan needs mark(w,{look,mode,seed}) staging and tile mapping');
    const minimums=[];
    for(const mode of ['dark','light']) {
      await w.viewport();await w.scheme(mode);await w.motion(true);
      const tiles=[];
      for(let seed=0;seed<200;seed++) {
        const patterns=[];
        for(const look of [...new Set(['instrument',chosen.look])]) {
          const target=await plan.mark(w,{look,mode,seed});await w.ready();const measurement=await w.measure(target);
          assert.ok(close(measurement.rect.width,88,.01)&&close(measurement.rect.height,88,.01),'mark must occupy an 88x88 CSS px tile');
          const file=`mark-${mode}-${seed}-${look.replace(/[^a-z0-9-]/gi,'_')}.png`;
          await w.shot(join(evidence,file),target.role,target.name,{in:target.in});const tile=png(readFileSync(join(evidence,file)));
          assert.ok(!measurement.overflow,'mark overflows its tile');
          const cells=await w.grid(target,target.cells);assert.equal(cells.length,36,'mark needs 36 mapped grid cells in row-major order');
          for(const [i,cell] of cells.entries()) { const expected={x:measurement.rect.x+(i%6)*88/6,y:measurement.rect.y+Math.floor(i/6)*88/6,width:88/6,height:88/6};assert.ok(within(cell.rect,expected,.02)&&!cell.overflow,`mark cell ${i} is off its 6x6 grid or overflows`); }
          const bg=rgb(measurement.paint.backgroundColor);assert.equal(bg[3],1,'mark tile needs an opaque ground');const pattern=cellPattern(tile,bg.slice(0,3));assert.ok(pattern.some(Boolean),'mark is empty');patterns.push(pattern);
          if(look===chosen.look)tiles.push(tile);
          save(file+'.json',{seed,look,mode,measurement,cells,pattern});
        }
        assert.ok(patterns.every(p=>JSON.stringify(p)===JSON.stringify(patterns[0])),`seed ${seed} cell pattern changed across looks`);
      }
      let minimum=1,pair=[];for(let i=0;i<tiles.length;i++)for(let j=i+1;j<tiles.length;j++){const d=difference(tiles[i],tiles[j]);if(d<minimum){minimum=d;pair=[i,j];}}
      minimums.push({mode,minimum,pair});save('c5-mark-pairs.json',minimums);assert.ok(minimum>=.12,`${mode} marks ${pair} differ by ${minimum}, less than 12%`);
    }
    return minimums;
  });
  const output={schema:1,look:chosen.look,sample,pass:failures.length===0,complete:!sample&&failures.length===0,pages,results};save('result.json',output);
  const md=['# UI check report','',`Look: ${chosen.look}. ${sample?'Sample proof only — not a setup-completion run.':output.complete?'All pages pass.':'Setup is blocked.'}`,'', '| Check | Page | Mode | Measurement | Result |','| --- | --- | --- | --- | --- |',...results.map(r=>`| ${r.check} | ${r.page} | ${r.mode} | ${r.measure} | ${r.pass?'PASS':'FAIL: '+r.error.replace(/\n/g,' ').replace(/\|/g,'/')} |`),'',...pages.flatMap(p=>[`## ${p.id} (${p.mode})`,...new Set(p.screenshots.map(f=>`![${p.id}](${f})`))]),''];
  writeFileSync(join(evidence,'report.md'),md.join('\n'));return output;
}
