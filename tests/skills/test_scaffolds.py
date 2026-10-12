import json
import os
import py_compile
import subprocess
import sys

from conftest import run, slow


def test_flask_scaffold_compiles_and_is_idempotent(tmp_path):
    api = tmp_path / "api"
    assert run("flask-api/scripts/scaffold.py", api, "players", "match_events").returncode == 0
    for f in api.rglob("*.py"):
        py_compile.compile(str(f), doraise=True)
    init = (api / "app" / "__init__.py").read_text()
    assert 'url_prefix="/api/players"' in init and 'url_prefix="/api/match_events"' in init
    assert "class MatchEventCreate" in (api / "app" / "match_events" / "routes.py").read_text()
    (api / "wsgi.py").write_text("# edited\n")
    assert "skip" in run("flask-api/scripts/scaffold.py", api, "players").stdout
    assert (api / "wsgi.py").read_text() == "# edited\n"


def test_web_scaffold_files(tmp_path):
    web = tmp_path / "web"
    assert run("web-starter/scripts/scaffold.py", web, "--title", "نادي").returncode == 0
    pkg = json.loads((web / "package.json").read_text())
    assert all(v[0].isdigit() for v in {**pkg["dependencies"], **pkg["devDependencies"]}.values()), "pin exact versions"
    html = (web / "index.html").read_text()
    assert 'dir="rtl"' in html and "<title>نادي</title>" in html
    assert run("rtl-arabic-ui/scripts/rtl_lint.py", web / "src").returncode == 0


@slow
def test_flask_scaffold_own_tests(tmp_path):
    api = tmp_path / "api"
    run("flask-api/scripts/scaffold.py", api, "players", "teams")
    venv = tmp_path / "venv"
    subprocess.run([sys.executable, "-m", "venv", venv], check=True)
    subprocess.run([venv / "bin" / "pip", "install", "-q", "-r", api / "requirements.txt"], check=True)
    r = subprocess.run([venv / "bin" / "pytest", "-q", "-p", "no:cacheprovider"], cwd=api, capture_output=True, text=True)
    assert r.returncode == 0, r.stdout + r.stderr


@slow
def test_web_scaffold_builds(tmp_path):
    web = tmp_path / "web"
    run("web-starter/scripts/scaffold.py", web)
    env = {**os.environ, "VITE_SUPABASE_URL": "https://x.supabase.co", "VITE_SUPABASE_ANON_KEY": "x"}
    for cmd in (["npm", "install", "--no-audit", "--no-fund"], ["npm", "run", "build"]):
        r = subprocess.run(cmd, cwd=web, env=env, capture_output=True, text=True)
        assert r.returncode == 0, f"{cmd}: {r.stdout[-2000:]}{r.stderr[-2000:]}"
    assert "chunks are larger" not in r.stdout + r.stderr
    r = subprocess.run(["npm", "test"], cwd=web, env=env, capture_output=True, text=True)
    assert r.returncode == 0, r.stdout[-2000:]
