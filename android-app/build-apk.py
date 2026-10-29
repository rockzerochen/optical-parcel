"""Build a signed offline APK using Java 17 and Android SDK 35 tools. No Gradle."""
from pathlib import Path
import hashlib,json,os,subprocess,zipfile,shutil

root=Path(__file__).resolve().parent
sdk=Path(os.environ.get('ANDROID_SDK_ROOT',str(root.parent/'android-build/sdk')))
default_tools=sdk/'build-tools/35.0.0'
if not default_tools.is_dir():default_tools=sdk/'build-tools/android-15'
tools=Path(os.environ.get('ANDROID_BUILD_TOOLS',str(default_tools)))
android=sdk/'platforms/android-35/android.jar'
build=root/'build';build.mkdir(exist_ok=True)
for name in ['classes','generated','dex']:
    target=build/name
    if target.exists():shutil.rmtree(target)
    target.mkdir()
key=Path(os.environ.get('OPTICAL_KEYSTORE',str(root.parent/'android-signing/optical.p12')))
password=Path(os.environ.get('OPTICAL_KEY_PASSWORD_FILE',str(root.parent/'android-signing/password.txt')))
if not key.is_file() or not password.is_file():raise SystemExit('Signing key missing; set OPTICAL_KEYSTORE and OPTICAL_KEY_PASSWORD_FILE. Private keys are not part of source releases.')
def run(*args):subprocess.run([str(a) for a in args],cwd=root,check=True)
def native(name):return tools/(name+('.exe' if os.name=='nt' else ''))
run(native('aapt2'),'compile','--dir',root/'res','-o',build/'resources.zip')
run(native('aapt2'),'link','-o',build/'base.apk','-I',android,'--manifest',root/'AndroidManifest.xml','--java',build/'generated','-A',root/'assets',build/'resources.zip')
sources=list((root/'src').rglob('*.java'))+list((build/'generated').rglob('*.java'))
run('java','com.sun.tools.javac.Main','--release','8','-encoding','UTF-8','-classpath',android,'-d',build/'classes',*sources)
with zipfile.ZipFile(build/'classes.jar','w',zipfile.ZIP_DEFLATED) as z:
    for p in (build/'classes').rglob('*.class'):z.write(p,p.relative_to(build/'classes').as_posix())
run('java','-cp',tools/'lib/d8.jar','com.android.tools.r8.D8','--min-api','26','--lib',android,'--output',build/'dex',build/'classes.jar')
with zipfile.ZipFile(build/'base.apk') as source,zipfile.ZipFile(build/'unsigned.apk','w') as out:
    for info in source.infolist():out.writestr(info,source.read(info.filename))
    for p in (build/'dex').glob('*.dex'):out.write(p,p.name,compress_type=zipfile.ZIP_STORED)
run(native('zipalign'),'-P','16','-f','4',build/'unsigned.apk',build/'aligned.apk')
apk=root/'OpticalParcel-Android-2.0.0.apk'
run('java','-jar',tools/'lib/apksigner.jar','sign','--ks',key,'--ks-key-alias','optical','--ks-pass','file:'+str(password),'--v1-signing-enabled','true','--v2-signing-enabled','true','--v3-signing-enabled','true','--v4-signing-enabled','false','--out',apk,build/'aligned.apk')
run('java','-jar',tools/'lib/apksigner.jar','verify','--verbose','--print-certs',apk)
run(native('zipalign'),'-c','-P','16','4',apk)
digest=hashlib.sha256(apk.read_bytes()).hexdigest()
(root/'APK-SHA256.txt').write_text(digest+'  '+apk.name+'\n')
print(json.dumps({'apk':str(apk),'size':apk.stat().st_size,'sha256':digest}))
