import {node} from './shared.js';
import {imageBlob} from './image-assets.js';
import {spinProgress} from './type-model.js';
import {dropGeometry,dropSlide,dropPosition,dropCardFrame} from './drops-layout.js';
const NS='http://www.w3.org/2000/svg';
const svg=(tag,attrs={})=>{const e=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,String(v));return e;};
export function createTypeRenderer(root,{key='',now=()=>Date.now(),fit=()=>{}}={}){
 let state,signature='',cards=[],rotor,result,raf,geometry=null,carousel=null;const images=new Map(),reduced=matchMedia('(prefers-reduced-motion: reduce)');
 function imageURL(id){if(!images.has(id)){const entry={url:null};entry.promise=imageBlob(id,key).then(blob=>{entry.url=URL.createObjectURL(blob);return entry.url;}).catch(e=>{images.delete(id);signature='';throw e;});images.set(id,entry);}return images.get(id).promise;}
 function set(next){state=next;const roster=state.wheelSpin?.entries||state.wheelEntries;const sig=JSON.stringify([state.type,state.type==='drops'?state.drops:roster,state.wheelSpin?.id,state.fontSize,state.logoSize,state.dropLayout,state.title,state.subtitle]);if(sig===signature)return;signature=sig;root.replaceChildren();root.style.width='';root.style.height='';cards=[];rotor=null;result=null;geometry=null;carousel=null;
  const used=new Set(state.type==='drops'?state.drops.map(d=>d.imageId):[]);for(const [id,entry] of images)if(!used.has(id)){entry.promise.then(url=>URL.revokeObjectURL(url)).catch(()=>{});images.delete(id);}
  if(state.type==='drops'){
   if(state.dropLayout==='card'){buildTwitchCard();fit();tick();return;}
   const custom=state.dropLayout!=='orbit';root.className='typed-content '+(custom?'drops-layout drops-'+state.dropLayout:'drops-orbit');
   if(custom){geometry=dropGeometry(state.dropLayout,state.drops.length,state);root.style.width=geometry.width+'px';root.style.height=geometry.height+'px';root.dataset.panel=geometry.panel;
    const brand=node('header','drops-brand'),logo=node('img'),text=node('div','drops-brand-text'),title=node('h1','',state.title||'TWITCH DROPS');logo.src='logo.png';logo.alt='Pre-Deployment';logo.width=geometry.logoSize;logo.height=geometry.logoSize;brand.dataset.direction=geometry.orientation;title.style.fontSize=geometry.titleSize+'px';text.append(title);if(state.subtitle){const sub=node('p','',state.subtitle);sub.style.fontSize=Math.max(12,geometry.titleSize*.65)+'px';text.append(sub);}brand.append(logo,text);place(brand,geometry.brand);root.append(brand);
   }
   if(!state.drops.length){const empty=node('div','typed-empty','Add reward images and item names in your controls.');if(geometry?.empty)place(empty,geometry.empty);root.append(empty);}
   const count=state.drops.length,side=count<2?190:Math.min(174,Math.floor(368*Math.sin(Math.PI/count)/1.42)-8),picture=geometry?geometry.picture:Math.max(28,side-40);
   for(const item of state.drops){const card=node('figure','drop-card'),img=node('img'),caption=node('figcaption','',item.name);if(!geometry)card.style.width=side+'px';img.width=picture;img.height=picture;img.alt=item.name;caption.title=item.name;caption.style.fontSize=(geometry?geometry.fontSize:Math.min(state.fontSize*.75,Math.max(9,side/8)))+'px';card.append(img,caption);root.append(card);cards.push(card);imageURL(item.imageId).then(url=>{if(img.isConnected){img.src=url;fit();}}).catch(()=>{if(img.isConnected)img.alt='Image unavailable: '+item.name;});}
  }else if(state.type==='wheel'){
   root.className='typed-content wheel-stage';const drawing=svg('svg',{viewBox:'0 0 520 520',role:'img','aria-label':'Spin wheel'});rotor=svg('g');const entries=roster||[],n=entries.length;
   if(!n)drawing.append(svg('circle',{cx:260,cy:260,r:238,fill:'#283023',stroke:'var(--accent)','stroke-width':2}));
   entries.forEach((entry,index)=>{const a=index/n*Math.PI*2-Math.PI/2,b=(index+1)/n*Math.PI*2-Math.PI/2,mid=(a+b)/2,r=238;const path=n===1?svg('circle',{cx:260,cy:260,r,fill:entry.color}):svg('path',{d:`M 260 260 L ${260+r*Math.cos(a)} ${260+r*Math.sin(a)} A ${r} ${r} 0 ${b-a>Math.PI?1:0} 1 ${260+r*Math.cos(b)} ${260+r*Math.sin(b)} Z`,fill:entry.color,stroke:'#101410','stroke-width':2});rotor.append(path);
    const x=260+151*Math.cos(mid),y=260+151*Math.sin(mid),size=Math.max(8,Math.min(20,state.fontSize,Math.floor(380/n),Math.floor(150/Math.max(5,entry.name.length)*1.5)));
    const label=svg('text',{x,y,'text-anchor':'middle','dominant-baseline':'middle',transform:`rotate(${mid*180/Math.PI},${x},${y})`,'font-size':size,'font-weight':700,fill:contrast(entry.color),'font-family':'var(--overlay-font)'});label.textContent=entry.name;rotor.append(label);
   });drawing.append(rotor);const hub=Math.min(76,Math.max(40,state.logoSize*.43)),logoSize=hub*2-18;drawing.append(svg('circle',{cx:260,cy:260,r:hub,fill:'#101510',stroke:'var(--accent)','stroke-width':3}));const logo=svg('image',{href:'logo.png',x:260-logoSize/2,y:260-logoSize/2,width:logoSize,height:logoSize,'aria-label':'Pre-Deployment'});drawing.append(logo);drawing.append(svg('path',{d:'M 244 7 L 276 7 L 260 36 Z',fill:'var(--accent)',stroke:'#111','stroke-width':2}));root.append(drawing);result=node('div','wheel-result');result.setAttribute('role','status');root.append(result);
  }else root.className='typed-content';fit();tick();
 }
 function buildTwitchCard(){
  geometry=dropGeometry('card',state.drops.length,state);root.className='typed-content drops-layout drops-card';root.dataset.panel='whole';root.style.width=geometry.width+'px';root.style.height=geometry.height+'px';
  const header=node('header','twitch-card-header'),logo=node('img'),title=node('h1','',state.title||'TWITCH DROPS'),counter=node('span','twitch-card-count');
  logo.src='logo.png';logo.alt='Pre-Deployment';logo.width=geometry.logoSize;logo.height=geometry.logoSize;title.style.fontSize=geometry.titleSize+'px';header.append(logo,title,counter);place(header,geometry.brand);root.append(header);
  const viewport=node('div','twitch-card-window');place(viewport,geometry.viewport);root.append(viewport);
  if(!state.drops.length)viewport.append(node('div','typed-empty','Upload reward images to start your Twitch card.'));
  for(const item of state.drops){
   const card=node('article','twitch-reward'),img=node('img','twitch-reward-image'),info=node('div','twitch-reward-info'),name=node('h2','twitch-reward-name',item.name);
   img.width=geometry.picture;img.height=geometry.picture;img.alt=item.name;name.title=item.name;name.style.fontSize=geometry.fontSize+'px';info.append(name);
   if(item.watchTime){const watch=node('p','twitch-reward-watch',item.watchTime);watch.style.fontSize=Math.max(12,geometry.fontSize*.65)+'px';info.append(watch);}
   if(state.subtitle)info.append(node('p','twitch-reward-subtitle',state.subtitle));
   card.append(img,info);viewport.append(card);cards.push(card);imageURL(item.imageId).then(url=>{if(img.isConnected)img.src=url;}).catch(()=>{if(img.isConnected)img.alt='Image unavailable: '+item.name;});
  }
  const track=node('div','twitch-card-timer'),bar=node('span');track.setAttribute('role','progressbar');track.setAttribute('aria-label','Time until next reward');track.setAttribute('aria-valuemin','0');track.setAttribute('aria-valuemax','100');track.append(bar);root.append(track);carousel={counter,track,bar};
 }
 function tick(){cancelAnimationFrame(raf);if(!state||state.type==='list')return;
  if(carousel){
   const n=cards.length,frame=dropCardFrame(now(),state.rotateSeconds,n,{rotate:state.rotateDrops,reduced:reduced.matches});
   cards.forEach((card,i)=>{const current=i===frame.current,previous=i===frame.previous&&frame.slide<1;card.hidden=!current&&!previous;card.setAttribute('aria-hidden',String(!current));if(!card.hidden)card.style.transform=`translateX(${current?(1-frame.slide)*100:-frame.slide*100}%)`;});
   const label=n?(frame.current+1)+' / '+n:'0 / 0';if(carousel.counter.textContent!==label)carousel.counter.textContent=label;
   carousel.track.hidden=n<2||!state.rotateDrops||reduced.matches;carousel.bar.style.transform=`scaleX(${frame.progress})`;const percent=String(Math.floor(frame.progress*100));if(carousel.track.getAttribute('aria-valuenow')!==percent)carousel.track.setAttribute('aria-valuenow',percent);
  }else if(state.type==='drops'&&cards.length){const n=cards.length,rotating=state.rotateDrops&&!reduced.matches;if(geometry){const {step,progress}=rotating?dropSlide(now(),state.rotateSeconds):{step:0,progress:0};cards.forEach((card,i)=>{const from=geometry.slots[(i+step)%n],to=geometry.slots[(i+step+1)%n],position=dropPosition(state.dropLayout,from,to,progress);card.style.width=from.width+'px';card.style.height=from.height+'px';card.style.transform=`translate(${position.x}px,${position.y}px)`;});}else{const phase=rotating?now()/(state.rotateSeconds*1000)*2*Math.PI/n:0;cards.forEach((card,i)=>{const angle=i*2*Math.PI/n+phase-Math.PI/2;const radius=n===1?0:184;card.style.transform=`translate(-50%,-50%) translate(${radius*Math.cos(angle)}px,${radius*Math.sin(angle)}px)`;});}}
  if(state.type==='wheel'&&rotor){const spin=state.wheelSpin;let angle=0,message=state.wheelEntries.length?'Ready to spin':'Add names to get started';if(spin){const elapsed=now()-spin.startedAt,t=Math.min(1,Math.max(0,elapsed/spin.duration)),ease=spinProgress(t,spin.mode);angle=spin.from+(spin.to-spin.from)*(reduced.matches?(t===1?1:0):ease);message=elapsed<0?'Starting in '+Math.max(1,Math.ceil(-elapsed/1000))+'…':t<1?'Spinning…':spin.winnerName;result.classList.toggle('has-winner',t>=1);result.dataset.winner=t>=1?spin.winnerId:'';}else{result.classList.remove('has-winner');result.dataset.winner='';}rotor.setAttribute('transform',`rotate(${angle},260,260)`);if(result.textContent!==message)result.textContent=message;}
  raf=requestAnimationFrame(tick);
 }
 return {set};
}
function place(element,box){element.style.left=box.x+'px';element.style.top=box.y+'px';element.style.width=box.width+'px';element.style.height=box.height+'px';}
function contrast(hex){const v=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));return v[0]*.299+v[1]*.587+v[2]*.114>145?'#12180e':'#ffffff';}
