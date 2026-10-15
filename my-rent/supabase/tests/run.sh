#!/usr/bin/env bash
# يشغّل الـ migration واختبار RLS على Postgres محلي: PGHOST=… PGPORT=… bash supabase/tests/run.sh
set -euo pipefail
cd "$(dirname "$0")/.."
DB=idarati_rls_test
psql -U postgres -q -c "drop database if exists $DB" -c "create database $DB"
psql -U postgres -q -v ON_ERROR_STOP=1 -d $DB -f tests/stub.sql 2>/dev/null
psql -U postgres -q -v ON_ERROR_STOP=1 -d $DB -f migrations/20261015000000_family_sync.sql
psql -U postgres -q -v ON_ERROR_STOP=1 -d $DB -f tests/rls.sql 2>&1 | grep -oE "(PASS|FAIL): .*"
