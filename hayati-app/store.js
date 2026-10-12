// حفظ البيانات محلياً + مزامنتها مع Supabase بين الجوال والماك
(function (global) {
  'use strict';

  const KEY = 'hayati-v1';
  const CFG_KEY = 'hayati-supabase';
  const TABLES = ['transactions', 'courses', 'tasks', 'subscriptions', 'goals', 'grades', 'study_sessions', 'debts', 'habits', 'daily', 'lifts', 'body', 'cards', 'events', 'shopping', 'journal', 'matches'];
  const SETTINGS_FIELDS = ['budget', 'ingest_token', 'prior_gpa', 'prior_credits', 'focus_minutes', 'cat_budgets', 'save_pct', 'prayer_on', 'prayer_method', 'water_goal', 'sleep_goal', 'challenges', 'name', 'roles', 'onboarded'];
  const NUMERIC = ['amount', 'target', 'saved', 'credits', 'minutes', 'day', 'month', 'duration', 'remind_days', 'weight', 'waist', 'water', 'sleep', 'absence_limit'];

  const listeners = new Set();
  let sb = null;          // عميل Supabase
  let session = null;
  let channel = null;
  let flushing = false;
  let pullTimer = null;

  const state = load();
  const status = { configured: false, signedIn: false, email: '', syncing: false, error: '', lastSync: null };

  function blank() {
    const b = { settings: { budget: null, ingest_token: null, prior_gpa: null, prior_credits: null, focus_minutes: 25 }, pending: [] };
    for (const t of TABLES) b[t] = [];
    return b;
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const b = blank();
        const saved = JSON.parse(raw);
        return Object.assign(b, saved, { settings: Object.assign(b.settings, saved.settings || {}) });
      }
    } catch (e) { /* تخزين غير متاح */ }
    return blank();
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* تجاهل */ }
  }

  function emit() {
    for (const fn of listeners) fn(state, status);
  }

  function uuid() {
    if (global.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
  }

  // معرّف ثابت من نص — عشان لو جهازين سجّلوا نفس الاشتراك بنفس الشهر ما يتكرر
  function stableId(text) {
    let hex = '';
    for (let seed = 0; seed < 4; seed++) {
      let h = 0x811c9dc5 ^ (seed * 0x9e3779b9);
      for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193); }
      hex += (h >>> 0).toString(16).padStart(8, '0');
    }
    return hex.slice(0, 8) + '-' + hex.slice(8, 12) + '-5' + hex.slice(13, 16) + '-' + ((parseInt(hex[16], 16) & 3) | 8).toString(16) + hex.slice(17, 20) + '-' + hex.slice(20, 32);
  }

  function randomToken() {
    const a = new Uint8Array(24);
    crypto.getRandomValues(a);
    return Array.from(a, (b) => b.toString(16).padStart(2, '0')).join('');
  }

  // ---------- العمليات المحلية ----------

  function upsert(table, row) {
    const list = state[table];
    const now = new Date().toISOString();
    const rec = Object.assign({}, row, { id: row.id || uuid(), updated_at: now });
    const i = list.findIndex((r) => r.id === rec.id);
    if (i >= 0) list[i] = Object.assign({}, list[i], rec);
    else list.push(rec);
    queue({ table, op: 'upsert', row: i >= 0 ? list[i] : rec });
    return rec;
  }

  function remove(table, id) {
    state[table] = state[table].filter((r) => r.id !== id);
    queue({ table, op: 'delete', id });
  }

  function setSettings(patch) {
    Object.assign(state.settings, patch, { updated_at: new Date().toISOString() });
    const row = {};
    for (const f of SETTINGS_FIELDS) row[f] = state.settings[f] == null ? null : state.settings[f];
    queue({ table: 'settings', op: 'upsert', row });
  }

  function queue(op) {
    // دمج التعديلات المتكررة على نفس السجل
    state.pending = state.pending.filter((p) => !(p.table === op.table && (p.row ? p.row.id : p.id) === (op.row ? op.row.id : op.id) && op.table !== 'settings'));
    if (op.table === 'settings') state.pending = state.pending.filter((p) => p.table !== 'settings');
    state.pending.push(op);
    save();
    emit();
    flush();
  }

  // ---------- Supabase ----------

  function getConfig() {
    const c = global.HAYATI_CONFIG || {};
    if (c.SUPABASE_URL && c.SUPABASE_ANON_KEY) return { url: c.SUPABASE_URL, key: c.SUPABASE_ANON_KEY, fromFile: true };
    try {
      const saved = JSON.parse(localStorage.getItem(CFG_KEY) || 'null');
      if (saved && saved.url && saved.key) return Object.assign(saved, { fromFile: false });
    } catch (e) { /* تجاهل */ }
    return null;
  }

  function saveConfig(url, key) {
    try { localStorage.setItem(CFG_KEY, JSON.stringify({ url: url.trim().replace(/\/+$/, ''), key: key.trim() })); } catch (e) { /* تجاهل */ }
    return init();
  }

  function clearConfig() {
    try { localStorage.removeItem(CFG_KEY); } catch (e) { /* تجاهل */ }
    teardown();
    sb = null;
    status.configured = false;
    status.signedIn = false;
    emit();
  }

  // ---------- قاعدة بيانات صفحة Claude (لما التطبيق ينفتح من رابط claude.ai) ----------
  let adb = null;
  let aCol = null;
  let aUnsub = null;

  function docKey(table, id) { return table + '~' + id; }

  function applySnapshot(snap) {
    const fresh = {};
    for (const t of TABLES) fresh[t] = [];
    let settingsRow = null;
    for (const d of snap.docs) {
      const body = d.data();
      if (!body || !body.t) continue;
      if (body.t === 'settings') settingsRow = body.row || {};
      else if (fresh[body.t]) fresh[body.t].push(clean(body.row || {}));
    }
    for (const t of TABLES) state[t] = fresh[t];
    if (settingsRow) for (const f of SETTINGS_FIELDS) if (f in settingsRow) state.settings[f] = settingsRow[f];
    // التعديلات اللي لسا ما انرفعت تبقى ظاهرة
    for (const op of state.pending) {
      if (op.table === 'settings') continue;
      if (op.op === 'delete') state[op.table] = state[op.table].filter((r) => r.id !== op.id);
      else {
        const list = state[op.table];
        const i = list.findIndex((r) => r.id === op.row.id);
        if (i >= 0) list[i] = op.row; else list.push(op.row);
      }
    }
    status.lastSync = new Date();
    status.error = '';
    save();
    emit();
  }

  async function initArtifactDb() {
    if (!global.claude || typeof global.claude.use !== 'function') return false;
    const [db, user] = await Promise.all([global.claude.use('db'), global.claude.use('user')]);
    if (!db || !user) return false;
    const uid = await user.id();
    if (!uid) return false;
    adb = db;
    aCol = adb.collection('data/users/' + uid);
    status.mode = 'artifact';
    status.configured = true;
    status.signedIn = true;
    status.email = 'حسابك في Claude';
    // نستنى أول نسخة من البيانات قبل ما نكمل (عشان الاشتراكات ما تنسجّل مرتين)
    await new Promise((resolve) => {
      let first = true;
      const done = () => { if (first) { first = false; resolve(); } };
      aUnsub = aCol.onSnapshot((snap) => { applySnapshot(snap); if (!snap.metadata.fromCache) done(); }, (e) => {
        status.error = e.code === 'revoked' ? '' : 'تعذّرت المزامنة';
        emit();
        done();
      });
      setTimeout(done, 8000);
    });
    await flush();
    return true;
  }

  async function flushArtifact(op) {
    if (op.table === 'settings') return aCol.doc(docKey('settings', 'me')).set({ t: 'settings', row: op.row });
    if (op.op === 'delete') return aCol.doc(docKey(op.table, op.id)).delete();
    const row = Object.assign({}, op.row);
    delete row.user_id;
    return aCol.doc(docKey(op.table, row.id)).set({ t: op.table, row });
  }

  // جدول جاهز يحطه Claude بقاعدة بيانات الصفحة عشان المستخدم يستورده بضغطة
  async function getSeed() {
    if (!adb) return null;
    try {
      const d = await adb.doc('seed/schedule').get();
      return d.exists ? d.data() : null;
    } catch (e) { return null; }
  }

  async function init() {
    if (await initArtifactDb()) { emit(); return; }
    const cfg = getConfig();
    if (!cfg || !global.supabase) {
      status.configured = false;
      emit();
      return;
    }
    try {
      sb = global.supabase.createClient(cfg.url, cfg.key, { auth: { persistSession: true, autoRefreshToken: true } });
    } catch (e) {
      status.error = 'رابط Supabase أو المفتاح غير صحيح';
      emit();
      return;
    }
    status.configured = true;
    const { data } = await sb.auth.getSession();
    onSession(data.session);
    sb.auth.onAuthStateChange((_evt, s) => onSession(s));
  }

  function onSession(s) {
    const was = session && session.user.id;
    session = s;
    status.signedIn = !!s;
    status.email = s ? s.user.email : '';
    emit();
    if (s && was !== s.user.id) {
      subscribe();
      sync();
    }
    if (!s) teardown();
  }

  function teardown() {
    if (channel && sb) sb.removeChannel(channel);
    channel = null;
  }

  async function signIn(email, password) {
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw new Error(arabicAuthError(error.message));
  }

  async function signUp(email, password) {
    const { data, error } = await sb.auth.signUp({ email, password });
    if (error) throw new Error(arabicAuthError(error.message));
    return !data.session; // true = يحتاج تأكيد الإيميل
  }

  async function signOut() {
    await sb.auth.signOut();
  }

  function arabicAuthError(msg) {
    if (/invalid login/i.test(msg)) return 'الإيميل أو كلمة المرور غلط';
    if (/not confirmed/i.test(msg)) return 'لازم تأكد إيميلك أول (شيّك صندوق الوارد)';
    if (/already registered/i.test(msg)) return 'هذا الإيميل مسجّل من قبل، سجّل دخول';
    if (/at least 6/i.test(msg)) return 'كلمة المرور لازم ٦ أحرف أو أكثر';
    return msg;
  }

  function ready() {
    if (adb) return navigator.onLine !== false;
    return sb && session && navigator.onLine !== false;
  }

  async function flush() {
    if (flushing || !ready() || !state.pending.length) return;
    flushing = true;
    try {
      while (state.pending.length) {
        const op = state.pending[0];
        if (adb) {
          await flushArtifact(op);
          state.pending.shift();
          save();
          continue;
        }
        let res;
        if (op.op === 'delete') res = await sb.from(op.table).delete().eq('id', op.id);
        else if (op.table === 'settings') res = await sb.from('settings').upsert({ user_id: session.user.id, data: op.row, updated_at: new Date().toISOString() });
        else res = await sb.from(op.table).upsert(wrap(op.row));
        if (res.error) throw res.error;
        state.pending.shift();
        save();
      }
      status.error = '';
    } catch (e) {
      status.error = 'تعذّر رفع بعض التعديلات، بنحاول مرة ثانية';
      console.warn('flush', e);
    } finally {
      flushing = false;
      emit();
    }
  }

  async function pull() {
    if (!ready() || adb) return;
    status.syncing = true;
    emit();
    try {
      const results = await Promise.all(TABLES.map((t) => sb.from(t).select('*')));
      results.forEach((r, i) => { if (r.error) throw r.error; state[TABLES[i]] = r.data.map((x) => clean(unwrap(x))); });
      const st = await sb.from('settings').select('*').maybeSingle();
      if (st.error) throw st.error;
      const sd = st.data && st.data.data;
      if (sd) {
        for (const f of SETTINGS_FIELDS) {
          if (f === 'ingest_token') state.settings[f] = sd[f];
          else if (sd[f] != null) state.settings[f] = typeof sd[f] === 'string' && /^-?\d+(\.\d+)?$/.test(sd[f]) ? Number(sd[f]) : sd[f];
          else if (f !== 'focus_minutes') state.settings[f] = null;
        }
      }
      // التعديلات اللي لسا ما انرفعت تبقى ظاهرة
      for (const op of state.pending) {
        if (op.table === 'settings') continue;
        if (op.op === 'delete') state[op.table] = state[op.table].filter((r) => r.id !== op.id);
        else {
          const list = state[op.table];
          const i = list.findIndex((r) => r.id === op.row.id);
          if (i >= 0) list[i] = op.row; else list.push(op.row);
        }
      }
      status.lastSync = new Date();
      status.error = '';
      save();
      await processInbox();
    } catch (e) {
      status.error = 'تعذّرت المزامنة: ' + (e.message || e);
      console.warn('pull', e);
    } finally {
      status.syncing = false;
      emit();
    }
  }

  // كل جدول بـSupabase شكله واحد: id + user_id + data (jsonb) + updated_at
  function wrap(row) {
    const data = Object.assign({}, row);
    delete data.user_id;
    return { id: row.id, data, updated_at: row.updated_at || new Date().toISOString() };
  }
  function unwrap(r) { return Object.assign({}, r.data || {}, { id: r.id }); }

  function clean(row) {
    const r = Object.assign({}, row);
    delete r.user_id;
    for (const f of NUMERIC) if (r[f] != null) r[f] = Number(r[f]);
    return r;
  }

  // يحوّل الرسائل الجديدة اللي وصلت من الاختصارات إلى عمليات
  async function processInbox() {
    if (adb) return 0;
    if (!ready() || !global.SmsParser) return 0;
    const { data, error } = await sb.from('sms_inbox').select('*').eq('processed', false).order('received_at');
    if (error || !data || !data.length) return 0;
    let added = 0;
    for (const msg of data) {
      const tx = smsToTransaction(msg.body, msg.received_at, msg.id);
      if (tx) {
        // رقم العملية = رقم الرسالة، فلو جهازين عالجوها بنفس الوقت ما تتكرر
        upsertSilently('transactions', tx);
        const r = await sb.from('transactions').upsert(wrap(tx));
        if (r.error) continue;
        added++;
      }
      await sb.from('sms_inbox').update({ processed: true }).eq('id', msg.id);
    }
    save();
    emit();
    return added;
  }

  function upsertSilently(table, row) {
    const list = state[table];
    const i = list.findIndex((r) => r.id === row.id);
    if (i >= 0) list[i] = row; else list.push(row);
  }

  function smsToTransaction(body, when, id) {
    const p = global.SmsParser.parse(body);
    if (!p) return null;
    // تحويل العملات الأجنبية للدينار (الدينار مربوط بالدولار؛ الباقي تقريبي)
    const RATES = { USD: 0.376, SAR: 0.1003, AED: 0.1024, QAR: 0.1033, KWD: 1.226, OMR: 0.977, EUR: 0.43, GBP: 0.5 };
    let note = '';
    if (p.currency !== 'BHD' && RATES[p.currency]) {
      note = 'أصلها ' + p.amount + ' ' + p.currency + ' ≈ بالدينار';
      p.amount = Math.round(p.amount * RATES[p.currency] * 1000) / 1000;
      p.needs_review = false;
    } else if (p.currency !== 'BHD') note = 'العملة: ' + p.currency;
    return {
      id: id || uuid(),
      kind: p.kind,
      amount: p.amount,
      category: p.category,
      merchant: p.merchant || null,
      note: note || null,
      occurred_at: when || new Date().toISOString(),
      source: 'sms',
      raw: body,
      needs_review: p.needs_review,
      updated_at: new Date().toISOString(),
    };
  }

  function subscribe() {
    teardown();
    if (!sb) return;
    channel = sb.channel('hayati-sync');
    for (const t of TABLES.concat(['settings', 'sms_inbox'])) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table: t }, schedulePull);
    }
    channel.subscribe();
  }

  function schedulePull() {
    clearTimeout(pullTimer);
    pullTimer = setTimeout(pull, 600);
  }

  async function sync() {
    await flush();
    await pull();
  }

  function ensureIngestToken() {
    if (!state.settings.ingest_token) setSettings({ ingest_token: randomToken() });
    return state.settings.ingest_token;
  }

  function rotateIngestToken() {
    setSettings({ ingest_token: randomToken() });
    return state.settings.ingest_token;
  }

  function exportJSON() {
    const out = { exported_at: new Date().toISOString(), settings: {} };
    for (const t of TABLES) out[t] = state[t];
    for (const f of SETTINGS_FIELDS) if (f !== 'ingest_token') out.settings[f] = state.settings[f];
    return JSON.stringify(out, null, 2);
  }

  function importJSON(text) {
    const data = JSON.parse(text);
    let n = 0;
    for (const t of TABLES) {
      for (const row of data[t] || []) { upsert(t, row); n++; }
    }
    if (data.settings) {
      const patch = {};
      for (const f of SETTINGS_FIELDS) if (f !== 'ingest_token' && data.settings[f] != null) patch[f] = data.settings[f];
      if (Object.keys(patch).length) setSettings(patch);
    }
    return n;
  }

  global.addEventListener('online', sync);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) sync(); });

  global.Store = {
    state, status, uuid, stableId,
    subscribe: (fn) => { listeners.add(fn); return () => listeners.delete(fn); },
    upsert, remove, setSettings,
    init, getConfig, saveConfig, clearConfig,
    signIn, signUp, signOut, sync, getSeed, processInbox, smsToTransaction,
    ensureIngestToken, rotateIngestToken, exportJSON, importJSON,
  };
})(window);
