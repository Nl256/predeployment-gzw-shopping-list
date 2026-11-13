const limit=(value,min,max,fallback)=>Number.isFinite(Number(value))?Math.min(max,Math.max(min,Number(value))):fallback;

// A square board keeps its source dimensions stable as cells are marked. The
// header alone adapts to the shared font and logo controls.
export function bingoGeometry(state={}){
 const size=[3,4,5].includes(Number(state.bingoSize))?Number(state.bingoSize):5;
 const fontSize=limit(state.fontSize,16,34,23),logoSize=Math.round(limit(state.logoSize,70,200,148)*.6);
 const titleSize=Math.round(limit(fontSize*.95,18,28,22)),subtitleSize=12;
 const headerHeight=Math.ceil(Math.max(108,logoSize+16,22+2*titleSize*1.15+2*subtitleSize*1.3));
 const width=576,gap=6,boardSize=536;
 return {width,height:headerHeight+624,size,gap,cellSize:(boardSize-(size-1)*gap)/size,fontSize,logoSize,titleSize,subtitleSize,
  header:{x:20,y:12,width:536,height:headerHeight},
  board:{x:20,y:headerHeight+24,width:boardSize,height:boardSize},
  footer:{x:20,y:headerHeight+572,width:536,height:40}};
}
