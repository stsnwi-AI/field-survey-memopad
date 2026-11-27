class BundledCMapReader {async fetch({name}) {const encoded=window.PDF_CMAPS[name];if(!encoded)throw new Error('CMap unavailable: '+name);return {cMapData:Uint8Array.from(atob(encoded),c=>c.charCodeAt(0)),compressionType:1}}}
const $=id=>document.getElementById(id);pdfjsLib.GlobalWorkerOptions.workerSrc='vendor/pdf.worker.min.js';let sources=[],pageEntries=[],pageChecks=new Set(),pageBusy=false,thumbVersion=0;let doc,bytes,page=1,tool='select',stampPreset=null,items={},history=[],redoStack=[],dragSnapshotTaken=false,selected=-1,start,working,imgSource,rendering=false,dirty=false,dragHandle=null;const base=$('base'),canvas=$('overlay'),ctx=canvas.getContext('2d');let scale=1,currentColor="#e53935";
const markerWidthKey='field-survey-marker-width-v1';
let markerWidth=5;
try{const stored=Number(localStorage.getItem(markerWidthKey));if(Number.isFinite(stored)&&stored>=.5&&stored<=10)markerWidth=Math.round(stored*2)/2}catch{}
function setMarkerWidth(value){
 const n=Number(value);if(!Number.isFinite(n)||n<.5||n>10)return;
 markerWidth=Math.round(n*2)/2;
 try{localStorage.setItem(markerWidthKey,String(markerWidth))}catch{}
 const display=document.getElementById('markerWidthValue');
 if(display)display.textContent=markerWidth.toFixed(1);
}
function syncMarkerControls(){
 const row=document.getElementById('markerWidthControls');
 if(row)row.hidden=tool!=='highlight';
}const say=t=>$('status').textContent=t;
function snapshot(){redoStack=[];window.invalidateMobileShare?.();history.push(JSON.stringify({items,entries:pageEntries,page}));if(history.length>60)history.shift();dirty=true}function list(){const id=pageEntries[page-1]?.id||'empty';return items[id]||(items[id]=[])}function setTool(t,announce=true){if(t!=='select'){selected=-1;$('editor').hidden=true;draw()}tool=t;syncMarkerControls();document.querySelectorAll('[data-tool]').forEach(b=>b.classList.toggle('active',b.dataset.tool===t));const instructionButton=document.getElementById('instructionPinPalette');if(instructionButton){const active=t==='stamp'&&stampPreset?.shape==='instruction-pin';instructionButton.classList.toggle('active',active);instructionButton.setAttribute('aria-pressed',String(active));}canvas.style.cursor=t==='select'?'default':'crosshair';updateTextComposer();if(announce)say(t==='text'?'入力欄に文字を入れて、PDF上の配置場所を押してください。':t==='select'?'':t==='highlight'?'マーカー：太さ'+markerWidth.toFixed(1)+'の半透明線。変更後の太さを維持します。':t==='pen'?'手書き：太さ1.0、初期色は赤。ペンを選択中は続けて文字や線を描けます。':'PDF上でドラッグしてください。')}
let selectedIndexes=new Set(),selectionList=null,dragGroup=null;
function selectionIndices(){const a=list();if(selectionList!==a||selected<0||!a[selected]){selectionList=a;selectedIndexes=new Set(selected>=0&&a[selected]?[selected]:[])}else if(!selectedIndexes.has(selected))selectedIndexes=new Set([selected]);return [...selectedIndexes].filter(i=>a[i]).sort((a,b)=>a-b)}
function selectIndices(indices){selectionList=list();selectedIndexes=new Set(indices.filter(i=>selectionList[i]));selected=selectedIndexes.size?[...selectedIndexes].at(-1):-1}
function selectedObjects(){return selectionIndices().map(i=>list()[i])}
function editSelectedWhere(predicate,change){if(pageBusy||rendering)return;const targets=selectedObjects().filter(predicate);if(!targets.length)return;snapshot();targets.forEach(change);draw()}
function removeSelectedObjects(){if(pageBusy||rendering)return;const indices=selectionIndices();if(!indices.length)return;snapshot();for(const i of indices.reverse())list().splice(i,1);selectIndices([]);draw()}
function moveAnnotation(o,original,dx,dy){o.x=original.x+dx;o.y=original.y+dy;if(o.type==='pen')o.points=original.points.map(p=>({x:p.x+dx,y:p.y+dy}))}

// v1.4.62: non-destructive vertex/endpoint snapping for geometric annotations.
// Never changes the underlying PDF or freehand/marker strokes.
const vertexSnapEnabled=true;let snapGuide=null;
function vertexSnapAnchors(o){
 if(!['arrow','rect','ellipse'].includes(o.type))return [];
 const b=bounds(o),cx=b.x+b.w/2,cy=b.y+b.h/2;
 const radians=(o.rotation||0)*Math.PI/180;
 const tr=p=>({x:cx+(p.x-cx)*Math.cos(radians)-(p.y-cy)*Math.sin(radians),
               y:cy+(p.x-cx)*Math.sin(radians)+(p.y-cy)*Math.cos(radians)});
 if(o.type==='arrow')return [tr({x:o.x,y:o.y}),tr({x:o.x+o.w,y:o.y+o.h})];
 if(o.type==='rect')return [tr({x:b.x,y:b.y}),tr({x:b.x+b.w,y:b.y}),tr({x:b.x,y:b.y+b.h}),tr({x:b.x+b.w,y:b.y+b.h})];
 return [tr({x:cx,y:cy}),tr({x:cx,y:b.y}),tr({x:b.x+b.w,y:cy}),tr({x:cx,y:b.y+b.h}),tr({x:b.x,y:cy})];
}
function snapCandidates(exclude=[]){
 const excluded=new Set(exclude);
 return list().flatMap((o,i)=>excluded.has(i)?[]:vertexSnapAnchors(o));
}
function closestSnap(p,targets,threshold=10/Math.max(scale,.1)){
 if(!vertexSnapEnabled)return null;
 let match=null,nearest=threshold;
 for(const target of targets){const d=Math.hypot(p.x-target.x,p.y-target.y);if(d<=nearest){nearest=d;match=target}}
 return match;
}
function snapVertexPoint(p,exclude=[]){
 snapGuide=null;
 const found=closestSnap(p,snapCandidates(exclude));
 if(found){snapGuide={...found};return {...found}}
 return p;
}
function snapTranslation(originals,dx,dy,exclude){
 snapGuide=null;
 if(!vertexSnapEnabled)return {dx,dy};
 const targets=snapCandidates(exclude);
 if(!targets.length)return {dx,dy};
 let best=null,bestDistance=10/Math.max(scale,.1);
 for(const o of originals)for(const source of vertexSnapAnchors(o)){
  const moved={x:source.x+dx,y:source.y+dy};
  const match=closestSnap(moved,targets,bestDistance);
  if(match){const d=Math.hypot(match.x-moved.x,match.y-moved.y);bestDistance=d;best={dx:dx+match.x-moved.x,dy:dy+match.y-moved.y,match}}
 }
 if(best){snapGuide={...best.match};return {dx:best.dx,dy:best.dy}}
 return {dx,dy};
}
/* v1.4.76: endpoint snap stays always enabled; no UI toggle. */
;

