Developer-only tests (runtime users do not need these tools).
Run from the package root after: node source/build.cjs
Install developer dependencies: npm install playwright
Optional independent verification: pip install zxing-cpp pillow
Set CIMBAR_BROWSER to an installed test browser, or install Playwright Chromium.
node source/qr-tests/test-codec.cjs
node source/qr-tests/test-qr.cjs
node source/qr-tests/test-camera.cjs
PNG fixtures generated independently by Segno 1.6.6, except generated.png
which is exported by the application and checked independently with ZXing-C++.
latin-eci.png is a default ISO-8859-1 fixture; Segno omits redundant ECI 3,
so this test intentionally selects ISO-8859-1 manually.
