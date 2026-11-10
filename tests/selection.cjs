const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const source=fs.readFileSync('app.js','utf8');
const elements={};
const $=id=>elements[id]??={value:'24',hidden:true,getAttribute(){return 'true'},addEventListener(){}};
let objects=[{type:'text',x:10,y:20,text:'A',size:24,color:'#000',fontFamily:'gothic',bold:false},{type:'text',x:40,y:50,text:'B',size:16,color:'#000',fontFamily:'mincho',bold:false,italic:true},{type:'pen',x:60,y:70,color:'#000',points:[{x:60,y:70},{x:90,y:80}]}];
const history=[];
const box={$,selected:-1,list:()=>objects,tool:'select',doc:{},pageBusy:false,rendering:false,window:{multiSelectTouch:false},snapshot(){history.push(JSON.stringify(objects))},draw(){},say(){},hideObjectMenu(){},syncEditor(){},setTool(t){box.tool=t},bounds:o=>({x:o.x,y:o.y,w:20,h:20}),objectClipboard:null,clipboardStorageSynced:false,objectClipboardChannel:null,pasteSerial:0,sessionStorage:{setItem(){}},clipboardStorageKey:'test'};
vm.createContext(box);
vm.runInContext(source.slice(source.indexOf('let selectedIndexes='),source.indexOf('const cache=')),box);
for(const name of ['cloneObject','validClipboardObject','validClipboardPayload','selectionPayload','readObjectClipboard','copySelectedObject','pasteCopiedObject','changeTextStyle']){
 const line=source.split('\n').find(l=>l.startsWith('function '+name+'('));assert.ok(line,name);vm.runInContext(line,box);
}
vm.runInContext("const textFonts={gothic:'sans-serif',mincho:'serif'}",box);
box.textStyleControls=()=>({bold:true,italic:false,fontFamily:'gothic'});
box.selectIndices([0,1,2]);assert.equal(box.selectionIndices().length,3);
box.changeTextStyle('bold');assert.equal(objects[0].bold,true);assert.equal(objects[1].bold,true);assert.equal(objects[1].italic,true);assert.equal(objects[1].fontFamily,'mincho');assert.equal(objects[2].bold,undefined);
box.editSelectedWhere(o=>o.type==='text',o=>o.size=33);assert.equal(objects[0].size,33);assert.equal(objects[1].size,33);
box.copySelectedObject();assert.equal(box.objectClipboard.objects.length,3);
box.pasteCopiedObject({x:100,y:200});assert.equal(objects.length,6);assert.equal(objects[3].x,100);assert.equal(objects[4].x,130);assert.equal(objects[5].points[0].y,250);assert.equal(box.selectionIndices().length,3);
box.removeSelectedObjects();assert.equal(objects.length,3);assert.equal(box.selectionIndices().length,0);
objects=JSON.parse(history.pop());box.selected=-1;assert.equal(objects.length,6);assert.equal(box.selectionIndices().length,0);
box.selectIndices([0,1]);box.pasteCopiedObject(null,true);assert.equal(objects.length,8);assert.equal(objects[6].x,26);assert.equal(objects[7].x,56);
box.selectIndices([0,1]);box.copySelectedObject(true);assert.equal(objects.length,6);assert.equal(box.objectClipboard.objects.length,2);
assert.equal(box.validClipboardPayload({type:'selection',objects:[]}),false);
assert.equal(box.validClipboardObject({type:'selection',objects:[objects[0]]}),false,'project annotations cannot contain clipboard containers');
box.selectIndices([0,1]);objects=objects.map(o=>({...o}));box.selected=-1;assert.equal(box.selectionIndices().length,0);
console.log('PASS selection: batch typography, mixed attributes, clipboard, group paste offsets, pen, duplicate, cut, delete, undo snapshot, page reset');
