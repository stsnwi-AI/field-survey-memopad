/* Ver.1.4.58: dedicated mouse-click zoom controls for desktop PDF view.
 * Reuses the original #zoom input and render/change handlers, including
 * the continuous vertical-page rebuild. No PDF or annotation data changes.
 */
(() => {
  'use strict';
  const zoom = document.getElementById('zoom');
  const workspace = document.querySelector('main>.workspace');
  if (!zoom || !workspace) return;
  const panel = document.createElement('div');
  panel.id = 'desktopZoomControls';
  panel.setAttribute('role','group');
  panel.setAttribute('aria-label','PDFの拡大・縮小（PC）');
  panel.innerHTML = '<button type="button" id="desktopZoomOut" aria-label="PDFを25%縮小">－</button><output id="desktopZoomValue" aria-live="polite">100%</output><button type="button" id="desktopZoomIn" aria-label="PDFを25%拡大">＋</button>';
  document.body.append(panel);
  const minus = panel.querySelector('#desktopZoomOut');
  const plus = panel.querySelector('#desktopZoomIn');
  const output = panel.querySelector('#desktopZoomValue');
  function update(){
    const n=Number(zoom.value)||1;
    output.textContent=Math.round(n*100)+'%';
    minus.disabled=n<=.25||Boolean(window.pageBusy);
    plus.disabled=n>=3||Boolean(window.pageBusy);
  }
  function change(delta){
    if(typeof doc==='undefined'||!doc||typeof rendering!=='undefined'&&rendering||typeof pageBusy!=='undefined'&&pageBusy)return;
    const current=Number(zoom.value)||1;
    // Use 25 percentage-point steps and preserve the 300% ceiling.
    const next=Math.max(.25,Math.min(3,Math.round((current+delta)*100)/100));
    if(next===current)return;
    if(typeof window.setPDFZoom==='function')window.setPDFZoom(next);
    else{
      let option=[...zoom.options].find(o=>Number(o.value)===next);
      if(!option){option=document.createElement('option');option.value=String(next);option.textContent=Math.round(next*100)+'%';zoom.append(option)}
      zoom.value=String(next);
    }
    zoom.dispatchEvent(new Event('change',{bubbles:true}));
    update();
  }
  minus.addEventListener('click',()=>change(-.25));
  plus.addEventListener('click',()=>change(.25));
  zoom.addEventListener('change',update);
  // Other existing interactions (fit/zoom/restore) may update the native input
  // programmatically without dispatching 'change'.
  workspace.addEventListener('pointerup',update);
  update();
})();
