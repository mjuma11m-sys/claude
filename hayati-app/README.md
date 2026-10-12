# حياتي (Hayati)

Personal life-OS PWA: expenses, budgets, bank/BenefitPay SMS parsing, study schedule, GPA, gym program, health, tasks, prayer times.

- Live: https://claude.ai/artifact/JzeqtXVSutJGoi69eRK1d2
- Source snapshot pulled from artifact version `1791724043-f44e`.
- Data is **not** in this repo — it lives in the artifact's `db` (per Claude user), or Supabase if `config.js` is filled.

| File | Role |
|---|---|
| `index.html` | Shell, styles, script order |
| `store.js` | Local state + sync (Claude artifact db → Supabase fallback) |
| `sms.js` | Bank/BenefitPay message parser (amount, merchant, category) |
| `app.js` | Core views: Today, Expenses, Schedule, Tasks, Settings |
| `extras.js`, `extras2.js` | Gym, health, GPA, study/focus, goals, challenges, assistant |
| `calendar.js` | `.ics` export with alarms |
| `motion.js` | Motion layer: view entrance, sheet enter/exit, count-up, bar/ring tweens, toggle feedback |
| `config.js` | Supabase URL/anon key (empty) |

Run locally: `npx serve hayati-app` (artifact db unavailable outside claude.ai → falls back to localStorage/Supabase).

## Tests
```bash
cd hayati-app
npm ci
npx playwright install chromium   # first time only
npm test          # unit (bank message reader) + browser tests at iPhone size
npm run build     # rebuild dist/Hayati.html after any change (a test fails if it's stale)
```
GitHub runs the same tests on every push/PR touching `hayati-app/` (`.github/workflows/hayati-tests.yml`).
