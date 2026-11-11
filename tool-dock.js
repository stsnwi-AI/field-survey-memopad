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
  // Palette remains floating at all times. The position button only resets it
  // to a compact top position; the drag handle always stays visible.
  let floating = true;
  function headerBottom() {
    return Math.ceil(document.querySelector('body>header')?.getBoundingClientRect().bottom || 60);
  }
  function clampPosition(x, y) {
    // Keep the whole palette visible. Dragging must not put its action buttons
    // beyond the left/right/bottom edge or behind the fixed title row.
    const rect = dock.getBoundingClientRect();
    const width = Math.min(rect.width || dock.offsetWidth || 300, window.innerWidth);
    const height = Math.min(rect.height || dock.offsetHeight || 400, window.innerHeight);
    const topLimit = Math.max(0, headerBottom() + 6);
    const maxTop = Math.max(topLimit, window.innerHeight - height - 6);
    dock.style.left = Math.max(0, Math.min(Math.max(0, window.innerWidth - width), x)) + 'px';
    dock.style.top = Math.max(topLimit, Math.min(maxTop, y)) + 'px';
    dock.style.right = 'auto';
  }
  function setMode() {
    floating = true;
    dock.classList.add('dock-floating');
    pin.textContent = '上部に配置';
    pin.setAttribute('aria-pressed', 'true');
    pin.title = 'パレットを題名の下へ戻す。移動は「⠿ 移動」をドラッグ';
    grip.hidden = false;
    grip.title = 'ここを指やマウスでドラッグして移動';
    // Always visibly reset to the top-left, rather than reapplying the same
    // old top-right coordinate and appearing to do nothing.
    clampPosition(8, headerBottom() + 8);
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
  pin.addEventListener('click', () => setMode());
  compact.addEventListener('change', () => { setMode(); });
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
  setMode();
  window.addEventListener('resize', () => {
    if(!floating)return;
    const rect=dock.getBoundingClientRect();
    clampPosition(rect.left,rect.top);
  });
})();
