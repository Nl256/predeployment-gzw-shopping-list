const base=Deno.env.get('SUPABASE_URL')!;
const admin=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}').default||Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'content-type,x-list-key,x-font-extension','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Cache-Control':'no-store'};
function json(data:unknown,status=200){return new Response(JSON.stringify(data),{status,headers:{...cors,'Content-Type':'application/json'}})}
async function db(path:string,options:RequestInit={}){const r=await fetch(base+'/rest/v1/'+path,{...options,headers:{apikey:admin,Authorization:'Bearer '+admin,'Content-Type':'application/json',Prefer:'return=representation',...(options.headers||{})}});if(!r.ok)throw new Error('Storage unavailable');return r.json()}
const clip=(v:unknown,n:number)=>String(v??'').slice(0,n);
const number=(v:unknown,a:number,b:number)=>Math.round(Math.min(b,Math.max(a,Number(v)||a)));
Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response(null,{headers:cors});
 try{
  const key=req.headers.get('X-List-Key')||'';
  if(!/^[a-f0-9]{64}$/.test(key))return json({error:'Open your private control or OBS link.'},401);
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(key)))).map(b=>b.toString(16).padStart(2,'0')).join('');
  const action=new URL(req.url).searchParams.get('action')||'state';
  const rows=await db(`shopping_lists?or=(read_hash.eq.${hash},edit_hash.eq.${hash})&select=id,edit_hash,state,font_version&limit=1`);
  const row=rows[0];if(!row)return json({error:'This link is not valid.'},403);
  if(req.method==='GET'&&action==='state')return json(row.state);
  if(req.method==='GET'&&action==='font'){
   const fonts=await db(`shopping_lists?id=eq.${row.id}&select=font_data,font_type`);const font=fonts[0];
   if(!font.font_data)return json({error:'No custom font.'},404);
   const binary=Uint8Array.from(atob(font.font_data),c=>c.charCodeAt(0));
   return new Response(binary,{headers:{...cors,'Content-Type':'font/'+font.font_type}});
  }
  if(req.method!=='POST')return json({error:'Unsupported request'},405);
  if(row.edit_hash!==hash)return json({error:'This is a read-only OBS link.'},403);
  if(action==='state'){
   const raw=await req.text();if(raw.length>180000)return json({error:'List is too large.'},413);
   const s=JSON.parse(raw);if(!Array.isArray(s.items)||s.items.length>200)return json({error:'Maximum 200 items.'},400);
   const state={title:clip(s.title,50),subtitle:clip(s.subtitle,80),accent:/^#[0-9a-f]{6}$/i.test(s.accent)?s.accent:'#b9bd76',opacity:number(s.opacity,0,100),fontSize:number(s.fontSize,16,34),logoSize:number(s.logoSize,70,200),rows:number(s.rows,4,10),hideCompleted:s.hideCompleted===true,fontVersion:s.fontVersion===row.font_version?s.fontVersion:'',fontName:clip(s.fontName,100),items:s.items.filter((i:any)=>i&&typeof i.name==='string'&&i.name.trim()).map((i:any)=>({id:clip(i.id,60),name:clip(i.name,100),note:clip(i.note,160),qty:number(i.qty,1,9999),have:number(i.have,0,number(i.qty,1,9999))}))};
   const colorDefaults={"accent":"#b9bd76","backgroundColor":"#0d120d","titleColor":"#f3f0e2","textColor":"#f3f0e2","noteColor":"#adb5a4","quantityColor":"#b9bd76","subtitleColor":"#b9bd76","footerColor":"#9aa68b"};
   for(const [name,fallback] of Object.entries(colorDefaults)){
    const candidate=s[name]??row.state[name];
    (state as Record<string,unknown>)[name]=/^#[0-9a-f]{6}$/i.test(candidate)?candidate.toLowerCase():fallback;
   }
   await db(`shopping_lists?id=eq.${row.id}`,{method:'PATCH',body:JSON.stringify({state,updated_at:new Date().toISOString()})});return json({ok:true});
  }
  if(action==='font'){
   const type=req.headers.get('X-Font-Extension')||'';if(!['ttf','otf','woff','woff2'].includes(type))return json({error:'Use TTF, OTF, WOFF or WOFF2.'},400);
   if(Number(req.headers.get('content-length'))>2097152)return json({error:'Maximum font size is 2 MB.'},413);
   const bytes=new Uint8Array(await req.arrayBuffer());if(bytes.length<4||bytes.length>2097152)return json({error:'Maximum font size is 2 MB.'},413);
   const magic=Array.from(bytes.slice(0,4)).map(x=>x.toString(16).padStart(2,'0')).join('');
   if(!['00010000','4f54544f','74727565','774f4646','774f4632'].includes(magic))return json({error:'That file is not a supported font.'},400);
   let binary='';for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));
   const version=crypto.randomUUID();await db(`shopping_lists?id=eq.${row.id}`,{method:'PATCH',body:JSON.stringify({font_data:btoa(binary),font_type:type,font_version:version})});return json({version});
  }
  return json({error:'Not found'},404);
 }catch(e){console.error(e instanceof Error?e.message:'Request failed');return json({error:'Could not save or load. Please retry.'},500)}
});
