import importlib.util
import os
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
SKILLS = ROOT / ".claude" / "skills"


def load(rel):
    path = SKILLS / rel
    spec = importlib.util.spec_from_file_location(path.stem + "_under_test", path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def run(rel, *args, cwd=None):
    return subprocess.run([sys.executable, str(SKILLS / rel), *map(str, args)],
                          capture_output=True, text=True, cwd=cwd)


@pytest.fixture
def git_repo(tmp_path):
    subprocess.run(["git", "init", "-q", str(tmp_path)], check=True)
    return tmp_path


slow = pytest.mark.skipif(not os.environ.get("SKILLS_SLOW"), reason="set SKILLS_SLOW=1 to install deps and build")
