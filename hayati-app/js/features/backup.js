// «نسخة مشفّرة» (DW-029): ملف واحد بكلمة سر فيه كل شي: بيانات الحساب + اللي على الجهاز بس (الرحلات، الإعدادات) + تسجيلات المحاضرات (اختياري).
// التشفير بالجهاز: PBKDF2-SHA256 (250k) ← AES-GCM-256. كلمة السر ما تنحفظ ولا تطلع، ولو نسيتها ما فيه طريقة نرجع الملف.
(function () {
  'use strict';

  const A = window.App, E = window.Extras, S = window.Store;
  if (!A || !E || !S) return;
  const { I, tint } = A;

  const ITER = 250000, MIN = 8;
  // مفاتيح الجهاز اللي تستاهل ترجع (بدون جلسة الدخول ولا القفل ولا أي توكن)
  const LOCAL = ['hayati-trips', 'hayati-gpa-target', 'hayati-theme', 'hayati-lang', 'hayati-notif-prefs', 'hayati-cal', 'hayati-first-step', 'hayati-seen-version'];
  const enc = new TextEncoder(), dec = new TextDecoder();

  function b64(buf) {
    const u = new Uint8Array(buf); let s = '';
    for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
    return btoa(s);
  }
  const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

  async function keyFrom(pass, salt, iter) {
    const base = await crypto.subtle.importKey('raw', enc.encode(pass), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: iter }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  }
  async function encrypt(obj, pass) {
    const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await keyFrom(pass, salt, ITER);
    const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify(obj)));
    return JSON.stringify({ app: 'hayati', v: 1, kdf: { name: 'PBKDF2', hash: 'SHA-256', iter: ITER, salt: b64(salt) }, cipher: 'AES-GCM', iv: b64(iv), data: b64(data) });
  }
  async function decrypt(text, pass) {
    const f = JSON.parse(text);
    const key = await keyFrom(pass, unb64(f.kdf.salt), f.kdf.iter);
    let plain;
    try { plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(f.iv) }, key, unb64(f.data)); }
    catch (e) { throw new Error('wrong'); }   // GCM يرفض أي كلمة سر غلط أو ملف متعدّل
    return JSON.parse(dec.decode(plain));
  }
  const isEncrypted = (text) => { try { const f = JSON.parse(text); return f && f.app === 'hayati' && !!f.kdf && !!f.data; } catch (e) { return false; } };

  // ================= التسجيلات (IndexedDB) =================
  const DB = 'hayati-audio', OS = 'clips';
  function idb(mode, fn) {
    return new Promise((ok, no) => {
      if (!window.indexedDB) return ok(null);
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(OS);
      r.onerror = () => no(r.error);
      r.onsuccess = () => { const tx = r.result.transaction(OS, mode); const out = fn(tx.objectStore(OS)); tx.oncomplete = () => { r.result.close(); ok(out && out.result !== undefined ? out.result : out); }; tx.onerror = () => { r.result.close(); no(tx.error); }; };
    });
  }
  async function readClips() {
    const keys = (await idb('readonly', (s) => s.getAllKeys())) || [];
    const out = [];
    for (const id of keys) {
      const blob = await idb('readonly', (s) => s.get(id));
      if (blob && blob.arrayBuffer) out.push({ id, type: blob.type || 'audio/webm', b64: b64(await blob.arrayBuffer()) });
    }
    return out;
  }
  const writeClips = (clips) => Promise.all(clips.map((c) => idb('readwrite', (s) => s.put(new Blob([unb64(c.b64)], { type: c.type }), c.id))));
  async function clipsSize() {
    const keys = (await idb('readonly', (s) => s.getAllKeys()).catch(() => [])) || [];
    let n = 0;
    for (const id of keys) { const b = await idb('readonly', (s) => s.get(id)); n += (b && b.size) || 0; }
    return { count: keys.length, bytes: n };
  }

  // ================= الحزمة =================
  async function pack(withAudio) {
    const local = {};
    for (const k of LOCAL) { try { const v = localStorage.getItem(k); if (v != null) local[k] = v; } catch (e) { /* تجاهل */ } }
    return { store: S.exportJSON(), local, clips: withAudio ? await readClips() : [] };
  }
  async function unpack(p) {
    const n = S.importJSON(p.store);
    for (const k of Object.keys(p.local || {})) if (LOCAL.includes(k)) { try { localStorage.setItem(k, p.local[k]); } catch (e) { /* تجاهل */ } }
    if ((p.clips || []).length) await writeClips(p.clips);
    return { items: n, clips: (p.clips || []).length };
  }

  const mb = (b) => (b / 1048576).toFixed(b < 1048576 ? 2 : 1) + ' MB';

  // ================= الواجهة =================
  function makeSheet() {
    A.openSheet({
      title: '🔐 نسخة مشفّرة',
      saveLabel: 'احفظ الملف',
      body:
        '<p class="small muted" style="margin:0 0 12px">ملف واحد فيه كل بياناتك: الفلوس والجدول والمحاضرات، والرحلات والإعدادات اللي على الجهاز بس. ما ينفتح إلا بكلمة السر.</p>' +
        '<label class="field"><span>كلمة السر</span><input id="bkP1" type="password" autocomplete="new-password" minlength="' + MIN + '" dir="ltr"></label>' +
        '<label class="field"><span>أعدها</span><input id="bkP2" type="password" autocomplete="new-password" dir="ltr"></label>' +
        '<label style="display:flex;gap:10px;align-items:center;margin:4px 0 10px"><input id="bkAudio" type="checkbox"><span>معها تسجيلات المحاضرات <small id="bkSize" class="muted num"></small></span></label>' +
        '<p class="small" style="margin:0;color:var(--expense)">⚠️ لو نسيت كلمة السر ما نقدر نفتح الملف، ولا أحد يقدر. اكتبها بمكان آمن.</p>',
      mount(root) {
        clipsSize().then((s) => { const el = root.querySelector('#bkSize'); if (el) el.textContent = s.count ? '(' + s.count + ' · ' + mb(s.bytes) + ')' : '(ما فيه تسجيلات)'; if (!s.count) root.querySelector('#bkAudio').disabled = true; }).catch(() => {});
      },
      async onSave(root) {
        const p1 = root.querySelector('#bkP1').value, p2 = root.querySelector('#bkP2').value;
        if (p1.length < MIN) { A.toast('كلمة السر ' + MIN + ' حروف على الأقل'); return false; }
        if (p1 !== p2) { A.toast('كلمتين السر مو نفس الشي'); return false; }
        const btn = document.getElementById('sheetSave'); if (btn) { btn.disabled = true; btn.textContent = 'لحظة…'; }
        try {
          const text = await encrypt(await pack(root.querySelector('#bkAudio').checked), p1);
          const ok = await A.saveFile('hayati-secure-' + new Date().toISOString().slice(0, 10) + '.json', text, 'application/json');
          if (ok) { A.markBackup(); A.toast('انحفظت النسخة المشفّرة 🔐'); }
          return ok !== false;
        } catch (e) { A.toast('ما قدرنا نسوي النسخة'); return false; }
        finally { if (btn) { btn.disabled = false; btn.textContent = 'احفظ الملف'; } }
      },
    });
  }

  function restoreSheet(text) {
    A.openSheet({
      title: '🔐 افتح النسخة',
      saveLabel: 'استرجع',
      body: '<p class="small muted" style="margin:0 0 12px">هالملف مشفّر. اكتب كلمة السر اللي حطيتها وقت سويت النسخة.</p>' +
        '<label class="field"><span>كلمة السر</span><input id="bkPass" type="password" autocomplete="current-password" dir="ltr"></label>',
      async onSave(root) {
        const pass = root.querySelector('#bkPass').value;
        if (!pass) { A.toast('اكتب كلمة السر'); return false; }
        const btn = document.getElementById('sheetSave'); if (btn) { btn.disabled = true; btn.textContent = 'لحظة…'; }
        try {
          const r = await unpack(await decrypt(text, pass));
          A.toast('رجّعنا ' + r.items + ' عنصر' + (r.clips ? ' و' + r.clips + ' تسجيل' : ''));
          setTimeout(() => A.render(), 50);
          return true;
        } catch (e) { A.toast(e.message === 'wrong' ? 'كلمة السر غلط' : 'الملف غير صالح'); return false; }
        finally { if (btn) { btn.disabled = false; btn.textContent = 'استرجع'; } }
      },
    });
  }

  // ================= الربط =================
  const prevExtra = E.settingsExtra;
  E.settingsExtra = function () {
    return '<div class="menu" style="margin-top:8px"><button data-set="secure-backup"><div class="ico" style="' + tint('#334155') + '">' + I('key') + '</div><div style="flex:1;min-width:0"><b>نسخة مشفّرة بكلمة سر</b><small>كل شي بملف واحد، معه الرحلات والتسجيلات</small></div>' + I('chevL') + '</button></div>' +
      (prevExtra ? prevExtra.apply(this, arguments) : '');
  };
  const prevSet = E.settingsAction;
  E.settingsAction = async function (act) {
    if (act === 'secure-backup') { A.closeSheet(); setTimeout(makeSheet, 280); return true; }
    return prevSet ? prevSet.apply(this, arguments) : false;
  };

  window.HayatiBackup = { encrypt, decrypt, isEncrypted, pack, unpack, makeSheet, restoreSheet, LOCAL, ITER };
})();
