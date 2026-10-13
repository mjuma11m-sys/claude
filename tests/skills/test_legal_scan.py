import json

from conftest import run

SCAN = "company-lawyer/scripts/legal_scan.py"


def scan(root):
    r = run(SCAN, root, "--json")
    return r.returncode, {(f["area"], f["item"]): f["level"] for f in json.loads(r.stdout)}


def test_bare_app_with_tracker_and_bank_data_is_red(tmp_path):
    (tmp_path / "index.html").write_text(
        '<script src="https://www.googletagmanager.com/gtag/js?id=G-1"></script>'
        '<p>الصق رسالة البنك</p><a href="https://instagram.com/x">ig</a>')
    code, f = scan(tmp_path)
    assert code == 1
    assert f[("policies", "Privacy policy page")] == "🔴"
    assert f[("rights", "Erase all data (PDPL right to erasure)")] == "🔴"
    assert f[("sensitive", "Handles financial data")] == "🔴"
    assert f[("trackers", "Google Tag Manager (www.googletagmanager.com)")] == "🔴"
    assert not any("instagram" in item for _, item in f), "tap-only links are not data flows"


def test_compliant_app_has_no_red(tmp_path):
    (tmp_path / "privacy.html").write_text("<h1>سياسة الخصوصية</h1>")
    (tmp_path / "app.js").write_text(
        "// احذف كل بياناتي · نسخة احتياطية · أوافق\nconst bank = 'رسالة البنك';\n"
        "fetch('https://fonts.googleapis.com/css2'); localStorage.setItem('a', 1);\n"
        "const url = 'https://xxxx.supabase.co'; // placeholder ignored\n")
    (tmp_path / "package-lock.json").write_text('{"x": "https://registry.npmjs.org/a"}')
    code, f = scan(tmp_path)
    assert code == 0
    assert f[("sensitive", "Handles financial data")] == "🟡"
    assert f[("third-party", "Requests to fonts.googleapis.com")] == "🟡"
    assert f[("transfer", "Supabase backend")] == "🟡"
    assert not any("npmjs" in item or "xxxx" in item for _, item in f)
