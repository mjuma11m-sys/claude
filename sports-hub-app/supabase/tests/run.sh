#!/usr/bin/env bash
# Runs the migrations + RLS attack tests on a throwaway database.
# Usage: PGHOST=… PGPORT=… PGUSER=postgres supabase/tests/run.sh
set -euo pipefail
cd "$(dirname "$0")/.."
DB="sh_rls_$$"
createdb "$DB"
trap 'dropdb --if-exists "$DB"' EXIT
psql -qX -v ON_ERROR_STOP=1 -d "$DB" -f tests/stub_auth.sql
for f in migrations/*.sql; do psql -qX -v ON_ERROR_STOP=1 -d "$DB" -f "$f"; done
psql -qX -v ON_ERROR_STOP=1 -d "$DB" -f tests/rls.test.sql 2>&1 | sed -n 's/.*NOTICE:  //p; s/.*ERROR:  //p'
echo "RLS: all checks passed"
