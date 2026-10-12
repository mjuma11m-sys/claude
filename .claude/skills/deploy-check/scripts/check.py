"""Static pre-deploy checks for Flask / React (Vite) / Supabase projects.

  python check.py [project_dir]
Prints a table (✅ / ⚠️ / ❌) and exits 1 if any ❌.
"""
import json
import re
import subprocess
import sys
from pathlib import Path

SKIP = {".claude", "node_modules", ".git", "dist", "build", ".venv", "venv", "__pycache__", ".next"}
SECRET = re.compile(
    r"(sk_live_[0-9a-zA-Z]{10,}|sk-ant-[\w-]{20,}|AKIA[0-9A-Z]{16}|"
    r"eyJhbGciOi[\w-]{20,}\.[\w-]{20,}\.[\w-]{10,}|"
    r"(?i:service_role[\"'\s:=]+[\"']?eyJ)|-----BEGIN (?:RSA )?PRIVATE KEY-----)")
TEXT_EXT = {".py", ".js", ".jsx", ".ts", ".tsx", ".json", ".env", ".toml", ".yaml", ".yml", ".html", ".md", ".txt", ".cfg", ".ini"}

results = []


def add(status, item, fix=""):
    results.append((status, item, fix))


def files(root, pattern="*"):
    return [p for p in root.rglob(pattern) if p.is_file() and not SKIP & set(p.relative_to(root).parts)]


def git_tracked(root, path):
    r = subprocess.run(["git", "-C", str(root), "ls-files", "--error-unmatch", str(path)],
                       capture_output=True)
    return r.returncode == 0


def check_secrets(root):
    hits = []
    for f in files(root):
        if f.suffix not in TEXT_EXT and not f.name.startswith(".env"):
            continue
        if f.name == ".env.example" or f.stat().st_size > 2_000_000:
            continue
        try:
            for i, line in enumerate(f.read_text(encoding="utf-8", errors="ignore").splitlines(), 1):
                if SECRET.search(line):
                    hits.append(f"{f.relative_to(root)}:{i}")
        except OSError:
            pass
    tracked = [h for h in hits if git_tracked(root, h.split(":")[0])]
    if tracked:
        add("❌", "Secrets in tracked files", ", ".join(tracked[:5]) + " — move to env, rotate the key")
    elif hits:
        add("⚠️", "Secrets in untracked files", ", ".join(hits[:3]) + " — keep them out of git")
    else:
        add("✅", "No hard-coded secrets")

    envs = [f for f in root.glob("**/.env") if not SKIP & set(f.relative_to(root).parts)]
    bad = [str(e.relative_to(root)) for e in envs if git_tracked(root, e.relative_to(root))]
    add("❌" if bad else "✅", ".env not committed", ("git rm --cached " + " ".join(bad)) if bad else "")
    if envs and not any(root.glob("**/.env.example")):
        add("⚠️", ".env.example missing", "list every key (no values)")


