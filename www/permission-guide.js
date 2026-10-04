/*!
 * CIS permission guide
 * مۆداڵی کوردی: تەنها لێرەوە ڕێگەپێدانی ئاگادارکردنەوە و باتری بەدوای یەکدا داوا دەکرێن.
 * هیچ پەنجەرەیەکی سیستەم پێش ئەم مۆداڵە نایەت.
 *
 * بەکارهێنان (لە هەر پەڕەیەک):
 *   <script src="onesignal-init.js"></script>
 *   <script src="permission-guide.js"></script>
 *   <script>CISPermissionGuide.init();</script>
 *
 * تاقیکردنەوە: ?guide=1  (دوادەخستن و یەک-جار-لە-دانیشتنێک پشتگوێ دەخات)
 */
(function () {
  'use strict';

  var SNOOZE_KEY = 'cis_perm_guide_snooze_until';
  var NOTIF_CONFIRMED_KEY = 'cis_notif_confirmed';
  var SHOWN_KEY = 'cis_perm_guide_shown_session';
  // یەک جار: دوای ئەوەی بەکارهێنەر مۆداڵەکەی بینی و کاری پێکرد، هەرگیز دووبارە پیشان نادرێتەوە
  var DONE_KEY = 'cis_perm_guide_done_v1';
  var SNOOZE_MS = 24 * 60 * 60 * 1000;

  // ---------- یارمەتیدەرەکان ----------
  function plugin() {
    try { return window.cordova && window.cordova.plugins && window.cordova.plugins.cisAppSettings; } catch (e) { return null; }
  }
  function oneSignal() {
    try { return window.plugins && window.plugins.OneSignal; } catch (e) { return null; }
  }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function lsDel(k) { try { localStorage.removeItem(k); } catch (e) {} }
  function ssGet(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
  function ssSet(k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function withTimeout(promise, ms) {
    return new Promise(function (resolve) {
      var t = setTimeout(resolve, ms);
      Promise.resolve(promise).then(function (v) { clearTimeout(t); resolve(v); }, function () { clearTimeout(t); resolve(); });
    });
  }

  // ---------- پشکنینی دۆخ ----------
  // true = ئەنجام دراوە | false = نەدراوە | null = نازانرێت
  function checkBattery() {
    var p = plugin();
    if (!p || !p.isIgnoringBatteryOptimizations) return Promise.resolve(null);
    return p.isIgnoringBatteryOptimizations().then(function (r) { return !!r; }, function () { return null; });
  }

  function checkNotification() {
    return new Promise(function (resolve) {
      try {
        var OS = oneSignal();
        if (OS && OS.Notifications) {
          if (typeof OS.Notifications.getPermissionAsync === 'function') {
            OS.Notifications.getPermissionAsync().then(function (v) { resolve(!!v); }, function () { resolve(null); });
            return;
          }
          if (typeof OS.Notifications.hasPermission === 'function') {
            resolve(!!OS.Notifications.hasPermission());
            return;
          }
        }
      } catch (e) {}
      resolve(lsGet(NOTIF_CONFIRMED_KEY) === '1' ? true : null);
    });
  }

  // ---------- داواکارییەکان (تەنها لەناو مۆداڵەکەوە بانگ دەکرێن) ----------
  function requestNotification() {
    console.log('[CPG] requestNotification()');
    var OS = oneSignal();
    if (!OS || !OS.Notifications || typeof OS.Notifications.requestPermission !== 'function') return Promise.resolve();
    // false = پەنجەرەی زیادەی OneSignal پیشان نەدرێت
    // __cpgAllowPrompt: تەنها ئەم مۆداڵە ڕێگەپێدراوە داوای ڕێگەپێدان بکات (بڕوانە onesignal-init.js)
    window.__cpgAllowPrompt = true;
    var r;
    try { r = OS.Notifications.requestPermission(false); } catch (e) { r = Promise.resolve(false); }
    return withTimeout(r, 60000).then(function (v) { window.__cpgAllowPrompt = false; return v; });
  }

  function requestBattery() {
    console.log('[CPG] requestBattery()');
    var p = plugin();
    if (!p || !p.requestIgnoreBatteryOptimizations) return Promise.resolve();
    var resumed = false;
    var mark = function () { if (!document.hidden) resumed = true; };
    document.addEventListener('resume', mark, false);
    document.addEventListener('visibilitychange', mark, false);
    var cleanup = function () {
      document.removeEventListener('resume', mark, false);
      document.removeEventListener('visibilitychange', mark, false);
    };
    var t0 = Date.now();
    return Promise.resolve(p.requestIgnoreBatteryOptimizations()).then(null, function () {}).then(function (result) {
      // پلاگینی نوێ دوای گەڕانەوەی بەکارهێنەر true/false دەگەڕێنێتەوە: چاوەڕێ ناکەین
      if (typeof result === 'boolean') { cleanup(); return wait(300); }
      // پلاگینی کۆن: ئەگەر دوای وەڵامی بەکارهێنەر گەڕایەوە (زیاتر لە ١.٥ چرکە)، چاوەڕێ ناکەین
      if (Date.now() - t0 > 1500) { cleanup(); return wait(500); }
      return new Promise(function (resolve) {
        var waited = 0;
        (function tick() {
          waited += 400;
          if ((resumed && waited >= 800) || waited >= 20000) { cleanup(); resolve(); return; }
          // ئەگەر ڕێگەپێدرا، زووتر بەردەوام بە
          checkBattery().then(function (ok) {
            if (ok === true) { cleanup(); resolve(); } else setTimeout(tick, 400);
          });
        })();
      });
    });
  }

  function openSettingsNotification() {
    var p = plugin();
    return p && p.openNotificationSettings ? p.openNotificationSettings() : Promise.reject();
  }
  function openSettingsApp() {
    var p = plugin();
    return p && p.openAppDetailsSettings ? p.openAppDetailsSettings() : Promise.reject();
  }

  // ---------- ئایتمەکان (ڕیزبەندی داواکاری: ئاگادارکردنەوە ← باتری) ----------
  var ITEMS = [
    {
      id: 'notification', title: 'ئاگادارکردنەوە', desc: 'بۆ ئاگاداربوون لە نمرە، غیاب و پەیامەکان',
      hint: 'لە پەنجەرەی سیستەم، <b>دوگمە شینەکە</b> (Allow، دوگمەی سەرەوە) هەڵبژێرە.',
      check: checkNotification, request: requestNotification,
      settings: openSettingsNotification, settingsLabel: 'کردنەوەی ڕێکخستنی ئاگادارکردنەوە'
    },
    {
      id: 'battery', title: 'باتری: بێ سنووردارکردن', desc: 'بۆ ئەوەی ئەپەکە لە باکگراوند دانەخرێت',
      hint: 'ئەگەر لیستێک دەرکەوت، <b>یەکەم بژاردە</b> (لە سەرەوەی لیستەکە، No restrictions) هەڵبژێرە. ئەو بژاردەیەی کە شین کراوە ئەوە نییە کە دەتەوێت.',
      check: checkBattery, request: requestBattery,
      settings: openSettingsApp, settingsLabel: 'کردنەوەی ڕێکخستنی ئەپەکە'
    }
  ];

  var CSS = '' +
    '.cpg-overlay{position:fixed;inset:0;background:rgba(15,23,42,.6);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;direction:rtl;font-family:"Segoe UI",Tahoma,Geneva,Verdana,sans-serif;color-scheme:light}' +
    '.cpg-modal{background:#fff;color:#1e293b;border-radius:20px;width:100%;max-width:380px;max-height:92vh;overflow-y:auto;box-shadow:0 20px 50px rgba(0,0,0,.3);animation:cpgIn .25s ease}' +
    '@keyframes cpgIn{from{opacity:0;transform:translateY(16px) scale(.97)}to{opacity:1;transform:none}}' +
    '.cpg-top{background:linear-gradient(135deg,#00bfff,#008ab8);color:#fff;text-align:center;padding:22px 16px 18px;border-radius:20px 20px 0 0}' +
    '.cpg-icon{width:64px;height:64px;border-radius:50%;background:rgba(255,255,255,.2);border:3px solid rgba(255,255,255,.7);display:flex;align-items:center;justify-content:center;font-size:28px;margin:0 auto 10px}' +
    '.cpg-top h3{font-size:16px;font-weight:700;margin:0}' +
    '.cpg-body{padding:18px 20px 8px}' +
    '.cpg-intro{font-size:13px;color:#64748b;line-height:1.9;margin:0 0 14px}' +
    '.cpg-tip{font-size:13px;color:#0f5f7a;background:#e0f7ff;border-radius:10px;padding:10px 12px;line-height:1.9;margin:0 0 12px}' +
    '.cpg-list{list-style:none;margin:0;padding:0}' +
    '.cpg-item{display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid #e2e8f0}' +
    '.cpg-item:last-child{border-bottom:none}' +
    '.cpg-item .st{flex:0 0 28px;height:28px;border-radius:50%;background:#f1f5f9;color:#94a3b8;display:flex;align-items:center;justify-content:center;font-size:14px}' +
    '.cpg-item.done .st{background:#dcfce7;color:#16a34a}' +
    '.cpg-item b{display:block;font-size:14px}' +
    '.cpg-item span{display:block;font-size:12px;color:#64748b;margin-top:2px}' +
    '.cpg-actions{padding:12px 20px 20px;display:flex;flex-direction:column;gap:10px}' +
    '.cpg-btn{border:none;border-radius:12px;padding:13px 14px;font-size:14px;font-weight:700;font-family:inherit;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px}' +
    '.cpg-btn.primary{background:linear-gradient(135deg,#00bfff,#008ab8);color:#fff}' +
    '.cpg-btn.next{background:#f0fdf4;color:#15803d;border:2px solid #86efac}' +
    '.cpg-btn.manual{background:#fffbeb;color:#b45309;border:2px solid #fcd34d}' +
    '.cpg-btn.skip{background:transparent;color:#94a3b8;font-weight:600;font-size:12px;padding:6px}' +
    '.cpg-btn:active{transform:scale(.98)}' +
    '.cpg-btn[disabled]{opacity:.6}' +
    '.cpg-done{text-align:center;padding:30px 20px}' +
    '.cpg-done i{font-size:54px;color:#22c55e;margin-bottom:12px;display:block}' +
    '.cpg-done p{font-size:15px;font-weight:700;margin:0}';

  var state = { items: [], overlay: null, busy: false, attempted: false };

  function allDone() {
    return state.items.every(function (i) { return i.done; });
  }

  // ---------- ڕێندەر ----------
  function render() {
    if (!state.overlay) return;
    var list = state.items.map(function (it) {
      return '<li class="cpg-item' + (it.done ? ' done' : '') + '">' +
        '<div class="st"><i class="fas ' + (it.done ? 'fa-check' : 'fa-minus') + '"></i></div>' +
        '<div><b>' + it.title + '</b><span>' + it.desc + '</span></div></li>';
    }).join('');

    var pending = state.items.filter(function (i) { return !i.done; });
    var manual = false ? pending.map(function (it) {
      return '<button class="cpg-btn manual" data-settings="' + it.id + '"><i class="fas fa-gear"></i> ' + it.settingsLabel + '</button>';
    }).join('') : '';

    var hints = pending.map(function (it) {
      return '<div style="margin-top:6px"><b>' + it.title + ':</b> ' + it.hint + '</div>';
    }).join('');
    var tip = state.attempted
      ? 'هێشتا هەندێک ڕێگەپێدان ماوە. لە ڕێکخستنەکان چالاکی بکە و بگەڕێوە بۆ ئەپەکە.' + hints
      : 'دوای گرتنی دوگمەی «چالاککردن»، پەنجەرەی سیستەم یەک لە دوای یەک دەردەکەون.' + hints;

    state.overlay.querySelector('.cpg-modal').innerHTML =
      '<div class="cpg-top">' +
        '<div class="cpg-icon"><i class="fas fa-bell"></i></div>' +
        '<h3>ڕێگەپێدانەکان چالاک بکە</h3>' +
      '</div>' +
      '<div class="cpg-body">' +
        '<p class="cpg-intro">بۆ ئەوەی ئاگادارکردنەوەکان بە کاتی بگەن، ئەم ڕێگەپێدانانە پێویستن:</p>' +
        '<ul class="cpg-list">' + list + '</ul>' +
        '<p class="cpg-tip" style="margin-top:12px">' + tip + '</p>' +
      '</div>' +
      '<div class="cpg-actions">' +
        '<button class="cpg-btn primary" id="cpgRun"><i class="fas fa-shield-halved"></i> ' + (state.attempted ? 'دووبارە هەوڵبدەرەوە' : 'چالاککردن') + '</button>' +
        manual +
        (state.attempted ? '<button class="cpg-btn next" id="cpgDone"><i class="fas fa-check"></i> ئەنجامم دا</button>' : '') +
        '<button class="cpg-btn skip" id="cpgSkip">پاشان</button>' +
      '</div>';

    state.overlay.querySelector('#cpgRun').onclick = run;
    state.overlay.querySelector('#cpgSkip').onclick = snooze;
    var d = state.overlay.querySelector('#cpgDone');
    if (d) d.onclick = function () { lsSet(NOTIF_CONFIRMED_KEY, '1'); showDone(); };
    Array.prototype.forEach.call(state.overlay.querySelectorAll('[data-settings]'), function (b) {
      b.onclick = function () {
        var id = b.getAttribute('data-settings');
        var it = state.items.filter(function (x) { return x.id === id; })[0];
        if (it) it.settings().then(null, function () {});
      };
    });
  }

  function setBusy(on) {
    state.busy = on;
    var b = state.overlay && state.overlay.querySelector('#cpgRun');
    if (!b) return;
    b.disabled = on;
    if (on) b.innerHTML = '<i class="fas fa-spinner fa-spin"></i> کەمێک چاوەڕێ بکە...';
  }

  function refresh() {
    return Promise.all(state.items.map(function (it) { return it.check(); })).then(function (res) {
      var changed = false;
      state.items.forEach(function (it, i) {
        var d = res[i] === true;
        if (it.done !== d) { it.done = d; changed = true; }
      });
      return changed;
    });
  }

  // ---------- دوگمەی «چالاککردن»: داواکارییەکان بەدوای یەکدا ----------
  function run() {
    if (state.busy) return;
    console.log('[CPG] run() - user pressed the Kurdish button');
    lsSet(DONE_KEY, '1');   // هەر کە دوگمەی چالاککردن گیرا، بە تەواو دادەنرێت
    setBusy(true);
    var chain = Promise.resolve();
    state.items.filter(function (i) { return !i.done; }).forEach(function (it) {
      chain = chain
        .then(function () { return it.request(); })
        .then(null, function () {})
        .then(function () { return wait(600); });   // با پەنجەرەی پێشوو بە تەواوی دابخرێت
    });
    chain.then(refresh).then(function () {
      state.attempted = true;
      setBusy(false);
      showDone();   // دوای هەنگاوەکان مۆداڵەکە دادەخرێت، هیچ شاشەیەکی زیادە نابێت
    });
  }

  function onResume() {
    if (!state.overlay || state.busy || document.hidden) return;
    setTimeout(function () {
      if (!state.overlay || state.busy) return;
      refresh().then(function (changed) {
        if (!state.overlay) return;
        if (allDone()) showDone(); else if (changed) render();
      });
    }, 400);
  }

  function showDone() {
    lsDel(SNOOZE_KEY);
    if (!state.overlay) return;
    state.overlay.querySelector('.cpg-modal').innerHTML =
      '<div class="cpg-done"><i class="fas fa-circle-check"></i><p>تەواو بوو! سوپاس</p></div>';
    setTimeout(close, 1400);
  }

  function snooze() {
    lsSet(SNOOZE_KEY, String(Date.now() + SNOOZE_MS));
    close();
  }

  function close() {
    lsSet(DONE_KEY, '1');   // (پاشان / ئەنجامم دا / تەواو) = چیتر پیشان نەدرێتەوە
    document.removeEventListener('visibilitychange', onResume);
    document.removeEventListener('resume', onResume);
    if (state.overlay && state.overlay.parentNode) state.overlay.parentNode.removeChild(state.overlay);
    state.overlay = null;
    window.__cpgStarting = false;
  }

  // ---------- دەستپێکردن ----------
  function start(forced) {
    console.log('[CPG] start() called, forced=' + forced);
    if (state.overlay || window.__cpgStarting) return;
    window.__cpgStarting = true;
    var force = forced === true || /[?&]guide=1/.test(location.search);

    Promise.all(ITEMS.map(function (it) { return it.check(); })).then(function (results) {
      var pending = ITEMS.filter(function (it, i) { return results[i] !== true; });
      if (!pending.length) { window.__cpgStarting = false; return; }                 // هەموو شتێک ئامادەیە
      if (!force && ssGet(SHOWN_KEY) === '1') { window.__cpgStarting = false; return; } // لەم دانیشتنەدا پێشتر پیشان دراوە
      ssSet(SHOWN_KEY, '1');

      state.items = pending.map(function (it) {
        var c = {}; for (var k in it) c[k] = it[k]; c.done = false; return c;
      });
      state.attempted = false;
      state.busy = false;

      if (!document.getElementById('cpgStyle')) {
        var st = document.createElement('style');
        st.id = 'cpgStyle';
        st.textContent = CSS;
        document.head.appendChild(st);
      }
      var ov = document.createElement('div');
      ov.className = 'cpg-overlay';
      ov.innerHTML = '<div class="cpg-modal"></div>';
      document.body.appendChild(ov);
      state.overlay = ov;
      render();
      document.addEventListener('visibilitychange', onResume);
      document.addEventListener('resume', onResume, false);
    });
  }

  function init(opts) {
    console.log('[CPG] init() cordova=' + !!window.cordova + ' plugin=' + !!plugin() + ' done=' + lsGet(DONE_KEY));
    opts = opts || {};
    var force = /[?&]guide=1/.test(location.search);
    var isNative = !!window.cordova || !!window.Capacitor;
    if (!force) {
      if (!isNative) return;                                      // تەنها لەناو ئەپ
      if (lsGet(DONE_KEY) === '1') return;                         // پێشتر پیشان دراوە: چیتر نا
      var until = parseInt(lsGet(SNOOZE_KEY) || '0', 10);
      if (until && Date.now() < until) return;                     // بەکارهێنەر "پاشان"ی داوە
    }
    var delay = typeof opts.delay === 'number' ? opts.delay : 1000;

    function go() { setTimeout(start, delay); }
    function ready() {
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go);
      else go();
    }
    if (window.cordova && !window.__cisDeviceReady) {
      document.addEventListener('deviceready', function () { if (window.__cisDeviceReady) return; window.__cisDeviceReady = true; ready(); }, false);
      setTimeout(function () { if (!window.__cisDeviceReady && plugin()) { window.__cisDeviceReady = true; ready(); } }, 1500);
    } else {
      ready();
    }
  }

  window.CISPermissionGuide = {
    init: init,
    // بۆ دوگمەیەکی دەستی لە ڕێکخستنەکان: CISPermissionGuide.open()
    open: function () { window.__cpgStarting = false; start(true); },
    reset: function () { lsDel(DONE_KEY); lsDel(SNOOZE_KEY); lsDel(NOTIF_CONFIRMED_KEY); try { sessionStorage.removeItem(SHOWN_KEY); } catch (e) {} }
  };
})();
