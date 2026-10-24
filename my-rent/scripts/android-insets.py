#!/usr/bin/env python3
"""نص الواجهة مو تحت شريط الساعة؟  python3 android-insets.py ui.xml window.txt density
ui.xml من uiautomator dump، وwindow.txt من dumpsys window. بايثون بدون مكتبات.
نلقى أعلى نص داخل الـ WebView ونقارنه بنهاية شريط الساعة (statusBars inset)."""
import re, sys
import xml.etree.ElementTree as ET

ui, win, density = sys.argv[1], open(sys.argv[2], encoding='utf-8', errors='replace').read(), int(sys.argv[3] or 160)

m = re.findall(r'type=statusBars[^\n]*?frame=\[\d+,\d+\]\[\d+,(\d+)\]', win)
bar = max(map(int, m)) if m else round(24 * density / 160)
print(f'   شريط الساعة ينتهي عند {bar}px' + ('' if m else ' (تقدير 24dp)'))

def bounds(n):
    b = re.findall(r'\d+', n.get('bounds', ''))
    return list(map(int, b)) if len(b) == 4 else None

root = ET.parse(ui).getroot()
tops = []
for wv in root.iter('node'):
    if wv.get('class') != 'android.webkit.WebView':
        continue
    for n in wv.iter('node'):
        b = bounds(n)
        if b and (n.get('text') or n.get('content-desc')) and b[3] > b[1] and n is not wv:
            tops.append((b[1], n.get('text') or n.get('content-desc')))
if not tops:
    print('⚠️ ما لقينا نص داخل الـ WebView بالشجرة — شيك على launch.png بعينك')
    sys.exit(0)
top, label = min(tops)
print(f'   أعلى نص: «{label[:30]}» عند {top}px')
if top < bar:
    sys.exit(f'❌ الواجهة تحت شريط الساعة ({top} < {bar}) — edge-to-edge مكسور')
print('✅ الواجهة تحت شريط الساعة مو وراه')
