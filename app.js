import {DEFAULTS,normalize,request,node,clamp} from './shared.js';
const $=id=>document.getElementById(id);
const params=new URLSearchParams(location.hash.slice(1)),key=params.get('edit'),view=params.get('view');
let state=normalize(),previous=null,dirty=false,saving=false,timer,toastTimer;
const cacheKey='predeployment-draft-'+(key||'none');
function notify(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,4500)}
function status(message,error=false){$('status').textContent=message;$('status').classList.toggle('error',error)}
const overlayUrl=new URL('overlay.html',location.href);overlayUrl.hash=new URLSearchParams({view:view||''}).toString();
function snapshot(){previous=structuredClone(state);$('undo').disabled=false}
function preview(){document.documentElement.style.setProperty('--accent',state.accent);$('preview').contentWindow?.postMessage({type:'preview-state',state},location.origin)}
function localCache(){try{localStorage.setItem(cacheKey,JSON.stringify({pending:dirty,state}))}catch{}}
function changed(){dirty=true;localCache();preview();status('Saving…');clearTimeout(timer);timer=setTimeout(save,300)}
async function save(){
 if(saving||!dirty)return;saving=true;dirty=false;const current=JSON.stringify(state);
 try{await request('state',key,{method:'POST',headers:{'Content-Type':'application/json'},body:current});status(dirty?'Saving…':'Saved · live sync');localCache()}
 catch(e){dirty=true;status('Not synced · retrying',true);notify(e.message)}
 finally{saving=false;if(dirty){clearTimeout(timer);timer=setTimeout(save,3000)}}
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
function renderSettings(){for(const k of ['title','subtitle','accent','opacity','fontSize','logoSize','rows'])$(k).value=state[k];$('hideCompleted').checked=state.hideCompleted;$('fontName').textContent=state.fontName;renderOutputs()}
function renderOutputs(){for(const k of ['opacity','fontSize','logoSize'])$(k+'Value').textContent=state[k]+(k==='opacity'?'%':'px')}
async function init(){
 document.querySelector('.brand').href=location.href;
 if(!/^[a-f0-9]{64}$/.test(key||'')||!/^[a-f0-9]{64}$/.test(view||'')){
  document.body.replaceChildren();const welcome=node('main','welcome panel');const logo=node('img');logo.src='logo.png';logo.alt='Pre-Deployment';welcome.append(logo,node('h1','','Your next deployment starts here.'),node('p','','Open the private control link supplied with this overlay to manage the shopping list. The regular site address does not grant access to a list.'));document.body.append(welcome);return;
 }
 $('obsUrl').textContent=overlayUrl.href;document.querySelector('.preview-caption a').href=overlayUrl.href;
 $('preview').src=overlayUrl.href.replace('#','?preview=1#');$('preview').addEventListener('load',preview);
 document.querySelectorAll('input,select,button').forEach(e=>e.disabled=true);
 try{state=normalize(await(await request('state',key)).json());const draft=JSON.parse(localStorage.getItem(cacheKey)||'null');if(draft?.pending){state=normalize(draft.state);dirty=true;notify('Restored unsynced changes. Retrying now.')}status('Saved · live sync')}
 catch(e){status('Connection unavailable',true);notify(e.message);const draft=JSON.parse(localStorage.getItem(cacheKey)||'null');if(draft){state=normalize(draft.state);dirty=!!draft.pending}else{const retry=node('button','button primary','Retry connection');retry.onclick=()=>location.reload();document.querySelector('.intro').append(retry);return}}
 document.querySelectorAll('input,select,button').forEach(e=>e.disabled=false);$('undo').disabled=true;renderItems();renderSettings();preview();if(dirty)save();
 $('addForm').addEventListener('submit',e=>{e.preventDefault();const name=$('itemName').value.trim();if(!name)return;if(state.items.length>=200){notify('Maximum 200 items. Remove an item first.');return}snapshot();state.items.push({id:crypto.randomUUID(),name,note:'',qty:Math.round(clamp($('itemQty').value,1,9999,1)),have:0});$('itemName').value='';$('itemQty').value=1;changed();renderItems();$('itemName').focus()});
 $('undo').onclick=()=>{if(!previous)return;const swap=state;state=previous;previous=swap;changed();renderItems();renderSettings()};
 $('clearDone').onclick=()=>{snapshot();state.items=state.items.filter(i=>i.have<i.qty);changed();renderItems()};
 for(const k of ['title','subtitle','accent','opacity','fontSize','logoSize','rows','hideCompleted'])$(k).addEventListener('input',()=>{snapshot();state[k]=k==='hideCompleted'?$(k).checked:['opacity','fontSize','logoSize','rows'].includes(k)?Number($(k).value):$(k).value;renderOutputs();changed()});
 $('copyUrl').onclick=async()=>{try{await navigator.clipboard.writeText(overlayUrl.href);notify('OBS URL copied. Use a 600 × 1080 browser source.')}catch{notify('Copy the URL from the OBS setup section below.');document.querySelector('details').open=true}};
 $('fontFile').onchange=async()=>{
  const file=$('fontFile').files[0];if(!file)return;const ext=file.name.split('.').pop().toLowerCase();
  if(!['ttf','otf','woff','woff2'].includes(ext)||file.size>2097152){notify('Choose a TTF, OTF, WOFF or WOFF2 font under 2 MB.');$('fontFile').value='';return}
  $('fontFile').disabled=true;status('Importing font…');
  try{const bytes=await file.arrayBuffer();await new FontFace('FontValidation',bytes).load();const result=await(await request('font',key,{method:'POST',headers:{'Content-Type':'application/octet-stream','X-Font-Extension':ext},body:bytes})).json();snapshot();state.fontVersion=result.version;state.fontName=file.name;renderSettings();changed();notify('Font imported. Your OBS overlay will update automatically.')}
  catch(e){notify('Font import failed: '+e.message);status('Font not imported',true)}finally{$('fontFile').value='';$('fontFile').disabled=false}
 };
 $('resetFont').onclick=()=>{snapshot();state.fontVersion='';state.fontName=DEFAULTS.fontName;changed();renderSettings()};
 $('exportList').onclick=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(state,null,2)],{type:'application/json'}));a.download='predeployment-list.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};
 $('importList').onchange=async()=>{const file=$('importList').files[0];if(!file)return;try{if(file.size>262144)throw new Error('File is too large.');const raw=JSON.parse(await file.text());if(!Array.isArray(raw.items))throw new Error('Choose an exported shopping list.');snapshot();state=normalize({...raw,fontVersion:state.fontVersion,fontName:state.fontName});changed();renderItems();renderSettings();notify('List imported. Current font preserved.')}catch(e){notify(e.message)}finally{$('importList').value=''}};
 window.addEventListener('beforeunload',e=>{if(dirty||saving){e.preventDefault();e.returnValue=''}});
}
init().catch(e=>{status('Could not open controls',true);notify(e.message)});
