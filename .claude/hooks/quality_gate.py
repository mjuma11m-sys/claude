"""PostToolUse hook: instant quality feedback after Claude edits a file.

- .tsx/.jsx/.ts/.js/.html/.vue/.svelte in an RTL project -> rtl_lint on that file
- supabase/migrations/*.sql                               -> every created table has RLS enabled
Exit 2 + stderr sends the findings back to Claude; anything unexpected exits 0 (never blocks work).
"""
import json
import re
import sys
from pathlib import Path

SKILLS = Path(__file__).resolve().parents[1] / "skills"
UI_EXT = {".tsx", ".jsx", ".ts", ".js", ".html", ".vue", ".svelte", ".astro"}
SKIP = {"node_modules", "dist", "build", ".next", ".claude"}


def is_rtl_project(path: Path) -> bool:
    if 'dir="rtl"' in path.read_text(encoding="utf-8", errors="ignore"):
        return True
    for parent in path.parents:
        html = parent / "index.html"
        if html.exists():
            return 'dir="rtl"' in html.read_text(encoding="utf-8", errors="ignore")
        if (parent / ".git").exists():
            break
    return False


def check_rtl(path: Path):
    sys.path.insert(0, str(SKILLS / "rtl-arabic-ui" / "scripts"))
    import rtl_lint  # noqa: E402
    issues = rtl_lint.process(path, apply=False)
    return [f"{path}:{line}  {old} -> {new}" for line, old, new in issues]


def check_migration(path: Path):
    sql = "\n".join(f.read_text(errors="ignore") for f in sorted(path.parent.glob("*.sql"))).lower()
    tables = set(re.findall(r"create table (?:if not exists )?(?:public\.)?\"?(\w+)", path.read_text(errors="ignore").lower()))
    return [f"{path.name}: table `{t}` has no `alter table {t} enable row level security` + policies"
            for t in sorted(tables)
            if not re.search(rf"alter table (?:public\.)?\"?{t}\"? enable row level security", sql)]


def main():
    try:
        event = json.load(sys.stdin)
        raw = (event.get("tool_input") or {}).get("file_path")
        if not raw:
            return 0
        path = Path(raw)
        if not path.is_file() or SKIP & set(path.parts):
            return 0
        if path.suffix == ".sql" and path.parent.name == "migrations":
            problems, fix = check_migration(path), "Add RLS + per-operation policies (see supabase-schema skill)."
        elif path.suffix in UI_EXT and is_rtl_project(path):
            problems, fix = check_rtl(path), f"Use logical classes, or run: python {SKILLS}/rtl-arabic-ui/scripts/rtl_lint.py {path} --fix"
        else:
            return 0
    except Exception:
        return 0
    if not problems:
        return 0
    print("Quality gate:\n" + "\n".join(problems[:20]) + f"\n{fix}", file=sys.stderr)
    return 2


if __name__ == "__main__":
    sys.exit(main())
