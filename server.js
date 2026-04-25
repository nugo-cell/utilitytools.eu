// Utility Tools - Node + Express server

const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const SITE_URL = process.env.SITE_URL || (process.env.NODE_ENV === 'production' ? 'https://utilitytools.eu' : `http://localhost:${PORT}`);

const TOOLS = [
  { slug: 'json',      name: 'JSON Formatter',          file: 'tools/json-formatter.html', icon: '{}',   tags: ['developer','text'],           desc: 'Pretty-print, minify, and validate JSON.' },
  { slug: 'base64',    name: 'Base64 Encode/Decode',    file: 'tools/base64.html',         icon: 'B64',  tags: ['developer','encoder'],        desc: 'Encode and decode Base64 strings.' },
  { slug: 'url',       name: 'URL Encode/Decode',       file: 'tools/url-encoder.html',    icon: '%20',  tags: ['developer','encoder'],        desc: 'Percent-encode and decode URL components.' },
  { slug: 'uuid',      name: 'UUID Generator',          file: 'tools/uuid.html',           icon: 'ID',   tags: ['developer','generator'],      desc: 'Generate v4 UUIDs, single or in bulk.' },
  { slug: 'hash',      name: 'Hash Generator',          file: 'tools/hash.html',           icon: '#',    tags: ['developer','security'],       desc: 'Compute SHA-1, SHA-256, SHA-384, SHA-512.' },
  { slug: 'regex',     name: 'Regex Tester',            file: 'tools/regex.html',          icon: '/./',  tags: ['developer','text'],           desc: 'Test regular expressions against sample text.' },
  { slug: 'timestamp', name: 'Unix Timestamp',          file: 'tools/timestamp.html',      icon: 'T',    tags: ['developer','time'],           desc: 'Convert between Unix time and dates.' },
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
  { slug: 'typing-test',      name: 'Typing Speed Test',        file: 'tools/typing-test.html',      icon: '⌨',   tags: ['fun','productivity'],         desc: 'Measure your typing speed (WPM), accuracy, and errors with 30/60/120-second tests.' }
];

const ALL_TAGS = [...new Set(TOOLS.flatMap(t => t.tags))].sort();

app.use(express.static(path.join(__dirname, 'public')));

for (const t of TOOLS) {
  app.get('/' + t.slug, (req, res) => res.sendFile(path.join(__dirname, 'public', t.file)));
}

const pages = {
  '/about':      'pages/about.html',
  '/disclaimer': 'pages/disclaimer.html',
  '/privacy':    'pages/privacy.html',
  '/terms':      'pages/terms.html',
  '/blog':       'pages/blog.html'
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
    '/', '/about', '/disclaimer', '/privacy', '/terms', '/blog',
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

app.listen(PORT, () => console.log(`\n  Utility Tools -> ${SITE_URL}\n`));