const cache=new Map();function imageFor(src){if(!cache.has(src)){let im=new Image();im.onload=draw;im.src=src;cache.set(src,im)}return cache.get(src)}
const textFonts={"gothic": "sans-serif", "mincho": "serif", "mono": "monospace", "yuGothic": "\"Yu Gothic\", \"YuGothic\", sans-serif", "meiryo": "\"Meiryo\", sans-serif", "msGothic": "\"MS Gothic\", monospace", "msPGothic": "\"MS PGothic\", sans-serif", "yuMincho": "\"Yu Mincho\", \"YuMincho\", serif", "msMincho": "\"MS Mincho\", serif", "msPMincho": "\"MS PMincho\", serif"};
function textFont(o){return `${o.italic?'italic ':''}${o.bold?'bold ':''}${o.size}px ${textFonts[o.fontFamily]||textFonts.gothic}`}
function textStyleControls(prefix){return {fontFamily:$(prefix+'Font').value,bold:$(prefix+'Bold').getAttribute('aria-pressed')==='true',italic:$(prefix+'Italic').getAttribute('aria-pressed')==='true'}}
function syncTextStyle(prefix,o){$(prefix+'Font').value=textFonts[o.fontFamily]?o.fontFamily:'gothic';for(const key of ['Bold','Italic'])$(prefix+key).setAttribute('aria-pressed',String(o[key.toLowerCase()]===true))}
function changeTextStyle(key){const style=textStyleControls('text');editSelectedWhere(o=>o.type==='text',o=>{if(key)o[key]=style[key];else Object.assign(o,style)})}
for(const key of ['Bold','Italic'])$('text'+key).onclick=()=>{if(pageBusy||rendering)return;const b=$('text'+key);b.setAttribute('aria-pressed',String(b.getAttribute('aria-pressed')!=='true'));changeTextStyle(key.toLowerCase())};$('textFont').onchange=()=>changeTextStyle('fontFamily');
let currentTextSize=24;
function syncSelectedTextControls(o){syncTextStyle('text',o);currentTextSize=o.size;$('size').value=String(o.size)}
function updateTextSize(){if(pageBusy||rendering)return;const size=Number($('size').value);if(!Number.isInteger(size)||size<1||size>500)return;currentTextSize=size;if(tool!=='select')return;editSelectedWhere(o=>o.type==='text'&&o.size!==size,o=>o.size=size)}
function stepTextSize(delta){if(pageBusy||rendering)return;$('size').value=String(Math.max(1,Math.min(500,Math.round(currentTextSize)+delta)));updateTextSize()}
$('size').addEventListener('input',updateTextSize);
$('size').onchange=()=>{updateTextSize();$('size').value=String(currentTextSize)};
$('sizeDown').onclick=()=>stepTextSize(-1);$('sizeUp').onclick=()=>stepTextSize(1);
function paint(c,o){c.save();c.globalAlpha=o.opacity??1;c.strokeStyle=o.color;c.fillStyle=o.color;c.lineWidth=o.lineWidth??(o.type==='pen'?3:2);c.lineCap='round';c.lineJoin='round';c.setLineDash(o.lineStyle==='dashed'?[10,6]:o.lineStyle==='dotted'?[1,5]:[]);const x=o.x,y=o.y,w=o.w||0,h=o.h||0;const bb=bounds(o);if(o.rotation){c.translate(bb.x+bb.w/2,bb.y+bb.h/2);c.rotate(o.rotation*Math.PI/180);c.translate(-bb.x-bb.w/2,-bb.y-bb.h/2)}if(o.type==='stamp'){paintStamp(c,o)}else if(o.type==='text'){c.font=textFont(o);c.textBaseline='top';o.text.split('\n').forEach((t,i)=>c.fillText(t,x,y+i*o.size*1.3))}else if(o.type==='image'){let im=imageFor(o.src);if(im.complete)c.drawImage(im,x,y,w,h)}else if(o.type==='highlight'){c.globalAlpha*=.3;c.fillRect(x,y,w,h)}else if(o.type==='rect'){fillShape(c,o,()=>c.fillRect(x,y,w,h));c.strokeRect(x,y,w,h)}else if(o.type==='ellipse'){c.beginPath();c.ellipse(x+w/2,y+h/2,Math.abs(w/2),Math.abs(h/2),0,0,Math.PI*2);fillShape(c,o,()=>c.fill());c.stroke()}else if(o.type==='pen'){const pts=o.points||[];if(pts.length===1){c.beginPath();c.arc(pts[0].x,pts[0].y,c.lineWidth/2,0,Math.PI*2);c.fill()}else if(pts.length>1){c.beginPath();c.moveTo(pts[0].x,pts[0].y);if(o.markerStroke&&pts.length>2){for(let i=1;i<pts.length-1;i++){const mid={x:(pts[i].x+pts[i+1].x)/2,y:(pts[i].y+pts[i+1].y)/2};c.quadraticCurveTo(pts[i].x,pts[i].y,mid.x,mid.y)}c.lineTo(pts[pts.length-1].x,pts[pts.length-1].y)}else{pts.slice(1).forEach(p=>c.lineTo(p.x,p.y))}c.stroke()}}else if(o.type==='arrow'){c.beginPath();c.moveTo(x,y);c.lineTo(x+w,y+h);c.stroke();c.setLineDash([]);paintLineEnd(c,x,y,Math.atan2(-h,-w),o.startCap||'none');paintLineEnd(c,x+w,y+h,Math.atan2(h,w),o.endCap||'arrow')}c.restore()}
function bounds(o){if(o.type==='pen'){const xs=o.points.map(p=>p.x),ys=o.points.map(p=>p.y);return{x:Math.min(...xs),y:Math.min(...ys),w:Math.max(...xs)-Math.min(...xs),h:Math.max(...ys)-Math.min(...ys)}}if(o.type==='text'){ctx.font=textFont(o);return{x:o.x,y:o.y,w:Math.max(...o.text.split('\n').map(t=>ctx.measureText(t).width)),h:o.text.split('\n').length*o.size*1.3}}return{x:Math.min(o.x,o.x+o.w),y:Math.min(o.y,o.y+o.h),w:Math.abs(o.w),h:Math.abs(o.h)}}
function drawRotationIcon(c,x,y,zoom){c.save();c.translate(x,y);c.scale(1/zoom,1/zoom);c.fillStyle='#fff';c.strokeStyle='#8062b7';c.lineWidth=1.6;c.beginPath();c.arc(0,0,11,0,Math.PI*2);c.fill();c.stroke();c.beginPath();c.arc(0,0,5.2,Math.PI*.9,Math.PI*2.4);c.stroke();c.beginPath();c.moveTo(5,-6);c.lineTo(8,-1);c.lineTo(2,-1);c.closePath();c.fillStyle='#8062b7';c.fill();c.restore()}
function updateTextComposer(){const single=selectedObjects().length===1&&list()[selected]?.type==='text';const adding=tool==='text'&&!single;$('newTextRow').hidden=!adding;$('editTextRow').hidden=!single;$('textComposer').hidden=!single;$('textFloatWindow').hidden=!adding;const multiple=selectionIndices().length>1;$('text').disabled=multiple;$('text').placeholder=multiple?'文字内容の書き換えは1件ずつ選択してください':'文字を入力して、PDF上の配置場所を押してください'}

/* v1.4.64: show the difference between actual editable annotation objects
   and existing PDF background marks. Never reconstruct background graphics. */
function refreshEditablePageStatus(){
 const el=document.getElementById('editablePageStatus');if(!el)return;
 if(!doc||!pageEntries[page-1]){el.hidden=true;return}
 const pageCount=(items[pageEntries[page-1].id]||[]).length;
 const total=Object.values(items).reduce((n,a)=>n+(Array.isArray(a)?a.length:0),0);
 el.hidden=false;
 el.textContent='編集可能: このページ '+pageCount+'件 / 全体 '+total+'件';
 el.title=pageCount
  ?'このページで個別選択できる保存済み書き込み数です。'
  :total?'このページには編集可能な書き込みデータがありません。PDF背景に焼き付いた以前の文字・線は選択できません。'
        :'このPDFに再編集用の書き込みオブジェクトはありません。元PDFに直接描画された文字・線は選択できません。';
 el.dataset.count=String(pageCount);
}

function draw(){refreshEditablePageStatus();updateTextComposer();if(!start)$('editor').hidden=!doc||!list()[selected];ctx.clearRect(0,0,canvas.width,canvas.height);ctx.save();ctx.scale(scale,scale);applyPageTurn(ctx,pageEntries[page-1]);list().forEach((o,i)=>{paint(ctx,o);if(selectionIndices().includes(i)){const b=bounds(o);ctx.save();ctx.strokeStyle='#8062b7';ctx.lineWidth=1;ctx.setLineDash([5,4]);ctx.save();ctx.translate(b.x+b.w/2,b.y+b.h/2);ctx.rotate((o.rotation||0)*Math.PI/180);ctx.translate(-b.x-b.w/2,-b.y-b.h/2);ctx.strokeRect(b.x,b.y,b.w,b.h);ctx.restore();ctx.setLineDash([]);for(const h of (selectionIndices().length===1?handles(o):[])){ctx.fillStyle='white';ctx.strokeStyle='#8062b7';const r=(window.matchMedia('(pointer:coarse)').matches?8:5)/scale;if(h.key==='rotate'){drawRotationIcon(ctx,h.x,h.y,scale)}else{ctx.fillRect(h.x-r,h.y-r,r*2,r*2);ctx.strokeRect(h.x-r,h.y-r,r*2,r*2)}}ctx.restore()}});if(working&&tool!=='select')paint(ctx,working);if(snapGuide){ctx.save();ctx.beginPath();ctx.arc(snapGuide.x,snapGuide.y,7/Math.max(scale,.1),0,Math.PI*2);ctx.strokeStyle='#188b62';ctx.lineWidth=2/Math.max(scale,.1);ctx.setLineDash([]);ctx.stroke();ctx.restore()}ctx.restore();window.updateTouchSelection?.()}
async function render(){if(!doc||rendering)return;rendering=true;try{const p=await doc.getPage(page);scale=Number($('zoom').value);if(window.mobileFitMode&&window.matchMedia('(max-width:1024px), (pointer:coarse)').matches){const vw=p.getViewport({scale:1,rotation:p.rotate+(pageEntries[page-1]?.rotation||0)});scale=Math.max(.15,Math.min(2,(document.querySelector('.workspace').clientWidth-28)/vw.width));window.setPDFZoom?.(scale)}const v=p.getViewport({scale,rotation:p.rotate+(pageEntries[page-1]?.rotation||0)});// High-DPI PDF preview: render only the background at higher backing resolution.
 // Keep the annotation overlay at its original CSS/coordinate size to preserve touch hit testing.
 const w=Math.ceil(v.width),h=Math.ceil(v.height);
 const deviceRatio=Math.min(2.5,Math.max(1,window.devicePixelRatio||1));
 const pixelBudget=18000000,edgeLimit=8192;
 const density=Math.max(1,Math.min(deviceRatio,Math.sqrt(pixelBudget/Math.max(1,w*h)),edgeLimit/Math.max(1,w),edgeLimit/Math.max(1,h)));
 canvas.width=w;canvas.height=h;
 canvas.style.width=w+'px';canvas.style.height=h+'px';
 base.width=Math.ceil(w*density);base.height=Math.ceil(h*density);
 base.style.width=w+'px';base.style.height=h+'px';
 await p.render({canvasContext:base.getContext('2d'),viewport:v,transform:[density,0,0,density,0,0]}).promise;$('paper').style.display='block';$('empty').style.display='none';$('page').textContent=`${page} / ${doc.numPages}`;$('prev').disabled=page===1;$('next').disabled=page===doc.numPages;draw();for(const el of $('pageGrid').children)el.classList.toggle('current',el.dataset.id===pageEntries[page-1]?.id)}catch(e){throw e}finally{rendering=false;window.updateTouchSelection?.()}}
