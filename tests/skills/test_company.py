import json

from conftest import run

CO = "diwaniya-company/scripts/company.py"


def co(root, *args):
    return run(CO, "--root", root, *args)


def test_full_lifecycle(tmp_path):
    assert "Founded" in co(tmp_path, "init", "--name", "أكاديمية").stdout
    assert "already exists" in co(tmp_path, "init").stdout
    assert co(tmp_path, "ticket", "نظام حضور", "--priority", "P1").stdout.strip() == "DW-001"
    assert co(tmp_path, "ticket", "ريل إطلاق", "--owner", "CMO").stdout.strip() == "DW-002"

    r = co(tmp_path, "decide", "DW-001", "Flask + Supabase", "--by", "CTO", "--why", "أسرع | أرخص")
    assert r.returncode == 0
    base = tmp_path / "docs" / "company"
    assert "| DW-001 | Flask + Supabase | CTO | أسرع \\| أرخص |" in (base / "DECISIONS.md").read_text()
    ticket = (base / "tickets" / "DW-001.md").read_text()
    assert ticket.index("**CTO:** Flask + Supabase") < ticket.index("## خطة التنفيذ")

    co(tmp_path, "status", "DW-002", "blocked")
    co(tmp_path, "status", "DW-001", "done")
    assert co(tmp_path, "list", "--open").stdout.splitlines() == ["DW-002  P2  blocked     CMO    ريل إطلاق"]

    report = co(tmp_path, "report").stdout
    assert "| 0 | 0 | 1 | 0 | 1 | 0 |" in report
    assert "**DW-002** ريل إطلاق (CMO)" in report.split("## المفتوحة")[0]

    state = json.loads((base / "company.json").read_text())
    assert state["next"] == 3 and state["tickets"]["DW-001"]["status"] == "done"


def test_errors(tmp_path):
    assert co(tmp_path, "list").returncode != 0
    co(tmp_path, "init")
    assert co(tmp_path, "decide", "DW-404", "x").returncode != 0
    assert co(tmp_path, "ticket", "x", "--owner", "Intern").returncode != 0
    assert co(tmp_path, "status", "DW-001", "maybe").returncode != 0
