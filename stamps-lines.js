/* Vector seals: frame and label are one editable annotation. */
const stampBox=document.createElement('section');stampBox.id='stampBox';
stampBox.innerHTML='<h2>指示スタンプ</h2><div class="stamp-buttons"></div><label>番号 <select id="stampNumber" aria-label="番号付き丸印"></select></label><button id="placeNumber">丸番号を配置</button>';
document.querySelector('aside').append(stampBox);
function prepareStamp(text,number=false,instructionPin=false){if(pageBusy||rendering)return;if(mobileMedia.matches)setTouchMode('edit',false);stampPreset={text,shape:instructionPin?'instruction-pin':number?'circle':'rect',w:instructionPin?52:number?54:140,h:instructionPin?66:number?54:50};setTool('stamp');draw()}
toolLabels.stamp='スタンプを配置';
// Palette-only instruction pin stamps: the survey-number pin remains a separate record type.
const instructionButton=document.getElementById('instructionPinPalette');
if(instructionButton){
 const choices=document.createElement('div');choices.id='instructionPinChoices';
 choices.className='instruction-pin-choices';choices.hidden=true;choices.setAttribute('role','group');
 choices.setAttribute('aria-label','指示スタンプの種類');
 // A viewport-level popup avoids clipping by the scrollable floating palette.
 document.body.append(choices);
 const editSettings=document.getElementById('dockEditSettings');
 function hideChoices(){
  choices.hidden=true;instructionButton.classList.remove('menu-open');
  instructionButton.setAttribute('aria-expanded','false');
  instructionButton.setAttribute('aria-pressed',String(typeof tool!=='undefined'&&tool==='stamp'&&stampPreset?.shape==='instruction-pin'));
 }
 function placeChoices(){
  if(choices.hidden)return;
  const rect=instructionButton.getBoundingClientRect();
  const width=Math.min(188,window.innerWidth-16);
  const height=choices.getBoundingClientRect().height||100;
  choices.style.width=width+'px';
  choices.style.left=Math.round(Math.max(8,Math.min(window.innerWidth-width-8,rect.left+(rect.width-width)/2)))+'px';
  // Prefer directly below the stamp button; only flip upward when necessary.
  const below=rect.bottom+5,above=rect.top-height-5;
  choices.style.top=Math.round(below+height<=window.innerHeight-8?below:Math.max(8,above))+'px';
 }
 for(const text of ['要修正','位置確認','施工済','写真撮影']){
  const button=document.createElement('button');button.type='button';button.textContent=text;
  button.title=text+'の指示ピンを配置する';
  button.onclick=()=>{
   hideChoices();prepareStamp(text,false,true);
   instructionButton.title='指示スタンプ：'+text+'（図面をタップして配置）';
   instructionButton.classList.add('active');
   instructionButton.setAttribute('aria-pressed','true');
  };
  choices.append(button);
 }
 instructionButton.onclick=()=>{
  if(!choices.hidden){hideChoices();return}
  if(editSettings?.open)editSettings.open=false;
  choices.hidden=false;
  instructionButton.setAttribute('aria-expanded','true');
  instructionButton.classList.add('menu-open');
  instructionButton.setAttribute('aria-pressed','true');
  placeChoices();
  if(typeof doc!=='undefined'&&!doc){document.getElementById('status').textContent='PDFを開いてから指示スタンプを配置してください。';}
 };
 editSettings?.addEventListener('toggle',()=>{if(editSettings.open)hideChoices()});
 document.getElementById('dockMode')?.addEventListener('click',hideChoices);
 document.getElementById('showSurveyTools')?.addEventListener('click',hideChoices);
 document.getElementById('tools')?.addEventListener('click',e=>{
  if(e.target.closest('[data-tool]'))hideChoices();
 });
 document.addEventListener('pointerdown',e=>{
  if(!choices.hidden&&!choices.contains(e.target)&&!instructionButton.contains(e.target))hideChoices();
 },true);
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!choices.hidden){hideChoices();instructionButton.focus()}});
 window.addEventListener('resize',placeChoices);
 window.addEventListener('scroll',placeChoices,true);
}

