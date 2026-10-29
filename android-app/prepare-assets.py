from pathlib import Path
import hashlib,json

project=Path(__file__).resolve().parent
base=project.parent/'qr14'
assets=project/'assets/optical'
assets.mkdir(parents=True,exist_ok=True)
html=(base/'Cimbar-Offline.html').read_text(encoding='utf-8')
html=html.replace("connect-src 'none'",'connect-src blob: data:')
html=html.replace('</head>','<style>'+(project/'web/android.css').read_text(encoding='utf-8')+'</style></head>')
html=html.replace('</body>','<script>'+(project/'web/android-adapter.js').read_text(encoding='utf-8')+'</script></body>')
html=html.replace('此页面无法访问摄像头；Windows请用新版Edge打开，安卓本地网页受限时请使用附带APK','系统 WebView 无法访问摄像头，请检查相机权限和 WebView 版本')
html=html.replace('本版针对 Windows Edge / Chrome；实际分辨率、对焦和曝光控制取决于摄像头及浏览器支持。','实际分辨率、对焦与曝光控制取决于手机摄像头和系统 WebView 支持。')
html=html.replace('此浏览器或当前页面无法访问摄像头，请使用支持本地摄像头的 Edge / Chrome，或从图片识别。','系统 WebView 无法访问摄像头，请检查相机权限和系统组件，或从图片识别。')
(assets/'index.html').write_text(html,encoding='utf-8')
licenses=['光邮离线 Android 2.0.0\nNative host/mobile adapter: MIT\nCimbar core: MPL-2.0 (locally extended)\nQR generator: Project Nayuki, MIT\nQR decoder: jsQR, Apache-2.0 (local Hanzi extension)\n\n']
for p in sorted((base/'licenses').glob('*.txt')):
    licenses.append('\n=== '+p.name+' ===\n'+p.read_text(encoding='utf-8'))
(assets/'licenses.txt').write_text('\n'.join(licenses),encoding='utf-8')
(project/'asset-provenance.json').write_text(json.dumps({'source':'Web tool 1.4, extended Cimbar core 1.3','webHTMLSHA256':hashlib.sha256((base/'Cimbar-Offline.html').read_bytes()).hexdigest(),'appHTMLSHA256':hashlib.sha256((assets/'index.html').read_bytes()).hexdigest(),'changes':'Mobile layout; native navigation; blob save via Android SAF; clipboard; local-only blob/data fetch policy. Codec binaries unchanged.'},indent=2),encoding='utf-8')
print('Prepared local Android assets:',(assets/'index.html').stat().st_size,'bytes')
