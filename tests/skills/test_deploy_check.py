import subprocess

from conftest import run

CHECK = "deploy-check/scripts/check.py"


def make_broken(root):
    (root / "web" / "src").mkdir(parents=True)
    (root / "supabase" / "migrations").mkdir(parents=True)
    (root / "requirements.txt").write_text("flask\npydantic==2.9.2\n")
    (root / "app.py").write_text("from flask import Flask\nfrom flask_cors import CORS\napp = Flask(__name__)\nCORS(app)\napp.run(debug=True)\n")
    (root / ".env").write_text("KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.abcdefghijklmnopqrst\n")
    (root / "web" / "package.json").write_text('{"dependencies":{"react-router":"7"},"devDependencies":{"vite":"8"},"scripts":{"build":"vite build"}}')
    (root / "web" / "src" / "api.js").write_text('const k = import.meta.env.VITE_SUPABASE_SERVICE_ROLE; fetch("http://localhost:5000")')
    (root / "supabase" / "migrations" / "1.sql").write_text("create table items(id int); create table ok(id int); alter table ok enable row level security;")
    subprocess.run(["git", "-C", str(root), "add", "-A"], check=True)


def test_broken_project_blocks(git_repo):
    make_broken(git_repo)
    r = run(CHECK, git_repo)
    assert r.returncode == 1
    for needle in ["Secrets in tracked files", "git rm --cached .env", "add gunicorn", "SPA rewrites",
                   "web/src/api.js", "items"]:
        assert needle in r.stdout, needle
    assert "7 blocking" in r.stdout, r.stdout


def test_flask_scaffold_passes(git_repo):
    assert run("flask-api/scripts/scaffold.py", git_repo / "api", "players").returncode == 0
    r = run(CHECK, git_repo / "api")
    assert r.returncode == 0 and "0 blocking, 0 warnings" in r.stdout, r.stdout


def test_web_scaffold_passes(git_repo):
    assert run("web-starter/scripts/scaffold.py", git_repo / "web").returncode == 0
    r = run(CHECK, git_repo / "web")
    assert r.returncode == 0 and "0 blocking, 0 warnings" in r.stdout, r.stdout
