/* Responsive survey settings drawer - leaves the editor DOM and data unchanged. */
(() => {
  const trigger=document.getElementById('surveySettingsToggle');
  const panel=document.getElementById('surveySettingsPanel');
  const backdrop=document.getElementById('surveySettingsBackdrop');
  const closeButton=document.getElementById('surveySettingsClose');
  if(!trigger||!panel||!backdrop||!closeButton)return;
  let lastFocus=null;
  function setOpen(open,restoreFocus=true){
    if(open===!panel.hidden)return;
    if(open)lastFocus=document.activeElement;
    panel.hidden=!open;backdrop.hidden=!open;
    trigger.setAttribute('aria-expanded',String(open));
    trigger.textContent=open?'☷ 設定・記録を閉じる':'☷ 設定・記録を開く';
    document.body.classList.toggle('survey-settings-open',open);
    if(open)closeButton.focus({preventScroll:true});
    else if(restoreFocus){
      const target=lastFocus&&lastFocus.isConnected&&!panel.contains(lastFocus)?lastFocus:trigger;
      target.focus({preventScroll:true});
    }
  }
  trigger.addEventListener('click',()=>setOpen(panel.hidden));
  closeButton.addEventListener('click',()=>setOpen(false));
  backdrop.addEventListener('click',()=>setOpen(false));
  document.addEventListener('keydown',e=>{
    if(panel.hidden)return;
    if(e.key==='Escape'){e.preventDefault();setOpen(false);return}
    if(e.key==='Tab'){
      const els=[...panel.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),a[href],summary,[tabindex="0"]')]
        .filter(el=>el.getClientRects().length&&!el.closest('[hidden]')&&!el.closest('details:not([open])'));
      if(!els.length){e.preventDefault();closeButton.focus();return}
      const first=els[0],last=els[els.length-1];
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
    }
  });
  // After choosing pin-placement mode, expose the full PDF for placing the pins.
  document.getElementById('surveyPinMode')?.addEventListener('click',()=>setOpen(false,false));
  // Never persist a hidden drawer state into the PDF; it is only a view preference.
  setOpen(false,false);
})();
