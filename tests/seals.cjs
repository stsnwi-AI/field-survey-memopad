const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const s=fs.readFileSync('app.js','utf8');
const calls=[];const c=new Proxy({},{get:(_,k)=>(...a)=>calls.push([k,...a]),set:()=>true});
const ctx=vm.createContext({c,calls,assert,textFonts:{},bounds:()=>({x:0,y:0,w:30,h:30})});
vm.runInContext(s.slice(s.indexOf('function paint(c,o)'),s.indexOf('\nfunction bounds'))+s.slice(s.indexOf('function paintLineEnd'))+'\n'+s.slice(s.indexOf('function validClipboardObject'),s.indexOf('\n',s.indexOf('function validClipboardObject'))),ctx);
vm.runInContext(`
paint(c,{type:'arrow',x:0,y:0,w:30,h:0,color:'#000',lineStyle:'dashed',startCap:'circle',endCap:'none'});
assert(calls.some(a=>a[0]==='setLineDash'&&a[1].join(',')==='10,6'));assert(calls.some(a=>a[0]==='arc'));assert.equal(calls.filter(a=>a[0]==='lineTo').length,1);
calls.length=0;paint(c,{type:'arrow',x:0,y:0,w:30,h:0,color:'#000'});assert.equal(calls.filter(a=>a[0]==='lineTo').length,3);
assert(validClipboardObject({type:'arrow',x:0,y:0,w:20,h:10,lineStyle:'dotted',endCap:'circle'}));assert(!validClipboardObject({type:'arrow',x:0,y:0,w:20,h:10,lineStyle:'bad'}));
assert(validClipboardObject({type:'text',x:0,y:0,text:'① 要修正',size:24}));
calls.length=0;paint(c,{type:'stamp',x:0,y:0,w:140,h:50,text:'要修正',shape:'rect',color:'#c00'});assert.equal(calls.filter(a=>a[0]==='strokeRect').length,2);assert.equal(calls.filter(a=>a[0]==='fillText').length,1);
calls.length=0;paint(c,{type:'stamp',x:0,y:0,w:54,h:54,text:'1',shape:'circle',color:'#c00'});assert.equal(calls.filter(a=>a[0]==='ellipse').length,2);assert(validClipboardObject({type:'stamp',x:0,y:0,w:54,h:54,text:'1',shape:'circle'}));assert(!validClipboardObject({type:'stamp',x:0,y:0,w:0,h:54,text:'1',shape:'circle'}));
`,ctx);console.log('PASS: dashed shaft, circle cap, plain line, legacy arrow, style validation, editable text stamps');
