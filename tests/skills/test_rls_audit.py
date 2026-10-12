"""Runs only with DATABASE_URL pointing at a disposable Postgres (CI service)."""
import os
import subprocess

import pytest

from conftest import SKILLS

DB = os.environ.get("DATABASE_URL")
pytestmark = pytest.mark.skipif(not DB, reason="needs DATABASE_URL")

FIXTURE = """
drop schema if exists public cascade; create schema public;
drop schema if exists auth cascade; create schema auth;
create function auth.uid() returns uuid language sql as $$ select null::uuid $$;
do $$ begin create role authenticated; exception when duplicate_object then null; end $$;
create table public.owners (id uuid primary key);
create table public.items (id uuid primary key, owner_id uuid references owners(id), price double precision);
alter table public.items enable row level security;
create policy p1 on public.items for select to authenticated using (auth.uid() = owner_id);
create policy p2 on public.items for insert to authenticated with check (true);
create table public.good (id uuid primary key, owner_id uuid references owners(id), price numeric(12,3));
create index on public.good(owner_id);
alter table public.good enable row level security;
create policy g1 on public.good for select to authenticated using ((select auth.uid()) = owner_id);
create table public.locked (id int primary key);
alter table public.locked enable row level security;
create function public.danger() returns int language sql security definer as $$ select 1 $$;
"""


def psql(sql=None, file=None):
    cmd = ["psql", DB, "-v", "ON_ERROR_STOP=1", "-tAF", "|"]
    cmd += ["-f", str(file)] if file else ["-c", sql]
    r = subprocess.run(cmd, capture_output=True, text=True)
    assert r.returncode == 0, r.stderr
    return r.stdout


def test_audit_finds_every_issue_and_nothing_else():
    psql(FIXTURE)
    out = psql(file=SKILLS / "supabase-schema/scripts/rls_audit.sql")
    rows = {tuple(line.split("|")[:2]) for line in out.splitlines() if line}
    assert rows == {
        ("definer_function_risk", "danger"),
        ("fk_without_index", "items"),
        ("float_money", "items.price"),
        ("policy_always_true", "items.p2"),
        ("policy_uid_not_wrapped", "items.p1"),
        ("rls_disabled", "owners"),
        ("rls_no_policies", "locked"),
    }
