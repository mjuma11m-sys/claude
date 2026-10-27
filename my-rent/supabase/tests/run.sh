#!/usr/bin/env bash
# يشغّل الـ migration واختبار RLS على Postgres محلي: PGHOST=… PGPORT=… bash supabase/tests/run.sh
set -euo pipefail
cd "$(dirname "$0")/.."
DB=idarati_rls_test
psql -U postgres -q -c "drop database if exists $DB" -c "create database $DB"
psql -U postgres -q -v ON_ERROR_STOP=1 -d $DB -f tests/stub.sql 2>/dev/null
psql -U postgres -q -v ON_ERROR_STOP=1 -d $DB -f migrations/20261015000000_family_sync.sql
psql -U postgres -q -v ON_ERROR_STOP=1 -d $DB -f migrations/20261015010000_one_space_per_account.sql
psql -U postgres -q -v ON_ERROR_STOP=1 -d $DB -f migrations/20261016000000_family_roles.sql
psql -U postgres -q -v ON_ERROR_STOP=1 -d $DB -f migrations/20261016010000_contracts_editors.sql
psql -U postgres -q -v ON_ERROR_STOP=1 -d $DB -f migrations/20261023000000_account_deletion.sql
psql -U postgres -q -v ON_ERROR_STOP=1 -d $DB -f migrations/20261027000000_mfa_aal2.sql
psql -U postgres -q -v ON_ERROR_STOP=1 -d $DB -f tests/rls.sql 2>&1 | grep -oE "(PASS|FAIL): .*"
psql -U postgres -q -v ON_ERROR_STOP=1 -d $DB -f tests/roles.sql 2>&1 | grep -oE "(PASS|FAIL): .*|ERROR.*"
psql -U postgres -q -v ON_ERROR_STOP=1 -d $DB -f tests/account.sql 2>&1 | grep -oE "(PASS|FAIL): .*|ERROR.*"
psql -U postgres -q -v ON_ERROR_STOP=1 -d $DB -f tests/mfa.sql 2>&1 | grep -oE "(PASS|FAIL): .*|ERROR.*"
