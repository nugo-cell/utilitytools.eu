/* Apply SEO content (title, meta description, keywords, OG, JSON-LD) to every tool HTML page.
 * Idempotent — re-running just refreshes the managed block.
 * Usage:  node scripts/apply-seo.js
 */
const fs = require('fs');
const path = require('path');

const SITE = 'https://utilitytools.eu';
const ROOT = path.join(__dirname, '..', 'public');

// slug → SEO fields. Canonical = `${SITE}/${slug}` (matches server.js routes).
const SEO = {
  json: {
    file: 'tools/json-formatter.html',
    title: 'Free JSON Formatter & Validator Online — UtilityTools.eu',
    desc:  'Format, beautify and validate JSON in your browser. Fast, free, no signup. Pretty-print or minify JSON instantly.',
    kw:    'json formatter, json validator, format json online, json beautifier, pretty print json, minify json',
    name:  'JSON Formatter',
    faq: [
      ['Is my JSON sent anywhere?', 'No. Formatting happens locally in your browser.'],
      ['Does it validate against a schema?', 'It checks JSON syntax. For schema validation, use a dedicated JSON Schema tool.'],
      ['Can I minify too?', 'Yes, the same tool does both pretty-print and minify.']
    ]
  },
  base64: {
    file: 'tools/base64.html',
    title: 'Base64 Encoder & Decoder Online — Free, In-Browser',
    desc:  'Encode or decode Base64 text instantly in your browser. Free, no signup, works offline once loaded.',
    kw:    'base64 encoder, base64 decoder, base64 online, encode base64, decode base64, text to base64',
    name:  'Base64 Encoder & Decoder',
    faq: [
      ['Does it support UTF-8?', 'Yes.'],
      ['Is the data sent to a server?', 'No, encoding runs in your browser.']
    ]
  },
  url: {
    file: 'tools/url-encoder.html',
    title: 'URL Encoder & Decoder — Free Online Tool',
    desc:  'Percent-encode or decode URLs and query strings in your browser. Free, no signup, instant results.',
    kw:    'url encoder, url decoder, percent encoding, encode url online, decode url, query string encoder',
    name:  'URL Encoder & Decoder',
    faq: [
      ['Does it encode the whole URL or just components?', 'Both modes are available.'],
      ['Is data uploaded?', 'No, encoding happens in your browser.']
    ]
  },
  uuid: {
    file: 'tools/uuid.html',
    title: 'UUID Generator Online — v4, v7 & Bulk',
    desc:  'Generate UUIDs (v4, v7) instantly in your browser. Bulk mode, copy-friendly, free, no signup.',
    kw:    'uuid generator, generate uuid, uuid v4, uuid online, bulk uuid, guid generator',
    name:  'UUID Generator',
    faq: [
      ['v4 vs v7?', 'v4 is random; v7 is time-ordered (better for database indexes).'],
      ['Are these collision-safe?', 'v4 has astronomically low collision odds.']
    ]
  },
  hash: {
    file: 'tools/hash.html',
    title: 'Hash Generator — MD5, SHA-1, SHA-256 Online',
    desc:  'Generate MD5, SHA-1, SHA-256 and SHA-512 hashes from text or files in your browser. Free, no signup.',
    kw:    'hash generator, sha256 online, md5 generator, sha1 hash, file hash, checksum tool',
    name:  'Hash Generator',
    faq: [
      ['Is MD5 safe for passwords?', 'No — use SHA-256+ with salting (e.g. bcrypt or argon2).'],
      ['Can I hash large files?', 'Yes, hashed locally via the Web Crypto API.']
    ]
  },
  regex: {
    file: 'tools/regex.html',
    title: 'Regex Tester Online — Live Match & Explain',
    desc:  'Test regular expressions against sample text with live highlighting. Free, in-browser, no signup.',
    kw:    'regex tester, regex online, test regular expression, regex playground, javascript regex',
    name:  'Regex Tester',
    faq: [
      ['Which flavor?', 'JavaScript (ECMAScript) regex.'],
      ['Capture groups?', 'Numbered and named groups are listed below results.']
    ]
  },
  timestamp: {
    file: 'tools/timestamp.html',
    title: 'Unix Timestamp Converter — Epoch ⇄ Date',
    desc:  'Convert Unix epoch timestamps to human-readable dates and back. Seconds, ms, time zones supported. Free.',
    kw:    'unix timestamp, epoch converter, timestamp to date, date to epoch, iso 8601',
    name:  'Unix Timestamp Converter',
    faq: [
      ['Seconds or milliseconds?', 'Auto-detected and switchable.'],
      ['Time zones?', 'Yes, including UTC and your local time zone.']
    ]
  },
  timezones: {
    file: 'tools/timezones.html',
    title: 'World Clock & Time Zone Converter — Free Online',
    desc:  'Compare times across cities, schedule meetings and convert time zones in your browser. Free, no signup.',
    kw:    'world clock, time zone converter, meeting planner, timezone tool, utc converter',
    name:  'World Clock & Time Zone Converter',
    faq: [
      ['Is DST handled?', "Yes, via your browser's IANA tz data."],
      ['Are my cities saved?', 'Stored locally in your browser.']
    ]
  },
  'json-csv': {
    file: 'tools/json-csv.html',
    title: 'JSON to CSV & CSV to JSON Converter — Free',
    desc:  'Convert JSON to CSV or CSV to JSON instantly in your browser. Headers, nested keys, free, no signup.',
    kw:    'json to csv, csv to json, json csv converter, flatten json, csv parser online',
    name:  'JSON / CSV Converter',
    faq: [
      ['Nested JSON?', 'Auto-flattened with dot notation.'],
      ['Custom delimiter?', 'Comma, semicolon and tab supported.']
    ]
  },
  count: {
    file: 'tools/text-counter.html',
    title: 'Word & Character Counter — Free Online',
    desc:  'Count words, characters, sentences, paragraphs and reading time in real time. Free, no signup.',
    kw:    'word counter, character counter, text counter, word count online, reading time',
    name:  'Word & Character Counter',
    faq: [
      ['Reading time?', 'Estimated at ~225 words per minute.'],
      ['Counts emoji?', 'Yes, Unicode-aware.']
    ]
  },
  case: {
    file: 'tools/case.html',
    title: 'Case Converter — UPPER, lower, Title, camelCase',
    desc:  'Convert text between UPPER, lower, Title, Sentence, camelCase, snake_case and more. Free, in-browser.',
    kw:    'case converter, uppercase to lowercase, camel case, snake case, title case converter',
    name:  'Case Converter',
    faq: [['Preserves acronyms?', 'Configurable in Title case mode.']]
  },
  scramble: {
    file: 'tools/scramble.html',
    title: 'Word Scrambler — Shuffle Letters & Words Online',
    desc:  'Scramble letters within words or shuffle word order. Great for puzzles, games and teaching. Free.',
    kw:    'word scrambler, letter shuffler, anagram generator, scramble text, jumble text',
    name:  'Word Scrambler',
    faq: [['Keeps first/last letter?', 'Optional toggle.']]
  },
  lorem: {
    file: 'tools/lorem.html',
    title: 'Lorem Ipsum Generator — Free Placeholder Text',
    desc:  'Generate Lorem Ipsum paragraphs, sentences or words for mockups and designs. Free, in-browser.',
    kw:    'lorem ipsum generator, placeholder text, dummy text, lorem online, filler text',
    name:  'Lorem Ipsum Generator',
    faq: [['Real Latin?', 'Standard Lorem Ipsum corpus.']]
  },
  password: {
    file: 'tools/password.html',
    title: 'Strong Password Generator — Free & Secure',
    desc:  'Generate strong, random passwords in your browser. Customize length and character sets. Free, no signup.',
    kw:    'password generator, strong password, random password, secure password, passphrase generator',
    name:  'Strong Password Generator',
    faq: [
      ['Are passwords stored?', 'No — generated in your browser via the Web Crypto API.'],
      ['Passphrase mode?', 'Yes, word-based option.']
    ]
  },
  qr: {
    file: 'tools/qr.html',
    title: 'QR Code Generator — Free, Custom & Downloadable',
    desc:  'Create QR codes for URLs, text, Wi-Fi and more. Customize colors and download as PNG/SVG. Free.',
    kw:    'qr code generator, free qr code, custom qr code, qr maker, wifi qr code, vcard qr',
    name:  'QR Code Generator',
    faq: [['Do they expire?', "No — static QR codes don't expire."]]
  },
  color: {
    file: 'tools/color.html',
    title: 'Color Converter — HEX, RGB, HSL, OKLCH',
    desc:  'Convert colors between HEX, RGB, HSL, HSV and OKLCH. Free, in-browser.',
    kw:    'color converter, hex to rgb, rgb to hex, hsl converter, oklch converter',
    name:  'Color Converter',
    faq: [['OKLCH supported?', 'Yes.']]
  },
  budget: {
    file: 'tools/budget.html',
    title: 'Personal Budget Calculator — Free Online',
    desc:  'Plan your monthly budget with categories, totals and savings goals. Private, in-browser, no signup.',
    kw:    'budget calculator, monthly budget, personal budget, budget planner, expense tracker',
    name:  'Personal Budget Calculator',
    faq: [['Is data uploaded?', 'No — everything stays in your browser.']]
  },
  mathtable: {
    file: 'tools/mathtable.html',
    title: 'Multiplication Table Generator — Free for Kids',
    desc:  'Print or practice any multiplication table. Free, kid-friendly, no signup.',
    kw:    'multiplication table, times table, multiplication chart, math table, printable times table',
    name:  'Multiplication Table',
    faq: [['Printable?', 'Yes, print-friendly layout.']]
  },
  cv: {
    file: 'tools/cv.html',
    title: 'Free CV & Resume Maker — ATS-Friendly Templates',
    desc:  'Build an ATS-friendly CV in your browser. Clean templates, PDF export, no signup. Free.',
    kw:    'free cv maker, resume builder, ats resume, cv generator, free resume template',
    name:  'CV / Resume Maker',
    faq: [
      ['Is it ATS-friendly?', 'Templates use clean structure for ATS parsing.'],
      ['Where is my data stored?', 'Locally in your browser; the PDF is generated locally.']
    ]
  },
  'docx-pdf': {
    file: 'tools/docx-pdf.html',
    title: 'DOCX to PDF Converter — Free, In-Browser',
    desc:  "Convert DOCX files to PDF directly in your browser. Free, no signup, files don't leave your device.",
    kw:    'docx to pdf, word to pdf, convert docx pdf, free docx to pdf, browser docx converter',
    name:  'DOCX to PDF Converter',
    faq: [['Complex layouts?', 'Simple to medium documents convert well.']]
  },
  markdown: {
    file: 'tools/markdown.html',
    title: 'Markdown Preview & Editor — Free Online',
    desc:  'Live Markdown preview with GFM support. Edit and export in your browser. Free, no signup.',
    kw:    'markdown preview, markdown editor, markdown online, gfm preview, markdown to html',
    name:  'Markdown Preview & Editor',
    faq: [['Tables, code, task lists?', 'Yes (GitHub-Flavored Markdown).']]
  },
  diff: {
    file: 'tools/diff.html',
    title: 'Text Diff Checker — Compare Two Texts Online',
    desc:  'Compare two texts side by side and highlight differences. Free, fast, in-browser.',
    kw:    'text diff, compare text, diff checker, text comparison, side by side diff',
    name:  'Text Diff Checker',
    faq: [['Word or character diff?', 'Both modes are supported.']]
  },
  jwt: {
    file: 'tools/jwt.html',
    title: 'JWT Decoder Online — Inspect JSON Web Tokens',
    desc:  'Decode and inspect JWT header, payload and signature in your browser. Free, no signup, never sent to a server.',
    kw:    'jwt decoder, decode jwt, jwt parser, json web token decoder, jwt inspector',
    name:  'JWT Decoder',
    faq: [
      ['Does it verify signatures?', "It checks structure; full verification needs the issuer's key."],
      ['Is my token sent anywhere?', 'No, decoding happens in your browser.']
    ]
  },
  slug: {
    file: 'tools/slug.html',
    title: 'Slugify Tool — URL-Friendly Slug Generator',
    desc:  'Convert any text into clean, SEO-friendly URL slugs. Handles accents and special characters. Free, in-browser.',
    kw:    'slugify, slug generator, url slug, seo slug, permalink generator',
    name:  'Slugify',
    faq: [['Handles accents?', 'Yes — transliterates á → a, etc.']]
  },
  base: {
    file: 'tools/base.html',
    title: 'Number Base Converter — Bin, Oct, Dec, Hex',
    desc:  'Convert numbers between binary, octal, decimal and hexadecimal. Free, instant, in-browser.',
    kw:    'base converter, binary to decimal, hex to decimal, number base, decimal to hex',
    name:  'Number Base Converter',
    faq: [['Custom base?', 'Up to base 36 supported.']]
  },
  tip: {
    file: 'tools/tip.html',
    title: 'Tip Calculator & Bill Splitter — Free Online',
    desc:  'Calculate tips and split bills evenly or by share. Free, in-browser, no signup.',
    kw:    'tip calculator, bill splitter, split bill, tip percentage, restaurant tip',
    name:  'Tip & Bill Splitter',
    faq: [['Round up?', 'Optional rounding.']]
  },
  bmi: {
    file: 'tools/bmi.html',
    title: 'BMI Calculator — Metric & Imperial, Free',
    desc:  'Calculate your Body Mass Index in metric or imperial units. Free, in-browser, no signup.',
    kw:    'bmi calculator, body mass index, bmi metric, bmi imperial, healthy bmi',
    name:  'BMI Calculator',
    faq: [['Is BMI accurate?', "It's a general indicator, not a diagnosis."]]
  },
  age: {
    file: 'tools/age.html',
    title: 'Age Calculator — Years, Months, Days',
    desc:  'Calculate exact age in years, months and days from any birth date. Free, in-browser.',
    kw:    'age calculator, calculate age, age in days, date calculator, how old am i',
    name:  'Age Calculator',
    faq: [['Leap years?', 'Handled correctly.']]
  },
  pomodoro: {
    file: 'tools/pomodoro.html',
    title: 'Pomodoro Timer Online — Free Focus Timer',
    desc:  'A clean Pomodoro timer for focused work. 25/5 cycles, custom intervals, browser-based. Free.',
    kw:    'pomodoro timer, focus timer, study timer, 25 minute timer, productivity timer',
    name:  'Pomodoro Timer',
    faq: [['Sound notifications?', 'Yes, optional.']]
  },
  gradient: {
    file: 'tools/gradient.html',
    title: 'CSS Gradient Generator — Linear, Radial, Conic',
    desc:  'Build linear, radial and conic CSS gradients with live preview. Copy-ready CSS. Free.',
    kw:    'css gradient generator, gradient maker, linear gradient, radial gradient, conic gradient',
    name:  'CSS Gradient Generator',
    faq: [['Conic gradients?', 'Yes, supported.']]
  },
  mathquiz: {
    file: 'tools/mathquiz.html',
    title: 'Math Quiz for Kids — Free Online Practice',
    desc:  'Fun, adjustable math quizzes for kids: addition, subtraction, multiplication, division. Free.',
    kw:    'math quiz for kids, kids math practice, math game online, mental math, addition quiz',
    name:  'Math Quiz for Kids',
    faq: [['Difficulty levels?', 'Easy, medium and hard.']]
  },
  spelling: {
    file: 'tools/spelling.html',
    title: 'Spelling Practice for Kids — Free Online',
    desc:  'Practice spelling with custom or built-in word lists. Voice prompts, instant feedback. Free.',
    kw:    'spelling practice, spelling test, kids spelling, online spelling, spelling bee practice',
    name:  'Spelling Practice',
    faq: [['Voices?', "Uses your browser's built-in speech synthesis."]]
  },
  storyidea: {
    file: 'tools/storyidea.html',
    title: 'Story Idea Generator — Free Writing Prompts',
    desc:  'Generate creative story prompts and ideas for fiction, kids and class projects. Free, in-browser.',
    kw:    'story idea generator, writing prompts, story prompts, creative writing, plot generator',
    name:  'Story Idea Generator',
    faq: [['For kids?', 'A child-friendly mode is included.']]
  },
  memory: {
    file: 'tools/memory.html',
    title: 'Memory Match Game — Free Online for Kids',
    desc:  'Play a clean memory match game in your browser. Themes and difficulty levels. Free, no signup.',
    kw:    'memory match game, memory game online, concentration game, matching game, kids memory game',
    name:  'Memory Match Game',
    faq: [['Themes?', 'Animals, emojis and numbers.']]
  },
  roman: {
    file: 'tools/roman.html',
    title: 'Roman Numeral Converter — Free Online',
    desc:  'Convert numbers to Roman numerals and back. Free, instant, no signup.',
    kw:    'roman numeral converter, number to roman, roman to number, roman numerals',
    name:  'Roman Numeral Converter',
    faq: [['Max value?', '3,999,999 with vinculum notation.']]
  },
  calories: {
    file: 'tools/calories.html',
    title: 'Calorie Calculator (BMR & TDEE) — Free',
    desc:  'Estimate daily calorie needs (BMR & TDEE) for maintenance, loss or gain. Free, in-browser.',
    kw:    'calorie calculator, tdee calculator, bmr calculator, daily calories, maintenance calories',
    name:  'Calorie Calculator',
    faq: [['Formula?', 'Mifflin-St Jeor.']]
  },
  'json-to-code': {
    file: 'tools/json-to-code.html',
    title: 'JSON & XML to Code Generator — TS, Go, Java',
    desc:  'Generate type definitions and classes from JSON or XML in TypeScript, Go, Java, C# and more. Free.',
    kw:    'json to typescript, json to go struct, json to class, xml to code, json to java',
    name:  'JSON & XML to Code Generator',
    faq: [['Languages?', 'TypeScript, Go, Java, C#, Python and more.']]
  },
  'pdf-editor': {
    file: 'tools/pdf-editor.html',
    title: 'PDF Editor Online — Edit, Reorder & Annotate',
    desc:  'Edit, merge, split, reorder and annotate PDFs in your browser. Free, no signup.',
    kw:    'pdf editor online, edit pdf, merge pdf, split pdf, rotate pdf, annotate pdf',
    name:  'PDF Editor',
    faq: [['Encrypted PDFs?', 'Limited support.']]
  },
  'pdf-signer': {
    file: 'tools/pdf-signer.html',
    title: 'PDF Signer — Sign PDFs Online for Free',
    desc:  'Add a signature to any PDF in your browser. Draw, type or upload — free, no signup.',
    kw:    'sign pdf online, pdf signer, electronic signature, pdf signature, e-sign pdf free',
    name:  'PDF Signer',
    faq: [['Legally binding?', 'Treat as a simple e-signature; check local laws for binding contracts.']]
  },
  'excel-table': {
    file: 'tools/excel-table.html',
    title: 'Excel & CSV to HTML Table — Free Converter',
    desc:  'Paste Excel or CSV data and get a clean HTML table. Sortable, copy-ready. Free, in-browser.',
    kw:    'excel to html, csv to table, csv to html, excel table converter, html table generator',
    name:  'Excel / CSV to HTML Table',
    faq: [['Sorting?', 'Optional client-side sortable mode.']]
  },
  xml: {
    file: 'tools/xml.html',
    title: 'XML Formatter & Validator — Free Online',
    desc:  'Beautify, minify and validate XML in your browser. Free, no signup, fast.',
    kw:    'xml formatter, xml validator, beautify xml, xml online, pretty xml, minify xml',
    name:  'XML Formatter & Validator',
    faq: [['Validates schema?', 'Syntactic validation only.']]
  },
  'img-compress': {
    file: 'tools/img-compress.html',
    title: 'Image Compressor — Free, In-Browser, Lossy/Lossless',
    desc:  'Compress JPG, PNG and WebP without uploading. Adjust quality and download. Free, no signup.',
    kw:    'image compressor, compress jpg, compress png, image optimizer, webp compress',
    name:  'Image Compressor',
    faq: [['Batch mode?', 'Yes.']]
  },
  'img-convert': {
    file: 'tools/img-convert.html',
    title: 'Image Converter — JPG, PNG, WebP, AVIF',
    desc:  'Convert images between JPG, PNG, WebP and AVIF in your browser. Free, no signup.',
    kw:    'image converter, jpg to png, png to webp, image format converter, webp to jpg',
    name:  'Image Format Converter',
    faq: [['Transparency?', 'Preserved where the format supports it.']]
  },
  'img-resize': {
    file: 'tools/img-resize.html',
    title: 'Image Resizer — Free Online, In-Browser',
    desc:  'Resize images by pixels or percentage with aspect-ratio lock. Free, no signup.',
    kw:    'image resizer, resize image, resize jpg, resize png, photo resizer',
    name:  'Image Resizer',
    faq: [['Batch?', 'Yes.']]
  },
  'img-crop': {
    file: 'tools/img-crop.html',
    title: 'Image Crop Tool — Free Online Cropper',
    desc:  'Crop images with precise pixel control or fixed aspect ratios. Free, in-browser.',
    kw:    'image crop, crop photo online, crop jpg, image cropper, square crop',
    name:  'Image Crop Tool',
    faq: [['Aspect presets?', '1:1, 4:3, 16:9, 9:16 and free.']]
  },
  'img-rotate': {
    file: 'tools/img-rotate.html',
    title: 'Rotate & Flip Image — Free Online',
    desc:  'Rotate by any angle and flip images horizontally or vertically. Free, in-browser.',
    kw:    'rotate image, flip image, mirror image, image rotator, rotate jpg',
    name:  'Rotate & Flip Image',
    faq: [['Custom angle?', 'Yes.']]
  },
  'img-watermark': {
    file: 'tools/img-watermark.html',
    title: 'Image Watermark Tool — Free, In-Browser',
    desc:  'Add text or image watermarks to your photos. Batch supported. Free, no signup.',
    kw:    'watermark image, add watermark, image watermark tool, logo watermark, batch watermark',
    name:  'Image Watermark Tool',
    faq: [['Logo watermark?', 'Yes — upload a PNG.']]
  },
  'img-annotate': {
    file: 'tools/img-annotate.html',
    title: 'Image Annotator — Arrows, Text, Shapes',
    desc:  'Add arrows, text and shapes to screenshots and photos. Free, in-browser.',
    kw:    'image annotator, annotate screenshot, mark up image, image notes, screenshot arrows',
    name:  'Image Annotator',
    faq: [['Layers?', 'Yes, basic layering.']]
  },
  'img-blur': {
    file: 'tools/img-blur.html',
    title: 'Blur & Pixelate Tool — Hide Faces or Data',
    desc:  'Blur faces, license plates or sensitive info on images. Free, in-browser, no upload.',
    kw:    'blur image, pixelate image, hide faces, blur sensitive info, censor image online',
    name:  'Blur / Pixelate Tool',
    faq: [['Reversible?', 'Strong blur or pixelation is generally not reversible from the output image.']]
  },
  'img-meme': {
    file: 'tools/img-meme.html',
    title: 'Meme Generator — Free, Top & Bottom Text',
    desc:  'Make memes with classic top/bottom text or custom layouts. Free, in-browser.',
    kw:    'meme generator, make meme online, meme maker, custom meme, top bottom text',
    name:  'Meme Generator',
    faq: [['Custom fonts?', 'Includes the classic Impact stack.']]
  },
  'img-base64': {
    file: 'tools/img-base64.html',
    title: 'Image to Base64 — Free Online Converter',
    desc:  'Convert images to Base64 data URIs in your browser. Copy-ready for HTML/CSS. Free.',
    kw:    'image to base64, base64 image, image data uri, png to base64, jpg to base64',
    name:  'Image to Base64 Converter',
    faq: [['Size warning?', 'Base64 inflates size by ~33%.']]
  },
  'base64-img': {
    file: 'tools/base64-img.html',
    title: 'Base64 to Image — Free Online Decoder',
    desc:  'Decode Base64 strings back into downloadable images. Free, in-browser.',
    kw:    'base64 to image, decode base64 image, base64 png, base64 jpg, data uri to image',
    name:  'Base64 to Image Decoder',
    faq: [['Format detection?', 'Automatic from data URI.']]
  },
  'img-exif': {
    file: 'tools/img-exif.html',
    title: 'EXIF Viewer & Remover — Free, In-Browser',
    desc:  'Inspect or strip EXIF metadata from photos in your browser. Protect location and device data. Free.',
    kw:    'exif viewer, exif remover, remove metadata photo, image metadata, strip exif, gps in photo',
    name:  'EXIF Viewer & Remover',
    faq: [['GPS?', 'Shown if present and removable.']]
  },
  'img-color-picker': {
    file: 'tools/img-color-picker.html',
    title: 'Color Picker from Image — Free Online',
    desc:  'Pick HEX, RGB and HSL colors from any image. Build palettes. Free, in-browser.',
    kw:    'color picker from image, image color picker, palette from image, hex from photo, eyedropper online',
    name:  'Color Picker from Image',
    faq: [['Auto palette?', 'Yes — extract dominant colors.']]
  },
  'img-favicon': {
    file: 'tools/img-favicon.html',
    title: 'Favicon Generator — Free, All Sizes',
    desc:  'Generate favicons in all required sizes plus a manifest. Free, in-browser, no signup.',
    kw:    'favicon generator, favicon maker, ico generator, favicon all sizes, apple touch icon',
    name:  'Favicon Generator',
    faq: [['Manifest included?', 'Yes.']]
  },
  'img-thumbnail': {
    file: 'tools/img-thumbnail.html',
    title: 'Thumbnail Generator — YouTube, Blog, Social',
    desc:  'Make sized thumbnails for YouTube, blogs and social media. Free, in-browser.',
    kw:    'thumbnail generator, youtube thumbnail maker, blog thumbnail, social thumbnail, og image generator',
    name:  'Thumbnail Generator',
    faq: [['OG image?', '1200×630 preset included.']]
  },
  'video-editor': {
    file: 'tools/video-editor.html',
    title: 'Online Video Editor — Trim, Crop, Caption',
    desc:  'Trim, crop and add text to videos in your browser. Free, no signup, no upload required.',
    kw:    'online video editor, trim video, crop video, browser video editor, add captions video',
    name:  'Online Video Editor',
    faq: [['Formats?', 'Common formats supported by your browser.']]
  },
  'video-to-audio': {
    file: 'tools/video-to-audio.html',
    title: 'Video to MP3 / WAV — Free, In-Browser',
    desc:  'Extract audio from video files to MP3 or WAV. Free, no upload, no signup.',
    kw:    'video to mp3, video to wav, extract audio from video, video to audio converter, mp4 to mp3',
    name:  'Video to MP3 / WAV Converter',
    faq: [['Quality?', 'Choose bitrate at export.']]
  },
  'p2p-call': {
    file: 'tools/p2p-call.html',
    title: 'P2P Video Call — No Signup, Browser Only',
    desc:  'Start a peer-to-peer video call from your browser. No app, no account. Free.',
    kw:    'p2p video call, browser video call, no signup video call, free video call, webrtc video call',
    name:  'P2P Video Call',
    network: true,
    faq: [
      ['Is it end-to-end?', 'WebRTC media is encrypted (DTLS-SRTP) between peers.'],
      ['Do you record calls?', 'No.']
    ]
  },
  'p2p-voice': {
    file: 'tools/p2p-voice.html',
    title: 'P2P Voice Call — Browser, No Signup',
    desc:  'Lightweight peer-to-peer voice calls from your browser. No app, no account. Free.',
    kw:    'p2p voice call, browser voice call, free voice call, no signup voice call, webrtc audio call',
    name:  'P2P Voice Call',
    network: true,
    faq: [['Recording?', 'Not by us.']]
  },
  'temp-chat': {
    file: 'tools/temp-chat.html',
    title: 'Temp Chat — Anonymous Browser Chat Rooms',
    desc:  "Spin up a temporary chat room with a link. No signup, message history isn't kept after you leave.",
    kw:    'temporary chat, anonymous chat, throwaway chat room, no signup chat, private chat link',
    name:  'Temp Chat',
    network: true,
    faq: [['Is it end-to-end encrypted?', 'Connections use TLS in transit; treat it as a temporary, not high-secrecy, channel.']]
  },
  'p2p-file': {
    file: 'tools/p2p-file.html',
    title: 'P2P File Transfer — Browser, No Upload to Server',
    desc:  'Send files peer-to-peer between browsers with a link. No account, no server storage.',
    kw:    'p2p file transfer, browser file transfer, send file no signup, webrtc file share, peer to peer file',
    name:  'P2P File Transfer',
    network: true,
    faq: [
      ['Size limit?', 'Limited only by browser memory and the connection.'],
      ['Stored on a server?', 'No.']
    ]
  },
  'ip-lookup': {
    file: 'tools/ip-lookup.html',
    title: 'IP Lookup & Map — Geolocation, ASN, ISP',
    desc:  'Look up any IP address with location, ASN and ISP. Free, no signup.',
    kw:    'ip lookup, ip geolocation, ip address info, what is my ip, asn lookup',
    name:  'IP Lookup & Map',
    network: true,
    faq: [['Accurate to a street?', 'No — usually city/region level.']]
  },
  'text-translators': {
    file: 'tools/text-translators.html',
    title: 'Fun Text Translators — Runes, Morse, Emoji & More',
    desc:  'A hub of free fun text translators: runes, Morse, binary, Pig Latin, NATO, Braille, upside-down and more.',
    kw:    'fun text translators, text translator hub, online text translators, fancy text generators',
    name:  'Fun Text Translators',
    faq: [['Best for kids?', 'Try Pig Latin, Emoji Text and Runes.']]
  },
  runes: {
    file: 'tools/runes.html',
    title: 'English to Runes Translator — Free Online',
    desc:  'Convert English text to Elder Futhark runes. Copy-friendly, in-browser, free.',
    kw:    'english to runes, runes translator, elder futhark translator, runic text, viking runes generator',
    name:  'English to Runes Translator',
    faq: [['Authentic?', 'Letter-by-letter mapping; not a linguistic translation.']]
  },
  morse: {
    file: 'tools/morse.html',
    title: 'Morse Code Translator — English ⇄ Morse',
    desc:  'Translate English to Morse code and back. Audio playback, free, in-browser.',
    kw:    'morse code translator, english to morse, morse to english, morse code, morse audio',
    name:  'English ⇄ Morse Code Translator',
    faq: [['Speed control?', 'Yes.']]
  },
  binary: {
    file: 'tools/binary.html',
    title: 'English to Binary Translator — Free Online',
    desc:  'Convert English text to binary and back. ASCII or UTF-8. Free, in-browser.',
    kw:    'english to binary, binary translator, text to binary, binary to text, ascii to binary',
    name:  'English ⇄ Binary Translator',
    faq: [['UTF-8?', 'Yes.']]
  },
  'pig-latin': {
    file: 'tools/pig-latin.html',
    title: 'Pig Latin Translator — Free Online',
    desc:  'Convert English to Pig Latin and back. Fun, fast, free, in-browser.',
    kw:    'pig latin translator, english to pig latin, pig latin converter, pig latin online',
    name:  'English ⇄ Pig Latin Translator',
    faq: [['Punctuation preserved?', 'Yes.']]
  },
  nato: {
    file: 'tools/nato.html',
    title: 'NATO Phonetic Alphabet Translator — Free',
    desc:  'Convert any text to the NATO phonetic alphabet (Alpha, Bravo, Charlie...). Free, in-browser.',
    kw:    'nato phonetic alphabet, nato translator, alpha bravo charlie, phonetic alphabet, military alphabet',
    name:  'NATO Phonetic Alphabet Translator',
    faq: [['Numbers?', 'Included.']]
  },
  braille: {
    file: 'tools/braille.html',
    title: 'English to Braille Translator — Free Online',
    desc:  'Convert English text to Braille (Grade 1). Free, in-browser, copy-friendly.',
    kw:    'english to braille, braille translator, braille converter, grade 1 braille',
    name:  'English to Braille Translator',
    faq: [['Grade 2 contractions?', 'Not yet.']]
  },
  'upside-down': {
    file: 'tools/upside-down.html',
    title: 'Upside-down Text Generator — Free Online',
    desc:  'Flip text upside-down for fun social posts. Copy-ready Unicode. Free, in-browser.',
    kw:    'upside down text, flip text, text flipper, upside down generator, unicode flip text',
    name:  'Upside-down Text Generator',
    faq: [['Works on Twitter/Instagram?', 'Generally yes.']]
  },
  medieval: {
    file: 'tools/medieval.html',
    title: 'Medieval Fantasy Text Generator — Free Online',
    desc:  'Convert text into medieval and fantasy-style Unicode fonts. Free, in-browser.',
    kw:    'medieval text generator, fantasy text generator, gothic text, blackletter text, old english font generator',
    name:  'Medieval / Fantasy Text Generator',
    faq: [['Are these real fonts?', 'Unicode look-alikes that work as plain text.']]
  },
  'emoji-text': {
    file: 'tools/emoji-text.html',
    title: 'Emoji Text Generator — Big Letter Emojis',
    desc:  'Turn your message into giant emoji letters or sprinkle relevant emojis throughout. Free.',
    kw:    'emoji text generator, emoji letters, big emoji text, emoji art, emoji typer',
    name:  'Emoji Text Generator',
    faq: [['All platforms?', "Renders depend on the recipient's device emoji set."]]
  },
  hieroglyphics: {
    file: 'tools/hieroglyphics.html',
    title: 'Hieroglyphics Name Generator — Free Online',
    desc:  'Write your name in Egyptian-style hieroglyphics. Free, in-browser, fun.',
    kw:    'hieroglyphics translator, name in hieroglyphics, egyptian hieroglyphics generator, hieroglyphic name',
    name:  'Hieroglyphics Name Generator',
    faq: [['Authentic translation?', 'Phonetic mapping, not academic transliteration.']]
  },
  scroll: {
    file: 'tools/scroll.html',
    title: 'Ancient Scroll Image Generator — Free Online',
    desc:  'Place your text on an aged scroll image and download. Free, in-browser, no signup.',
    kw:    'ancient scroll generator, scroll image maker, old paper text image, parchment image',
    name:  'Ancient Scroll Image Generator',
    faq: [['High-res?', 'Choose export size.']]
  },
  certificate: {
    file: 'tools/certificate.html',
    title: 'Certificate Generator — Free Printable PDFs',
    desc:  'Create printable certificates from templates. Bulk mode, PDF export, free, in-browser.',
    kw:    'certificate generator, free certificate maker, certificate template, printable certificate, bulk certificates',
    name:  'Certificate Generator',
    faq: [['Bulk mode?', 'Yes — paste a list or CSV of names.']]
  },
  'typing-test': {
    file: 'tools/typing-test.html',
    title: 'Typing Speed Test — WPM & Accuracy, Free',
    desc:  'Test your typing speed (WPM) and accuracy with random or custom passages. Free, in-browser.',
    kw:    'typing test, typing speed test, wpm test, words per minute test, typing accuracy',
    name:  'Typing Speed Test',
    faq: [['Custom text?', 'Yes, paste your own.']]
  },
  encrypt: {
    file: 'tools/encrypt.html',
    title: 'AES-256 File Encryption Online — In-Browser',
    desc:  "Encrypt and decrypt files with AES-256 in your browser. Files never leave your device. Free, no signup.",
    kw:    'aes 256 encryption, encrypt file online, file encryption, decrypt file, browser encryption',
    name:  'AES-256 File Encryption',
    faq: [
      ['Algorithm?', 'AES-256-GCM with PBKDF2 key derivation.'],
      ['Can you recover my password?', 'No — the file is unrecoverable without it.']
    ]
  }
};