async function load(data,name){window.__surveyPdfLoading=true;window.invalidateMobileShare?.();say('PDFを読み込んでいます…');try{const original=new Uint8Array(data).slice();const embedded=await extractEmbeddedProject(original);if(embedded){await restoreProject(embedded);$('filename').textContent=name;await window.surveyPDFLoaded?.(embedded);const total=Object.values(items).reduce((n,a)=>n+a.length,0);say('再編集データを復元：全体'+total+'件。このページ'+list().length+'件。編集できるページを確認してください。');return}const next=await pdfjsLib.getDocument({data:original.slice(),isEvalSupported:false,CMapReaderFactory:BundledCMapReader,cMapPacked:true,standardFontDataUrl:'vendor/standard_fonts/'}).promise;sources=[{bytes:original,doc:next}];pageEntries=Array.from({length:next.numPages},(_,i)=>({id:newPageId(),source:0,index:i+1,rotation:0}));doc=pageFacade();bytes=original;pageChecks.clear();page=1;items={};history=[];redoStack=[];selected=-1;dirty=false;$('filename').textContent=name;$('save').disabled=false;$('newTabStart').hidden=true;await render();if(!$('pagePanel').hidden)await refreshPageGrid();await window.surveyPDFLoaded?.(null);say('再編集データが見つかりません。PDFに焼き付いた以前の文字・線は個別に選択できません。')}catch(e){console.error('Editable PDF load failed:',e);say('PDFの読込・再編集情報の復元に失敗しました：'+e.message+'。元のファイルは変更していません。')}finally{window.__surveyPdfLoading=false}}
$('file').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;if(pageBusy||rendering){say('処理が終わってからPDFを開いてください。');return}if(doc){say('今のPDFは残しています。「別PDF用のタブを開く」で新しいタブを開き、そこでPDFを選んでください。');return}await load(await f.arrayBuffer(),f.name)};
document.querySelectorAll('[data-tool]').forEach(b=>b.onclick=()=>{if(b.dataset.tool==='image')$('imageFile').click();else setTool(b.dataset.tool)});
$('imageFile').onchange=e=>{const f=e.target.files[0];if(f){const r=new FileReader();r.onload=()=>{imgSource=r.result;const im=imageFor(imgSource);im.onload=()=>{draw();setTool('image');say('PDF上でドラッグして画像の大きさを指定してください。')}};r.readAsDataURL(f)}e.target.value=''};
function point(e){const r=canvas.getBoundingClientRect();return unturnPoint({x:(e.clientX-r.left)*canvas.width/r.width/scale,y:(e.clientY-r.top)*canvas.height/r.height/scale},pageEntries[page-1])}
// v1.4.65: Keep clicks usable at reduced zoom and for tiny saved pen strokes.
function hitAnnotation(o,p){
 const b=bounds(o);
 if(![b.x,b.y,b.w,b.h,p.x,p.y].every(Number.isFinite))return false;
 const tolerance=(window.matchMedia('(pointer:coarse)').matches?16:11)/Math.max(.15,scale);
 const a=-(o.rotation||0)*Math.PI/180,cx=b.x+b.w/2,cy=b.y+b.h/2,dx=p.x-cx,dy=p.y-cy;
 const x=cx+dx*Math.cos(a)-dy*Math.sin(a),y=cy+dx*Math.sin(a)+dy*Math.cos(a);
 if(x<b.x-tolerance||x>b.x+b.w+tolerance||y<b.y-tolerance||y>b.y+b.h+tolerance)return false;
 if(o.type!=='pen'||!Array.isArray(o.points)||!o.points.length)return true;
 const radius=tolerance+Math.max(.5,(Number(o.lineWidth)||1)/2);
 const radius2=radius*radius;
 let previous=null;
 for(const current of o.points){
  if(!Number.isFinite(current?.x)||!Number.isFinite(current?.y))continue;
  if(!previous){previous=current;continue}
  const vx=current.x-previous.x,vy=current.y-previous.y;
  const len2=vx*vx+vy*vy;
  const t=len2?Math.max(0,Math.min(1,((p.x-previous.x)*vx+(p.y-previous.y)*vy)/len2)):0;
  const qx=previous.x+t*vx,qy=previous.y+t*vy;
  if((p.x-qx)**2+(p.y-qy)**2<=radius2)return true;
  previous=current;
 }
 const first=o.points[0];return (p.x-first.x)**2+(p.y-first.y)**2<=radius2;
}
function topAnnotationAt(p){for(let i=list().length-1;i>=0;i--)if(hitAnnotation(list()[i],p))return i;return -1}
/* v1.4.76: explicit freeform lasso multi-selection; no new annotation format.
 * Capture on the original PDF overlay, only while user selects the lasso tool.
 * Existing select/move, Shift selection, group move, delete and Undo remain.
 */
let lassoMode=false,lassoStroke=null;
(function installLasso(){
 const tools=document.getElementById('tools');if(!tools)return;
 const button=document.createElement('button');
 button.type='button';button.id='lassoSelectTool';button.className='lasso-tool';
 button.title='投げ縄：囲んだ書き込みをまとめて選択。選択後は移動・削除できます。';
 button.setAttribute('aria-label','投げ縄で一括選択');
 button.setAttribute('aria-pressed','false');
 button.innerHTML='<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path stroke-dasharray="3 3" d="M4 11c0-7 13-9 16-2s-8 11-14 7c-3-2-3-5-1-7"/><path d="m5 17 0 4 4-2"/></svg><span>投げ縄</span>';
 const selectTool=tools.querySelector('[data-tool="select"]');
 if(selectTool)selectTool.after(button);else tools.prepend(button);
 const setMode=on=>{
   lassoMode=Boolean(on);lassoStroke=null;
   button.classList.toggle('active',lassoMode);
   button.setAttribute('aria-pressed',String(lassoMode));
   canvas.style.cursor=lassoMode?'crosshair':'';
   if(lassoMode){
     setTool('select',false);
     if(typeof setTouchMode==='function')setTouchMode('edit',false);
     button.classList.add('active');
     button.setAttribute('aria-pressed','true');
   }
 };
 button.addEventListener('click',()=>{setMode(!lassoMode);if(lassoMode)say('囲みたい書き込みの周囲をなぞってください。')});
 tools.addEventListener('click',e=>{
  if(e.target.closest('button[data-tool],#surveyPalettePin,#instructionPinPalette')&&!e.target.closest('#lassoSelectTool'))setMode(false);
 },true);
 function inside(p,poly){
  let odd=false;
  for(let i=0,j=poly.length-1;i<poly.length;j=i++){
   const a=poly[i],b=poly[j];
   if((a.y>p.y)!==(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)odd=!odd;
  }
  return odd;
 }
 function linesCross(a,b,c,d){
   const dir=(u,v,w)=>(v.x-u.x)*(w.y-u.y)-(v.y-u.y)*(w.x-u.x);
   const ab1=dir(a,b,c),ab2=dir(a,b,d),cd1=dir(c,d,a),cd2=dir(c,d,b);
   return ((ab1>0&&ab2<0)||(ab1<0&&ab2>0))&&((cd1>0&&cd2<0)||(cd1<0&&cd2>0));
 }
 function intersects(o,poly){
  const b=bounds(o),x=b.x,y=b.y,w=b.w,h=b.h;
  if(![x,y,w,h].every(Number.isFinite))return false;
  const c=[{x,y},{x:x+w,y},{x:x+w,y:y+h},{x,y:y+h}];
  const mid={x:x+w/2,y:y+h/2};
  if(c.some(p=>inside(p,poly))||inside(mid,poly)||poly.some(p=>p.x>=x&&p.x<=x+w&&p.y>=y&&p.y<=y+h))return true;
  for(let i=0;i<poly.length;i++)for(let j=0;j<4;j++){
   if(linesCross(poly[i],poly[(i+1)%poly.length],c[j],c[(j+1)%4]))return true;
  }
  return false;
 }
 function preview(){
  draw();
  if(!lassoStroke||lassoStroke.points.length<2)return;
  ctx.save();ctx.scale(scale,scale);applyPageTurn(ctx,pageEntries[page-1]);
  ctx.beginPath();ctx.moveTo(lassoStroke.points[0].x,lassoStroke.points[0].y);
  for(const p of lassoStroke.points.slice(1))ctx.lineTo(p.x,p.y);
  ctx.setLineDash([6/Math.max(scale,.1),4/Math.max(scale,.1)]);
  ctx.lineWidth=2/Math.max(scale,.1);
  ctx.strokeStyle='#1685bd';ctx.fillStyle='#40a5dc22';
  ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
 }
 canvas.addEventListener('pointerdown',e=>{
  if(!lassoMode||!doc||rendering||pageBusy||e.button!==0)return;
  lassoStroke={id:e.pointerId,points:[point(e)]};
  try{canvas.setPointerCapture(e.pointerId)}catch{}
  e.preventDefault();e.stopImmediatePropagation();preview();
 },true);
 canvas.addEventListener('pointermove',e=>{
  if(!lassoStroke||e.pointerId!==lassoStroke.id)return;
  const p=point(e),a=lassoStroke.points.at(-1);
  if(Math.hypot(p.x-a.x,p.y-a.y)>1/Math.max(scale,.1)){
   lassoStroke.points.push(p);preview();
  }
  e.preventDefault();e.stopImmediatePropagation();
 },true);
 function finishLasso(e){
  if(!lassoStroke||e.pointerId!==lassoStroke.id)return;
  const poly=lassoStroke.points;lassoStroke=null;
  if(poly.length>2&&doc){
   const chosen=[];
   for(let i=0;i<list().length;i++)if(intersects(list()[i],poly))chosen.push(i);
   selectIndices(chosen);syncEditor();
   say(chosen.length+'件を選択しました。移動・削除するには「選択」を押してください。');
  }
  setMode(false);draw();
  e.preventDefault();e.stopImmediatePropagation();
 }
 canvas.addEventListener('pointerup',finishLasso,true);
 canvas.addEventListener('pointercancel',e=>{
  if(!lassoStroke||e.pointerId!==lassoStroke.id)return;
  lassoStroke=null;setMode(false);draw();e.preventDefault();e.stopImmediatePropagation();
 },true);
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&lassoMode){setMode(false);draw()}});
})();
canvas.onpointerdown=e=>{if(e.button!==undefined&&e.button!==0)return;if(!doc||rendering||pageBusy)return;dragSnapshotTaken=false;start=point(e);canvas.setPointerCapture(e.pointerId);if(tool==='text'){const hit=topAnnotationAt(start);if(hit>=0&&list()[hit].type==='text')setTool('select',false)}if(tool==='select'){const before=selectionIndices(),hit=topAnnotationAt(start),extend=e.shiftKey||window.multiSelectTouch;dragGroup=null;dragHandle=!extend&&before.length===1&&selected>=0?hitHandle(list()[selected],start):null;if(dragHandle){working=JSON.parse(JSON.stringify(list()[selected]));draw();return}if(extend){const next=new Set(before);if(hit>=0){if(next.has(hit))next.delete(hit);else next.add(hit)}selectIndices([...next]);start=null;working=null;syncEditor();draw();return}if(hit<0)selectIndices([]);else if(!before.includes(hit))selectIndices([hit]);else selected=hit;if(selected>=0){working=JSON.parse(JSON.stringify(list()[selected]));if(selectionIndices().length>1)dragGroup=selectionIndices().map(i=>({i,original:JSON.parse(JSON.stringify(list()[i]))}))}syncEditor();draw();return}if(tool==='stamp'&&stampPreset){snapshot();const o={type:'stamp',x:start.x-stampPreset.w/2,y:start.y-(stampPreset.shape==='instruction-pin'?stampPreset.h:stampPreset.h/2),...stampPreset,color:currentColor};list().push(o);start=null;setTool('select',false);selectIndices([list().length-1]);syncEditor();draw();return}if(tool==='text'){const t=$('text').value;if(!t.trim()){say('文字入力欄に、追加する文字を入力してください。');return}snapshot();list().push({type:tool,x:start.x,y:start.y,text:t,size:currentTextSize,...textStyleControls('text'),color:currentColor});selected=-1;draw();return}if(tool==='image'&&!imgSource)return;if(['arrow','rect','ellipse'].includes(tool))start=snapVertexPoint(start);working={type:tool==='highlight'?'pen':tool,x:start.x,y:start.y,w:0,h:0,color:currentColor,src:tool==='image'?imgSource:undefined,points:tool==='pen'||tool==='highlight'?[start]:undefined,...(tool==='pen'?{lineWidth:1}:tool==='highlight'?{lineWidth:markerWidth,opacity:.3,markerStroke:true}:{})};selected=-1};
canvas.onpointermove=e=>{if(!working||!start){if(tool==='select'&&selected>=0){const h=hitHandle(list()[selected],point(e));canvas.style.cursor=h?(h.key==='nw'||h.key==='se'?'nwse-resize':h.key==='ne'||h.key==='sw'?'nesw-resize':h.key==='rotate'?'grab':'crosshair'):'move'}return;}const p=point(e),dx=p.x-start.x,dy=p.y-start.y;if(tool==='select'){if(!dragSnapshotTaken){if(dx===0&&dy===0)return;snapshot();dragSnapshotTaken=true}if(dragGroup){const snapped=snapTranslation(dragGroup.map(g=>g.original),dx,dy,selectionIndices());for(const {i,original}of dragGroup)moveAnnotation(list()[i],original,snapped.dx,snapped.dy);draw();return}const o=list()[selected];if(dragHandle){if(dragHandle.key==='rotate'){const b=bounds(working),cx=b.x+b.w/2,cy=b.y+b.h/2;o.rotation=(working.rotation||0)+(Math.atan2(p.y-cy,p.x-cx)-Math.atan2(start.y-cy,start.x-cx))*180/Math.PI}else resizeAnnotation(o,working,dragHandle,vertexSnapEnabled&&!(working.rotation||0)&&['arrow','rect','ellipse'].includes(working.type)?snapVertexPoint(p,selectionIndices()):p);draw();return}const snapped=snapTranslation([working],dx,dy,selectionIndices());o.x=working.x+snapped.dx;o.y=working.y+snapped.dy;if(o.type==='pen')o.points=working.points.map(v=>({x:v.x+dx,y:v.y+dy}))}else if(tool==='pen'||tool==='highlight')working.points.push(p);else{const end=['arrow','rect','ellipse'].includes(tool)?snapVertexPoint(p):p;working.w=end.x-start.x;working.h=end.y-start.y}draw()};
/* v1.4.75: Snap ONLY a sufficiently straight completed freehand/marker
 * stroke into a clean segment. Keep type 'pen', styling and PDF JSON schema.
 * Do not alter existing saved strokes, loops, corners or clearly curved paths. */
