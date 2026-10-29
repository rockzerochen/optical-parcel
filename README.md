# Optical Parcel / ��������

[����˵��](README.zh-CN.md) �� English

Offline screen-to-camera transfer for small files and text. Includes a self-contained desktop web tool and an Android 8+ host with a mobile layout, camera permission handling, document picker, native saving and clipboard support.

## Features

- Animated Cimbar transfer with Micro, Low and UltraLow density options. Low/UltraLow use extended core configurations; both endpoints need this version for these modes.
- Ordinary static QR codes for text: selectable error correction, version, mask, module size and quiet zone; PNG/SVG export.
- UTF-8 with ECI 26 for generated text QR codes. Recognition handles supported legacy encodings, reports unsupported/invalid encodings, and preserves whitespace and Unicode text.
- Offline runtime: embedded codecs and WebAssembly, no CDN or online service. The Android app requests camera access and declares no INTERNET permission.
- Designed primarily for files around 1 MiB or less. Speed and recognition depend on camera, focus, screen size, glare and distance.

## Quick start

**Desktop:** open `qr14/Cimbar-Offline.html` in a modern browser. Choose the same Cimbar mode at both ends, select a file on the sender, and point the receiver camera at the animated pattern. Start with UltraLow if detection is difficult. Keep the full pattern visible, improve focus and reduce glare. Camera access may depend on browser permissions and local-page policy.

**Android:** build and install the APK using the instructions below. The four screens are Receive file, Send file, Scan text and Create text QR. Grant camera permission when requested, and choose a save location when receiving/exporting. A recent Android System WebView is required. Runtime is offline; initial developer setup/build requires downloaded tools.

WASM is required for Cimbar. A browser policy that reports `wasm code generation disallowed by embedder` must be resolved by using a compatible browser or approved policy. Ordinary text QR uses JavaScript.

## Build

The generated web page is included. To rebuild it, install Node.js and run:

```sh
node qr14/source/build.cjs
```

Copy `qr14/source/dist/Cimbar-Offline.html` to `qr14/Cimbar-Offline.html` before preparing Android assets. For the extended WASM core, see [CORE-BUILD.txt](qr14/CORE-BUILD.txt); it patches the pinned official WASM using WABT, rather than rebuilding the entire C++/OpenCV stack.

Android requirements: Python 3, JDK 17 (including keytool), Android SDK platform 35 and Build Tools 35.0.0. No Gradle is required. Set `ANDROID_SDK_ROOT`; optionally set `ANDROID_BUILD_TOOLS` to the build-tools directory.

```sh
python android-app/prepare-assets.py
python android-app/generate-signing-key.py
python android-app/build-apk.py
```

The key generator creates a new private identity in `android-signing/` and refuses to overwrite an existing one. Alternatively set `OPTICAL_KEYSTORE` and `OPTICAL_KEY_PASSWORD_FILE` (PKCS12 alias `optical`). Never commit keys or passwords. A self-built APK cannot update the previously distributed APK unless signed with the same private key. Output: `android-app/OpticalParcel-Android-2.0.0.apk`. See [developer notes](android-app/BUILD.txt).

## Source layout

| Path | Contents |
| --- | --- |
| `qr14/` | Desktop page, JS sources, extended core, upstream archives and licenses |
| `android-app/src/` | Native Android WebView host |
| `android-app/web/` | Mobile layout and native bridge adapter |
| `android-app/tests/` | Mobile bridge and desktop interoperability tests |

## Validation and limitations

The source bundle records successful APK compilation/signature verification, mobile Chromium tests with a mocked Android bridge, exact-byte Low/UltraLow interoperability, and Chinese/Unicode QR tests. These are not physical Android camera tests. The emulator did not finish booting, so installation, actual Android camera behavior and system document saving remain unverified. See [Android test report](android-app/TEST-RESULTS.txt) and [QR test report](qr14/QR-TEST-RESULTS.txt).

This is an experimental tool, not an official Cimbar release. Low/UltraLow are custom modes. No transmission rate or recognition rate is guaranteed. Use transfers only where permitted by your organization.

## Licenses and credits

Original Android host/adapters are MIT licensed; see [LICENSE](LICENSE). This does not relicense bundled third-party code. Cimbar/libcimbar and its modifications retain MPL-2.0 obligations, Nayuki QR Code generator retains MIT, and jsQR retains Apache-2.0. See [third-party notices](THIRD_PARTY_NOTICES.md) and the complete bundled notices/source.

