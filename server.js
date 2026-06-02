// Utility Tools - Node + Express server

const express = require('express');
const helmet = require('helmet');
const path = require('path');
const http = require('http');
const fs = require('fs');
const { WebSocketServer } = require('ws');
const { TOOL_GUIDES, createDefaultToolGuide } = require('./tool-guides');
const remoteSupport = require('./support/remote-support');

const app = express();
const PORT = process.env.PORT || 3000;
const SITE_URL = process.env.SITE_URL || (process.env.NODE_ENV === 'production' ? 'https://utilitytools.eu' : `http://localhost:${PORT}`);

// ---------------- Logging ----------------
// Without this, DigitalOcean / Docker "Runtime Logs" appear empty because the
// app never writes anything beyond the startup banner. Use plain console.log
// (line-buffered, goes to stdout/stderr, picked up by every container runtime).
const startedAt = new Date().toISOString();
console.log(`[boot] ${startedAt} node=${process.version} env=${process.env.NODE_ENV || 'development'} port=${PORT} site=${SITE_URL}`);

// Surface crashes instead of dying silently.
process.on('uncaughtException',  err => console.error('[uncaughtException]', err && err.stack || err));
process.on('unhandledRejection', err => console.error('[unhandledRejection]', err && err.stack || err));
process.on('SIGTERM', () => { console.log('[shutdown] SIGTERM received, exiting'); process.exit(0); });
process.on('SIGINT',  () => { console.log('[shutdown] SIGINT received, exiting');  process.exit(0); });

