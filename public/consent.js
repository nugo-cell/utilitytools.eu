// Consent management — two-step UX:
//   1. On first visit, show a SUBTLE cookie banner at the bottom-center.
//      Buttons: Accept · Read more · Decline.
//   2. "Read more" or "Decline" opens the friendly full-screen modal
//      ("dad of two" plea). Modal buttons: Accept · Leave.
//
// AdSense is loaded only after consent. A periodic guard (every 5s) re-shows
// the banner if consent is missing or expired.
//
// Stored as JSON in localStorage:
//   { v: 1, ok: true, ts: 1714000000000 }   (consented; expires after EXPIRY_MS)

(function () {
  var KEY        = 'utilitytools.consent.v1';
  var EXPIRY_MS  = 1000 * 60 * 60 * 24 * 180;   // 180 days
  var CHECK_MS   = 5000;                         // guard interval
  var ADSENSE_CLIENT = 'ca-pub-5700080992080321';

  // ---------- helpers ----------
  function readConsent() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return null;
      var obj = JSON.parse(raw);
      if (!obj || obj.ok !== true || typeof obj.ts !== 'number') return null;
      if (Date.now() - obj.ts > EXPIRY_MS) return null;
      return obj;
    } catch (_) { return null; }
  }
  function writeConsent() {
    try {
      localStorage.setItem(KEY, JSON.stringify({ v: 1, ok: true, ts: Date.now() }));
    } catch (_) {}
    try { document.dispatchEvent(new Event('utconsent:granted')); } catch (_) {}
  }
  function clearConsent() {
    try { localStorage.removeItem(KEY); } catch (_) {}
  }

  // ---------- AdSense loader (only after consent) ----------
  var adsenseInjected = false;
  function injectAdsense() {
    if (adsenseInjected) return;
    if (document.querySelector('script[src*="adsbygoogle.js"]')) { adsenseInjected = true; return; }
    var s = document.createElement('script');
    s.async = true;
    s.crossOrigin = 'anonymous';
    s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + ADSENSE_CLIENT;
    document.head.appendChild(s);
    if (!document.querySelector('meta[name="google-adsense-account"]')) {
      var m = document.createElement('meta');
      m.name = 'google-adsense-account'; m.content = ADSENSE_CLIENT;
      document.head.appendChild(m);
    }
    adsenseInjected = true;
    document.querySelectorAll('ins.adsbygoogle').forEach(function () {
      try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (_) {}
    });
  }

  // ---------- Bottom-center cookie banner (subtle) ----------
  function buildBanner() {
    var existing = document.getElementById('utCookieBar');
    if (existing) return existing;
    var bar = document.createElement('div');
    bar.id = 'utCookieBar';
    bar.setAttribute('role', 'region');
    bar.setAttribute('aria-label', 'Cookie & ads consent');
    bar.innerHTML = ''
      + '<div class="ut-cookie-text">'
      +   '🍪 We use <strong>Google AdSense</strong> cookies to keep this site free. '
      +   'No tracking, no analytics — just the ads. '
      +   '<a href="/privacy" target="_blank" rel="noopener">Privacy</a>'
      + '</div>'
      + '<div class="ut-cookie-actions">'
      +   '<button type="button" class="ut-cookie-more"     id="utCookieMore">Read more</button>'
      +   '<button type="button" class="ut-cookie-decline"  id="utCookieDecline">Decline</button>'
      +   '<button type="button" class="ut-cookie-accept"   id="utCookieAccept">Accept</button>'
      + '</div>';
    document.body.appendChild(bar);
    document.getElementById('utCookieAccept').addEventListener('click', grant);
    document.getElementById('utCookieMore').addEventListener('click', showModal);
    document.getElementById('utCookieDecline').addEventListener('click', showModal);
    return bar;
  }
  function showBanner() {
    if (document.getElementById('utConsentModal') &&
        document.getElementById('utConsentModal').classList.contains('show')) return;
    var b = buildBanner();
    requestAnimationFrame(function () { b.classList.add('show'); });
  }
  function hideBanner() {
    var b = document.getElementById('utCookieBar');
    if (b) b.classList.remove('show');
  }

  // ---------- Friendly full-screen modal (escalation) ----------
  function buildModal() {
    var existing = document.getElementById('utConsentModal');
    if (existing) return existing;
    var wrap = document.createElement('div');
    wrap.id = 'utConsentModal';
    wrap.setAttribute('role', 'dialog');
    wrap.setAttribute('aria-modal', 'true');
    wrap.setAttribute('aria-labelledby', 'utConsentTitle');
    wrap.innerHTML = ''
      + '<div class="ut-consent-backdrop"></div>'
      + '<div class="ut-consent-card">'
      +   '<div class="ut-consent-emoji" aria-hidden="true">👨‍👧‍👦</div>'
      +   '<h2 id="utConsentTitle">Hey — quick word before you go</h2>'
      +   '<p>I\'m an independent EU developer and a <strong>dad of two</strong>. I built UtilityTools.eu in my evenings so you can have <strong>70+ free, privacy-friendly tools</strong> that run entirely in your browser — no signup, no tracking, no data uploads. Ever.</p>'
      +   '<p>To keep the site online I run a single, polite ad provider: <strong>Google AdSense</strong>. That\'s the only way I get paid for this. Could you let me show you those ads while you use the site? It really helps. ❤️</p>'
      +   '<ul class="ut-consent-points">'
      +     '<li>✅ Tools always run 100% in your browser — your inputs never leave your device.</li>'
      +     '<li>✅ No analytics, no tracking pixels, no data sold.</li>'
      +     '<li>✅ Hosted in Frankfurt 🇩🇪 — EU jurisdiction.</li>'
      +     '<li>🍪 AdSense may set cookies to show relevant ads — full details on the <a href="/privacy" target="_blank" rel="noopener">privacy page</a>.</li>'
      +   '</ul>'
      +   '<div class="ut-consent-actions">'
      +     '<button type="button" class="ut-consent-accept" id="utConsentAccept">Sure — show ads & let me use the tools</button>'
      +     '<a class="ut-consent-leave" href="https://duckduckgo.com/" rel="noopener">No thanks, I\'ll leave</a>'
      +   '</div>'
      +   '<p class="ut-consent-fine">By clicking accept you consent to Google AdSense cookies. You can withdraw consent any time from the footer link.</p>'
      + '</div>';
    document.body.appendChild(wrap);
    document.getElementById('utConsentAccept').addEventListener('click', grant);
    return wrap;
  }
  function showModal() {
    hideBanner();
    var m = buildModal();
    m.classList.add('show');
    document.documentElement.classList.add('ut-consent-locked');
  }
  function hideModal() {
    var m = document.getElementById('utConsentModal');
    if (m) m.classList.remove('show');
    document.documentElement.classList.remove('ut-consent-locked');
  }

  // ---------- Public API ----------
  function grant() {
    writeConsent();
    hideBanner();
    hideModal();
    injectAdsense();
  }
  window.UTConsent = {
    has: function () { return !!readConsent(); },
    grant: grant,
    revoke: function () { clearConsent(); hideModal(); showBanner(); },
    onReady: function (cb) {
      if (readConsent()) cb();
      else document.addEventListener('utconsent:granted', cb, { once: true });
    }
  };

  // ---------- Boot ----------
  function boot() {
    if (readConsent()) injectAdsense();
    else showBanner();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  // ---------- Guard ----------
  // If consent disappeared (cleared, expired, etc.) and neither UI is open,
  // show the subtle banner again. We don't escalate to modal automatically —
  // only the user can escalate by clicking Decline/Read-more.
  setInterval(function () {
    if (readConsent()) return;
    var modal = document.getElementById('utConsentModal');
    if (modal && modal.classList.contains('show')) return;
    var bar = document.getElementById('utCookieBar');
    if (bar && bar.classList.contains('show')) return;
    showBanner();
  }, CHECK_MS);

  document.addEventListener('visibilitychange', function () {
    if (!document.hidden && !readConsent()) showBanner();
  });
  window.addEventListener('storage', function (e) {
    if (e.key === KEY && !readConsent()) showBanner();
  });
})();