def check_flask(root):
    reqs = files(root, "requirements*.txt")
    if not reqs:
        return
    text = "\n".join(r.read_text(errors="ignore") for r in reqs).lower()
    if "flask" not in text:
        return
    add("✅" if "gunicorn" in text else "❌", "gunicorn in requirements", "" if "gunicorn" in text else "add gunicorn")
    unpinned = [l for l in text.splitlines() if l.strip() and not l.startswith("#") and "==" not in l and not l.startswith("-")]
    add("⚠️" if unpinned else "✅", "Pinned Python deps", ("unpinned: " + ", ".join(unpinned[:5])) if unpinned else "")
    py = [f for f in files(root, "*.py")]
    debug = [f"{f.relative_to(root)}" for f in py if re.search(r"app\.run\([^)]*debug\s*=\s*True", f.read_text(errors="ignore"))
             and "__main__" not in f.read_text(errors="ignore")]
    add("❌" if debug else "✅", "No debug=True outside __main__", ", ".join(debug))
    health = any(re.search(r"""["']/(healthz?|health-check)["']""", f.read_text(errors="ignore")) for f in py)
    add("✅" if health else "⚠️", "Health check route", "" if health else "add GET /healthz returning 200")
    cors = [f for f in py if re.search(r"CORS\(\s*app\s*\)|origins\s*=\s*[\"']\*", f.read_text(errors="ignore"))]
    add("⚠️" if cors else "✅", "CORS restricted", ("wildcard in " + ", ".join(str(c.relative_to(root)) for c in cors)) if cors else "")
    proc = list(root.glob("Procfile")) + list(root.glob("render.yaml"))
    start = "\n".join(p.read_text(errors="ignore") for p in proc)
    if proc and "$PORT" not in start and "PORT" not in start:
        add("⚠️", "Start command binds $PORT", "gunicorn wsgi:app --bind 0.0.0.0:$PORT")
    if not (root / ".python-version").exists() and "PYTHON_VERSION" not in start:
        add("⚠️", "Python version pinned", "add .python-version (e.g. 3.12)")


def check_frontend(root):
    for pkg in files(root, "package.json"):
        base = pkg.parent
        try:
            data = json.loads(pkg.read_text())
        except ValueError:
            continue
        deps = {**data.get("dependencies", {}), **data.get("devDependencies", {})}
        name = str(base.relative_to(root)) or "."
        if "vite" in deps and ("react-router-dom" in deps or "react-router" in deps):
            vj = base / "vercel.json"
            ok = any(v.exists() and "rewrites" in v.read_text() for v in (vj, root / "vercel.json"))
            add("✅" if ok else "❌", f"[{name}] SPA rewrites for client routing",
                "" if ok else '{"rewrites":[{"source":"/(.*)","destination":"/index.html"}]}')
        if "build" not in data.get("scripts", {}):
            add("⚠️", f"[{name}] build script", "add scripts.build")
        src = [f for f in files(base) if f.suffix in {".ts", ".tsx", ".js", ".jsx"}
               and not re.search(r"(\.config\.|\.test\.|\.spec\.|/tests?/|/scripts/)", f.as_posix())]
        leaks = [str(f.relative_to(root)) for f in src if re.search(r"(VITE_|NEXT_PUBLIC_)\w*SERVICE_ROLE|service_role", f.read_text(errors="ignore"))]
        add("❌" if leaks else "✅", f"[{name}] no service_role in frontend", ", ".join(leaks[:3]))
        local = [str(f.relative_to(root)) for f in src if re.search(r"https?://(localhost|127\.0\.0\.1)", f.read_text(errors="ignore"))]
        add("⚠️" if local else "✅", f"[{name}] no hard-coded localhost", ", ".join(local[:3]) + (" — use VITE_API_URL" if local else ""))


def check_supabase(root):
    mig = root / "supabase" / "migrations"
    if not mig.exists():
        return
    sql = "\n".join(f.read_text(errors="ignore") for f in sorted(mig.glob("*.sql"))).lower()
    tables = set(re.findall(r"create table (?:if not exists )?(?:public\.)?\"?(\w+)", sql))
    no_rls = sorted(t for t in tables if not re.search(rf"alter table (?:public\.)?\"?{t}\"? enable row level security", sql))
    add("❌" if no_rls else "✅", "RLS enabled in migrations", ", ".join(no_rls))
    add("⚠️", "Migrations applied to prod?", "run: supabase migration list --linked")


def main():
    root = Path(sys.argv[1] if len(sys.argv) > 1 else ".").resolve()
    check_secrets(root)
    check_flask(root)
    check_frontend(root)
    check_supabase(root)
    w = max(len(r[1]) for r in results)
    for status, item, fix in results:
        print(f"{status}  {item.ljust(w)}  {fix}")
    fails = sum(r[0] == "❌" for r in results)
    print(f"\n{fails} blocking, {sum(r[0] == '⚠️' for r in results)} warnings")
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
