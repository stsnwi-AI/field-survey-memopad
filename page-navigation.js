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
  move.type='button';move.id='panDrawing';move.textContent='✋ 移動';
  move.setAttribute('aria-pressed','false');
  move.title='指1本で図面を上下左右に移動。上下端から縦スワイプしてページ送り';
  pageControls.classList.add('fixed-page-controls');
  // Keep the existing zoom control in the workspace. Only page turns occupy
  // the permanently visible title row, avoiding overlap with the palette.
  const zoomHome=document.createElement('div');
  zoomHome.id='zoomHome';
  zoomHome.append(zoom);
  bar.append(zoomHome);
  strip.append(pageControls,move);
  // Always-visible desktop mouse zoom; share the existing zoom/select render path.
  const desktopZoom=document.createElement('div');
  desktopZoom.id='desktopZoomControls';
  desktopZoom.setAttribute('aria-label','図面の拡大・縮小');
  const minus=document.createElement('button');
  minus.type='button';minus.id='desktopZoomOut';minus.textContent='－';minus.title='25%縮小';
  const percentage=document.createElement('output');
  percentage.id='desktopZoomValue';percentage.setAttribute('aria-live','polite');
  const plus=document.createElement('button');
  plus.type='button';plus.id='desktopZoomIn';plus.textContent='＋';plus.title='25%拡大';
  function syncZoom(){
    const value=Number(zoom.value)||1;
    percentage.textContent=Math.round(value*100)+'%';
    minus.disabled=value<=.25;plus.disabled=value>=3;
  }
  function changeZoom(delta){
    if(!doc||rendering||pageBusy)return;
    const current=Number(zoom.value)||1;
    const next=Math.min(3,Math.max(.25,Math.round((current+delta)*100)/100));
    if(next===current)return;
    if(typeof window.setPDFZoom==='function')window.setPDFZoom(next);
    else {
      let opt=[...zoom.options].find(o=>Number(o.value)===next);
      if(!opt){opt=document.createElement('option');opt.value=String(next);opt.textContent=Math.round(next*100)+'%';zoom.append(opt)}
      zoom.value=String(next);
    }
    zoom.dispatchEvent(new Event('change',{bubbles:true}));
    syncZoom();
  }
  minus.onclick=()=>changeZoom(-.25);
  plus.onclick=()=>changeZoom(.25);
  desktopZoom.append(minus,percentage,plus);
  strip.append(desktopZoom);
  zoom.addEventListener('change',syncZoom);
  syncZoom();
  header.querySelector('.brand')?.after(strip);

  function syncMove(){
    const browse=typeof touchMode!=='undefined'&&touchMode==='browse';
    move.setAttribute('aria-pressed',String(browse));
    move.classList.toggle('active',browse);
    move.title=browse?'図面移動中：指1本で上下左右へ移動。上下端スワイプでページ送り':'図面移動に切り替える';
  }
  move.addEventListener('click',()=>{
    const originalPin=document.getElementById('surveyPinMode');
    if(originalPin?.getAttribute('aria-pressed')==='true')originalPin.click();
    if(typeof setTouchMode==='function')setTouchMode('browse',false);
    workspace.focus({preventScroll:true});
    const status=document.getElementById('status');
    if(status)status.textContent='図面移動中：指1本で上下左右、2本指で拡大縮小。図面の下端で上へスワイプすると次ページ、上端で下へスワイプすると前ページ。';
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
