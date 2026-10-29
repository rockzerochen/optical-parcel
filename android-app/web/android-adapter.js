/* Android mobile UI and native file/clipboard adapter, original code, MIT. */
(()=>{'use strict';
if(typeof OpticalAndroid==='undefined')return;
const $=id=>document.getElementById(id);let selected=-1;
function detail(title){let d=document.createElement('details'),s=document.createElement('summary');s.textContent=title;d.append(s);return d}
function takeControl(id,parent){let node=$(id),label=node.previousElementSibling;if(label?.tagName==='LABEL')parent.append(label);parent.append(node)}
document.body.classList.add('android-app');
// Keep the camera preview above optional settings rather than below a desktop sidebar.
const recv=$('recv-pane'),side=recv.querySelector('aside'),preview=recv.querySelector('div.card'),head=document.createElement('div');head.className='card mobile-camera-head';
for(let id of ['recv-mode','camera']){let field=document.createElement('div');field.className='mobile-field';takeControl(id,field);head.append(field)}
let actions=document.createElement('div');actions.className='mobile-camera-actions';for(let id of ['start','stop'])actions.append($(id));head.append(actions);head.append($('camera-info'));recv.prepend(head);
const manual=$('pick-quad').closest('details');manual.open=false;let advanced=detail('画面、对焦与识别设置');side.querySelector('h2')?.remove();while(side.firstChild)advanced.append(side.firstChild);side.remove();
let finder=$('viewfinder');finder.after(manual);manual.after(advanced);$('start-images').closest('details').hidden=true;
$('video').addEventListener('loadedmetadata',()=>{let v=$('video');finder.style.setProperty('--camera-ratio',String(v.videoWidth/v.videoHeight||1.333))});
// File/text setup collapses once a send image is ready, leaving space for the code.
const sendSide=$('send-pane').querySelector('aside'),sendSettings=detail('选择文件、文本与发送设置');sendSettings.open=true;sendSide.replaceWith(sendSettings);sendSettings.append(sendSide);$('display-scale').value='fit';
new MutationObserver(()=>{if($('play').disabled)return;sendSettings.open=false;if(selected===1)$('stage').scrollIntoView({behavior:'smooth',block:'start'})}).observe($('send-info'),{childList:true,subtree:true});
const generator=$('qr-pane').querySelector('.layout'),qrParams=generator.querySelector('.qr-fields'),qrAdvanced=detail('二维码参数');qrParams.replaceWith(qrAdvanced);qrAdvanced.append(qrParams);
new MutationObserver(()=>{if(selected===3&&!$('qr-canvas').hidden)$('qr-canvas-holder').scrollIntoView({behavior:'smooth',block:'center'})}).observe($('qr-canvas'),{attributes:true,attributeFilter:['hidden']});
new MutationObserver(()=>{if(selected===2&&$('qr-result-info').textContent)$('qr-result').scrollIntoView({behavior:'smooth',block:'center'})}).observe($('qr-result-info'),{childList:true,subtree:true});
function stopAll(){try{$('stop').click();$('qr-stop').click();if($('play').textContent.includes('暂停'))$('play').click()}catch{}}
function notify(text){$('message').textContent=text;}
window.OpticalHost={
 selectTab(index){if(index===selected)return;selected=index;stopAll();if(index===0)$('recv-tab').click();else if(index===1)$('send-tab').click();else{$('qr-tab').click();generator.hidden=index===2;$('qr-pane').querySelector('.qr-reader').hidden=index===3;$('qr-pane').querySelector('h2').textContent=index===2?'扫描文本二维码':'生成静态文本二维码'}window.scrollTo({top:0,behavior:'instant'})},
 notify,background(){stopAll();notify('已停止前台传输；未完成的接收进度已清空。')}
};
// Android WebView does not natively download blob: URLs. Export through SAF.
document.addEventListener('click',async event=>{const a=event.target.closest?.('a[download]');if(!a||!a.href||!a.href.startsWith('blob:'))return;event.preventDefault();event.stopImmediatePropagation();try{const name=a.download||'received.bin',blob=await(await fetch(a.href)).blob();if(blob.size>8*1024*1024)throw Error('文件超过应用保存限制');const data=await new Promise((resolve,reject)=>{let r=new FileReader();r.onload=()=>resolve(String(r.result).split(',')[1]);r.onerror=reject;r.readAsDataURL(blob)});OpticalAndroid.saveBase64(name,(blob.type||'application/octet-stream').split(';')[0],data);notify('请在系统窗口选择保存位置。')}catch(e){notify('保存失败：'+(e.message||e))}},true);
try{const clipboard=navigator.clipboard||{};Object.defineProperty(clipboard,'writeText',{value:text=>{OpticalAndroid.copyText(String(text));return Promise.resolve()},configurable:true});if(!navigator.clipboard)Object.defineProperty(navigator,'clipboard',{value:clipboard})}catch{}
window.addEventListener('error',e=>{try{OpticalAndroid.reportError(e.message||'页面错误')}catch{}});
window.addEventListener('unhandledrejection',e=>{try{OpticalAndroid.reportError(String(e.reason?.message||e.reason||'异步错误'))}catch{}});
})();
