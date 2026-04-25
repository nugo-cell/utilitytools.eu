// Utility Tools - Node + Express server

const express = require('express');
const helmet = require('helmet');
const path = require('path');
const http = require('http');
const { WebSocketServer } = require('ws');

const app = express();
const PORT = process.env.PORT || 3000;
const SITE_URL = process.env.SITE_URL || (process.env.NODE_ENV === 'production' ? 'https://utilitytools.eu' : `http://localhost:${PORT}`);

// ---------------- Security headers ----------------
// Helmet adds CSP, HSTS, X-Content-Type-Options, Referrer-Policy, etc.
// CSP is hand-tuned to allow Google AdSense + the public CDNs the tools use.
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      'default-src': ["'self'"],
      'script-src': [
        "'self'",
        "'unsafe-inline'", // tool pages have inline scripts; refactor later
        'https://pagead2.googlesyndication.com',
        'https://*.googlesyndication.com',
        'https://*.doubleclick.net',
        'https://*.google.com',
        'https://*.gstatic.com',
        'https://cdn.jsdelivr.net',
        'https://cdnjs.cloudflare.com',
        'https://unpkg.com'
      ],
      'style-src': ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net', 'https://cdnjs.cloudflare.com'],
      'img-src': ["'self'", 'data:', 'blob:', 'https:'],
      'media-src': ["'self'", 'data:', 'blob:'],
      'font-src': ["'self'", 'data:', 'https://cdn.jsdelivr.net', 'https://cdnjs.cloudflare.com'],
      'connect-src': ["'self'", 'ws:', 'wss:', 'https://*.googlesyndication.com', 'https://*.doubleclick.net', 'https://*.google.com'],
      'frame-src':  ['https://*.googlesyndication.com', 'https://*.doubleclick.net', 'https://*.google.com'],
      'object-src': ["'none'"],
      'base-uri':   ["'self'"],
      'form-action': ["'self'", 'mailto:']
    }
  },
  // Allow cross-origin loading of our own static SVGs etc. for og:image
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginEmbedderPolicy: false
}));

