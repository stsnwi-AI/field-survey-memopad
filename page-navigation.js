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
  const editablePageStatus=document.createElement('output');editablePageStatus.id='editablePageStatus';editablePageStatus.hidden=true;editablePageStatus.setAttribute('aria-live','polite');editablePageStatus.style.cssText='font:600 11px system-ui,sans-serif;padding:4px 6px;border-radius:5px;background:#e5f3f1;color:#145648;white-space:nowrap;';strip.append(editablePageStatus);editablePageStatus.hidden=true;
  const visibleUndo=document.createElement('button');visibleUndo.type='button';visibleUndo.id='visibleUndo';visibleUndo.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true" style="width:23px;height:23px;display:block;stroke:currentColor;stroke-width:2.7;fill:none;stroke-linecap:round;stroke-linejoin:round"><path d="M9 7 4 12l5 5"/><path d="M4 12h11a5 5 0 0 1 0 10"/></svg>';visibleUndo.title='元に戻す';visibleUndo.setAttribute('aria-label','操作を元に戻す');visibleUndo.onclick=()=>document.getElementById('undo')?.click();strip.append(visibleUndo);
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

  // v1.4.68: Make the editor title the press-to-reveal command surface.
  // Navigation and zoom stay in the same row, with zoom before optional actions.
  const brand=header.querySelector('.brand');
  if(brand){
    const trigger=document.createElement('button');
    trigger.type='button';trigger.id='quickToolbarTrigger';
    trigger.textContent='現場メモ ▲';
    trigger.title='メニューを開いて操作ボタンを表示・もう一度押すと閉じる';
    trigger.setAttribute('aria-expanded','true');
    trigger.setAttribute('aria-controls','fixedPageNav');
    brand.append(trigger);
    // A tap must leave the controls usable: the old pointer-capture logic
    // closed them on touch release, before users could press an action.
    const setOpen=open=>{
      header.classList.toggle('quick-toolbar-expanded',Boolean(open));
      trigger.setAttribute('aria-expanded',String(Boolean(open)));
      trigger.textContent=open?'現場メモ ▲':'現場メモ ☰';
    };
    setOpen(true);
    trigger.addEventListener('click',()=>setOpen(!header.classList.contains('quick-toolbar-expanded')));
    document.addEventListener('keydown',e=>{
      if(e.key==='Escape'&&header.classList.contains('quick-toolbar-expanded')){
        setOpen(false);trigger.focus();
      }
    });
  }
  const addPDF=document.createElement('button');
  addPDF.type='button';addPDF.id='workspaceAddPDF';
  addPDF.textContent='＋ 追加';
  addPDF.title='PDFを別タブに追加';
  addPDF.onclick=()=>{
    try{
      if(window.parent!==window){
        const parentPicker=window.parent.document.getElementById('addFiles');
        if(parentPicker){parentPicker.click();return}
      }
    }catch(err){console.warn('Parent PDF picker not accessible:',err)}
    const fallback=document.getElementById('file');
    if(fallback)fallback.click();
  };
  strip.append(addPDF);

  // v1.4.73: Place ORIGINAL file-open, save and input-method controls
  // beside the page/zoom icons. Reparent, do not clone: keep event listeners.
  const extraCommands=document.createElement('div');
  extraCommands.id='unifiedToolbarExtras';
  for(const id of ['workspaceAddPDF']){
    const el=document.getElementById(id);
    if(el)extraCommands.append(el);
  }
  for(const selector of ['body>header>.open','body>header>#save','body>header>#inputMethodToggle']){
    const el=document.querySelector(selector);
    if(el)extraCommands.append(el);
  }
  strip.append(extraCommands);
  // Desktop mouse panning is opt-in and must never change PDF annotations.
  // Touch panning remains owned by mobile.js.
  const mouseFine=window.matchMedia('(pointer:fine)');
  let desktopPan=false,drag=null,suppressClick=false;
  function desktopAvailable(){return mouseFine.matches}
  function setDesktopPan(active){
    desktopPan=!!active;
    drag=null;
    workspace.classList.toggle('desktop-pan-active',desktopPan);
    syncMove();
  }
  function syncMove(){
    const browse=desktopAvailable()?desktopPan:(typeof touchMode!=='undefined'&&touchMode==='browse');
    move.setAttribute('aria-pressed',String(browse));
    move.classList.toggle('active',browse);
    move.title=desktopAvailable()
      ?(browse?'図面移動ON：PDFをマウス左ボタンでドラッグ。もう一度押すと解除':'図面移動OFF：クリックでマウスドラッグを有効化')
      :(browse?'図面移動中：指1本で上下左右へ移動。上下端スワイプでページ送り':'図面移動に切り替える');
  }
  move.addEventListener('click',()=>{
    const originalPin=document.getElementById('surveyPinMode');
    if(originalPin?.getAttribute('aria-pressed')==='true')originalPin.click();
    if(desktopAvailable()){
      setDesktopPan(!desktopPan);
      const status=document.getElementById('status');
      if(status)status.textContent=desktopPan?'図面移動ON：マウス左ボタンを押したまま上下左右にドラッグしてください。編集する場合は「選択・移動・削除」などのツールを選びます。':'図面移動を解除しました。';
    }else{
      if(typeof setTouchMode==='function')setTouchMode('browse',false);
      const status=document.getElementById('status');
      if(status)status.textContent='図面移動中：指1本で上下左右、2本指で拡大縮小。図面の下端で上へスワイプすると次ページ、上端で下へスワイプすると前ページ。';
      syncMove();
    }
    workspace.focus({preventScroll:true});
  });
  // Capture mouse events before app.js starts selecting or drawing annotations.
  // Only intercept the actual PDF page, not toolbar controls or dialogs.
  workspace.addEventListener('pointerdown',e=>{
    if(!desktopPan||e.pointerType!=='mouse'||e.button!==0||!doc||rendering||pageBusy)return;
    if(!e.target.closest('#paper,#continuousPageStack'))return;
    drag={id:e.pointerId,x:e.clientX,y:e.clientY,left:workspace.scrollLeft,top:workspace.scrollTop,moved:false};
    workspace.classList.add('desktop-pan-dragging');
    try{workspace.setPointerCapture(e.pointerId)}catch{}
    e.preventDefault();e.stopImmediatePropagation();
  },true);
  workspace.addEventListener('pointermove',e=>{
    if(!drag||e.pointerId!==drag.id)return;
    const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
    workspace.scrollLeft=drag.left-dx;
    workspace.scrollTop=drag.top-dy;
    if(Math.hypot(dx,dy)>4)drag.moved=true;
    e.preventDefault();e.stopImmediatePropagation();
  },true);
  function endMousePan(e){
    if(!drag||e.pointerId!==drag.id)return;
    suppressClick=drag.moved;
    drag=null;
    workspace.classList.remove('desktop-pan-dragging');
    if(workspace.hasPointerCapture?.(e.pointerId))workspace.releasePointerCapture(e.pointerId);
    e.preventDefault();e.stopImmediatePropagation();
  }
  workspace.addEventListener('pointerup',endMousePan,true);
  workspace.addEventListener('pointercancel',endMousePan,true);
  workspace.addEventListener('lostpointercapture',()=>{
    drag=null;workspace.classList.remove('desktop-pan-dragging');
  });
  workspace.addEventListener('click',e=>{
    if(!desktopPan||!suppressClick)return;
    suppressClick=false;
    e.preventDefault();e.stopImmediatePropagation();
  },true);
  // Choosing an annotation tool exits mouse panning; the original tool
  // handlers, electronic-pen selection, and finger navigation are unchanged.
  document.getElementById('tools')?.addEventListener('click',e=>{
    if(desktopAvailable()&&e.target.closest('[data-tool],#surveyPalettePin,#instructionPinPalette'))
      setDesktopPan(false);
    queueMicrotask(syncMove);
  });
  document.getElementById('browseTouch')?.addEventListener('click',()=>queueMicrotask(syncMove));
  document.getElementById('editTouch')?.addEventListener('click',()=>queueMicrotask(syncMove));
  mouseFine.addEventListener?.('change',()=>{if(!desktopAvailable())setDesktopPan(false);syncMove()});
  workspace.tabIndex=0;
  // Avoid abrupt view jumps when an annotation or page control is selected.
  syncMove();
})();
