import {TYPES,createSpin,finishSpin,spinActive} from './type-model.js';
import {imageBundle,restoreImages} from './image-assets.js';
import {initTypeEditor} from './type-editor.js';
import {COLOR_DEFAULTS,DEFAULTS,normalize,request,node,clamp} from './shared.js';
import {DEFAULT_TAB,TABS_KEY,localKey,readTabs,createTab,updateTab,readLocal,writeLocal,putFont,getFont,toBase64,fromBase64} from './storage.js';
import {connection,startConnection,syncOBS,disconnectOBS,startWheelSpin} from './obs-sync.js';
const $=id=>document.getElementById(id);
const legacy=new URLSearchParams(location.hash.slice(1)),legacyKey=legacy.get('edit');
let activeTab=DEFAULT_TAB,state=normalize(),previous=null,dirty=false,busy=false,toastTimer,revision='',tabFormMode='new';
const syncTimers=new Map(),syncing=new Set();
function tabName(id=activeTab){return readTabs().find(t=>t.id===id)?.name||'Overlay';}
function notify(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,5500)}
function status(message,error=false){$('status').textContent=message;$('status').classList.toggle('error',error)}
function snapshot(){previous=structuredClone(state);$('undo').disabled=false}
function preview(){document.documentElement.style.setProperty('--accent',state.accent);$('preview').contentWindow?.postMessage({type:'preview-state',state,clockOffset:readLocal(activeTab)?.clockOffset||0},location.origin)}
function overlayURL(){const c=connection(activeTab);if(!c?.created)return '';const url=new URL('overlay.html',location.href);url.hash=new URLSearchParams({view:c.view});return url.href;}
function updateConnectionUI(){const c=connection(activeTab);const url=overlayURL();$('copyUrl').textContent=url?'↗ Copy OBS URL':'↗ Connect OBS';$('connectOBS').textContent=c?'Sync now':'Connect my OBS overlay';$('disconnectOBS').hidden=!c;$('obsUrl').textContent=url||'Connect OBS to create your own private overlay URL.';$('obsConnection').textContent=c?(c.syncedRevision===revision?'Connected · your overlay is up to date.':'This tab is saved locally. Its OBS output is waiting for the latest changes.'):'Optional: sends only this tab’s content, images and font online for its own OBS overlay.';}
function changed(){
 preview();dirty=true;try{const doc=readLocal(activeTab)||{schema:2,connection:null};revision=crypto.randomUUID();writeLocal({...doc,state,revision},activeTab);dirty=false;status('Saved on this device');updateConnectionUI();renderTabs();queueSync();}catch(e){status('Local save failed · export a backup',true);notify(e.message||'Browser storage is unavailable. Export a backup before closing.');}
}
function queueSync(delay=500,id=activeTab){clearTimeout(syncTimers.get(id));if(connection(id))syncTimers.set(id,setTimeout(()=>save(id),delay));}
async function save(id){
 if(syncing.has(id)||(id===activeTab&&dirty)||!connection(id))return;
 syncing.add(id);if(id===activeTab)status('Saved locally · syncing OBS…');
 try{await syncOBS(id);if(id===activeTab){status('Saved locally · OBS connected');updateConnectionUI();}const doc=readLocal(id);if(doc?.connection&&doc.connection.syncedRevision!==doc.revision)queueSync(500,id);}
 catch(e){if(id===activeTab){status('Saved locally · OBS offline',true);$('obsConnection').textContent=e.message+' Your local save is safe; retrying.';}queueSync(10000,id);}
 finally{syncing.delete(id);renderTabs();}
}
function syncPending(){for(const t of readTabs()){const d=readLocal(t.id);if(d?.connection&&d.connection.syncedRevision!==d.revision)queueSync(0,t.id);}}
function renderTabs(){
 const tabs=readTabs(),list=$('overlayTabs'),focused=list.contains(document.activeElement)?document.activeElement.id:null;list.replaceChildren();
 for(const tab of tabs.filter(t=>!t.archived)){
  const button=actionButton(tab.name,()=>switchTab(tab.id));button.id='tab-'+tab.id;button.className='overlay-tab';button.title=TYPES[readLocal(tab.id)?.state.type||'list'];button.setAttribute('role','tab');button.setAttribute('aria-selected',String(tab.id===activeTab));button.setAttribute('aria-controls','tabEditor');button.tabIndex=tab.id===activeTab?0:-1;button.disabled=busy;
  const doc=readLocal(tab.id);if(doc?.connection){const badge=node('span','tab-indicator',doc.connection.syncedRevision===doc.revision?'●':'◌');badge.setAttribute('aria-label',doc.connection.syncedRevision===doc.revision?'OBS connected':'OBS changes pending');button.append(badge);}list.append(button);
 }
 $('activeTabName').textContent=tabName();$('tabEditor').setAttribute('aria-labelledby','tab-'+activeTab);
 $('archiveTab').disabled=busy||tabs.filter(t=>!t.archived).length===1;
 const archived=tabs.filter(t=>t.archived);$('restoreWrap').hidden=!archived.length;$('restoreTab').replaceChildren(node('option','','Choose an archived tab…'));$('restoreTab').firstChild.value='';
 for(const tab of archived){const option=node('option','',tab.name);option.value=tab.id;$('restoreTab').append(option);}
 for(const id of ['newTab','renameTab','restoreTab'])$(id).disabled=busy;
 if(focused&&!busy)document.getElementById(focused)?.focus();
}
function showTabForm(mode){if(busy)return;tabFormMode=mode;$('newTypeLabel').hidden=mode!=='new';$('tabNameForm').hidden=false;$('tabNameLabel').textContent=mode==='new'?'Name your new output':'Rename this tab';$('tabName').value=mode==='new'?'':tabName();$('saveTabName').textContent=mode==='new'?'Create tab':'Save name';$('tabName').focus();}
function switchTab(id){
 if(busy){notify('Finish the current import or connection first.');return;}
 if(dirty){notify('Export a backup before switching: the current save could not be stored.');return;}
 try{const tabs=readTabs(),tab=tabs.find(t=>t.id===id&&!t.archived);if(!tab)return;
  let doc=readLocal(id);if(!doc){if(id!==DEFAULT_TAB)throw new Error('This tab’s save is missing. Restore its backup.');doc={schema:2,state:normalize(),revision:crypto.randomUUID(),connection:null};writeLocal(doc,id);}
  activeTab=id;state=normalize(doc.state);revision=doc.revision;previous=null;$('undo').disabled=true;$('tabNameForm').hidden=true;
  $('itemName').value='';$('itemQty').value=1;
  const url=new URL(location.href);if(id===DEFAULT_TAB)url.searchParams.delete('tab');else url.searchParams.set('tab',id);history.replaceState(null,'',url.pathname+url.search+url.hash);
  document.querySelector('.preview-caption a').href='overlay.html?local=1&tab='+encodeURIComponent(id);
  renderTabs();renderItems();renderSettings();preview();updateConnectionUI();const c=connection(id);status(c?(c.syncedRevision===revision?'Saved locally · OBS connected':'Saved locally · OBS changes pending'):'Saved on this device');if(c&&c.syncedRevision!==revision)queueSync();
 }catch(e){notify(e.message);}
}
async function tabOperation(fn){if(busy)return;busy=true;renderTabs();try{await fn();}catch(e){notify(e.message);}finally{busy=false;renderTabs();}}
function download(value,name){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([value],{type:'application/json'}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
async function importState(raw,font,assets){
 const next=normalize(raw);if(!Array.isArray(raw?.items))throw new Error('Choose an exported overlay backup.');
 if(font){if(!['ttf','otf','woff','woff2'].includes(font.ext))throw new Error('Invalid font format in backup.');const bytes=fromBase64(font.data);await new FontFace('BackupValidation',bytes).load();next.fontVersion=crypto.randomUUID();next.fontName=String(font.name||next.fontName).slice(0,100);await putFont(next.fontVersion,{bytes,ext:font.ext,name:next.fontName});}
 else if(next.fontVersion&&!(await getFont(next.fontVersion))){next.fontVersion='';next.fontName=DEFAULTS.fontName;}
 await restoreImages(next,assets);next.wheelSpin=null;snapshot();state=next;renderItems();renderSettings();changed();
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
function renderSettings(){for(const k of ['title','subtitle','opacity','fontSize','logoSize','rows'])$(k).value=state[k];$('hideCompleted').checked=state.hideCompleted;$('fontName').textContent=state.fontName;renderColors();renderOutputs();typeUI.render()}
function renderColors(){for(const k of Object.keys(COLOR_DEFAULTS)){$(k).value=state[k];$(k+'Hex').value=state[k];$(k+'Hex').setCustomValidity('')}}
function renderOutputs(){for(const k of ['opacity','fontSize','logoSize'])$(k+'Value').textContent=state[k]+(k==='opacity'?'%':'px')}
async function init(){
 document.querySelector('.brand').href=new URL('./',location.href).href;
 document.querySelectorAll('input,select,button').forEach(e=>e.disabled=true);
 try{const tabs=readTabs(),requested=new URLSearchParams(location.search).get('tab');activeTab=tabs.find(t=>t.id===requested&&!t.archived)?.id||tabs.find(t=>!t.archived).id;let doc=readLocal(activeTab);if(!doc){doc={schema:2,state:normalize(),revision:crypto.randomUUID(),connection:null};writeLocal(doc,activeTab);}state=normalize(doc.state);revision=doc.revision;status('Saved on this device');}
 catch(e){status('Local storage unavailable',true);$('storageNotice').textContent=e.message+' Your existing save has not been replaced.';const recovery=node('button','button secondary','Download recovery copy');recovery.onclick=()=>download(localStorage.getItem(localKey(activeTab))||'{}','shopping-list-recovery.json');$('storageNotice').append(recovery);return;}
 document.querySelectorAll('input,select,button').forEach(e=>e.disabled=false);$('undo').disabled=true;
 $('preview').src='overlay.html?preview=1&local=1';$('preview').addEventListener('load',preview);
 window.addEventListener('message',e=>{if(e.origin===location.origin&&e.source===$('preview').contentWindow&&e.data?.type==='preview-ready')preview()});
 switchTab(activeTab);syncPending();
 if(/^[a-f0-9]{64}$/.test(legacyKey||'')){$('legacyNotice').hidden=false;history.replaceState(null,'',location.pathname+location.search);}
 $('newTab').onclick=()=>showTabForm('new');$('renameTab').onclick=()=>showTabForm('rename');$('cancelTabName').onclick=()=>{$('tabNameForm').hidden=true};
 $('tabNameForm').onsubmit=e=>{e.preventDefault();if(busy||dirty){notify('Finish saving the current tab first.');return;}try{const name=$('tabName').value.trim();if(tabFormMode==='new'){const tab=createTab(name,normalize({type:$('newOutputType').value,title:$('newOutputType').value==='drops'?'TWITCH DROPS ENABLED':name.toUpperCase(),subtitle:$('newOutputType').value==='list'?'PRE-DEPLOYMENT':''}));switchTab(tab.id);}else{updateTab(activeTab,{name});renderTabs();$('tabNameForm').hidden=true;}notify('Tab saved on this device.');}catch(e){notify(e.message)}};
 $('archiveTab').onclick=()=>{if(busy||dirty)return;try{updateTab(activeTab,{archived:true});switchTab(readTabs().find(t=>!t.archived).id);notify('Tab archived. Restore it below at any time. Its OBS link stays active.');}catch(e){notify(e.message)}};
 $('restoreTab').onchange=()=>{const id=$('restoreTab').value;if(!id||busy||dirty)return;try{updateTab(id,{archived:false});switchTab(id);}catch(e){notify(e.message)}};
 $('overlayTabs').onkeydown=e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key)||busy)return;e.preventDefault();const tabs=readTabs().filter(t=>!t.archived),index=tabs.findIndex(t=>t.id===activeTab);const next=e.key==='Home'?0:e.key==='End'?tabs.length-1:(index+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;switchTab(tabs[next].id);document.getElementById('tab-'+activeTab)?.focus();};
 $('skipLegacy').onclick=()=>{$('legacyNotice').hidden=true};
 $('importLegacy').onclick=()=>tabOperation(async()=>{const button=$('importLegacy');button.disabled=true;try{
  let raw;try{const draft=JSON.parse(localStorage.getItem('predeployment-draft-'+legacyKey)||'null');if(draft?.pending)raw=draft.state;}catch{}
  if(!raw)raw=await(await request('state',legacyKey)).json();let font=null;
  if(raw.fontVersion){const r=await request('font',legacyKey);const bytes=await r.arrayBuffer();const ext=(r.headers.get('Content-Type')||'font/ttf').split('/')[1].split(';')[0];font={ext,name:raw.fontName,data:toBase64(bytes)};}
  await importState(raw,font);$('legacyNotice').hidden=true;notify('Copied into this browser. Future edits are yours alone.');
 }catch(e){notify('Could not copy the old list: '+e.message)}finally{button.disabled=false}});
 $('addForm').addEventListener('submit',e=>{e.preventDefault();const name=$('itemName').value.trim();if(!name)return;if(state.items.length>=200){notify('Maximum 200 items. Remove an item first.');return}snapshot();state.items.push({id:crypto.randomUUID(),name,note:'',qty:Math.round(clamp($('itemQty').value,1,9999,1)),have:0});$('itemName').value='';$('itemQty').value=1;changed();renderItems();$('itemName').focus()});
 $('undo').onclick=()=>{if(spinActive(state,currentTime())){notify('Wait for this spin to finish.');return;}if(!previous)return;const swap=state;state=previous;previous=swap;changed();renderItems();renderSettings()};
 $('clearDone').onclick=()=>{snapshot();state.items=state.items.filter(i=>i.have<i.qty);changed();renderItems()};
 for(const k of ['title','subtitle','opacity','fontSize','logoSize','rows','hideCompleted'])$(k).addEventListener('input',()=>{snapshot();state[k]=k==='hideCompleted'?$(k).checked:['opacity','fontSize','logoSize','rows'].includes(k)?Number($(k).value):$(k).value;renderOutputs();changed()});
 for(const k of Object.keys(COLOR_DEFAULTS)){
  $(k).addEventListener('input',()=>{snapshot();state[k]=$(k).value;$(k+'Hex').value=state[k];$(k+'Hex').setCustomValidity('');changed()});
  $(k+'Hex').addEventListener('input',()=>{const value=$(k+'Hex').value.trim();const valid=/^#[0-9a-f]{6}$/i.test(value);$(k+'Hex').setCustomValidity(valid?'':'Enter a six-digit hex color, such as #b9bd76.');if(valid){snapshot();state[k]=value.toLowerCase();$(k).value=state[k];changed()}});
  $(k+'Hex').addEventListener('blur',()=>{if(!$(k+'Hex').checkValidity()){$(k+'Hex').value=state[k];$(k+'Hex').setCustomValidity('');notify('Use a six-digit hex color, such as #b9bd76.')}});
 }
 $('resetColors').onclick=()=>{snapshot();Object.assign(state,COLOR_DEFAULTS);renderColors();changed();notify('Overlay colors reset. Other settings kept.')};

 async function connectAndCopy(copy){const id=activeTab;$('copyUrl').disabled=true;$('connectOBS').disabled=true;try{if(dirty)throw new Error('Export a backup: local storage is unavailable.');startConnection(id);updateConnectionUI();await syncOBS(id);updateConnectionUI();status('Saved locally · OBS connected');if(readLocal(id)?.connection?.syncedRevision!==readLocal(id)?.revision)queueSync(0,id);if(copy){try{await navigator.clipboard.writeText(overlayURL());notify(tabName(id)+': OBS URL copied. Add a separate 600 × 1080 browser source.')}catch{document.querySelector('details.setup').open=true;notify('This tab’s OBS link is ready below.')}}else notify(tabName(id)+': OBS overlay connected.');}catch(e){notify(e.message);status('Saved locally · OBS waiting',true);queueSync(10000,id)}finally{$('copyUrl').disabled=false;$('connectOBS').disabled=false}}
 $('copyUrl').onclick=()=>tabOperation(()=>connectAndCopy(true));$('connectOBS').onclick=()=>tabOperation(()=>connectAndCopy(false));
 $('disconnectOBS').onclick=()=>tabOperation(async()=>{const id=activeTab;clearTimeout(syncTimers.get(id));$('disconnectOBS').disabled=true;try{await disconnectOBS(id);status('Saved on this device');updateConnectionUI();notify('This tab’s OBS output is disconnected. Its local list and font are kept.')}catch(e){notify('Reconnect to the internet to disconnect OBS. '+e.message);queueSync(10000,id)}finally{$('disconnectOBS').disabled=false}});
 $('fontFile').onchange=()=>tabOperation(async()=>{const file=$('fontFile').files[0];if(!file)return;const ext=file.name.split('.').pop().toLowerCase();if(!['ttf','otf','woff','woff2'].includes(ext)||file.size>2097152){notify('Choose a supported font under 2 MB.');$('fontFile').value='';return}$('fontFile').disabled=true;try{const bytes=await file.arrayBuffer();await new FontFace('FontValidation',bytes).load();const version=crypto.randomUUID();await putFont(version,{bytes,ext,name:file.name});snapshot();state.fontVersion=version;state.fontName=file.name;renderSettings();changed();notify('Font saved for this tab.')}catch(e){notify('Font import failed: '+e.message)}finally{$('fontFile').value='';$('fontFile').disabled=false}});
 $('resetFont').onclick=()=>{snapshot();state.fontVersion='';state.fontName=DEFAULTS.fontName;changed();renderSettings()};
 $('exportList').onclick=async()=>{try{const exported=structuredClone(state),name=tabName();const saved=exported.fontVersion?await getFont(exported.fontVersion):null;if(exported.fontVersion&&!saved)throw new Error('Re-import your font before exporting a complete backup.');const font=saved?{name:saved.name,ext:saved.ext,data:toBase64(saved.bytes)}:null;download(JSON.stringify({format:'predeployment-shopping-list',version:3,name,state:{...exported,wheelSpin:null},font,images:await imageBundle(exported)},null,2),'predeployment-'+name.replace(/[^a-z0-9]+/gi,'-').toLowerCase()+'-backup.json');notify('Backup includes this tab’s content, images, appearance and font. Export other tabs separately.')}catch(e){notify(e.message)}};
 $('importList').onchange=()=>tabOperation(async()=>{const file=$('importList').files[0];if(!file)return;try{if(file.size>8000000)throw new Error('Backup is too large.');const raw=JSON.parse(await file.text());await importState(raw.state||raw,raw.font||null,raw.images);notify('Backup restored into '+tabName()+'. Other tabs are unchanged.')}catch(e){notify(e.message)}finally{$('importList').value=''}});
 window.addEventListener('storage',e=>{try{
  if(e.key===TABS_KEY){if(!readTabs().some(t=>t.id===activeTab&&!t.archived)&&!busy&&!dirty)switchTab(readTabs().find(t=>!t.archived).id);renderTabs();return;}
  if(!readTabs().some(t=>localKey(t.id)===e.key))return;
  if(e.key===localKey(activeTab)){const doc=readLocal(activeTab);if(!doc){status('Local save removed in another window',true);return;}if(doc.revision!==revision&&!dirty){state=normalize(doc.state);revision=doc.revision;previous=null;$('undo').disabled=true;renderItems();renderSettings();preview();}updateConnectionUI();}
  renderTabs();syncPending();
 }catch(e){status('Could not read local changes',true)}});
 window.addEventListener('online',syncPending);window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue=''}});
 if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
}
function currentTime(){return Date.now()+(readLocal(activeTab)?.clockOffset||0);}
function mutateType(fn,redraw=true){if(dirty){notify('Export a backup before making more changes.');return;}snapshot();fn(state);changed();if(redraw)renderSettings();}
async function spinSelected(){
 if(spinActive(state,currentTime()))return;
 await tabOperation(async()=>{const id=activeTab;document.getElementById('tabEditor').inert=true;try{
  clearTimeout(syncTimers.get(id));if(connection(id)){await startWheelSpin(id);const doc=readLocal(id);state=normalize(doc.state);revision=doc.revision;status('Saved locally · OBS connected');}
  else{state=createSpin(state,Date.now(),500);const doc=readLocal(id);doc.clockOffset=0;writeLocal(doc,id);changed();}
  previous=null;$('undo').disabled=true;renderSettings();preview();updateConnectionUI();syncPending();
 }finally{document.getElementById('tabEditor').inert=false;}});
}
const typeUI=initTypeEditor({getState:()=>state,mutate:mutateType,operation:tabOperation,notify,spin:spinSelected,now:currentTime});
setInterval(()=>{try{for(const tab of readTabs()){const doc=readLocal(tab.id);if(!doc)continue;const next=finishSpin(doc.state,Date.now()+(doc.clockOffset||0));if(next===doc.state)continue;doc.state=next;doc.revision=crypto.randomUUID();writeLocal(doc,tab.id);if(tab.id===activeTab){state=normalize(next);revision=doc.revision;renderSettings();preview();updateConnectionUI();}queueSync(0,tab.id);}}catch{}},350);
init().catch(e=>{status('Could not open local save',true);notify(e.message)});