const TOOLS = [
  { slug: 'json',      name: 'JSON Formatter',          file: 'tools/json-formatter.html', icon: '{}',   tags: ['developer','text'],           desc: 'Pretty-print, minify, and validate JSON.' },
  { slug: 'base64',    name: 'Base64 Encode/Decode',    file: 'tools/base64.html',         icon: 'B64',  tags: ['developer','encoder'],        desc: 'Encode and decode Base64 strings.' },
  { slug: 'url',       name: 'URL Encode/Decode',       file: 'tools/url-encoder.html',    icon: '%20',  tags: ['developer','encoder'],        desc: 'Percent-encode and decode URL components.' },
  { slug: 'uuid',      name: 'UUID Generator',          file: 'tools/uuid.html',           icon: 'ID',   tags: ['developer','generator'],      desc: 'Generate v4 UUIDs, single or in bulk.' },
  { slug: 'hash',      name: 'Hash Generator',          file: 'tools/hash.html',           icon: '#',    tags: ['developer','security'],       desc: 'Compute SHA-1, SHA-256, SHA-384, SHA-512.' },
  { slug: 'regex',     name: 'Regex Tester',            file: 'tools/regex.html',          icon: '/./',  tags: ['developer','text'],           desc: 'Test regular expressions against sample text.' },
  { slug: 'timestamp', name: 'Unix Timestamp',          file: 'tools/timestamp.html',      icon: 'T',    tags: ['developer','time'],           desc: 'Convert between Unix time and dates.' },
  { slug: 'timezones', name: 'World Clock & Time Zones',file: 'tools/timezones.html',      icon: '🌍',  tags: ['time','productivity','home'], desc: 'Set a time in city A and instantly see it in cities worldwide. DST-aware meeting planner.' },
  { slug: 'json-csv',  name: 'JSON / CSV',              file: 'tools/json-csv.html',       icon: 'CSV',  tags: ['developer','converter'],      desc: 'Convert between JSON and CSV format.' },
  { slug: 'count',     name: 'Text Counter',            file: 'tools/text-counter.html',   icon: 'Sum',  tags: ['text','writing'],             desc: 'Count characters, words, lines, bytes, and read-time.' },
  { slug: 'case',      name: 'Case Converter',          file: 'tools/case.html',           icon: 'Aa',   tags: ['text','writing'],             desc: 'Convert between upper, lower, title, snake, camel, kebab.' },
  { slug: 'scramble',  name: 'Word Scrambler',          file: 'tools/scramble.html',       icon: 'Mix',  tags: ['text','fun','kids'],          desc: 'Randomly scramble letters in words. Great for quizzes.' },
  { slug: 'lorem',     name: 'Lorem Ipsum',             file: 'tools/lorem.html',          icon: 'Lp',   tags: ['text','writing','generator'], desc: 'Generate placeholder text for designs and mockups.' },
  { slug: 'password',  name: 'Password Generator',      file: 'tools/password.html',       icon: '***',  tags: ['security','generator'],       desc: 'Generate strong random passwords.' },
  { slug: 'qr',        name: 'QR Code Generator',       file: 'tools/qr.html',             icon: 'QR',   tags: ['generator','utility'],        desc: 'Generate a QR code from text or URL.' },
  { slug: 'color',     name: 'Color Converter',         file: 'tools/color.html',          icon: 'RGB',  tags: ['design','developer'],         desc: 'Convert between HEX, RGB, and HSL.' },
  { slug: 'budget',    name: 'Budget Calculator',       file: 'tools/budget.html',         icon: '$',    tags: ['money','home','printable'],   desc: 'Track income and expenses. Print a clean report.' },
  { slug: 'mathtable', name: 'Multiplication Table',    file: 'tools/mathtable.html',      icon: 'x',    tags: ['kids','printable','math'],    desc: 'Printable multiplication tables for practice.' },
  { slug: 'cv',        name: 'CV / Resume Maker',       file: 'tools/cv.html',             icon: 'CV',   tags: ['documents','printable'],      desc: '5 templates, photo, social links, projects, languages, autosave, JSON import/export. Print to PDF.' },
  { slug: 'docx-pdf',  name: 'DOCX to PDF',             file: 'tools/docx-pdf.html',       icon: 'PDF',  tags: ['documents','converter'],      desc: 'Convert Word (.docx) documents to PDF in the browser.' },
  { slug: 'markdown',  name: 'Markdown Preview',        file: 'tools/markdown.html',       icon: 'MD',   tags: ['developer','writing','text'], desc: 'Live Markdown editor with HTML preview and export.' },
  { slug: 'diff',      name: 'Text Diff Checker',       file: 'tools/diff.html',           icon: 'Dif',  tags: ['developer','text'],           desc: 'Compare two texts line by line - see additions and removals.' },
  { slug: 'jwt',       name: 'JWT Decoder',             file: 'tools/jwt.html',            icon: 'JWT',  tags: ['developer','security'],       desc: 'Decode the header and payload of any JSON Web Token.' },
  { slug: 'slug',      name: 'Slugify',                 file: 'tools/slug.html',           icon: '/-/',  tags: ['developer','writing','text'], desc: 'Turn any text into a clean URL-safe slug.' },
  { slug: 'base',      name: 'Number Base Converter',   file: 'tools/base.html',           icon: '0x',   tags: ['developer','math'],           desc: 'Convert between binary, octal, decimal, and hex (BigInt safe).' },
  { slug: 'tip',       name: 'Tip & Bill Splitter',     file: 'tools/tip.html',            icon: '%',    tags: ['money','home'],               desc: 'Calculate tip and split a bill among any number of people.' },
  { slug: 'bmi',       name: 'BMI Calculator',          file: 'tools/bmi.html',            icon: 'BMI',  tags: ['home','health'],              desc: 'Body Mass Index calculator with metric and imperial units.' },
  { slug: 'age',       name: 'Age Calculator',          file: 'tools/age.html',            icon: 'Age',  tags: ['home','time'],                desc: 'Exact age in years, months, days, weeks and hours.' },
  { slug: 'pomodoro',  name: 'Pomodoro Timer',          file: 'tools/pomodoro.html',       icon: 'Pom',  tags: ['productivity','time'],        desc: 'Distraction-free Pomodoro timer with focus and breaks.' },
  { slug: 'gradient',  name: 'CSS Gradient',            file: 'tools/gradient.html',       icon: 'Grd',  tags: ['design','developer'],         desc: 'Visually build CSS linear and radial gradients.' },
  { slug: 'mathquiz',  name: 'Math Quiz for Kids',      file: 'tools/mathquiz.html',       icon: '+-',   tags: ['kids','math','fun'],          desc: 'Practice arithmetic with score, timer, and difficulty levels.' },
  { slug: 'spelling',  name: 'Spelling Practice',       file: 'tools/spelling.html',       icon: 'Sp',   tags: ['kids','writing','fun'],       desc: 'Hear and spell - perfect for weekly school spelling lists.' },
  { slug: 'storyidea', name: 'Story Idea Generator',    file: 'tools/storyidea.html',      icon: 'Sty',  tags: ['kids','writing','fun'],       desc: 'Random hero, place, object & problem to spark creative writing.' },
  { slug: 'memory',    name: 'Memory Match',            file: 'tools/memory.html',         icon: 'Mem',  tags: ['kids','fun','game'],          desc: 'Classic flip-the-cards memory game with emojis.' },
  { slug: 'roman',     name: 'Roman Numeral Converter', file: 'tools/roman.html',          icon: 'XII',  tags: ['kids','math','converter'],    desc: 'Convert between numbers and Roman numerals (1 - 3,999,999).' },
  { slug: 'calories',     name: 'Calorie Calculator',      file: 'tools/calories.html',     icon: 'Cal',  tags: ['home','health','fitness'],    desc: 'BMR, TDEE & daily calorie target with macro split. Mifflin-St Jeor, metric or imperial.' },
  { slug: 'json-to-code', name: 'JSON / XML to Code',      file: 'tools/json-to-code.html', icon: 'JX',   tags: ['developer','converter'],      desc: 'Generate TypeScript, JavaScript, C#, Python, or C type definitions from JSON or XML.' },
  { slug: 'pdf-editor',   name: 'PDF Editor',              file: 'tools/pdf-editor.html',   icon: 'Pdf',  tags: ['documents','converter'],      desc: 'Reorder, rotate, delete pages, and merge multiple PDFs. Browser-only, no upload.' },
  { slug: 'pdf-signer',   name: 'PDF Signer',              file: 'tools/pdf-signer.html',   icon: 'Sgn',  tags: ['documents','security'],       desc: 'Draw or type a signature, place it on any PDF page, download the signed file.' },
  { slug: 'excel-table',  name: 'Excel / CSV to Table',    file: 'tools/excel-table.html',  icon: 'Xls',  tags: ['documents','converter'],      desc: 'Open Excel/CSV/ODS files, search, sort, and print or export — all in your browser.' },
  { slug: 'xml',          name: 'XML Formatter',           file: 'tools/xml.html',          icon: 'XML',  tags: ['developer','text'],           desc: 'Pretty-print, minify and validate XML in your browser.' },

  // -------- Image Toolkit (browser-only, no upload) --------
  { slug: 'img-compress',     name: 'Image Compressor',         file: 'tools/img-compress.html',     icon: 'Cmp', tags: ['image','design'],            desc: 'Compress JPG, PNG, WebP with a quality slider. See size before/after.' },
  { slug: 'img-convert',      name: 'Image Converter',          file: 'tools/img-convert.html',      icon: 'Cvt', tags: ['image','converter'],         desc: 'Convert images between JPG, PNG, WebP and AVIF (where supported).' },
  { slug: 'img-resize',       name: 'Image Resizer',            file: 'tools/img-resize.html',       icon: 'Rsz', tags: ['image','design'],            desc: 'Resize images with aspect ratio lock and social media presets.' },
  { slug: 'img-crop',         name: 'Image Crop Tool',          file: 'tools/img-crop.html',         icon: 'Crp', tags: ['image','design'],            desc: 'Interactive crop with free or 1:1, 4:3, 16:9, 9:16 ratios.' },
  { slug: 'img-rotate',       name: 'Rotate & Flip Image',      file: 'tools/img-rotate.html',       icon: 'Rot', tags: ['image','design'],            desc: 'Rotate 90/180/270° and flip horizontally or vertically.' },
  { slug: 'img-watermark',    name: 'Watermark Tool',           file: 'tools/img-watermark.html',    icon: 'Wmk', tags: ['image','design'],            desc: 'Add a text or image watermark with size, opacity and position controls.' },
  { slug: 'img-annotate',     name: 'Image Annotator',          file: 'tools/img-annotate.html',     icon: 'Ann', tags: ['image','design'],            desc: 'Draw arrows, rectangles, circles and text on any image.' },
  { slug: 'img-blur',         name: 'Blur / Pixelate',          file: 'tools/img-blur.html',         icon: 'Blr', tags: ['image','security'],          desc: 'Hide private information by blurring or pixelating any region.' },
  { slug: 'img-meme',         name: 'Meme Generator',           file: 'tools/img-meme.html',         icon: 'Mem', tags: ['image','fun'],               desc: 'Add bold top and bottom text to any image, classic meme style.' },
  { slug: 'img-base64',       name: 'Image to Base64',          file: 'tools/img-base64.html',       icon: 'B64', tags: ['image','developer','converter'], desc: 'Convert any image to a Base64 data URL with a copy button.' },
  { slug: 'base64-img',       name: 'Base64 to Image',          file: 'tools/base64-img.html',       icon: '→IMG',tags: ['image','developer','converter'], desc: 'Paste a Base64 string and preview or download the image.' },
  { slug: 'img-exif',         name: 'EXIF Viewer / Remover',    file: 'tools/img-exif.html',         icon: 'EXIF',tags: ['image','security'],          desc: 'Show EXIF metadata, then strip it by re-encoding via canvas.' },
  { slug: 'img-color-picker', name: 'Color Picker from Image',  file: 'tools/img-color-picker.html', icon: 'Pck', tags: ['image','design'],            desc: 'Click any pixel to read HEX, RGB and HSL values.' },
  { slug: 'img-favicon',      name: 'Favicon Generator',        file: 'tools/img-favicon.html',      icon: 'Fav', tags: ['image','design','generator'],desc: 'Generate 16, 32, 48, 180, 192 and 512 px favicons + ZIP download.' },
  { slug: 'img-thumbnail',    name: 'Thumbnail Generator',      file: 'tools/img-thumbnail.html',    icon: 'Tmb', tags: ['image','design','generator'],desc: 'YouTube/Instagram/Facebook/LinkedIn thumbnail with text overlay.' },
  { slug: 'video-editor',     name: 'Video Editor (Trim/Rotate)',file: 'tools/video-editor.html',    icon: '🎬',  tags: ['video','design','converter'], desc: 'Trim, rotate, change speed, mute, add text overlay, extract frames, export as WebM. Browser-only.' },
  { slug: 'video-to-audio',   name: 'Video to MP3 / WAV',       file: 'tools/video-to-audio.html',   icon: '🎧',  tags: ['video','converter','music'], desc: 'Extract the audio track from any local video. Trim, choose channels & bitrate, save as MP3 or WAV.' },
  { slug: 'p2p-call',         name: 'P2P Video Call (encrypted)',file: 'tools/p2p-call.html',        icon: '📞',  tags: ['communication','privacy','video'], desc: 'Create a private 1-to-1 video/audio call. Share a link, encrypted end-to-end via WebRTC. No recording, no account.' },
  { slug: 'temp-chat',        name: 'Temp Chat (E2E encrypted)', file: 'tools/temp-chat.html',       icon: '💬',  tags: ['communication','privacy'],     desc: 'Ephemeral encrypted group chat. Share a link, talk in real-time, close the tab and everything is gone. Up to 10 people.' },
  { slug: 'p2p-file',         name: 'P2P File Transfer (no upload)', file: 'tools/p2p-file.html',    icon: '📁',  tags: ['communication','privacy','documents'], desc: 'Send any file directly browser-to-browser via WebRTC. The file never touches our server — DTLS-encrypted, no size cap, no account.' },

  // -------- Fun Text Translator Toolkit (each tool on its own page) --------
  { slug: 'text-translators', name: 'Fun Text Translators',     file: 'tools/text-translators.html', icon: 'Aᚱ',  tags: ['text','fun','generator','converter'], desc: 'Hub linking to runes, Morse, binary, Pig Latin, Braille, NATO, hieroglyphics and more.' },
  { slug: 'runes',            name: 'English to Runes',         file: 'tools/runes.html',            icon: 'ᚱ',   tags: ['text','fun','translator'],    desc: 'Convert English to Elder Futhark-style Viking runes. Includes a "your name in runes" mode.' },
  { slug: 'morse',            name: 'English to Morse Code',    file: 'tools/morse.html',            icon: '·−',  tags: ['text','fun','translator'],    desc: 'Translate text to Morse code with copy and audio playback.' },
  { slug: 'binary',           name: 'English to Binary',        file: 'tools/binary.html',           icon: '01',  tags: ['text','developer','translator'], desc: 'Convert text to 8-bit binary (UTF-8) or decode binary back to text.' },
  { slug: 'pig-latin',        name: 'English to Pig Latin',     file: 'tools/pig-latin.html',        icon: 'igPay',tags: ['text','fun','translator'],   desc: 'Turn English into Pig Latin with capitalization and punctuation preserved.' },
  { slug: 'nato',             name: 'NATO Phonetic Alphabet',   file: 'tools/nato.html',             icon: 'Nato',tags: ['text','fun','translator'],    desc: 'Convert letters into Alpha, Bravo, Charlie… with a full reference table.' },
  { slug: 'braille',          name: 'English to Braille',       file: 'tools/braille.html',          icon: '⠃⠗', tags: ['text','fun','translator'],    desc: 'Translate text to Unicode Braille (uncontracted Grade 1 style).' },
  { slug: 'upside-down',      name: 'Upside-down Text',         file: 'tools/upside-down.html',      icon: '∩',   tags: ['text','fun','generator'],     desc: 'Flip your text upside down using Unicode characters.' },
  { slug: 'medieval',         name: 'Medieval / Fantasy Text',  file: 'tools/medieval.html',         icon: '𝔉',   tags: ['text','fun','generator'],     desc: 'Gothic, Fraktur, script and bold fantasy fonts using Unicode.' },
  { slug: 'emoji-text',       name: 'Emoji Text Generator',     file: 'tools/emoji-text.html',       icon: '🅴',  tags: ['text','fun','generator'],     desc: 'Letter emojis, keyword replacement and random emoji decoration.' },
  { slug: 'hieroglyphics',    name: 'Hieroglyphics Name',       file: 'tools/hieroglyphics.html',    icon: '𓂀',   tags: ['text','fun','generator'],     desc: 'Phonetic name to Egyptian hieroglyphs with cartouche PNG download.' },
  { slug: 'scroll',           name: 'Ancient Scroll Image',     file: 'tools/scroll.html',           icon: '📜',  tags: ['text','fun','generator'],     desc: 'Render any text on a parchment scroll image and download as PNG.' },

  // -------- Stand-alone fun + productivity tools --------
  { slug: 'certificate',      name: 'Certificate Generator',    file: 'tools/certificate.html',      icon: '🏆',  tags: ['fun','generator','design'],   desc: 'Make a fake certificate with 4 design templates. Download as PNG or print.' },
  { slug: 'typing-test',      name: 'Typing Speed Test',        file: 'tools/typing-test.html',      icon: '⌨',   tags: ['fun','productivity'],         desc: 'Measure your typing speed (WPM), accuracy, and errors with 30/60/120-second tests.' },
  { slug: 'encrypt',          name: 'File Encryption (AES-256)',file: 'tools/encrypt.html',          icon: '🔐',  tags: ['security','privacy','developer'], desc: 'Encrypt any file with a generated AES-256 key. The encrypted file can only be opened by that key.' }
];

