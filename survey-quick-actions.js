/* v1.4 floating palette quick actions.
   Dispatch to original survey and editor buttons to preserve their validated behavior. */
(() => {
  'use strict';
  const pin = document.getElementById('surveyPalettePin');
  const originalPin = document.getElementById('surveyPinMode');
  const remove = document.getElementById('surveyPaletteDelete');
  const originalDelete = document.getElementById('delete');
  const tools = document.getElementById('tools');
  if (!pin || !originalPin || !remove || !originalDelete || !tools) return;

  function syncPin() {
    const on = originalPin.getAttribute('aria-pressed') === 'true';
    pin.setAttribute('aria-pressed', String(on));
    pin.classList.toggle('active', on);
    const label = pin.querySelector('span');
    if (label) label.textContent = '調査番号 ' + (on ? 'ON' : 'OFF');
    pin.title = on ? '調査番号の配置を終了する' : '調査番号を配置する';
  }

  pin.addEventListener('click', () => {
    if (!window.doc) {
      const status = document.getElementById('status');
      if (status) status.textContent = '先にPDF図面を開いてください。';
      return;
    }
    originalPin.click();
    syncPin();
  });

  // Switching back to a standard editor tool always cancels pin-placement mode.
  tools.addEventListener('click', event => {
    if (!event.target.closest('[data-tool]')) return;
    if (originalPin.getAttribute('aria-pressed') === 'true') {
      originalPin.click();
      syncPin();
    }
  }, true);
  originalPin.addEventListener('click', () => queueMicrotask(syncPin));

  remove.addEventListener('click', () => {
    if (!window.doc || typeof window.selectionIndices !== 'function' || !selectionIndices().length) {
      const status = document.getElementById('status');
      if (status) status.textContent = '「選択・移動・削除」で書き込みを選んでから削除してください。';
      return;
    }
    // Existing tablet/phone deletion confirmation remains in mobile.js.
    originalDelete.click();
  });
  syncPin();
})();