// Tiny access log — one line per request: method, path, status, duration, IP, UA.
// Skips static asset chatter so the log stays readable.
const SKIP_LOG = /\.(?:css|js|svg|png|jpe?g|webp|ico|woff2?|map|webmanifest)$/i;
app.set('trust proxy', true); // App Platform sits behind a load balancer
app.use((req, res, next) => {
  if (SKIP_LOG.test(req.path)) return next();
  const t0 = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - t0;
    const ip = (req.headers['x-forwarded-for'] || req.ip || '').toString().split(',')[0].trim();
    const ua = (req.headers['user-agent'] || '-').slice(0, 80);
    console.log(`[req] ${req.method} ${req.originalUrl} ${res.statusCode} ${ms}ms ip=${ip} ua="${ua}"`);
  });
  next();
});

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
      'connect-src': ["'self'", 'ws:', 'wss:', 'https://*.googlesyndication.com', 'https://*.doubleclick.net', 'https://*.google.com', 'https://ipwho.is', 'https://api.frankfurter.app'],
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
  { slug: 'json-explorer', name: 'Interactive JSON',    file: 'tools/json-explorer.html',  icon: '🔎{}', tags: ['developer','text'],           desc: 'Paste JSON and click through it like folders. Drill into objects, expand arrays inline, navigate via breadcrumbs.' },
  { slug: 'json-editor',   name: 'JSON Editor',         file: 'tools/json-editor.html',    icon: '✎{}', tags: ['developer','text'],           desc: 'Interactively edit JSON values, rename keys, add/remove items, then download the modified file.' },
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
  { slug: 'currency',  name: 'Currency Converter',      file: 'tools/currency.html',       icon: '€$',   tags: ['money','home','converter'],   desc: 'Convert between 30+ currencies with live ECB rates and a 1M / 6M / 1Y / 5Y historical chart. Offline rates table fallback.' },
  { slug: 'fuel',      name: 'Fuel Cost & Trip Calculator', file: 'tools/fuel.html',       icon: '⛽',   tags: ['money','home'],               desc: 'Distance × consumption × price = trip cost. Metric & imperial units, return trips, per-passenger split.' },
  { slug: 'invoice',   name: 'Invoice Generator',       file: 'tools/invoice.html',        icon: '🧾',  tags: ['money','documents','printable'], desc: 'Build a clean invoice with logo, line items, tax/discount and payment terms. Print to PDF or save as JSON.' },
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
  { slug: 'text-to-excel',name: 'Text to Excel',           file: 'tools/text-to-excel.html',icon: '📊',  tags: ['documents','converter','developer'], desc: 'Interactively build a table — add columns/rows, edit any cell, color cells, then export as styled .xlsx or CSV.' },
  { slug: 'xml',          name: 'XML Formatter',           file: 'tools/xml.html',          icon: 'XML',  tags: ['developer','text'],           desc: 'Pretty-print, minify and validate XML in your browser.' },
  { slug: 'xml-explorer', name: 'Interactive XML',         file: 'tools/xml-explorer.html', icon: '🔎XML',tags: ['developer','text'],           desc: 'Paste XML or drop a file (auto-detects XML inside oddly-named files) and click through it like folders.' },
  { slug: 'xml-editor',   name: 'XML Editor',              file: 'tools/xml-editor.html',   icon: '✎XML', tags: ['developer','text'],           desc: 'Interactively edit XML tags, attributes and text, add/remove elements, then download the modified file.' },

  // -------- New Formatters --------
  { slug: 'html-formatter', name: 'HTML Formatter & Beautifier', file: 'tools/html-formatter.html', icon: 'HTML', tags: ['developer','text','formatter'], desc: 'Beautify and format messy HTML with proper indentation or minify for production.' },
  { slug: 'sql-formatter',  name: 'SQL Formatter & Beautifier',  file: 'tools/sql-formatter.html',  icon: 'SQL',  tags: ['developer','text','formatter'], desc: 'Format and beautify SQL queries with keyword casing and proper indentation.' },

  // -------- New Validators --------
  { slug: 'html-validator', name: 'HTML Validator',         file: 'tools/html-validator.html', icon: 'H✓',  tags: ['developer','text','validator'],  desc: 'Check HTML for unclosed tags, missing attributes, deprecated elements and structural errors.' },
  { slug: 'xpath',          name: 'XPath Tester',           file: 'tools/xpath.html',          icon: 'XP',  tags: ['developer','text','xml'],        desc: 'Evaluate XPath 1.0 expressions against XML documents. See matching nodes highlighted.' },

  // -------- New Generators / Testers --------
  { slug: 'credit-card',    name: 'Credit Card Generator',  file: 'tools/credit-card.html',    icon: '💳',  tags: ['developer','generator','security'], desc: 'Generate Luhn-valid test credit card numbers for Visa, Mastercard, Amex and more. For testing only.' },
  { slug: 'java-regex',     name: 'Java RegEx Tester',      file: 'tools/java-regex.html',     icon: 'J/./', tags: ['developer','text'],             desc: 'Test Java-compatible regular expressions with CASE_INSENSITIVE, MULTILINE, DOTALL flags and named groups.' },
  { slug: 'cron',           name: 'Cron Expression Generator', file: 'tools/cron.html',        icon: '⏱',  tags: ['developer','time','generator'],  desc: 'Build, test and explain cron expressions for Unix and Quartz schedulers. Visualise next run times.' },

  // -------- New Converters --------
  { slug: 'xsd-generator',  name: 'XSD Generator',          file: 'tools/xsd-generator.html', icon: 'XSD', tags: ['developer','xml','converter'],   desc: 'Auto-generate an XSD (XML Schema Definition) from any XML document. Infers types and nesting.' },
  { slug: 'xslt',           name: 'XSLT Transformer',        file: 'tools/xslt.html',          icon: 'XSL', tags: ['developer','xml','converter'],   desc: 'Apply XSL stylesheets to transform XML documents. XSLT 1.0 via the native browser engine.' },
  { slug: 'xml-json',       name: 'XML ↔ JSON Converter',    file: 'tools/xml-json.html',      icon: 'X↔J', tags: ['developer','xml','converter'],   desc: 'Convert XML to JSON or JSON to XML. Handles attributes, nested elements and arrays.' },
  { slug: 'csv-xml',        name: 'CSV to XML Converter',    file: 'tools/csv-xml.html',       icon: 'C→X', tags: ['developer','converter'],         desc: 'Convert CSV data to well-formed XML. Choose root element, row element, and handle headers.' },
  { slug: 'yaml-json',      name: 'YAML ↔ JSON Converter',   file: 'tools/yaml-json.html',     icon: 'Y↔J', tags: ['developer','converter'],         desc: 'Convert YAML to JSON or JSON to YAML. Supports anchors, multi-line strings and nested structures.' },

  // -------- New Encoders / Cryptography --------
  { slug: 'file-encoding',  name: 'Convert File Encoding',  file: 'tools/file-encoding.html', icon: 'Enc', tags: ['developer','converter','security'], desc: 'Read a text file in any encoding (UTF-8, ISO-8859, Windows-1252) and download a re-encoded version.' },
  { slug: 'hmac',           name: 'HMAC Generator',          file: 'tools/hmac.html',          icon: 'MAC', tags: ['developer','security','encoder'],  desc: 'Compute HMAC-SHA1/256/384/512 message authentication codes via the browser Web Crypto API.' },

  // -------- Code Beautifiers / Minifiers --------
  { slug: 'js-tools',       name: 'JavaScript Beautifier & Minifier', file: 'tools/js-tools.html',  icon: 'JS',  tags: ['developer','formatter'],  desc: 'Beautify messy JavaScript with proper indentation or minify for production. Browser-only.' },
  { slug: 'css-tools',      name: 'CSS Beautifier & Minifier',        file: 'tools/css-tools.html', icon: 'CSS', tags: ['developer','formatter'],  desc: 'Format compressed CSS or minify stylesheets for faster page loads. Browser-only.' },

  // -------- String Escaper & Utilities --------
  { slug: 'string-escape',  name: 'String Escaper',          file: 'tools/string-escape.html', icon: 'Esc', tags: ['developer','text','encoder'],    desc: 'Escape/unescape strings for HTML, XML, JavaScript, JSON, Java/.NET, SQL and CSV contexts.' },
  { slug: 'string-utils',   name: 'String Utilities',        file: 'tools/string-utils.html',  icon: 'Str', tags: ['developer','text'],              desc: 'Reverse, sort lines, remove duplicates, trim, wrap, pad, change case and more — all in one tool.' },

  // -------- Web Resources --------
  { slug: 'mime-types',     name: 'List of MIME Types',      file: 'tools/mime-types.html',    icon: '📋',  tags: ['developer','reference'],         desc: 'Complete searchable list of MIME types with file extensions. Find any content-type instantly.' },
  { slug: 'html-entities',  name: 'HTML Entities Reference', file: 'tools/html-entities.html', icon: '&amp;', tags: ['developer','reference','text'], desc: 'Searchable reference of HTML entities. Click any entity to copy its name, number or character.' },
  { slug: 'url-parser',     name: 'URL Parser & Query String Splitter', file: 'tools/url-parser.html', icon: '🔗', tags: ['developer','network'],   desc: 'Break any URL into protocol, host, path, port, query parameters and fragment. Decode and copy.' },
  { slug: 'i18n',           name: 'I18N Standards & Snippets', file: 'tools/i18n.html',        icon: '🌐',  tags: ['developer','reference','i18n'],  desc: 'Locale codes (BCP 47), country codes (ISO 3166), currency codes (ISO 4217), IANA timezones and i18n code snippets.' },

  // -------- Image Toolkit (browser-only, no upload) --------
  { slug: 'img-compress',     name: 'Image Compressor',         file: 'tools/img-compress.html',     icon: 'Cmp', tags: ['image','design'],            desc: 'Compress JPG, PNG, WebP with a quality slider. See size before/after.' },
  { slug: 'img-convert',      name: 'Image Converter',          file: 'tools/img-convert.html',      icon: 'Cvt', tags: ['image','converter'],         desc: 'Convert images between JPG, PNG, WebP and AVIF (where supported).' },
  { slug: 'img-to-svg',       name: 'Image to SVG',             file: 'tools/img-to-svg.html',       icon: 'SVG', tags: ['image','converter','design'],desc: 'Trace any raster image (PNG, JPG, WebP, GIF, BMP…) into vector SVG paths, or embed it inside an SVG wrapper.' },
  { slug: 'svg-to-img',       name: 'SVG to Image',             file: 'tools/svg-to-img.html',       icon: '→IMG',tags: ['image','converter','design'],desc: 'Rasterize any SVG to PNG, JPG, WebP or AVIF. Choose width, scale, quality and background.' },
  { slug: 'svg-viewer',       name: 'SVG Viewer',               file: 'tools/svg-viewer.html',       icon: '👁SVG',tags: ['image','design'],            desc: 'Open and inspect SVG files: zoom, pan, switch background, see viewBox and element counts.' },
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
  { slug: 'p2p-voice',        name: 'P2P Voice Call (encrypted)',file: 'tools/p2p-voice.html',       icon: '🎙',  tags: ['communication','privacy'],  desc: 'Pure voice 1-to-1 call — no camera, just a microphone. Share a link, talk encrypted end-to-end via WebRTC. No account.' },
  { slug: 'temp-chat',        name: 'Temp Chat (E2E encrypted)', file: 'tools/temp-chat.html',       icon: '💬',  tags: ['communication','privacy'],     desc: 'Ephemeral encrypted group chat. Share a link, talk in real-time, close the tab and everything is gone. Up to 10 people.' },
  { slug: 'p2p-file',         name: 'P2P File Transfer (no upload)', file: 'tools/p2p-file.html',    icon: '📁',  tags: ['communication','privacy','documents'], desc: 'Send any file directly browser-to-browser via WebRTC. The file never touches our server — DTLS-encrypted, no size cap, no account.' },
  { slug: 'ip-lookup',        name: 'IP Lookup & Map',          file: 'tools/ip-lookup.html',        icon: '🌐',  tags: ['network','privacy','developer'], desc: 'See your public IP and where it is on a map. Look up any IPv4/IPv6 — country, city, ISP, ASN, timezone.' },

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
  { slug: 'yoda',             name: 'Yoda-speak Translator',    file: 'tools/yoda.html',             icon: '🟢',  tags: ['text','fun','translator'],    desc: 'Convert English to Yoda\'s Object–Subject–Verb sentence order. "Powerful you have become."' },
  { slug: 'pirate',           name: 'Pirate Translator',        file: 'tools/pirate.html',           icon: '🏴‍☠️',tags: ['text','fun','translator'],    desc: 'Turn boring English into salty pirate-speak. Friends become mateys, money becomes doubloons. Arrr!' },
  { slug: 'shakespeare',      name: 'Shakespeare Translator',   file: 'tools/shakespeare.html',      icon: '🎭',  tags: ['text','fun','translator'],    desc: 'Convert modern English to Early Modern (Shakespeare) English — thou, thee, hast, dost, wherefore.' },
  { slug: 'old-english',      name: 'Old English (þ ð ƿ æ)',    file: 'tools/old-english.html',      icon: 'Þ',   tags: ['text','fun','translator'],    desc: 'Re-spell modern English with thorn (þ), eth (ð), wynn (ƿ), ash (æ) and yogh (ȝ) — the lost letters.' },

  // -------- PDF ↔ Images --------
  { slug: 'pdf-to-images',    name: 'PDF to Images',            file: 'tools/pdf-to-images.html',    icon: '📄→🖼',tags: ['documents','image','converter'], desc: 'Extract every page of a PDF as PNG, JPG or WebP. Choose DPI, download single pages or all in a ZIP. Browser-only.' },
  { slug: 'images-to-pdf',    name: 'Images to PDF',            file: 'tools/images-to-pdf.html',    icon: '🖼→📄',tags: ['documents','image','converter'], desc: 'Combine JPG, PNG and WebP images into one PDF. Drag to reorder, choose page size, orientation, fit and margin. Browser-only.' },

  // -------- Stand-alone fun + productivity tools --------
  { slug: 'certificate',      name: 'Certificate Generator',    file: 'tools/certificate.html',      icon: '🏆',  tags: ['fun','generator','design'],   desc: 'Make a fake certificate with 4 design templates. Download as PNG or print.' },
  { slug: 'typing-test',      name: 'Typing Speed Test',        file: 'tools/typing-test.html',      icon: '⌨',   tags: ['fun','productivity'],         desc: 'Measure your typing speed (WPM), accuracy, and errors with 30/60/120-second tests.' },
  { slug: 'encrypt',          name: 'File Encryption (AES-256)',file: 'tools/encrypt.html',          icon: '🔐',  tags: ['security','privacy','developer'], desc: 'Encrypt any file with a generated AES-256 key. The encrypted file can only be opened by that key.' },
  { slug: 'persona',          name: 'Random Persona Generator', file: 'tools/persona.html',          icon: '🧙',  tags: ['fun','generator','developer','writing'], desc: 'Generate a fictional person from medieval, modern, biblical or galaxy-far-away eras. Names, address, coordinates, family, contact details. Great for test data, RPG NPCs and stories.' },
  { slug: 'ftp-explorer',     name: 'FTP Explorer',             file: 'tools/ftp-explorer.html',     icon: '📡',  tags: ['developer','network','documents'], desc: 'Connect to any FTP / FTPS server with your credentials, browse folders and files, and download. Credentials are sent over HTTPS to our server only to perform the FTP operation; nothing is stored.' },
  { slug: 'remote-support',   name: 'Remote Support',           file: 'tools/remote-support.html',   icon: '🖥',  tags: ['communication','privacy','support'], desc: 'Start a temporary support session and share a one-time code. A support agent can only join after you approve. You always see the connection, control screen sharing and remote control, and can stop everything instantly. No unattended access.' }
];

