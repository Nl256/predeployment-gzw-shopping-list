export const TYPES={list:'Shopping list',drops:'Twitch drops',wheel:'Spin wheel'};
export const DROP_LAYOUTS={orbit:'Circular orbit',strip:'Bottom strip',grid:'Reward grid',rail:'Side rail',corner:'Corner frame'};
export const PALETTE=['#b9bd76','#547e80','#a86c58','#7077ab','#639273','#b28a4d'];
export const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const limit=(v,min,max,fallback)=>Number.isFinite(Number(v))?Math.min(max,Math.max(min,Number(v))):fallback;
const color=(v,fallback)=>/^#[a-f0-9]{6}$/i.test(v)?v.toLowerCase():fallback;
const spinMode=value=>value==='troll'?'troll':'normal';
export function spinProgress(progress,mode='normal'){
 const t=limit(progress,0,1,0);if(spinMode(mode)!=='troll')return 1-Math.pow(1-t,4);
 // Ease almost to a stop, then accelerate again and settle at the same endpoint.
 // Both curves have zero velocity and acceleration at their shared boundary.
 if(t<=.58)return .62*(1-Math.pow(1-t/.58,3));
 const u=(t-.58)/.42;return .62+.38*(6*u**5-15*u**4+10*u**3);
}
export function entries(raw){const seen=new Set();return (Array.isArray(raw)?raw:[]).slice(0,40).filter(e=>e&&typeof e.name==='string'&&e.name.trim()).map((e,i)=>{let id=UUID.test(e.id)?e.id:crypto.randomUUID();if(seen.has(id))id=crypto.randomUUID();seen.add(id);return {id,name:e.name.trim().slice(0,60),color:color(e.color,PALETTE[i%PALETTE.length])};});}
export function spinRotation(index,count,from=0){const target=(360-(index+.5)*360/count)%360;return from+360*6+((target-from%360+360)%360);}
export function normalizeTypes(raw){
 const type=Object.hasOwn(TYPES,raw.type)?raw.type:'list';
 const drops=(Array.isArray(raw.drops)?raw.drops:[]).slice(0,12).filter(d=>d&&UUID.test(d.imageId)).map(d=>({id:UUID.test(d.id)?d.id:crypto.randomUUID(),imageId:d.imageId,name:String(d.name||'Reward').slice(0,80)}));
 const wheelEntries=entries(raw.wheelEntries);let wheelSpin=null;const p=raw.wheelSpin;
 if(p&&UUID.test(p.id)&&Number.isFinite(p.startedAt)&&p.startedAt>0){const roster=entries(p.entries),winner=roster.find(e=>e.id===p.winnerId);if(winner){const from=limit(p.from,0,360000000,0);wheelSpin={id:p.id,mode:spinMode(p.mode),startedAt:p.startedAt,duration:limit(p.duration,6000,15000,8000),from,to:spinRotation(roster.indexOf(winner),roster.length,from),winnerId:winner.id,winnerName:winner.name,entries:roster,removeWinner:p.removeWinner===true,settled:p.settled===true};}}
 return {type,drops,dropLayout:typeof raw.dropLayout==='string'&&Object.hasOwn(DROP_LAYOUTS,raw.dropLayout)?raw.dropLayout:'orbit',rotateSeconds:limit(raw.rotateSeconds,2,30,5),rotateDrops:raw.rotateDrops!==false,wheelEntries,removeWinner:raw.removeWinner===true,spinSeconds:limit(raw.spinSeconds,6,15,8),wheelSpin};
}
export function randomIndex(count){if(!Number.isInteger(count)||count<1)throw new Error('Add at least one name.');const bound=Math.floor(4294967296/count)*count;let value;do{value=crypto.getRandomValues(new Uint32Array(1))[0];}while(value>=bound);return value%count;}
export function spinActive(state,now=Date.now()){return !!state.wheelSpin&&now<state.wheelSpin.startedAt+state.wheelSpin.duration;}
export function finishSpin(state,now=Date.now()){
 const spin=state.wheelSpin;if(!spin||spin.settled||now<spin.startedAt+spin.duration)return state;
 return {...state,wheelEntries:spin.removeWinner?state.wheelEntries.filter(e=>e.id!==spin.winnerId):state.wheelEntries,wheelSpin:{...spin,settled:true}};
}
export function createSpin(state,now=Date.now(),delay=2500,mode='normal'){
 if(state.type!=='wheel')throw new Error('Choose a spin wheel output.');if(spinActive(state,now))throw new Error('The wheel is already spinning.');
 state=finishSpin(state,now);const roster=entries(state.wheelEntries);if(roster.length<2)throw new Error('Add at least two names to spin.');const index=randomIndex(roster.length),from=state.wheelSpin?state.wheelSpin.to%360:0;
 return {...state,wheelSpin:{id:crypto.randomUUID(),mode:spinMode(mode),startedAt:now+delay,duration:state.spinSeconds*1000,from,to:spinRotation(index,roster.length,from),winnerId:roster[index].id,winnerName:roster[index].name,entries:roster,removeWinner:state.removeWinner,settled:false}};
}
