import {request} from './shared.js';
import {readLocal,writeLocal,getFont,newKey} from './storage.js';
let running=false;
export function connection(){const c=readLocal()?.connection;return c&&/^[a-f0-9]{64}$/.test(c.edit)&&/^[a-f0-9]{64}$/.test(c.view)?c:null;}
export function startConnection(){const doc=readLocal();if(!doc)throw new Error('Save your list locally first.');if(!doc.connection){doc.connection={edit:newKey(),view:newKey(),created:false,fontVersion:'',syncedRevision:''};writeLocal(doc);}return doc.connection;}
async function withSyncLock(fn){if(navigator.locks)return navigator.locks.request('predeployment-obs-sync',fn);return fn();}
export async function syncOBS(){if(running)return;running=true;try{return await withSyncLock(async()=>{
 const saved=readLocal(),c=connection();if(!saved||!c)return;
 if(!c.created){await request('create',c.edit,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({viewKey:c.view})});c.created=true;}
 if(saved.state.fontVersion&&c.fontVersion!==saved.state.fontVersion){const font=await getFont(saved.state.fontVersion);if(!font)throw new Error('Re-import your font to sync it to OBS.');await request('font',c.edit,{method:'POST',headers:{'Content-Type':'application/octet-stream','X-Font-Extension':font.ext,'X-Font-Version':saved.state.fontVersion},body:font.bytes});c.fontVersion=saved.state.fontVersion;}
 await request('state',c.edit,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(saved.state)});
 const current=readLocal();if(current?.connection?.edit===c.edit){current.connection={...c,syncedRevision:saved.revision};writeLocal(current);}return true;
 });}finally{running=false}}
export async function disconnectOBS(){await withSyncLock(async()=>{const c=connection();if(!c)return;await request('disconnect',c.edit,{method:'POST'});const doc=readLocal();if(doc?.connection?.edit===c.edit){doc.connection=null;writeLocal(doc);}});}