const ALL_TAGS = [...new Set(TOOLS.flatMap(t => t.tags))].sort();

app.use(express.static(path.join(__dirname, 'public'), {
  // 1 day for HTML, 7 days for static assets. Production browsers will revalidate.
  setHeaders: function (res, filePath) {
    if (/\.(?:css|js|svg|webmanifest|png|jpg|jpeg|webp|woff2?)$/i.test(filePath)) {
      res.setHeader('Cache-Control', 'public, max-age=604800');
    } else if (/\.html$/i.test(filePath)) {
      res.setHeader('Cache-Control', 'public, max-age=3600, must-revalidate');
    }
  }
}));

for (const t of TOOLS) {
  app.get('/' + t.slug, (req, res) => res.sendFile(path.join(__dirname, 'public', t.file)));
}

const pages = {
  '/about':      'pages/about.html',
  '/disclaimer': 'pages/disclaimer.html',
  '/privacy':    'pages/privacy.html',
  '/terms':      'pages/terms.html',
  '/blog':       'pages/blog.html',
  '/contact':    'pages/contact.html'
};
for (const [route, file] of Object.entries(pages)) {
  app.get(route, (req, res) => res.sendFile(path.join(__dirname, 'public', file)));
}

app.get('/blog/:slug', (req, res) => {
  const safe = req.params.slug.replace(/[^a-z0-9-]/gi, '');
  res.sendFile(path.join(__dirname, 'public', 'pages', 'blog', safe + '.html'), err => {
    if (err) res.status(404).sendFile(path.join(__dirname, 'public', 'pages', '404.html'));
  });
});

