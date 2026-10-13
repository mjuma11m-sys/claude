"""Legal/compliance scan of a web or app project (Bahrain PDPL-oriented). Static, read-only.

  python legal_scan.py <project_dir> [--json]
Reports what the lawyer needs to see: policy pages, consent, user rights (export/delete),
third-party domains the app talks to (possible cross-border transfer), trackers, sensitive data.
Exit 1 if any 🔴 finding.
"""
import json
import re
import sys
from pathlib import Path
from urllib.parse import urlparse

SKIP = {"node_modules", ".git", "dist", "build", "ios", "android", "www", "tests", "test-results",
        "playwright-report", "coverage", ".next", "store", "brand", "scripts"}
CODE_EXT = {".js", ".jsx", ".ts", ".tsx", ".html", ".vue", ".svelte", ".py", ".json"}
TRACKERS = {
    "google-analytics.com": "Google Analytics", "googletagmanager.com": "Google Tag Manager",
    "connect.facebook.net": "Meta Pixel", "hotjar.com": "Hotjar", "mixpanel.com": "Mixpanel",
    "segment.com": "Segment", "clarity.ms": "Microsoft Clarity", "doubleclick.net": "DoubleClick",
    "tiktok.com/i18n/pixel": "TikTok Pixel", "sentry.io": "Sentry (error data)",
}
# Links people tap (not data flows) — reported separately.
LINK_ONLY = re.compile(r"(instagram\.com|ig\.me|wa\.me|youtube\.com/results|twitter\.com|x\.com|apps\.apple\.com|play\.google\.com)")
SENSITIVE = {
    "financial": r"(bank|iban|card|benefitpay|رسال[ةه] (?:ال)?بنك|بطاق|حساب بنكي|salary|راتب)",
    "health": r"(heart ?rate|hrv|sleep|نبض|نوم|health|صح[ةه])",
    "national_id": r"(\bcpr\b|national id|الرقم الشخصي|هوية)",
    "location": r"(geolocation|getCurrentPosition|latitude|موقعك)",
    "children": r"(\bkids?\b|children|أطفال|طفل|under ?13)",
}


def files(root):
    for p in root.rglob("*"):
        if (p.is_file() and p.suffix in CODE_EXT and not SKIP & set(p.relative_to(root).parts)
                and p.name not in {"package.json", "package-lock.json", "composer.lock"} and p.stat().st_size < 3_000_000):
            yield p


def scan(root: Path):
    texts = {p: p.read_text(encoding="utf-8", errors="ignore") for p in files(root)}
    blob = "\n".join(texts.values())
    names = {p.name.lower() for p in texts}
    findings = []

    def add(level, area, item, fix=""):
        findings.append({"level": level, "area": area, "item": item, "fix": fix})

    # 1. Policies
    privacy = any(re.search(r"privacy|خصوصي", n) for n in names) or re.search(r"href=[\"'][^\"']*privacy", blob)
    add("✅" if privacy else "🔴", "policies", "Privacy policy page", "" if privacy else "Write privacy.html (AR/EN): what, where, how long, rights, contact")
    terms = any(re.search(r"terms|tos|شروط", n) for n in names) or re.search(r"href=[\"'][^\"']*(terms|tos)", blob)
    add("✅" if terms else "🟡", "policies", "Terms of use page", "" if terms else "Add terms.html: beta disclaimer, no financial/medical advice, liability cap, governing law (Bahrain)")

    # 2. Rights & consent
    delete = re.search(r"(delete (all|my|account)|احذف كل|حذف الحساب|wipe)", blob, re.I)
    add("✅" if delete else "🔴", "rights", "Erase all data (PDPL right to erasure)", "" if delete else "Add «احذف كل بياناتي» in settings")
    export = re.search(r"(export|backup|download.*data|نسخة احتياطية|تصدير)", blob, re.I)
    add("✅" if export else "🟡", "rights", "Export own data (right of access)", "" if export else "Add a JSON/CSV export")
    consent = re.search(r"(consent|أوافق|موافقت)", blob, re.I)

    # 3. Sensitive categories
    hits = [k for k, rx in SENSITIVE.items() if re.search(rx, blob, re.I)]
    for k in hits:
        level = "🟡" if consent else "🔴"
        add(level, "sensitive", f"Handles {k.replace('_', ' ')} data",
            "Explicit consent before first use + say it in the privacy policy" if not consent else "Consent text found — confirm it covers this category")

    # 4. Third parties / cross-border
    domains = {}
    for p, t in texts.items():
        for url in re.findall(r"https?://[^\s\"'`<>)]+", t):
            host = urlparse(url).hostname or ""
            if (not host or "." not in host or not host.isascii() or host in {"localhost", "127.0.0.1"}
                    or host.endswith(".test") or re.search(r"(w3\.org|example|xxxx|your-|<)", host)):
                continue
            if LINK_ONLY.search(url):
                continue
            domains.setdefault(host, set()).add(str(p.relative_to(root)))
    for host, where in sorted(domains.items()):
        tracker = next((name for d, name in TRACKERS.items() if d.split("/")[0] in host), None)
        if tracker:
            add("🔴", "trackers", f"{tracker} ({host})", "Disclose + consent banner, or remove")
        else:
            add("🟡", "third-party", f"Requests to {host}", f"Cross-border transfer? List in privacy policy · {', '.join(sorted(where)[:2])}")

    # 5. Storage & backend
    if re.search(r"supabase", blob, re.I):
        add("🟡", "transfer", "Supabase backend", "Pick the closest region (Middle East if available, else EU) and name the country in the policy; PDPL limits transfers outside Bahrain")
    if re.search(r"localStorage|indexedDB", blob):
        add("✅", "storage", "On-device storage (localStorage/IndexedDB)", "Say it in the policy; no cookie banner needed if nothing is sent to third parties")
    contact = re.search(r"(mailto:|ig\.me/|instagram\.com/|wa\.me/|تواصل|contact)", blob, re.I)
    add("✅" if contact else "🟡", "policies", "Contact channel for data requests", "" if contact else "Add an email or channel for privacy requests")
    return findings


def main(argv):
    if not argv:
        print(__doc__)
        return 2
    root = Path(argv[0]).resolve()
    findings = scan(root)
    if "--json" in argv:
        print(json.dumps(findings, ensure_ascii=False, indent=2))
    else:
        w = max(len(f["item"]) for f in findings)
        for f in findings:
            print(f"{f['level']}  {f['area']:<11} {f['item'].ljust(w)}  {f['fix']}")
        reds = sum(f["level"] == "🔴" for f in findings)
        print(f"\n{reds} 🔴 · {sum(f['level'] == '🟡' for f in findings)} 🟡 · {sum(f['level'] == '✅' for f in findings)} ✅")
    return 1 if any(f["level"] == "🔴" for f in findings) else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