for(const text of ['要修正','位置確認','施工済','写真撮影']){const b=document.createElement('button');b.textContent=text;b.className='seal-preview';b.onclick=()=>prepareStamp(text);stampBox.querySelector('.stamp-buttons').append(b)}
for(let n=1;n<=20;n++){const o=document.createElement('option');o.value=String.fromCharCode(0x2460+n-1);o.textContent=o.value;$('stampNumber').append(o)}
$('placeNumber').onclick=()=>prepareStamp(String($('stampNumber').selectedIndex+1),true);
const lineDialog=document.createElement('dialog');lineDialog.id='lineStyleDialog';
lineDialog.innerHTML='<h2>線・背景・透明度を編集</h2><p>選択した線・図形にまとめて反映します。</p><label>線の色 <input id="applyStrokeColor" type="checkbox" hidden aria-label="線色を変更"><input id="strokeColorChoice" type="color" value="#e59a19"></label><label>不透明度（全体）<input id="objectOpacityChoice" type="number" min="0" max="100" step="1" aria-label="全体の不透明度パーセント"></label><div id="fillChoices"><label hidden>背景の塗りつぶし<select id="fillModeChoice"><option value="keep">変更しない</option><option value="none">なし（透明）</option><option value="color">色を指定</option></select></label><label>背景色<input id="fillColorChoice" type="color" value="#ffffff"></label><label>背景の不透明度<input id="fillOpacityChoice" type="number" min="0" max="100" step="1" aria-label="背景の不透明度パーセント"></label></div><p>不透明度：0%で透明、100%で不透明。</p><label>線種<select id="lineStyleChoice"><option value="">変更しない／混在</option><option value="solid">実線 ─</option><option value="dashed">破線 ┄</option><option value="dotted">点線 ⋯</option></select></label><div id="capChoices"><label>始点<select id="startCapChoice"></select></label><label>終点<select id="endCapChoice"></select></label></div><p id="capHint">先端の変更は矢印オブジェクトに適用します。「なし」で通常の直線になります。</p><div class="line-dialog-actions"><button id="cancelLineStyle">キャンセル</button><button id="applyLineStyle">反映</button></div>';
document.body.append(lineDialog);
for(const id of ['startCapChoice','endCapChoice'])for(const [value,label] of [['','変更しない／混在'],['none','なし（直線）'],['arrow','矢印 →'],['ring','丸 ○'],['square','四角 □'],['circle','塗り丸 ●']]){const o=document.createElement('option');o.value=value;o.textContent=label;$(id).append(o)}
const lineTypes=['pen','rect','ellipse','arrow'];let lineTargets=null,linePage=null;
function openLineStyle(){
 if(pageBusy||rendering||start||working)return;
 lineTargets=selectedObjects().filter(o=>lineTypes.includes(o.type));if(!lineTargets.length)return;
 linePage=pageEntries[page-1].id;
 const common=(objects,key,fallback)=>{const values=objects.map(o=>o[key]??fallback);return values.every(v=>v===values[0])?values[0]:''};
 $('applyStrokeColor').checked=false;$('strokeColorChoice').value=lineTargets[0].color||'#e59a19';const opacity=common(lineTargets,'opacity',1);$('objectOpacityChoice').value=opacity===''?'':Math.round(opacity*100);const shapes=lineTargets.filter(o=>['rect','ellipse'].includes(o.type));$('fillChoices').hidden=!shapes.length;$('fillModeChoice').value='keep';$('fillColorChoice').value=shapes[0]?.fillColor||'#ffffff';const fillAlpha=common(shapes,'fillOpacity',1);$('fillOpacityChoice').value=fillAlpha===''||fillAlpha===undefined?'':Math.round(fillAlpha*100);$('lineStyleChoice').value=common(lineTargets,'lineStyle','solid');const arrows=lineTargets.filter(o=>o.type==='arrow');
 $('capChoices').hidden=!arrows.length;$('capHint').hidden=!arrows.length;
 $('startCapChoice').value=common(arrows,'startCap','none');$('endCapChoice').value=common(arrows,'endCap','arrow');
 hideObjectMenu();lineDialog.showModal();placeEditWindow();
}
const lineMenuButton=document.createElement('button');lineMenuButton.textContent='線・背景・透明度を編集';lineMenuButton.setAttribute('role','menuitem');lineMenuButton.onclick=openLineStyle;$('objectMenu').append(lineMenuButton);
const lineTouchButton=document.createElement('button');lineTouchButton.textContent='線・背景・透明度';lineTouchButton.onclick=openLineStyle;$('touchObjectActions').append(lineTouchButton);
const oldShowMenu=showObjectMenu;showObjectMenu=function(...args){lineMenuButton.hidden=!selectedObjects().some(o=>lineTypes.includes(o.type));oldShowMenu(...args)};
const oldSelectionUpdate=window.updateTouchSelection;window.updateTouchSelection=function(...args){oldSelectionUpdate?.(...args);lineTouchButton.hidden=!selectedObjects().some(o=>lineTypes.includes(o.type))};
$('cancelLineStyle').onclick=()=>{lineDialog.close();lineTargets=null};lineDialog.addEventListener('cancel',()=>{lineTargets=null});
$('applyLineStyle').onclick=()=>{
 if(pageBusy||rendering||!lineTargets||pageEntries[page-1]?.id!==linePage||lineTargets.some(o=>!list().includes(o)))return;
 const style=$('lineStyleChoice').value,first=$('startCapChoice').value,last=$('endCapChoice').value;
 const alpha=$('objectOpacityChoice').value,fillAlpha=$('fillOpacityChoice').value;
 if([alpha,fillAlpha].some(v=>v!==''&&(!Number.isFinite(Number(v))||Number(v)<0||Number(v)>100))){$('objectOpacityChoice').reportValidity();$('fillOpacityChoice').reportValidity();return}
 const patches=lineTargets.map(o=>{const patch={};if(style)patch.lineStyle=style;if($('applyStrokeColor').checked)patch.color=$('strokeColorChoice').value;if(alpha!=='')patch.opacity=Number(alpha)/100;
 if(['rect','ellipse'].includes(o.type)){const mode=$('fillModeChoice').value;if(mode==='none')patch.fillColor=null;else if(mode==='color')patch.fillColor=$('fillColorChoice').value;if(fillAlpha!=='')patch.fillOpacity=Number(fillAlpha)/100}
 if(o.type==='arrow'){if(first)patch.startCap=first;if(last)patch.endCap=last}return{o,patch}}).filter(({o,patch})=>Object.keys(patch).some(k=>patch[k]!==o[k]));
 if(patches.length){snapshot();for(const {o,patch}of patches)Object.assign(o,patch)}
 lineDialog.close();lineTargets=null;draw();
};

