// 🧯 سجل أخطاء على الجهاز بس (DW-046): آخر 20 خطأ تقني، بدون أي بيانات من المستخدم.
// ما يطلع لأي مكان بروحه: «بلّغ عن مشكلة» يرفق آخر 5 بس لو المستخدم اختار.
(function () {
  const KEY = 'hayati-errlog', MAX = 20;
  // الرسالة تنقص: النص بين علامات التنصيص، الأرقام، الحروف العربية، والإيميلات تطيح كلها
  function clean(msg) {
    return String(msg || '')
      .replace(/(["'`«“]).*?(["'`»”])/g, '…')
      .replace(/\S+@\S+/g, '…')
      .replace(/https?:\/\/\S+/g, (u) => u.split(/[?#]/)[0])
      .replace(/[؀-ۿ]+/g, '…')
      .replace(/\d+/g, '#')
      .replace(/\s+/g, ' ').trim().slice(0, 140);
  }
  function where(src, line, col) {
    const f = String(src || '').split(/[?#]/)[0].split('/').pop();
    return f ? f + ':' + (line || 0) + ':' + (col || 0) : '';
  }
  function read() { try { const a = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
  function add(m, at) {
    const msg = clean(m);
    if (!msg) return;
    try {
      const a = read();
      const t = new Date().toISOString().slice(0, 16).replace('T', ' ');
      const last = a[a.length - 1];
      if (last && last.m === msg && last.at === at) { last.n = (last.n || 1) + 1; last.t = t; }
      else a.push({ t, m: msg, at });
      localStorage.setItem(KEY, JSON.stringify(a.slice(-MAX)));
    } catch (e) { /* التخزين ممتلي أو ممنوع: نتجاهل */ }
  }
  window.addEventListener('error', (e) => {
    if (e.target && e.target !== window) return;   // صورة أو ملف ما انحمل، مو خطأ كود
    add((e.error && e.error.name ? e.error.name + ': ' : '') + (e.message || ''), where(e.filename, e.lineno, e.colno));
  });
  window.addEventListener('unhandledrejection', (e) => {
    const r = e.reason;
    add('Promise: ' + (r && r.name ? r.name + ': ' : '') + (r && r.message ? r.message : typeof r === 'string' ? r : ''), '');
  });
  function list() { return read(); }
  function text(n) {
    return read().slice(-(n || 5)).map((x) => x.t + ' · ' + x.m + (x.at ? ' @ ' + x.at : '') + (x.n > 1 ? ' ×' + x.n : '')).join('\n');
  }
  function clear() { try { localStorage.removeItem(KEY); } catch (e) { /* */ } }
  window.HayatiErrLog = { list, text, clear, clean, KEY };
})();
