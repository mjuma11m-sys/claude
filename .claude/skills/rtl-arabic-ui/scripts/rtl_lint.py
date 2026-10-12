"""Find physical-direction Tailwind classes that break RTL and (optionally) fix them.

  python rtl_lint.py src/            # report file:line  old -> new
  python rtl_lint.py src/ --fix      # rewrite in place
Exit code 1 when issues remain (usable in CI / hooks).
"""
import re
import sys
from pathlib import Path

EXTS = {".tsx", ".jsx", ".ts", ".js", ".html", ".vue", ".svelte", ".astro"}
SKIP = {"node_modules", "dist", "build", ".next", ".git", "coverage"}

# (pattern, replacement). Anchored to class-token boundaries; keeps variants/negatives/values.
RULES = [
    (r"\b(-?)ml-", r"\1ms-"), (r"\b(-?)mr-", r"\1me-"),
    (r"\bpl-", "ps-"), (r"\bpr-", "pe-"),
    (r"\b(-?)left-", r"\1start-"), (r"\b(-?)right-", r"\1end-"),
    (r"\btext-left\b", "text-start"), (r"\btext-right\b", "text-end"),
    (r"\bfloat-left\b", "float-start"), (r"\bfloat-right\b", "float-end"),
    (r"\brounded-l\b", "rounded-s"), (r"\brounded-r\b", "rounded-e"),
    (r"\brounded-l-", "rounded-s-"), (r"\brounded-r-", "rounded-e-"),
    (r"\brounded-tl\b", "rounded-ss"), (r"\brounded-tr\b", "rounded-se"),
    (r"\brounded-bl\b", "rounded-es"), (r"\brounded-br\b", "rounded-ee"),
    (r"\brounded-tl-", "rounded-ss-"), (r"\brounded-tr-", "rounded-se-"),
    (r"\brounded-bl-", "rounded-es-"), (r"\brounded-br-", "rounded-ee-"),
    (r"\bborder-l\b", "border-s"), (r"\bborder-r\b", "border-e"),
    (r"\bborder-l-", "border-s-"), (r"\bborder-r-", "border-e-"),
    (r"\bscroll-ml-", "scroll-ms-"), (r"\bscroll-mr-", "scroll-me-"),
    (r"\bscroll-pl-", "scroll-ps-"), (r"\bscroll-pr-", "scroll-pe-"),
]
# Only touch string literals that look like class lists.
CLASS_ATTR = re.compile(r"""(class(?:Name)?\s*=\s*\{?\s*[`"'])([^`"']*)|((?:clsx|cn|cva|twMerge|classNames)\([^)]*)""")
# Skip rtl:/ltr: prefixed tokens (intentional physical overrides).
TOKEN = re.compile(r"(?<![\w:-])((?:[\w\[\]&-]+:)*)(-?[\w\[\].%/-]+)")


def fix_classes(text: str) -> str:
    def per_token(m):
        variants, cls = m.group(1), m.group(2)
        if "rtl:" in variants or "ltr:" in variants:
            return m.group(0)
        for pat, rep in RULES:
            new = re.sub(pat, rep, cls)
            if new != cls:
                return variants + new
        return m.group(0)
    return TOKEN.sub(per_token, text)


def process(path: Path, apply: bool):
    src = path.read_text(encoding="utf-8")
    issues = []

    def repl(m):
        start, body = (m.group(1), m.group(2)) if m.group(1) else ("", m.group(3))
        fixed = fix_classes(body)
        if fixed != body:
            line = src.count("\n", 0, m.start()) + 1
            for old, new in zip(body.split(), fixed.split()):
                if old != new:
                    issues.append((line, old, new))
        return start + fixed

    out = CLASS_ATTR.sub(repl, src)
    if apply and out != src:
        path.write_text(out, encoding="utf-8")
    return issues


def main(argv):
    if not argv:
        print(__doc__)
        return 2
    root, apply = Path(argv[0]), "--fix" in argv
    files = [root] if root.is_file() else [
        p for p in root.rglob("*") if p.suffix in EXTS and not SKIP & set(p.parts)]
    total = 0
    for f in sorted(files):
        for line, old, new in process(f, apply):
            total += 1
            print(f"{f}:{line}  {old} -> {new}")
    verb = "fixed" if apply else "found"
    print(f"\n{total} RTL issue(s) {verb}." + ("" if apply or not total else " Run with --fix to rewrite."))
    return 1 if total and not apply else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