$('strokeColorChoice').oninput=()=>{$('applyStrokeColor').checked=true};$('fillColorChoice').oninput=()=>{$('fillModeChoice').value='color'};

/* v1.4.38: direct line/fill/opacity controls beside the color palette.
 * Uses existing selected annotations and undo history; the legacy dialog's
 * internals are kept as a fallback, but its extra buttons are hidden.
 */
lineMenuButton.id='legacyLineStyleMenu';
lineTouchButton.id='legacyLineStyleTouch';
const inlineLineProperties=document.createElement('section');
inlineLineProperties.id='inlineLineProperties';
inlineLineProperties.setAttribute('aria-label','選択した線・図形の編集');
inlineLineProperties.innerHTML=
 '<div class="inline-line-heading"><strong>線・背景・濃さ</strong><small id="inlineLineStatus">線・図形・マークを選ぶと編集できます</small></div>'+
 '<div class="inline-line-grid">'+
 '<label>線の色<input id="inlineStroke" type="color" value="#e59a19"></label>'+
 '<label>線種<select id="inlineLineStyle"><option value="">混在</option><option value="solid">実線</option><option value="dashed">破線</option><option value="dotted">点線</option></select></label>'+
 '<label>色の濃さ（％）<input id="inlineOpacity" type="number" min="0" max="100" step="1" value="100" inputmode="numeric"></label>'+
 '<label>背景色<input id="inlineFill" type="color" value="#ffffff"></label>'+
 '<label>背景の透明度<input id="inlineFillOpacity" type="number" min="0" max="100" step="1" value="100" inputmode="numeric"></label>'+
 '<label class="inline-fill-clear"><input id="inlineNoFill" type="checkbox">背景なし</label>'+
 '</div><div id="inlineArrowCaps" class="inline-arrow-caps" hidden><label>始点の形<select id="inlineStartCap"><option value="">混在</option><option value="none">なし</option><option value="arrow">矢印 →</option><option value="ring">丸 ○</option><option value="square">四角 □</option><option value="circle">塗り丸 ●</option></select></label><label>終点の形<select id="inlineEndCap"><option value="">混在</option><option value="none">なし</option><option value="arrow">矢印 →</option><option value="ring">丸 ○</option><option value="square">四角 □</option><option value="circle">塗り丸 ●</option></select></label></div><small>透明度：0＝透明、100＝不透明（％）</small>';
