/* Ver.1.4.47: user-initiated, same-origin, in-progress PDF handoff.
 * The source editor stays open. No network transfer or persistent cache.
 */
(()=>{'use strict';
 const link=document.getElementById('multiPDFWorkspace');
 if(!link||typeof BroadcastChannel==='undefined')return;
 link.addEventListener('click',()=>{
   if(typeof window.exportWorkspaceProject!=='function')return;
   // Set up the receive channel before the new tab starts requesting data.
   const token=crypto.randomUUID();
   const channel=new BroadcastChannel('field-survey-workspace-'+token);
   let sent=false;
   channel.onmessage=e=>{
     if(e.data?.token!==token||e.data?.type!=='handoff-ready'||sent)return;
     sent=true;
     try{
       channel.postMessage({type:'handoff-project',token,payload:window.exportWorkspaceProject()});
     }catch(err){
       channel.postMessage({type:'handoff-error',token,message:err.message});
     }
     setTimeout(()=>channel.close(),5000);
   };
   setTimeout(()=>{if(!sent)channel.close()},40000);
   link.href='workspace.html?transfer='+encodeURIComponent(token);
 });
})();