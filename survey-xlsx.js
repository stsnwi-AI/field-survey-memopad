/* v1.4.28 — self-contained XLSX export with embedded JPEG photos. No network/CDN. */
(function(){
'use strict';
const encoder=new TextEncoder();
const xml=s=>String(s??'').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
const cstr=s=>'<is><t xml:space="preserve">'+xml(s)+'</t></is>';
const byte=s=>encoder.encode(s);
const u16=(d,v,i)=>{d[i]=v&255;d[i+1]=(v>>>8)&255};
const u32=(d,v,i)=>{u16(d,v,i);u16(d,v>>>16,i+2)};
const crcTable=Array.from({length:256},(_,n)=>{let c=n;for(let i=0;i<8;i++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0});
const crc32=b=>{let c=0xffffffff;for(const x of b)c=crcTable[(c^x)&255]^(c>>>8);return (c^0xffffffff)>>>0};
function zip(files){
 let offset=0;const chunks=[],central=[];
 for(const f of files){
  const name=byte(f.name),data=typeof f.data==='string'?byte(f.data):f.data;
  const crc=crc32(data);
  const local=new Uint8Array(30+name.length);u32(local,0x04034b50,0);u16(local,20,4);u16(local,0x0800,6);u32(local,crc,14);u32(local,data.length,18);u32(local,data.length,22);u16(local,name.length,26);local.set(name,30);chunks.push(local,data);
  const dir=new Uint8Array(46+name.length);u32(dir,0x02014b50,0);u16(dir,20,4);u16(dir,20,6);u16(dir,0x0800,8);u32(dir,crc,16);u32(dir,data.length,20);u32(dir,data.length,24);u16(dir,name.length,28);u32(dir,offset,42);dir.set(name,46);central.push(dir);
  offset+=local.length+data.length;
 }
 const cdStart=offset,cdLen=central.reduce((n,d)=>n+d.length,0);const end=new Uint8Array(22);
 u32(end,0x06054b50,0);u16(end,files.length,8);u16(end,files.length,10);u32(end,cdLen,12);u32(end,cdStart,16);
 return new Blob([...chunks,...central,end],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
}
function photoJpeg(data){
 return new Promise((resolve,reject)=>{
  if(typeof data!=='string'||!/^data:image\/(?:png|jpeg|webp|gif|avif|bmp|heic|heif);base64,/i.test(data)){reject(Error('写真データの形式が不正です'));return}
  const img=new Image();
  img.onload=()=>{
   try{
    const width=img.naturalWidth,height=img.naturalHeight;
    if(!width||!height||width*height>100000000){throw Error('写真の寸法が不正です')}
    const ratio=Math.min(1,800/width,580/height),c=document.createElement('canvas');
    c.width=Math.max(1,Math.round(width*ratio));c.height=Math.max(1,Math.round(height*ratio));
    const ctx=c.getContext('2d');if(!ctx)throw Error('画像変換を利用できません');
    ctx.fillStyle='#ffffff';ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(img,0,0,c.width,c.height);
    const jpeg=c.toDataURL('image/jpeg',.82);if(!jpeg.startsWith('data:image/jpeg;base64,'))throw Error('JPEG変換に失敗しました');
    const raw=atob(jpeg.substring(jpeg.indexOf(',')+1));const b=new Uint8Array(raw.length);
    for(let i=0;i<raw.length;i++)b[i]=raw.charCodeAt(i);
    resolve({bytes:b,width:c.width,height:c.height});
   }catch(e){reject(e)}
  };
  img.onerror=()=>reject(Error('写真を読み込めません。元の写真形式をご確認ください'));
  img.src=data;
 });
}
const heading=(n,style=0)=>'<c r="'+n+'" t="inlineStr" s="'+style+'">'+cstr('')+'</c>';
const cell=(ref,value,style=0)=>'<c r="'+ref+'" t="inlineStr" s="'+style+'">'+cstr(value)+'</c>';
function drawingXml(photos){
 return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
 '<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'+
 photos.map((p,i)=>{
 const ratio=Math.min(245/p.width,171/p.height);
 const w=Math.round(p.width*ratio*9525),h=Math.round(p.height*ratio*9525);
 return '<xdr:oneCellAnchor><xdr:from><xdr:col>2</xdr:col><xdr:colOff>45720</xdr:colOff><xdr:row>'+(p.row-1)+'</xdr:row><xdr:rowOff>45720</xdr:rowOff></xdr:from><xdr:ext cx="'+w+'" cy="'+h+'"/><xdr:pic><xdr:nvPicPr><xdr:cNvPr id="'+(i+1)+'" name="調査写真'+(i+1)+'"/><xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr></xdr:nvPicPr><xdr:blipFill><a:blip r:embed="rId'+(i+1)+'"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill><xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="'+w+'" cy="'+h+'"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic><xdr:clientData/></xdr:oneCellAnchor>'
 }).join('')+'</xdr:wsDr>';
}
async function build(payload){
 if(!payload||!Array.isArray(payload.entries)||!payload.entries.length)throw Error('調査番号がありません');
 if(payload.entries.length>2000)throw Error('調査番号は2000件以内にしてください');
 const rows=[],photos=[],total=payload.entries.reduce((s,e)=>s+Math.max(1,e.photos?.length||0),0);
 if(total>500)throw Error('写真台帳が500行を超えます。調査データを分けて出力してください');
 for(const entry of payload.entries){
  const pics=entry.photos?.length?entry.photos:[null];
  for(let i=0;i<pics.length;i++){
   const row=rows.length+5;
   if(pics[i]){
    try{const image=await photoJpeg(pics[i].data);photos.push({...image,row});}
    catch(err){throw Error('No.'+entry.no+' 写真'+(i+1)+'：'+err.message)}
   }
   rows.push({no:entry.no,page:entry.page,photo:pics[i]?'写真 '+(i+1)+' / '+pics.length:'写真なし',memo:entry.memo||'',instruction:entry.instruction||'',row});
  }
 }
 const now=new Date(),date=now.toLocaleDateString('ja-JP');
 let sheet='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><dimension ref="A1:E'+Math.max(4,rows.length+4)+'"/><sheetViews><sheetView workbookViewId="0"><pane ySplit="4" topLeftCell="A5" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="18"/><cols><col min="1" max="1" width="11" customWidth="1"/><col min="2" max="2" width="10" customWidth="1"/><col min="3" max="3" width="38" customWidth="1"/><col min="4" max="4" width="46" customWidth="1"/><col min="5" max="5" width="46" customWidth="1"/></cols><sheetData>';
 sheet+='<row r="1" ht="32" customHeight="1">'+cell('A1','現場調査報告書（写真台帳）',1)+'</row>';
 sheet+='<row r="2" ht="23" customHeight="1">'+cell('A2','現場：'+(payload.siteId||'未設定')+'　作成日：'+date,2)+'</row>';
 sheet+='<row r="3" ht="21" customHeight="1">'+cell('A3','調査番号：'+payload.entries.length+'件　／　掲載写真：'+photos.length+'枚　／　Excelで文章の修正が可能',2)+'</row>';
 sheet+='<row r="4" ht="28" customHeight="1">'+['調査番号','図面ページ','現場写真','調査メモ','施工指示'].map((t,i)=>cell('ABCDE'[i]+'4',t,3)).join('')+'</row>';
 for(const rec of rows){
  sheet+='<row r="'+rec.row+'" ht="147" customHeight="1">'+
    cell('A'+rec.row,String(rec.no).padStart(3,'0'),4)+cell('B'+rec.row,rec.page,4)+
    cell('C'+rec.row,rec.photo,4)+cell('D'+rec.row,rec.memo,4)+cell('E'+rec.row,rec.instruction,4)+'</row>';
 }
 sheet+='</sheetData><mergeCells count="3"><mergeCell ref="A1:E1"/><mergeCell ref="A2:E2"/><mergeCell ref="A3:E3"/></mergeCells>';
 sheet+='<printOptions horizontalCentered="1"/><pageMargins left="0.24" right="0.24" top="0.38" bottom="0.38" header="0.15" footer="0.15"/><pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="0"/>';
 if(photos.length)sheet+='<drawing r:id="rId1"/>';
 sheet+='</worksheet>';
 const styles='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="3"><font><sz val="11"/><name val="Yu Gothic"/></font><font><b/><sz val="17"/><color rgb="FFFFFFFF"/><name val="Yu Gothic"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Yu Gothic"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF20425E"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFD7E0E8"/></left><right style="thin"><color rgb="FFD7E0E8"/></right><top style="thin"><color rgb="FFD7E0E8"/></top><bottom style="thin"><color rgb="FFD7E0E8"/></bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="5"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" applyFont="1" applyFill="1"/><xf numFmtId="0" fontId="0" fillId="0" borderId="0" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="2" fillId="2" borderId="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="1" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';
 const types='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>'+(photos.length?'<Default Extension="jpg" ContentType="image/jpeg"/>':'')+'<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'+(photos.length?'<Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>':'')+'</Types>';
 const files=[
 {name:'[Content_Types].xml',data:types},
 {name:'_rels/.rels',data:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'},
 {name:'xl/workbook.xml',data:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="現場調査写真台帳" sheetId="1" r:id="rId1"/></sheets><calcPr calcId="191029"/></workbook>'},
 {name:'xl/_rels/workbook.xml.rels',data:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'},
 {name:'xl/styles.xml',data:styles},
 {name:'xl/worksheets/sheet1.xml',data:sheet}
 ];
 if(photos.length){
  files.push({name:'xl/worksheets/_rels/sheet1.xml.rels',data:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/></Relationships>'});
  files.push({name:'xl/drawings/drawing1.xml',data:drawingXml(photos)});
  files.push({name:'xl/drawings/_rels/drawing1.xml.rels',data:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+photos.map((_,i)=>'<Relationship Id="rId'+(i+1)+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image'+(i+1)+'.jpg"/>').join('')+'</Relationships>'});
  photos.forEach((p,i)=>files.push({name:'xl/media/image'+(i+1)+'.jpg',data:p.bytes}));
 }
 return zip(files);
}
window.fieldSurveyExcelExport=async payload=>{
 const blob=await build(payload);
 const url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download='現場調査報告書_'+new Date().toISOString().slice(0,10)+'.xlsx';
 document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
};
}
/* v1.4.29: original survey photos only (no PDF, memo or spreadsheet). */
window.fieldSurveyPhotoZipExport=payload=>{
 if(!payload||!Array.isArray(payload.entries))throw Error('調査写真の記録がありません');
 const files=[];let totalBytes=0;
 const extByType={jpeg:'jpg',png:'png',webp:'webp',gif:'gif',heic:'heic',heif:'heif',avif:'avif',bmp:'bmp'};
 if(payload.entries.length>2000)throw Error('調査番号が2000件を超えています');
 for(const entry of payload.entries){
  const photos=Array.isArray(entry.photos)?entry.photos:[];
  if(photos.length>150)throw Error('1つの調査番号に150枚を超える写真があります');
  for(let i=0;i<photos.length;i++){
   const data=photos[i]?.data;
   if(typeof data!=='string')throw Error('調査写真のデータが不正です');
   const m=/^data:image\/(jpeg|png|webp|gif|heic|heif|avif|bmp);base64,([A-Za-z0-9+/=]+)$/i.exec(data);
   if(!m)throw Error('写真の形式を読み込めません。P'+entry.page+' No.'+entry.no+' 写真'+(i+1));
   const binary=atob(m[2]);const bytes=new Uint8Array(binary.length);
   for(let k=0;k<binary.length;k++)bytes[k]=binary.charCodeAt(k);
   totalBytes+=bytes.length;
   if(files.length>=500)throw Error('写真の合計が500枚を超えています。分割して出力してください');
   if(totalBytes>350*1024*1024)throw Error('写真データが350MBを超えています。分割して出力してください');
   const pad=(v,width)=>String(v).padStart(width,'0');
   files.push({name:'P'+pad(entry.page,3)+'_No'+pad(entry.no,3)+'_'+pad(i+1,2)+'.'+extByType[m[1].toLowerCase()],data:bytes});
  }
 }
 if(!files.length)throw Error('この図面には出力できる写真がありません');
 const blob=zip(files),url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download='現場調査写真_'+new Date().toLocaleDateString('sv-SE')+'.zip';
 document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
 return files.length;
};
})();
