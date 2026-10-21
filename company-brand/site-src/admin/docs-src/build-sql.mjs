// يحوّل ملفات docs-src/*.md لـ SQL يعبّي جدول wadqa_docs (DW-053). النص خاص بالقاعدة (أدمن + رمز الجوال)،
// والصور تنسخ لـ site/admin/docs-img بـ build.mjs (بيانات تجريبية بس).
// node site-src/admin/docs-src/build-sql.mjs > /tmp/docs.sql   ← وبعدها شغّله بـ Supabase SQL Editor
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const DIR = path.dirname(fileURLToPath(import.meta.url));
const ORDER = ['hayati', 'idarati', 'sports-hub', 'wadqa'];
const out = [];
ORDER.forEach((slug, i) => {
  const body = fs.readFileSync(path.join(DIR, slug + '.md'), 'utf8');
  const title = body.match(/^#\s+(.+)$/m)[1].trim();
  if (body.includes('$doc$')) throw new Error(slug + ': فيه $doc$');
  out.push(`insert into public.wadqa_docs (slug, title, sort, body, updated_at) values ('${slug}', $doc$${title}$doc$, ${i}, $doc$${body}$doc$, now())\n` +
    `on conflict (slug) do update set title = excluded.title, sort = excluded.sort, body = excluded.body, updated_at = now();`);
});
process.stdout.write(out.join('\n\n') + '\n');
