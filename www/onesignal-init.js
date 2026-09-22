/* ==========================================================================
   OneSignal Push Notifications — سیستەمی پەیمانگا (CIS)
   ==========================================================================
   ئەم فایلە لە هەر ٦ فایلی HTML بارکراوە (admin, teacher, student,
   guardian, employee, assistant).

   ئەرکەکانی:
   1) دەستپێکردنی OneSignal SDK کاتێک ئەپەکە وەک APK کراوەتەوە.
   2) تۆمارکردنی خۆکاری بەکارهێنەر (External ID + Role Tag) دوای چوونەژوورەوە.
   3) دابڕینی بەکارهێنەر (logout) کاتێک دەچێتەدەرەوە.
   4) فەنکشنی گشتی sendPushNotification() بۆ ناردنی ئاگاداری ڕاستەقینە،
      کە لە فایلەکانی admin.html / assistant.html / teacher.html بانگ دەکرێت.

   تێبینی ئاسایشی: REST API Key لێرە بە شێوەیەکی ئاشکرا هەیە (بە بڕیاری
   خاوەنی سیستەمەکە، بۆ سادەکردنی کار بەبێ سێرڤەری backend). ئەگەر
   دواتر ویستت پارێزراوتر بکەیت، دەکرێت ئەم بانگکردنە بگوازرێتەوە بۆ
   Firebase Cloud Function.
   ========================================================================== */

const ONESIGNAL_APP_ID = "f103e0e1-472e-4533-9661-31bd9c91f743";
// تێبینی گرنگ: REST API Key لێرە لانەبراوە! ئێستا کلیلەکە تەنها لەناو
// api/send-notification.js دەژیت (کۆدی سێرڤەر)، نەک لەم فایلە کە هەموو
// بەکارهێنەرێک لە وێبگەڕەکەیدا دەیبینێت (View Source). ئەمە هەم چارەسەری
// CORS ـە و هەم چاککردنەوەی کێشەیەکی ئاسایشی ڕاستەقینەیە — پێشتر کلیلی
// تایبەتی OneSignal ـت بۆ هەموو کەس ئاشکرا بوو.

console.log("[OneSignalDiag] onesignal-init.js file loaded and parsing started");
console.log("[OneSignalDiag] window.cordova exists? " + (!!window.cordova));
console.log("[OneSignalDiag] window.plugins exists? " + (!!window.plugins));
console.log("[OneSignalDiag] window.plugins.OneSignal exists? " + (!!(window.plugins && window.plugins.OneSignal)));

let oneSignalReady = false;

/* ---------- ١. دەستپێکردنی SDK ---------- */
function oneSignalBootstrap() {
    console.log("[OneSignalDiag] oneSignalBootstrap() called. window.plugins.OneSignal now = " + (!!(window.plugins && window.plugins.OneSignal)));
    // ئەم کۆدە تەنها لەناو APK ـدا کاردەکات (کاتێک cordova/capacitor بارکراوە).
    // لەسەر سایتی ئاسایی (وێبگەڕ) هیچ کارێک ناکات و هیچ هەڵەیەک دروست ناکات.
    if (!window.plugins || !window.plugins.OneSignal) {
        console.log("[OneSignalDiag] ABORTING init: window.plugins.OneSignal is not available.");
        return;
    }
    try {
        console.log("[OneSignalDiag] Calling OneSignal.initialize()...");
        const OneSignal = window.plugins.OneSignal;
        OneSignal.initialize(ONESIGNAL_APP_ID);
        console.log("[OneSignalDiag] initialize() called OK. Requesting permission...");
        OneSignal.Notifications.requestPermission(true);
        oneSignalReady = true;
        console.log("[OneSignalDiag] Bootstrap finished successfully.");

        // ئەگەر بەکارهێنەر پێشتر چوونەژوورەوەی کردبوو (Auto-Login)،
        // دووبارە External ID دابنێرەوە دوای دەستپێکردنی SDK.
        oneSignalRestoreIdentityFromStorage();
    } catch (e) {
        console.log("[OneSignalDiag] EXCEPTION during init: " + e.message);
        console.error("OneSignal init error:", e);
    }
}

console.log("[OneSignalDiag] Registering deviceready listener...");
document.addEventListener('deviceready', function() {
    console.log("[OneSignalDiag] deviceready EVENT FIRED");
    oneSignalBootstrap();
}, false);
// بۆ حاڵەتێک کە deviceready پێشتر ڕوویدابێت پێش بارکردنی ئەم فایلە:
if (window.cordova) {
    console.log("[OneSignalDiag] window.cordova present at parse time, scheduling fallback bootstrap in 1.5s");
    setTimeout(oneSignalBootstrap, 1500);
} else {
    console.log("[OneSignalDiag] window.cordova NOT present at parse time");
}

