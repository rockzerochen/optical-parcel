"""Real APK smoke test: keep emulator and adb in the SAME process namespace."""
from pathlib import Path
import os,subprocess,time,json,re,xml.etree.ElementTree as ET

root=Path(__file__).resolve().parents[1];work=root.parent/'android-build';sdk=work/'sdk';adb=sdk/'platform-tools/adb'
avdhome=work/'smoke-avd';avd=avdhome/'OpticalSmoke.avd';avd.mkdir(parents=True,exist_ok=True)
(avdhome/'OpticalSmoke.ini').write_text('avd.ini.encoding=UTF-8\npath='+str(avd)+'\ntarget=android-35\n')
config=(work/'avd/OpticalTest.avd/config.ini').read_text().replace('OpticalTest','OpticalSmoke');(avd/'config.ini').write_text(config)
env=dict(os.environ,ANDROID_SDK_ROOT=str(sdk),ANDROID_AVD_HOME=str(avdhome),ANDROID_I_WANT_MY_TCG='yes')
serial='emulator-5560';log=(work/'smoke-emulator.log').open('w')
def run(*args,timeout=30,check=False):
    return subprocess.run([str(x) for x in args],stdout=subprocess.PIPE,stderr=subprocess.PIPE,timeout=timeout,check=check,env=env)
def shell(*args,timeout=30):return run(adb,'-s',serial,'shell',*args,timeout=timeout).stdout.decode('utf-8','replace')
def ui():
    shell('uiautomator','dump','/sdcard/optical-window.xml',timeout=40)
    text=run(adb,'-s',serial,'exec-out','cat','/sdcard/optical-window.xml').stdout.decode('utf-8','replace')
    (work/'last-ui.xml').write_text(text)
    return ET.fromstring(text)
def click_text(text,timeout=30):
    deadline=time.time()+timeout
    while time.time()<deadline:
        try:
            tree=ui()
            for e in tree.iter('node'):
                if text in [e.get('text'),e.get('content-desc')]:
                    b=list(map(int,re.findall(r'\d+',e.get('bounds',''))))
                    if len(b)==4 and b[2]>b[0] and b[3]>b[1]:shell('input','tap',str((b[0]+b[2])//2),str((b[1]+b[3])//2));return
        except Exception:pass
        time.sleep(1)
    raise RuntimeError('UI text not found: '+text)

run(adb,'start-server')
process=subprocess.Popen([str(sdk/'emulator/emulator'),'-avd','OpticalSmoke','-port','5560','-no-window','-no-audio','-no-boot-anim','-no-snapshot','-no-metrics','-accel','off','-gpu','swiftshader','-memory','2048','-cores','2','-camera-back','emulated','-camera-front','none','-show-kernel'],env=env,stdout=log,stderr=subprocess.STDOUT)
try:
    print('Booting Android 15 software emulator',flush=True)
    deadline=time.time()+900;last=0
    while time.time()<deadline:
        if process.poll() is not None:raise RuntimeError('Emulator exited before boot')
        try:
            if shell('getprop','sys.boot_completed',timeout=20).strip()=='1':break
        except subprocess.TimeoutExpired:pass
        if time.time()-last>30:print('Waiting for Android boot...',flush=True);last=time.time()
        time.sleep(3)
    else:raise RuntimeError('Android software emulator did not finish booting')
    print('PASS Android booted',flush=True)
    shell('settings','put','global','device_provisioned','1');shell('settings','put','secure','user_setup_complete','1')
    shell('settings','put','global','window_animation_scale','0');shell('settings','put','global','transition_animation_scale','0');shell('settings','put','global','animator_duration_scale','0');shell('input','keyevent','82')
    installed=run(adb,'-s',serial,'install','-r',root/'OpticalParcel-Android-2.0.0.apk',timeout=120)
    if installed.returncode:raise RuntimeError(installed.stderr.decode() or installed.stdout.decode())
    print('PASS release APK installed',flush=True)
    result=shell('am','start','-W','-n','cn.rockzero.opticalparcel/.MainActivity',timeout=90);print(result[-400:],flush=True)
    time.sleep(12)
    run(adb,'-s',serial,'exec-out','screencap','-p',timeout=30)
    (work/'installed.png').write_bytes(run(adb,'-s',serial,'exec-out','screencap','-p',timeout=30).stdout)
    tree=ui();texts='\n'.join(e.get('text','')+' '+e.get('content-desc','') for e in tree.iter('node'))
    assert '光邮离线' in texts,texts[:500]
    print('PASS native main UI rendered',flush=True)
    click_text('制文本');time.sleep(3);tree=ui();edits=[e for e in tree.iter('node') if e.get('class')=='android.widget.EditText']
    if not edits:raise RuntimeError('QR input is not available; inspect last-ui.xml')
    bounds=list(map(int,re.findall(r'\d+',edits[0].get('bounds',''))));shell('input','tap',str((bounds[0]+bounds[2])//2),str((bounds[1]+bounds[3])//2));shell('input','text','Android-local-QR-2.0');shell('input','keyevent','4');time.sleep(1)
    click_text('生成静态二维码');time.sleep(3)
    (work/'generated-android.png').write_bytes(run(adb,'-s',serial,'exec-out','screencap','-p').stdout)
    print('PASS QR generation button executed in Android WebView',flush=True)
    click_text('保存 PNG');time.sleep(3)
    tree=ui();texts='\n'.join(e.get('text','') for e in tree.iter('node'));print('Save UI texts: '+texts[:500],flush=True)
    if 'SAVE' in texts:click_text('SAVE')
    elif 'Save' in texts:click_text('Save')
    elif '保存' in texts:click_text('保存')
    else:raise RuntimeError('Native document save dialog not found')
    time.sleep(3);paths=shell('find','/sdcard/Download','-name','qrcode-utf8.png').strip().splitlines()
    if not paths:raise RuntimeError('Saved QR PNG was not found in Download')
    out=work/'android-saved-qr.png';run(adb,'-s',serial,'pull',paths[0],out,check=True)
    assert out.read_bytes().startswith(b'\x89PNG\r\n\x1a\n')
    print('PASS native SAF saved real PNG bytes',flush=True)
    (work/'emulator-result.json').write_text(json.dumps({'android':shell('getprop','ro.build.version.release').strip(),'install':True,'mainUI':True,'qrGenerate':True,'nativePNGSave':True,'webView':shell('dumpsys','webviewupdate')},indent=2))
    print('PASS real APK install/launch/QR generation/native file save smoke test',flush=True)
finally:
    process.terminate()
    try:process.wait(timeout=15)
    except subprocess.TimeoutExpired:process.kill()
    run(adb,'kill-server');log.close()
