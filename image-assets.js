import {request} from './shared.js';
import {putFont,getFont,toBase64,fromBase64} from './storage.js';
import {UUID} from './type-model.js';
export const IMAGE_LIMIT=163840;
export const imageIds=state=>[...new Set((state.drops||[]).map(d=>d.imageId))].sort();
export async function getImage(id){if(!UUID.test(id))throw new Error('Invalid reward image.');return getFont('image:'+id);}
export async function importImage(file){
 if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>10485760)throw new Error('Choose a PNG, JPG or WebP image under 10 MB.');
 const bitmap=await createImageBitmap(file);try{const scale=Math.min(1,512/Math.max(bitmap.width,bitmap.height));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);
  let blob;for(const quality of [.88,.72,.5,.3]){blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',quality));if(blob&&blob.size<=IMAGE_LIMIT)break;}if(!blob||blob.type!=='image/webp'||blob.size>IMAGE_LIMIT)throw new Error('This image is too detailed. Try a smaller image.');
  const id=crypto.randomUUID();await putFont('image:'+id,{bytes:await blob.arrayBuffer(),type:'image/webp'});return id;
 }finally{bitmap.close();}
}
export async function imageBundle(state){const assets={};for(const id of imageIds(state)){const image=await getImage(id);if(!image)throw new Error('Re-import a missing reward image before syncing or exporting.');assets[id]={type:image.type,data:toBase64(image.bytes)};}return assets;}
export async function restoreImages(state,assets){const replacements=new Map();for(const id of imageIds(state)){const source=assets?.[id];if(source){if(!['image/png','image/jpeg','image/webp'].includes(source.type))throw new Error('Invalid image in backup.');const bytes=fromBase64(source.data);if(bytes.byteLength>IMAGE_LIMIT)throw new Error('Backup image is too large.');const next=await importImage(new Blob([bytes],{type:source.type}));replacements.set(id,next);}else if(!(await getImage(id)))throw new Error('The backup is missing a reward image.');}state.drops=state.drops.map(d=>({...d,imageId:replacements.get(d.imageId)||d.imageId}));return state;}
export async function imageBlob(id,key){if(key){const response=await request('image&image='+encodeURIComponent(id),key);return response.blob();}const image=await getImage(id);if(!image)throw new Error('Reward image unavailable.');return new Blob([image.bytes],{type:image.type});}
