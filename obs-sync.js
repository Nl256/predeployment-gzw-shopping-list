import {request} from './shared.js';
import {DEFAULT_TAB,readLocal,writeLocal,getFont,newKey} from './storage.js';
import {imageIds,imageBundle} from './image-assets.js';
const running=new Map();
export function connection(id=DEFAULT_TAB){const c=readLocal(id)?.connection;return c&&/^[a-f0-9]{64}$/.test(c.edit)&&/^[a-f0-9]{64}$/.test(c.view)?c:null;}
export function startConnection(id=DEFAULT_TAB){const doc=readLocal(id);if(!doc)throw new Error('Save your list locally first.');if(!doc.connection){doc.connection={edit:newKey(),view:newKey(),created:false,fontVersion:'',syncedRevision:''};writeLocal(doc,id);}return doc.connection;}
async function withSyncLock(id,fn){if(navigator.locks)return navigator.locks.request('predeployment-obs-sync-'+id,fn);return fn();}
async function performSync(id){
 const saved=readLocal(id),c=connection(id);if(!saved||!c)return;
 if(!c.created){await request('create',c.edit,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({viewKey:c.view})});c.created=true;}
 if(saved.state.fontVersion&&c.fontVersion!==saved.state.fontVersion){const font=await getFont(saved.state.fontVersion);if(!font)throw new Error('Re-import your font to sync it to OBS.');await request('font',c.edit,{method:'POST',headers:{'Content-Type':'application/octet-stream','X-Font-Extension':font.ext,'X-Font-Version':saved.state.fontVersion},body:font.bytes});c.fontVersion=saved.state.fontVersion;}
 const signature=imageIds(saved.state).join(',');if(signature!==(c.imageSignature||'')){await request('images',c.edit,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({assets:await imageBundle(saved.state)})});c.imageSignature=signature;}
 await request('state',c.edit,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(saved.state)});
 const current=readLocal(id);if(current?.connection?.edit===c.edit){current.connection={...c,syncedRevision:saved.revision};writeLocal(current,id);}return true;
}
export function syncOBS(id=DEFAULT_TAB){if(running.has(id))return running.get(id);const task=withSyncLock(id,()=>performSync(id)).finally(()=>running.delete(id));running.set(id,task);return task;}
export async function startWheelSpin(id){
 if(running.has(id))await running.get(id);
 return withSyncLock(id,async()=>{
  await performSync(id);const before=readLocal(id),c=connection(id);if(!c)throw new Error('Connect OBS first.');
  const started=Date.now(),result=await(await request('spin',c.edit,{method:'POST'})).json(),received=Date.now();
  const doc=readLocal(id);if(doc?.connection?.edit!==c.edit)throw new Error('OBS connection changed.');
  const unchanged=doc.revision===before.revision;doc.state.wheelSpin=result.spin;doc.clockOffset=result.serverTime-(started+received)/2;doc.revision=crypto.randomUUID();if(unchanged)doc.connection.syncedRevision=doc.revision;writeLocal(doc,id);return doc;
 });
}
export async function disconnectOBS(id=DEFAULT_TAB){if(running.has(id))await running.get(id).catch(()=>{});await withSyncLock(id,async()=>{const c=connection(id);if(!c)return;await request('disconnect',c.edit,{method:'POST'});const doc=readLocal(id);if(doc?.connection?.edit===c.edit){doc.connection=null;writeLocal(doc,id);}});}
