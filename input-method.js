/* v1.4 input method selector.
 * Browser Pen Pointer Events indicate actual pen contact, not Bluetooth pairing.
 * Manual mode allows touch editing; pen mode reserves fingers for pan/zoom.
 */
(() => {
  'use strict';
  const button = document.getElementById('inputMethodToggle');
  const originalPin = document.getElementById('surveyPinMode');
  if (!button) return;

  function sync() {
    const pen = window.fieldStylusMode === true;
    button.textContent = pen ? 'ペン操作' : '手動操作';
    button.setAttribute('aria-pressed', String(pen));
    button.dataset.mode = pen ? 'pen' : 'manual';
    button.title = pen
      ? 'ペン優先：指で図面移動・拡大縮小、ペンで書き込み。押すと指で書ける手動操作へ'
      : '手動操作：指やマウスでツールを選び編集。押すとペン優先へ';
  }

  function setMode(pen, detected = false) {
    const previous = window.fieldStylusMode === true;
    window.fieldStylusMode = !!pen;
    if (pen && !previous) {
      // Keep pin placement explicitly opt-in; never create a pin on mode switch.
      if (typeof setTouchMode === 'function') setTouchMode('browse', false);
    }
    if (!pen && previous && typeof setTouchMode === 'function') setTouchMode('browse', false);
    sync();
    if (detected) {
      const status = document.getElementById('status');
      if (status) status.textContent = '対応ペンの入力を検出しました。ペン操作に切り替えました。';
    }
  }

  button.addEventListener('click', () => setMode(window.fieldStylusMode !== true));

  // Pen detection works once the browser emits pointerType=pen.
  // The web page cannot reliably detect pen Bluetooth pairing itself.
  document.addEventListener('pointerdown', e => {
    if (e.pointerType === 'pen' && window.fieldStylusMode !== true) setMode(true, true);
  }, true);

  // A touch pen reported as pointerType=touch is indistinguishable from a finger.
  // The user may switch to manual mode to draw with such a pen.
  sync();
})();