app.get('/api/tools', (req, res) => res.json({ tools: TOOLS, tags: ALL_TAGS }));

app.get('/robots.txt', (req, res) => {
  res.type('text/plain').send(`User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap.xml\n`);
});

app.get('/sitemap.xml', (req, res) => {
  const urls = [
    '/', '/about', '/contact', '/disclaimer', '/privacy', '/terms', '/blog',
    '/blog/best-free-online-utility-tools-2026',
    '/blog/how-to-generate-strong-passwords',
    '/blog/write-a-cv-for-free',
    '/blog/fun-online-tools-for-kids',
    '/blog/learn-multiplication-the-easy-way',
    '/blog/markdown-cheat-sheet',
    '/blog/pomodoro-for-students',
    '/blog/ats-friendly-cv-2026',
    ...TOOLS.map(t => '/' + t.slug)
  ];
  const now = new Date().toISOString().slice(0, 10);
  const body =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.map(u => `  <url><loc>${SITE_URL}${u}</loc><lastmod>${now}</lastmod><changefreq>weekly</changefreq></url>`).join('\n') +
    `\n</urlset>\n`;
  res.type('application/xml').send(body);
});

app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public', 'pages', '404.html'), err => {
    if (err) res.type('text/plain').send('404 Not Found');
  });
});

