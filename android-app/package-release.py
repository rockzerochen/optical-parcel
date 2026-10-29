from pathlib import Path
import zipfile,hashlib,json,shutil

project=Path(__file__).resolve().parent
workspace=project.parent
out=workspace/'android-release';out.mkdir(exist_ok=True)
apk=project/'OpticalParcel-Android-2.0.0.apk'
shutil.copyfile(apk,out/apk.name)
with zipfile.ZipFile(apk) as z:
    assert z.read('assets/optical/index.html')==(project/'assets/optical/index.html').read_bytes()
    dex=z.read('classes.dex')
    for s in ['saveBase64','onPermissionRequest','setAlgorithmicDarkeningAllowed','系统 WebView 不可用']:
        assert s.encode('utf-8') in dex,s
    assert not any(f.endswith('.p12') or 'password' in f.lower() for f in z.namelist())

bundle=out/'OpticalParcel-Android-2.0.0-Source-and-APK.zip'
files=[]
for f in project.rglob('*'):
    rel=f.relative_to(project)
    if not f.is_file() or any(p in ['build','__pycache__'] for p in rel.parts):continue
    if f.suffix in ['.png','.pyc'] or f.name.endswith('.apk'):continue
    files.append((f,'android-app/'+rel.as_posix()))
web=workspace/'qr14'
for f in web.rglob('*'):
    rel=f.relative_to(web)
    if not f.is_file() or any(p in ['android','dist','__pycache__'] for p in rel.parts):continue
    if f.name in ['qr-ui.png','integrate-qr.cjs','qr-panel.html']:continue
    files.append((f,'qr14/'+rel.as_posix()))
with zipfile.ZipFile(bundle,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
    z.write(apk,apk.name)
    z.write(project/'README.txt','README-安装说明.txt')
    z.write(project/'TEST-RESULTS.txt','TEST-RESULTS.txt')
    for f,name in files:z.write(f,name)
    assert not any('android-signing/' in f or f.endswith('.p12') or f.endswith('password.txt') for f in z.namelist())

signing=workspace/'android-signing'
backup=out/'OpticalParcel-Android-Signing-PRIVATE.zip'
with zipfile.ZipFile(backup,'w',zipfile.ZIP_DEFLATED) as z:
    z.write(signing/'optical.p12','optical.p12')
    z.write(signing/'password.txt','password.txt')
    z.writestr('KEEP-PRIVATE.txt','Private signing identity for cn.rockzero.opticalparcel. Do not share.\nRequired for future in-place APK updates. Keep separate from public source/APK.\nCertificate SHA256: 4828b6ac4466de2fd9cad6e7e7e0623befc63ddd83ece3afbb8042c6ed628a52\n')

result=[]
for f in [out/apk.name,bundle,backup]:
    result.append({'path':str(f),'size':f.stat().st_size,'sha256':hashlib.sha256(f.read_bytes()).hexdigest()})
(out/'release-manifest.json').write_text(json.dumps(result,indent=2))
print(json.dumps(result,indent=2))
