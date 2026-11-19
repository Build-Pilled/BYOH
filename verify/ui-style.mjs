// Fail-closed look-layer parser. This is a small grammar, not a general CSS minifier.
export function lintLook(css, tokens, parameters = {}) {
  const failures=[], allowed=new Set(Object.keys(tokens).map(k=>'--'+k));
  const kebab=s=>s.replace(/[A-Z]/g,c=>'-'+c.toLowerCase());
  const add=(obj,prefix='')=>{for(const [k,v] of Object.entries(obj)){const name=prefix+kebab(k);if(v&&typeof v==='object'&&!Array.isArray(v))add(v,name+'-');else allowed.add('--'+name);}};
  for(const key of ['fonts','motion','radius','ruleStrength','markStyle']) if(parameters[key]) add(parameters[key],kebab(key)+'-');
  // The colour-only default has these documented family parameters.
  ['body','label','code','ui','person','data'].forEach(k=>allowed.add('--font-'+k));
  const font=new Set(['font-family','src','font-weight','font-style','size-adjust','ascent-override','descent-override','line-gap-override']);
  const problem=(i,reason)=>failures.push({line:css.slice(0,i).split('\n').length,reason});
  let p=0;
  const skip=()=>{for(;;){while(/\s/.test(css[p]??'')&&p<css.length)p++;if(css.slice(p,p+2)==='/*'){const end=css.indexOf('*/',p+2);if(end<0){problem(p,'unterminated comment');p=css.length;return;}p=end+2;}else break;}};
  const until=chars=>{const start=p;let quote='',paren=0;for(;p<css.length;p++){const c=css[p];if(quote){if(c==='\\')p++;else if(c===quote)quote='';}else if(c==='"'||c==="'")quote=c;else if(css.slice(p,p+2)==='/*'){const end=css.indexOf('*/',p+2);if(end<0){problem(p,'unterminated comment');p=css.length;break;}p=end+1;}else if(c==='(')paren++;else if(c===')')paren--;else if(!paren&&chars.includes(c))break;}return css.slice(start,p).replace(/\/\*[\s\S]*?\*\//g,'').trim();};
  const root=s=>/^:root(?:\[data-(?:look|mode|theme)=(?:"[\w-]+"|'[\w-]+'|[\w-]+)\])*$/.test(s);
  function rules(context='root') {
    for(;;){skip();if(p>=css.length){if(context!=='root')problem(p,'unclosed block');return;}if(css[p]==='}'){p++;if(context==='root')problem(p-1,'unexpected closing brace');return;}
      const start=p, head=until('{;}'),stop=css[p++];
      if(stop!=='{'){problem(start,'expected a rule block (imports and external layers are not allowed)');continue;}
      if(/^@(?:-webkit-)?keyframes\s+[\w-]+$/.test(head)){rules('keyframes');continue;}
      if(head.startsWith('@media ')){if(!/^@media\s+\(prefers-reduced-motion:\s*(?:reduce|no-preference)\)$/.test(head))problem(start,'only reduced-motion media is allowed');rules('nested');continue;}
      if(head==='@font-face'){declarations('font');continue;}
      if(context==='keyframes'){if(!head.split(',').every(s=>/^(?:from|to|\d+(?:\.\d+)?%)$/.test(s.trim())))problem(start,'invalid keyframe');declarations('animation');continue;}
      if(!head.split(',').every(s=>root(s.trim())))problem(start,'component selectors are not look paint');
      declarations('tokens');
    }
  }
  function declarations(context) {
    for(;;){skip();if(p>=css.length){problem(p,'unclosed declaration block');return;}if(css[p]==='}'){p++;return;}
      const start=p, property=until(':;{}');if(css[p++]!==':'){problem(start,'invalid declaration');continue;}
      const value=until(';{}');const stop=css[p++];
      if(stop==='{'){problem(start,'nested declarations are not supported');rules('nested');continue;}
      if(!value)problem(start,'empty declaration');
      if(context==='font'?!font.has(property):context==='animation'?!['transform','opacity'].includes(property):!allowed.has(property))problem(start,`not allowed in ${context}: ${property}`);
      if(stop==='}')return;
    }
  }
  rules(); return failures;
}