const ALL_TAGS = [...new Set(TOOLS.flatMap(t => t.tags))].sort();

// Temporarily keep decorative / low-practical-value pages out of the indexed set
// during the AdSense content review. They remain reachable from direct links.
const NOINDEX_TOOL_SLUGS = new Set([
  'scramble', 'mathtable', 'mathquiz', 'spelling', 'storyidea', 'memory',
  'text-translators', 'runes', 'pig-latin', 'upside-down', 'medieval',
  'emoji-text', 'hieroglyphics', 'scroll', 'yoda', 'pirate', 'shakespeare',
  'old-english', 'certificate', 'img-meme', 'persona', 'braille', 'nato',
  'remote-support'
]);

const TOOL_BY_SLUG = new Map(TOOLS.map(t => [t.slug, t]));

function escapeHtml(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
}

function renderHomeToolCards() {
  return TOOLS.map(t => `
        <div class="card-wrap">
          <a class="card" href="/${escapeHtml(t.slug)}" aria-label="${escapeHtml(t.name)}">
            <div class="icon">${escapeHtml(t.icon)}</div>
            <h3>${escapeHtml(t.name)}</h3>
            <p>${escapeHtml(t.desc)}</p>
            <div class="card-tags">${t.tags.map(tag => `<span>${escapeHtml(tag)}</span>`).join('')}</div>
          </a>
          <button class="fav-btn" data-slug="${escapeHtml(t.slug)}" title="Add to favorites" aria-label="Toggle favorite">☆</button>
        </div>`).join('');
}

