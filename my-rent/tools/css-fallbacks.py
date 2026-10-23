#!/usr/bin/env python3
"""DW-037: بدائل Safari القديمة — قبل كل color-mix() أو dvh نحط نفس الخاصية بقيمة يفهمها أي متصفح.
python3 tools/css-fallbacks.py src/**/*.css  (آمن لو تعاد: يتخطى اللي عنده بديل)"""
import re, sys

def split_mix(s, i):
    """يرجّع (نهاية القوس، الوسائط) لـ color-mix( يبدأ عند i"""
    depth, j, args, cur = 0, i + len("color-mix("), [], ""
    while j < len(s):
        ch = s[j]
        if ch == "(": depth += 1
        if ch == ")":
            if depth == 0: args.append(cur.strip()); return j + 1, args
            depth -= 1
        if ch == "," and depth == 0: args.append(cur.strip()); cur = ""
        else: cur += ch
        j += 1
    raise ValueError(s)

def hexa(h, p):
    h = h.lstrip("#"); r, g, b = (int(h[k:k+2], 16) for k in (0, 2, 4))
    return f"rgba({r}, {g}, {b}, {p/100:g})"

def fallback_value(prop, val):
    out, i = "", 0
    while True:
        k = val.find("color-mix(", i)
        if k < 0: return out + val[i:]
        end, args = split_mix(val, k)
        a, b = args[1], args[2]
        m = re.match(r"(#[0-9a-fA-F]{6})\s+(\d+)%", a)
        if b == "transparent" and m: rep = hexa(m.group(1), int(m.group(2)))
        elif b != "transparent": rep = b
        elif prop.startswith("background"): rep = "var(--surface-2)"
        else: rep = "var(--line)"
        out += val[i:k] + rep; i = end

DECL = re.compile(r"(?<![\w-])([a-z-]+)\s*:\s*([^;{}]*?(?:color-mix\(|\d+dvh)[^;{}]*?)(?=;|\})")
for path in sys.argv[1:]:
    src = open(path).read()
    def fix(m):
        prop, val = m.group(1), m.group(2)
        fb = fallback_value(prop, val) if "color-mix(" in val else val
        fb = re.sub(r"(\d+)dvh", r"\1vh", fb)
        # فيه بديل قبله بنفس القاعدة؟
        before = src[:m.start()]; block = before[before.rfind("{") + 1:]
        if re.search(rf"(?<![\w-]){re.escape(prop)}\s*:\s*{re.escape(fb.strip())}\s*;", block): return m.group(0)
        return f"{prop}: {fb.strip()}; {prop}: {val}"
    new = DECL.sub(fix, src)
    if new != src: open(path, "w").write(new); print("fixed", path)
