#!/usr/bin/env bash
# يمسح الريبو وكل تاريخ git عن أسرار، ويفك أدوار JWT، ويشيّك .gitignore. ما يطبع قيم المفاتيح كاملة.
# الاستخدام: bash secrets.sh <repo>   (exit 1 لو لقى سر خطير)
set -u
R="${1:-.}"; cd "$R" || exit 2
bad=0
PAT='(sk-ant-[A-Za-z0-9_-]{10,}|sk_live_[A-Za-z0-9]{10,}|sk-[A-Za-z0-9]{32,}|re_[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|AIza[0-9A-Za-z_-]{35}|xox[bap]-[A-Za-z0-9-]{20,}|-----BEGIN [A-Z ]*PRIVATE KEY|postgres(ql)?://[^:@/ ]+:[^@/ ]+@[A-Za-z0-9.-]+)'

echo "== 1) أسرار بالملفات الحالية + كل تاريخ git"
hits=$( { git grep -IhoE "$PAT" 2>/dev/null; git log --all -p 2>/dev/null | grep -oE "$PAT"; } | sort -u)
local_db=$(echo "$hits" | grep -E '@(localhost|127\.0\.0\.1|db)$' ); real=$(echo "$hits" | grep -vE '@(localhost|127\.0\.0\.1|db)$' | grep -v '^$')
[ -n "$local_db" ] && echo "$local_db" | sed -E 's#(://[^:]+:)[^@]+@#\1***@#; s/$/ ⚠️ قاعدة محلية (مو سر حقيقي غالباً)/'
if [ -n "$real" ]; then bad=1; echo "$real" | sed -E 's/(.{12}).*/\1… ❌/'; elif [ -z "$local_db" ]; then echo "✅ ولا سر معروف"; fi

echo "== 2) JWT (مفاتيح Supabase وغيرها): وش دور كل واحد"
{ git grep -IhoE 'eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}' 2>/dev/null; git log --all -p 2>/dev/null | grep -oE 'eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}'; } | sort -u | while read -r t; do
  p=$(echo "$t" | cut -d. -f2 | tr '_-' '/+'); while [ $(( ${#p} % 4 )) -ne 0 ]; do p="$p="; done
  pl=$(echo "$p" | base64 -d 2>/dev/null); role=$(echo "$pl" | grep -oE '"role":"[^"]+"' | cut -d'"' -f4); ref=$(echo "$pl" | grep -oE '"ref":"[^"]+"' | cut -d'"' -f4)
  case "$role" in
    anon|authenticated) echo "✅ ${t:0:16}… role=$role ref=${ref:-?} (عام، مسموح لو RLS شغّال)";;
    service_role) if [ -n "$ref" ]; then echo "❌ ${t:0:16}… role=service_role ref=$ref — يتجاوز RLS. دوّره فوراً من Supabase ← API"; touch .sa_bad
      else echo "⚠️ ${t:0:16}… role=service_role بدون ref (غالباً fixture اختبار أو مفتاح محلي). تأكد: git log --all -S'${t:0:30}'"; fi;;
    *) echo "⚠️ ${t:0:16}… role=${role:-?} — شيّكه";;
  esac
done
[ -f .sa_bad ] && { bad=1; rm -f .sa_bad; }

echo "== 3) ملفات حساسة مرفوعة"
f=$(git ls-files | grep -iE '(^|/)\.env($|\.)|\.pem$|\.p8$|\.p12$|\.jks$|\.keystore$|credentials|service-account|GoogleService-Info|google-services\.json' | grep -viE '\.env\.example$|\.env\.sample$')
if [ -n "$f" ]; then echo "$f" | sed 's/$/ ⚠️/'; else echo "✅ ولا ملف"; fi

echo "== 4) .gitignore"
for p in .env '*.jks' '*.keystore' '*.p8'; do
  if git check-ignore -q --no-index "$p" 2>/dev/null || git check-ignore -q --no-index "x/$p" 2>/dev/null; then echo "✅ $p متجاهل"; else echo "⚠️ $p مو بـ .gitignore"; fi
done

echo "== 5) مفاتيح بأسماء عامة (تنزل للمتصفح وقت البناء)"
git grep -IhoE '(VITE|NEXT_PUBLIC|REACT_APP|EXPO_PUBLIC)_[A-Z0-9_]*(SECRET|SERVICE|PRIVATE|TOKEN)[A-Z0-9_]*' 2>/dev/null | sort -u | sed 's/$/ ❌ اسم عام لسر/' || true
exit $bad
