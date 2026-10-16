// «هدف بصورة» (DW-040): صورة للشي اللي توفّر له (السيارة، اللابتوب…) تطلع فوق بطاقة الهدف وتحفّزك.
// الصورة على هالجهاز بس (IndexedDB)، مصغّرة لـ 800px، ما ترتفع للسيرفر ولا تتزامن مع أجهزتك الثانية.
(function () {
  'use strict';

  const A = window.App, E = window.Extras;
  if (!A || !E) return;
  const DB = 'hayati-goal-photos', OS = 'photos', MAX = 800;
  const cache = new Map();   // id → dataURL، عشان الرسم يظل متزامن

  function idb(mode, fn) {
    return new Promise((ok, no) => {
      if (!window.indexedDB) return ok(null);
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(OS);
      r.onerror = () => no(r.error);
      r.onsuccess = () => {
        const tx = r.result.transaction(OS, mode); const out = fn(tx.objectStore(OS));
        tx.oncomplete = () => { r.result.close(); ok(out && out.result !== undefined ? out.result : out); };
        tx.onerror = () => { r.result.close(); no(tx.error); };
      };
    });
  }
  // ما نفتح قاعدة الصور وقت التشغيل: أول مرة تطلع شاشة الأهداف أو نموذج الهدف بس
  let loading = null;
  function load() { return loading || (loading = loadNow()); }
  async function loadNow() {
    try {
      const keys = (await idb('readonly', (s) => s.getAllKeys())) || [];
      const vals = (await idb('readonly', (s) => s.getAll())) || [];
      keys.forEach((k, i) => { if (typeof vals[i] === 'string') cache.set(String(k), vals[i]); });
      if (cache.size) A.render();
    } catch (e) { /* بدون صور */ }
  }
  const put = (id, url) => { cache.set(id, url); return idb('readwrite', (s) => s.put(url, id)).catch(() => {}); };
  const drop = (id) => { cache.delete(id); return idb('readwrite', (s) => s.delete(id)).catch(() => {}); };

  async function shrink(file) {
    const img = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = URL.createObjectURL(file); });
    const k = Math.min(1, MAX / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(img.src);
    return c.toDataURL('image/jpeg', 0.8);
  }

  // بطاقة الهدف: الصورة فوق
  E.goalBanner = (g) => {
    load();
    const url = g && cache.get(String(g.id));
    return url ? '<div class="goal-photo" style="margin:-16px -16px 12px;height:140px;border-radius:inherit;border-bottom-left-radius:0;border-bottom-right-radius:0;overflow:hidden;background:#0002">' +
      '<img src="' + url + '" alt="" style="width:100%;height:100%;object-fit:cover;display:block"></div>' : '';
  };

  // نموذج الهدف: اختار صورة / شيلها
  E.goalFormExtra = (g) => {
    load();
    const url = g && cache.get(String(g.id));
    return '<div class="field"><label>صورة للهدف (اختياري)</label>' +
      '<div id="gpPreview" style="' + (url ? '' : 'display:none;') + 'height:120px;border-radius:14px;overflow:hidden;margin-bottom:8px;background:#0002"><img alt="" style="width:100%;height:100%;object-fit:cover;display:block"' + (url ? ' src="' + url + '"' : '') + '></div>' +
      '<div class="btn-row"><button type="button" class="btn ghost" id="gpPick">📷 ' + (url ? 'غيّر الصورة' : 'اختر صورة') + '</button>' +
      '<button type="button" class="btn ghost" id="gpDel"' + (url ? '' : ' hidden') + '>شيل الصورة</button></div>' +
      '<input type="file" id="gpFile" accept="image/*" hidden>' +
      '<small class="muted">الصورة تنحفظ على هالجهاز بس، ما ترتفع ولا تطلع لأحد.</small></div>';
  };
  E.goalFormMount = (root) => {
    const file = root.querySelector('#gpFile'), pick = root.querySelector('#gpPick'), del = root.querySelector('#gpDel'), box = root.querySelector('#gpPreview');
    if (!file) return;
    pick.onclick = () => file.click();
    file.onchange = async () => {
      const f = file.files && file.files[0]; file.value = '';
      if (!f) return;
      if (!/^image\//.test(f.type || 'image/')) { A.toast('اختر صورة'); return; }
      try {
        const url = await shrink(f);
        root.dataset.goalPhoto = url;
        box.querySelector('img').src = url; box.style.display = '';
        del.hidden = false; pick.textContent = '📷 غيّر الصورة';
      } catch (e) { A.toast('ما قدرنا نفتح الصورة'); }
    };
    del.onclick = () => { root.dataset.goalPhoto = '-'; box.style.display = 'none'; box.querySelector('img').removeAttribute('src'); del.hidden = true; pick.textContent = '📷 اختر صورة'; };
  };
  E.goalSaved = (g, root) => {
    const p = root && root.dataset.goalPhoto;
    if (!g || !g.id || !p) return;
    if (p === '-') drop(String(g.id)); else put(String(g.id), p);
    setTimeout(() => A.render(), 0);
  };
  E.goalDeleted = (id) => { if (id) drop(String(id)); };

  E.GoalPhoto = { get: (id) => cache.get(String(id)) || null, all: () => Object.fromEntries(cache), put, drop, load, shrink };
})();
