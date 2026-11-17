/* Ver.1.4.46: experimental vertical continuous PDF pages in the
 * multi-document workspace. Reuse the original editable overlay only for
 * the active page; other pages render a read-only preview with annotations.
 * The original page UI remains available outside workspace mode.
 */
(() => {
'use strict';
if(new URLSearchParams(location.search).get('workspacePane')!=='1')return;
const workspace=document.querySelector('main>.workspace');
const paper=document.getElementById('paper');
const oldSurveyLoaded=window.surveyPDFLoaded;
if(!workspace||!paper)return;
document.body.classList.add('continuous-mode');
const stack=document.createElement('div');stack.id='continuousPageStack';
paper.after(stack);
const pageBar=document.createElement('div');
pageBar.id='continuousPageStatus';
pageBar.textContent='縦スクロール：各ページで書き込み可能';
workspace.append(pageBar);
let cards=[],buildSerial=0,changeInProgress=false,viewportScale=1,queued=null;
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function viewportFor(p,e,zoom){
 return p.getViewport({scale:zoom,rotation:p.rotate+(e.rotation||0)});
}
function zoomFor(p,e){
 // All preview pages must use the SAME scale as the active editor.
 // Per-page fit-to-width caused different sizes/overlapping page cards.
 return viewportScale;
}
function cardPreview(card){
 return card.querySelector('.continuous-preview');
}
function buildCard(i,entry,zoom,size){
 const card=document.createElement('section');card.className='continuous-page';
 card.dataset.index=String(i);card.dataset.pageId=entry.id;
 const title=document.createElement('div');title.className='continuous-page-label';title.textContent='ページ '+(i+1);
 const slot=document.createElement('div');slot.className='continuous-slot';
 slot.style.width=Math.ceil(size.width)+'px';slot.style.height=Math.ceil(size.height)+'px';
 const preview=document.createElement('canvas');preview.className='continuous-preview';
 // Allocate pixel memory only when this page approaches the viewport.
 preview.width=1;preview.height=1;
 preview.style.width=Math.ceil(size.width)+'px';preview.style.height=Math.ceil(size.height)+'px';
 slot.append(preview);card.append(title,slot);stack.append(card);
 return {card,slot,preview,entry,zoom,index:i,loaded:false,loading:false};
}
async function renderPreview(c){
 if(c.loading||!doc||c.index===page-1)return;
 c.loading=true;
 try {
  const e=c.entry,p=await sources[e.source].doc.getPage(e.index);
  if(!c.card.isConnected)return;
  const viewport=viewportFor(p,e,c.zoom);
  const g=c.preview.getContext('2d');
  if(!g)return;
  const density=Math.min(1.5,Math.sqrt(7000000/Math.max(1,viewport.width*viewport.height)));
  const d=Math.max(.5,density);
  const w=Math.max(1,Math.ceil(viewport.width*d)),h=Math.max(1,Math.ceil(viewport.height*d));
  c.preview.width=w;c.preview.height=h;
  c.preview.style.width=Math.ceil(viewport.width)+'px';
  c.preview.style.height=Math.ceil(viewport.height)+'px';
  await p.render({canvasContext:g,viewport,transform:[d,0,0,d,0,0]}).promise;
  g.save();g.scale(c.zoom*d,c.zoom*d);applyPageTurn(g,e);
  for(const o of (items[e.id]||[]))paint(g,o);
  g.restore();c.loaded=true;
 }catch(err){console.warn('Continuous preview failed:',err)}
 finally{c.loading=false}
}
async function build(){
 const token=++buildSerial;
 if(!doc||!pageEntries.length){stack.replaceChildren();cards=[];return}
 // Complete any pending page render before moving its original canvas.
 for(let retry=0;rendering&&retry<80;retry++)await wait(30);
 if(token!==buildSerial||rendering)return;
 // Preserve the currently viewed page and relative scroll position.
 const oldActive=cards[page-1];
 const oldRect=oldActive?.card.getBoundingClientRect();
 const scrollOffset=oldRect?oldRect.top-workspace.getBoundingClientRect().top:0;
 stack.replaceChildren();cards=[];
 // Prefer the actual active-page scale, including touch pinch zoom and
 // fit-to-width. Never derive independent scales for different pages.
 viewportScale=Number(scale)||Number(document.getElementById('zoom').value)||1;
 for(let i=0;i<pageEntries.length;i++){
  const entry=pageEntries[i],p=await sources[entry.source].doc.getPage(entry.index);
  if(token!==buildSerial)return;
  const zoom=zoomFor(p,entry),v=viewportFor(p,entry,zoom);
  cards.push(buildCard(i,entry,zoom,v));
 }
 const c=cards[page-1];
 if(c){c.slot.append(paper);paper.style.display='block';c.card.classList.add('current')}
 // Eagerly render only the first few pages, then render others as they approach.
 for(const n of [page-2,page,page+1]){
  if(n>=0&&n<cards.length)renderPreview(cards[n]);
 }
 // Keep the same reading position after changing zoom; no overlapping.
 if(c&&oldRect){
   const newTop=c.card.getBoundingClientRect().top-workspace.getBoundingClientRect().top;
   workspace.scrollTop+=newTop-scrollOffset;
 }
 document.getElementById('continuousPageStatus').textContent=page+' / '+pageEntries.length+' ページ｜上下にスクロール';
}
function activeCardAtCenter(){
 const target=workspace.getBoundingClientRect();
 const y=target.top+target.height*.54;
 let best=null,dist=Infinity;
 for(const c of cards){
  const r=c.card.getBoundingClientRect();
  const gap=y<r.top?r.top-y:y>r.bottom?y-r.bottom:0;
  const centerPenalty=Math.abs((r.top+r.bottom)/2-y)*.001;
  if(gap+centerPenalty<dist){dist=gap+centerPenalty;best=c}
 }
 return best;
}
async function activate(c){
 if(!c||!doc||changeInProgress||rendering||pageBusy||start||working||c.index===page-1)return;
 if(pageEntries[c.index]?.id!==c.entry.id)return;
 changeInProgress=true;
 const current=cards[page-1];
 try{
  if(current){
   // Update the passive representation of the page being left.
   current.loaded=false;
   current.card.classList.remove('current');
   current.slot.removeChild(paper);
  }
  page=c.index+1;selected=-1;selectIndices([]);
  c.slot.append(paper);c.card.classList.add('current');
  await render();
  document.getElementById('continuousPageStatus').textContent=page+' / '+pageEntries.length+' ページ｜上下にスクロール';
  if(current)renderPreview(current);
  for(const i of [c.index-1,c.index+1,c.index+2]){
   if(i>=0&&i<cards.length&&!cards[i].loaded)renderPreview(cards[i]);
  }
 }catch(err){console.error(err);say('連続表示の切り替えに失敗しました：'+err.message)}
 finally{changeInProgress=false}
}
let scrollTimer=null;
workspace.addEventListener('scroll',()=>{
 if(!cards.length)return;
 clearTimeout(scrollTimer);
 scrollTimer=setTimeout(()=>{
  const target=activeCardAtCenter();
  if(target)activate(target);
  for(const c of cards){
   const r=c.card.getBoundingClientRect(),v=workspace.getBoundingClientRect();
   const nearby=r.bottom>v.top-800&&r.top<v.bottom+800;
   if(nearby&&!c.loaded&&c.index!==page-1)renderPreview(c);
   // Keep tablet memory bounded for long construction drawings.
   if(!nearby&&c.loaded&&!c.loading&&c.index!==page-1){
     c.loaded=false;c.preview.width=1;c.preview.height=1;
   }
  }
 },135);
},{passive:true});
const goToPage=(delta)=>{
 const target=cards[page-1+delta];if(!target)return;
 target.card.scrollIntoView({behavior:'smooth',block:'start'});
};
const prev=document.getElementById('prev'),next=document.getElementById('next');
for(const [btn,delta] of [[prev,-1],[next,1]]){
 btn?.addEventListener('click',e=>{if(!cards.length)return;e.preventDefault();e.stopImmediatePropagation();goToPage(delta)},true);
}
const zoom=document.getElementById('zoom');
// A user zoom (including pen/finger pinch) calls the existing render().
 // Rebuild all page card dimensions together after that render settles.
 let zoomRefreshTimer=null;
 const originalContinuousRender=render;
 render=async function(){
   const result=await originalContinuousRender();
   if(!changeInProgress&&doc&&cards.length){
     const actual=Number(scale)||1;
     if(Math.abs(actual-viewportScale)>.001){
       clearTimeout(zoomRefreshTimer);
       zoomRefreshTimer=setTimeout(()=>{
         if(!changeInProgress&&!rendering&&!pageBusy)void build();
       },100);
     }
   }
   return result;
 };
 zoom?.addEventListener('change',()=>{clearTimeout(zoomRefreshTimer);zoomRefreshTimer=setTimeout(()=>{if(!rendering)void build()},180)});
 window.surveyPDFLoaded=async p=>{
 await oldSurveyLoaded?.(p);
 await build();
};
window.continuousRebuild=build;
})();