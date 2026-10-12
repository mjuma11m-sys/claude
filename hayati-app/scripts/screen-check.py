#!/usr/bin/env python3
"""الشاشة مو سودا ومو فاضية؟  python3 screen-check.py shot.bmp
بايثون بدون مكتبات (ماك GitHub ما يسمح pip): نقرا BMP غير مضغوط (24 أو 32 بت) اللي يطلعه sips."""
import struct, sys

def pixels(path):
    b = open(path, 'rb').read()
    if b[:2] != b'BM':
        sys.exit('❌ مو ملف BMP')
    off = struct.unpack_from('<I', b, 10)[0]
    w, h = struct.unpack_from('<ii', b, 18)
    bpp, comp = struct.unpack_from('<HI', b, 28)
    if bpp not in (24, 32) or comp not in (0, 3):
        sys.exit(f'❌ BMP غير مدعوم ({bpp} بت، ضغط {comp})')
    step, row = bpp // 8, ((w * bpp + 31) // 32) * 4
    top_down, h = h < 0, abs(h)
    rows = []
    for y in range(h):
        r = y if top_down else h - 1 - y   # BMP العادي يبدأ من تحت
        base = off + r * row
        rows.append([0.114 * b[base + x * step] + 0.587 * b[base + x * step + 1] + 0.299 * b[base + x * step + 2] for x in range(w)])
    return rows

rows = pixels(sys.argv[1])
h = len(rows)
body = [v for row in rows[int(h * .12):int(h * .88)] for v in row]   # بدون شريط الساعة فوق
mean = sum(body) / len(body)
std = (sum((v - mean) ** 2 for v in body) / len(body)) ** .5
print(f'   الإضاءة {mean:.0f}/255 · التباين {std:.0f}')
if mean < 25: sys.exit('❌ الشاشة سودا (الواجهة ما انحملت)')
if std < 12: sys.exit('❌ الشاشة لون واحد (فاضية)')
print('✅ «حياتي» فتح وانرسمت الواجهة')