// The normal color chooser remains first; move these controls with that chooser.
document.querySelector('#annotationTools > .palette')?.after(inlineLineProperties);
const inlineFields=['inlineStroke','inlineLineStyle','inlineOpacity','inlineFill','inlineFillOpacity','inlineNoFill'].map(id=>document.getElementById(id));
function inlineTargets(){return selectedObjects().filter(o=>lineTypes.includes(o.type)||o.type==='stamp')}
function syncInlineLineProperties(){
 const objects=inlineTargets(),shapes=objects.filter(o=>['rect','ellipse'].includes(o.type));
 const lines=objects.filter(o=>lineTypes.includes(o.type));
 const active=objects.length>0&&!pageBusy&&!rendering;
 const arrows=objects.filter(o=>o.type==='arrow');
 const capRow=document.getElementById('inlineArrowCaps');
 capRow.hidden=!active||!arrows.length;
 for(const id of ['inlineStartCap','inlineEndCap'])document.getElementById(id).disabled=!active||!arrows.length;
 document.getElementById('inlineLineStatus').textContent=active
  ?objects.length+'件を編集中':'線・図形・マークを選ぶと編集できます';
 for(const control of inlineFields)control.disabled=!active;
 for(const id of ['inlineStroke','inlineLineStyle'])document.getElementById(id).disabled=!active||!lines.length;
 for(const id of ['inlineFill','inlineFillOpacity','inlineNoFill'])
  document.getElementById(id).disabled=!active||!shapes.length;
 if(!active)return;
 if(arrows.length){
  const commonCap=(key,fallback)=>{const values=arrows.map(o=>o[key]??fallback);return values.every(v=>v===values[0])?values[0]:''};
  document.getElementById('inlineStartCap').value=commonCap('startCap','none');
  document.getElementById('inlineEndCap').value=commonCap('endCap','arrow');
 }
 const first=lines[0]||objects[0],common=(arr,key,fallback)=>{
  const values=arr.map(o=>o[key]??fallback);
  return values.every(value=>value===values[0])?values[0]:'';
 };
 document.getElementById('inlineStroke').value=first.color||'#e59a19';
 document.getElementById('inlineLineStyle').value=lines.length?common(lines,'lineStyle','solid'):'solid';
 const opacity=common(objects,'opacity',1);
 document.getElementById('inlineOpacity').value=opacity===''?'':Math.round(opacity*100);
 if(shapes.length){
  const s=shapes[0],alpha=common(shapes,'fillOpacity',1);
  document.getElementById('inlineFill').value=s.fillColor||'#ffffff';
  document.getElementById('inlineFillOpacity').value=alpha===''?'':Math.round(alpha*100);
  document.getElementById('inlineNoFill').checked=shapes.every(o=>o.fillColor===null||o.fillColor===undefined);
 }
}
function applyInlineLineProperty(property){
 if(pageBusy||rendering||start||working)return;
 const objects=inlineTargets(),shapes=objects.filter(o=>['rect','ellipse'].includes(o.type));
 const field=document.getElementById(property),value=field.type==='checkbox'?field.checked:field.value;
 if(!objects.length)return;
 let targets=objects,attribute=null,next=value;
 if(property==='inlineStroke'){attribute='color';targets=objects.filter(o=>lineTypes.includes(o.type));if(!/^#[0-9a-f]{6}$/i.test(value))return;}
 if(property==='inlineLineStyle'){attribute='lineStyle';targets=objects.filter(o=>lineTypes.includes(o.type));if(!['solid','dashed','dotted'].includes(value))return;}
 if(property==='inlineOpacity'){attribute='opacity';if(value===''||!Number.isFinite(Number(value))||Number(value)<0||Number(value)>100){field.reportValidity();return;}next=Number(value)/100;}
 if(property==='inlineFill'){attribute='fillColor';targets=shapes;if(!/^#[0-9a-f]{6}$/i.test(value))return;document.getElementById('inlineNoFill').checked=false;}
 if(property==='inlineFillOpacity'){attribute='fillOpacity';targets=shapes;if(value===''||!Number.isFinite(Number(value))||Number(value)<0||Number(value)>100){field.reportValidity();return;}next=Number(value)/100;}
 if(property==='inlineNoFill'){attribute='fillColor';targets=shapes;next=value?null:document.getElementById('inlineFill').value;}
 if(!attribute||!targets.length||!targets.some(o=>o[attribute]!==next))return;
 snapshot();
 for(const o of targets)o[attribute]=next;
 draw();
 syncInlineLineProperties();
}
for(const field of inlineFields)field.addEventListener('change',()=>applyInlineLineProperty(field.id));
for(const [id,key] of [['inlineStartCap','startCap'],['inlineEndCap','endCap']]){
 document.getElementById(id).addEventListener('change',e=>{
  if(pageBusy||rendering||start||working)return;
  const cap=e.target.value;
  if(!['none','arrow','ring','square','circle'].includes(cap))return;
  const arrows=selectedObjects().filter(o=>o.type==='arrow');
  if(!arrows.length||!arrows.some(o=>(o[key]??(key==='startCap'?'none':'arrow'))!==cap))return;
  snapshot();for(const o of arrows)o[key]=cap;
  draw();syncInlineLineProperties();
 });
}
const originalInlineTouchUpdate=window.updateTouchSelection;
window.updateTouchSelection=function(...args){
 originalInlineTouchUpdate?.(...args);
 syncInlineLineProperties();
};
document.addEventListener('pointerup',e=>{
 if(e.target.closest?.('#dockEditSettings'))return;
 queueMicrotask(syncInlineLineProperties);
},true);
document.getElementById('dockEditTrigger')?.addEventListener('click',syncInlineLineProperties);
window.syncInlineLineProperties=syncInlineLineProperties;
syncInlineLineProperties();

// Move only from the title; editing controls retain their usual pointer behavior.
const editWindowTitle=lineDialog.querySelector('h2');editWindowTitle.tabIndex=0;editWindowTitle.title='ドラッグで移動。キーボードは矢印キーで移動。';editWindowTitle.setAttribute('aria-label','編集ウィンドウを移動');
let editWindowPosition=null,editWindowDrag=null;
function clampEditWindow(x,y,w,h,vw=window.innerWidth,vh=window.innerHeight){return{x:Math.max(0,Math.min(x,Math.max(0,vw-w))),y:Math.max(0,Math.min(y,Math.max(0,vh-h)))}}
function placeEditWindow(x,y){if(!lineDialog.open)return;const r=lineDialog.getBoundingClientRect();const point=clampEditWindow(x??editWindowPosition?.x??r.left,y??editWindowPosition?.y??r.top,r.width,r.height);editWindowPosition=point;Object.assign(lineDialog.style,{position:'fixed',margin:'0',left:point.x+'px',top:point.y+'px',right:'auto',bottom:'auto'})}
editWindowTitle.onpointerdown=e=>{if(e.button!==0)return;e.preventDefault();const r=lineDialog.getBoundingClientRect();editWindowDrag={id:e.pointerId,x:e.clientX,y:e.clientY,left:r.left,top:r.top};editWindowTitle.setPointerCapture(e.pointerId)};
editWindowTitle.onpointermove=e=>{if(editWindowDrag?.id!==e.pointerId)return;e.preventDefault();placeEditWindow(editWindowDrag.left+e.clientX-editWindowDrag.x,editWindowDrag.top+e.clientY-editWindowDrag.y)};
function stopEditWindowDrag(e){if(editWindowDrag?.id!==e.pointerId)return;editWindowDrag=null;if(editWindowTitle.hasPointerCapture(e.pointerId))editWindowTitle.releasePointerCapture(e.pointerId)}
editWindowTitle.onpointerup=stopEditWindowDrag;editWindowTitle.onpointercancel=stopEditWindowDrag;editWindowTitle.onlostpointercapture=()=>{editWindowDrag=null};
editWindowTitle.onkeydown=e=>{const n=e.shiftKey?30:10,d={ArrowLeft:[-n,0],ArrowRight:[n,0],ArrowUp:[0,-n],ArrowDown:[0,n]}[e.key];if(d){e.preventDefault();e.stopPropagation();const r=lineDialog.getBoundingClientRect();placeEditWindow(r.left+d[0],r.top+d[1])}};
window.addEventListener('resize',()=>placeEditWindow());lineDialog.addEventListener('close',()=>{editWindowDrag=null});

/* v1.4.61: keep arrow-cap editing accessible in the existing settings palette. */
