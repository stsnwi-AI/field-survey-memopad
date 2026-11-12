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
