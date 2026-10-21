// supabase-js وهمي للاختبار: نفس واجهة auth/mfa/from/rpc، وbيتصرف مثل RLS الحقيقي: ما يرجع بيانات بدون aal2.
(function () {
  const ADMIN = 'owner@test', PASS = 'pw', CODE = '123456';
  const db = { wadqa_entries: [{ id: 'e1', kind: 'expense', occurred_on: new Date().toISOString().slice(0, 10), amount_fils: 9400, category: 'استضافة وسحابة', product: 'general', method: 'بطاقة', note: 'Supabase' }], wadqa_budgets: [], wadqa_recurring: [], wadqa_docs: [{ slug: 'hayati', title: 'حياتي · Hayati', sort: 0, updated_at: '2026-10-21T08:00:00Z', body: window.__DOC_BODY__ || '# حياتي' }] };
  const st = JSON.parse(sessionStorage.getItem('fake-sb') || '{"session":null,"aal":"aal1","factors":[]}');
  const save = () => sessionStorage.setItem('fake-sb', JSON.stringify(st));
  const ok2 = () => st.session && st.session.user.email === ADMIN && st.aal === 'aal2';
  function query(table) {
    let filt = null;
    const rows = () => (ok2() ? db[table].filter((r) => !filt || r[filt[0]] === filt[1]) : []);
    const b = { select() { return b; }, order() { return b; }, limit() { return b; }, eq(k, v) { filt = [k, v]; return b; },
      single() { const r = rows()[0]; return Promise.resolve(r ? { data: r, error: null } : { data: null, error: { message: 'no rows' } }); },
      then(res) { return Promise.resolve({ data: rows(), error: null }).then(res); },
      insert(r) { if (!ok2()) return Promise.resolve({ error: { message: 'new row violates row-level security policy' } }); db[table].push(Object.assign({ id: String(Math.random()) }, r)); return Promise.resolve({ error: null }); },
      update() { return { eq: () => Promise.resolve({ error: ok2() ? null : { message: 'row-level security' } }) }; },
      upsert() { return Promise.resolve({ error: null }); },
      delete() { return { eq: () => Promise.resolve({ error: null }) }; } };
    return b;
  }
  window.supabase = { createClient: () => ({
    auth: {
      getSession: async () => ({ data: { session: st.session } }),
      signInWithPassword: async ({ email, password }) => {
        if (password !== PASS) return { error: { message: 'Invalid login credentials' } };
        st.session = { user: { email } }; st.aal = 'aal1'; save(); return { error: null };
      },
      signOut: async () => { st.session = null; st.aal = 'aal1'; save(); return {}; },
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      mfa: {
        getAuthenticatorAssuranceLevel: async () => ({ data: { currentLevel: st.aal, nextLevel: st.factors.some((f) => f.status === 'verified') ? 'aal2' : 'aal1' } }),
        listFactors: async () => ({ data: { all: st.factors, totp: st.factors.filter((f) => f.status === 'verified') } }),
        unenroll: async ({ factorId }) => { st.factors = st.factors.filter((f) => f.id !== factorId); save(); return { error: null }; },
        enroll: async () => { const f = { id: 'f' + st.factors.length, factor_type: 'totp', status: 'unverified' }; st.factors.push(f); save();
          return { data: { id: f.id, totp: { qr_code: 'data:image/svg+xml;utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10" fill="#000"/></svg>'), secret: 'JBSWY3DPEHPK3PXP', uri: 'otpauth://totp/x' } }, error: null }; },
        challengeAndVerify: async ({ factorId, code }) => {
          if (code !== CODE) return { error: { message: 'Invalid TOTP code entered' } };
          st.factors.forEach((f) => { if (f.id === factorId) f.status = 'verified'; }); st.aal = 'aal2'; save(); return { error: null };
        },
      },
    },
    rpc: async (name) => {
      if (name === 'wadqa_is_admin') return { data: !!st.session && st.session.user.email === ADMIN, error: null };
      if (name === 'wadqa_admin_leads') return ok2() ? { data: [], error: null } : { data: null, error: { message: 'not allowed' } };
      return { data: null, error: { message: 'unknown rpc' } };
    },
    from: query,
  }) };
})();
