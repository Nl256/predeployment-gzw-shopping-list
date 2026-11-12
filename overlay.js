import {normalize,request,node,loadFont} from './shared.js';
import {DEFAULT_TAB,localKey,readLocal} from './storage.js';
const $=id=>document.getElementById(id),params=new URLSearchParams(location.hash.slice(1));
const key=params.get('view')||'',isPreview=new URLSearchParams(location.search).has('preview'),isLocal=isPreview||new URLSearchParams(location.search).has('local');
const requestedTab=new URLSearchParams(location.search).get('tab'),localTab=requestedTab===DEFAULT_TAB||/^[a-f0-9-]{36}$/.test(requestedTab||'')?requestedTab:DEFAULT_TAB;
let state=normalize(),page=0,last='',loadedVersion='',fontGeneration=0;
function fit(){const card=$('overlayCard');card.style.width='576px';card.style.transform='none';const scale=Math.min((innerWidth-24)/576,(innerHeight-24)/card.offsetHeight,1);card.style.transform=`scale(${Math.max(.1,scale)})`}
function render(){
 document.documentElement.style.setProperty('--accent',state.accent);
 for(const [css,key] of Object.entries({'--title-color':'titleColor','--item-color':'textColor','--note-color':'noteColor','--quantity-color':'quantityColor','--subtitle-color':'subtitleColor','--footer-color':'footerColor'}))document.documentElement.style.setProperty(css,state[key]);
 const rgb=[1,3,5].map(i=>parseInt(state.backgroundColor.slice(i,i+2),16));
 $('overlayCard').style.background=`rgba(${rgb.join(',')},${state.opacity/100})`;
 $('overlayCard').style.borderColor=state.accent+'55';$('overlayCard').style.borderTopColor=state.accent;
 $('overlayTitle').textContent=state.title||'SHOPPING LIST';$('overlaySubtitle').textContent=state.subtitle;$('overlayLogo').style.height=state.logoSize+'px';
 const items=state.items.filter(i=>!state.hideCompleted||i.have<i.qty),pages=Math.max(1,Math.ceil(items.length/state.rows));page%=pages;
 const list=$('overlayItems');list.replaceChildren();
 if(!items.length){const empty=node('div','overlay-empty');empty.append(node('strong','',state.items.length?'ALL SUPPLIES SECURED':'AWAITING REQUISITIONS'),node('span','',state.items.length?'Ready for the next deployment.':'Your shopping list will appear here.'));list.append(empty)}
 for(const item of items.slice(page*state.rows,(page+1)*state.rows)){
  const row=node('div','overlay-row'+(item.have>=item.qty?' done':''));row.style.fontSize=state.fontSize+'px';
  const info=node('div');info.append(node('div','overlay-item-name',item.name));if(item.note)info.append(node('div','overlay-note',item.note));
  row.append(node('span','overlay-checkbox',item.have>=item.qty?'✓':''),info,node('span','overlay-qty',`${item.have} / ${item.qty}`));list.append(row);
 }
 const total=state.items.reduce((n,i)=>n+i.qty,0),have=state.items.reduce((n,i)=>n+i.have,0);
 $('overlayProgress').textContent=total?`${have} / ${total} SUPPLIES COLLECTED`:'PREPARE. DEPLOY. RETURN.';
 $('overlayPage').textContent=pages>1?`${page+1} / ${pages}`:'GZW';$('overlayBar').style.width=(total?have/total*100:0)+'%';requestAnimationFrame(fit);
 if(loadedVersion!==state.fontVersion){loadedVersion=state.fontVersion;const generation=++fontGeneration;document.body.style.setProperty('--overlay-font','var(--display)');if(state.fontVersion)loadFont(state.fontVersion,isLocal?null:key).then(()=>{if(generation===fontGeneration){document.body.style.setProperty('--overlay-font',"'ImportedOverlay', sans-serif");fit()}}).catch(()=>{if(generation===fontGeneration)loadedVersion=''})}
}
function update(raw){const next=JSON.stringify(raw);if(next===last)return;last=next;state=normalize(raw);render()}
async function poll(){try{update(await(await request('state',key)).json());document.querySelector('.offline')?.remove()}catch{if(!isPreview&&!document.querySelector('.offline'))document.body.append(node('div','offline','SYNC OFFLINE · reconnecting'))}finally{if(!isPreview)setTimeout(poll,4000)}}
window.addEventListener('resize',fit);$('overlayLogo').addEventListener('load',fit);
if(isPreview){window.addEventListener('message',e=>{if(e.origin===location.origin&&e.source===parent&&e.data?.type==='preview-state')update(e.data.state)});parent.postMessage({type:'preview-ready'},location.origin);}
if(isLocal){try{update(readLocal(localTab)?.state||{});}catch{render();}window.addEventListener('storage',e=>{if(!isPreview&&e.key===localKey(localTab))try{update(readLocal(localTab)?.state||{});}catch{}});setInterval(()=>{page++;render()},10000);}
else if(/^[a-f0-9]{64}$/.test(key)){render();poll();setInterval(()=>{page++;render()},10000)}else{document.body.classList.add('error-view');document.body.append(node('div','offline','Connect OBS from your shopping list and copy its URL.'))}