function straightenCompletedStroke(o){
 if(o?.type!=='pen'||!Array.isArray(o.points)||o.points.length<2)return;
 const pts=o.points.filter(p=>Number.isFinite(p?.x)&&Number.isFinite(p?.y));
 if(pts.length<2)return;
 const first=pts[0],last=pts[pts.length-1],dx=last.x-first.x,dy=last.y-first.y;
 const length=Math.hypot(dx,dy);
 if(length<18/Math.max(scale,.25))return;
 const ux=dx/length,uy=dy/length;
 // A reversed stroke or sharp bend is not a straight stroke.
 const tolerance=Math.min(4/Math.max(scale,.25),Math.max(1.6/Math.max(scale,.25),length*.025));
 let previous=-Infinity,backtrack=0;
 for(const p of pts){
  const px=p.x-first.x,py=p.y-first.y;
  const along=px*ux+py*uy;
  const deviation=Math.abs(px*uy-py*ux);
  if(deviation>tolerance)return;
  if(along<previous-2/Math.max(scale,.25))backtrack+=previous-along;
  previous=along;
 }
 if(backtrack>Math.max(3/Math.max(scale,.25),length*.035))return;
 o.points=[{x:first.x,y:first.y},{x:last.x,y:last.y}];
}
function finish(){if(working&&tool!=='select'){if(tool==='pen'||tool==='highlight'||Math.abs(working.w)>3&&Math.abs(working.h)>3||tool==='arrow'&&Math.hypot(working.w,working.h)>3){if(tool==='image'){const b=bounds(working);Object.assign(working,b)}if(tool==='pen'||tool==='highlight')straightenCompletedStroke(working);snapshot();list().push(working)}}working=null;start=null;dragHandle=null;dragGroup=null;snapGuide=null;if(tool==='select')syncEditor();else if(tool==='pen'){selectIndices([]);$('editor').hidden=true;}draw()}canvas.onpointerup=finish;canvas.onpointercancel=finish;
$('undo').onclick=()=>travelHistory(false);$('delete').onclick=removeSelectedObjects;
$('prev').onclick=()=>{if(page>1&&!rendering){page--;selected=-1;render().catch(e=>say('ページの表示に失敗しました：'+e.message))}};$('next').onclick=()=>{if(doc&&page<doc.numPages&&!rendering){page++;selected=-1;render().catch(e=>say('ページの表示に失敗しました：'+e.message))}};$('zoom').onchange=()=>render().catch(e=>say('ページの表示に失敗しました：'+e.message));
function download(data,name){const u=URL.createObjectURL(new Blob([data],{type:'application/pdf'})),a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),30000)}
$('save').onclick=()=>saveDocument(false);
$('sample').onclick=async()=>{const p=await PDFLib.PDFDocument.create();for(let i=0;i<2;i++){const s=p.addPage([595,842]);s.drawText('PDF WORKSPACE / SAMPLE '+(i+1),{x:45,y:780,size:20,color:PDFLib.rgb(.15,.4,.3)});s.drawText('Try text, highlight, shapes and images.',{x:45,y:740,size:12});for(let y=660;y>150;y-=65)s.drawRectangle({x:45,y,width:505,height:45,borderColor:PDFLib.rgb(.8,.85,.82),borderWidth:1});s.drawText('Your original PDF stays unchanged.',{x:45,y:80,size:12})}await load(await p.save(),'サンプル.pdf')};
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue=''}});

function syncEditor(){if(start)return;const o=list()[selected];$('editor').hidden=!o;if(!o)return;$('editTextRow').hidden=o.type!=='text'||selectionIndices().length!==1;const text=selectedObjects().find(o=>o.type==='text');if(text)syncSelectedTextControls(text);$('editLineRow').hidden=!selectedObjects().some(o=>['pen','rect','ellipse','arrow'].includes(o.type));$('editText').value=o.text||'';if(o.type!=='image'){currentColor=o.color;updatePalette()}const line=selectedObjects().find(o=>['pen','rect','ellipse','arrow'].includes(o.type))||o;$('lineWidth').value=String(line.lineWidth??(line.type==='pen'?3:2));$('lineWidthUp').disabled=Number($('lineWidth').value)>=10;$('lineWidthDown').disabled=Number($('lineWidth').value)<=0;say('')}
function updateSelectedText(){if(pageBusy||rendering)return;const o=list()[selected];if(!o||o.type!=='text'||selectionIndices().length!==1||o.text===$('editText').value)return;snapshot();o.text=$('editText').value;draw();say('文字の変更を反映しました。')}
$('editText').addEventListener('input',e=>{if(!e.isComposing)updateSelectedText()});
$('editText').addEventListener('compositionend',updateSelectedText);
function updatePalette(){document.querySelectorAll('[data-color]').forEach(b=>{const active=b.dataset.color===currentColor;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active))})}
function chooseColor(color){currentColor=color;editSelectedWhere(o=>o.type!=='image'&&o.color!==color,o=>o.color=color);updatePalette()}
document.querySelectorAll('[data-color]').forEach(b=>b.onclick=()=>chooseColor(b.dataset.color));
$('lineWidth').addEventListener('change',e=>{
 const v=Number(e.target.value);
 if(!Number.isFinite(v)||v<0||v>10||Math.round(v*2)!==v*2){syncEditor();return}
 // Selected marker strokes use the same future-drawing width as the
 // marker tool's dedicated +/- control. Ordinary pen width stays separate.
 const markerSelected=selectedObjects().some(o=>o.type==='pen'&&o.markerStroke===true);
 editSelectedWhere(o=>['pen','rect','ellipse','arrow'].includes(o.type)&&o.lineWidth!==v,o=>o.lineWidth=v);
 if(markerSelected&&v>=.5)setMarkerWidth(v);
 syncEditor();
});
function stepLineWidth(delta){if(rendering||pageBusy)return;const o=selectedObjects().find(o=>['pen','rect','ellipse','arrow'].includes(o.type));if(!o)return;const current=o.lineWidth??(o.type==='pen'?3:2);const value=Math.max(0,Math.min(10,Math.round((current+delta)*2)/2));if(value===current)return;$('lineWidth').value=String(value);$('lineWidth').dispatchEvent(new Event('change'))}
$('lineWidthUp').onclick=()=>stepLineWidth(.5);$('lineWidthDown').onclick=()=>stepLineWidth(-.5);
$('lineWidth').addEventListener('keydown',e=>{if(e.key==='ArrowUp'||e.key==='ArrowDown'){e.preventDefault();stepLineWidth(e.key==='ArrowUp'?.5:-.5)}});
updatePalette();

