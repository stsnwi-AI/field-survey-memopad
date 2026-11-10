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
    floating = !!next && !compact.matches;
    dock.classList.toggle('dock-floating', floating);
    pin.textContent = floating ? '上部に戻す' : '右側に移動';
    pin.setAttribute('aria-pressed', String(floating));
    grip.hidden = !floating;
    if (!floating) {
      dock.style.removeProperty('top');
      dock.style.removeProperty('left');
      dock.style.removeProperty('right');
    } else {
      dock.style.top = '115px';
      dock.style.right = '12px';
      dock.style.left = 'auto';
    }
  }
  // Hidden by default: accessible again without deleting any original PDF editing tools.
  function setDockVisible(visible) {
    dock.classList.toggle('dock-collapsed', !visible);
    if (toggle) {
      toggle.textContent = visible ? '編集ツールを隠す' : '編集ツールを表示';
      toggle.setAttribute('aria-expanded', String(visible));
    }
  }
  if (toggle) toggle.addEventListener('click', () => setDockVisible(dock.classList.contains('dock-collapsed')));
  // Restore the upper writing toolbar as the default workspace (v1.1).
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
  compact.addEventListener('change', () => setMode(false));
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
    const left = Math.max(0, Math.min(innerWidth - dock.offsetWidth, drag.left + e.clientX - drag.x));
    const top = Math.max(0, Math.min(innerHeight - 45, drag.top + e.clientY - drag.y));
    dock.style.left = left + 'px';
    dock.style.top = top + 'px';
    dock.style.right = 'auto';
  });
  const stop = () => { drag = null; };
  grip.addEventListener('pointerup', stop);
  grip.addEventListener('pointercancel', stop);
  setMode(false);
})();
