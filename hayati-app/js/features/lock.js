// قفل التطبيق برمز سري: يحمي بياناتك لو أحد مسك جوالك وهو مفتوح
// الرمز ما ينحفظ — بس بصمته (PBKDF2 + ملح) على هالجهاز. نسيت الرمز؟ امسح بيانات الموقع وسجّل دخول Claude من جديد.
(function (global) {
  'use strict';

  const A = global.App, E = global.Extras;
  if (!A || !E) return;
  const KEY = 'hayati-lock';
  const ITER = 150000;
  const TIMEOUTS = [[0, 'فوراً'], [60, 'بعد دقيقة'], [300, 'بعد 5 دقايق'], [900, 'بعد ربع ساعة']];

  function read() { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } }
  function write(v) {
    try { if (v) localStorage.setItem(KEY, JSON.stringify(v)); else localStorage.removeItem(KEY); return true; } catch (e) { return false; }
  }
  const hex = (b) => Array.from(new Uint8Array(b), (x) => x.toString(16).padStart(2, '0')).join('');
  const unhex = (s) => new Uint8Array(s.match(/../g).map((x) => parseInt(x, 16)));

  async function derive(pin, saltHex) {
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: unhex(saltHex), iterations: ITER }, key, 256);
    return hex(bits);
  }
  function same(a, b) { // مقارنة بوقت ثابت
    if (a.length !== b.length) return false;
    let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return d === 0;
  }

  async function setPin(pin, timeout) {
    const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
    return write({ v: 1, salt, hash: await derive(pin, salt), timeout, fails: 0, until: 0 });
  }

  // ---------- شاشة القفل ----------
  let shield = null;
  let hiddenAt = 0;
  let unlocked = false;

  const style = document.createElement('style');
  style.textContent = `
    .lock { position: fixed; inset: 0; z-index: 2147483000; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 22px;
      padding: calc(env(safe-area-inset-top) + 24px) 24px calc(env(safe-area-inset-bottom) + 24px);
      background: radial-gradient(120% 70% at 50% 35%, #13535B 0%, #0E3B43 45%, #0A1A1E 100%); color: #E8DCC4; font-family: inherit; }
    .lock svg.mark { width: 84px; height: 84px; border-radius: 20px; box-shadow: 0 12px 30px -12px rgba(0,0,0,.6); }
    .lock h2 { margin: 0; font-size: 20px; font-weight: 700; }
    .lock .msg { min-height: 22px; font-size: 14px; opacity: .8; text-align: center; }
    .lock .msg.err { color: #FF8A70; opacity: 1; }
    .lock .dots { display: flex; gap: 14px; direction: ltr; }
    .lock .dots i { width: 14px; height: 14px; border-radius: 50%; border: 2px solid #E8DCC4; transition: background-color 120ms ease; }
    .lock .dots i.on { background: #E8DCC4; }
    .lock .pad { display: grid; grid-template-columns: repeat(3, 76px); gap: 14px; direction: ltr; }
    .lock .pad button { height: 76px; border-radius: 50%; border: 0; background: rgba(232,220,196,.12); color: #E8DCC4; font-size: 28px; font-weight: 600;
      font-variant-numeric: tabular-nums; transition: transform 120ms cubic-bezier(0.23, 1, 0.32, 1), background-color 120ms ease; }
    .lock .pad button:active { transform: scale(.92); background: rgba(232,220,196,.24); }
    .lock .pad button.ghost { background: none; font-size: 15px; }
    .lock .forgot { border: 0; background: none; color: #E8DCC4; opacity: .6; font-size: 13px; text-decoration: underline; }
    .lock.shake .dots { animation: lockshake 320ms cubic-bezier(0.23, 1, 0.32, 1); }
    @keyframes lockshake { 20% { transform: translateX(-10px); } 40% { transform: translateX(8px); } 60% { transform: translateX(-6px); } 80% { transform: translateX(3px); } }
    @media (prefers-reduced-motion: reduce) { .lock.shake .dots { animation: none; } }
    body.locked > *:not(.lock) { visibility: hidden; }
  `;
  document.head.appendChild(style);

  const MARK = '<svg class="mark" viewBox="0 0 512 512"><rect width="512" height="512" rx="116" fill="#0E3B43"/><path d="M 383.3 172.7 A 160 160 0 1 1 300 102.2" fill="none" stroke="#E8DCC4" stroke-opacity=".28" stroke-width="22" stroke-linecap="round"/><path d="M 304 166 L 196 166 L 264 222 C 204 222 168 254 168 292 C 168 336 206 360 256 360 C 292 360 318 348 338 332" fill="none" stroke="#E8DCC4" stroke-width="38" stroke-linecap="round" stroke-linejoin="round"/><circle cx="352" cy="128" r="30" fill="#FF6B4A"/></svg>';

  function lockNow() {
    const cfg = read();
    if (!cfg || shield) return;
    unlocked = false;
    document.body.classList.add('locked');
    shield = document.createElement('div');
    shield.className = 'lock';
    shield.setAttribute('role', 'dialog');
    shield.setAttribute('aria-label', 'التطبيق مقفول');
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];
    shield.innerHTML = MARK + '<h2>اكتب رمزك</h2><div class="dots">' + '<i></i>'.repeat(cfg.len || 4) + '</div><div class="msg"></div>' +
      '<div class="pad">' + keys.map((k) => k ? '<button type="button" data-k="' + k + '"' + (k === '⌫' ? ' class="ghost" aria-label="مسح"' : '') + '>' + k + '</button>' : '<span></span>').join('') + '</div>' +
      '<button class="forgot" type="button">نسيت الرمز؟</button>';
    document.body.appendChild(shield);
    // أي نافذة مفتوحة تتسكر عشان ما تبين فوق القفل
    document.querySelectorAll('dialog[open]').forEach((d) => { try { HTMLDialogElement.prototype.close.call(d); } catch (e) { /* تجاهل */ } });

    let entry = '';
    let busy = false;
    const dots = shield.querySelectorAll('.dots i');
    const msg = shield.querySelector('.msg');
    const paint = () => dots.forEach((d, i) => d.classList.toggle('on', i < entry.length));
    const say = (t, err) => { msg.textContent = t; msg.classList.toggle('err', !!err); };

    function waitLeft() { const c = read(); return c && c.until > Date.now() ? Math.ceil((c.until - Date.now()) / 1000) : 0; }
    const w = waitLeft(); if (w) say('محاولات كثيرة — انتظر ' + w + ' ثانية', true);

    async function check() {
      busy = true;
      const c = read();
      const ok = c && same(await derive(entry, c.salt), c.hash);
      if (ok) {
        c.fails = 0; c.until = 0; write(c);
        unlockDone();
        return;
      }
      c.fails = (c.fails || 0) + 1;
      // بعد 5 غلطات: انتظار يتضاعف (30ث، 60ث، 120ث …)
      if (c.fails >= 5) c.until = Date.now() + 30000 * Math.pow(2, c.fails - 5);
      write(c);
      entry = ''; paint();
      shield.classList.remove('shake'); void shield.offsetWidth; shield.classList.add('shake');
      const left = waitLeft();
      say(left ? 'محاولات كثيرة — انتظر ' + left + ' ثانية' : 'الرمز غلط', true);
      busy = false;
    }

    function press(k) {
      if (busy) return;
      const left = waitLeft();
      if (left) { say('محاولات كثيرة — انتظر ' + left + ' ثانية', true); return; }
      if (k === '⌫') entry = entry.slice(0, -1);
      else if (entry.length < (cfg.len || 4)) entry += k;
      paint();
      if (entry.length === (cfg.len || 4)) check();
    }

    shield.querySelector('.pad').addEventListener('click', (e) => { const b = e.target.closest('[data-k]'); if (b) press(b.dataset.k); });
    shield.addEventListener('keydown', (e) => { if (/^[0-9]$/.test(e.key)) press(e.key); else if (e.key === 'Backspace') press('⌫'); });
    shield.tabIndex = -1; shield.focus();
    shield.querySelector('.forgot').onclick = () => say('امسح بيانات الموقع من إعدادات Safari، وسجّل دخول Claude من جديد — بياناتك محفوظة بحسابك.');
  }

  function unlockDone() {
    unlocked = true;
    if (shield) shield.remove();
    shield = null;
    document.body.classList.remove('locked');
    A.render();
  }

  // يقفل لما ترجع للتطبيق بعد المدة المختارة، ويغطّي الشاشة فوراً لما تطلع (عشان صورة مبدّل التطبيقات)
  document.addEventListener('visibilitychange', () => {
    const cfg = read();
    if (!cfg) return;
    if (document.hidden) { hiddenAt = Date.now(); if (!shield) document.body.classList.add('locked'); }
    else {
      if (shield) return;
      if (Date.now() - hiddenAt >= (cfg.timeout || 0) * 1000 || !unlocked) lockNow();
      else document.body.classList.remove('locked');
    }
  });
  global.addEventListener('pagehide', () => { if (read()) { hiddenAt = Date.now(); document.body.classList.add('locked'); } });

  // ---------- الإعدادات ----------
  const prevExtra = E.settingsExtra, prevAction = E.settingsAction;
  E.settingsExtra = function () {
    const cfg = read();
    const t = cfg ? (TIMEOUTS.find((x) => x[0] === cfg.timeout) || TIMEOUTS[0])[1] : '';
    return (prevExtra ? prevExtra.apply(this, arguments) : '') +
      '<div class="group-title">' + A.I('key') + 'الحماية</div><div class="menu">' +
      '<button data-set="lock-set"><div class="ico" style="' + A.tint('#13636B') + '">' + A.I('key') + '</div><div style="flex:1"><b>' + (cfg ? 'تغيير رمز القفل' : 'قفل التطبيق برمز') + '</b><small>' +
      (cfg ? 'مفعّل · يقفل ' + t : 'رمز من 4 أو 6 أرقام يطلب كل ما تفتح التطبيق') + '</small></div>' + A.I('chevL') + '</button>' +
      (cfg ? '<button data-set="lock-now"><div class="ico" style="' + A.tint('#13636B') + '">' + A.I('logout') + '</div><div style="flex:1"><b>اقفل الحين</b></div></button>' +
        '<button data-set="lock-off"><div class="ico" style="' + A.tint('#D63A3A') + '">' + A.I('trash') + '</div><div style="flex:1"><b>شيل القفل</b><small>يطلب الرمز الحالي</small></div></button>' : '') +
      '</div>';
  };

  async function verifyCurrent(pin) { const c = read(); return !c || same(await derive(pin, c.salt), c.hash); }

  function pinForm(mode) {
    const cfg = read();
    const needOld = !!cfg;
    A.openSheet({
      title: mode === 'off' ? 'شيل القفل' : cfg ? 'تغيير الرمز' : 'قفل التطبيق',
      saveLabel: mode === 'off' ? 'شيل' : 'حفظ',
      body:
        (needOld ? '<div class="field"><label>الرمز الحالي</label><input name="old" class="ltr" type="password" inputmode="numeric" autocomplete="off" maxlength="6"></div>' : '') +
        (mode === 'off' ? '' :
          '<div class="field"><label>الرمز الجديد (4 أو 6 أرقام)</label><input name="pin" class="ltr" type="password" inputmode="numeric" autocomplete="off" maxlength="6"></div>' +
          '<div class="field"><label>أعد كتابته</label><input name="pin2" class="ltr" type="password" inputmode="numeric" autocomplete="off" maxlength="6"></div>' +
          '<div class="field"><label>يقفل لما تطلع من التطبيق</label><select name="timeout">' +
          TIMEOUTS.map((x) => '<option value="' + x[0] + '"' + ((cfg ? cfg.timeout : 60) === x[0] ? ' selected' : '') + '>' + x[1] + '</option>').join('') + '</select></div>') +
        '<p class="small muted" style="margin:4px 4px 0">الرمز يحمي هالجهاز بس. ما ينحفظ الرمز نفسه — بس بصمة مشفّرة منه. نسيته؟ امسح بيانات الموقع وسجّل دخول Claude من جديد، وبياناتك ترجع من حسابك.</p>',
      async onSave(root) {
        const v = (n) => (root.querySelector('[name=' + n + ']') || {}).value || '';
        if (needOld && !(await verifyCurrent(v('old')))) { A.toast('الرمز الحالي غلط'); return false; }
        if (mode === 'off') { write(null); A.toast('انشال القفل'); return; }
        const pin = v('pin');
        if (!/^(\d{4}|\d{6})$/.test(pin)) { A.toast('الرمز لازم 4 أو 6 أرقام'); return false; }
        if (/^(\d)\1+$/.test(pin) || '0123456789'.includes(pin) || '9876543210'.includes(pin)) { A.toast('اختار رمز أصعب من ' + pin); return false; }
        if (pin !== v('pin2')) { A.toast('الرمزين مو نفس بعض'); return false; }
        const ok = await setPin(pin, Number(v('timeout')));
        if (!ok) { A.toast('المتصفح مانع الحفظ — جرّب من Safari مو من نافذة خاصة'); return false; }
        const c = read(); c.len = pin.length; write(c);
        unlocked = true;
        A.toast('تم — التطبيق صار مقفول برمز 🔒');
      },
    });
  }

  E.settingsAction = async function (act, root, b) {
    if (act === 'lock-set') { pinForm('set'); return true; }
    if (act === 'lock-off') { pinForm('off'); return true; }
    if (act === 'lock-now') { A.closeSheet(); setTimeout(lockNow, 280); return true; }
    return prevAction ? prevAction.apply(this, arguments) : false;
  };

  // أول ما ينفتح التطبيق
  if (read()) lockNow();
})(window);
