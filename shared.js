import {normalizeTypes} from './type-model.js';
export const API = 'https://lreqntqzpsvjmjeaccwx.supabase.co/functions/v1/shopping-list';
export const COLOR_DEFAULTS = {"accent":"#b9bd76","backgroundColor":"#0d120d","titleColor":"#f3f0e2","textColor":"#f3f0e2","noteColor":"#adb5a4","quantityColor":"#b9bd76","subtitleColor":"#b9bd76","footerColor":"#9aa68b"};
export const DEFAULTS = {title:'SHOPPING LIST',subtitle:'GZW / NEXT DEPLOYMENT',...COLOR_DEFAULTS,opacity:90,fontSize:23,logoSize:148,rows:7,hideCompleted:false,fontVersion:'',fontName:'Default tactical',items:[]};
export const clamp=(v,a,b,f=a)=>Number.isFinite(Number(v))?Math.min(b,Math.max(a,Number(v))):f;
export const text=(v,max=100)=>String(v??'').slice(0,max);
export function normalize(raw={}){
 raw=raw&&typeof raw==='object'?raw:{};const s={...DEFAULTS,...normalizeTypes(raw)};
 for(const [key,max] of [['title',50],['subtitle',80],['fontName',100]]) if(typeof raw[key]==='string') s[key]=text(raw[key],max);
 for(const [k,fallback] of Object.entries(COLOR_DEFAULTS)) s[k]=/^#[0-9a-f]{6}$/i.test(raw[k])?raw[k].toLowerCase():((k==='quantityColor'||k==='subtitleColor')&&/^#[0-9a-f]{6}$/i.test(raw.accent)?raw.accent:fallback);
 for(const [key,a,b] of [['opacity',0,100],['fontSize',16,34],['logoSize',70,200],['rows',4,10]]) s[key]=clamp(raw[key]??s[key],a,b,s[key]);
 s.hideCompleted=raw.hideCompleted===true;s.fontVersion=/^[a-f0-9-]{36}$/i.test(raw.fontVersion)?raw.fontVersion:'';
 s.items=Array.isArray(raw.items)?raw.items.slice(0,200).filter(i=>i&&typeof i.name==='string'&&i.name.trim()).map(i=>({id:typeof i.id==='string'?text(i.id,60):crypto.randomUUID(),name:text(i.name.trim()),note:text(i.note,160),qty:Math.round(clamp(i.qty,1,9999,1)),have:Math.round(clamp(i.have,0,clamp(i.qty,1,9999,1),0))})):[];
 return s;
}
export async function request(action,key,{method='GET',body,headers={}}={}){
 const response=await fetch(`${API}?action=${action}`,{method,headers:{'X-List-Key':key,...headers},body,cache:'no-store',signal:AbortSignal.timeout(12000)});
 if(!response.ok){const error=await response.json().catch(()=>({error:'Connection failed'}));throw new Error(error.error||`Request failed (${response.status})`)}
 return response;
}
export function node(tag,className,content){const e=document.createElement(tag);if(className)e.className=className;if(content!==undefined)e.textContent=content;return e;}
export async function loadFont(version,key){
 if(!version)return null;
 let bytes;if(key){const r=await request('font',key);bytes=await r.arrayBuffer();}else{const {getFont}=await import('./storage.js');const saved=await getFont(version);if(!saved)throw new Error('Saved font not found.');bytes=saved.bytes;}
 const font=new FontFace('ImportedOverlay',bytes);await font.load();document.fonts.add(font);return font;
}

