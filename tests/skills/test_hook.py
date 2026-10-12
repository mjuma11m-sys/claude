import json
import subprocess
import sys

from conftest import ROOT

HOOK = ROOT / ".claude" / "hooks" / "quality_gate.py"


def fire(file_path):
    event = {"tool_name": "Edit", "tool_input": {"file_path": str(file_path)}}
    return subprocess.run([sys.executable, HOOK], input=json.dumps(event), capture_output=True, text=True)


def test_rtl_project_issue_is_reported(tmp_path):
    (tmp_path / "index.html").write_text('<html dir="rtl"></html>')
    f = tmp_path / "src" / "A.tsx"
    f.parent.mkdir()
    f.write_text('<div className="ml-2 text-right" />')
    r = fire(f)
    assert r.returncode == 2
    assert "ml-2 -> ms-2" in r.stderr and "text-right -> text-end" in r.stderr


def test_clean_or_ltr_files_pass(tmp_path):
    (tmp_path / "index.html").write_text('<html lang="en"></html>')
    f = tmp_path / "A.tsx"
    f.write_text('<div className="ml-2" />')
    assert fire(f).returncode == 0
    (tmp_path / "index.html").write_text('<html dir="rtl"></html>')
    f.write_text('<div className="ms-2" />')
    assert fire(f).returncode == 0


def test_migration_without_rls(tmp_path):
    mig = tmp_path / "supabase" / "migrations"
    mig.mkdir(parents=True)
    f = mig / "1_init.sql"
    f.write_text("create table public.players (id uuid primary key);")
    r = fire(f)
    assert r.returncode == 2 and "players" in r.stderr
    f.write_text("create table public.players (id uuid primary key);\nalter table public.players enable row level security;")
    assert fire(f).returncode == 0


def test_never_blocks_on_bad_input():
    r = subprocess.run([sys.executable, HOOK], input="not json", capture_output=True, text=True)
    assert r.returncode == 0
    assert fire("/does/not/exist.tsx").returncode == 0