// ---------------- WebRTC signaling relay ----------------
// A tiny per-room WebSocket relay. Max 2 peers per room. Server only forwards
// SDP/ICE messages between the two peers; it never touches media. Media flows
// directly browser-to-browser via WebRTC (DTLS-SRTP encrypted by spec).
// Nothing is stored — when both peers disconnect, the room evaporates.
const httpServer = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });
const rooms = new Map(); // roomId -> Set<WebSocket>

function isValidRoom(r) { return typeof r === 'string' && /^[A-Za-z0-9_-]{4,64}$/.test(r); }

wss.on('connection', (ws, req) => {
  const url  = new URL(req.url, 'http://localhost');
  const room = url.searchParams.get('room');
  if (!isValidRoom(room)) { try { ws.close(1008, 'invalid room'); } catch(_) {} return; }

  let peers = rooms.get(room);
  if (!peers) { peers = new Set(); rooms.set(room, peers); }
  if (peers.size >= 2) {
    try { ws.send(JSON.stringify({ type: 'full' })); ws.close(1008, 'room full'); } catch(_) {}
    return;
  }

  const isInitiator = peers.size === 1; // 2nd to join initiates the WebRTC offer
  peers.add(ws);
  try { ws.send(JSON.stringify({ type: 'init', initiator: isInitiator, peers: peers.size })); } catch(_) {}
  // Tell the existing peer that someone joined
  for (const p of peers) {
    if (p !== ws && p.readyState === 1) {
      try { p.send(JSON.stringify({ type: 'peer-joined' })); } catch(_) {}
    }
  }

  ws.on('message', data => {
    // Relay any signaling payload (SDP / ICE / chat) to the OTHER peer only.
    const text = data.toString();
    if (text.length > 64 * 1024) return; // 64KB hard cap per message
    for (const p of peers) {
      if (p !== ws && p.readyState === 1) { try { p.send(text); } catch(_) {} }
    }
  });

  ws.on('close', () => {
    peers.delete(ws);
    for (const p of peers) {
      if (p.readyState === 1) { try { p.send(JSON.stringify({ type: 'peer-left' })); } catch(_) {} }
    }
    if (peers.size === 0) rooms.delete(room);
  });
});

