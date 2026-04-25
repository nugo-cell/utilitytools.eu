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
  { slug: 'xml',          name: 'XML Formatter',           file: 'tools/xml.html',          icon: 'XML',  tags: ['developer','text'],           desc: 'Pretty-print, minify and validate XML in your browser.' }
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

