const fs=require('fs'),path=require('path'),crypto=require('crypto');const p=__dirname;
function read(f){return fs.readFileSync(path.join(p,f),'utf8')}
function json(s){return JSON.stringify(s).replaceAll('<','\\u003c')}
const wasm=fs.readFileSync(path.join(p,'wasm/cimbar_js.2026-08-21T2336.wasm')),runtime=read('wasm/cimbar_js.2026-08-21T2336.js');
const html=read('template.html').replace('/*WASM*/',()=>wasm.toString('base64')).replace('/*RUNTIME*/',()=>json(runtime)).replace('/*WORKER*/',()=>json(read('vision.js')+'\n'+read('worker.js'))).replace('/*APP*/',()=>read('app.js')).replace('/*QR_ENCODER*/',()=>read('vendor/qrcodegen.js')).replace('/*QR_WORKER*/',()=>json(read('vendor/jsQR.js')+'\n'+read('qr-worker.js'))).replace('/*QR_APP*/',()=>read('qr-codec.js')+'\n'+read('qr-app.js'));
fs.mkdirSync(path.join(p,'dist'),{recursive:true});fs.writeFileSync(path.join(p,'dist/Cimbar-Offline.html'),html);console.log('Built '+Buffer.byteLength(html)+' bytes; WASM '+wasm.length+' bytes; SHA256 '+crypto.createHash('sha256').update(html).digest('hex'));
