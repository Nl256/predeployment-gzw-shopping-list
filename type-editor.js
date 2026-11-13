import {node} from './shared.js';
import {PALETTE,spinActive,TYPES} from './type-model.js';
import {importImage,getImage} from './image-assets.js';
import {dropGeometry} from './drops-layout.js';
export function initTypeEditor({getState,mutate,operation,notify,spin,now}){
 const $=id=>document.getElementById(id),urls=[];let rendering=false;
 const button=(name,fn)=>{const b=node('button','text-button',name);b.type='button';b.onclick=fn;return b;};
 $('outputType').onchange=()=>{const type=$('outputType').value;mutate(s=>{s.type=type;if(['SHOPPING LIST','TWITCH DROPS ENABLED','SPIN WHEEL'].includes(s.title))s.title=type==='drops'?'TWITCH DROPS ENABLED':type==='wheel'?'SPIN WHEEL':'SHOPPING LIST';if(['GZW / NEXT DEPLOYMENT',''].includes(s.subtitle))s.subtitle=type==='list'?'GZW / NEXT DEPLOYMENT':'';});};
 $('dropFiles').onchange=()=>operation(async()=>{const files=[...$('dropFiles').files];$('dropFiles').disabled=true;try{if(getState().drops.length+files.length>12)throw new Error('Add up to 12 reward images per output.');const added=[];for(const file of files){const imageId=await importImage(file);added.push({id:crypto.randomUUID(),imageId,name:file.name.replace(/\.[^.]+$/,'').slice(0,80),watchTime:''});}if(added.length)mutate(s=>s.drops.push(...added));notify('Reward images saved on this device.');}finally{$('dropFiles').value='';$('dropFiles').disabled=false;}});
 $('rotateDrops').onchange=()=>mutate(s=>s.rotateDrops=$('rotateDrops').checked);
 $('dropLayout').onchange=()=>mutate(s=>s.dropLayout=$('dropLayout').value);
 $('rotateSeconds').onchange=()=>mutate(s=>s.rotateSeconds=Number($('rotateSeconds').value));
 $('wheelForm').onsubmit=e=>{e.preventDefault();if(spinActive(getState(),now()))return;const names=$('wheelNames').value.split(/\r?\n/).map(v=>v.trim()).filter(Boolean);if(getState().wheelEntries.length+names.length>40){notify('Maximum 40 names on a wheel.');return;}if(!names.length)return;mutate(s=>{for(const name of names)s.wheelEntries.push({id:crypto.randomUUID(),name:name.slice(0,60),color:PALETTE[s.wheelEntries.length%PALETTE.length]});s.wheelSpin=null;});$('wheelNames').value='';};
 $('removeWinner').onchange=()=>mutate(s=>s.removeWinner=$('removeWinner').checked);
 $('spinSeconds').onchange=()=>mutate(s=>s.spinSeconds=Number($('spinSeconds').value));
 $('spinWheel').onclick=()=>spin('normal');
 $('trollSpin').onclick=()=>spin('troll');
 $('clearSpinResult').onclick=()=>{if(!spinActive(getState(),now()))mutate(s=>s.wheelSpin=null);};
 function render(){if(rendering)return;rendering=true;try{const s=getState();$('outputType').value=s.type;$('dropsPanel').hidden=s.type!=='drops';$('wheelPanel').hidden=s.type!=='wheel';document.querySelector('.list-panel').hidden=s.type!=='list';$('outputKind').textContent=TYPES[s.type];
  for(const id of ['rows','hideCompleted'])$(id).closest('label').hidden=s.type!=='list';for(const id of ['noteColor','quantityColor','footerColor'])$(id).closest('.color-field').hidden=s.type!=='list';
  $('titleLabel').textContent=s.type==='drops'?'Twitch drops text line':'Overlay title';$('dropLayout').value=s.dropLayout;$('rotateDrops').checked=s.rotateDrops;$('rotateSeconds').value=s.rotateSeconds;$('removeWinner').checked=s.removeWinner;$('spinSeconds').value=s.spinSeconds;
  const isCard=s.dropLayout==='card';$('rotateDropsLabel').textContent=isCard?'Cycle rewards':'Rotate image positions';$('rotateSecondsLabel').textContent=isCard?'Seconds per reward':'Seconds per position';
  $('dropUploadHint').textContent=isCard?'PNG, JPG or WebP · up to 12 rewards, shown one at a time. Add each item’s name and optional watch time.':'PNG, JPG or WebP · up to 12 images. Add each item’s name below its image.';
  $('dropsBehaviorHint').textContent=isCard?'One numbered PD supply card appears at a time. With two or more rewards, the segmented bar fills for the selected display time, then the next reward slides in. The PD logo and text line stay fixed.':'Every image stays visible and upright. Names move with their images; the PD logo and text line stay fixed.';
  updateSize();
  for(const url of urls)URL.revokeObjectURL(url);urls.length=0;$('dropItems').replaceChildren();$('dropCount').textContent=s.drops.length+' / 12 IMAGES';
  if(!s.drops.length)$('dropItems').append(node('p','typed-editor-empty',isCard?'Upload your reward images, then add their names and optional watch times. PD supply card shows one reward at a time.':'Upload your reward images, then enter the item names below them. All images stay visible as they rotate through positions.'));
  s.drops.forEach(item=>{const card=node('div','reward-editor-card'),img=node('img'),label=node('label','','Item name'),name=node('input');img.alt=item.name;name.value=item.name;name.maxLength=80;name.setAttribute('aria-label','Name for '+item.name);name.oninput=()=>mutate(state=>{state.drops.find(d=>d.id===item.id).name=name.value.trim()||'Reward';},false);label.append(name);card.append(img,label);if(isCard){const watchLabel=node('label','reward-watch-time','Watch time (optional)'),watch=node('input');watch.value=item.watchTime||'';watch.maxLength=60;watch.placeholder='Watch 2 hours';watch.setAttribute('aria-label','Watch time for '+item.name);watch.oninput=()=>mutate(state=>{state.drops.find(d=>d.id===item.id).watchTime=watch.value.trim().slice(0,60);},false);watchLabel.append(watch);card.append(watchLabel);}card.append(button('Remove image',()=>mutate(state=>state.drops=state.drops.filter(d=>d.id!==item.id))));$('dropItems').append(card);getImage(item.imageId).then(asset=>{if(asset&&img.isConnected){const url=URL.createObjectURL(new Blob([asset.bytes],{type:asset.type}));urls.push(url);img.src=url;}}).catch(()=>{});});
  $('wheelEntries').replaceChildren();$('wheelCount').textContent=s.wheelEntries.length+' NAMES';
  s.wheelEntries.forEach(entry=>{const row=node('div','wheel-entry'),name=node('input'),color=node('input');name.value=entry.name;name.maxLength=60;name.setAttribute('aria-label','Wheel name '+entry.name);name.oninput=()=>mutate(state=>{state.wheelEntries.find(e=>e.id===entry.id).name=name.value.trim()||entry.name;state.wheelSpin=null;},false);color.type='color';color.value=entry.color;color.setAttribute('aria-label','Slice color for '+entry.name);color.oninput=()=>mutate(state=>{state.wheelEntries.find(e=>e.id===entry.id).color=color.value;state.wheelSpin=null;},false);row.append(color,name,button('Remove '+entry.name,()=>mutate(state=>{state.wheelEntries=state.wheelEntries.filter(e=>e.id!==entry.id);state.wheelSpin=null;})));$('wheelEntries').append(row);});tick();
 }finally{rendering=false;}}
 function tick(){const s=getState(),active=spinActive(s,now());$('outputType').disabled=active;for(const el of $('wheelPanel').querySelectorAll('input,textarea,select,button'))el.disabled=active;$('spinWheel').disabled=active||s.wheelEntries.length<2;$('trollSpin').disabled=active||s.wheelEntries.length<2;$('clearSpinResult').disabled=active||!s.wheelSpin;
  let text='Add at least two names, then spin.';if(s.wheelEntries.length>=2)text='Every name has an equal chance.';if(s.wheelSpin){const p=s.wheelSpin;const remaining=p.startedAt-now();text=active?(remaining>0?'Starting in '+Math.ceil(remaining/1000)+'…':'Spinning…'):'Winner: '+p.winnerName+(p.removeWinner?' · removed from the next spin':'');}$('wheelStatus').textContent=text;
 }
 function updateSize(){const s=getState(),customDrops=s.type==='drops'&&s.dropLayout!=='orbit',geometry=customDrops?dropGeometry(s.dropLayout,s.drops.length,s):null;
  const width=geometry?geometry.width+24:600,height=geometry?geometry.height+24:1080;
  $('obsWidth').textContent=width;$('obsHeight').textContent=height;$('dropSourceSize').textContent=width+' × '+height;
  const stage=document.querySelector('.preview-stage');stage.classList.toggle('shaped-preview',customDrops);stage.style.setProperty('--preview-ratio',String(width/height));
 }
 setInterval(tick,250);return {render,tick,updateSize};
}

