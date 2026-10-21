/* عارض Markdown آمن لتبويب «الملفات» (DW-053). المحتوى من القاعدة، فما ننفّذ منه أي HTML:
   كل نص ينهرب أول، والصور data: بس، والروابط https بس. يدعم: عناوين، فقرات، قوائم، اقتباس، جداول، كود، صور. */
(function (root) {
  'use strict';
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // الصور: data: أو لقطات اللوحة نفسها (docs-img/*.jpg على نفس الدومين، بيانات تجريبية بس)
  const IMG = /^!\[([^\]]*)\]\((data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+|docs-img\/[a-z0-9-]+\.jpg)\)$/;

  // `كود` ← <code>، **غامق**، [نص](https://…). الكود ما يتنسّق من داخل.
  function inline(text) {
    return String(text).split(/(`[^`]+`)/).map((part) => {
      if (/^`[^`]+`$/.test(part)) return '<code dir="ltr">' + esc(part.slice(1, -1)) + '</code>';
      return esc(part)
        .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
        .replace(/\[([^\]]+)\]\((https:\/\/[^\s)]+)\)/g, (m, t, u) => '<a href="' + u + '" target="_blank" rel="noopener noreferrer">' + t + '</a>');
    }).join('');
  }

  function render(md) {
    const lines = String(md || '').replace(/\r\n?/g, '\n').split('\n');
    const out = [];
    let i = 0;
    const isTable = (l) => /^\s*\|.*\|\s*$/.test(l);
    const cells = (l) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
    while (i < lines.length) {
      const l = lines[i];
      if (/^```/.test(l)) {
        const lang = l.slice(3).trim(), buf = [];
        i++;
        while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]);
        i++;
        out.push('<pre dir="ltr"' + (lang ? ' data-lang="' + esc(lang) + '"' : '') + '><code>' + esc(buf.join('\n')) + '</code></pre>');
        continue;
      }
      if (!l.trim()) { i++; continue; }
      let m;
      if ((m = /^(#{1,3})\s+(.*)$/.exec(l))) { const n = m[1].length + 1; out.push('<h' + n + '>' + inline(m[2]) + '</h' + n + '>'); i++; continue; }
      if (IMG.test(l.trim())) {
        const imgs = [];
        while (i < lines.length && IMG.test(lines[i].trim())) { const [, alt, src] = IMG.exec(lines[i].trim()); imgs.push('<figure><img src="' + src + '" alt="' + esc(alt) + '" loading="lazy"><figcaption>' + esc(alt) + '</figcaption></figure>'); i++; }
        out.push('<div class="shots">' + imgs.join('') + '</div>');
        continue;
      }
      if (isTable(l) && i + 1 < lines.length && /^\s*\|?\s*:?-{3,}/.test(lines[i + 1])) {
        const head = cells(l); i += 2;
        const rows = [];
        while (i < lines.length && isTable(lines[i])) rows.push(cells(lines[i++]));
        out.push('<div class="tbl"><table><thead><tr>' + head.map((c) => '<th>' + inline(c) + '</th>').join('') + '</tr></thead><tbody>' +
          rows.map((r) => '<tr>' + r.map((c) => '<td>' + inline(c) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>');
        continue;
      }
      if (/^>\s?/.test(l)) {
        const buf = [];
        while (i < lines.length && /^>\s?/.test(lines[i])) buf.push(inline(lines[i++].replace(/^>\s?/, '')));
        out.push('<blockquote>' + buf.join('<br>') + '</blockquote>');
        continue;
      }
      if (/^\s*([-*]|\d+\.)\s+/.test(l)) {
        const ordered = /^\s*\d+\./.test(l), buf = [];
        while (i < lines.length && /^\s*([-*]|\d+\.)\s+/.test(lines[i])) buf.push('<li>' + inline(lines[i++].replace(/^\s*([-*]|\d+\.)\s+/, '')) + '</li>');
        out.push((ordered ? '<ol>' : '<ul>') + buf.join('') + (ordered ? '</ol>' : '</ul>'));
        continue;
      }
      const buf = [];
      while (i < lines.length && lines[i].trim() && !/^(```|#{1,3}\s|>|\s*([-*]|\d+\.)\s)/.test(lines[i]) && !IMG.test(lines[i].trim()) && !isTable(lines[i])) buf.push(inline(lines[i++]));
      if (buf.length) out.push('<p>' + buf.join('<br>') + '</p>');
      else { out.push('<p>' + inline(lines[i]) + '</p>'); i++; }
    }
    return out.join('\n');
  }

  const api = { render, inline, esc };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.AdminDocs = api;
})(typeof window !== 'undefined' ? window : globalThis);