function renderGuide(slug) {
  const tool = TOOL_BY_SLUG.get(slug);
  const guide = TOOL_GUIDES[slug] || (tool ? createDefaultToolGuide(tool, TOOLS) : null);
  if (!guide) return '';
  const related = (guide.related || []).map(s => TOOL_BY_SLUG.get(s)).filter(Boolean).slice(0, 6);
  return `
    <section class="tool-guide" aria-labelledby="${escapeHtml(slug)}-guide-heading">
      <h2 id="${escapeHtml(slug)}-guide-heading">${escapeHtml(guide.title || 'How to use this tool')}</h2>
      ${(guide.intro || []).map(p => `<p>${escapeHtml(p)}</p>`).join('\n      ')}

      <h2>When to use it</h2>
      <ul>${(guide.useCases || []).map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>

      ${guide.funFact ? `<h2>What makes it useful or fun</h2>\n      <p>${escapeHtml(guide.funFact)}</p>` : ''}

      <h2>How to use it</h2>
      <ol>${(guide.steps || []).map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ol>

      <h2>Example</h2>
      <div class="tool-guide-example">
        <h3>Input</h3>
        <pre>${escapeHtml(guide.example && guide.example.input)}</pre>
        <h3>Output</h3>
        <pre>${escapeHtml(guide.example && guide.example.output)}</pre>
        ${guide.example && guide.example.note ? `<p>${escapeHtml(guide.example.note)}</p>` : ''}
      </div>

      <h2>Privacy</h2>
      <p>${escapeHtml(guide.privacy)}</p>

      <h2>Limitations and accuracy notes</h2>
      <ul>${(guide.limitations || []).map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>

      <h2>FAQ</h2>
      <div class="tool-guide-faq">
        ${(guide.faq || []).map(([q, a]) => `<h3>${escapeHtml(q)}</h3><p>${escapeHtml(a)}</p>`).join('\n        ')}
      </div>
      ${related.length ? `
      <section class="tool-guide-related related-tools" aria-label="Related tools">
        <h2>Related tools</h2>
        <div class="related-grid">
          ${related.map(r => `<a href="/${escapeHtml(r.slug)}"><strong>${escapeHtml(r.name)}</strong><span>${escapeHtml(r.desc)}</span></a>`).join('\n          ')}
        </div>
      </section>` : ''}
    </section>
`;
}