(function setupMarkerWidthControls(){
 const tools=document.getElementById('tools');if(!tools)return;
 const row=document.createElement('div');row.id='markerWidthControls';row.className='marker-width-controls';row.hidden=true;
 const label=document.createElement('span');label.textContent='マーカーの太さ';
 const down=document.createElement('button');down.type='button';down.textContent='－';down.title='0.5細くする';
 const val=document.createElement('output');val.id='markerWidthValue';val.textContent=markerWidth.toFixed(1);val.setAttribute('aria-live','polite');
 const up=document.createElement('button');up.type='button';up.textContent='＋';up.title='0.5太くする';
 down.onclick=()=>setMarkerWidth(Math.max(.5,markerWidth-.5));
 up.onclick=()=>setMarkerWidth(Math.min(10,markerWidth+.5));
 row.append(label,down,val,up);tools.after(row);
 syncMarkerControls();
})();

function handles(o){const b=bounds(o),cx=b.x+b.w/2,cy=b.y+b.h/2,a=(o.rotation||0)*Math.PI/180;const rotatePoint=(x,y)=>({x:cx+(x-cx)*Math.cos(a)-(y-cy)*Math.sin(a),y:cy+(x-cx)*Math.sin(a)+(y-cy)*Math.cos(a)});const base=o.type==='arrow'?[{key:'start',x:o.x,y:o.y},{key:'end',x:o.x+o.w,y:o.y+o.h}]:[{key:'nw',x:b.x,y:b.y},{key:'ne',x:b.x+b.w,y:b.y},{key:'sw',x:b.x,y:b.y+b.h},{key:'se',x:b.x+b.w,y:b.y+b.h}];return [...base.map(h=>({...h,...rotatePoint(h.x,h.y)})),{key:'rotate',...rotatePoint(cx,b.y-30)}]}
function hitHandle(o,p){return handles(o).find(h=>Math.hypot(h.x-p.x,h.y-p.y)<=(window.matchMedia('(pointer:coarse)').matches?23:12)/scale)}
function resizeAnnotation(o,original,handle,p){if(original.type==='arrow'){if(handle.key==='start'){o.x=p.x;o.y=p.y;o.w=original.x+original.w-p.x;o.h=original.y+original.h-p.y}else{o.w=p.x-original.x;o.h=p.y-original.y}return}const b=bounds(original),left=handle.key.includes('w'),top=handle.key.includes('n'),ax=left?b.x+b.w:b.x,ay=top?b.y+b.h:b.y;let w=Math.max(2,Math.abs(p.x-ax)),h=Math.max(2,Math.abs(p.y-ay));let x=Math.min(p.x,ax),y=Math.min(p.y,ay);if(original.type==='text'){const ratio=Math.max(.1,Math.hypot(w,h)/Math.max(1,Math.hypot(b.w,b.h)));o.size=Math.max(6,Math.min(200,original.size*ratio));const actual=o.size/original.size;o.x=left?ax-b.w*actual:ax;o.y=top?ay-b.h*actual:ay;return}if(original.type==='pen'){o.points=original.points.map(v=>({x:x+(v.x-b.x)*(b.w?w/b.w:1),y:y+(v.y-b.y)*(b.h?h/b.h:1)}));o.x=x;o.y=y;return}o.x=x;o.y=y;o.w=w;o.h=h;}
canvas.ondblclick=e=>{if(tool!=='select'||selected<0)return;const o=list()[selected];if(o.type==='text'&&selectionIndices().length===1){syncEditor();$('editText').focus();$('editText').select();say('文字内容は入力するとすぐ反映されます。')}};

