/* Ver.0.8: place the original toolbar buttons in a compact dock. No editor handlers replaced. */
(() => {
  const dock = document.getElementById('surveyToolDock');
  const tools = document.getElementById('tools');
  const pin = document.getElementById('dockMode');
  const grip = document.getElementById('dockGrip');
  const toggle = document.getElementById('showSurveyTools');
  if (!dock || !tools || !pin || !grip) return;
  // Retain the same DOM nodes so PDF editor event listeners and state remain attached.
  dock.querySelector('.dock-tools').appendChild(tools);
  // Bring the original controls into the palette without recreating inputs or replacing handlers.
  // A collapsible section keeps the drawing unobstructed while preserving color/font/width/edit.
  const annotationTools=document.getElementById('annotationTools');
  const editPanel=document.createElement('details');
  editPanel.id='dockEditSettings';editPanel.className='dock-edit-settings';
  const editSummary=document.createElement('summary');editSummary.textContent='色・文字・線の設定';
  editPanel.append(editSummary);
  for(const selector of [':scope > h3',':scope > .palette',':scope > #inlineLineProperties',':scope > .settings',':scope > .text-style-controls']){
    const el=annotationTools?.querySelector(selector);
    if(el)editPanel.append(el);
  }
  // Reparent the ORIGINAL width controls just below the font section.
  // Keep the original input IDs and app.js listeners. The rest of #editor
  // remains in the DOM, hidden from the layout, for legacy handlers.
  const lineWidthRow=document.getElementById('editLineRow');
  if(lineWidthRow){
    lineWidthRow.classList.add('standalone-line-width');
    editPanel.append(lineWidthRow);
  }
  const legacyEditor=document.getElementById('editor');
  if(legacyEditor)editPanel.append(legacyEditor);
  // Keep the original editor controls and listeners, but show them in a
  // full-size floating panel instead of the small scroll-clipped tool dock.
  const editTrigger=document.createElement('button');
  editTrigger.id='dockEditTrigger';editTrigger.type='button';
  editTrigger.className='dock-edit-trigger';
  editTrigger.textContent='色・文字・線の設定';
  editTrigger.setAttribute('aria-controls','dockEditSettings');
  editTrigger.setAttribute('aria-expanded','false');
  dock.append(editTrigger);
  // Keep the ORIGINAL delete button and its handlers; expose it in the dock
  // independently of the now-hidden legacy editor panel.
  const deleteControl=document.getElementById('delete');
  if(deleteControl){
    deleteControl.classList.add('dock-delete-action');
    dock.append(deleteControl);
  }
  document.body.append(editPanel);
  editSummary.textContent='色・文字・線の設定（押すと閉じる）';
  let editWasDragged=false;
  function placeEditSettings(){
    if(!editPanel.open||editWasDragged)return;
    const anchor=editTrigger.getBoundingClientRect();
    const width=Math.min(370,window.innerWidth-16);
    const height=Math.min(editPanel.getBoundingClientRect().height,window.innerHeight-16);
    const left=Math.max(8,window.innerWidth-width-8);
    const down=anchor.bottom+5;
    const top=down+height<=window.innerHeight-8?down:Math.max(8,anchor.top-height-5);
    editPanel.style.left=Math.round(left)+'px';
    editPanel.style.top=Math.round(top)+'px';
    editPanel.style.width=Math.round(width)+'px';
  }
  function showEditSettings(show){
    if(show)editWasDragged=false;
    editPanel.open=Boolean(show);
    editTrigger.classList.toggle('active',editPanel.open);
    editTrigger.setAttribute('aria-expanded',String(editPanel.open));
    if(editPanel.open){
      const stampMenu=document.getElementById('instructionPinChoices');
      if(stampMenu&&!stampMenu.hidden){
        document.getElementById('instructionPinPalette')?.click();
      }
      requestAnimationFrame(placeEditSettings);
    }
  }
  editTrigger.addEventListener('click',()=>showEditSettings(!editPanel.open));
  // Deliberate manual mode: select objects without opening this panel.
  // Only the explicit "色・文字・線の設定" trigger opens it.
  // Survey-photo, touch menus, and object selection remain in their own scripts.
  const surveyDialog=document.getElementById('surveyDialog');
  if(surveyDialog)new MutationObserver(()=>{
    if(surveyDialog.open)showEditSettings(false);
  }).observe(surveyDialog,{attributes:true,attributeFilter:['open']});

  editPanel.addEventListener('toggle',()=>{
    editTrigger.classList.toggle('active',editPanel.open);
    editTrigger.setAttribute('aria-expanded',String(editPanel.open));
    if(editPanel.open)requestAnimationFrame(placeEditSettings);
  });
  document.addEventListener('pointerdown',e=>{
    if(editPanel.open&&!editPanel.contains(e.target)&&!editTrigger.contains(e.target))
      showEditSettings(false);
  },true);
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'&&editPanel.open){showEditSettings(false);editTrigger.focus();}
  });
  // Drag only from the panel heading; form inputs keep their normal touch behavior.
  // Ignore the synthetic click after a drag, or <summary> would close the panel.
  let editDrag=null,ignoreSummaryClick=false;
  editSummary.setAttribute('aria-label','色・文字・線の設定：ここを押したまま移動');
  editSummary.title='ここを指またはマウスでドラッグするとパレットを移動できます';
  editSummary.addEventListener('pointerdown',e=>{
    if(e.button!==undefined&&e.button!==0)return;
    const rect=editPanel.getBoundingClientRect();
    editDrag={id:e.pointerId,startX:e.clientX,startY:e.clientY,left:rect.left,top:rect.top,moved:false};
    editSummary.setPointerCapture(e.pointerId);
  });
  editSummary.addEventListener('pointermove',e=>{
    const drag=editDrag;if(!drag||drag.id!==e.pointerId)return;
    const dx=e.clientX-drag.startX,dy=e.clientY-drag.startY;
    if(!drag.moved&&Math.hypot(dx,dy)<7)return;
    drag.moved=true;editWasDragged=true;ignoreSummaryClick=true;
    const maxLeft=Math.max(8,window.innerWidth-editPanel.offsetWidth-8);
    const maxTop=Math.max(8,window.innerHeight-editPanel.offsetHeight-8);
    editPanel.style.left=Math.round(Math.max(8,Math.min(maxLeft,drag.left+dx)))+'px';
    editPanel.style.top=Math.round(Math.max(8,Math.min(maxTop,drag.top+dy)))+'px';
    e.preventDefault();
  });
  function endEditDrag(e){if(editDrag?.id===e.pointerId)editDrag=null;}
  editSummary.addEventListener('pointerup',endEditDrag);
  editSummary.addEventListener('pointercancel',endEditDrag);
  editSummary.addEventListener('lostpointercapture',endEditDrag);
  editSummary.addEventListener('click',e=>{
    if(ignoreSummaryClick){e.preventDefault();e.stopPropagation();ignoreSummaryClick=false;}
  },true);
  window.addEventListener('resize',()=>{
    if(editWasDragged&&editPanel.open){
      const r=editPanel.getBoundingClientRect();
      editPanel.style.left=Math.round(Math.max(8,Math.min(window.innerWidth-r.width-8,r.left)))+'px';
      editPanel.style.top=Math.round(Math.max(8,Math.min(window.innerHeight-r.height-8,r.top)))+'px';
    }else placeEditSettings();
  });
  window.addEventListener('scroll',placeEditSettings,true);

  const compact = window.matchMedia('(max-width:750px)');
  // Palette remains floating at all times. The position button only resets it
  // to a compact top position; the drag handle always stays visible.
  let floating = true;
  function headerBottom() {
    return Math.ceil(document.querySelector('body>header')?.getBoundingClientRect().bottom || 60);
  }
  function clampPosition(x, y) {
    // Keep the whole palette visible. Dragging must not put its action buttons
    // beyond the left/right/bottom edge or behind the fixed title row.
    dock.style.maxHeight = Math.max(90, window.innerHeight - headerBottom() - 12) + 'px';
    const rect = dock.getBoundingClientRect();
    const width = Math.min(rect.width || dock.offsetWidth || 300, window.innerWidth);
    const height = Math.min(rect.height || dock.offsetHeight || 400, window.innerHeight);
    const topLimit = Math.max(0, headerBottom() + 6);
    const maxTop = Math.max(topLimit, window.innerHeight - height - 6);
    dock.style.left = Math.max(0, Math.min(Math.max(0, window.innerWidth - width), x)) + 'px';
    dock.style.top = Math.max(topLimit, Math.min(maxTop, y)) + 'px';
    dock.style.right = 'auto';
  }
  function setMode(nextFloating) {
    floating = !!nextFloating;
    dock.classList.toggle('dock-floating', floating);
    dock.classList.toggle('dock-horizontal', false);
    dock.classList.toggle('dock-left', !floating);
    document.body.classList.toggle('survey-horizontal-editor', false);
    pin.textContent = floating ? '左側に配置' : '自由に移動';
    pin.setAttribute('aria-pressed', String(!floating));
    pin.title = floating ? '左端の縦型編集バーへ切り替え' : '自由に移動できるパレットへ戻す';
    grip.hidden = !floating;
    if (floating) {
      dock.style.removeProperty('width');
      dock.style.removeProperty('max-width');
      dock.style.removeProperty('max-height');
      dock.style.removeProperty('bottom');
      clampPosition(8, headerBottom() + 8);
    } else {
      // Compact vertical left rail leaves the PDF height unobstructed.
      dock.style.left = '0px';
      dock.style.right = 'auto';
      dock.style.top = headerBottom() + 'px';
      dock.style.removeProperty('max-height');
      dock.style.removeProperty('bottom');
      dock.style.removeProperty('width');
    }
  }
  // Hidden by default: accessible again without deleting any original PDF editing tools.
  function setDockVisible(visible) {
    dock.classList.toggle('dock-collapsed', !visible);
    if (toggle) {
      toggle.textContent = visible ? 'パレットを隠す' : 'パレットを表示';
      toggle.setAttribute('aria-expanded', String(visible));
    }
  }
  if (toggle) toggle.addEventListener('click', () => setDockVisible(dock.classList.contains('dock-collapsed')));
  // Keep every drawing tool immediately available in a movable palette on all screen sizes.
  setDockVisible(true);
  // Preserve original mobile controls, but place optional operations inside
  // the settings drawer rather than the floating drawing palette.
  const mobileRow = document.getElementById('mobileToolbar');
  const settingsPanel = document.getElementById('surveySettingsPanel');
  if (mobileRow && settingsPanel) {
    const extra = document.createElement('details');
    extra.id = 'mobileMoreActions';
    extra.className = 'mobile-more-actions';
    const summary = document.createElement('summary');
    summary.textContent = '補助操作・PDF共有（必要な場合のみ）';
    extra.append(summary, mobileRow);
    settingsPanel.appendChild(extra);
  }
  pin.addEventListener('click', () => setMode(!floating));
  compact.addEventListener('change', () => { if (floating) { const rect=dock.getBoundingClientRect(); clampPosition(rect.left,rect.top); } else setMode(false); });
  let drag = null;
  grip.addEventListener('pointerdown', e => {
    if (!floating || e.button !== 0) return;
    const rect = dock.getBoundingClientRect();
    drag = {x:e.clientX, y:e.clientY, left:rect.left, top:rect.top};
    grip.setPointerCapture(e.pointerId);
    e.preventDefault();
  });
  grip.addEventListener('pointermove', e => {
    if (!drag) return;
    clampPosition(drag.left + e.clientX - drag.x, drag.top + e.clientY - drag.y);
  });
  const stop = () => { drag = null; };
  grip.addEventListener('pointerup', stop);
  grip.addEventListener('lostpointercapture', stop);
  grip.addEventListener('pointercancel', stop);
  // The palette heading also acts as a touch/mouse drag handle in floating mode.
  const dockTitle=dock.querySelector('.dock-title');
  if(dockTitle){
    dockTitle.style.touchAction='none';
    dockTitle.title='長押し不要：ここをドラッグしてパレットを移動';
    dockTitle.addEventListener('pointerdown',e=>{
      if(!floating){
        if(e.button!==undefined&&e.button!==0)return;
        const rect=dock.getBoundingClientRect();
        drag={x:e.clientX,y:e.clientY,left:rect.left,top:rect.top,id:e.pointerId,leftRail:true};
        dockTitle.setPointerCapture(e.pointerId);
        e.preventDefault();return;
      }
      if(e.button!==undefined&&e.button!==0)return;
      const rect=dock.getBoundingClientRect();
      drag={x:e.clientX,y:e.clientY,left:rect.left,top:rect.top,id:e.pointerId};
      dockTitle.setPointerCapture(e.pointerId);e.preventDefault();
    });
    dockTitle.addEventListener('pointermove',e=>{
      if(!drag||drag.id!==e.pointerId)return;
      if(drag.leftRail){
        const topLimit=headerBottom()+3;
        const h=dock.getBoundingClientRect().height;
        dock.style.top=Math.max(topLimit,Math.min(Math.max(topLimit,innerHeight-h-6),drag.top+e.clientY-drag.y))+'px';
      }else clampPosition(drag.left+e.clientX-drag.x,drag.top+e.clientY-drag.y);
      e.preventDefault();
    });
    dockTitle.addEventListener('pointerup',stop);
    dockTitle.addEventListener('pointercancel',stop);
    dockTitle.addEventListener('lostpointercapture',stop);
  }
  // v1.4.69: Left-edge auto-reveal on mouse, finger and stylus.
  // No toolbar-mode switch is needed. Retain original tool elements and handlers.
  pin.hidden=true;
  const edge=document.createElement('div');
  edge.id='surveyRailEdge';
  edge.setAttribute('role','button');
  edge.setAttribute('tabindex','0');
  edge.setAttribute('aria-label','左端に触れると書き込みパレットを表示');
  edge.title='左端に触れて書き込みパレットを表示';
  document.body.append(edge);
  let idleTimer=null;
  let activeTouches=0;
  let mouseInside=false;
  let lastInput='touch';
  function interacting(){
    // Touch-generated focus and hover are sticky in Safari: never use
    // :hover or a focused toolbar button as proof of ongoing tablet use.
    if(activeTouches>0)return true;
    const active=document.activeElement;
    const editing=active?.matches?.('input,textarea,select,[contenteditable="true"]');
    if(editing&&dock.contains(active))return true;
    if(document.getElementById('dockEditSettings')?.open)return true;
    return lastInput==='mouse'&&mouseInside;
  }
  function hideRail(){
    if(interacting()){scheduleHide();return}
    dock.classList.remove('auto-rail-open');
    edge.setAttribute('aria-expanded','false');
  }
  function scheduleHide(){
    clearTimeout(idleTimer);
    idleTimer=setTimeout(hideRail,2800);
  }
  function revealRail(){
    if(dock.classList.contains('dock-collapsed'))setDockVisible(true);
    dock.classList.add('auto-rail-open');
    edge.setAttribute('aria-expanded','true');
    scheduleHide();
  }
  edge.setAttribute('aria-expanded','false');
  edge.setAttribute('aria-controls','surveyToolDock');
  // Make the touch target visible and usable without a tiny 18px precise tap.
  edge.addEventListener('pointerenter',e=>{
    lastInput=e.pointerType||'mouse';
    if(e.pointerType==='mouse')revealRail();
  });
  edge.addEventListener('pointerdown',e=>{
    lastInput=e.pointerType||'touch';revealRail();
  });
  edge.addEventListener('click',revealRail);
  edge.addEventListener('touchstart',()=>{lastInput='touch';revealRail()},{passive:true});
  edge.addEventListener('focus',revealRail);
  edge.addEventListener('keydown',e=>{
    if(e.key==='Enter'||e.key===' '){e.preventDefault();revealRail()}
  });
  dock.addEventListener('pointerenter',e=>{
    lastInput=e.pointerType||'mouse';
    mouseInside=e.pointerType==='mouse';revealRail();
  });
  dock.addEventListener('pointerleave',e=>{
    if(e.pointerType==='mouse')mouseInside=false;
    scheduleHide();
  });
  dock.addEventListener('pointerdown',e=>{
    lastInput=e.pointerType||'touch';
    if(e.pointerType!=='mouse')activeTouches++;
    revealRail();
  });
  const endInteraction=e=>{
    if(e.pointerType!=='mouse')activeTouches=Math.max(0,activeTouches-1);
    scheduleHide();
  };
  document.addEventListener('pointerup',endInteraction,true);
  document.addEventListener('pointercancel',endInteraction,true);
  dock.addEventListener('click',revealRail);
  dock.addEventListener('focusin',()=>{revealRail()});
  dock.addEventListener('focusout',scheduleHide);
  // Capture-phase detection also works when the canvas overlay occupies
  // the touch target area and Safari skips pointerenter on touch.
  document.addEventListener('pointerdown',e=>{
    if(e.clientX<=42 && e.clientY>=headerBottom() && e.clientY<innerHeight-8){
      lastInput=e.pointerType||'touch';revealRail();return;
    }
    if(!dock.contains(e.target)){mouseInside=false;scheduleHide();}
  },true);
  document.addEventListener('touchstart',e=>{
    const t=e.touches?.[0];
    if(t&&t.clientX<=42&&t.clientY>=headerBottom()){
      lastInput='touch';revealRail();
    }
  },{capture:true,passive:true});
  document.addEventListener('pointermove',e=>{
    if(e.pointerType==='mouse'&&e.clientX<=42&&e.clientY>=headerBottom()){
      lastInput='mouse';revealRail();
    }
  },{passive:true});
  setMode(false);
  dock.classList.remove('auto-rail-open');
  window.addEventListener('blur',()=>{
    mouseInside=false;activeTouches=0;clearTimeout(idleTimer);
    dock.classList.remove('auto-rail-open');
  });
  window.addEventListener('resize', () => {
    if (!floating) {
      const topLimit=headerBottom()+3,rect=dock.getBoundingClientRect();
      dock.style.top=Math.max(topLimit,Math.min(Math.max(topLimit,innerHeight-rect.height-6),parseFloat(dock.style.top)||topLimit))+'px';
      return;
    }
    const rect=dock.getBoundingClientRect();
    clampPosition(rect.left,rect.top);
  });
})();
