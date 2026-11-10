/* Ver.3.5.10: mode indicator, precise movement and redo. */
const quickBar=document.createElement('div');quickBar.id='quickBar';
quickBar.innerHTML='<strong id="operationMode" role="status" aria-live="polite"></strong><span id="selectionCount"></span><button id="redo" title="Ctrl+Y / Ctrl+Shift+Z">↪ やり直す</button><div id="nudgeControls" hidden><span>位置調整</span><select id="nudgeStep" aria-label="移動量"><option value="1">1 pt</option><option value="10">10 pt</option></select><button data-nudge="left" aria-label="左へ移動">←</button><button data-nudge="up" aria-label="上へ移動">↑</button><button data-nudge="down" aria-label="下へ移動">↓</button><button data-nudge="right" aria-label="右へ移動">→</button></div>';
document.querySelector('.workspace').prepend(quickBar);
const toolLabels={select:'選択・移動',text:'文字を配置',highlight:'マーカー',pen:'手書き',rect:'四角を描く',ellipse:'円を描く',arrow:'矢印を描く',image:'画像を配置'};
window.updateUsability=()=>{
 const count=doc?selectionIndices().length:0,busy=pageBusy||rendering||Boolean(start||working),browse=mobileMedia.matches&&touchMode==='browse';
 $('operationMode').textContent=!doc?'PDFを開いて開始':busy?'操作中':browse?'閲覧モード':toolLabels[tool]||'編集モード';
 quickBar.dataset.mode=browse?'browse':tool;
 $('selectionCount').textContent=count?count+'件を選択中':'';
 $('nudgeControls').hidden=!count;
 $('redo').disabled=!doc||busy||!redoStack.length;$('undo').disabled=!doc||busy||!history.length;
 quickBar.querySelectorAll('[data-nudge]').forEach(b=>b.disabled=!count||busy);
};
function nudgeSelected(dx,dy){
 if(!doc||pageBusy||rendering||start||working||!selectedObjects().length)return;
 const r=(pageEntries[page-1]?.rotation||0)*Math.PI/180;
 const x=dx*Math.cos(r)+dy*Math.sin(r),y=-dx*Math.sin(r)+dy*Math.cos(r);
 snapshot();for(const o of selectedObjects())moveAnnotation(o,cloneObject(o),x,y);
 syncEditor();draw();say(selectionIndices().length+'件の位置を調整しました。');
}
quickBar.querySelectorAll('[data-nudge]').forEach(b=>b.onclick=()=>{
 const n=Number($('nudgeStep').value),d={left:[-n,0],right:[n,0],up:[0,-n],down:[0,n]}[b.dataset.nudge];nudgeSelected(...d);
});
$('redo').onclick=()=>travelHistory(true);
const usabilityDraw=draw;draw=function(){usabilityDraw();window.updateUsability()};
const usabilitySetTool=setTool;setTool=function(...args){usabilitySetTool(...args);window.updateUsability()};
const usabilityTouchMode=setTouchMode;setTouchMode=function(...args){usabilityTouchMode(...args);window.updateUsability()};
const usabilitySelection=window.updateTouchSelection;window.updateTouchSelection=function(...args){usabilitySelection?.(...args);window.updateUsability()};
document.addEventListener('keydown',e=>{
 if(e.defaultPrevented||e.target?.closest('input,textarea,select,[contenteditable]:not([contenteditable="false"])')||document.querySelector('dialog[open]')||!$('saveNameDialog').hidden)return;
 if(!doc||pageBusy||rendering||start||working)return;
 const key=e.key.toLowerCase(),mod=e.ctrlKey||e.metaKey;
 if(mod&&!e.altKey&&(key==='z'||key==='y')){e.preventDefault();travelHistory(key==='y'||e.shiftKey);return}
 if(!mod&&!e.altKey&&selectionIndices().length){const n=e.shiftKey?10:1,d={ArrowLeft:[-n,0],ArrowRight:[n,0],ArrowUp:[0,-n],ArrowDown:[0,n]}[e.key];if(d){e.preventDefault();nudgeSelected(...d)}}
});
window.updateUsability();