// ---- helpers ----
const escAttr = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const escJson = s => String(s); // values go through JSON.stringify

function buildJsonLd(slug, e) {
  const url = `${SITE}/${slug}`;
  const sw = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: e.name,
    description: e.desc,
    url,
    applicationCategory: 'UtilityApplication',
    operatingSystem: 'Any (Web)',
    isAccessibleForFree: true,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
    publisher: { '@type': 'Organization', name: 'UtilityTools.eu', url: SITE }
  };
  const faq = e.faq && e.faq.length ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: e.faq.map(([q, a]) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a }
    }))
  } : null;
  const blocks = [JSON.stringify(sw, null, 2)];
  if (faq) blocks.push(JSON.stringify(faq, null, 2));
  return blocks.map(b => `<script type="application/ld+json">${b}</script>`).join('\n  ');
}

const BEGIN = '<!-- SEO:BEGIN (managed by scripts/apply-seo.js) -->';
const END   = '<!-- SEO:END -->';

function buildBlock(slug, e) {
  const url = `${SITE}/${slug}`;
  const ogImage = `${SITE}/og-image.svg`;
  return [
    BEGIN,
    `  <title>${escAttr(e.title)}</title>`,
    `  <meta name="description" content="${escAttr(e.desc)}">`,
    `  <meta name="keywords" content="${escAttr(e.kw)}">`,
    `  <meta name="robots" content="index,follow,max-image-preview:large">`,
    `  <link rel="canonical" href="${url}">`,
    `  <meta property="og:type" content="website">`,
    `  <meta property="og:site_name" content="UtilityTools.eu">`,
    `  <meta property="og:title" content="${escAttr(e.title)}">`,
    `  <meta property="og:description" content="${escAttr(e.desc)}">`,
    `  <meta property="og:url" content="${url}">`,
    `  <meta property="og:image" content="${ogImage}">`,
    `  <meta name="twitter:card" content="summary_large_image">`,
    `  <meta name="twitter:title" content="${escAttr(e.title)}">`,
    `  <meta name="twitter:description" content="${escAttr(e.desc)}">`,
    `  <meta name="twitter:image" content="${ogImage}">`,
    `  ${buildJsonLd(slug, e)}`,
    `  ${END}`
  ].join('\n');
}

