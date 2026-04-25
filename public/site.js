// Shared site chrome — injects:
//   1. A top ad slot (Google AdSense placeholder) right under the topnav.
//   2. The footer (with partners / friends from the EU links for SEO).
// Crawlers and modern browsers both render JS, so this keeps the site DRY
// without hurting SEO. Static <head> meta still lives in each page's HTML.

(function () {
  // ---------------- Theme (light / dark) ----------------
  // Apply stored theme as early as possible to minimize flash. The homepage
  // (index.html) has its own inline early-init; here we cover all other pages.
  var THEME_KEY = 'utilitytools.theme';
  function getStoredTheme() {
    try { return localStorage.getItem(THEME_KEY); } catch (_) { return null; }
  }
  function applyTheme(t) {
    if (t === 'dark') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', 'light');
    var btn = document.querySelector('.theme-toggle');
    if (btn) {
      var isLight = t !== 'dark';
      btn.textContent = isLight ? '🌙' : '☀';
      btn.setAttribute('aria-label', isLight ? 'Switch to dark mode' : 'Switch to light mode');
      btn.setAttribute('title', isLight ? 'Switch to dark mode' : 'Switch to light mode');
      btn.setAttribute('aria-pressed', isLight ? 'true' : 'false');
    }
  }
  applyTheme(getStoredTheme() === 'dark' ? 'dark' : 'light');

  function injectThemeToggle() {
    if (document.querySelector('.theme-toggle')) return;
    var nav = document.querySelector('.topnav nav') || document.querySelector('.topnav');
    if (!nav) return;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'theme-toggle';
    nav.appendChild(btn);
    btn.addEventListener('click', function () {
      var next = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      try { localStorage.setItem(THEME_KEY, next); } catch (_) {}
      applyTheme(next);
    });
    applyTheme(getStoredTheme() === 'dark' ? 'dark' : 'light');
  }
  // Sync across tabs
  window.addEventListener('storage', function (e) {
    if (e.key === THEME_KEY) applyTheme(e.newValue === 'dark' ? 'dark' : 'light');
  });

  // ---------------- Google AdSense loader ----------------
  // Inject the AdSense script tag once, on every page that loads site.js.
  // (index.html has it inline in <head>.)
  var ADSENSE_CLIENT = 'ca-pub-5700080992080321';
  (function injectAdsense() {
    if (document.querySelector('script[src*="adsbygoogle.js"]')) return;
    var s = document.createElement('script');
    s.async = true;
    s.crossOrigin = 'anonymous';
    s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + ADSENSE_CLIENT;
    document.head.appendChild(s);
    // Help AdSense identify the publisher when verifying the site.
    if (!document.querySelector('meta[name="google-adsense-account"]')) {
      var m = document.createElement('meta');
      m.name = 'google-adsense-account';
      m.content = ADSENSE_CLIENT;
      document.head.appendChild(m);
    }
  })();

  // Fill any existing <aside class="ad-slot"> placeholders with a real <ins>
  // so Google has an explicit anchor to render an ad unit. Auto-ads will also
  // place ads elsewhere on the page where appropriate.
  function fillAdSlot(slot) {
    if (!slot || slot.querySelector('ins.adsbygoogle')) return;
    var ins = document.createElement('ins');
    ins.className = 'adsbygoogle';
    ins.style.display = 'block';
    ins.setAttribute('data-ad-client', ADSENSE_CLIENT);
    ins.setAttribute('data-ad-format', 'auto');
    ins.setAttribute('data-full-width-responsive', 'true');
    slot.appendChild(ins);
    try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (_) {}
  }

  // ---------------- Tag <body> as a tool-page (for full-width layout) ----------------
  // site.js is included on tool pages and on long-form content pages (blog/about/legal).
  // Tools live at single-segment URLs like /json, /password, /cv. Long-form pages live
  // under /blog, /about, /privacy, /terms, /disclaimer. Anything else = tool page.
  (function tagToolPage() {
    var p = (location.pathname || '/').toLowerCase().replace(/\/$/, '');
    var contentPaths = ['/about', '/privacy', '/terms', '/disclaimer'];
    var isContent = p === '' || p === '/' || p.indexOf('/blog') === 0 || contentPaths.indexOf(p) !== -1;
    if (!isContent) document.body.classList.add('tool-page');
  })();

  // ---------------- Back-to-tools link (tool pages only) ----------------
  // Inject a single, consistent "← Back to all tools" link at the top of every
  // tool page, so users can always get back to the index without using the
  // browser back button. Skip if the page already has one.
  (function injectBackLink() {
    if (!document.body.classList.contains('tool-page')) return;
    if (document.querySelector('.back-to-tools')) return;
    var main = document.querySelector('main.container') || document.querySelector('main');
    if (!main) return;
    var a = document.createElement('a');
    a.className = 'back-to-tools';
    a.href = '/';
    a.setAttribute('aria-label', 'Back to all tools');
    a.innerHTML = '<span aria-hidden="true">←</span> Back to all tools';
    // Insert as the very first child of <main> so it sits above the tool header.
    main.insertBefore(a, main.firstChild);
  })();
  // ---------------- 1) Top ad slot ----------------
  // Skip if the page already has one, or opted out via <body data-no-ads>.
  if (!document.querySelector('.ad-slot.ad-top') && !document.body.dataset.noAds) {
    const main = document.querySelector('main') || document.body;
    const ad = document.createElement('aside');
    ad.className = 'ad-slot ad-top';
    ad.setAttribute('aria-label', 'Advertisement');
    ad.innerHTML = '<span class="ad-label">Advertisement</span>';
    main.insertBefore(ad, main.firstChild);
  }

  // Fill every ad-slot on the page (top + inline) with a real <ins>.
  if (!document.body.dataset.noAds) {
    document.querySelectorAll('.ad-slot').forEach(fillAdSlot);
  }

  // Inject the theme toggle now (topnav is in the DOM on every page).
  injectThemeToggle();

  // ---------------- 2) Footer ----------------
  if (document.querySelector('footer.site-footer')) return;

  const footer = document.createElement('footer');
  footer.className = 'site-footer';
  footer.innerHTML = `
    <div class="footer-inner">
      <div>
        <h4>UtilityTools.eu</h4>
        <p>A free European alternative for everyday online utilities. Zero tracking, zero accounts, zero data uploads — every tool runs locally in your browser.</p>
      </div>
      <div>
        <h4>Tools</h4>
        <a href="/json">JSON Formatter</a>
        <a href="/password">Password Generator</a>
        <a href="/cv">CV Maker</a>
        <a href="/budget">Budget Calculator</a>
      </div>
      <div>
        <h4>Site</h4>
        <a href="/">All tools</a>
        <a href="/blog">Blog</a>
        <a href="/about">About</a>
      </div>
      <div class="partners-col">
        <h4>Friends from the EU 🇪🇺</h4>
        <a href="https://secureeu.eu" rel="noopener" target="_blank" title="Secure file transfer — European alternative to WeTransfer">SecureEU.eu — EU file transfer</a>
        <a href="https://davaleba.com" rel="noopener" target="_blank" title="Davaleba — order management for restaurants">Davaleba.com — order management</a>
        <a href="https://assignme.io" rel="noopener" target="_blank" title="AssignMe — task & order assignment app">AssignMe.io — task assignment</a>
        <a href="https://ordreportalen.dk" rel="noopener" target="_blank" title="Ordreportalen — Danish order portal">Ordreportalen.dk — order portal (DK)</a>
      </div>
      <div>
        <h4>Legal</h4>
        <a href="/disclaimer">Disclaimer</a>
        <a href="/privacy">Privacy</a>
        <a href="/terms">Terms</a>
      </div>
    </div>
    <div class="footer-bottom">
      <span>&copy; ${new Date().getFullYear()} UtilityTools.eu &middot; Made in the EU 🇪🇺</span>
      <span>Hosted on DigitalOcean · Frankfurt 🇩🇪 · No database · No tracking · Ads by Google AdSense</span>
    </div>`;
  document.body.appendChild(footer);

  // Re-call after footer in case theme toggle wasn't reachable earlier (no-op if already injected).
  injectThemeToggle();
})();


