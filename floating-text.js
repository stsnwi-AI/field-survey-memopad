/* Ver.1.4.27: Movable and resizable text-entry window; existing PDF text objects are unchanged. */
(() => {
  'use strict';
  const panel=document.getElementById('textFloatWindow');
  const grip=document.getElementById('textFloatGrip');
  const resizer=document.getElementById('textFloatResize');
  const close=document.getElementById('textFloatClose');
  const input=document.getElementById('text');
  if(!panel||!grip||!resizer||!close||!input)return;

  let moving=null;
  const clamp=(n,min,max)=>Math.max(min,Math.min(n,max));
  function confine(){
    const maxWidth=Math.max(220,window.innerWidth-16);
    const width=clamp(panel.getBoundingClientRect().width,220,maxWidth);
    panel.style.width=width+'px';
    const rect=panel.getBoundingClientRect();
    const maxX=Math.max(8,window.innerWidth-rect.width-8);
    const maxY=Math.max(8,window.innerHeight-rect.height-8);
    panel.style.left=clamp(rect.left,8,maxX)+'px';
    panel.style.top=clamp(rect.top,8,maxY)+'px';
  }
  function startPointer(e,kind){
    if(e.button!==undefined&&e.button!==0)return;
    e.preventDefault();
    const rect=panel.getBoundingClientRect();
    const target=kind==='resize'?resizer:grip;
    moving={id:e.pointerId,kind,x:e.clientX,y:e.clientY,left:rect.left,top:rect.top,width:rect.width,height:rect.height,target};
    target.setPointerCapture(e.pointerId);
  }
  function movePointer(e){
    if(!moving||e.pointerId!==moving.id)return;
    e.preventDefault();
    const dx=e.clientX-moving.x,dy=e.clientY-moving.y;
    if(moving.kind==='drag'){
      panel.style.left=clamp(moving.left+dx,8,Math.max(8,innerWidth-moving.width-8))+'px';
      panel.style.top=clamp(moving.top+dy,8,Math.max(8,innerHeight-moving.height-8))+'px';
    }else{
      panel.style.width=clamp(moving.width+dx,220,Math.max(220,innerWidth-moving.left-8))+'px';
      panel.style.height=clamp(moving.height+dy,160,Math.max(160,innerHeight-moving.top-8))+'px';
    }
  }
  function finishPointer(e){
    if(moving&&e.pointerId===moving.id){moving=null;confine();}
  }
  grip.addEventListener('pointerdown',e=>startPointer(e,'drag'));
  resizer.addEventListener('pointerdown',e=>startPointer(e,'resize'));
  for(const target of [grip,resizer]){
    target.addEventListener('pointermove',movePointer);
    target.addEventListener('pointerup',finishPointer);
    target.addEventListener('pointercancel',finishPointer);
  }
  close.addEventListener('click',()=>{if(typeof setTool==='function')setTool('select',false);else panel.hidden=true;});
  // The floating panel is entirely separate from the PDF canvas and its pointer handlers.
  window.addEventListener('resize',()=>{if(!panel.hidden)confine()},{passive:true});
  document.querySelectorAll('[data-tool="text"]').forEach(b=>b.addEventListener('click',()=>{
    if(!panel.hidden){confine();requestAnimationFrame(()=>{if(!panel.hidden)input.focus({preventScroll:true})})}
  }));
})();
