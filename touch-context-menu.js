/* Ver.1.4.21: touch/pen long-press actions, independent of the settings drawer.
   The original PDF clipboard, touch/pan, annotation and undo handlers remain in place. */
(() => {
 'use strict';
 const menu=document.getElementById('touchContextMenu');
 const quickPaste=document.getElementById('floatingPagePaste');
 if(!menu||!quickPaste||!canvas)return;
 const by=id=>document.getElementById(id);
 let hold=null,openFromPointer=null;
 const HOLD_MS=570,DRIFT_PX=12;
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
 function hideMenu(){menu.hidden=true;openFromPointer=null}
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
 function finishLongPress(p){
   if(!hold||hold.id!==p.id||!doc||pageBusy||rendering)return;
   const hit=hold.index,entry=pageEntries[page-1];
   if(!entry||entry.id!==hold.pageId||!list()[hit])return;
   // Cancel any provisional touch edit without committing a pen stroke.
   if(p.pointerType==='touch'){
     if(typeof restoreTouchCheckpoint==='function')restoreTouchCheckpoint();
     if(typeof touchConsumed!=='undefined')touchConsumed=true;
     if(typeof gesture!=='undefined')gesture=null;
   }
   working=start=dragHandle=dragGroup=null;
   // Switch to selection without modifying the saved annotation.
   setTool('select',false);
   const prev=window.multiSelectTouch?selectionIndices():[];
   if(window.multiSelectTouch){
     selectIndices([...new Set([...prev,hit])]);
   }else if(!prev.includes(hit))selectIndices([hit]);
   else selectIndices(prev);
   syncEditor();draw();
   openFromPointer=p.id;
   showAt(hold.x,hold.y);
   say('長押しメニュー：切り取り・コピー・複製・貼り付けが使えます。');
 }
 canvas.addEventListener('pointerdown',ev=>{
   hideMenu();clearHold();
   if(!doc||rendering||pageBusy||ev.button!==0||
      !['touch','pen'].includes(ev.pointerType))return;
   if(by('surveyPinMode')?.getAttribute('aria-pressed')==='true')return;
   const hit=topAnnotationAt(point(ev));
   // Only long-press existing objects. Empty pages use fixed Paste.
   if(hit<0)return;
   const p={id:ev.pointerId,pointerType:ev.pointerType};
   const state={...p,index:hit,pageId:pageEntries[page-1].id,
     x:ev.clientX,y:ev.clientY,timer:null};
   state.timer=setTimeout(()=>{
     if(hold===state)finishLongPress(p);
     hold=null;
   },HOLD_MS);
   hold=state;
 },true);
 canvas.addEventListener('pointermove',ev=>{
   if(hold&&hold.id===ev.pointerId&&Math.hypot(ev.clientX-hold.x,ev.clientY-hold.y)>DRIFT_PX)clearHold();
   if(openFromPointer===ev.pointerId){ev.preventDefault();ev.stopImmediatePropagation()}
 },true);
 for(const name of ['pointerup','pointercancel']){
   canvas.addEventListener(name,ev=>{
     if(hold?.id===ev.pointerId)clearHold();
     // Do not block original touch pointer cleanup (touchPointers and selection).
     if(openFromPointer===ev.pointerId){
       openFromPointer=null;
       if(ev.pointerType==='touch'&&typeof touchConsumed!=='undefined')touchConsumed=true;
     }
   },true);
 }
 canvas.addEventListener('contextmenu',ev=>{
   if(hold||!menu.hidden){ev.preventDefault()}
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
