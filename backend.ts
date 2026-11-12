import {normalizeTypes,createSpin,UUID} from './type-model.js';
const base=Deno.env.get('SUPABASE_URL')!;
const admin=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}').default||Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'content-type,x-list-key,x-font-extension,x-font-version','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Expose-Headers':'X-Server-Time','Cache-Control':'no-store'};
function json(data:unknown,status=200){return new Response(JSON.stringify(data),{status,headers:{...cors,'Content-Type':'application/json','X-Server-Time':String(Date.now())}})}
async function db(path:string,options:RequestInit={}){const r=await fetch(base+'/rest/v1/'+path,{...options,headers:{apikey:admin,Authorization:'Bearer '+admin,'Content-Type':'application/json',Prefer:'return=representation',...(options.headers||{})}});if(!r.ok)throw new Error('Storage unavailable');return r.json()}
const clip=(v:unknown,n:number)=>String(v??'').slice(0,n);
const number=(v:unknown,a:number,b:number)=>Math.round(Math.min(b,Math.max(a,Number(v)||a)));
async function digest(value:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))).map(b=>b.toString(16).padStart(2,'0')).join('');}
Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response(null,{headers:cors});
 try{
  const key=req.headers.get('X-List-Key')||'';
  if(!/^[a-f0-9]{64}$/.test(key))return json({error:'Open your private control or OBS link.'},401);
  const hash=await digest(key);
  const action=new URL(req.url).searchParams.get('action')||'state';
  if(req.method==='POST'&&action==='create'){
   const raw=await req.text();if(raw.length>1024)return json({error:'Invalid connection request.'},400);
   const {viewKey}=JSON.parse(raw);if(!/^[a-f0-9]{64}$/.test(viewKey)||viewKey===key)return json({error:'Invalid overlay keys.'},400);
   const ip=req.headers.get('x-forwarded-for')?.split(',')[0].trim()||'unknown';
   const result=await db('rpc/create_shopping_overlay',{method:'POST',body:JSON.stringify({p_read_hash:await digest(viewKey),p_edit_hash:hash,p_creator_hash:await digest(admin+':'+ip)})});
   return result.error?json(result,429):json(result);
  }
  const rows=await db(`shopping_lists?or=(read_hash.eq.${hash},edit_hash.eq.${hash})&select=id,edit_hash,state,font_version,updated_at&limit=1`);
  const row=rows[0];if(!row)return req.method==='POST'&&action==='disconnect'?json({ok:true}):json({error:'This link is not valid.'},403);
  if(req.method==='GET'&&action==='state')return json(row.state);
  if(req.method==='GET'&&action==='image'){
   const id=new URL(req.url).searchParams.get('image')||'';if(!UUID.test(id))return json({error:'Invalid image.'},400);
   const result=await db(`shopping_lists?id=eq.${row.id}&select=image_assets`),asset=result[0].image_assets?.[id];
   if(!asset)return json({error:'Image unavailable.'},404);
   return new Response(Uint8Array.from(atob(asset.data),c=>c.charCodeAt(0)),{headers:{...cors,'Content-Type':asset.type,'X-Content-Type-Options':'nosniff'}});
  }
  if(req.method==='GET'&&action==='font'){
   const fonts=await db(`shopping_lists?id=eq.${row.id}&select=font_data,font_type`);const font=fonts[0];
   if(!font.font_data)return json({error:'No custom font.'},404);
   const binary=Uint8Array.from(atob(font.font_data),c=>c.charCodeAt(0));
   return new Response(binary,{headers:{...cors,'Content-Type':'font/'+font.font_type}});
  }
  if(req.method!=='POST')return json({error:'Unsupported request'},405);
  if(row.edit_hash!==hash)return json({error:'This is a read-only OBS link.'},403);
  if(action==='disconnect'){await db(`shopping_lists?id=eq.${row.id}`,{method:'DELETE'});return json({ok:true});}
  if(action==='images'){
   const raw=await req.text();if(raw.length>2700000)return json({error:'Reward images are too large.'},413);
   const input=JSON.parse(raw).assets;if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).length>12)return json({error:'Maximum 12 reward images.'},400);
   const assets:Record<string,unknown>={};for(const [id,value] of Object.entries(input)){
    const asset=value as {type:string,data:string};if(!UUID.test(id)||!asset||!['image/webp','image/png','image/jpeg'].includes(asset.type)||typeof asset.data!=='string'||asset.data.length>218456||!/^[A-Za-z0-9+/]*={0,2}$/.test(asset.data))return json({error:'Invalid reward image.'},400);
    const bytes=Uint8Array.from(atob(asset.data),c=>c.charCodeAt(0));const magic=Array.from(bytes.slice(0,12)).map(v=>v.toString(16).padStart(2,'0')).join('');
    const valid=asset.type==='image/webp'?magic.startsWith('52494646')&&magic.slice(16,24)==='57454250':asset.type==='image/png'?magic.startsWith('89504e470d0a1a0a'):magic.startsWith('ffd8ff');
    if(!valid||bytes.length>163840||bytes.length<12)return json({error:'Invalid image file.'},400);assets[id]={type:asset.type,data:asset.data};
   }
   await db(`shopping_lists?id=eq.${row.id}`,{method:'PATCH',body:JSON.stringify({image_assets:assets})});return json({ok:true});
  }
  if(action==='spin'){
   let state;try{state=createSpin({...row.state,...normalizeTypes(row.state)},Date.now());}catch(e){return json({error:e instanceof Error?e.message:'Could not spin.'},409);}
   const updated=await db(`shopping_lists?id=eq.${row.id}&updated_at=eq.${encodeURIComponent(row.updated_at)}`,{method:'PATCH',body:JSON.stringify({state,updated_at:new Date().toISOString()})});
   if(!updated.length)return json({error:'This output changed in another window. Try spinning again.'},409);
   return json({spin:state.wheelSpin,serverTime:Date.now()});
  }
  if(action==='state'){
   const raw=await req.text();if(raw.length>180000)return json({error:'List is too large.'},413);
   const s=JSON.parse(raw);if(!Array.isArray(s.items)||s.items.length>200)return json({error:'Maximum 200 items.'},400);
   const state={title:clip(s.title,50),subtitle:clip(s.subtitle,80),accent:/^#[0-9a-f]{6}$/i.test(s.accent)?s.accent:'#b9bd76',opacity:number(s.opacity,0,100),fontSize:number(s.fontSize,16,34),logoSize:number(s.logoSize,70,200),rows:number(s.rows,4,10),hideCompleted:s.hideCompleted===true,fontVersion:s.fontVersion===row.font_version?s.fontVersion:'',fontName:clip(s.fontName,100),items:s.items.filter((i:any)=>i&&typeof i.name==='string'&&i.name.trim()).map((i:any)=>({id:clip(i.id,60),name:clip(i.name,100),note:clip(i.note,160),qty:number(i.qty,1,9999),have:number(i.have,0,number(i.qty,1,9999))}))};
   const colorDefaults={"accent":"#b9bd76","backgroundColor":"#0d120d","titleColor":"#f3f0e2","textColor":"#f3f0e2","noteColor":"#adb5a4","quantityColor":"#b9bd76","subtitleColor":"#b9bd76","footerColor":"#9aa68b"};
   for(const [name,fallback] of Object.entries(colorDefaults)){
    const candidate=s[name]??row.state[name];
    (state as Record<string,unknown>)[name]=/^#[0-9a-f]{6}$/i.test(candidate)?candidate.toLowerCase():fallback;
   }
   Object.assign(state,normalizeTypes({...row.state,...s}));
   const currentSpin=row.state.wheelSpin;
   if(currentSpin&&Date.now()<currentSpin.startedAt+currentSpin.duration&&s.wheelSpin?.id!==currentSpin.id)(state as Record<string,unknown>).wheelSpin=currentSpin;
   await db(`shopping_lists?id=eq.${row.id}`,{method:'PATCH',body:JSON.stringify({state,updated_at:new Date().toISOString()})});return json({ok:true});
  }
  if(action==='font'){
   const type=req.headers.get('X-Font-Extension')||'';if(!['ttf','otf','woff','woff2'].includes(type))return json({error:'Use TTF, OTF, WOFF or WOFF2.'},400);
   if(Number(req.headers.get('content-length'))>2097152)return json({error:'Maximum font size is 2 MB.'},413);
   const bytes=new Uint8Array(await req.arrayBuffer());if(bytes.length<4||bytes.length>2097152)return json({error:'Maximum font size is 2 MB.'},413);
   const magic=Array.from(bytes.slice(0,4)).map(x=>x.toString(16).padStart(2,'0')).join('');
   if(!['00010000','4f54544f','74727565','774f4646','774f4632'].includes(magic))return json({error:'That file is not a supported font.'},400);
   let binary='';for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));
   const suppliedVersion=req.headers.get('X-Font-Version')||'';
   const version=/^[a-f0-9-]{36}$/i.test(suppliedVersion)?suppliedVersion:crypto.randomUUID();await db(`shopping_lists?id=eq.${row.id}`,{method:'PATCH',body:JSON.stringify({font_data:btoa(binary),font_type:type,font_version:version})});return json({version});
  }
  return json({error:'Not found'},404);
 }catch(e){console.error(e instanceof Error?e.message:'Request failed');return json({error:'Could not save or load. Please retry.'},500)}
});
