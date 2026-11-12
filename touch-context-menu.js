/* Ver.1.4.23: touch/pen double-tap actions, independent of the settings drawer.
   The original PDF clipboard, touch/pan, annotation and undo handlers remain in place. */
(() => {
 'use strict';
 const menu=document.getElementById('touchContextMenu');
 const quickPaste=document.getElementById('floatingPagePaste');
 if(!menu||!quickPaste||!canvas)return;
 const by=id=>document.getElementById(id);
 let press=null,lastTap=null;
 const DOUBLE_TAP_MS=430,DRIFT_PX=17;
 function hasSurveyPin(payload){
   if(!payload)return false;
   return payload.type==='selection'
     ?Array.isArray(payload.objects)&&payload.objects.some(o=>Boolean(o?.surveyId))
     :Boolean(payload.surveyId);
 }
 function validPaste(){
   if(!doc||rendering||pageBusy)return false;
   const payload=readObjectClipboard();
   return Boolean(payload&&!hasSurveyPin(payload)&&validClipboardPayload(payload));
 }
 function hideMenu(){menu.hidden=true}
 function returnToFingerNavigation(){
   // The normal setTool('select') in paste and long-press changes touchMode
   // to 'edit'. Restore finger panning once the requested action has ended.
   // Multi-select must remain editable until the user finishes that action.
   if(!window.multiSelectTouch&&typeof setTouchMode==='function')
     setTouchMode('browse',false);
 }
 function finishMenuAction(){
   hideMenu();
   returnToFingerNavigation();
   window.updateTouchSelection?.();
   updateQuickPaste();
 }

 function updateQuickPaste(){
   // This button is at document.body level, never inside the conditional #editor
   // or the sliding #surveySettingsPanel.
   const available=validPaste();
   quickPaste.hidden=!available;
   quickPaste.disabled=!available;
   by('contextPaste').disabled=!available;
   if(!menu.hidden){
     const hasSelection=Boolean(doc&&selectionIndices().length);
     const safe=hasSelection&&!selectedObjects().some(o=>o?.surveyId);
     by('contextCut').disabled=!safe;
     by('contextCopy').disabled=!safe;
     by('contextDuplicate').disabled=!safe;
     by('contextMulti').textContent='複数選択 '+(window.multiSelectTouch?'ON':'OFF');
     by('contextMulti').setAttribute('aria-pressed',String(Boolean(window.multiSelectTouch)));
   }
 }
 function pasteOnCurrentPage(){
   if(!validPaste()){say('この内容は貼り付けできません。通常の文字・線・図形をコピーしてください。');updateQuickPaste();return}
   const e=pageEntries[page-1];
   // Retain the original mobile editor's default position and transformation.
   const p=unturnPoint({x:Math.min(e.rotation%180?e.h:e.w,150),
                         y:Math.min(e.rotation%180?e.w:e.h,150)},e);
   pasteCopiedObject(p);
   finishMenuAction();
 }
 quickPaste.addEventListener('click',pasteOnCurrentPage);
 by('contextPaste').addEventListener('click',pasteOnCurrentPage);
 by('contextCut').addEventListener('click',()=>{
   if(!selectedObjects().length||selectedObjects().some(o=>o?.surveyId))return;
   copySelectedObject(true);finishMenuAction();
 });
 by('contextCopy').addEventListener('click',()=>{
   if(!selectedObjects().length||selectedObjects().some(o=>o?.surveyId))return;
   copySelectedObject();finishMenuAction();
 });
 by('contextDuplicate').addEventListener('click',()=>{
   if(!selectedObjects().length||selectedObjects().some(o=>o?.surveyId))return;
   pasteCopiedObject(null,true);finishMenuAction();
 });
 by('contextMulti').addEventListener('click',()=>{
   window.multiSelectTouch=!window.multiSelectTouch;
   if(!window.multiSelectTouch){finishMenuAction();return}
   window.updateTouchSelection?.();updateQuickPaste();
 });
 by('contextClose').addEventListener('click',finishMenuAction);
 function showAt(x,y){
   updateQuickPaste();
   menu.hidden=false;
   menu.style.left='8px';menu.style.top='8px';
   const rect=menu.getBoundingClientRect();
   menu.style.left=Math.max(8,Math.min(x,window.innerWidth-rect.width-8))+'px';
   menu.style.top=Math.max(8,Math.min(y+12,window.innerHeight-rect.height-8))+'px';
   updateQuickPaste();
 }
 function clearHold(){if(hold){clearTimeout(hold.timer);hold=null}}
 // Two short taps on the SAME ordinary annotation open editing actions.
 // A long hold never triggers the menu or the browser's text selection.
 // Survey pins keep their existing double-tap photo/memo dialog instead.
 function openOnDoubleTap(ev,hit){
   const original=list()[hit];
   if(!original||original.surveyId)return;
   if(typeof restoreTouchCheckpoint==='function')restoreTouchCheckpoint();
   working=start=dragHandle=dragGroup=null;
   // Do not force the mobile gesture mode into edit just to select.
   // The single-tap handler handles selection, and double-tap only opens actions.
   if(tool!=='select')desktopSetTool('select',false);
   const old=window.multiSelectTouch?selectionIndices():[];
   selectIndices(window.multiSelectTouch?[...new Set([...old,hit])]:[hit]);
   syncEditor();draw();
   showAt(ev.clientX,ev.clientY);
   say('ダブルタップメニュー：切り取り・コピー・複製・貼り付けが使えます。');
 }
 canvas.addEventListener('pointerdown',ev=>{
   if(!menu.hidden)hideMenu();
   press=null;
   if(!doc||rendering||pageBusy||ev.button!==0||
      !['touch','pen'].includes(ev.pointerType))return;
   if(by('surveyPinMode')?.getAttribute('aria-pressed')==='true')return;
   const idx=topAnnotationAt(point(ev));
   if(idx<0||list()[idx]?.surveyId){lastTap=null;return}
   press={id:ev.pointerId,x:ev.clientX,y:ev.clientY,
     hit:idx,pageId:pageEntries[page-1].id,moved:false};
 },true);
 canvas.addEventListener('pointermove',ev=>{
   if(press?.id===ev.pointerId&&
     Math.hypot(ev.clientX-press.x,ev.clientY-press.y)>DRIFT_PX)press.moved=true;
 },true);
 canvas.addEventListener('pointerup',ev=>{
   const current=press;press=null;
   if(!current||current.id!==ev.pointerId||current.moved||
      !doc||pageBusy||rendering)return;
   if(current.pageId!==pageEntries[page-1].id||
      Math.hypot(ev.clientX-current.x,ev.clientY-current.y)>DRIFT_PX)return;
   const hit=topAnnotationAt(point(ev));
   if(hit!==current.hit||list()[hit]?.surveyId){lastTap=null;return}
   const now=Date.now();
   if(lastTap&&lastTap.pageId===current.pageId&&lastTap.hit===hit&&
      now-lastTap.time<=DOUBLE_TAP_MS&&
      Math.hypot(ev.clientX-lastTap.x,ev.clientY-lastTap.y)<=26){
     lastTap=null;openOnDoubleTap(ev,hit);
   }else lastTap={pageId:current.pageId,hit,time:now,x:ev.clientX,y:ev.clientY};
 },true);
 canvas.addEventListener('pointercancel',()=>{press=null;lastTap=null},true);
 canvas.addEventListener('contextmenu',ev=>{
   if(!menu.hidden){ev.preventDefault()}
 },true);
 document.addEventListener('pointerdown',ev=>{
   if(!menu.hidden&&!menu.contains(ev.target))hideMenu();
 },true);
 document.addEventListener('keydown',ev=>{if(ev.key==='Escape')hideMenu()});
 window.addEventListener('resize',hideMenu);
 // Keep the availability badge in sync with pages and clipboard mutations,
 // independently of the editor selection panel or hidden settings drawer.
 const originalUpdate=window.updateTouchSelection;
 window.updateTouchSelection=function(){originalUpdate?.();updateQuickPaste()};
 const pageLabel=by('page');
 if(pageLabel)new MutationObserver(updateQuickPaste).observe(pageLabel,{childList:true,characterData:true,subtree:true});
 updateQuickPaste();
})();
