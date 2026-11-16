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
  for(const selector of [':scope > h3',':scope > .palette',':scope > #inlineLineProperties',':scope > .settings',':scope > .text-style-controls',':scope > #editor']){
    const el=annotationTools?.querySelector(selector);
    if(el)editPanel.append(el);
  }
  // Keep the original editor controls and listeners, but show them in a
  // full-size floating panel instead of the small scroll-clipped tool dock.
  const editTrigger=document.createElement('button');
  editTrigger.id='dockEditTrigger';editTrigger.type='button';
  editTrigger.className='dock-edit-trigger';
  editTrigger.textContent='色・文字・線の設定';
  editTrigger.setAttribute('aria-controls','dockEditSettings');
  editTrigger.setAttribute('aria-expanded','false');
  dock.append(editTrigger);
  document.body.append(editPanel);
  editSummary.textContent='色・文字・線の設定（押すと閉じる）';
  let editWasDragged=false;
  function placeEditSettings(){
    if(!editPanel.open||editWasDragged)return;
    const anchor=editTrigger.getBoundingClientRect();
    const width=Math.min(370,window.innerWidth-16);
    const height=Math.min(editPanel.getBoundingClientRect().height,window.innerHeight-16);
    const left=Math.max(8,Math.min(window.innerWidth-width-8,anchor.right-width));
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
    dock.classList.toggle('dock-horizontal', !floating);
    document.body.classList.toggle('survey-horizontal-editor', !floating);
    pin.textContent = floating ? '上部に配置' : '自由に移動';
    pin.setAttribute('aria-pressed', String(!floating));
    pin.title = floating ? '横一列の編集バーへ戻す' : 'コンパクトな移動パレットに戻す';
    grip.hidden = !floating;
    if (floating) {
      dock.style.removeProperty('width');
      dock.style.removeProperty('max-width');
      dock.style.removeProperty('max-height');
      dock.style.removeProperty('bottom');
      clampPosition(8, headerBottom() + 8);
    } else {
      // Return to a full-width toolbar below the fixed title/navigation row.
      dock.style.left = '0px';
      dock.style.right = '0px';
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
  // Default to the movable palette without waiting for a separate editing-mode switch.
  setMode(true);
  window.addEventListener('resize', () => {
    if (!floating) { dock.style.top = headerBottom() + 'px'; return; }
    const rect=dock.getBoundingClientRect();
    clampPosition(rect.left,rect.top);
  });
})();
