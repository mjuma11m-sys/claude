from conftest import load, run

lint = load("rtl-arabic-ui/scripts/rtl_lint.py")
LINT = "rtl-arabic-ui/scripts/rtl_lint.py"

SRC = '''export const A = () => (
  <div className="ml-4 pr-2 md:text-left -mr-1 rtl:left-0 ltr:ml-2 rounded-tl-lg border-r hover:pl-3 mx-2">
    <span className={cn("mr-auto", open && "right-0")}>x</span>
    <p>margin-left in prose stays, so does copyright-2024</p>
  </div>
)
'''

EXPECTED = '''export const A = () => (
  <div className="ms-4 pe-2 md:text-start -me-1 rtl:left-0 ltr:ml-2 rounded-ss-lg border-e hover:ps-3 mx-2">
    <span className={cn("me-auto", open && "end-0")}>x</span>
    <p>margin-left in prose stays, so does copyright-2024</p>
  </div>
)
'''


def test_fix_classes_keeps_variants_and_overrides():
    assert lint.fix_classes("sm:ml-2 rtl:mr-2 -left-4 text-right") == "sm:ms-2 rtl:mr-2 -start-4 text-end"


def test_report_then_fix(tmp_path):
    f = tmp_path / "A.tsx"
    f.write_text(SRC)
    r = run(LINT, tmp_path)
    assert r.returncode == 1 and "9 RTL issue(s) found" in r.stdout, r.stdout
    assert f.read_text() == SRC, "report mode must not modify files"
    assert run(LINT, tmp_path, "--fix").returncode == 0
    assert f.read_text() == EXPECTED
    assert run(LINT, tmp_path).returncode == 0


def test_skips_node_modules(tmp_path):
    (tmp_path / "node_modules" / "x").mkdir(parents=True)
    (tmp_path / "node_modules" / "x" / "a.jsx").write_text('<i className="ml-2" />')
    assert run(LINT, tmp_path).returncode == 0