// ---------------- Ephemeral group chat — WebRTC signaling relay ----------------
// We do NOT carry chat messages anymore. The server only relays small SDP/ICE
// "introductions" between peers so they can build a WebRTC mesh of DataChannels.
// Once peers are connected, every chat message flows directly browser↔browser
// over DTLS-encrypted DataChannels — the server cannot read or even see them.
//
// Wire protocol (JSON over /ws/chat?room=…):
//   server → client : {type:'welcome', self:'<peerId>', peers:['<id>', ...]}
//   server → client : {type:'peer-joined', id:'<peerId>'}
//   server → client : {type:'peer-left',   id:'<peerId>'}
//   server → client : {type:'peers',       count:N}                (UI counter)
//   server → client : {type:'full' | 'busy' | 'rate-limited'}
//   client → server : {to:'<peerId>', payload:{...sdp/ice...}}
//   server → recipient: {from:'<peerId>', payload:{...}}
//
// Abuse protection (server only, since payload is opaque to us):
//   - Hard cap on concurrent rooms / peers per room / signaling msg size
//   - Sliding-window rate limit per socket
const CHAT_MAX_ROOMS     = 500;
const CHAT_MAX_PEERS     = 10;
const CHAT_MAX_MSG_BYTES = 16 * 1024;         // SDP can be a few KB
const CHAT_RATE_PER_WIN  = 60;                // 60 signaling msgs (ICE bursts)
const CHAT_RATE_WIN_MS   = 5000;              // per 5 seconds

