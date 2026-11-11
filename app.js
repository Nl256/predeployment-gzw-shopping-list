import {COLOR_DEFAULTS,DEFAULTS,normalize,request,node,clamp} from './shared.js';
import {LOCAL_KEY,readLocal,writeLocal,putFont,getFont,toBase64,fromBase64} from './storage.js';
import {connection,startConnection,syncOBS,disconnectOBS} from './obs-sync.js';
const $=id=>document.getElementById(id);
const legacy=new URLSearchParams(location.hash.slice(1)),legacyKey=legacy.get('edit');
let state=normalize(),previous=null,dirty=false,saving=false,timer,toastTimer,revision='';
function notify(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,5500)}
function status(message,error=false){$('status').textContent=message;$('status').classList.toggle('error',error)}
function snapshot(){previous=structuredClone(state);$('undo').disabled=false}
function preview(){document.documentElement.style.setProperty('--accent',state.accent);$('preview').contentWindow?.postMessage({type:'preview-state',state},location.origin)}
function overlayURL(){const c=connection();if(!c?.created)return '';const url=new URL('overlay.html',location.href);url.hash=new URLSearchParams({view:c.view});return url.href;}
function updateConnectionUI(){const c=connection();const url=overlayURL();$('copyUrl').textContent=url?'↗ Copy OBS URL':'↗ Connect OBS';$('connectOBS').textContent=c?'Sync now':'Connect my OBS overlay';$('disconnectOBS').hidden=!c;$('obsUrl').textContent=url||'Connect OBS to create your own private overlay URL.';$('obsConnection').textContent=c?(c.syncedRevision===revision?'Connected · your overlay is up to date.':'Your list is saved locally. OBS is waiting for the latest changes.'):'Optional: sends a copy of this browser’s list and font online for your private OBS overlay.';}
function changed(){
 preview();dirty=true;try{const doc=readLocal()||{schema:2,connection:null};revision=crypto.randomUUID();writeLocal({...doc,state,revision});dirty=false;status('Saved on this device');updateConnectionUI();queueSync();}catch(e){status('Local save failed · export a backup',true);notify(e.message||'Browser storage is unavailable. Export a backup before closing.');}
}
function queueSync(delay=500){clearTimeout(timer);if(connection())timer=setTimeout(save,delay)}
async function save(){if(saving||dirty||!connection())return;saving=true;status('Saved locally · syncing OBS…');try{await syncOBS();const doc=readLocal();status('Saved locally · OBS connected');updateConnectionUI();if(doc.connection?.syncedRevision!==doc.revision)queueSync();}catch(e){status('Saved locally · OBS offline',true);$('obsConnection').textContent=e.message+' Your local save is safe; retrying.';queueSync(10000)}finally{saving=false}}
function download(value,name){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([value],{type:'application/json'}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
async function importState(raw,font){
 const next=normalize(raw);if(!Array.isArray(raw?.items))throw new Error('Choose an exported shopping list.');
 if(font){if(!['ttf','otf','woff','woff2'].includes(font.ext))throw new Error('Invalid font format in backup.');const bytes=fromBase64(font.data);await new FontFace('BackupValidation',bytes).load();next.fontVersion=crypto.randomUUID();next.fontName=String(font.name||next.fontName).slice(0,100);await putFont(next.fontVersion,{bytes,ext:font.ext,name:next.fontName});}
 else if(next.fontVersion&&!(await getFont(next.fontVersion))){next.fontVersion='';next.fontName=DEFAULTS.fontName;}
 snapshot();state=next;renderItems();renderSettings();changed();
}
function actionButton(label,fn){const b=node('button','',label);b.type='button';b.addEventListener('click',fn);return b}
function renderItems(){
 const target=$('items');target.replaceChildren();const done=state.items.filter(i=>i.have>=i.qty).length;
 $('count').textContent=`${state.items.length} ITEMS`;$('progressText').textContent=state.items.length?`${done} of ${state.items.length} items collected`:'Ready for your first item';$('clearDone').disabled=!done;
 if(!state.items.length){const empty=node('div','empty-state');empty.append(node('div','empty-icon','[ + ]'),node('h3','','Every deployment starts with a list.'),node('p','','Add an item above to start your next supply run.'));target.append(empty);return}
 state.items.forEach((item,index)=>{
  const row=node('div','item'+(item.have>=item.qty?' done':''));
  const toggle=actionButton(item.have>=item.qty?'✓':'',()=>{snapshot();item.have=item.have>=item.qty?0:item.qty;changed();renderItems()});toggle.className='item-toggle';toggle.setAttribute('aria-label',`Mark ${item.name} ${item.have>=item.qty?'needed':'collected'}`);
  const details=node('div');const name=node('input','item-name');name.value=item.name;name.maxLength=100;name.setAttribute('aria-label','Item name');name.addEventListener('change',()=>{snapshot();item.name=name.value.trim()||item.name;name.value=item.name;changed()});
  const note=node('input','item-note');note.value=item.note;note.maxLength=160;note.placeholder='Add a note, vendor or location…';note.setAttribute('aria-label',`Note for ${item.name}`);note.addEventListener('change',()=>{snapshot();item.note=note.value;changed()});details.append(name,note);
  const side=node('div','item-side'),stepper=node('div','stepper');
  const minus=actionButton('−',()=>{snapshot();item.have=Math.max(0,item.have-1);changed();renderItems()});minus.setAttribute('aria-label',`Collect one fewer ${item.name}`);minus.disabled=item.have===0;
  const plus=actionButton('+',()=>{snapshot();item.have=Math.min(item.qty,item.have+1);changed();renderItems()});plus.setAttribute('aria-label',`Collect one ${item.name}`);plus.disabled=item.have>=item.qty;
  const qty=node('input');qty.type='number';qty.min=1;qty.max=9999;qty.value=item.qty;qty.setAttribute('aria-label',`Quantity needed for ${item.name}`);qty.addEventListener('change',()=>{snapshot();item.qty=Math.round(clamp(qty.value,1,9999,1));item.have=Math.min(item.have,item.qty);changed();renderItems()});
  stepper.append(minus,node('span','',`${item.have} /`),qty,plus);
  const actions=node('div','item-actions');
  const up=actionButton('↑',()=>{snapshot();[state.items[index-1],state.items[index]]=[item,state.items[index-1]];changed();renderItems()});up.disabled=index===0;up.setAttribute('aria-label',`Move ${item.name} up`);
  const down=actionButton('↓',()=>{snapshot();[state.items[index+1],state.items[index]]=[item,state.items[index+1]];changed();renderItems()});down.disabled=index===state.items.length-1;down.setAttribute('aria-label',`Move ${item.name} down`);
  const del=actionButton('Remove',()=>{snapshot();state.items.splice(index,1);changed();renderItems()});del.setAttribute('aria-label',`Remove ${item.name}`);
  actions.append(up,down,del);side.append(stepper,actions);row.append(toggle,details,side);target.append(row);
 });
}
function renderSettings(){for(const k of ['title','subtitle','opacity','fontSize','logoSize','rows'])$(k).value=state[k];$('hideCompleted').checked=state.hideCompleted;$('fontName').textContent=state.fontName;renderColors();renderOutputs()}
function renderColors(){for(const k of Object.keys(COLOR_DEFAULTS)){$(k).value=state[k];$(k+'Hex').value=state[k];$(k+'Hex').setCustomValidity('')}}
function renderOutputs(){for(const k of ['opacity','fontSize','logoSize'])$(k+'Value').textContent=state[k]+(k==='opacity'?'%':'px')}
async function init(){
 document.querySelector('.brand').href=new URL('./',location.href).href;
 document.querySelectorAll('input,select,button').forEach(e=>e.disabled=true);
 try{let doc=readLocal();if(!doc){doc={schema:2,state:normalize(),revision:crypto.randomUUID(),connection:null};writeLocal(doc);}state=normalize(doc.state);revision=doc.revision;status('Saved on this device');}
 catch(e){status('Local storage unavailable',true);$('storageNotice').textContent=e.message+' Your existing save has not been replaced.';const recovery=node('button','button secondary','Download recovery copy');recovery.onclick=()=>download(localStorage.getItem(LOCAL_KEY)||'{}','shopping-list-recovery.json');$('storageNotice').append(recovery);return;}
 document.querySelectorAll('input,select,button').forEach(e=>e.disabled=false);$('undo').disabled=true;
 $('preview').src='overlay.html?preview=1&local=1';$('preview').addEventListener('load',preview);
 window.addEventListener('message',e=>{if(e.origin===location.origin&&e.source===$('preview').contentWindow&&e.data?.type==='preview-ready')preview()});
 document.querySelector('.preview-caption a').href='overlay.html?local=1';renderItems();renderSettings();preview();updateConnectionUI();queueSync();
 if(/^[a-f0-9]{64}$/.test(legacyKey||'')){$('legacyNotice').hidden=false;history.replaceState(null,'',location.pathname+location.search);}
 $('skipLegacy').onclick=()=>{$('legacyNotice').hidden=true};
 $('importLegacy').onclick=async()=>{const button=$('importLegacy');button.disabled=true;try{
  let raw;try{const draft=JSON.parse(localStorage.getItem('predeployment-draft-'+legacyKey)||'null');if(draft?.pending)raw=draft.state;}catch{}
  if(!raw)raw=await(await request('state',legacyKey)).json();let font=null;
  if(raw.fontVersion){const r=await request('font',legacyKey);const bytes=await r.arrayBuffer();const ext=(r.headers.get('Content-Type')||'font/ttf').split('/')[1].split(';')[0];font={ext,name:raw.fontName,data:toBase64(bytes)};}
  await importState(raw,font);$('legacyNotice').hidden=true;notify('Copied into this browser. Future edits are yours alone.');
 }catch(e){notify('Could not copy the old list: '+e.message)}finally{button.disabled=false}};
 $('addForm').addEventListener('submit',e=>{e.preventDefault();const name=$('itemName').value.trim();if(!name)return;if(state.items.length>=200){notify('Maximum 200 items. Remove an item first.');return}snapshot();state.items.push({id:crypto.randomUUID(),name,note:'',qty:Math.round(clamp($('itemQty').value,1,9999,1)),have:0});$('itemName').value='';$('itemQty').value=1;changed();renderItems();$('itemName').focus()});
 $('undo').onclick=()=>{if(!previous)return;const swap=state;state=previous;previous=swap;changed();renderItems();renderSettings()};
 $('clearDone').onclick=()=>{snapshot();state.items=state.items.filter(i=>i.have<i.qty);changed();renderItems()};
 for(const k of ['title','subtitle','opacity','fontSize','logoSize','rows','hideCompleted'])$(k).addEventListener('input',()=>{snapshot();state[k]=k==='hideCompleted'?$(k).checked:['opacity','fontSize','logoSize','rows'].includes(k)?Number($(k).value):$(k).value;renderOutputs();changed()});
 for(const k of Object.keys(COLOR_DEFAULTS)){
  $(k).addEventListener('input',()=>{snapshot();state[k]=$(k).value;$(k+'Hex').value=state[k];$(k+'Hex').setCustomValidity('');changed()});
  $(k+'Hex').addEventListener('input',()=>{const value=$(k+'Hex').value.trim();const valid=/^#[0-9a-f]{6}$/i.test(value);$(k+'Hex').setCustomValidity(valid?'':'Enter a six-digit hex color, such as #b9bd76.');if(valid){snapshot();state[k]=value.toLowerCase();$(k).value=state[k];changed()}});
  $(k+'Hex').addEventListener('blur',()=>{if(!$(k+'Hex').checkValidity()){$(k+'Hex').value=state[k];$(k+'Hex').setCustomValidity('');notify('Use a six-digit hex color, such as #b9bd76.')}});
 }
 $('resetColors').onclick=()=>{snapshot();Object.assign(state,COLOR_DEFAULTS);renderColors();changed();notify('Overlay colors reset. Other settings kept.')};

 async function connectAndCopy(copy){$('copyUrl').disabled=true;$('connectOBS').disabled=true;try{if(dirty)throw new Error('Export a backup: local storage is unavailable.');startConnection();updateConnectionUI();await syncOBS();updateConnectionUI();status('Saved locally · OBS connected');if(copy){try{await navigator.clipboard.writeText(overlayURL());notify('Your private OBS URL is copied. Use a 600 × 1080 browser source.')}catch{document.querySelector('details.setup').open=true;notify('Your OBS link is ready in the setup section.')}}else notify('Your personal OBS overlay is connected.');}catch(e){notify(e.message);status('Saved locally · OBS waiting',true);queueSync(10000)}finally{$('copyUrl').disabled=false;$('connectOBS').disabled=false}}
 $('copyUrl').onclick=()=>connectAndCopy(true);$('connectOBS').onclick=()=>connectAndCopy(false);
 $('disconnectOBS').onclick=async()=>{clearTimeout(timer);$('disconnectOBS').disabled=true;try{await disconnectOBS();status('Saved on this device');updateConnectionUI();notify('OBS disconnected. Your local list and font are kept.')}catch(e){notify('Reconnect to the internet to disconnect OBS. '+e.message);queueSync(10000)}finally{$('disconnectOBS').disabled=false}};
 $('fontFile').onchange=async()=>{const file=$('fontFile').files[0];if(!file)return;const ext=file.name.split('.').pop().toLowerCase();if(!['ttf','otf','woff','woff2'].includes(ext)||file.size>2097152){notify('Choose a supported font under 2 MB.');$('fontFile').value='';return}$('fontFile').disabled=true;try{const bytes=await file.arrayBuffer();await new FontFace('FontValidation',bytes).load();const version=crypto.randomUUID();await putFont(version,{bytes,ext,name:file.name});snapshot();state.fontVersion=version;state.fontName=file.name;renderSettings();changed();notify('Font saved on this device.')}catch(e){notify('Font import failed: '+e.message)}finally{$('fontFile').value='';$('fontFile').disabled=false}};
 $('resetFont').onclick=()=>{snapshot();state.fontVersion='';state.fontName=DEFAULTS.fontName;changed();renderSettings()};
 $('exportList').onclick=async()=>{try{const saved=state.fontVersion?await getFont(state.fontVersion):null;if(state.fontVersion&&!saved)throw new Error('Re-import your font before exporting a complete backup.');const font=saved?{name:saved.name,ext:saved.ext,data:toBase64(saved.bytes)}:null;download(JSON.stringify({format:'predeployment-shopping-list',version:2,state,font},null,2),'predeployment-backup.json');notify('Backup includes your list, appearance and custom font.')}catch(e){notify(e.message)}};
 $('importList').onchange=async()=>{const file=$('importList').files[0];if(!file)return;try{if(file.size>3200000)throw new Error('Backup is too large.');const raw=JSON.parse(await file.text());await importState(raw.state||raw,raw.font||null);notify('Backup restored into this browser.')}catch(e){notify(e.message)}finally{$('importList').value=''}};
 window.addEventListener('storage',e=>{if(e.key!==LOCAL_KEY)return;try{const doc=readLocal();if(!doc){location.reload();return}if(doc.revision!==revision&&!dirty){state=normalize(doc.state);revision=doc.revision;previous=null;$('undo').disabled=true;renderItems();renderSettings();preview();}updateConnectionUI();}catch(e){status('Could not read local changes',true)}});
 window.addEventListener('online',()=>queueSync(0));window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue=''}});
 if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
}
init().catch(e=>{status('Could not open local save',true);notify(e.message)});
