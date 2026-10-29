"""Run from package root; developer dependencies: zxing-cpp, pillow."""
from pathlib import Path
from PIL import Image
import zxingcpp

root = Path(__file__).parent / 'fixtures'
result = zxingcpp.read_barcode(Image.open(root / 'generated.png'))
assert result is not None
assert result.text == (root / 'generated-text.txt').read_text(encoding='utf-8')
assert result.bytes == (root / 'generated-text.txt').read_bytes()
print('PASS independent QR reader: exact Unicode text and UTF-8 payload bytes')
