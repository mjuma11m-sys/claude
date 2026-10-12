"""Every skill is well-formed and every script it mentions exists."""
import re

import pytest

from conftest import SKILLS

SKILL_DIRS = sorted(p.parent for p in SKILLS.glob("*/SKILL.md"))


@pytest.mark.parametrize("skill", SKILL_DIRS, ids=lambda p: p.name)
def test_frontmatter(skill):
    text = (skill / "SKILL.md").read_text(encoding="utf-8")
    m = re.match(r"^---\n(.*?)\n---\n", text, re.S)
    assert m, "missing YAML frontmatter"
    fields = dict(line.split(":", 1) for line in m.group(1).splitlines() if ":" in line and not line.startswith(" "))
    assert fields.get("name", "").strip() == skill.name
    assert len(fields.get("description", "").strip()) >= 40


@pytest.mark.parametrize("skill", SKILL_DIRS, ids=lambda p: p.name)
def test_referenced_scripts_exist(skill):
    text = (skill / "SKILL.md").read_text(encoding="utf-8")
    refs = re.findall(r"\.claude/skills/([\w-]+/scripts/[\w./-]+\.(?:py|sql|sh|mjs|js))", text)
    refs += re.findall(r"\$S/([\w-]+/scripts/[\w./-]+\.(?:py|sql|sh))", text)
    for ref in set(refs):
        assert (SKILLS / ref).exists(), ref


def test_skill_index_names_exist():
    text = (SKILLS / "skill-index" / "SKILL.md").read_text(encoding="utf-8")
    known = {p.name for p in SKILL_DIRS}
    hyphenated = set(re.findall(r"`([a-z0-9]+(?:-[a-z0-9]+)+)`", text))
    missing = sorted(n for n in hyphenated if n not in known)
    assert not missing, f"skill-index mentions unknown skills: {missing}"
