/* Survey extension on top of unchanged PDF editing engine. No changes to source app.js. */
(()=>{'use strict';
const by=id=>document.getElementById(id);const PREFIX='field-survey-v03';let records={},activeId=null,placing=false,changeSerial=0,db=null,activeStorageKey=null,storageGeneration=0,storageLoading=false,siteId='';
const status=msg=>{const el=by('surveyStatus');if(!el)return;el.textContent=msg;el.dataset.state=/失敗|できません|エラー|不正|確認してください|開いて|ないため|ありません|準備/.test(msg)?'error':/出力しました|完了|保存しました/.test(msg)?'success':'info';};
const siteField=by('surveySiteId'),siteCurrent=by('surveySiteCurrent');
function validateSite(v){const id=String(v||'').trim();return id.length>=1&&id.length<=60&&!/[<>\\/\x00-\x1f]/.test(id)?id:null}
function siteLabel(){siteCurrent.textContent=siteId?'旧方式の現場ID：'+siteId+'（PDF内の調査記録が優先されます）':'通常は現場ID不要。編集済みPDFに写真・メモも保存します'}
siteLabel();
const getPage=()=>typeof pageEntries!=='undefined'&&pageEntries[page-1] ? pageEntries[page-1].id : null;
const pins=()=>Object.entries(items||{}).flatMap(([pageId,arr])=>(arr||[]).filter(o=>o.surveyId&&o.type==='stamp').map(o=>({pageId,o})));
// Numbering is scoped to this PDF session's page entries, never the global photo database.
const scope=()=>by('surveyNumberScope').value;
const validPages=()=>new Set((pageEntries||[]).map(e=>e.id));
const documentPins=()=>{const ids=validPages();return pins().filter(p=>ids.has(p.pageId))};
function numberFor(pageId){
 const used=new Set(documentPins().filter(p=>scope()==='document'||p.pageId===pageId)
  .map(p=>Number(p.o.surveyNumber)).filter(n=>Number.isSafeInteger(n)&&n>0));
 // Reuse the first missing positive number; do not renumber remaining pins.
 let candidate=1;
 while(used.has(candidate))candidate++;
 return candidate;
}
function currentPageNumber(pageId){return (pageEntries||[]).findIndex(e=>e.id===pageId)+1}
function renumberAll(){
 // Sequence within each page in original placement order; stable surveyId retains photo associations.
 const serials=new Map();let changes=0;
 for(const entry of pageEntries||[]){
  for(const o of items[entry.id]||[]){if(!o.surveyId||o.type!=='stamp')continue;
   const key=scope()==='document'?'all':entry.id;
   const num=(serials.get(key)||0)+1;serials.set(key,num);
   if(o.surveyNumber!==num||o.text!==String(num)){o.surveyNumber=num;o.text=String(num);changes++}
  }
 }
 return changes;
}
function safeName(s){return String(s||'').replace(/[<>]/g,'').slice(0,150)}
function renderList(){let entries=documentPins().sort((a,b)=>currentPageNumber(a.pageId)-currentPageNumber(b.pageId)||Number(a.o.surveyNumber)-Number(b.o.surveyNumber));let box=by('surveyPinList');box.textContent='';for(const {pageId,o} of entries){let b=document.createElement('button');b.type='button';b.className='survey-record'+(activeId===o.surveyId?' active':'');const r=records[o.surveyId]||{};b.textContent=`${scope()==='page'?'P'+currentPageNumber(pageId)+' / ':''}No.${String(o.surveyNumber).padStart(3,'0')}　${safeName((r.memo||'').split('\n')[0]||'調査記録')}　(${(r.photos||[]).length}枚)`;b.onclick=()=>openRecord(o.surveyId,pageId);box.append(b)} }
const surveyDialog=by('surveyDialog');
function showSurveyDialog(){if(!surveyDialog.open)surveyDialog.showModal()}
function hideSurveyDialog(){if(surveyDialog.open)surveyDialog.close()}
surveyDialog.addEventListener('close',()=>{activeId=null;renderList()});
by('surveyDialogX').onclick=()=>hideSurveyDialog();
surveyDialog.addEventListener('click',e=>{if(e.target===surveyDialog)hideSurveyDialog()});
// Recognized stylus: hold an existing survey pin for 650ms to open its record.
// The hit pin consumes ONLY that pen contact, so the editor cannot accidentally
// drag/resize the pin while it waits. Finger double-tap and mouse double-click stay intact.
const PEN_PIN_HOLD_MS=650,PEN_PIN_MOVE_PX=12;
let penPinHold=null,penPinSuppressClickUntil=0;
function clearPenPinHold(){
 if(penPinHold?.timer)clearTimeout(penPinHold.timer);
 penPinHold=null;
}
canvas.addEventListener('pointerdown',e=>{
 if(e.pointerType!=='pen'||e.button!==0||!e.isPrimary||!doc||rendering||pageBusy)return;
 const p=point(e);
 const hit=[...list().keys()].reverse().find(i=>list()[i]?.surveyId&&hitAnnotation(list()[i],p));
 if(hit===undefined)return;
 const pin=list()[hit],pageId=getPage();
 clearPenPinHold();
 const state={id:e.pointerId,x:e.clientX,y:e.clientY,pageId,pinId:pin.surveyId,hit,timer:null,opened:false,moved:false};
 penPinHold=state;
 state.timer=setTimeout(()=>{
  if(penPinHold!==state||state.moved||!doc||rendering||pageBusy||getPage()!==state.pageId)return;
  const current=list().find(o=>o.surveyId===state.pinId);
  if(!current)return;
  state.opened=true;
  penPinSuppressClickUntil=Date.now()+1000;
  // Do not modify the selected pin's geometry or the PDF undo history.
  setTool('select',false);
  const index=list().indexOf(current);
  selectIndices([index]);syncEditor();draw();
  openRecord(state.pinId,state.pageId);
 },PEN_PIN_HOLD_MS);
 canvas.setPointerCapture(e.pointerId);
 e.preventDefault();e.stopImmediatePropagation();
},true);
canvas.addEventListener('pointermove',e=>{
 const state=penPinHold;
 if(!state||e.pointerId!==state.id)return;
 if(Math.hypot(e.clientX-state.x,e.clientY-state.y)>PEN_PIN_MOVE_PX){
  state.moved=true;clearTimeout(state.timer);
 }
 e.preventDefault();e.stopImmediatePropagation();
},true);
canvas.addEventListener('pointerup',e=>{
 const state=penPinHold;
 if(!state||e.pointerId!==state.id)return;
 if(!state.opened&&!state.moved&&getPage()===state.pageId){
  const index=list().findIndex(o=>o.surveyId===state.pinId);
  if(index>=0){setTool('select',false);selectIndices([index]);syncEditor();draw();canvas.dispatchEvent(new Event('survey-pin-selected'));}
 }
 clearPenPinHold();
 e.preventDefault();e.stopImmediatePropagation();
},true);
canvas.addEventListener('pointercancel',e=>{
 if(penPinHold?.id!==e.pointerId)return;
 clearPenPinHold();
 e.preventDefault();e.stopImmediatePropagation();
},true);
canvas.addEventListener('contextmenu',e=>{
 if(penPinHold||Date.now()<penPinSuppressClickUntil){
  e.preventDefault();e.stopImmediatePropagation();
 }
},true);
canvas.addEventListener('click',e=>{
 if(Date.now()<penPinSuppressClickUntil){
  e.preventDefault();e.stopImmediatePropagation();
 }
},true);
// Double click directly on an existing survey stamp opens its photo/comment dialog.
// Capture phase preempts the original text-editor double click handler for survey pins only.
canvas.addEventListener('dblclick',e=>{
 if(!doc||rendering||pageBusy||e.button>0)return;
 const p=point(e);
 const i=[...list().keys()].reverse().find(i=>list()[i]?.surveyId && hitAnnotation(list()[i],p));
 if(i===undefined)return;
 e.preventDefault();e.stopImmediatePropagation();
 // Left double-click always edits an existing pin, even while continuous placement is ON.
 setTool('select',false);selectIndices([i]);syncEditor();draw();openRecord(list()[i].surveyId,getPage());
},true);
// Two deliberate taps on a pin also open the dialog on touch devices.
let recentTap=null;
canvas.addEventListener('pointerup',e=>{
 if(e.pointerType!=='touch'||window.fieldStylusMode||placing||!doc||rendering||pageBusy||!e.isPrimary)return;
 const p=point(e),idx=[...list().keys()].reverse().find(i=>list()[i]?.surveyId&&hitAnnotation(list()[i],p));
 if(idx===undefined){recentTap=null;return}
 const pin=list()[idx],now=Date.now();
 if(recentTap&&recentTap.id===pin.surveyId&&now-recentTap.time<440&&Math.hypot(p.x-recentTap.x,p.y-recentTap.y)<16){
  recentTap=null;openRecord(pin.surveyId,getPage());
 }else recentTap={id:pin.surveyId,time:now,x:p.x,y:p.y};
},true);
function openRecord(id,pg){if(storageLoading||activeStorageKey!==documentStorageKey()){status('この図面の記録を読み込み中です。');return}const found=documentPins().find(v=>v.o.surveyId===id);if(!found){status('番号ピンがありません');return}activeId=id;records[id] ||= {memo:'',instruction:'',photos:[]};const r=records[id];showSurveyDialog();by('surveyPinTitle').textContent='調査番号 No.'+String(found.o.surveyNumber).padStart(3,'0');by('surveyMemo').value=r.memo||'';by('surveyInstruction').value=r.instruction||'';renderPhotos();renderList();updateRecordNavigation(); if(pg!==getPage()){status('記録を表示しました。該当図面へはPDF編集のページ切替で移動してください。')}else status('調査記録を編集中');}
// Ver.1.4.26: photo preview does not change the survey records; deletion remains separate.
const photoViewer=document.createElement('dialog');
photoViewer.id='surveyPhotoViewer';photoViewer.className='survey-photo-viewer';
photoViewer.setAttribute('aria-label','調査写真の拡大表示');
photoViewer.innerHTML='<div class="survey-viewer-head"><span id="surveyViewerTitle"></span><button id="surveyViewerClose" type="button">閉じる ×</button></div><img id="surveyViewerImage" alt="調査写真の拡大表示"><div class="survey-viewer-actions"><button type="button" id="surveyViewerPrev">前の写真</button><button type="button" id="surveyViewerNext">次の写真</button></div>';
document.body.append(photoViewer);
let viewerIndex=0,viewerRecordId=null;
function closePhotoViewer(){if(photoViewer.open)photoViewer.close();viewerRecordId=null}
function showPhotoViewer(id,index){
 const photos=records[id]?.photos||[];
 if(!photos.length){closePhotoViewer();return}
 viewerRecordId=id;viewerIndex=(index+photos.length)%photos.length;
 const photo=photos[viewerIndex];
 // Never load arbitrary URLs from imported data.
 if(!/^data:image\/(?:png|jpeg|webp|gif|heic|heif|avif|bmp);base64,[A-Za-z0-9+/=]+$/.test(photo.data||'')){closePhotoViewer();status('安全な写真データではないため表示できません');return}
 by('surveyViewerImage').src=photo.data;
 by('surveyViewerTitle').textContent='写真 '+(viewerIndex+1)+' / '+photos.length+(photo.name?'　'+safeName(photo.name):'');
 by('surveyViewerPrev').disabled=photos.length<2;by('surveyViewerNext').disabled=photos.length<2;
 if(!photoViewer.open)photoViewer.showModal();
}
by('surveyViewerClose').onclick=closePhotoViewer;
by('surveyViewerPrev').onclick=()=>showPhotoViewer(viewerRecordId,viewerIndex-1);
by('surveyViewerNext').onclick=()=>showPhotoViewer(viewerRecordId,viewerIndex+1);
photoViewer.addEventListener('click',e=>{if(e.target===photoViewer)closePhotoViewer()});
photoViewer.addEventListener('close',()=>{viewerRecordId=null;by('surveyViewerImage').removeAttribute('src')});
// Closing/reloading the record must not leave an unrelated enlarged photo on screen.
surveyDialog.addEventListener('close',closePhotoViewer);
function renderPhotos(){
 const b=by('surveyThumbnails');b.textContent='';if(!activeId)return;
 const id=activeId,r=records[id];(r?.photos||[]).forEach((photo,i)=>{
  const w=document.createElement('div');w.className='survey-photo';
  const preview=document.createElement('button');preview.type='button';preview.className='survey-photo-preview';
  preview.title='写真を拡大表示';preview.setAttribute('aria-label','調査写真 '+(i+1)+' を拡大表示');
  const im=document.createElement('img');im.src=photo.data;im.alt='調査写真 '+(i+1);
  preview.append(im);preview.onclick=()=>showPhotoViewer(id,i);
  const actions=document.createElement('div');actions.className='survey-photo-actions';
  const left=document.createElement('button');left.type='button';left.textContent='←';left.title='写真を前へ';left.disabled=i===0;
  left.onclick=()=>{[r.photos[i-1],r.photos[i]]=[r.photos[i],r.photos[i-1]];queueSave();renderPhotos()};
  const right=document.createElement('button');right.type='button';right.textContent='→';right.title='写真を後へ';right.disabled=i===r.photos.length-1;
  right.onclick=()=>{[r.photos[i],r.photos[i+1]]=[r.photos[i+1],r.photos[i]];queueSave();renderPhotos()};
  const del=document.createElement('button');del.type='button';del.textContent='削除';del.className='survey-photo-delete';
  del.onclick=()=>{if(!confirm('この写真を削除しますか？'))return;closePhotoViewer();r.photos.splice(i,1);queueSave();renderPhotos();renderList()};
  actions.append(left,right,del);w.append(preview,actions);b.append(w)
 })
}
// PC editing: navigate survey records in page/number order without closing the dialog.
const recordNavigation=document.createElement('nav');recordNavigation.className='survey-record-navigation';
recordNavigation.setAttribute('aria-label','調査番号の切り替え');
recordNavigation.innerHTML='<button type="button" id="surveyRecordPrev">← 前の番号</button><span id="surveyRecordPosition" role="status"></span><button type="button" id="surveyRecordNext">次の番号 →</button>';
by('surveyPinTitle').after(recordNavigation);
function sortedRecords(){return documentPins().sort((a,b)=>currentPageNumber(a.pageId)-currentPageNumber(b.pageId)||Number(a.o.surveyNumber)-Number(b.o.surveyNumber))}
function updateRecordNavigation(){const entries=sortedRecords();const index=entries.findIndex(p=>p.o.surveyId===activeId);
 by('surveyRecordPrev').disabled=index<=0;by('surveyRecordNext').disabled=index<0||index>=entries.length-1;
 by('surveyRecordPosition').textContent=index>=0?(index+1)+' / '+entries.length+' 件':'';
}
function moveRecord(direction){const entries=sortedRecords(),i=entries.findIndex(p=>p.o.surveyId===activeId),next=entries[i+direction];if(next){closePhotoViewer();openRecord(next.o.surveyId,next.pageId)}}
by('surveyRecordPrev').onclick=()=>moveRecord(-1);by('surveyRecordNext').onclick=()=>moveRecord(1);

function markPin(x,y){if(!activeStorageKey||activeStorageKey!==documentStorageKey()||storageLoading){status('この図面の調査記録を準備中です。再操作してください。');return}if(!doc||!getPage()||rendering||pageBusy){status('先にPDF図面を開いてください');return}const id=crypto.randomUUID?crypto.randomUUID():String(Date.now())+'-'+Math.random().toString(36).slice(2);const n=numberFor(getPage());snapshot();const o={type:'stamp',x:x-12,y:y-24,w:24,h:24,shape:'survey-pin',text:String(n),color:'#d12c40',surveyId:id,surveyNumber:n};list().push(o);records[id]={memo:'',instruction:'',photos:[]};setTool('select',false);selectIndices([list().length-1]);draw();queueSave();renderList();status('調査番号 No.'+String(n).padStart(3,'0')+' を追加しました。PDF保存時には番号印も図面に出力されます。')}
// Right-click (mouse) / one-finger tap (touch) while placement mode is active.
// Continuous mode keeps placement enabled; other editing interactions stay unchanged when it is OFF.
let lastTouchPlacement=0;
const SURVEY_PIN_GUARD_MS=850;
let previousPinPlacedAt=0,previousPinPoint=null;
// Deliberately prevent second and duplicate pointer events from creating
// adjacent numbers. Continuous numbering still works after the guard interval.
function recentlyPlacedPin(p){
 const elapsed=Date.now()-previousPinPlacedAt;
 return elapsed>=0&&elapsed<SURVEY_PIN_GUARD_MS;
}
function nearbyExistingSurveyPin(p){
 return list().some(o=>o.surveyId&&hitAnnotation(o,p));
}

function setPlace(v){
 placing=!!v;
 const btn=by('surveyPinMode');
 btn.setAttribute('aria-pressed',String(placing));
 btn.classList.toggle('pin-placement-active',placing);
 btn.textContent='調査番号を配置：'+(placing?'ON':'OFF');
 canvas.style.cursor=placing?'crosshair':(tool==='select'?'default':'crosshair');
 status(placing?'PCは空いている図面を右クリックして番号配置、既存番号を左ダブルクリックで記録編集。スマホは図面を1本指でタップしてください。'+(by('surveyContinuous').checked?'連続採番中です。':'1件配置すると終了します。'):'番号配置を終了しました。通常のPDF編集操作に戻りました。');
}
function placeFromEvent(e){
 if(!placing||!doc||rendering||pageBusy)return false;
 const rect=canvas.getBoundingClientRect();
 if(rect.width===0||rect.height===0||e.clientX<rect.left||e.clientX>rect.right||e.clientY<rect.top||e.clientY>rect.bottom)return false;
 e.preventDefault();e.stopImmediatePropagation();
 const p=point(e);
 if(!Number.isFinite(p.x)||!Number.isFinite(p.y))return false;
 // This guard must run for pen, finger and contextmenu, before changing the
 // PDF or allocating a new surveyId. It also absorbs a double-tap's second event.
 if(recentlyPlacedPin(p)){
  status('連続タッチによる調査番号の重複配置を防止しました。');
  return true;
 }
 // Existing numbered markers are never overwritten by another placement.
 if(nearbyExistingSurveyPin(p)){
  status('既存の調査番号の上には重ねて配置しません。');
  return true;
 }
 // Always advance only through markPin's normal validated construction path.
 const countBefore=list().length;
 markPin(p.x,p.y);
 if(list().length<=countBefore)return true;
 previousPinPlacedAt=Date.now();previousPinPoint={x:p.x,y:p.y};
 lastTouchPlacement=previousPinPlacedAt;
 // A pin is always a single deliberate placement. The next pin requires
 // the user to press the placement button again (even if continuous was ON).
 setPlace(false);
 if(by('surveyContinuous'))by('surveyContinuous').checked=false;
 status('調査番号を1件配置しました。続ける場合は配置ボタンをもう一度押してください。');
 return true;
}
// Register capture listeners before the original PDF editor's context menu handler.
canvas.addEventListener('contextmenu',e=>{
 if(!placing)return;
 // Android long press after a touch must not create a second pin.
 if(Date.now()-lastTouchPlacement<900){e.preventDefault();e.stopImmediatePropagation();return;}
 placeFromEvent(e);
},true);
canvas.addEventListener('pointerdown',e=>{
 if(!placing)return;
 if(e.pointerType==='touch'&&!window.fieldStylusMode&&e.isPrimary&&e.button===0){
  if(placeFromEvent(e))lastTouchPlacement=Date.now();
 }else if(e.pointerType==='pen'&&e.button===0&&e.isPrimary){
  placeFromEvent(e);
 }
 // Mouse left click keeps standard editing behavior. Right click is handled by contextmenu.
},true);
by('surveyPinMode').onclick=()=>setPlace(!placing);
by('surveyNumberScope').onchange=()=>{
 const existing=documentPins();
 if(existing.length){
  if(!confirm('採番方式を変更すると、現在開いているPDFの番号をページ順に振り直します。写真・メモとの紐付けは維持しますが、配布済み図面の番号と異なる可能性があります。続行しますか？')){
   by('surveyNumberScope').value=scope()==='document'?'page':'document';return;
  }
  snapshot();const changed=renumberAll();draw();queueSave();
  status('採番方式を変更し、'+changed+'件の番号表示を更新しました。編集済みPDFを保存してください。');
 }else status('採番方式を変更しました。次の番号は001から開始します。');
 renderList();if(activeId){const found=documentPins().find(v=>v.o.surveyId===activeId);if(found)by('surveyPinTitle').textContent='調査番号 No.'+String(found.o.surveyNumber).padStart(3,'0')}
};
by('surveyContinuous').onchange=()=>{if(placing)setPlace(true)};

by('surveyClose').onclick=()=>hideSurveyDialog();
for(const [id,key] of [['surveyMemo','memo'],['surveyInstruction','instruction']])by(id).addEventListener('input',()=>{if(!activeId||!records[activeId])return;records[activeId][key]=by(id).value;queueSave();renderList()});
async function photos(e){if(!activeId){status('先に番号を選択してください');return}const r=records[activeId];if(!r)return;for(const f of [...e.target.files]){if(!f.type.startsWith('image/'))continue;if(f.size>15*1024*1024){status('15MBを超える写真は追加できません');continue}const data=await new Promise((res,rej)=>{const fr=new FileReader();fr.onload=()=>res(fr.result);fr.onerror=rej;fr.readAsDataURL(f)});r.photos.push({name:safeName(f.name),data})}e.target.value='';renderPhotos();renderList();queueSave()}
by('surveyCamera').onchange=photos;by('surveyPhotos').onchange=photos;
by('surveySiteApply').onclick=async()=>{const next=validateSite(siteField.value);if(!next){status('現場IDを1〜60文字で入力してください。');return}if(next===siteId){status('この現場を使用中です。');return}if(activeStorageKey&&db){clearTimeout(changeSerial);try{await dbPut(activeStorageKey,{records:structuredClone(records),version:3,siteId})}catch(e){status('現在の現場の記録保存に失敗しました。切替を中止しました。');return}}siteId=next;siteLabel();try{localStorage.setItem(PREFIX+':siteId',siteId)}catch(e){console.warn('Site ID preference not persisted',e)}await syncDocumentRecords();status('現場ID「'+siteId+'」に切り替えました。')};
function queueSave(){clearTimeout(changeSerial);changeSerial=setTimeout(()=>{void save()},450)}
function openDb(){return new Promise((resolve,reject)=>{const req=indexedDB.open(PREFIX,1);req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains('survey'))req.result.createObjectStore('survey')};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
// Use PDF.js original-file fingerprint, never the filename, which may be reused across jobs.
function pdfFingerprint(){if(!doc||typeof sources==='undefined'||!sources.length)return null;const fp=sources[0]?.doc?.fingerprints?.[0];return typeof fp==='string'&&/^[a-zA-Z0-9_-]{8,128}$/.test(fp)?fp:null}
function documentStorageKey(){const fp=pdfFingerprint();return fp?(siteId?'site:'+encodeURIComponent(siteId)+':document:'+fp:'document:'+fp):null}
function dbGet(key){return new Promise((resolve,reject)=>{const tx=db.transaction('survey','readonly');const req=tx.objectStore('survey').get(key);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
function dbPut(key,value){return new Promise((resolve,reject)=>{const tx=db.transaction('survey','readwrite');tx.objectStore('survey').put(value,key);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error)})}
async function syncDocumentRecords(){
 const key=documentStorageKey();if(key===activeStorageKey)return;
 const generation=++storageGeneration;const previousKey=activeStorageKey;const previousRecords=records;clearTimeout(changeSerial);if(previousKey&&db){try{await dbPut(previousKey,{records:structuredClone(previousRecords),version:3})}catch(err){console.warn('Previous PDF save failed',err);status('前のPDFの記録を保存できませんでした。切替を中止してください。');return}}if(generation!==storageGeneration)return;activeStorageKey=key;storageLoading=!!key;records={};activeId=null;hideSurveyDialog();renderList();if(!key)return;
 try{
  db ||=await openDb();const stored=await dbGet(key);if(generation!==storageGeneration)return;
  if(stored&&stored.records&&typeof stored.records==='object')records=stored.records;
  else{
   // Keep legacy 'latest' intact. Copy only ID-matched records, after explicit confirmation.
   const oldDocKey='document:'+pdfFingerprint();const previous=await dbGet(oldDocKey);const legacy=previous?.records?previous:await dbGet('latest');if(generation!==storageGeneration)return;
   const ids=new Set(documentPins().map(p=>p.o.surveyId));
   const matches=Object.fromEntries(Object.entries(legacy?.records||{}).filter(([id])=>ids.has(id)));
   if(Object.keys(matches).length&&confirm('以前の保存データから、このPDFの番号と一致する写真・メモが見つかりました。コピーして引き継ぎますか？（元データは残します）')){
    if(generation!==storageGeneration)return;records=matches;await dbPut(key,{records:matches,version:3,siteId,migratedFrom:previous?.records?oldDocKey:'latest'});
   }
  }
  if(generation===storageGeneration){storageLoading=false;renderList();status('このPDF専用の写真・メモを読み込みました。')}
 }catch(e){if(generation===storageGeneration){storageLoading=false;activeStorageKey=null;status('このPDFの保存データを読み込めませんでした。保存を中止しています。')}}
}
async function save(){
 const key=activeStorageKey;if(!key||key!==documentStorageKey()||storageLoading){status('保存先PDFを確認できないため記録を保存していません。');return}
 try{db ||=await openDb();if(key!==activeStorageKey||key!==documentStorageKey())return;
  const snapshotRecords=structuredClone(records);await dbPut(key,{records:snapshotRecords,version:3,siteId});
  status('写真・メモをこのPDF専用の端末保存領域へ保存しました（番号印はPDF保存も行ってください）。');
 }catch(err){console.warn(err);status('保存に失敗しました。バックアップを作成してください。')}
}
function download(data,name){const blob=new Blob([JSON.stringify(data)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),4000)}
by('surveyExport').onclick=()=>{download({type:PREFIX,version:2,documentKey:activeStorageKey,siteId,exportedAt:new Date().toISOString(),records},'現場調査_写真メモ_'+new Date().toISOString().slice(0,10)+'.json');status('このPDFの写真・メモをバックアップしました。番号印は別途PDF保存してください。')};
by('surveyImport').onchange=async e=>{const f=e.target.files?.[0];if(!f)return;try{
 if(!activeStorageKey||activeStorageKey!==documentStorageKey()||storageLoading)throw Error('対応するPDFを先に開いてください');
 const d=JSON.parse(await f.text());if(d.type!==PREFIX||!d.records||typeof d.records!=='object'||Array.isArray(d.records))throw Error('形式が異なります');
 if(d.siteId&&d.siteId!==siteId)throw Error('異なる現場IDのバックアップです');if(d.documentKey&&d.documentKey!==activeStorageKey&&!d.documentKey.startsWith('document:'))throw Error('異なるPDFのバックアップです');
 const ids=new Set(documentPins().map(p=>p.o.surveyId));
 const imported=Object.fromEntries(Object.entries(d.records).filter(([id])=>ids.has(id)));
 if(Object.keys(d.records).length!==Object.keys(imported).length)throw Error('このPDFに存在しない番号の記録が含まれています');
 if(!confirm('このPDFの写真・メモ記録を読み込みデータで置き換えますか？'))return;
 records=imported;activeId=null;hideSurveyDialog();await save();renderList();status('このPDFの写真・メモを読み込みました。');
 }catch(err){status('バックアップ形式を確認してください：'+err.message)}finally{e.target.value=''}};

/* v1.3: One self-contained JSON file with original PDFs, editable annotations and site records.
   The old PDF export and photo/memo JSON exports remain unchanged. */
let bundleBusy=false;
function validateBundle(payload){
 if(!payload||payload.format!=='field-survey-complete'||payload.version!==1)throw Error('現場データ一括ファイルではありません');
 const site=validateSite(payload.siteId);
 if(!site)throw Error('現場IDが不正です');
 const project=payload.project;
 if(!project||project.format!=='kantan-pdf-project'||project.schemaVersion!==2||!Array.isArray(project.sourcePDFs)||!project.sourcePDFs.length||project.sourcePDFs.length>100)throw Error('PDF図面データが不正です');
 if(!Array.isArray(project.pageEntries)||!project.pageEntries.length||project.pageEntries.length>2000||!project.annotationsByPage||typeof project.annotationsByPage!=='object'||Array.isArray(project.annotationsByPage))throw Error('図面のページ・番号情報が不正です');
 if(!payload.records||typeof payload.records!=='object'||Array.isArray(payload.records))throw Error('写真・コメント情報が不正です');
 // Preserve orphan records too: deleting a pin must not silently discard historical photos.
 const pinsInBundle=new Set();
 for(const entry of project.pageEntries){
  if(!entry||typeof entry.id!=='string'||!Array.isArray(project.annotationsByPage[entry.id]||[]))throw Error('図面構成が不正です');
  for(const obj of project.annotationsByPage[entry.id]||[])if(obj?.surveyId&&obj.type==='stamp')pinsInBundle.add(obj.surveyId);
 }
 for(const [id,r] of Object.entries(payload.records)){
  if(!r||typeof r!=='object'||Array.isArray(r)||typeof r.memo!=='string'||typeof r.instruction!=='string'||!Array.isArray(r.photos)||r.photos.length>200)throw Error('番号と写真・メモの整合性を確認できません');
  for(const p of r.photos)if(!p||typeof p.data!=='string'||!/^data:image\/(?:jpeg|png|webp|gif);base64,[a-zA-Z0-9+/=]+$/.test(p.data))throw Error('写真データの形式が不正です');
 }
 return {site,project,records:payload.records};
}
by('surveyBundleExport').onclick=async()=>{
 if(bundleBusy)return;
 if(!doc||!activeStorageKey||storageLoading||activeStorageKey!==documentStorageKey()){status('現場IDとPDFを設定してから一括保存してください。');return}
 bundleBusy=true;
 try{
  clearTimeout(changeSerial);
  await save();
  if(!db)throw Error('端末保存領域がありません');
  const snapshotRecords=structuredClone(records);
  const project=makeProject();
  const bundle={format:'field-survey-complete',version:1,appVersion:'1.3-dev',siteId,exportedAt:new Date().toISOString(),project,records:snapshotRecords};
  validateBundle(bundle);
  const name='現場調査一括_'+siteId.replace(/[^\w\u3040-\u30ff\u3400-\u9fff-]/g,'_').slice(0,40)+'_'+new Date().toISOString().slice(0,10)+'.json';
  download(bundle,name);
  status('現場データ一括ファイルのダウンロードを開始しました。保存先を確認してください。');
 }catch(e){console.warn(e);status('一括保存できませんでした：'+e.message)}
 finally{bundleBusy=false}
};
by('surveyBundleImport').onchange=async e=>{
 const file=e.target.files?.[0];e.target.value='';if(!file||bundleBusy)return;
 bundleBusy=true;
 try{
  if(file.size>250*1024*1024)throw Error('ファイルサイズが250MBを超えています');
  const payload=JSON.parse(await file.text());
  const {site,project,records:nextRecords}=validateBundle(payload);
  if(!confirm('現場「'+site+'」のPDF・調査番号・写真・コメントを復元します。\n現在開いている未保存の編集内容は置き換わります。続行しますか？'))return;
  // Protect current work before switching; the old record keys are retained in IndexedDB.
  clearTimeout(changeSerial);
  if(activeStorageKey&&db)await dbPut(activeStorageKey,{records:structuredClone(records),version:3,siteId});
  ++storageGeneration;
  await restoreProject(project);
  const previousSite=siteId;
  siteId=site;siteField.value=site;siteLabel();
  try{localStorage.setItem(PREFIX+':siteId',siteId)}catch(err){console.warn(err)}
  const newKey=documentStorageKey();
  if(!newKey){siteId=previousSite;siteField.value=previousSite;siteLabel();throw Error('復元後の図面識別子を取得できません')}
  db ||=await openDb();
  await dbPut(newKey,{records:structuredClone(nextRecords),version:3,siteId,restoredFrom:'complete-bundle'});
  activeStorageKey=newKey;storageLoading=false;records=structuredClone(nextRecords);activeId=null;hideSurveyDialog();renderList();
  status('現場「'+siteId+'」のPDF・番号・写真・メモを復元しました。必要に応じてPDFも別途保存してください。');
 }catch(err){console.warn(err);status('一括復元できませんでした：'+err.message+'。元の一括ファイルは保管してください。')}
 finally{bundleBusy=false}
};


// Validate embedded data before displaying photos. Reject external URLs in untrusted PDFs.
function safeEmbeddedSurvey(data){
 if(!data||data.format!=='field-survey-records'||data.schemaVersion!==1||!data.records||typeof data.records!=='object'||Array.isArray(data.records))throw Error('PDF内の調査記録形式が不正です');
 const entries=Object.entries(data.records);
 if(entries.length>10000)throw Error('PDF内の調査記録が多すぎます');
 for(const [id,r] of entries){
  if(id==='__proto__'||!r||typeof r!=='object'||Array.isArray(r)||typeof r.memo!=='string'||typeof r.instruction!=='string'||r.memo.length>200000||r.instruction.length>200000||!Array.isArray(r.photos)||r.photos.length>300)throw Error('PDF内のメモ情報が不正です');
  for(const p of r.photos){
   if(!p||typeof p!=='object'||typeof p.data!=='string'||p.data.length>25*1024*1024||!/^data:image\/(?:png|jpeg|webp|gif|heic|heif|avif|bmp);base64,[A-Za-z0-9+/=]+$/.test(p.data))throw Error('PDF内の写真データが不正です');
  }
 }
 return data;
}
// Primary v1.4 flow: a PDF with embedded surveyData is authoritative. Existing IndexedDB
// and legacy JSON backup remain available for old PDFs. No site ID is needed for new work.
window.surveyWorkspaceReady=()=>!storageLoading&&!!activeStorageKey&&activeStorageKey===documentStorageKey();
window.surveyPDFExport=()=>safeEmbeddedSurvey({format:'field-survey-records',schemaVersion:1,siteId:siteId||null,records:structuredClone(records)});
window.surveyPreparePDFSave=async()=>{
 if(!doc)throw Error('PDFを開いてください');
 if(storageLoading||window.__surveyPdfLoading||!activeStorageKey||activeStorageKey!==documentStorageKey()){
  throw Error('調査記録の読込が完了していません。PDFの表示を確認してから保存してください');
 }
 clearTimeout(changeSerial);
 // Embedded PDF content is complete even when IndexedDB is unavailable.
};
window.surveyPDFLoaded=async(project)=>{
 ++storageGeneration;
 const generation=storageGeneration;
 clearTimeout(changeSerial);
 storageLoading=true;
 const previousKey=activeStorageKey,previousRecords=records;
 // Switching documents must not lose a pending local autosave.
 if(previousKey&&db){try{await dbPut(previousKey,{records:structuredClone(previousRecords),version:3,siteId})}
 catch(e){console.warn('Local record backup before PDF switch failed',e)}}
 if(generation!==storageGeneration)return;
 const embedded=project?.surveyData;
 if(embedded!==undefined){
  try{safeEmbeddedSurvey(embedded)}catch(e){storageLoading=false;activeStorageKey=null;throw e}
  // Use the saved site label for compatibility, never as a required input.
  siteId=validateSite(embedded.siteId)||'';
  siteField.value=siteId;siteLabel();
  records=structuredClone(embedded.records);
  activeStorageKey=documentStorageKey();
  // Preserve any older terminal-only record before a later edit replaces the same cache key.
  if(activeStorageKey&&db){
   try{
    const old=await dbGet(activeStorageKey);
    if(old?.records&&JSON.stringify(old.records)!==JSON.stringify(records)){
     const archiveKey='preserved:'+activeStorageKey+':'+Date.now();
     await dbPut(archiveKey,{records:old.records,siteId,version:old.version||1,preservedAt:new Date().toISOString()});
    }
   }catch(e){console.warn('Preserving prior terminal record failed',e)}
  }
  if(generation!==storageGeneration)return;
  activeId=null;hideSurveyDialog();storageLoading=false;renderList();
  status('PDFから調査番号・写真・メモ・施工指示を復元しました。次回も「編集済みPDFを保存」を使用してください。');
  return;
 }
 // Older PDFs lack surveyData. Look up their legacy local records without altering them.
 activeStorageKey=null;records={};activeId=null;hideSurveyDialog();storageLoading=false;
 await syncDocumentRecords();
 if(generation!==storageGeneration)return;
 status('旧形式のPDFを読み込みました。写真・メモが端末に残っている場合は旧バックアップから復元できます。');
};

// v1.4.28 Excel photo ledger. Read-only export; never mutates PDF, photos or survey records.
by('surveyExcelExport').onclick=async()=>{
 const btn=by('surveyExcelExport');
 if(btn.disabled)return;
 status('Excel調査報告書の出力を受け付けました。');
 if(!doc||storageLoading||window.__surveyPdfLoading||!activeStorageKey||activeStorageKey!==documentStorageKey()){
  status('写真台帳の出力前に編集済みPDFを開き、調査記録の読み込み完了を確認してください。');return;
 }
 if(typeof window.fieldSurveyExcelExport!=='function'){status('Excel出力の準備ができていません。画面を再読み込みしてください。');return}
 const ordered=documentPins().sort((a,b)=>currentPageNumber(a.pageId)-currentPageNumber(b.pageId)||Number(a.o.surveyNumber)-Number(b.o.surveyNumber));
 if(!ordered.length){status('調査番号がないため、Excel報告書を作成できません。');return}
 btn.disabled=true;status('Excel調査報告書を作成しています…');
 try{
  const entries=ordered.map(({pageId,o})=>{
   const r=records[o.surveyId]||{};
   return {no:o.surveyNumber,page:currentPageNumber(pageId),memo:r.memo||'',instruction:r.instruction||'',
    photos:(r.photos||[]).map(p=>({data:p.data,name:p.name||''}))};
  });
  await window.fieldSurveyExcelExport({siteId,entries});
  status('Excel調査報告書を出力しました。ダウンロードフォルダーをご確認ください。元のPDFは変更していません。');
 }catch(err){console.error('Excel photo ledger export failed:',err);status('Excel写真台帳を出力できませんでした：'+err.message)}
 finally{btn.disabled=false}
};

// v1.4.29: ZIP with original images only; read-only export from current document records.
by('surveyPhotoZipExport').onclick=()=>{
 const btn=by('surveyPhotoZipExport');
 if(btn.disabled)return;
 status('調査写真ZIPの出力を受け付けました。');
 if(!doc||storageLoading||window.__surveyPdfLoading||!activeStorageKey||activeStorageKey!==documentStorageKey()){
  status('写真ZIP出力前に編集済みPDFを開き、調査記録の読み込み完了を確認してください。');return;
 }
 if(typeof window.fieldSurveyPhotoZipExport!=='function'){
  status('写真ZIP出力の準備ができていません。画面を再読み込みしてください。');return;
 }
 const ordered=documentPins().sort((a,b)=>currentPageNumber(a.pageId)-currentPageNumber(b.pageId)||Number(a.o.surveyNumber)-Number(b.o.surveyNumber));
 const entries=ordered.map(({pageId,o})=>({page:currentPageNumber(pageId),no:o.surveyNumber,photos:(records[o.surveyId]?.photos||[]).map(p=>({data:p.data}))}));
 btn.disabled=true;
 try{const count=window.fieldSurveyPhotoZipExport({entries});status('調査写真'+count+'枚をZIP出力しました。元のPDF・写真は変更していません。')}
 catch(err){console.error('Photo ZIP export failed',err);status('写真ZIPを出力できませんでした：'+err.message)}
 finally{btn.disabled=false}
};

// Existing annotations are owned by the original editor; reflect page edits and deleted pins in the survey list.
setInterval(()=>{if(!window.__surveyPdfLoading&&!bundleBusy&&documentStorageKey()!==activeStorageKey&&!storageLoading)void syncDocumentRecords();const count=pins().length;const pg=getPage();if(count!==window.__surveyCount||pg!==window.__surveyPage){window.__surveyCount=count;window.__surveyPage=pg;if(activeId&&!pins().some(p=>p.o.surveyId===activeId)){activeId=null;hideSurveyDialog()}renderList()}},600);
try{siteId=validateSite(localStorage.getItem(PREFIX+':siteId'))||''}catch(e){siteId=''}siteField.value=siteId;siteLabel();
void openDb().then(v=>{db=v;void syncDocumentRecords()}).catch(()=>status('端末の保存領域を開けませんでした'));
})();