/* ---------- ٢. تۆمارکردنی ناسنامەی بەکارهێنەر ---------- */
/**
 * @param {string} externalId - ناسنامەی یەکتاکەی بەکارهێنەر (loginName/username/studentUsername)
 * @param {string} role - یەکێک لە: 'admin' | 'teacher' | 'assistant' | 'employee' | 'student' | 'guardian'
 * @param {object} extraTags - (ئارەزوومەندانەیە) تاگی زیادە، بۆ نموونە {level, group} بۆ خوێندکار
 */
function oneSignalSetIdentity(externalId, role, extraTags) {
    if (!externalId) return;
    localStorage.setItem('oneSignalIdentity', JSON.stringify({ externalId, role, extraTags: extraTags || {} }));

    if (!window.plugins || !window.plugins.OneSignal) return;
    try {
        const OneSignal = window.plugins.OneSignal;
        OneSignal.login(String(externalId));
        const tags = Object.assign({ role: role }, extraTags || {});
        OneSignal.User.addTags(tags);
    } catch (e) {
        console.error("OneSignal setIdentity error:", e);
    }
}

function oneSignalRestoreIdentityFromStorage() {
    const saved = localStorage.getItem('oneSignalIdentity');
    if (!saved) return;
    try {
        const { externalId, role, extraTags } = JSON.parse(saved);
        oneSignalSetIdentity(externalId, role, extraTags);
    } catch (e) { /* ignore */ }
}

function oneSignalClearIdentity() {
    localStorage.removeItem('oneSignalIdentity');
    if (!window.plugins || !window.plugins.OneSignal) return;
    try {
        window.plugins.OneSignal.logout();
    } catch (e) { /* ignore */ }
}

/* ---------- ٣. ناردنی Push Notification ---------- */
/**
 * target دەتوانێت یەکێک بێت لەمانە:
 *   { externalId: 'someLoginName' }              → یەک کەس
 *   { externalIds: ['a','b','c'] }                → چەند کەسی دیاریکراو
 *   { role: 'teacher' }                           → هەموو کەسانی ئەو ڕۆڵە
 *   { role: 'student', level: '1', group: 'A' }   → خوێندکارانی گرووپێکی دیاریکراو
 *   { includeAll: true }                          → هەموو بەکارهێنەرانی تۆمارکراو
 */
async function sendPushNotification(target, title, body) {
    if (!target || (!target.externalId && !target.externalIds && !target.role && !target.includeAll)) {
        return; // هیچ ئامانجێک دیارینەکراوە
    }

    // -----------------------------------------------------------------
    // وردەکاری گرنگ: OneSignal API ـی ڕاستەوخۆ (onesignal.com/api/v1/...)
    // داواکارییەکانی وێبگەڕ (Browser CORS) پشتگیری ناکات، تەنها داواکاری
    // سێرڤەر-بۆ-سێرڤەر قبوڵ دەکات. بۆیە لێرە بانگی /api/send-notification
    // دەکەین کە فەنکشنێکی Serverless ـە لەسەر Vercel و ئەویش وەک پرۆکسی
    // (Proxy) کار دەکات و داواکارییەکە بە سێرڤەر-بۆ-سێرڤەر دەگوازێتەوە بۆ
    // OneSignal — بەبێ هیچ کێشەیەکی CORS.
    //
    // ئەم Route ـە لە فایلی api/send-notification.js دانراوە کە دەبێت
    // لەگەڵ پڕۆژەکەت لەسەر Vercel دابمەزرێت (فۆڵدەری api/ لە ڕەگی
    // پڕۆژەکەدا، لای فایلەکانی index.html و admin.html هتد).
    // -----------------------------------------------------------------
    try {
        const response = await fetch("https://cis-sul-app.vercel.app/api/send-notification", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ target, title, body })
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            console.error("Push proxy error:", response.status, errData);
        }
    } catch (e) {
        // نۆتیفیکەیشن نەچوو، بەڵام پەیامەکە پێشتر لە Database دانراوە،
        // بۆیە هیچ کارێکی تر ناکەین جگە لە تۆمارکردنی هەڵەکە.
        console.error("OneSignal send error:", e);
    }
}
