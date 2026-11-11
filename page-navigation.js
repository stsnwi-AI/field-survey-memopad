/* Fixed compact page navigation and one-finger canvas pan toggle.
   Reuse original page controls and their event handlers rather than recreating them. */
(() => {
  'use strict';
  const workspace=document.querySelector('.workspace');
  const bar=workspace?.querySelector('.bar');
  const header=document.querySelector('body>header');
  const prev=document.getElementById('prev');
  const next=document.getElementById('next');
  const zoom=document.getElementById('zoom');
  if(!workspace||!bar||!header||!prev||!next||!zoom)return;
  const pageControls=prev.parentElement;
  const strip=document.createElement('nav');
  strip.id='fixedPageNav';
  strip.setAttribute('aria-label','固定ページ切り替え・図面の移動');
  const move=document.createElement('button');
  move.type='button';move.id='panDrawing';move.textContent='✋ 図面移動';
  move.setAttribute('aria-pressed','false');
  move.title='指で図面を上下左右に移動する（編集はパレットから再開）';
  pageControls.classList.add('fixed-page-controls');
  strip.append(pageControls,move);
  header.after(strip);

  function syncMove(){
    const browse=typeof touchMode!=='undefined'&&touchMode==='browse';
    move.setAttribute('aria-pressed',String(browse));
    move.classList.toggle('active',browse);
    move.title=browse?'図面移動中。パレットの編集ツールを選ぶと書き込み再開':'指で図面を移動する';
  }
  move.addEventListener('click',()=>{
    const originalPin=document.getElementById('surveyPinMode');
    if(originalPin?.getAttribute('aria-pressed')==='true')originalPin.click();
    if(typeof setTouchMode==='function')setTouchMode('browse',false);
    workspace.focus({preventScroll:true});
    const status=document.getElementById('status');
    if(status)status.textContent='図面移動モード：指1本で上下左右に移動、2本指で拡大縮小。編集する場合はパレットのツールを選んでください。';
    syncMove();
  });
  // Editing tools restore the existing editable touch mode.
  document.getElementById('tools')?.addEventListener('click',()=>queueMicrotask(syncMove));
  document.getElementById('browseTouch')?.addEventListener('click',()=>queueMicrotask(syncMove));
  document.getElementById('editTouch')?.addEventListener('click',()=>queueMicrotask(syncMove));
  workspace.tabIndex=0;
  // Avoid abrupt view jumps when an annotation or page control is selected.
  syncMove();
})();
