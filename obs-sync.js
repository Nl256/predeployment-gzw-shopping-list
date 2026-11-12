import {request} from './shared.js';
import {DEFAULT_TAB,readLocal,writeLocal,getFont,newKey} from './storage.js';
const running=new Map();
export function connection(id=DEFAULT_TAB){const c=readLocal(id)?.connection;return c&&/^[a-f0-9]{64}$/.test(c.edit)&&/^[a-f0-9]{64}$/.test(c.view)?c:null;}
export function startConnection(id=DEFAULT_TAB){const doc=readLocal(id);if(!doc)throw new Error('Save your list locally first.');if(!doc.connection){doc.connection={edit:newKey(),view:newKey(),created:false,fontVersion:'',syncedRevision:''};writeLocal(doc,id);}return doc.connection;}
async function withSyncLock(id,fn){if(navigator.locks)return navigator.locks.request('predeployment-obs-sync-'+id,fn);return fn();}
export function syncOBS(id=DEFAULT_TAB){if(running.has(id))return running.get(id);const task=withSyncLock(id,async()=>{
 const saved=readLocal(id),c=connection(id);if(!saved||!c)return;
 if(!c.created){await request('create',c.edit,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({viewKey:c.view})});c.created=true;}
 if(saved.state.fontVersion&&c.fontVersion!==saved.state.fontVersion){const font=await getFont(saved.state.fontVersion);if(!font)throw new Error('Re-import your font to sync it to OBS.');await request('font',c.edit,{method:'POST',headers:{'Content-Type':'application/octet-stream','X-Font-Extension':font.ext,'X-Font-Version':saved.state.fontVersion},body:font.bytes});c.fontVersion=saved.state.fontVersion;}
 await request('state',c.edit,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(saved.state)});
 const current=readLocal(id);if(current?.connection?.edit===c.edit){current.connection={...c,syncedRevision:saved.revision};writeLocal(current,id);}return true;
 }).finally(()=>running.delete(id));running.set(id,task);return task;}
export async function disconnectOBS(id=DEFAULT_TAB){if(running.has(id))await running.get(id).catch(()=>{});await withSyncLock(id,async()=>{const c=connection(id);if(!c)return;await request('disconnect',c.edit,{method:'POST'});const doc=readLocal(id);if(doc?.connection?.edit===c.edit){doc.connection=null;writeLocal(doc,id);}});}
