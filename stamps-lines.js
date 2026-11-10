/* Vector seals: frame and label are one editable annotation. */
const stampBox=document.createElement('section');stampBox.id='stampBox';
stampBox.innerHTML='<h2>指示スタンプ</h2><div class="stamp-buttons"></div><label>番号 <select id="stampNumber" aria-label="番号付き丸印"></select></label><button id="placeNumber">丸番号を配置</button>';
document.querySelector('aside').append(stampBox);
function prepareStamp(text,number=false){if(pageBusy||rendering)return;if(mobileMedia.matches)setTouchMode('edit',false);stampPreset={text,shape:number?'circle':'rect',w:number?54:140,h:number?54:50};setTool('stamp');draw()}
toolLabels.stamp='スタンプを配置';
for(const text of ['要修正','位置確認','施工済','写真撮影']){const b=document.createElement('button');b.textContent=text;b.className='seal-preview';b.onclick=()=>prepareStamp(text);stampBox.querySelector('.stamp-buttons').append(b)}
for(let n=1;n<=20;n++){const o=document.createElement('option');o.value=String.fromCharCode(0x2460+n-1);o.textContent=o.value;$('stampNumber').append(o)}
$('placeNumber').onclick=()=>prepareStamp(String($('stampNumber').selectedIndex+1),true);
const lineDialog=document.createElement('dialog');lineDialog.id='lineStyleDialog';
lineDialog.innerHTML='<h2>線・背景・透明度を編集</h2><p>選択した線・図形にまとめて反映します。</p><label>線の色 <input id="applyStrokeColor" type="checkbox" hidden aria-label="線色を変更"><input id="strokeColorChoice" type="color" value="#e59a19"></label><label>不透明度（全体）<input id="objectOpacityChoice" type="number" min="0" max="100" step="1" aria-label="全体の不透明度パーセント"></label><div id="fillChoices"><label hidden>背景の塗りつぶし<select id="fillModeChoice"><option value="keep">変更しない</option><option value="none">なし（透明）</option><option value="color">色を指定</option></select></label><label>背景色<input id="fillColorChoice" type="color" value="#ffffff"></label><label>背景の不透明度<input id="fillOpacityChoice" type="number" min="0" max="100" step="1" aria-label="背景の不透明度パーセント"></label></div><p>不透明度：0%で透明、100%で不透明。</p><label>線種<select id="lineStyleChoice"><option value="">変更しない／混在</option><option value="solid">実線 ─</option><option value="dashed">破線 ┄</option><option value="dotted">点線 ⋯</option></select></label><div id="capChoices"><label>始点<select id="startCapChoice"></select></label><label>終点<select id="endCapChoice"></select></label></div><p id="capHint">先端の変更は矢印オブジェクトに適用します。「なし」で通常の直線になります。</p><div class="line-dialog-actions"><button id="cancelLineStyle">キャンセル</button><button id="applyLineStyle">反映</button></div>';
document.body.append(lineDialog);
for(const id of ['startCapChoice','endCapChoice'])for(const [value,label] of [['','変更しない／混在'],['none','なし'],['arrow','矢印 →'],['circle','丸 ●']]){const o=document.createElement('option');o.value=value;o.textContent=label;$(id).append(o)}
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
