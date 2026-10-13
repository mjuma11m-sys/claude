"""Company records for the diwaniya-company skill: tickets, decisions, and a board report.

Stored in <project>/docs/company/ so the company's memory lives with the project and in git.

  python company.py init [--name "اسم الشركة"]
  python company.py ticket "عنوان الطلب" [--owner CEO] [--priority P1]   -> prints DW-001
  python company.py decide DW-001 "القرار" --by CEO [--why "السبب"]
  python company.py status DW-001 in_progress|blocked|review|done
  python company.py list [--open]
  python company.py report                                              -> board summary (markdown)
All commands accept --root <project_dir> (default: current directory).
"""
import argparse
import datetime as dt
import json
import re
import sys
from pathlib import Path

STATUSES = ("new", "in_progress", "blocked", "review", "done", "rejected")
PRIORITIES = ("P0", "P1", "P2", "P3")
DEPARTMENTS = ("CEO", "CPO", "CTO", "Design", "QA", "CMO", "CFO", "Legal", "COO")


def today():
    return dt.date.today().isoformat()


class Company:
    def __init__(self, root: Path):
        self.dir = root / "docs" / "company"
        self.state_file = self.dir / "company.json"
        self.decisions_file = self.dir / "DECISIONS.md"

    # storage -----------------------------------------------------------
    def load(self):
        if not self.state_file.exists():
            raise SystemExit("No company here. Run: company.py init")
        return json.loads(self.state_file.read_text(encoding="utf-8"))

    def save(self, state):
        self.state_file.write_text(json.dumps(state, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    def ticket_path(self, tid):
        return self.dir / "tickets" / f"{tid}.md"

    # commands ----------------------------------------------------------
    def init(self, name):
        (self.dir / "tickets").mkdir(parents=True, exist_ok=True)
        if self.state_file.exists():
            return f"Company already exists: {self.load()['name']}"
        self.save({"name": name, "founded": today(), "next": 1, "tickets": {}})
        self.decisions_file.write_text(
            f"# سجل القرارات — {name}\n\n| التاريخ | التذكرة | القرار | صاحب القرار | السبب |\n|---|---|---|---|---|\n",
            encoding="utf-8")
        return f"Founded {name} in {self.dir}"

    def ticket(self, title, owner, priority):
        state = self.load()
        tid = f"DW-{state['next']:03d}"
        state["next"] += 1
        state["tickets"][tid] = {"title": title, "owner": owner, "priority": priority,
                                 "status": "new", "opened": today(), "updated": today()}
        self.save(state)
        self.ticket_path(tid).write_text(
            f"# {tid} · {title}\n\n"
            f"- **الأولوية:** {priority} · **المسؤول:** {owner} · **فُتحت:** {today()}\n\n"
            "## الموجز (CEO)\n\n## تقارير الأقسام\n\n## القرارات\n\n## خطة التنفيذ\n\n## التسليم والتحقق\n",
            encoding="utf-8")
        return tid

    def decide(self, tid, decision, by, why):
        state = self.load()
        if tid not in state["tickets"]:
            raise SystemExit(f"Unknown ticket {tid}")
        clean = lambda s: s.replace("|", "\\|").replace("\n", " ")
        with self.decisions_file.open("a", encoding="utf-8") as f:
            f.write(f"| {today()} | {tid} | {clean(decision)} | {by} | {clean(why or '—')} |\n")
        path = self.ticket_path(tid)
        text = path.read_text(encoding="utf-8")
        line = f"- {today()} · **{by}:** {decision}" + (f" — {why}" if why else "") + "\n"
        text = text.replace("## خطة التنفيذ", line + "\n## خطة التنفيذ", 1) if "## خطة التنفيذ" in text else text + line
        path.write_text(text, encoding="utf-8")
        state["tickets"][tid]["updated"] = today()
        self.save(state)
        return f"{tid}: decision recorded"

    def status(self, tid, status):
        state = self.load()
        if tid not in state["tickets"]:
            raise SystemExit(f"Unknown ticket {tid}")
        state["tickets"][tid].update(status=status, updated=today())
        self.save(state)
        return f"{tid} → {status}"

    def list(self, open_only):
        rows = [(tid, t) for tid, t in self.load()["tickets"].items()
                if not open_only or t["status"] not in ("done", "rejected")]
        rows.sort(key=lambda r: (r[1]["priority"], r[0]))
        return "\n".join(f"{tid}  {t['priority']}  {t['status']:<11} {t['owner']:<6} {t['title']}" for tid, t in rows) or "No tickets."

    def report(self):
        state = self.load()
        tickets = state["tickets"]
        counts = {s: sum(t["status"] == s for t in tickets.values()) for s in STATUSES}
        open_ = sorted(((tid, t) for tid, t in tickets.items() if t["status"] not in ("done", "rejected")),
                       key=lambda r: (r[1]["priority"], r[0]))
        recent = []
        if self.decisions_file.exists():
            recent = [l for l in self.decisions_file.read_text(encoding="utf-8").splitlines()
                      if re.match(r"\| \d{4}-", l)][-5:]
        out = [f"# تقرير مجلس الإدارة — {state['name']} · {today()}", "",
               "| جديدة | قيد التنفيذ | متوقفة | مراجعة | منجزة | مرفوضة |", "|---|---|---|---|---|---|",
               "| " + " | ".join(str(counts[s]) for s in STATUSES) + " |", ""]
        blocked = [f"- **{tid}** {t['title']} ({t['owner']})" for tid, t in open_ if t["status"] == "blocked"]
        out += ["## ⛔ تحتاج قرارك", *(blocked or ["- لا شي"]), ""]
        out += ["## المفتوحة", *([f"- {tid} · {t['priority']} · {t['status']} · {t['owner']} — {t['title']}" for tid, t in open_] or ["- لا شي"]), ""]
        out += ["## آخر القرارات", "| التاريخ | التذكرة | القرار | صاحب القرار | السبب |", "|---|---|---|---|---|", *recent]
        return "\n".join(out)


def main(argv=None):
    p = argparse.ArgumentParser(description="diwaniya-company records")
    p.add_argument("--root", default=".")
    sub = p.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("init"); s.add_argument("--name", default="شركة الديوانية")
    s = sub.add_parser("ticket"); s.add_argument("title"); s.add_argument("--owner", default="CEO", choices=DEPARTMENTS)
    s.add_argument("--priority", default="P2", choices=PRIORITIES)
    s = sub.add_parser("decide"); s.add_argument("tid"); s.add_argument("decision")
    s.add_argument("--by", default="CEO", choices=DEPARTMENTS + ("Owner",)); s.add_argument("--why", default="")
    s = sub.add_parser("status"); s.add_argument("tid"); s.add_argument("status", choices=STATUSES)
    s = sub.add_parser("list"); s.add_argument("--open", action="store_true")
    sub.add_parser("report")
    a = p.parse_args(argv)
    c = Company(Path(a.root))
    result = {
        "init": lambda: c.init(a.name),
        "ticket": lambda: c.ticket(a.title, a.owner, a.priority),
        "decide": lambda: c.decide(a.tid, a.decision, a.by, a.why),
        "status": lambda: c.status(a.tid, a.status),
        "list": lambda: c.list(a.open),
        "report": c.report,
    }[a.cmd]()
    print(result)
    return 0


if __name__ == "__main__":
    sys.exit(main())
