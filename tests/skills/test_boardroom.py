"""The boardroom animation template and every saved company meeting stay well-formed."""
import json
import re

import pytest

from conftest import ROOT, SKILLS

TEMPLATE = SKILLS / "diwaniya-company" / "assets" / "boardroom.html"
SESSIONS = sorted((ROOT / "videos" / "diwaniya-skill" / "sessions").glob("company-DW-*.html"))
MEMBERS = {"ceo", "cpo", "design", "cto", "qa", "cmo", "cfo", "legal", "coo", "owner"}
VERDICTS = {"approved", "rejected", "owner", "ok", "bad", "mid"}


def session(path):
    m = re.search(r'<script id="session" type="application/json">(.*?)</script>', path.read_text(encoding="utf-8"), re.S)
    assert m, "no session JSON"
    return json.loads(m.group(1))


def test_template_knows_every_member_and_colour():
    html = TEMPLATE.read_text(encoding="utf-8")
    for k in MEMBERS:
        assert f"{k}: [" in html, f"member {k} missing from ALL"
        assert html.count(f"--{k}:") >= 3, f"--{k} colour missing in light/dark"


@pytest.mark.parametrize("path", [TEMPLATE, *SESSIONS], ids=lambda p: p.name)
def test_meeting_json(path):
    s = session(path)
    assert len(s["rounds"]) == 7
    rounds = [st["r"] for st in s["steps"]]
    assert rounds == sorted(rounds), "steps must be in round order"
    assert all(0 <= r < 7 for r in rounds)
    for st in s["steps"]:
        if "who" in st:
            assert st["who"] in MEMBERS, st["who"]
            assert st.get("to", "ceo") in MEMBERS
            if "rows" in st:
                assert all(len(r) == len(st["head"]) for r in st["rows"])
        elif "verdict" in st:
            assert st["verdict"] in VERDICTS
        else:
            assert "summary" in st
    assert any("summary" in st for st in s["steps"])


def test_engine_matches_majlis():
    """Both pages share the same player; a fix in one must reach the other."""
    majlis = (SKILLS / "diwaniya" / "assets" / "majlis.html").read_text(encoding="utf-8")
    board = TEMPLATE.read_text(encoding="utf-8")
    for fn in ("function restart()", "function showAll()", "const waitPlay", "prefers-reduced-motion"):
        assert fn in majlis and fn in board, fn
