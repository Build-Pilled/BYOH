// PNG and image measurements for UI evidence. No image-library dependency.
import { inflateSync } from 'node:zlib';
import assert from 'node:assert/strict';
export function png(buffer) {
  assert.equal(buffer.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', 'PNG signature');
  let width, height, channels; const chunks = [];
  for (let p = 8; p < buffer.length;) {
    const n = buffer.readUInt32BE(p), type = buffer.toString('ascii', p + 4, p + 8), d = buffer.subarray(p + 8, p + 8 + n); p += n + 12;
    if (type === 'IHDR') { width = d.readUInt32BE(0); height = d.readUInt32BE(4); channels = { 2: 3, 6: 4 }[d[9]]; assert.ok(d[8] === 8 && channels && d[12] === 0, '8-bit RGB/RGBA non-interlaced PNG required'); }
    if (type === 'IDAT') chunks.push(d);
  }
  const raw = inflateSync(Buffer.concat(chunks)), stride = width * channels, decoded = Buffer.alloc(height * stride), rgba = Buffer.alloc(width * height * 4);
  assert.equal(raw.length, height * (stride + 1), 'PNG data length');
  const paeth = (a, b, c) => { const p = a + b - c; return Math.abs(p-a) <= Math.abs(p-b) && Math.abs(p-a) <= Math.abs(p-c) ? a : Math.abs(p-b) <= Math.abs(p-c) ? b : c; };
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)]; assert.ok(filter <= 4, 'PNG filter');
    for (let x = 0; x < stride; x++) {
      const i = y * stride + x, a = x >= channels ? decoded[i-channels] : 0, b = y ? decoded[i-stride] : 0, c = y && x >= channels ? decoded[i-stride-channels] : 0;
      decoded[i] = raw[y * (stride + 1) + 1 + x] + [0, a, b, Math.floor((a+b)/2), paeth(a,b,c)][filter];
    }
  }
  for (let i = 0; i < width * height; i++) { for (let c = 0; c < 3; c++) rgba[4*i+c] = decoded[channels*i+c]; rgba[4*i+3] = channels === 4 ? decoded[channels*i+3] : 255; }
  return { width, height, data: rgba };
}
export function ssim(a, b, masks = [], scale = 2) {
  assert.ok(a.width === b.width && a.height === b.height, 'screenshot and frame dimensions must match');
  let sum = 0, count = 0;
  const gray = (im, x, y) => { const i = (y*im.width+x)*4; return .2126*im.data[i]+.7152*im.data[i+1]+.0722*im.data[i+2]; };
  for (let y = 0; y < a.height; y += 8) for (let x = 0; x < a.width; x += 8) {
    // Ignore a window only if it intersects a caller-declared clock region, in CSS px.
    if (masks.some(r => x < (r.x+r.width)*scale && x+8 > r.x*scale && y < (r.y+r.height)*scale && y+8 > r.y*scale)) continue;
    const av = [], bv = [];
    for (let yy = y; yy < Math.min(y+8,a.height); yy++) for (let xx = x; xx < Math.min(x+8,a.width); xx++) { av.push(gray(a,xx,yy)); bv.push(gray(b,xx,yy)); }
    const n = av.length, ma = av.reduce((s,v)=>s+v,0)/n, mb = bv.reduce((s,v)=>s+v,0)/n;
    let va=0,vb=0,cov=0; for(let i=0;i<n;i++){va+=(av[i]-ma)**2;vb+=(bv[i]-mb)**2;cov+=(av[i]-ma)*(bv[i]-mb);} va/=n;vb/=n;cov/=n;
    sum += ((2*ma*mb+6.5025)*(2*cov+58.5225))/((ma*ma+mb*mb+6.5025)*(va+vb+58.5225)); count++;
  }
  assert.ok(count > 0, 'SSIM must have unmasked windows'); return sum/count;
}
export function difference(a,b) {
  assert.ok(a.width === b.width && a.height === b.height, 'mark tile dimensions');
  let different=0; for(let i=0;i<a.data.length;i+=4) if([0,1,2,3].some(c=>Math.abs(a.data[i+c]-b.data[i+c])>8)) different++;
  return different/(a.width*a.height);
}
export function cellPattern(tile, background) {
  const cells=[];
  for(let cy=0;cy<6;cy++) for(let cx=0;cx<6;cx++) {
    let ink=0,n=0;
    for(let y=Math.ceil(cy*tile.height/6);y<(cy+1)*tile.height/6;y++) for(let x=Math.ceil(cx*tile.width/6);x<(cx+1)*tile.width/6;x++) {
      n++; const i=(y*tile.width+x)*4; if(background.some((v,c)=>Math.abs(tile.data[i+c]-v)>8)) ink++;
    }
    cells.push(ink/n > .1);
  }
  return cells;
}
export function rgb(value) {
  if (/^#[\da-f]{6}$/i.test(value)) return [1,3,5].map(i=>parseInt(value.slice(i,i+2),16)).concat(1);
  if(value === 'transparent') return [0,0,0,0];
  const srgb=/^color\(srgb\s+([^()]+)\)$/.exec(value);
  if(srgb) {
    const parts=srgb[1].replace(/\//g,' ').trim().split(/\s+/).map(Number);
    assert.ok([3,4].includes(parts.length)&&parts.every(v=>Number.isFinite(v)&&v>=0&&v<=1), `invalid sRGB colour ${value}`);
    return [...parts.slice(0,3).map(v=>v*255),parts[3]??1];
  }
  const m=/^rgba?\(([^)]+)\)$/.exec(value); assert.ok(m, `unsupported colour ${value}`);
  const parts=m[1].replace(/\//g,' ').split(/[ ,]+/).filter(Boolean).map((v,i)=>v.endsWith('%') ? parseFloat(v)*(i===3?.01:2.55) : Number(v));
  assert.ok(parts.length>=3 && parts.every(Number.isFinite), `invalid colour ${value}`); return [...parts.slice(0,3),parts[3]??1];
}
export const over = (a,b) => { const alpha=a[3]+b[3]*(1-a[3]); return [...[0,1,2].map(i=>alpha ? (a[i]*a[3]+b[i]*b[3]*(1-a[3]))/alpha : 0),alpha]; };
const linear = v => (v/=255)<=.04045?v/12.92:((v+.055)/1.055)**2.4;
export function contrast(a,b) { const lum=c=>c.slice(0,3).map(linear).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0); const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05); }
export function deltaE(a,b) {
  const lab = c => { const [r,g,b]=c.slice(0,3).map(linear), f=v=>v>216/24389?Math.cbrt(v):(24389/27*v+16)/116;
    const x=f((.4124564*r+.3575761*g+.1804375*b)/.95047),y=f(.2126729*r+.7151522*g+.072175*b),z=f((.0193339*r+.119192*g+.9503041*b)/1.08883);return [116*y-16,500*(x-y),200*(y-z)]; };
  const x=lab(a),y=lab(b);return Math.hypot(...x.map((v,i)=>v-y[i]));
}