let nextPageId=0;
function newPageId(){return 'page-'+(++nextPageId)}
function pageFacade(){return {get numPages(){return pageEntries.length},getPage(n){const e=pageEntries[n-1];return sources[e.source].doc.getPage(e.index)}}}
function applyPageTurn(c,e){if(!e)return;const r=((e.rotation%360)+360)%360;if(r===90){c.translate(e.h,0);c.rotate(Math.PI/2)}else if(r===180){c.translate(e.w,e.h);c.rotate(Math.PI)}else if(r===270){c.translate(0,e.w);c.rotate(-Math.PI/2)}}
function unturnPoint(p,e){if(!e)return p;const r=((e.rotation%360)+360)%360;if(r===90)return {x:p.y,y:e.h-p.x};if(r===180)return {x:e.w-p.x,y:e.h-p.y};if(r===270)return {x:e.w-p.y,y:p.x};return p}
// Annotation coordinates stay in the original displayed page frame, even after rotation.
const originalRender=render;
render=async function(){if(doc){const e=pageEntries[page-1],p=await doc.getPage(page),v=p.getViewport({scale:1});e.w=v.width;e.h=v.height}await originalRender()};
function pageTargets(){return pageEntries.filter(e=>pageChecks.has(e.id))}
function updateCheckCount(){$('pageSelection').textContent=`全${pageEntries.length}ページ／${pageChecks.size}ページを選択中`;for(const el of $('pageGrid').children)el.classList.toggle('checked',pageChecks.has(el.dataset.id))}
async function refreshPageGrid(){const version=++thumbVersion;const grid=$('pageGrid');grid.replaceChildren();updateCheckCount();for(let i=0;i<pageEntries.length;i++){if(version!==thumbVersion)return;const e=pageEntries[i],p=await sources[e.source].doc.getPage(e.index);const raw=p.getViewport({scale:1});e.w=raw.width;e.h=raw.height;const v=p.getViewport({scale:.2,rotation:p.rotate+e.rotation});const card=document.createElement('article');card.className='page-card'+(i===page-1?' current':'');card.dataset.id=e.id;card.draggable=true;
const label=document.createElement('label'),check=document.createElement('input');check.type='checkbox';check.checked=pageChecks.has(e.id);check.setAttribute('aria-label',`${i+1}ページを選択`);check.onchange=()=>{if(check.checked)pageChecks.add(e.id);else pageChecks.delete(e.id);updateCheckCount()};label.append(check,document.createTextNode(` ${i+1}ページ`));card.append(label);
const thumb=document.createElement('canvas');thumb.width=Math.ceil(v.width);thumb.height=Math.ceil(v.height);thumb.setAttribute('aria-label',`${i+1}ページの縮小画面`);card.append(thumb);const tc=thumb.getContext('2d');await p.render({canvasContext:tc,viewport:v}).promise;tc.save();tc.scale(.2,.2);applyPageTurn(tc,e);for(const a of items[e.id]||[]){if(a.type==='image'){const im=imageFor(a.src);if(!im.complete)await new Promise(resolve=>{im.addEventListener('load',resolve,{once:true});im.addEventListener('error',resolve,{once:true})})}paint(tc,a)}tc.restore();
const go=document.createElement('button');go.className='thumb-label';go.textContent='このページを表示';const navigate=async()=>{if(rendering||pageBusy)return;page=pageEntries.findIndex(x=>x.id===e.id)+1;selected=-1;await render();for(const el of grid.children)el.classList.toggle('current',el.dataset.id===e.id)};go.onclick=thumb.onclick=navigate;card.append(go);
const move=document.createElement('div');move.className='page-move';for(const [name,delta]of [['← 前へ',-1],['後へ →',1]]){const b=document.createElement('button');b.textContent=name;b.disabled=i+delta<0||i+delta>=pageEntries.length;b.onclick=()=>movePage(e.id,delta);move.append(b)}card.append(move);
card.ondragstart=ev=>{if(pageBusy||rendering){ev.preventDefault();return}ev.dataTransfer.setData('text/plain',e.id)};card.ondragover=ev=>{ev.preventDefault();card.classList.add('drag-over')};card.ondragleave=()=>card.classList.remove('drag-over');card.ondrop=ev=>{ev.preventDefault();card.classList.remove('drag-over');const id=ev.dataTransfer.getData('text/plain');runPageEdit(()=>{const from=pageEntries.findIndex(x=>x.id===id),to=pageEntries.findIndex(x=>x.id===e.id);if(from<0||to<0||from===to)return false;snapshot();const [entry]=pageEntries.splice(from,1);pageEntries.splice(to,0,entry)},'ページを並べ替えました。')};if(version!==thumbVersion)return;grid.append(card)}updateCheckCount()}
async function runPageEdit(change,message){if(!doc){say('先にPDFを開いてください。');return}if(rendering||pageBusy)return;pageBusy=true;document.body.classList.add('page-busy');const currentId=pageEntries[page-1]?.id;try{if(await change()===false)return;page=Math.max(1,pageEntries.findIndex(e=>e.id===currentId)+1);selected=-1;start=working=null;await render();await refreshPageGrid();say(message)}catch(e){say('ページ編集に失敗しました：'+e.message)}finally{pageBusy=false;document.body.classList.remove('page-busy')}}
function movePage(id,delta){return runPageEdit(()=>{const i=pageEntries.findIndex(e=>e.id===id),j=i+delta;if(j<0||j>=pageEntries.length)return false;snapshot();[pageEntries[i],pageEntries[j]]=[pageEntries[j],pageEntries[i]]},'ページを並べ替えました。')}
$('togglePages').onclick=async()=>{if(!doc){say('先にPDFを開いてください。');return}const show=$('pagePanel').hidden;$('pagePanel').hidden=!show;$('togglePages').setAttribute('aria-expanded',String(show));if(show)await refreshPageGrid()};$('closePages').onclick=()=>{$('pagePanel').hidden=true;$('togglePages').setAttribute('aria-expanded','false');thumbVersion++};
$('checkAll').onclick=()=>{pageChecks=new Set(pageEntries.map(e=>e.id));for(const c of $('pageGrid').querySelectorAll('input'))c.checked=true;updateCheckCount()};$('uncheckAll').onclick=()=>{pageChecks.clear();for(const c of $('pageGrid').querySelectorAll('input'))c.checked=false;updateCheckCount()};
function requireTargets(){const t=pageTargets();if(!t.length)say('ページのチェックを入れてから操作してください。');return t}
$('rotatePages').onclick=()=>{const t=requireTargets();if(t.length)runPageEdit(()=>{snapshot();t.forEach(e=>e.rotation=(e.rotation+90)%360)},'選択したページを右に90°回転しました。書き込みも一緒に回転します。')};
$('duplicatePages').onclick=()=>{const t=requireTargets();if(t.length)runPageEdit(()=>{snapshot();const ids=new Set(t.map(e=>e.id));pageEntries=pageEntries.flatMap(e=>{if(!ids.has(e.id))return[e];const copy={...e,id:newPageId()};items[copy.id]=JSON.parse(JSON.stringify(items[e.id]||[]));return[e,copy]})},'選択ページを直後に複製しました。書き込みも複製しています。')};
$('removePages').onclick=()=>{const t=requireTargets();if(!t.length)return;if(t.length===pageEntries.length){say('最後の1ページは削除できません。残すページのチェックを外してください。');return}runPageEdit(()=>{snapshot();const ids=new Set(t.map(e=>e.id));pageEntries=pageEntries.filter(e=>!ids.has(e.id));for(const id of ids){delete items[id];pageChecks.delete(id)}},'選択したページを削除しました。「元に戻す」で復元できます。')};
async function prepareSource(data){const b=new Uint8Array(data).slice();await PDFLib.PDFDocument.load(b);const d=await pdfjsLib.getDocument({data:b.slice(),isEvalSupported:false,CMapReaderFactory:BundledCMapReader,cMapPacked:true,standardFontDataUrl:'vendor/standard_fonts/'}).promise;return {bytes:b,doc:d}}
$('addPDF').onclick=()=>{if(doc)$('appendFile').click();else say('先にPDFを開いてください。')};
$('appendFile').onchange=async ev=>{const files=[...ev.target.files];ev.target.value='';if(!files.length)return;await runPageEdit(async()=>{const incoming=[];for(const f of files)incoming.push(await prepareSource(await f.arrayBuffer()));snapshot();for(const s of incoming){const idx=sources.push(s)-1;for(let i=1;i<=s.doc.numPages;i++)pageEntries.push({id:newPageId(),source:idx,index:i,rotation:0})}},'別のPDFを末尾に追加しました。前へ・後へで並べ替えできます。')};
$('blankPage').onclick=()=>runPageEdit(async()=>{const pdf=await PDFLib.PDFDocument.create();const e=pageEntries[page-1];pdf.addPage(e.rotation%180?[e.h,e.w]:[e.w,e.h]);const s=await prepareSource(await pdf.save());snapshot();const idx=sources.push(s)-1;pageEntries.splice(page,0,{id:newPageId(),source:idx,index:1,rotation:0})},'表示中のページの後に空白ページを追加しました。');
async function buildEditedPDF(entries,embedEditable=false){const pdf=await PDFLib.PDFDocument.create(),loaded=new Map();for(const e of entries){if(!loaded.has(e.source))loaded.set(e.source,await PDFLib.PDFDocument.load(sources[e.source].bytes));const [p]=await pdf.copyPages(loaded.get(e.source),[e.index-1]);pdf.addPage(p);const annotations=items[e.id]||[];if(annotations.length){const view=(await sources[e.source].doc.getPage(e.index)).getViewport({scale:1});const c=document.createElement('canvas');c.width=Math.ceil(view.width*2);c.height=Math.ceil(view.height*2);const g=c.getContext('2d');g.scale(2,2);for(const o of annotations){if(o.type==='image'){const im=imageFor(o.src);if(!im.complete)await new Promise((r,j)=>{im.addEventListener('load',r,{once:true});im.addEventListener('error',j,{once:true})})}paint(g,o)}const png=await pdf.embedPng(c.toDataURL('image/png'));const angle=((p.getRotation().angle%360)+360)%360,W=p.getWidth(),H=p.getHeight();const pos=angle===90?{x:W,y:0,width:H,height:W}:angle===180?{x:W,y:H,width:W,height:H}:angle===270?{x:0,y:H,width:H,height:W}:{x:0,y:0,width:W,height:H};p.drawImage(png,{...pos,rotate:PDFLib.degrees(angle)})}p.setRotation(PDFLib.degrees((p.getRotation().angle+e.rotation)%360))}if(embedEditable){const project=makeProject();await pdf.attach(new TextEncoder().encode(JSON.stringify(project)),'kantan-edit-data.json',{mimeType:'application/json',description:'Editable annotations and source PDFs'});}return pdf.save({useObjectStreams:false})}
function choosePDFName(defaultName){return new Promise(resolve=>{const dlg=$('saveNameDialog'),field=$('saveFileName');field.value=defaultName;dlg.hidden=false;const finish=value=>{dlg.hidden=true;field.onkeydown=null;$('confirmSaveName').onclick=null;$('cancelSaveName').onclick=null;resolve(value)};$('confirmSaveName').onclick=()=>{let name=field.value.trim().replace(/[\\/:*?"<>|\x00-\x1f]/g,'_');if(!name){field.focus();return}finish(name.toLowerCase().endsWith('.pdf')?name:name+'.pdf')};$('cancelSaveName').onclick=()=>finish(null);field.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();$('confirmSaveName').click()}else if(e.key==='Escape')finish(null)};field.focus();field.select()})}
async function savePDFAs(data,name){if(window.showSaveFilePicker){try{document.documentElement.style.cursor='auto';document.body.style.cursor='auto';if(typeof canvas!=='undefined'&&canvas)canvas.style.cursor='auto';const handle=await window.showSaveFilePicker({suggestedName:name,types:[{description:'PDF',accept:{'application/pdf':['.pdf']}}]});const writable=await handle.createWritable();await writable.write(new Blob([data],{type:'application/pdf'}));await writable.close();return 'saved'}catch(e){if(e.name==='AbortError')return 'cancelled';console.warn('Save picker unavailable, using download',e)}finally{document.documentElement.style.cursor='';document.body.style.cursor='';if(typeof canvas!=='undefined'&&canvas)canvas.style.cursor='default'}}download(data,name);return 'downloaded'}
async function saveDocument(extract){if(!doc||pageBusy||rendering)return;const entries=extract?requireTargets():pageEntries;if(!entries.length)return;const name=await choosePDFName($('filename').textContent.replace(/\.pdf$/i,'')+(extract?'_選択ページ.pdf':'_編集済み.pdf'));if(!name)return;pageBusy=true;$('save').disabled=true;say('PDFを保存しています…');try{if(!extract)await window.surveyPreparePDFSave?.();const data=await buildEditedPDF(entries,!extract);if(!extract){const recovered=await extractEmbeddedProject(new Uint8Array(data));
if(!recovered||recovered.format!=='kantan-pdf-project'||!Array.isArray(recovered.pageEntries)||recovered.pageEntries.length!==pageEntries.length||JSON.stringify(recovered.annotationsByPage)!==JSON.stringify(items)||JSON.stringify(recovered.pageEntries)!==JSON.stringify(pageEntries)||JSON.stringify(recovered.surveyData??null)!==JSON.stringify(window.surveyPDFExport?.()??null))throw Error('保存PDF内の調査写真・コメントを検証できませんでした。保存を中止しました。');
// v1.4.66: Verify every page, source PDF and annotation count before allowing a download.
// A visually rendered page does not prove that its underlying editable data survived.
if(recovered.sourcePDFs?.length!==sources.length||recovered.sourcePDFs.some((raw,i)=>raw!==bytesToBase64(sources[i].bytes)))throw Error('元PDFの保存データが一致しません。保存を中止しました。');
for(const entry of pageEntries){
 const expected=items[entry.id]||[],actual=recovered.annotationsByPage?.[entry.id]||[];
 if(!Array.isArray(actual)||expected.length!==actual.length)throw Error('ページ '+(pageEntries.indexOf(entry)+1)+' の編集オブジェクト数が一致しません。保存を中止しました。');
}
const checkPdf=await pdfjsLib.getDocument({data:new Uint8Array(data).slice(),isEvalSupported:false,CMapReaderFactory:BundledCMapReader,cMapPacked:true,standardFontDataUrl:'vendor/standard_fonts/'}).promise;
try{
 if(checkPdf.numPages!==pageEntries.length)throw Error('保存PDFのページ数が一致しません。');
 const checkAttachments=await checkPdf.getAttachments();
 if(!checkAttachments||!Object.values(checkAttachments).some(a=>a?.filename?.endsWith('kantan-edit-data.json')))throw Error('再編集情報がPDFに添付されていません。');
}finally{await checkPdf.destroy()}}const outcome=await savePDFAs(data,name);if(outcome==='cancelled'){say('保存を取り消しました。');return}if(!extract){if(outcome==='saved'){dirty=false;history=[];$('filename').textContent=name}else{say('PDFをダウンロードしました。保存完了を確認してください。');return}}say(extract?'選択ページを保存しました。':'再編集情報付きPDFを保存しました。アプリを再起動しても編集できます。')}catch(e){say('保存できませんでした：'+e.message)}finally{pageBusy=false;$('save').disabled=false}}
$('extractPages').onclick=()=>saveDocument(true);
// Block document mutations while asynchronous page work or export is in progress.
for(const event of ['click','change','pointerdown'])document.addEventListener(event,e=>{if(pageBusy){e.preventDefault();e.stopImmediatePropagation()}},true);

$("file").closest("label").addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();$("file").click()}});

// The object clipboard is independent from the currently opened PDF.
let objectClipboard=null,objectPastePoint=null,pasteSerial=0,clipboardStorageSynced=true;
const clipboardStorageKey='kantan-pdf-object-clipboard-v1';
function cloneObject(o){return JSON.parse(JSON.stringify(o))}
function validClipboardPayload(o){return o?.type==='selection'?Array.isArray(o.objects)&&o.objects.length>0&&o.objects.length<=2000&&o.objects.every(validClipboardObject):validClipboardObject(o)}
function selectionPayload(){const objects=selectedObjects().map(cloneObject);return objects.length===1?objects[0]:objects.length?{type:'selection',objects}:null}
function readObjectClipboard(){if(!clipboardStorageSynced)return objectClipboard;try{const raw=sessionStorage.getItem(clipboardStorageKey);if(raw){const data=JSON.parse(raw);if(data.format==='kantan-pdf-object-v1'&&validClipboardPayload(data.object))objectClipboard=data.object}}catch{}return objectClipboard}
function validClipboardObject(o){if(o&&(o.opacity!==undefined&&(!Number.isFinite(o.opacity)||o.opacity<0||o.opacity>1)||o.fillOpacity!==undefined&&(!Number.isFinite(o.fillOpacity)||o.fillOpacity<0||o.fillOpacity>1)||o.fillColor!==undefined&&o.fillColor!==null&&!/^#[0-9a-f]{6}$/i.test(o.fillColor)))return false;if(o&&(o.lineStyle!==undefined&&!['solid','dashed','dotted'].includes(o.lineStyle)||o.startCap!==undefined&&!['none','arrow','circle','ring','square'].includes(o.startCap)||o.endCap!==undefined&&!['none','arrow','circle','ring','square'].includes(o.endCap)))return false;if(!o||!['text','pen','rect','ellipse','arrow','highlight','image','stamp'].includes(o.type)||!Number.isFinite(o.x)||!Number.isFinite(o.y))return false;if(o.type==='text')return typeof o.text==='string'&&Number.isFinite(o.size)&&o.size>0&&(o.fontFamily===undefined||Object.hasOwn(textFonts,o.fontFamily))&&(o.bold===undefined||typeof o.bold==='boolean')&&(o.italic===undefined||typeof o.italic==='boolean');if(o.type==='pen')return Array.isArray(o.points)&&o.points.length>0&&o.points.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y));if(!Number.isFinite(o.w)||!Number.isFinite(o.h))return false;if(o.type==='stamp')return typeof o.text==='string'&&o.text.length>0&&o.text.length<=40&&(['rect','circle'].includes(o.shape)||(o.shape==='instruction-pin'&&['要修正','位置確認','施工済','写真撮影'].includes(o.text))||(o.shape==='survey-pin'&&typeof o.surveyId==='string'&&o.surveyId.length>0&&Number.isSafeInteger(Number(o.surveyNumber))&&Number(o.surveyNumber)>0))&&o.w>0&&o.h>0;if(o.type==='image')return typeof o.src==='string'&&/^data:image\/(png|jpeg|jpg);base64,/i.test(o.src);return true}
function copySelectedObject(cut=false){if(rendering||pageBusy)return;const o=selectionPayload();if(!o){say('コピーする文字・図形・画像を選んでください。');return}objectClipboard=cloneObject(o);pasteSerial=0;if(objectClipboardChannel)objectClipboardChannel.postMessage({kind:'copy',object:objectClipboard});try{sessionStorage.setItem(clipboardStorageKey,JSON.stringify({format:'kantan-pdf-object-v1',object:objectClipboard}));clipboardStorageSynced=true}catch{clipboardStorageSynced=false;say('コピーしました。この画面内で貼り付けできます。')}if(cut)removeSelectedObjects();hideObjectMenu();say(cut?'切り取りました。別ページ・別PDFにも貼り付けできます。':'コピーしました。別ページ・別PDFにも貼り付けできます。')}
function pasteCopiedObject(at=null,duplicate=false){if(!doc||rendering||pageBusy)return;const src=duplicate?selectionPayload():readObjectClipboard();if(!src||!validClipboardPayload(src)){say('先に書き込みをコピーしてください。');hideObjectMenu();return}const objects=(src.type==='selection'?src.objects:[src]).map(cloneObject),boxes=objects.map(bounds),x=Math.min(...boxes.map(b=>b.x)),y=Math.min(...boxes.map(b=>b.y));pasteSerial++;const dx=at?at.x-x:16*(duplicate?1:pasteSerial),dy=at?at.y-y:16*(duplicate?1:pasteSerial);objects.forEach(o=>moveAnnotation(o,cloneObject(o),dx,dy));snapshot();const first=list().length;list().push(...objects);setTool('select');selectIndices(objects.map((_,i)=>first+i));syncEditor();draw();hideObjectMenu();say(objects.length+'件を'+(duplicate?'複製':'貼り付け')+'しました。')}
function hideObjectMenu(){$('objectMenu').hidden=true}
function showObjectMenu(x,y){const menu=$('objectMenu');const canCopy=selected>=0;$('editObject').hidden=selectionIndices().length!==1||list()[selected]?.type!=='text';for(const id of ['copyObject','cutObject','duplicateObject','removeObject'])$(id).disabled=!canCopy;$('pasteObject').disabled=!readObjectClipboard();menu.hidden=false;const r=menu.getBoundingClientRect();menu.style.left=Math.max(8,Math.min(x,window.innerWidth-r.width-8))+'px';menu.style.top=Math.max(8,Math.min(y,window.innerHeight-r.height-8))+'px'}
canvas.addEventListener('contextmenu',e=>{if(!doc||rendering||pageBusy)return;e.preventDefault();finish();const p=point(e);setTool('select');const hit=topAnnotationAt(p);if(!selectionIndices().includes(hit))selectIndices(hit>=0?[hit]:[]);objectPastePoint=p;syncEditor();draw();showObjectMenu(e.clientX,e.clientY)});
$('editObject').onclick=()=>{if(pageBusy||rendering||selectionIndices().length!==1||list()[selected]?.type!=='text')return;hideObjectMenu();syncEditor();$('editText').focus();$('editText').scrollIntoView({block:'nearest'})};
$('copyObject').onclick=()=>copySelectedObject();$('cutObject').onclick=()=>copySelectedObject(true);$('duplicateObject').onclick=()=>pasteCopiedObject(null,true);$('pasteObject').onclick=()=>pasteCopiedObject(objectPastePoint);$('removeObject').onclick=()=>{removeSelectedObjects();hideObjectMenu()};
document.addEventListener('pointerdown',e=>{if(!$('objectMenu').contains(e.target))hideObjectMenu()});window.addEventListener('resize',hideObjectMenu);window.addEventListener('scroll',hideObjectMenu,true);
document.addEventListener('keydown',e=>{if(e.key==='Escape'){hideObjectMenu();return}if(e.target?.closest('input,textarea,select,[contenteditable="true"]'))return;if(!doc||pageBusy||rendering)return;if((e.key==='Delete'||e.key==='Backspace')&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&selected>=0){e.preventDefault();$('delete').click();hideObjectMenu();return;}if(e.ctrlKey||e.metaKey){const key=e.key.toLowerCase();if(key==='c'&&selected>=0){e.preventDefault();copySelectedObject()}else if(key==='x'&&selected>=0){e.preventDefault();copySelectedObject(true)}else if(key==='v'&&readObjectClipboard()){e.preventDefault();pasteCopiedObject()}else if(key==='d'&&selected>=0){e.preventDefault();pasteCopiedObject(null,true)}}});
readObjectClipboard();

// Native tab navigation has no persistent file-selection waiting state.
$('file').closest('label').addEventListener('click',e=>{if(doc){e.preventDefault();e.stopPropagation();$('openAnotherPDF').click();say('新しいタブの「PDFを選択して開く」を押してください。元のPDFはそのままです。')}});
$('pickNewTabPDF').onclick=()=>$('file').click();
if(new URL(window.location.href).searchParams.has('newPDF')){$('newTabStart').hidden=false;$('empty').hidden=true;say('「PDFを選択して開く」を押してください。元のPDFは元のタブに残っています。');const url=new URL(window.location.href);url.searchParams.delete('newPDF');window.history.replaceState(null,'',url.href)}
// Same-origin tab clipboard: held in memory, with no server upload.
let objectClipboardChannel=null;
try{objectClipboardChannel=new BroadcastChannel('kantan-pdf-object-clipboard-v1');objectClipboardChannel.onmessage=event=>{const data=event.data;if(data?.kind==='request'){if(objectClipboard)objectClipboardChannel.postMessage({kind:'copy',object:objectClipboard});return}if(data?.kind==='copy'&&validClipboardPayload(data.object)){objectClipboard=cloneObject(data.object);clipboardStorageSynced=false;pasteSerial=0;if(!$('objectMenu').hidden)$('pasteObject').disabled=false}};objectClipboardChannel.postMessage({kind:'request'})}catch{}

// Editable PDF and standalone project support. Source pages are stored separately to prevent flattening twice.
function bytesToBase64(arr){let out='';for(let i=0;i<arr.length;i+=32768)out+=String.fromCharCode(...arr.subarray(i,i+32768));return btoa(out)}
function base64ToBytes(str){if(typeof str!=='string'||str.length>180000000)throw Error('PDFデータが不正です');const bin=atob(str),out=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)out[i]=bin.charCodeAt(i);if(String.fromCharCode(...out.slice(0,5))!=='%PDF-')throw Error('PDF形式ではありません');return out}
function makeProject(){return {format:'kantan-pdf-project',schemaVersion:2,originalPdfName:$('filename').textContent,sourcePDFs:sources.map(s=>bytesToBase64(s.bytes)),pageEntries:pageEntries.map(e=>({...e})),annotationsByPage:JSON.parse(JSON.stringify(items)),currentPage:page,zoom:Number($('zoom').value),savedAt:new Date().toISOString(),...(window.surveyPDFExport?{surveyData:window.surveyPDFExport()}: {})}}
async function extractEmbeddedProject(data){
  // PDF.js handles PDF name trees and compressed attachment streams across save generations.
  // Always destroy the temporary document; do not change the active editor document.
  let probe=null, pdfjsError=null;
  try{
    probe=await pdfjsLib.getDocument({data:data.slice(),isEvalSupported:false,CMapReaderFactory:BundledCMapReader,cMapPacked:true,standardFontDataUrl:'vendor/standard_fonts/'}).promise;
    const attachments=await probe.getAttachments();
    const entry=attachments&&Object.entries(attachments).find(([key,a])=>
      key.endsWith('kantan-edit-data.json')||a?.filename?.endsWith('kantan-edit-data.json'));
    if(entry){
      const raw=entry[1].content;
      if(!raw||raw.length>180000000)throw Error('再編集データのサイズが不正です');
      const project=JSON.parse(new TextDecoder().decode(raw));
      if(project?.format!=='kantan-pdf-project')throw Error('再編集情報の形式が不正です');
      return project;
    }
  }catch(e){pdfjsError=e;console.warn('PDF.js attachment read failed',e)}
  finally{if(probe)await probe.destroy()}
  // Fallback for PDFs whose attachment name tree is not exposed by PDF.js.
  try{
    const pdf=await PDFLib.PDFDocument.load(data.slice(),{updateMetadata:false});
    const lookup=(d,k,t)=>d?.has(PDFLib.PDFName.of(k))?d.lookup(PDFLib.PDFName.of(k),t):null;
    const names=lookup(pdf.catalog,'Names',PDFLib.PDFDict);
    const tree=lookup(names,'EmbeddedFiles',PDFLib.PDFDict);
    const arr=lookup(tree,'Names',PDFLib.PDFArray);
    if(arr){for(let i=0;i+1<arr.size();i+=2){
      const key=arr.lookup(i),filename=typeof key?.decodeText==='function'?key.decodeText():String(key);
      if(!filename.endsWith('kantan-edit-data.json'))continue;
      const spec=arr.lookup(i+1,PDFLib.PDFDict),ef=lookup(spec,'EF',PDFLib.PDFDict);
      const stream=lookup(ef,'F',PDFLib.PDFRawStream);
      if(!stream)throw Error('再編集データの添付ストリームがありません');
      const raw=PDFLib.decodePDFRawStream(stream).decode();
      if(raw.length>180000000)throw Error('再編集データが大きすぎます');
      return JSON.parse(new TextDecoder().decode(raw));
    }}
  }catch(e){throw Error('編集情報の読込に失敗しました：'+e.message+(pdfjsError?' / '+pdfjsError.message:''))}
  if(pdfjsError)throw Error('添付情報の取得に失敗しました：'+pdfjsError.message);
  return null;
}
async function restoreProject(project){if(project?.format!=='kantan-pdf-project'||![1,2].includes(project.schemaVersion))throw Error('未対応の編集情報です');const raws=project.schemaVersion===2?project.sourcePDFs.map(base64ToBytes):[base64ToBytes(project.originalPdfBase64)];if(!raws.length||raws.length>100)throw Error('元PDFの数が不正です');const staged=[];for(const b of raws)staged.push(await prepareSource(b));const entries=project.schemaVersion===2?project.pageEntries:Array.from({length:staged[0].doc.numPages},(_,i)=>({id:String(i+1),source:0,index:i+1,rotation:0}));if(!Array.isArray(entries)||!entries.length||entries.length>2000||entries.some(e=>!e||!Number.isInteger(e.source)||!staged[e.source]||!Number.isInteger(e.index)||e.index<1||e.index>staged[e.source].doc.numPages||typeof e.id!=='string'||!Number.isFinite(e.rotation)))throw Error('ページ構成が不正です');const annotations=project.annotationsByPage;if(!annotations||typeof annotations!=='object'||Array.isArray(annotations)||Object.values(annotations).some(v=>!Array.isArray(v)||v.some(o=>!validClipboardObject(o))))throw Error('編集オブジェクトが不正です');sources=staged;pageEntries=entries;items=annotations;doc=pageFacade();bytes=raws[0];page=Math.min(Math.max(1,Number(project.currentPage)||1),entries.length);pageChecks.clear();history=[];redoStack=[];selected=-1;dirty=false;$('filename').textContent=project.originalPdfName||'編集済み.pdf';$('save').disabled=false;$('newTabStart').hidden=true;if(Number.isFinite(project.zoom)&&project.zoom>=.15&&project.zoom<=3){window.setPDFZoom?.(project.zoom);if([...$('zoom').options].some(o=>o.value===String(project.zoom)))$('zoom').value=String(project.zoom)};await render();if(!$('pagePanel').hidden)await refreshPageGrid()}
// In-progress PDF handoff into the multi-tab workspace, entirely local to
// this browser origin. No PDF is sent to a server and the source stays open.
window.exportWorkspaceProject=function(){
 if(!doc||pageBusy||rendering||window.__surveyPdfLoading)throw Error('PDFの処理が完了してから開いてください');
 if(window.surveyWorkspaceReady&&!window.surveyWorkspaceReady())throw Error('調査写真・コメントの読込が完了していません');
 return {project:makeProject(),history:[...history],redoStack:[...redoStack],dirty:dirty};
};
window.restoreWorkspaceProject=async function(project,pastHistory,pastRedo,wasDirty){
 if(doc)throw Error('既に別のPDFが開かれています');
 await restoreProject(project);
 await window.surveyPDFLoaded?.(project);
 // Copy valid undo snapshots only after the PDF and annotations are restored.
 if(Array.isArray(pastHistory)&&pastHistory.every(x=>typeof x==='string'))history=pastHistory.slice(-60);
 if(Array.isArray(pastRedo)&&pastRedo.every(x=>typeof x==='string'))redoStack=pastRedo.slice(-60);
 dirty=Boolean(wasDirty);
 draw();
};
function downloadProject(){if(!doc)return;const blob=new Blob([JSON.stringify(makeProject())],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=$('filename').textContent.replace(/\.pdf$/i,'')+'.pdfproj';a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);say('プロジェクトをダウンロードしました。保存先を確認してください。')}




function captureHistoryState(){return JSON.stringify({items,entries:pageEntries,page})}
async function travelHistory(forward){
 if(!doc||rendering||pageBusy||start||working)return;
 const from=forward?redoStack:history,to=forward?history:redoStack;
 if(!from.length)return;
 const current=captureHistoryState(),target=from.pop();to.push(current);if(to.length>60)to.shift();
 const saved=JSON.parse(target);items=saved.items;pageEntries=saved.entries;page=Math.max(1,Math.min(saved.page,pageEntries.length));
 pageChecks=new Set([...pageChecks].filter(id=>pageEntries.some(e=>e.id===id)));selectIndices([]);dirty=true;
 window.invalidateMobileShare?.();pageBusy=true;
 try{await render();if(!$('pagePanel').hidden)await refreshPageGrid();say(forward?'取り消した編集をやり直しました。':'直前の編集を取り消しました。')}
 catch(e){say('履歴の表示に失敗しました：'+e.message)}finally{pageBusy=false;window.updateUsability?.()}
}

function paintLineEnd(c,x,y,a,cap){if(cap==='none')return;c.beginPath();if(cap==='circle'){c.arc(x,y,4,0,Math.PI*2);c.fill()}else if(cap==='ring'){c.arc(x,y,5,0,Math.PI*2);c.stroke()}else if(cap==='square'){c.rect(x-5,y-5,10,10);c.stroke()}else if(cap==='arrow'){c.moveTo(x-14*Math.cos(a-.45),y-14*Math.sin(a-.45));c.lineTo(x,y);c.lineTo(x-14*Math.cos(a+.45),y-14*Math.sin(a+.45));c.stroke()}}

function paintStamp(c,o){
const w=o.w,h=o.h,x=o.x,y=o.y,m=Math.min(w,h),edge=Math.max(.7,m*.035);c.setLineDash([]);c.lineWidth=edge;
if(o.surveyId||o.shape==='survey-pin'||o.shape==='instruction-pin'){
 // A round-headed location pin. The sharp tip is at (x+w/2,y+h),
 // while the number remains in the round head. Older survey circles are
 // rendered as pins too, without changing saved records or surveyId.
 // Legacy circle markers were centered on the clicked point. Keep their
 // tip at that original point when displaying them as a pin.
 const pinY=(o.shape==='survey-pin'||o.shape==='instruction-pin')?y:y-h/2;
 const cx=x+w/2,cy=pinY+h*.37,r=Math.min(w*.39,h*.36);
 const a=Math.PI*.25,b=Math.PI*.75;
 c.save();c.setLineDash([]);c.beginPath();
 // Take the long arc across the top of the circular head, leaving a
 // small opening at the bottom for two straight sides to the tip.
 c.arc(cx,cy,r,a,b,true);
 c.lineTo(cx,pinY+h);c.closePath();
 c.fillStyle=o.color||'#d12c40';c.strokeStyle='#fff';
 c.lineWidth=Math.max(.9,m*.065);c.fill();c.stroke();
 c.font='bold '+Math.max(7,Math.min(r*.95,r*2.0/Math.max(1,String(o.text||'').length*.65)))+'px sans-serif';
 c.fillStyle='#fff';c.textAlign='center';c.textBaseline='middle';
 if(o.shape==='instruction-pin'){
  // Two compact lines of Japanese instruction text inside the pin head.
  const letters=Array.from(String(o.text||''));const split=Math.ceil(letters.length/2);
  const lines=letters.length>2?[letters.slice(0,split).join(''),letters.slice(split).join('')]:[letters.join('')];
  const fontSize=Math.max(7,Math.min(r*.69,19/Math.max(1,split*.66)));
  c.font='bold '+fontSize+'px sans-serif';
  lines.forEach((line,i)=>c.fillText(line,cx,cy+(i-(lines.length-1)/2)*fontSize*.95,r*1.65));
 }else c.fillText(String(o.text||''),cx,cy+Math.min(1,h*.03),r*1.78);
 c.restore();return;
}
if(o.shape==='circle'){for(const inset of [edge,edge*3]){c.beginPath();c.ellipse(x+w/2,y+h/2,Math.max(.1,w/2-inset),Math.max(.1,h/2-inset),0,0,Math.PI*2);c.stroke()}}
else{for(const inset of [edge,edge*3])c.strokeRect(x+inset,y+inset,Math.max(.1,w-2*inset),Math.max(.1,h-2*inset))}
c.font='bold '+Math.min(h*.49,w*.76/Math.max(1,[...o.text].length))+'px serif';c.textAlign='center';c.textBaseline='middle';c.fillText(o.text,x+w/2,y+h/2,w*.76);
}

function fillShape(c,o,fill){if(!o.fillColor)return;c.save();c.fillStyle=o.fillColor;c.globalAlpha*=o.fillOpacity??1;fill();c.restore()}
