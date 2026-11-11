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
  const compact = window.matchMedia('(max-width:750px)');
  let floating = false;
  function setMode(next) {
    floating = !!next;
    dock.classList.toggle('dock-floating', floating);
    pin.textContent = floating ? '上部へ戻す' : '自由に移動';
    pin.setAttribute('aria-pressed', String(floating));
    grip.hidden = !floating;
    if (!floating) {
      dock.style.removeProperty('top');
      dock.style.removeProperty('left');
      dock.style.removeProperty('right');
    } else {
      dock.style.top = Math.max(8,Math.min(window.innerHeight - 64, compact.matches?105:120)) + 'px';
      dock.style.right = '12px';
      dock.style.left = 'auto';
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
  // The second, touch-specific operation row is no longer exposed below the toolbar.
  // Keep its original buttons and handlers in an on-demand section of the upper bar.
  const mobileRow = document.getElementById('mobileToolbar');
  if (mobileRow) {
    const more = document.createElement('details');
    more.id = 'mobileMoreActions';
    more.className = 'mobile-more-actions';
    const summary = document.createElement('summary');
    summary.textContent = '表示・共有';
    summary.setAttribute('aria-label', '表示モードや共有操作を開く');
    more.appendChild(summary);
    more.appendChild(mobileRow);
    dock.appendChild(more);
  }
  pin.addEventListener('click', () => setMode(!floating));
  compact.addEventListener('change', () => { if(floating) setMode(true); });
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
    const left = Math.max(0, Math.min(Math.max(0,innerWidth - dock.offsetWidth), drag.left + e.clientX - drag.x));
    const top = Math.max(0, Math.min(innerHeight - 45, drag.top + e.clientY - drag.y));
    dock.style.left = left + 'px';
    dock.style.top = top + 'px';
    dock.style.right = 'auto';
  });
  const stop = () => { drag = null; };
  grip.addEventListener('pointerup', stop);
  grip.addEventListener('lostpointercapture', stop);
  grip.addEventListener('pointercancel', stop);
  // Default to the movable palette without waiting for a separate editing-mode switch.
  setMode(true);
  window.addEventListener('resize', () => {
    if(!floating)return;
    const rect=dock.getBoundingClientRect();
    dock.style.left=Math.max(0,Math.min(window.innerWidth - dock.offsetWidth,rect.left))+'px';
    dock.style.top=Math.max(0,Math.min(window.innerHeight - 48,rect.top))+'px';
    dock.style.right='auto';
  });
})();
