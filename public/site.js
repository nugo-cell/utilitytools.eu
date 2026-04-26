// Shared site chrome — injects:
//   1. Theme (light/dark) + early-init.
//   2. Favicon, manifest, og:image (so we don't have to repeat in every HTML).
//   3. AdSense loader via /consent.js (Google Auto Ads handles placement itself).
//   4. The footer (with EU friends links + a "Consent settings" link).
//   5. A JSON-LD <SoftwareApplication> block per tool page (SEO).
//   6. A "Related tools" block at the bottom of each tool page.
//   7. Recently-used tracking (per slug, in localStorage).

(function () {
  // ---------------- Consent loader ----------------
  // Auto-inject /consent.js into <head> so we don't have to edit 70 tool HTMLs.
  // consent.js owns the AdSense loader + the mandatory consent modal + guard.
  (function injectConsent() {
    if (document.querySelector('script[src="/consent.js"]')) return;
    var s = document.createElement('script');
    s.src = '/consent.js';
    document.head.appendChild(s);
  })();

  // ---------------- Theme (light / dark) ----------------
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
  window.addEventListener('storage', function (e) {
    if (e.key === THEME_KEY) applyTheme(e.newValue === 'dark' ? 'dark' : 'light');
  });

  // ---------------- Favicon / manifest / og:image ----------------
  (function injectHeadTags() {
    var head = document.head;
    function ensure(sel, build) {
      if (document.querySelector(sel)) return;
      head.appendChild(build());
    }
    ensure('link[rel="icon"]', function () {
      var l = document.createElement('link');
      l.rel = 'icon'; l.type = 'image/svg+xml'; l.href = '/favicon.svg';
      return l;
    });
    ensure('link[rel="apple-touch-icon"]', function () {
      var l = document.createElement('link');
      l.rel = 'apple-touch-icon'; l.href = '/favicon.svg';
      return l;
    });
    ensure('link[rel="manifest"]', function () {
      var l = document.createElement('link');
      l.rel = 'manifest'; l.href = '/site.webmanifest';
      return l;
    });
    ensure('meta[name="theme-color"][media*="light"]', function () {
      var m = document.createElement('meta');
      m.name = 'theme-color'; m.media = '(prefers-color-scheme: light)'; m.content = '#ffffff';
      return m;
    });
    ensure('meta[name="theme-color"]:not([media])', function () {
      var m = document.createElement('meta');
      m.name = 'theme-color'; m.content = '#0a0e1a';
      return m;
    });
    ensure('meta[property="og:image"]', function () {
      var m = document.createElement('meta');
      m.setAttribute('property', 'og:image'); m.content = 'https://utilitytools.eu/og-image.svg';
      return m;
    });
    ensure('meta[property="og:site_name"]', function () {
      var m = document.createElement('meta');
      m.setAttribute('property', 'og:site_name'); m.content = 'UtilityTools.eu';
      return m;
    });
  })();

  // ---------------- Page classification ----------------
  var path = (location.pathname || '/').toLowerCase().replace(/\/$/, '');
  var contentPaths = ['/about', '/privacy', '/terms', '/disclaimer', '/contact'];
  var isHome = path === '' || path === '/';
  var isContent = isHome || path.indexOf('/blog') === 0 || contentPaths.indexOf(path) !== -1;
  var isToolPage = !isContent;
  if (isToolPage) document.body.classList.add('tool-page');
  var currentSlug = isToolPage ? path.replace(/^\//, '').split('/')[0] : null;

  // ---------------- Back-to-tools link (tool pages only) ----------------
  (function injectBackLink() {
    if (!isToolPage) return;
    if (document.querySelector('.back-to-tools')) return;
    var main = document.querySelector('main.container') || document.querySelector('main');
    if (!main) return;
    var a = document.createElement('a');
    a.className = 'back-to-tools';
    a.href = '/';
    a.setAttribute('aria-label', 'Back to all tools');
    a.innerHTML = '<span aria-hidden="true">←</span> Back to all tools';
    main.insertBefore(a, main.firstChild);
  })();

  // ---------------- Track "recently used" ----------------
  (function trackRecent() {
    if (!currentSlug) return;
    try {
      var KEY = 'utilitytools.recent';
      var arr = JSON.parse(localStorage.getItem(KEY) || '[]');
      if (!Array.isArray(arr)) arr = [];
      arr = arr.filter(function (s) { return s !== currentSlug; });
      arr.unshift(currentSlug);
      arr = arr.slice(0, 8);
      localStorage.setItem(KEY, JSON.stringify(arr));
    } catch (_) {}
  })();

  // ---------------- Ad slots ----------------
  // Removed: Google AdSense Auto Ads (loaded via consent.js) handles placement.

  injectThemeToggle();

  // ---------------- Per-tool SEO + Related tools ----------------
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function renderRelatedTools(tools, current) {
    if (!current || !Array.isArray(tools)) return;
    if (document.querySelector('.related-tools')) return;
    var related = tools
      .filter(function (x) {
        if (x.slug === current.slug) return false;
        return x.tags.some(function (tag) { return current.tags.indexOf(tag) !== -1; });
      })
      .sort(function () { return Math.random() - 0.5; })
      .slice(0, 6);
    if (!related.length) return;
    var main = document.querySelector('main.container') || document.querySelector('main');
    if (!main) return;
    var sec = document.createElement('section');
    sec.className = 'related-tools';
    sec.innerHTML = '<h3>You might also like</h3><div class="related-grid">'
      + related.map(function (r) {
          return '<a href="/' + r.slug + '"><strong>' + escapeHtml(r.name) + '</strong><span>' + escapeHtml(r.desc) + '</span></a>';
        }).join('')
      + '</div>';
    main.appendChild(sec);
  }
  if (isToolPage && currentSlug) {
    fetch('/api/tools').then(function (r) { return r.json(); }).then(function (data) {
      var tools = (data && data.tools) || [];
      var t = tools.find(function (x) { return x.slug === currentSlug; });
      if (!t) return;
      if (!document.querySelector('script[type="application/ld+json"][data-tool]')) {
        var ld = document.createElement('script');
        ld.type = 'application/ld+json';
        ld.setAttribute('data-tool', t.slug);
        ld.textContent = JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'SoftwareApplication',
          'name': t.name,
          'description': t.desc,
          'applicationCategory': 'UtilityApplication',
          'operatingSystem': 'Any (browser)',
          'url': 'https://utilitytools.eu/' + t.slug,
          'isAccessibleForFree': true,
          'browserRequirements': 'Requires JavaScript. Requires HTML5.',
          'offers': { '@type': 'Offer', 'price': '0', 'priceCurrency': 'EUR' },
          'publisher': { '@type': 'Organization', 'name': 'UtilityTools.eu', 'url': 'https://utilitytools.eu/' }
        });
        document.head.appendChild(ld);
      }
      if (!document.querySelector('meta[name="description"]')) {
        var md = document.createElement('meta');
        md.name = 'description'; md.content = t.desc;
        document.head.appendChild(md);
      }
      renderRelatedTools(tools, t);
    }).catch(function () { /* offline - silent */ });
  }

  // ---------------- Footer ----------------
  if (document.querySelector('footer.site-footer')) return;

  var footer = document.createElement('footer');
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
        <a href="/contact">Contact</a>
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
        <a href="#" id="utConsentRevoke">Consent settings</a>
      </div>
    </div>
    <div class="footer-bottom">
      <span>&copy; ${new Date().getFullYear()} UtilityTools.eu &middot; Made in the EU 🇪🇺</span>
      <span>Hosted on DigitalOcean · Frankfurt 🇩🇪 · No database · No tracking · Ads by Google AdSense</span>
    </div>`;
  document.body.appendChild(footer);

  var revoke = document.getElementById('utConsentRevoke');
  if (revoke) revoke.addEventListener('click', function (e) {
    e.preventDefault();
    if (window.UTConsent) window.UTConsent.revoke();
  });

  injectThemeToggle();
})();