function applyRobots(html, slug) {
  if (!NOINDEX_TOOL_SLUGS.has(slug)) return html;
  const robots = '<meta name="robots" content="noindex,follow">';
  if (/<meta\s+name=["']robots["'][^>]*>/i.test(html)) {
    return html.replace(/<meta\s+name=["']robots["'][^>]*>/i, robots);
  }
  return html.replace('</head>', `  ${robots}\n</head>`);
}

function injectGuide(html, slug) {
  if (html.includes('class="tool-guide"')) return html;
  const guide = renderGuide(slug);
  if (!guide) return html;
  const marker = '  <script src="/site.js"></script>';
  const idx = html.lastIndexOf(marker);
  if (idx !== -1) return html.slice(0, idx) + guide + html.slice(idx);
  return html.replace('</body>', `${guide}\n</body>`);
}

function renderToolPage(tool) {
  const filePath = path.join(__dirname, 'public', tool.file);
  let html = fs.readFileSync(filePath, 'utf8');
  html = injectGuide(html, tool.slug);
  html = applyRobots(html, tool.slug);
  return html;
}

app.get('/', (req, res) => {
  const filePath = path.join(__dirname, 'public', 'index.html');
  let html = fs.readFileSync(filePath, 'utf8');
  html = html.replace(
    '<div class="grid" id="toolGrid" aria-live="polite"></div>',
    `<div class="grid" id="toolGrid" aria-live="polite">${renderHomeToolCards()}\n      </div>`
  );
  res.type('html').send(html);
});

app.get('/tools/:file', (req, res, next) => {
  if (!/\.html$/i.test(req.params.file || '')) return next();
  const tool = TOOLS.find(t => t.file === 'tools/' + req.params.file);
  if (!tool) return next();
  res.type('html').send(renderToolPage(tool));
});

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
  app.get('/' + t.slug, (req, res) => res.type('html').send(renderToolPage(t)));
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

// ---------------- Remote Support ----------------
// Consent-first temporary remote support sessions. All session/code/permission
// logic + the audit trail live in ./support/remote-support.js. The customer UI
// is the `remote-support` tool; the agent dashboard is served below (noindex).
remoteSupport.registerRoutes(app, express.json({ limit: '8kb' }));

// Download the prebuilt customer desktop helper (built into desktop-helper/dist
// via `npm run build`). We ship a .zip (fewer browser "unsafe download" warnings);
// the bare .exe route stays as a fallback. If neither is built, return a clear message.
app.get('/downloads/RemoteSupportHelper.zip', (req, res) => {
  const zipPath = path.join(__dirname, 'desktop-helper', 'dist', 'RemoteSupportHelper.zip');
  fs.access(zipPath, fs.constants.R_OK, (err) => {
    if (err) {
      return res.status(404).type('text/plain').send(
        'The desktop helper has not been built yet.\n' +
        'Build it with: cd desktop-helper && npm install && npm run build'
      );
    }
    res.setHeader('Content-Disposition', 'attachment; filename="RemoteSupportHelper.zip"');
    res.type('application/zip');
    res.sendFile(zipPath);
  });
});

app.get('/downloads/RemoteSupportHelper.exe', (req, res) => {
  const exePath = path.join(__dirname, 'desktop-helper', 'dist', 'RemoteSupportHelper.exe');
  fs.access(exePath, fs.constants.R_OK, (err) => {
    if (err) {
      return res.status(404).type('text/plain').send(
        'The desktop helper has not been built yet.\n' +
        'Build it with: cd desktop-helper && npm install && npm run build'
      );
    }
    res.setHeader('Content-Disposition', 'attachment; filename="RemoteSupportHelper.exe"');
    res.type('application/octet-stream');
    res.sendFile(exePath);
  });
});

app.get('/support-agent', (req, res) => {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  let html = fs.readFileSync(path.join(__dirname, 'public', 'support-agent.html'), 'utf8');
  if (/<meta\s+name=["']robots["'][^>]*>/i.test(html)) {
    html = html.replace(/<meta\s+name=["']robots["'][^>]*>/i, '<meta name="robots" content="noindex,nofollow">');
  } else {
    html = html.replace('</head>', '  <meta name="robots" content="noindex,nofollow">\n</head>');
  }
  res.type('html').send(html);
});

// ---------------- IP geolocation proxy ----------------
// Browsers can't call ipwho.is directly anymore (free plan dropped CORS).
// We proxy server-side: visitor sees a same-origin response, and the third
// party never learns the visitor's IP unless they explicitly query their own.
// Cached for 5 minutes per IP to be a polite API consumer.
const ipCache = new Map(); // ip -> { at, data }
const IP_CACHE_TTL = 5 * 60 * 1000;
function clientIp(req) {
  const xf = (req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return xf || req.socket.remoteAddress || '';
}

// Country code -> name fallback (used when provider only returns code)
function ccToName(cc) {
  try { return new Intl.DisplayNames(['en'], { type: 'region' }).of(cc) || cc; }
  catch (_) { return cc; }
}

// Normalize various provider responses into the ipwho.is-style shape the UI expects.
function normalizeIpData(src, providerHint) {
  if (!src || typeof src !== 'object') return null;
  // ipwho.is style (already normalized)
  if (src.connection && src.timezone && src.ip) return src;

  // ipapi.co style
  if (src.ip && (src.country_name || src.country_code) && (src.org !== undefined || src.asn !== undefined)) {
    if (src.error) return { success: false, message: src.reason || 'Lookup failed' };
    return {
      success: true,
      ip: src.ip,
      type: src.version || (src.ip.includes(':') ? 'IPv6' : 'IPv4'),
      country: src.country_name, country_code: src.country_code,
      region: src.region, city: src.city, postal: src.postal,
      latitude: src.latitude, longitude: src.longitude,
      connection: { isp: src.org, org: src.org, asn: src.asn ? String(src.asn).replace(/^AS/i, '') : '', domain: '' },
      timezone: { id: src.timezone, utc: src.utc_offset },
      currency: src.currency ? { name: src.currency_name || src.currency, code: src.currency } : null,
      calling_code: src.country_calling_code ? String(src.country_calling_code).replace(/^\+/, '') : ''
    };
  }

  // freeipapi.com style
  if (src.ipAddress) {
    return {
      success: true,
      ip: src.ipAddress,
      type: src.ipVersion ? ('IPv' + src.ipVersion) : '',
      country: src.countryName, country_code: src.countryCode,
      region: src.regionName, city: src.cityName, postal: src.zipCode,
      latitude: src.latitude, longitude: src.longitude,
      connection: { isp: '', org: '', asn: '', domain: '' },
      timezone: { id: src.timeZone, utc: '' },
      currency: src.currency ? { name: src.currency.name || '', code: src.currency.code || '' } : null,
      calling_code: ''
    };
  }

  // reallyfreegeoip.org style
  if (src.ip && src.country_code !== undefined && src.region_code !== undefined) {
    return {
      success: true,
      ip: src.ip,
      type: src.ip.includes(':') ? 'IPv6' : 'IPv4',
      country: src.country_name, country_code: src.country_code,
      region: src.region_name, city: src.city, postal: src.zip_code,
      latitude: src.latitude, longitude: src.longitude,
      connection: { isp: '', org: '', asn: '', domain: '' },
      timezone: { id: src.time_zone, utc: '' },
      currency: null, calling_code: ''
    };
  }

  return null;
}

async function tryProvider(url) {
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': 'UtilityTools.eu/1.0', 'Accept': 'application/json' }
    });
    if (!r.ok) return null;
    const j = await r.json();
    // ipwho.is returns success:false on errors / CORS plan
    if (j && j.success === false) return null;
    if (j && j.error)             return null;
    return j;
  } catch (_) { return null; }
}

// Try several free providers in order, normalize the first one that works.
async function lookupIp(ip) {
  const providers = ip
    ? [
        `https://ipapi.co/${encodeURIComponent(ip)}/json/`,
        `https://freeipapi.com/api/json/${encodeURIComponent(ip)}`,
        `https://reallyfreegeoip.org/json/${encodeURIComponent(ip)}`,
        `https://ipwho.is/${encodeURIComponent(ip)}`
      ]
    : [
        'https://ipapi.co/json/',
        'https://freeipapi.com/api/json/',
        'https://reallyfreegeoip.org/json/',
        'https://ipwho.is/'
      ];
  for (const url of providers) {
    const raw = await tryProvider(url);
    const norm = normalizeIpData(raw);
    if (norm && norm.ip) return norm;
  }
  return { success: false, message: 'All upstream IP lookup providers failed or rate-limited.' };
}

app.get('/api/ip-lookup', async (req, res) => {
  let ip = (req.query.ip || '').toString().trim();
  // Basic shape check; allow empty (= caller's own IP)
  if (ip && !/^[0-9a-fA-F:.]{2,64}$/.test(ip)) {
    return res.status(400).json({ success: false, message: 'Invalid IP format' });
  }
  if (!ip) {
    ip = clientIp(req).replace(/^::ffff:/, '');
    // localhost fallback for dev — let ipwho.is detect from its end
    if (!ip || ip === '::1' || ip.startsWith('127.')) ip = '';
  }
  const cacheKey = ip || '__self__';
  const cached = ipCache.get(cacheKey);
  if (cached && (Date.now() - cached.at) < IP_CACHE_TTL) {
    return res.json(cached.data);
  }
  try {
    const data = await lookupIp(ip);
    if (!data || data.success === false) {
      return res.status(502).json(data || { success: false, message: 'Upstream lookup failed' });
    }
    ipCache.set(cacheKey, { at: Date.now(), data });
    // Trim cache if it grows
    if (ipCache.size > 500) {
      const oldest = [...ipCache.entries()].sort((a, b) => a[1].at - b[1].at).slice(0, 100);
      for (const [k] of oldest) ipCache.delete(k);
    }
    res.json(data);
  } catch (e) {
    res.status(502).json({ success: false, message: 'Upstream lookup failed: ' + e.message });
  }
});

// ---------------- FTP explorer (server-side, ephemeral connection) ----------------
// Browsers can't speak FTP/FTPS, so the FTP-Explorer tool POSTs credentials here
// over HTTPS. We open a fresh control connection per request, perform the
// operation, and close it. Nothing is stored or logged (no passwords ever
// reach the access log).
//
// Hardening:
//   - Strict input validation (host shape, port range, path traversal in cwd)
//   - Outbound connect timeout + idle timeout
//   - Block private/loopback/link-local hosts unless FTP_ALLOW_INTERNAL=1
//   - Hard caps on listing count, listing time, downloaded bytes
//   - Reject CRLF in any field (defence-in-depth around basic-ftp)
const dns = require('dns').promises;
const net = require('net');

let ftpLib = null;
function getFtpLib() {
  if (ftpLib) return ftpLib;
  try { ftpLib = require('basic-ftp'); }
  catch (e) {
    console.error('[ftp] basic-ftp not installed. Run `npm install` to add it.', e.message);
    throw new Error('FTP module not installed on the server');
  }
  return ftpLib;
}

const FTP_ALLOW_INTERNAL = process.env.FTP_ALLOW_INTERNAL === '1';
const FTP_CONNECT_TIMEOUT_MS = 8000;
const FTP_LIST_MAX_ENTRIES   = 5000;
const FTP_LIST_TIMEOUT_MS    = 15000;
const FTP_DOWNLOAD_MAX_BYTES = 200 * 1024 * 1024; // 200 MB
const FTP_DOWNLOAD_TIMEOUT_MS = 5 * 60 * 1000;     // 5 min

function isPrivateIp(ip) {
  if (!ip) return true;
  if (ip === '::1' || ip === '127.0.0.1') return true;
  if (/^10\./.test(ip)) return true;
  if (/^192\.168\./.test(ip)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(ip)) return true;
  if (/^169\.254\./.test(ip)) return true;       // link-local
  if (/^fe80:/i.test(ip)) return true;           // IPv6 link-local
  if (/^f[cd][0-9a-f]{2}:/i.test(ip)) return true; // IPv6 ULA
  if (/^::ffff:127\./i.test(ip)) return true;
  return false;
}

async function resolveAndCheckHost(host) {
  // Block obvious internal targets unless explicitly allowed.
  if (!FTP_ALLOW_INTERNAL) {
    if (/^(localhost|0\.0\.0\.0|metadata\.google\.internal)$/i.test(host)) {
      throw new Error('Internal hosts are not allowed');
    }
    if (net.isIP(host) && isPrivateIp(host)) {
      throw new Error('Private/loopback IPs are not allowed');
    }
    try {
      const addrs = await dns.lookup(host, { all: true });
      for (const a of addrs) {
        if (isPrivateIp(a.address)) throw new Error('Host resolves to a private/loopback IP');
      }
    } catch (e) {
      if (e.message && /private|loopback/.test(e.message)) throw e;
      throw new Error('Unable to resolve host: ' + e.message);
    }
  }
}

function validateFtpInput(body) {
  const host = String(body.host || '').trim();
  const port = parseInt(body.port, 10) || 21;
  const user = String(body.user || 'anonymous');
  const password = String(body.password || '');
  const secure = body.secure === true || body.secure === 'true' || body.secure === 'implicit';
  const secureType = body.secure === 'implicit' ? 'implicit' : (secure ? true : false);
  const cwd = String(body.path || '/');

  if (!host) throw new Error('Host is required');
  if (host.length > 253) throw new Error('Host too long');
  if (!/^[A-Za-z0-9._:\-\[\]]+$/.test(host)) throw new Error('Invalid host');
  if (!Number.isFinite(port) || port < 1 || port > 65535) throw new Error('Invalid port');
  if (/[\r\n\0]/.test(user) || /[\r\n\0]/.test(password)) throw new Error('Invalid credentials');
  if (cwd.length > 1024) throw new Error('Path too long');
  if (/[\r\n\0]/.test(cwd)) throw new Error('Invalid path');
  return { host, port, user, password, secureType, cwd };
}

async function withFtp(opts, fn) {
  const { Client } = getFtpLib();
  await resolveAndCheckHost(opts.host);
  const client = new Client(FTP_CONNECT_TIMEOUT_MS);
  client.ftp.verbose = false;
  try {
    await client.access({
      host: opts.host,
      port: opts.port,
      user: opts.user,
      password: opts.password,
      secure: opts.secureType
    });
    return await fn(client);
  } finally {
    try { client.close(); } catch (_) {}
  }
}

app.post('/api/ftp/list', express.json({ limit: '8kb' }), async (req, res) => {
  let opts;
  try { opts = validateFtpInput(req.body || {}); }
  catch (e) { return res.status(400).json({ ok: false, error: e.message }); }
  try {
    const data = await withFtp(opts, async client => {
      // Some servers reject blank cwd; default to "/"
      if (opts.cwd && opts.cwd !== '/') {
        try { await client.cd(opts.cwd); }
        catch (e) { throw new Error('Cannot change directory: ' + e.message); }
      }
      const pwd = await client.pwd().catch(() => opts.cwd || '/');
      const list = await Promise.race([
        client.list(),
        new Promise((_, rej) => setTimeout(() => rej(new Error('Listing timed out')), FTP_LIST_TIMEOUT_MS))
      ]);
      const entries = list.slice(0, FTP_LIST_MAX_ENTRIES).map(f => ({
        name: f.name,
        size: f.size,
        type: f.isDirectory ? 'dir' : (f.isSymbolicLink ? 'link' : 'file'),
        modifiedAt: f.modifiedAt ? f.modifiedAt.toISOString() : (f.rawModifiedAt || null),
        permissions: f.rawPermissions || null
      }));
      return { ok: true, cwd: pwd, truncated: list.length > FTP_LIST_MAX_ENTRIES, entries };
    });
    res.json(data);
  } catch (e) {
    console.log('[ftp][list] error host=' + opts.host + ':' + opts.port + ' ' + (e && e.message));
    res.status(502).json({ ok: false, error: e.message || 'FTP listing failed' });
  }
});

app.post('/api/ftp/download', express.json({ limit: '8kb' }), async (req, res) => {
  let opts;
  try { opts = validateFtpInput(req.body || {}); }
  catch (e) { return res.status(400).json({ ok: false, error: e.message }); }
  const filename = String((req.body || {}).filename || '');
  if (!filename || /[\r\n\0/\\]/.test(filename)) {
    return res.status(400).json({ ok: false, error: 'Invalid filename' });
  }
  if (filename.length > 512) {
    return res.status(400).json({ ok: false, error: 'Filename too long' });
  }
  try {
    await withFtp(opts, async client => {
      if (opts.cwd && opts.cwd !== '/') await client.cd(opts.cwd);
      let size = 0;
      try { size = await client.size(filename); } catch (_) { /* not all servers support SIZE */ }
      if (size > FTP_DOWNLOAD_MAX_BYTES) {
        res.status(413).json({ ok: false, error: 'File exceeds download size limit (200 MB)' });
        return;
      }

      // Stream straight to the HTTP response with a hard byte cap + timeout.
      const safeName = filename.replace(/["\\]/g, '_');
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
      if (size > 0) res.setHeader('Content-Length', String(size));

      let bytes = 0;
      let aborted = false;
      const { Writable } = require('stream');
      const sink = new Writable({
        write(chunk, _, cb) {
          bytes += chunk.length;
          if (bytes > FTP_DOWNLOAD_MAX_BYTES) {
            aborted = true;
            cb(new Error('Download exceeded size limit'));
            return;
          }
          res.write(chunk, cb);
        }
      });
      const timer = setTimeout(() => {
        aborted = true;
        try { client.close(); } catch (_) {}
      }, FTP_DOWNLOAD_TIMEOUT_MS);
      try {
        await client.downloadTo(sink, filename);
        clearTimeout(timer);
        if (!aborted) res.end();
      } catch (e) {
        clearTimeout(timer);
        if (!res.headersSent) {
          res.status(502).json({ ok: false, error: e.message });
        } else {
          try { res.end(); } catch (_) {}
        }
      }
    });
  } catch (e) {
    console.log('[ftp][download] error host=' + opts.host + ':' + opts.port + ' file=' + filename + ' ' + (e && e.message));
    if (!res.headersSent) {
      res.status(502).json({ ok: false, error: e.message || 'FTP download failed' });
    } else {
      try { res.end(); } catch (_) {}
    }
  }
});

app.get('/robots.txt', (req, res) => {
  res.type('text/plain').send(`User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap.xml\n`);
});

app.get('/sitemap.xml', (req, res) => {
  const urls = [
    '/', '/about', '/contact', '/disclaimer', '/privacy', '/terms', '/blog',
    '/blog/remote-support-secure-screen-sharing',
    '/blog/p2p-file-transfer-no-upload',
    '/blog/temporary-encrypted-browser-chat',
    '/blog/p2p-video-call-browser',
    '/blog/p2p-voice-call-browser',
    '/blog/best-free-online-utility-tools-2026',
    '/blog/how-to-generate-strong-passwords',
    '/blog/write-a-cv-for-free',
    '/blog/fun-online-tools-for-kids',
    '/blog/learn-multiplication-the-easy-way',
    '/blog/markdown-cheat-sheet',
    '/blog/pomodoro-for-students',
    '/blog/ats-friendly-cv-2026',
    ...TOOLS.filter(t => !NOINDEX_TOOL_SLUGS.has(t.slug)).map(t => '/' + t.slug)
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

// Support sessions get their own authenticated, session-scoped WS channel.
const supportWss = new WebSocketServer({ noServer: true });
supportWss.on('connection', (ws, req) => remoteSupport.handleConnection(ws, req));

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

  // First peer is the HOST (room creator) and is the WebRTC answerer.
  // Second peer joins immediately as the initiator and sends the offer.
  // (We removed the earlier "host must admit" handshake because the file-
  // transfer tool never implemented it, leaving rooms stuck in the lobby.)
  const isHost = peers.size === 0;
  ws._isHost   = isHost;
  peers.add(ws);

  if (isHost) {
    try { ws.send(JSON.stringify({ type: 'init', initiator: false, host: true, peers: peers.size })); } catch(_) {}
  } else {
    try { ws.send(JSON.stringify({ type: 'init', initiator: true, host: false, peers: peers.size })); } catch(_) {}
    // Notify the host so any "waiting for peer" UI can clear.
    for (const p of peers) {
      if (p !== ws && p.readyState === 1) {
        try { p.send(JSON.stringify({ type: 'peer-joined' })); } catch(_) {}
      }
    }
  }

  ws.on('message', data => {
    // Relay any signaling payload (SDP / ICE) to the OTHER peer only.
    // The server cannot read media — payloads are opaque DTLS-protected blobs.
    const text = data.toString();
    if (text.length > 64 * 1024) return; // 64KB hard cap per message

    // Swallow legacy admit/reject control messages from older clients so we
    // don't relay them as if they were signaling.
    if (text.length < 2048) {
      try {
        const parsed = JSON.parse(text);
        if (parsed && (parsed.type === 'admit' || parsed.type === 'reject')) return;
      } catch(_) {}
    }

    for (const p of peers) {
      if (p !== ws && p.readyState === 1) {
        try { p.send(text); } catch(_) {}
      }
    }
  });

  ws.on('close', () => {
    peers.delete(ws);
    for (const p of peers) {
      if (p.readyState !== 1) continue;
      try { p.send(JSON.stringify({ type: 'peer-left' })); } catch(_) {}
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
  } else if (pathname === '/ws/support') {
    supportWss.handleUpgrade(req, sock, head, ws => supportWss.emit('connection', ws, req));
  } else {
    sock.destroy();
  }
});

httpServer.listen(PORT, () => console.log(`\n  Utility Tools -> ${SITE_URL}\n`));

