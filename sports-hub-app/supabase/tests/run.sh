#!/usr/bin/env bash
# Runs the migrations + RLS attack tests on a throwaway database.
# Usage: PGHOST=… PGPORT=… PGUSER=postgres supabase/tests/run.sh
set -euo pipefail
cd "$(dirname "$0")/.."
# setup.sql must match the migrations it bundles
cp setup.sql /tmp/sh_setup_before.sql && ./bundle.sh && diff -q /tmp/sh_setup_before.sql setup.sql >/dev/null || { echo "setup.sql was stale: regenerated, commit it"; }
DB="sh_rls_$$"
createdb "$DB"
trap 'dropdb --if-exists "$DB"' EXIT
psql -qX -v ON_ERROR_STOP=1 -d "$DB" -f tests/stub_auth.sql
for f in migrations/*.sql; do psql -qX -v ON_ERROR_STOP=1 -d "$DB" -f "$f"; done
run() { psql -qX -v ON_ERROR_STOP=1 -d "$DB" -f "$1" 2>&1 | sed -n 's/.*NOTICE:  //p; s/.*ERROR:  //p'; }
run tests/rls.test.sql
psql -qX -v ON_ERROR_STOP=1 -d "$DB" -f seed_demo.sql
run tests/fan_zone.test.sql
run tests/club_federation.test.sql
run tests/data_center.test.sql
run tests/lineup.test.sql
run tests/attendance.test.sql
run tests/match_reports.test.sql
run tests/development.test.sql
run tests/player_rights.test.sql
run tests/audit_log.test.sql
run tests/admin_provision.test.sql
echo "RLS: all checks passed"
