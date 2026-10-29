/* Static QR text codec and character handling, original code, MIT. */
const QrTextCodec=(()=>{
function utf8(text){for(let i=0;i<text.length;i++){let c=text.charCodeAt(i);if(c>=0xd800&&c<=0xdbff){let n=text.charCodeAt(++i);if(!(n>=0xdc00&&n<=0xdfff))throw Error('文本包含不完整的 Unicode 字符，请重新粘贴该字符。')}else if(c>=0xdc00&&c<=0xdfff)throw Error('文本包含不完整的 Unicode 字符，请重新粘贴该字符。')}return new TextEncoder().encode(text)}
function integer(n,min,max,label){n=Number(n);if(!Number.isInteger(n)||n<min||n>max)throw Error(label+'应为 '+min+'–'+max+' 的整数');return n}
function generate(text,options={}){
 if(!text.length)throw Error('请输入要传输的文本。');const bytes=utf8(text);
 if(bytes.length>2953)throw Error('文本为 '+bytes.length+' 个 UTF-8 字节，超过单张普通二维码的容量，请缩短文本或使用 Cimbar。');
 const level=options.ecc||'M',levels={L:qrcodegen.QrCode.Ecc.LOW,M:qrcodegen.QrCode.Ecc.MEDIUM,Q:qrcodegen.QrCode.Ecc.QUARTILE,H:qrcodegen.QrCode.Ecc.HIGH};if(!levels[level])throw Error('纠错等级无效');
 let version=integer(options.version??0,0,40,'版本'),mask=integer(options.mask??-1,-1,7,'掩膜'),scale=integer(options.scale??8,2,24,'每模块像素'),border=integer(options.border??4,4,16,'留白');let qr;
 try{qr=qrcodegen.QrCode.encodeSegments([qrcodegen.QrSegment.makeEci(26),qrcodegen.QrSegment.makeBytes(Array.from(bytes))],levels[level],version||1,version||40,mask,false)}catch(e){if(e instanceof RangeError||/too long|capacity/i.test(e.message))throw Error('文本无法放入当前版本和纠错等级。请选择“自动版本”、降低纠错等级，或缩短文本；中文和 emoji 请按 UTF-8 字节数判断容量。');throw e}
 let size=(qr.size+border*2)*scale;if(size>4096)throw Error('生成图片超过 4096 像素，请减小每模块像素或留白。');return {qr,bytes,version:qr.version,mask:qr.mask,ecc:level,scale,border,size};
}
function byteText(bytes,encoding){if(encoding==='iso-8859-1')return Array.from(bytes,b=>String.fromCharCode(b)).join('');if(encoding==='ascii'){if(bytes.some(x=>x>127))throw Error('ECI 指定 ASCII，但数据含非 ASCII 字节');return String.fromCharCode(...bytes)}return new TextDecoder(encoding,{fatal:true,ignoreBOM:true}).decode(new Uint8Array(bytes))}
function decode(code,fallback='auto'){
 const allowed=['auto','utf-8','gb18030','shift-jis','iso-8859-1'];if(!allowed.includes(fallback))throw Error('字符集选项无效');
 const eciMap={3:'iso-8859-1',20:'shift-jis',25:'utf-16be',26:'utf-8',27:'ascii',28:'big5',29:'gb18030'},encodings=new Set();let assignment=null,pending=[],text='',warning=false,hasECI=false;
 function flush(){if(!pending.length)return;let selected=assignment===null?fallback:eciMap[assignment];if(!selected)throw Error('此二维码声明了暂不支持的 ECI 字符集 '+assignment+'，未输出可能乱码的文本。');try{if(selected==='auto'){try{text+=byteText(pending,'utf-8');selected='utf-8'}catch{selected='gb18030';text+=byteText(pending,selected);warning=true}}else text+=byteText(pending,selected)}catch(e){throw Error('无法按 '+selected+' 完整还原文本。'+(assignment===null?'请在“无 ECI 时的字符集”中切换编码后重试。':'二维码已声明字符集，请核对来源。'))}encodings.add(selected+(assignment===null?'（无 ECI）':'（ECI '+assignment+'）'));pending=[]}
 for(let chunk of code.chunks||[]){if(chunk.type==='eci'){if(assignment!==chunk.assignmentNumber)flush();assignment=chunk.assignmentNumber;hasECI=true}else if(chunk.type==='byte'){pending.push(...chunk.bytes)}else{flush();if(chunk.type==='kanji'){text+=byteText(chunk.bytes,'shift-jis');encodings.add('QR Kanji / Shift-JIS')}else if(chunk.type==='hanzi'){text+=byteText(chunk.bytes,'gb18030');encodings.add('QR Hanzi / GB2312')}else if(chunk.type==='numeric'||chunk.type==='alphanumeric'){text+=chunk.text;encodings.add('数字/英文模式')}else throw Error('不支持的二维码文本分段：'+chunk.type)}}flush();
 return {text,encoding:[...encodings].join(' + ')||'空文本',hasECI,warning,version:code.version,byteLength:(code.binaryData||[]).length};
}
function svg(model){const {qr,border,size}=model;let commands=[];for(let y=0;y<qr.size;y++)for(let x=0;x<qr.size;x++)if(qr.getModule(x,y))commands.push('M'+(x+border)+','+(y+border)+'h1v1h-1z');let n=qr.size+border*2;return '<svg xmlns="http://www.w3.org/2000/svg" width="'+size+'" height="'+size+'" viewBox="0 0 '+n+' '+n+'" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#fff"/><path d="'+commands.join('')+'" fill="#000"/></svg>'}
return {utf8,generate,decode,svg};
})();