const chatWss = new WebSocketServer({ noServer: true });
const chatRooms = new Map(); // roomId -> Map<peerId, WebSocket>

function genPeerId() {
  return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6);
}

chatWss.on('connection', (ws, req) => {
  const url  = new URL(req.url, 'http://localhost');
  const room = url.searchParams.get('room');
  if (!isValidRoom(room)) { try { ws.close(1008, 'invalid room'); } catch(_) {} return; }

  let peers = chatRooms.get(room);
  if (!peers) {
    if (chatRooms.size >= CHAT_MAX_ROOMS) {
      try { ws.send(JSON.stringify({ type: 'busy' })); ws.close(1013, 'server busy'); } catch(_) {}
      return;
    }
    peers = new Map(); chatRooms.set(room, peers);
  }
  if (peers.size >= CHAT_MAX_PEERS) {
    try { ws.send(JSON.stringify({ type: 'full' })); ws.close(1008, 'room full'); } catch(_) {}
    return;
  }

  const selfId = genPeerId();
  ws._peerId = selfId;
  ws._chatTimes = [];

  const otherIds = [...peers.keys()];
  peers.set(selfId, ws);

  // Tell new peer who else is in the room (so it can initiate WebRTC offers).
  try { ws.send(JSON.stringify({ type: 'welcome', self: selfId, peers: otherIds })); } catch(_) {}
  // Tell existing peers about the new arrival + updated count.
  for (const [pid, p] of peers) {
    if (pid === selfId || p.readyState !== 1) continue;
    try { p.send(JSON.stringify({ type: 'peer-joined', id: selfId })); } catch(_) {}
  }
  for (const p of peers.values()) {
    if (p.readyState !== 1) continue;
    try { p.send(JSON.stringify({ type: 'peers', count: peers.size })); } catch(_) {}
  }

  ws.on('message', data => {
    const text = data.toString();
    if (text.length > CHAT_MAX_MSG_BYTES) return;

    // Sliding-window rate limit
    const now = Date.now();
    ws._chatTimes = ws._chatTimes.filter(t => now - t < CHAT_RATE_WIN_MS);
    if (ws._chatTimes.length >= CHAT_RATE_PER_WIN) {
      try { ws.send(JSON.stringify({ type: 'rate-limited' })); } catch(_) {}
      return;
    }
    ws._chatTimes.push(now);

    let msg;
    try { msg = JSON.parse(text); } catch(_) { return; }
    if (!msg || typeof msg.to !== 'string') return;
    const target = peers.get(msg.to);
    if (!target || target.readyState !== 1) return;
    // Forward only the payload (and stamp who it came from). The server has no
    // need to look at payload contents — they're SDP/ICE blobs.
    try {
      target.send(JSON.stringify({ from: selfId, payload: msg.payload }));
    } catch(_) {}
  });

  ws.on('close', () => {
    peers.delete(selfId);
    for (const p of peers.values()) {
      if (p.readyState !== 1) continue;
      try {
        p.send(JSON.stringify({ type: 'peer-left', id: selfId }));
        p.send(JSON.stringify({ type: 'peers', count: peers.size }));
      } catch(_) {}
    }
    if (peers.size === 0) chatRooms.delete(room);
  });
});

// Single upgrade router — avoids race conditions between the two WSS instances.
httpServer.on('upgrade', (req, sock, head) => {
  let pathname;
  try { pathname = new URL(req.url, 'http://x').pathname; }
  catch (_) { sock.destroy(); return; }
  if (pathname === '/ws/p2p') {
    wss.handleUpgrade(req, sock, head, ws => wss.emit('connection', ws, req));
  } else if (pathname === '/ws/chat') {
    chatWss.handleUpgrade(req, sock, head, ws => chatWss.emit('connection', ws, req));
  } else {
    sock.destroy();
  }
});

httpServer.listen(PORT, () => console.log(`\n  Utility Tools -> ${SITE_URL}\n`));

