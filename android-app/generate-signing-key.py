"""Developer-only: create a private local signing key; never include it in APK/source."""
from pathlib import Path
import os,secrets,subprocess
p=Path(__file__).resolve().parent.parent/'android-signing'
p.mkdir(mode=0o700,exist_ok=True)
key=p/'optical.p12';password=p/'password.txt'
if key.exists() or password.exists():raise SystemExit('Existing signing files found; refusing to replace signing identity.')
password.write_text(secrets.token_urlsafe(32)+'\n');os.chmod(password,0o600)
subprocess.run(['keytool','-genkeypair','-alias','optical','-keyalg','RSA','-keysize','3072','-validity','9125','-keystore',str(key),'-storetype','PKCS12','-storepass:file',str(password),'-keypass:file',str(password),'-dname','CN=Optical Parcel Offline, OU=Local Applications, O=Private User, C=CN'],check=True)
os.chmod(key,0o600)
print('Created private signing files (excluded from public source packages).')
