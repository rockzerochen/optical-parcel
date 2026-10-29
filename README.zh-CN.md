# 光邮离线 / Optical Parcel

中文说明 · [English](README.md)

通过屏幕显示、摄像头接收，在两台设备之间离线传输小文件和文本。项目包含桌面单文件网页与 Android 8 及以上版本的应用源码。

## 功能

- 动态 Cimbar 文件传输，支持 Micro、Low、UltraLow 等密度。Low 与 UltraLow 修改了核心网格配置，两端需要使用本项目版本。
- 普通静态二维码仅传输文本，可设置纠错等级、版本、掩码、模块大小与留白，导出 PNG 或 SVG。
- 生成文本二维码时使用 UTF-8 字节与 ECI 26，避免中文编码歧义；识别时兼容支持的旧编码，对无效或不支持的编码提示错误，保留空格、换行与 Unicode 文本。
- 编解码资源内置，运行时不依赖服务器或 CDN；安卓应用未声明互联网权限。
- 主要面向约 1 MiB 以内的小文件。实际速度和识别率取决于摄像头、对焦、屏幕尺寸、反光和距离。

## 使用方法

桌面端用现代浏览器打开 `qr14/Cimbar-Offline.html`。发送端选择文件，接收端选择相同模式并打开摄像头。识别困难时先用 UltraLow，保持完整图案进入画面，调整对焦并避免反光。浏览器可能因本地页面策略或权限限制摄像头。

安卓端按下文编译安装 APK。底部四个入口分别为收文件、发文件、扫文本、制文本。按提示授权摄像头，接收或导出时选择保存位置。需要较新的 Android System WebView；运行可离线，首次准备开发工具需要下载依赖。

Cimbar 依赖 WebAssembly。若浏览器提示 `wasm code generation disallowed by embedder`，请使用兼容浏览器或由管理员调整允许的策略。普通文本二维码采用 JavaScript 编解码。

## 编译

仓库已包含生成好的网页。安装 Node.js 后重新生成：

```sh
node qr14/source/build.cjs
```

将生成的 `qr14/source/dist/Cimbar-Offline.html` 复制到 `qr14/Cimbar-Offline.html`，再准备安卓资源。核心构建详见 [CORE-BUILD.txt](qr14/CORE-BUILD.txt)：使用 WABT 修改固定版本的官方 WASM，并非完整重编译 C++/OpenCV。

安卓构建需要 Python 3、JDK 17（含 keytool）、Android SDK platform 35 与 Build Tools 35.0.0，无需 Gradle。设置 `ANDROID_SDK_ROOT`，也可用 `ANDROID_BUILD_TOOLS` 指定工具目录。

```sh
python android-app/prepare-assets.py
python android-app/generate-signing-key.py
python android-app/build-apk.py
```

签名脚本在 `android-signing/` 创建私钥，不会覆盖已有密钥。也可通过 `OPTICAL_KEYSTORE` 与 `OPTICAL_KEY_PASSWORD_FILE` 指定自有 PKCS12 密钥（别名 `optical`）和密码文件。私钥及密码不要提交。自行生成新签名的 APK 不能直接覆盖安装此前使用其他签名发布的 APK。输出为 `android-app/OpticalParcel-Android-2.0.0.apk`，详见 [构建说明](android-app/BUILD.txt)。

## 目录

| 路径 | 内容 |
| --- | --- |
| `qr14/` | 桌面网页、JavaScript 源码、修改后的核心、上游源码与许可证 |
| `android-app/src/` | 安卓原生 WebView 容器 |
| `android-app/web/` | 手机布局与原生接口适配 |
| `android-app/tests/` | 移动页面、原生接口模拟及桌面互通测试 |

## 测试与已知限制

已完成 APK 编译与签名校验、移动 Chromium 页面测试（模拟安卓接口）、Low/UltraLow 文件逐字节互通测试、中文与 Unicode 二维码测试。这些不等同于安卓真机测试。模拟器尚未完成启动，未验证实际安装、真机摄像头和系统文件保存。详见 [安卓测试报告](android-app/TEST-RESULTS.txt) 与 [二维码测试报告](qr14/QR-TEST-RESULTS.txt)。

这是实验性工具，并非官方 Cimbar 发行版；Low/UltraLow 是自定义模式，不能保证传输速度或识别率。请在组织允许的范围内使用。

## 开源许可

原创安卓容器和适配代码使用 [MIT 许可证](LICENSE)。第三方代码保留各自许可，不因根目录 MIT 文件而变更：Cimbar/libcimbar 及相关修改遵循 MPL-2.0，Nayuki 二维码生成库遵循 MIT，jsQR 遵循 Apache-2.0。详见 [第三方说明](THIRD_PARTY_NOTICES.md) 与随附完整许可证、源码。
