const clamp=(value,min,max,fallback)=>{const number=Number(value);return Number.isFinite(number)?Math.min(max,Math.max(min,number)):fallback;};
const box=(x,y,width,height)=>({x,y,width,height});
const PAD=16,GAP=12;

// Brand boxes reserve room for an image, three title lines and three subtitle
// lines. The renderer supplies padding:16px, gap:12px and a contained logo.
function brandHeight(logoSize,titleSize,orientation){
 const subtitleSize=Math.max(11,Math.round(titleSize*.65));
 const textHeight=3*titleSize*1.2+8+3*subtitleSize*1.35;
 return Math.ceil(PAD*2+(orientation==='row'?Math.max(logoSize,textHeight):logoSize+GAP+textHeight));
}

/** Native-pixel positions for the four rectangular/corner reward layouts.
 * Images stay square; every slot reserves at least two caption lines beneath it.
 * The transparent corner quadrant is deliberately outside all returned boxes.
 */
export function dropGeometry(layout,count,{fontSize=23,logoSize=148}={}){
 const n=Math.floor(clamp(count,0,12,0));
 let text=Math.round(clamp(clamp(fontSize,16,34,23)*.8,16,24,18));
 const requestedLogo=clamp(logoSize,70,200,148);
 const slots=[];
 const cardHeight=picture=>picture+Math.ceil(2*text*1.25)+PAD*2;
 let width,height,brand,picture,logo,title,orientation='column',panel='whole',empty;

 if(layout==='strip'){
  width=1200;const brandWidth=200;
  logo=Math.round(requestedLogo*.65);title=22;
  const brandH=brandHeight(logo,title,orientation),columns=Math.min(Math.max(n,1),6),rows=Math.ceil(Math.max(n,1)/columns);
  const start=PAD+brandWidth+GAP,available=width-start-PAD,slotWidth=(available-GAP*(columns-1))/columns;
  picture=Math.floor(Math.min(144,slotWidth-PAD*2));
  const slotHeight=cardHeight(picture),contentH=Math.max(brandH,rows*slotHeight+GAP*(rows-1));
  height=contentH+PAD*2;brand=box(PAD,PAD+(contentH-brandH)/2,brandWidth,brandH);
  const top=PAD+(contentH-(rows*slotHeight+GAP*(rows-1)))/2;
  for(let i=0;i<n;i++)slots.push(box(start+(i%columns)*(slotWidth+GAP),top+Math.floor(i/columns)*(slotHeight+GAP),slotWidth,slotHeight));
  if(!n)empty=box(start,PAD,available,contentH);
 }else if(layout==='rail'){
  width=260;const slotWidth=width-PAD*2;
  // Dense rails reduce the artwork and cap caption size, keeping twelve rewards
  // within roughly 1440 native pixels without hiding any reward or caption.
  orientation='row';logo=Math.round(requestedLogo*.45);title=16;picture=Math.max(28,52-n*2);
  if(n>=8)text=Math.min(text,16);
  const brandH=brandHeight(logo,title,orientation),slotHeight=cardHeight(picture),top=PAD+brandH+8,gap=6;
  brand=box(PAD,PAD,slotWidth,brandH);
  for(let i=0;i<n;i++)slots.push(box(PAD,top+i*(slotHeight+gap),slotWidth,slotHeight));
  const contentH=n?n*slotHeight+(n-1)*gap:160;
  height=top+contentH+PAD;if(!n)empty=box(PAD,top,slotWidth,contentH);
 }else if(layout==='corner'){
  panel='tiles';const slotWidth=170;
  logo=Math.round(requestedLogo*.5);title=18;picture=104;
  const brandH=brandHeight(logo,title,orientation),slotHeight=cardHeight(picture),vertical=Math.ceil(n/2),horizontal=n-vertical;
  const brandY=PAD+vertical*(slotHeight+GAP);
  width=PAD*2+slotWidth+horizontal*(slotWidth+GAP);height=brandY+Math.max(brandH,slotHeight)+PAD;
  brand=box(PAD,brandY,slotWidth,brandH);
  for(let i=0;i<vertical;i++)slots.push(box(PAD,PAD+i*(slotHeight+GAP),slotWidth,slotHeight));
  for(let i=0;i<horizontal;i++)slots.push(box(PAD+(i+1)*(slotWidth+GAP),brandY,slotWidth,slotHeight));
  if(!n){width=PAD*2+slotWidth+GAP+340;empty=box(PAD+slotWidth+GAP,PAD,340,Math.max(brandH,slotHeight));}
 }else{
  // A safe rectangular fallback also keeps malformed values from escaping.
  width=576;orientation='row';logo=Math.round(requestedLogo*.6);title=26;
  const available=width-PAD*2,brandH=brandHeight(logo,title,orientation),columns=Math.min(3,Math.ceil(Math.sqrt(Math.max(n,1)))),rows=Math.ceil(Math.max(n,1)/columns);
  const slotWidth=(available-GAP*(columns-1))/columns;
  picture=Math.floor(Math.min(156,slotWidth-PAD*2));
  const slotHeight=cardHeight(picture),top=PAD+brandH+GAP;
  brand=box(PAD,PAD,available,brandH);
  for(let i=0;i<n;i++)slots.push(box(PAD+(i%columns)*(slotWidth+GAP),top+Math.floor(i/columns)*(slotHeight+GAP),slotWidth,slotHeight));
  height=top+rows*slotHeight+GAP*(rows-1)+PAD;
  if(!n)empty=box(PAD,top,available,slotHeight);
 }
 return {width,height,brand,slots,picture,fontSize:text,logoSize:logo,titleSize:title,orientation,panel,...(empty?{empty}:{})};
}
