/* Modified libcimbar core: MPL-2.0. Deterministic WebAssembly function extension.
 * Build-time dependency: wabt 1.0.39 (bundled build tool), no runtime dependency.
 * The original optimized image/RS/fountain algorithms are retained. Only the
 * central Config::update function receives branches for two new grid profiles.
 */
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const ROOT=__dirname,INPUT=path.join(ROOT,'wasm-original/cimbar_js.2026-08-21T2336.wasm');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const PROFILES=[
 {id:69,name:'Low',columns:64,rows:48,ecc:36,block:183,width:592,height:448},
 {id:70,name:'UltraLow',columns:48,rows:36,ecc:40,block:198,width:448,height:340}
];
(async()=>{
 const original=fs.readFileSync(INPUT),expected=fs.readFileSync(path.join(ROOT,'core-base-sha256.txt'),'utf8').trim();
 if(hash(original)!==expected)throw Error('Unexpected original WASM; refusing version-sensitive extension');
 const wabt=await require('./tools/wabt/package')(),module=wabt.readWasm(original,{readDebugNames:true});module.generateNames();module.applyNames();let wat=module.toText({foldExprs:false,inlineExport:false});
 const start=wat.indexOf('(func $f1312 (type $t2) (param $p0 i32)\n'),end=wat.indexOf('\n  (func ',start+1);if(start<0||end<0)throw Error('Missing pinned Config::update function');
 const fn=wat.slice(start,end);if(!fn.includes('call $f99\n    local.tee $p0')||!fn.includes('i32.store offset=40')||!fn.includes('i32.store8 offset=52'))throw Error('Core ABI mismatch');
 const bodyStart=fn.indexOf('\n    i32.const 1\n');if(bodyStart<0)throw Error('Missing verified insertion point');
 let branches='';
 for(const p of PROFILES){
  const cells=p.columns*p.rows-144,symbolBytes=cells*4/8,colorBytes=cells*2/8,capacity=symbolBytes+colorBytes,chunks=6,payload=capacity/p.block*(p.block-p.ecc);
  if(!Number.isInteger(symbolBytes/p.block)||!Number.isInteger(colorBytes/p.block)||!Number.isInteger(payload/chunks)||p.block>255||payload/chunks<=6)throw Error('Invalid RS/fountain alignment');
  p.dataCells=cells;p.encodedBytes=capacity;p.decodedBytes=payload;p.fountainChunkBytes=payload/chunks;p.filePayloadBytes=payload-chunks*6;
  const fields=[2,4,p.ecc,p.block,p.width,p.height,8,9,9,9,p.columns,p.rows,1,0];
  branches+=`\n    ;; ${p.name}, ${p.columns} x ${p.rows}; RS(${p.block},${p.block-p.ecc}), six fountain chunks\n    local.get $p0\n    i32.const ${p.id}\n    i32.eq\n    if\n      call $f99\n      local.set $l10\n`;
  fields.forEach((v,i)=>{branches+=`      local.get $l10\n      i32.const ${v}\n      ${i===13?'i32.store8': 'i32.store'}${i?' offset='+i*4:''}\n`});
  branches+='      return\n    end\n';
 }
 const modified=fn.slice(0,bodyStart)+branches+fn.slice(bodyStart);wat=wat.slice(0,start)+modified+wat.slice(end);
 const compiled=wabt.parseWat('cimbar-low-density.wat',wat);compiled.resolveNames();compiled.validate();const output=Buffer.from(compiled.toBinary({write_debug_names:false,canonicalize_lebs:true}).buffer);
 if(!WebAssembly.validate(output))throw Error('Invalid extended WASM');
 fs.writeFileSync(path.join(ROOT,'wasm/cimbar_js.2026-08-21T2336.wasm'),output);
 fs.writeFileSync(path.join(ROOT,'core-extension.wat'),';; Added inside Config::update, after local declarations. MPL-2.0.\n'+branches);
 fs.writeFileSync(path.join(ROOT,'core-profiles.json'),JSON.stringify({version:'1.3',method:'Pinned original WASM -> WABT -> central Config::update branches -> validated WASM; not a full C++ dependency rebuild.',baseSHA256:hash(original),modifiedSHA256:hash(output),profiles:PROFILES},null,2));
 console.log(JSON.stringify({bytes:output.length,sha256:hash(output),profiles:PROFILES},null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
