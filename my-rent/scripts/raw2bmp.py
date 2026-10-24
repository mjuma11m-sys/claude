#!/usr/bin/env python3
"""لقطة أندرويد الخام (adb exec-out screencap بدون -p) ← BMP صغير لـ screen-check.py. بايثون بدون مكتبات
(DW-040: ImageMagick مو موجود بـ ubuntu-latest). الخام = رأس (12 أو 16 بايت: عرض، طول، صيغة[، ألوان]) + RGBA لكل بكسل.
python3 raw2bmp.py shot.raw shot.bmp [عرض=120] [طول=240]"""
import struct, sys

src, dst = sys.argv[1], sys.argv[2]
W, H = (int(sys.argv[3]), int(sys.argv[4])) if len(sys.argv) > 4 else (120, 240)
b = open(src, 'rb').read()
w, h = struct.unpack_from('<II', b, 0)
hdr = len(b) - w * h * 4
if w == 0 or h == 0 or hdr not in (12, 16):
    sys.exit(f'❌ لقطة خام غير مفهومة ({w}×{h}، رأس {hdr})')
row = (W * 3 + 3) & ~3
px = bytearray(row * H)
for y in range(H):
    sy = min(h - 1, y * h // H)
    out = (H - 1 - y) * row                      # BMP يبدأ من تحت
    for x in range(W):
        i = hdr + (sy * w + min(w - 1, x * w // W)) * 4
        px[out + x * 3:out + x * 3 + 3] = bytes((b[i + 2], b[i + 1], b[i]))   # RGBA ← BGR
open(dst, 'wb').write(b'BM' + struct.pack('<IHHI', 54 + len(px), 0, 0, 54)
                      + struct.pack('<IiiHHIIiiII', 40, W, H, 1, 24, 0, len(px), 2835, 2835, 0, 0) + px)
