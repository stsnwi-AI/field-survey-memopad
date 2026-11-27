/* v1.4.75: transient labels for the ORIGINAL palette buttons.
 * Display only, never intercept pointer events or change tool actions. */
(() => {
 'use strict';
 const palette=document.getElementById('surveyToolDock');
 if(!palette)return;
 const bubble=document.createElement('div');
 bubble.id='paletteToolHint';bubble.setAttribute('role','status');
 bubble.setAttribute('aria-live','off');bubble.hidden=true;
 document.body.append(bubble);
 let timer=null,hideTimer=null,lastPoint=null;
 const labelFor=button=>{
  const span=button.querySelector(':scope > span');
  const raw=(span?.textContent||button.getAttribute('aria-label')||button.title||button.textContent||'').trim();
  return raw.replace(/\s+(?:ON|OFF)$/,'').replace('選択・移動・削除','選択・移動');
 };
 function hide(){
  clearTimeout(timer);clearTimeout(hideTimer);
  bubble.hidden=true;
 }
 function show(button){
  const label=labelFor(button);
  if(!label)return;
  clearTimeout(hideTimer);
  bubble.textContent=label;
  bubble.hidden=false;
  const r=button.getBoundingClientRect();
  const b=bubble.getBoundingClientRect();
  const left=Math.max(4,Math.min(innerWidth-b.width-4,r.right+7));
  const top=Math.max(4,Math.min(innerHeight-b.height-4,r.top+(r.height-b.height)/2));
  bubble.style.left=Math.round(left)+'px';bubble.style.top=Math.round(top)+'px';
 }
 const buttons=()=>palette.querySelectorAll('#tools button,#dockEditTrigger,#surveyPaletteDelete');
 // Event delegation keeps dynamic palette tools (such as survey pins) functional.
 palette.addEventListener('pointerover',e=>{
  if(e.pointerType!=='mouse')return;
  const button=e.target.closest('button');
  if(!button||!palette.contains(button))return;
  clearTimeout(timer);timer=setTimeout(()=>show(button),350);
 });
 palette.addEventListener('pointerout',e=>{
  if(e.pointerType==='mouse'&&!palette.contains(e.relatedTarget)){hide();return}
  if(e.pointerType==='mouse')clearTimeout(timer);
 });
 palette.addEventListener('pointerdown',e=>{
  const button=e.target.closest('button');
  if(!button||!palette.contains(button))return;
  lastPoint={x:e.clientX,y:e.clientY,id:e.pointerId};
  clearTimeout(timer);
  if(e.pointerType==='touch'||e.pointerType==='pen')show(button);
  else timer=setTimeout(()=>show(button),350);
 });
 palette.addEventListener('pointermove',e=>{
  if(lastPoint&&e.pointerId===lastPoint.id&&Math.hypot(e.clientX-lastPoint.x,e.clientY-lastPoint.y)>15)hide();
 });
 document.addEventListener('pointerup',()=>{
  lastPoint=null;clearTimeout(timer);
  if(!bubble.hidden){clearTimeout(hideTimer);hideTimer=setTimeout(hide,850)}
 },true);
 document.addEventListener('pointercancel',()=>{lastPoint=null;hide()},true);
 document.addEventListener('pointerdown',e=>{
  if(!palette.contains(e.target))hide();
 },true);
 palette.addEventListener('focusin',e=>{
  const button=e.target.closest('button');if(button)show(button);
 });
 palette.addEventListener('focusout',()=>{hideTimer=setTimeout(hide,400)});
 // Prevent press-and-hold native selection/context menu on the editor surface.
 // Text inputs and editable fields remain selectable and usable.
 document.addEventListener('selectstart',e=>{
  if(e.target.closest?.('#surveyToolDock,#fixedPageNav,#overlay,.workspace canvas,body>header,#surveyRailEdge'))
    e.preventDefault();
 });
 document.addEventListener('contextmenu',e=>{
  if(e.target.closest?.('#surveyToolDock,#overlay,.workspace canvas')&&
     (e.sourceCapabilities?.firesTouchEvents||matchMedia('(pointer:coarse)').matches)){
    e.preventDefault();
  }
 });
})();