// Strip the legacy meta tags we are replacing (only when found inside <head>).
const STRIP_PATTERNS = [
  /\s*<title>[\s\S]*?<\/title>/i,
  /\s*<meta\s+name=["']description["'][^>]*>/ig,
  /\s*<meta\s+name=["']keywords["'][^>]*>/ig,
  /\s*<meta\s+name=["']robots["'][^>]*>/ig,
  /\s*<link\s+rel=["']canonical["'][^>]*>/ig,
  /\s*<meta\s+property=["']og:[^"']+["'][^>]*>/ig,
  /\s*<meta\s+name=["']twitter:[^"']+["'][^>]*>/ig,
  /\s*<script\s+type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/ig
];

function processFile(slug, e) {
  const abs = path.join(ROOT, e.file);
  if (!fs.existsSync(abs)) {
    console.warn(`[skip] ${slug}: ${e.file} not found`);
    return false;
  }
  let html = fs.readFileSync(abs, 'utf8');
  const headMatch = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
  if (!headMatch) {
    console.warn(`[skip] ${slug}: no <head>`);
    return false;
  }
  let head = headMatch[1];

  // Remove any previous managed block.
  head = head.replace(new RegExp(`\\s*${BEGIN}[\\s\\S]*?${END}`), '');
  // Strip legacy individual tags.
  for (const re of STRIP_PATTERNS) head = head.replace(re, '');

  // Keep the first <meta charset> and viewport at the top; we just append the managed block.
  const block = buildBlock(slug, e);
  head = head.trimEnd() + '\n  ' + block + '\n';

  const newHtml = html.replace(headMatch[0], `<head>${head}</head>`);
  fs.writeFileSync(abs, newHtml, 'utf8');
  return true;
}

let ok = 0, skipped = 0;
for (const [slug, e] of Object.entries(SEO)) {
  const r = processFile(slug, e);
  if (r) ok++; else skipped++;
}
console.log(`[apply-seo] updated=${ok} skipped=${skipped} total=${Object.keys(SEO).length}`);

