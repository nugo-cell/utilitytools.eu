// Structured long-form guide content rendered below selected tools.
// Keep this server-side so canonical tool routes return useful text in the initial HTML.

const TOOL_GUIDES = {
  json: {
    title: 'JSON Formatter guide',
    intro: [
      'The JSON Formatter turns compact, hard-to-read JSON into an indented structure you can inspect, copy and validate. It is useful when you receive an API response, webhook payload, configuration file or browser storage export and need to understand it quickly.',
      'The formatter also minifies valid JSON when you need a smaller payload for an example, test fixture or request body. Syntax errors are reported immediately, so you can find missing commas, unquoted keys, extra braces and other common mistakes before pasting JSON into code or sending it to an API.'
    ],
    useCases: [
      'Checking API responses from fetch, cURL, Postman or browser developer tools.',
      'Cleaning up configuration snippets before adding them to documentation or support tickets.',
      'Minifying JSON for compact test payloads, embeds or local storage values.',
      'Quickly confirming whether a pasted object is valid JSON rather than JavaScript object syntax.'
    ],
    steps: [
      'Paste your JSON into the input box.',
      'Choose Pretty print to format it, Minify to remove whitespace, or Validate to only check syntax.',
      'Use the indent selector if your project prefers two spaces, four spaces or tabs.',
      'Expand or collapse nested objects and arrays when you only need a high-level view.',
      'Copy the output once the status message confirms the JSON is valid.'
    ],
    example: {
      input: '{"name":"UtilityTools","features":["format","minify","validate"],"private":true}',
      output: '{\n  "name": "UtilityTools",\n  "features": [\n    "format",\n    "minify",\n    "validate"\n  ],\n  "private": true\n}',
      note: 'The output is the same data with predictable indentation and valid JSON syntax.'
    },
    privacy: 'Formatting and validation happen with JavaScript in your browser. The JSON you paste is not uploaded to UtilityTools.eu, and there is no account or database storing your content.',
    limitations: [
      'This tool validates JSON syntax only; it does not validate against a JSON Schema.',
      'Very large files are limited by your browser memory and device performance.',
      'Comments and trailing commas are not valid JSON and will be reported as errors.'
    ],
    faq: [
      ['Can this format JavaScript objects?', 'Only strict JSON is accepted. Put quotes around object keys and remove comments or trailing commas first.'],
      ['Does pretty printing change values?', 'No. Valid JSON is parsed and serialized again, so object order is normally preserved but whitespace changes.'],
      ['Why does my API response fail validation?', 'Common causes are HTML error pages pasted by accident, a missing comma, an extra closing brace, or single quotes instead of double quotes.']
    ],
    related: ['json-editor', 'json-explorer', 'json-csv', 'xml', 'regex', 'base64']
  },
  password: {
    title: 'Password Generator guide',
    intro: [
      'The Password Generator creates random passwords directly in your browser. You choose the length, how many passwords to create, and whether to include lowercase letters, uppercase letters, digits, symbols or avoid ambiguous characters such as O, 0, I and l.',
      'It is intended for creating passwords that you then save in a trusted password manager. Longer random passwords are much harder to guess than memorable words or reused passwords, especially for email, banking, hosting, cloud services and administrator accounts.'
    ],
    useCases: [
      'Creating a unique password for a new online account.',
      'Generating temporary credentials for a test environment.',
      'Replacing weak or reused passwords during a security cleanup.',
      'Making several options at once when a system rejects certain symbol sets.'
    ],
    steps: [
      'Set the length. For most accounts, 16 to 24 characters is a practical minimum.',
      'Choose the character sets allowed by the website or system you are using.',
      'Turn on “avoid ambiguous” if the password will be read aloud or typed from paper.',
      'Click Generate and review the result.',
      'Copy the password into your password manager and avoid sending it over chat or email.'
    ],
    example: {
      input: 'Length 20, count 3, lowercase + uppercase + digits + symbols enabled.',
      output: 'Three separate 20-character random passwords, one per line.',
      note: 'Every click creates new values. Do not rely on examples shown in documentation as real passwords.'
    },
    privacy: 'Passwords are generated locally using browser cryptography APIs where available. UtilityTools.eu does not receive, log, store or transmit generated passwords.',
    limitations: [
      'A generated password is only useful if you store it safely and use it for one account only.',
      'Some websites reject specific symbols even when they claim to support symbols.',
      'This page is not a password manager and cannot recover a password after you leave.'
    ],
    faq: [
      ['How long should a password be?', 'Use at least 16 characters for normal accounts and more for high-value accounts if the service allows it.'],
      ['Should I include symbols?', 'Symbols increase the search space, but length and uniqueness matter more. Follow the rules of the system you are setting the password for.'],
      ['Can UtilityTools.eu see the generated password?', 'No. The generated text stays in the page in your browser until you copy or clear it.']
    ],
    related: ['hash', 'encrypt', 'qr', 'jwt', 'uuid', 'p2p-file']
  },
  encrypt: {
    title: 'File Encryption guide',
    intro: [
      'The File Encryption tool encrypts a local file with AES-256 in your browser and gives you an encrypted file plus the key needed to decrypt it. It is designed for everyday protection before storing a file in cloud storage, sending it to someone, or keeping a private archive on removable media.',
      'Because the file is processed locally, you do not need to upload sensitive documents to a conversion service. The most important rule is simple: keep the key safe. If the key is lost, UtilityTools.eu cannot recover the encrypted file.'
    ],
    useCases: [
      'Encrypting a document before placing it in shared cloud storage.',
      'Sending a private file where the file and key can be shared through separate channels.',
      'Protecting exports, backups or archives stored on a USB drive.',
      'Testing browser-based encryption workflows without creating an account.'
    ],
    steps: [
      'Choose the file you want to protect.',
      'Generate or enter the encryption key according to the tool controls.',
      'Run encryption and download the encrypted output file.',
      'Store the key separately from the encrypted file.',
      'Test decryption with a non-critical copy before relying on the encrypted archive.'
    ],
    example: {
      input: 'A PDF named invoice-records.pdf.',
      output: 'An encrypted file that cannot be opened without the generated key.',
      note: 'Send the encrypted file and the key through different channels whenever possible.'
    },
    privacy: 'The selected file is read by your browser and encrypted locally. It is not uploaded to UtilityTools.eu. The server only provides the web page and supporting JavaScript.',
    limitations: [
      'There is no recovery service or backdoor if you lose the key.',
      'Browser encryption is useful for everyday privacy, but regulated environments may require audited desktop tools and formal key management.',
      'Anyone with both the encrypted file and the key can decrypt the file.'
    ],
    faq: [
      ['Can I decrypt the file later?', 'Yes, if you keep the encrypted file and the exact key. Without the key, the file is not recoverable.'],
      ['Is this the same as a password-protected ZIP?', 'No. This tool encrypts the file content directly using browser cryptography rather than creating a ZIP container.'],
      ['Should I email the key with the file?', 'Avoid that. Use a separate channel such as a phone call, password manager share, or another secure message.']
    ],
    related: ['password', 'hash', 'p2p-file', 'pdf-signer', 'img-exif', 'jwt']
  },
  'pdf-editor': {
    title: 'PDF Editor guide',
    intro: [
      'The PDF Editor helps with practical page-level PDF work: reorder pages, rotate pages, delete unwanted pages and combine multiple PDFs. It is meant for quick document cleanup before emailing, archiving or printing, without uploading the document to a remote PDF service.',
      'This is not a full word processor for changing the text inside a PDF. It focuses on document assembly tasks that can be done safely in the browser with local files.'
    ],
    useCases: [
      'Removing blank scanner pages before sending a document.',
      'Rotating pages that were scanned sideways.',
      'Combining separate PDF attachments into one file.',
      'Reordering a signed cover page, invoice pages and supporting documents.'
    ],
    steps: [
      'Add one or more PDF files from your device.',
      'Review the page thumbnails and choose the pages you need.',
      'Rotate, delete or reorder pages using the visible controls.',
      'Merge the final document when the page order looks correct.',
      'Download the new PDF and open it locally to verify the result.'
    ],
    example: {
      input: 'contract.pdf plus scanned-appendix.pdf.',
      output: 'A single PDF with the contract first, appendix pages after it, and blank pages removed.',
      note: 'Always review the downloaded file before sending it as an official document.'
    },
    privacy: 'PDF files are loaded into your browser for editing. UtilityTools.eu does not upload or store the files you select.',
    limitations: [
      'The tool edits pages, not the text or layout inside a page.',
      'Password-protected or damaged PDFs may not load correctly.',
      'Large PDFs can be slow on older devices because all work is done locally.'
    ],
    faq: [
      ['Can I edit PDF text?', 'No. Use this tool for page operations such as merge, reorder, rotate and delete.'],
      ['Will form fields remain editable?', 'Some PDF features may be flattened or changed by browser PDF libraries, so check important forms after export.'],
      ['Are uploaded documents stored?', 'No upload is needed for normal PDF editing in this tool.']
    ],
    related: ['pdf-to-images', 'images-to-pdf', 'pdf-signer', 'docx-pdf', 'invoice', 'cv']
  },
  'pdf-to-images': {
    title: 'PDF to Images guide',
    intro: [
      'PDF to Images converts each page of a local PDF into PNG, JPG or WebP images. It is useful when you need page previews, thumbnails, slide images, visual evidence for a support ticket, or images that can be inserted into a document editor.',
      'You can choose the output format and resolution. Higher DPI creates sharper images but also larger files, so the best setting depends on whether the result is for a website, email, print draft or archive.'
    ],
    useCases: [
      'Creating preview images from a PDF brochure or report.',
      'Extracting one page as an image for a presentation.',
      'Making thumbnails for a document library.',
      'Converting a PDF page into an image before annotation or cropping.'
    ],
    steps: [
      'Select the PDF from your device.',
      'Choose PNG for crisp screenshots, JPG for smaller photos, or WebP for modern web use.',
      'Set the DPI or scale according to the detail you need.',
      'Convert the pages and inspect the previews.',
      'Download selected images or a ZIP containing all pages.'
    ],
    example: {
      input: 'A three-page PDF report at 150 DPI with PNG output.',
      output: 'page-1.png, page-2.png and page-3.png, each rendered from one PDF page.',
      note: 'Increasing DPI improves readability but also increases file size.'
    },
    privacy: 'The PDF is rendered in your browser. The file does not need to be uploaded to UtilityTools.eu for conversion.',
    limitations: [
      'Selectable text becomes pixels in the exported image.',
      'Very large or complex PDFs may take time to render.',
      'Some embedded fonts, transparency or annotations can render differently across browsers.'
    ],
    faq: [
      ['Which format should I choose?', 'PNG is best for crisp text, JPG is often smaller for photo-heavy pages, and WebP is useful for modern websites.'],
      ['Can I convert only one page?', 'Use the page controls or download the page image you need after conversion.'],
      ['Does conversion remove PDF metadata?', 'The exported images are newly rendered files, but you should still inspect sensitive outputs before sharing.']
    ],
    related: ['pdf-editor', 'images-to-pdf', 'img-compress', 'img-convert', 'img-annotate', 'img-resize']
  },
  'img-compress': {
    title: 'Image Compressor guide',
    intro: [
      'The Image Compressor reduces image file size in your browser by re-encoding JPG, PNG or WebP images with practical quality settings. It is useful before uploading images to a website, sending them by email, adding them to documents, or keeping a smaller archive.',
      'The preview and before/after size readout help you choose a quality level that still looks good. Compression is a balance: smaller files load faster, but very aggressive settings can add blur, banding or blocky artifacts.'
    ],
    useCases: [
      'Preparing website images that load faster on mobile connections.',
      'Shrinking screenshots before attaching them to email or support tickets.',
      'Reducing photo size for forms with strict upload limits.',
      'Creating smaller images before adding them to PDF or office documents.'
    ],
    steps: [
      'Choose or drop an image file into the tool.',
      'Select the output format if the tool offers a choice.',
      'Move the quality slider and compare the preview with the original.',
      'Check the estimated or actual size reduction.',
      'Download the compressed image and keep the original if it matters.'
    ],
    example: {
      input: 'A 4 MB JPG product photo.',
      output: 'A visually similar JPG around 700 KB, depending on quality and image detail.',
      note: 'Photos often compress much more than screenshots with sharp text.'
    },
    privacy: 'The image is decoded and re-encoded locally in your browser. It is not uploaded to UtilityTools.eu.',
    limitations: [
      'Repeatedly compressing the same JPG can reduce quality each time.',
      'PNG screenshots with text may become blurry if converted to low-quality JPG.',
      'Browser support for newer formats such as AVIF varies by device and browser.'
    ],
    faq: [
      ['Will compression change image dimensions?', 'Compression usually changes file size, not dimensions. Use the Image Resizer if you also need smaller width or height.'],
      ['What quality setting should I use?', 'Start around 75–85 for photos and compare the preview. Use higher quality for text-heavy images.'],
      ['Are my photos uploaded?', 'No. Processing happens locally on your device.']
    ],
    related: ['img-convert', 'img-resize', 'img-crop', 'pdf-to-images', 'images-to-pdf', 'img-exif']
  },
  'img-convert': {
    title: 'Image Converter guide',
    intro: [
      'The Image Converter changes local images between common web formats such as JPG, PNG, WebP and AVIF where your browser supports them. It is helpful when a website requires a specific format or when you want a better size-quality tradeoff.',
      'Different formats suit different images. JPG is widely compatible for photos, PNG is good for transparency and sharp graphics, WebP is efficient for websites, and AVIF can be very small but is not supported everywhere.'
    ],
    useCases: [
      'Converting a PNG screenshot to JPG before uploading to a form.',
      'Creating WebP versions of product photos for a website.',
      'Changing a transparent logo into PNG for compatibility.',
      'Testing whether AVIF gives a smaller acceptable result in your target browser.'
    ],
    steps: [
      'Select the source image from your device.',
      'Choose the target format supported by your browser.',
      'Adjust quality when converting to a lossy format such as JPG or WebP.',
      'Preview the converted image if available.',
      'Download the result and test it where you plan to use it.'
    ],
    example: {
      input: 'logo.webp from a design export.',
      output: 'logo.png for a system that only accepts PNG uploads.',
      note: 'Converting to PNG may increase file size but preserves transparency.'
    },
    privacy: 'Images are converted locally using browser image and canvas APIs. UtilityTools.eu does not receive your image file.',
    limitations: [
      'Some formats depend on browser support and may not appear on every device.',
      'Metadata such as EXIF may be stripped during canvas-based conversion.',
      'Converting a low-quality image to a new format cannot restore lost detail.'
    ],
    faq: [
      ['Which image format is best?', 'For photos use JPG or WebP, for transparency use PNG or WebP, and for modern web optimization test WebP or AVIF.'],
      ['Why did my file get larger?', 'Changing format can increase size, especially when converting compressed photos to PNG.'],
      ['Can I batch convert?', 'Use the controls available on the page; very large batches may be limited by browser memory.']
    ],
    related: ['img-compress', 'img-resize', 'svg-to-img', 'img-base64', 'base64-img', 'img-exif']
  },
  qr: {
    title: 'QR Code Generator guide',
    intro: [
      'The QR Code Generator turns text, URLs, Wi-Fi details or short instructions into a scannable QR code. It is useful for posters, labels, event material, classroom handouts, invoices and quick links where typing a long address would be inconvenient.',
      'A good QR code should be short, clear and tested. Shorter content creates a simpler code that scans more reliably, especially when printed small or viewed from a distance.'
    ],
    useCases: [
      'Adding a website link to a flyer or business card.',
      'Sharing a long URL during a presentation.',
      'Creating a label that opens instructions or a support page.',
      'Encoding contact details or plain text for offline use.'
    ],
    steps: [
      'Enter the URL or text you want people to scan.',
      'Generate the QR code and check that it appears clearly.',
      'Download the image in the format offered by the tool.',
      'Test the code with at least one phone before printing or publishing.',
      'Keep enough white margin around the QR code when placing it in a design.'
    ],
    example: {
      input: 'https://utilitytools.eu/json',
      output: 'A QR code that opens the JSON Formatter page when scanned.',
      note: 'For printed material, use a full HTTPS URL so scanners know it is a link.'
    },
    privacy: 'QR generation happens in your browser. The text you enter is not sent to UtilityTools.eu unless it is itself a link you later choose to open.',
    limitations: [
      'Very long text creates dense QR codes that can be harder to scan.',
      'A QR code does not make a link safe; users should still trust the destination.',
      'Print quality, size, contrast and glare affect scan reliability.'
    ],
    faq: [
      ['How small can I print a QR code?', 'It depends on distance and printer quality. Test the exact printed size before using it publicly.'],
      ['Can I put a logo in the middle?', 'If the tool supports styling, test carefully. Covering too much of the code can make it unreadable.'],
      ['Is the QR code dynamic?', 'No. The code contains the exact text or URL you enter. To change the destination later, use a URL you control.']
    ],
    related: ['url', 'base64', 'password', 'invoice', 'markdown', 'img-convert']
  },
  base64: {
    title: 'Base64 Encoder and Decoder guide',
    intro: [
      'The Base64 tool encodes plain text into Base64 and decodes Base64 back into readable text. Base64 is commonly used when binary-safe text is needed in JSON, HTML, email, API examples or configuration values.',
      'Base64 is an encoding, not encryption. Anyone can decode it. Use it for compatibility and transport, not for secrecy.'
    ],
    useCases: [
      'Decoding API examples, JWT sections or configuration snippets.',
      'Encoding small text values for tests or documentation.',
      'Checking whether a string is valid Base64 before using it in code.',
      'Understanding data URLs and embedded content examples.'
    ],
    steps: [
      'Paste text into the input box.',
      'Choose encode to create Base64 or decode to read Base64.',
      'Review the output for unexpected characters or decoding errors.',
      'Copy the result into your code, request body or documentation.',
      'Use the image-specific Base64 tools when working with image data URLs.'
    ],
    example: {
      input: 'hello utilitytools',
      output: 'aGVsbG8gdXRpbGl0eXRvb2xz',
      note: 'Decoding the output returns the original text.'
    },
    privacy: 'Encoding and decoding are performed in the browser. UtilityTools.eu does not receive the text you paste.',
    limitations: [
      'Base64 increases size by roughly one third compared with raw bytes.',
      'It provides no confidentiality or tamper protection.',
      'Different systems may require URL-safe Base64 variants or padding rules.'
    ],
    faq: [
      ['Is Base64 secure?', 'No. It is reversible encoding. Use encryption if you need secrecy.'],
      ['Why does my decoded text look broken?', 'The original data may be binary, use a different character encoding, or not be Base64 text.'],
      ['What does the equals sign mean?', 'Equals signs are padding used by standard Base64 to complete the final group of characters.']
    ],
    related: ['img-base64', 'base64-img', 'json', 'jwt', 'url', 'hash']
  },
  hash: {
    title: 'Hash Generator guide',
    intro: [
      'The Hash Generator calculates cryptographic hashes such as SHA-256 from text or files. A hash is a fixed-length fingerprint: the same input gives the same hash, while even a tiny change should produce a very different value.',
      'Hashes are useful for checksums, file integrity checks, comparing content without sharing the original, and technical debugging. They are not encryption because they cannot be decrypted back to the original input.'
    ],
    useCases: [
      'Checking whether a downloaded file matches a published SHA-256 checksum.',
      'Comparing two text snippets or files without visually inspecting every byte.',
      'Creating reproducible identifiers for non-secret test data.',
      'Debugging APIs that require request signing or hash examples.'
    ],
    steps: [
      'Choose whether to hash text or a local file.',
      'Select the algorithm required by your workflow.',
      'Enter the text or pick the file.',
      'Generate the hash and copy the hexadecimal result.',
      'Compare hashes character by character when verifying integrity.'
    ],
    example: {
      input: 'hello',
      output: 'SHA-256: 2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824',
      note: 'Changing the input to “Hello” produces a completely different hash.'
    },
    privacy: 'Text and files are hashed locally in your browser using web APIs. Files are not uploaded to UtilityTools.eu.',
    limitations: [
      'Plain hashes are not suitable for storing passwords. Password systems need salts and slow algorithms such as bcrypt, scrypt or Argon2.',
      'MD5 and SHA-1 are kept only for compatibility checks and should not be used for new security-sensitive designs.',
      'A matching hash proves content equality, not that a file is safe to open.'
    ],
    faq: [
      ['Which algorithm should I use?', 'Use SHA-256 for most modern integrity checks unless a specific system requires another algorithm.'],
      ['Can a hash be reversed?', 'A secure hash is designed to be one-way, but weak or common inputs can be guessed by trying many possibilities.'],
      ['Can UtilityTools.eu read my file?', 'No. The browser reads and hashes the local file without uploading it.']
    ],
    related: ['password', 'encrypt', 'base64', 'jwt', 'uuid', 'json']
  },
  regex: {
    title: 'Regex Tester guide',
    intro: [
      'The Regex Tester lets you test JavaScript regular expressions against sample text and see matches before using the pattern in code. It is a safer way to build patterns for validation, extraction, search-and-replace planning or log inspection.',
      'Regular expressions can be powerful but easy to misread. Testing with realistic examples and edge cases helps avoid patterns that work only for the first happy-path string.'
    ],
    useCases: [
      'Testing an email, slug, ID or filename validation pattern.',
      'Extracting IDs, dates or codes from logs and pasted text.',
      'Checking capture groups before using a pattern in JavaScript.',
      'Debugging why a pattern is too greedy or not matching Unicode text.'
    ],
    steps: [
      'Enter the regular expression pattern and flags supported by JavaScript.',
      'Paste realistic sample text with both matching and non-matching examples.',
      'Review highlighted matches and capture groups.',
      'Adjust anchors, character classes and quantifiers until the result is correct.',
      'Test edge cases before copying the pattern into production code.'
    ],
    example: {
      input: 'Pattern: \\b[A-Z]{2}-\\d{4}\\b, Text: Ticket DK-2026 is ready.',
      output: 'Match: DK-2026',
      note: 'The word boundaries prevent partial matches inside longer strings.'
    },
    privacy: 'Patterns and test text stay in your browser. UtilityTools.eu does not receive the text you use for testing.',
    limitations: [
      'The tool uses JavaScript regular expression behavior, which can differ from PCRE, Python, Java or .NET.',
      'A regex that works on examples can still fail on real-world messy data.',
      'Complex patterns can be hard to maintain and may perform poorly on very long input.'
    ],
    faq: [
      ['Which regex flavor is this?', 'JavaScript / ECMAScript regex, matching what modern browsers support.'],
      ['Why does my lookbehind fail?', 'Lookbehind support depends on the browser version and must follow JavaScript regex rules.'],
      ['Should I validate email with one huge regex?', 'Usually no. Use practical checks plus confirmation emails for real account systems.']
    ],
    related: ['json', 'count', 'case', 'slug', 'url', 'markdown']
  },
  markdown: {
    title: 'Markdown Preview guide',
    intro: [
      'The Markdown Preview tool gives you a live rendered view of Markdown while you write. It is useful for README files, documentation drafts, notes, blog outlines, changelogs and support snippets where plain text needs light formatting.',
      'Markdown is intentionally simple. You can write headings, lists, links, code blocks and quotes without leaving the keyboard, then preview how the result will read before publishing it elsewhere.'
    ],
    useCases: [
      'Drafting a GitHub README or issue comment.',
      'Previewing documentation before pasting it into a CMS.',
      'Writing release notes with headings and bullet lists.',
      'Checking code fences, links and table formatting.'
    ],
    steps: [
      'Type or paste Markdown into the editor.',
      'Watch the preview update as you write.',
      'Use headings to create structure and code fences for examples.',
      'Check links and lists visually before copying.',
      'Export or copy the HTML/Markdown output if the page provides that option.'
    ],
    example: {
      input: '# Notes\n\n- Fast\n- Private\n\n`code`',
      output: 'A heading, a two-item list and inline code in the preview pane.',
      note: 'The Markdown source remains readable even without rendering.'
    },
    privacy: 'Markdown text is rendered locally in your browser. Drafts are not uploaded to UtilityTools.eu by the preview tool.',
    limitations: [
      'Different platforms support different Markdown extensions.',
      'A preview here may not exactly match GitHub, GitLab, Discord or your CMS.',
      'Avoid pasting untrusted HTML into systems that allow raw HTML without sanitization.'
    ],
    faq: [
      ['Why does my table look different elsewhere?', 'Markdown tables are an extension and platform styling varies. Test in the final publishing system.'],
      ['Can I use HTML inside Markdown?', 'Some renderers allow it and some block it. Treat raw HTML as platform-specific.'],
      ['Is my draft saved?', 'Check the tool controls. In general, do not rely on a browser tab as the only copy of important writing.']
    ],
    related: ['count', 'case', 'slug', 'html', 'json', 'regex'].filter(Boolean)
  },
  timestamp: {
    title: 'Unix Timestamp Converter guide',
    intro: [
      'The Unix Timestamp Converter converts epoch timestamps into human-readable dates and converts dates back to epoch time. Developers often see Unix timestamps in logs, databases, APIs, analytics exports, message queues and scheduled jobs.',
      'A timestamp by itself is easy to misread because systems may store seconds, milliseconds or ISO dates, and time zones can change the displayed local time. This tool helps you check the exact meaning before debugging or editing data.'
    ],
    useCases: [
      'Reading timestamps from server logs or database rows.',
      'Creating test values for API requests and webhook payloads.',
      'Checking whether a token expiry time is in seconds or milliseconds.',
      'Comparing UTC time with your local browser time.'
    ],
    steps: [
      'Paste a Unix timestamp or enter a date and time.',
      'Check whether the value is interpreted as seconds or milliseconds.',
      'Compare UTC output with local time where relevant.',
      'Adjust the input until the displayed date matches your intent.',
      'Copy the value in the format required by your system.'
    ],
    example: {
      input: '1767225600',
      output: '2026-01-01 00:00:00 UTC',
      note: 'The local displayed time may differ depending on your time zone.'
    },
    privacy: 'Conversions are calculated in your browser. Dates and timestamps are not sent to UtilityTools.eu.',
    limitations: [
      'Time zone names, daylight-saving rules and historical offsets depend on browser data.',
      'Some systems use milliseconds, microseconds or nanoseconds rather than seconds.',
      'Leap seconds are generally not represented in standard Unix time handling.'
    ],
    faq: [
      ['Why is my timestamp in 1970?', 'You may have pasted milliseconds into a seconds field or seconds into a milliseconds field.'],
      ['Should APIs use UTC?', 'UTC is usually safest for storage and APIs. Convert to local time only for display.'],
      ['Does daylight saving time matter?', 'Yes for local display and scheduling. Store instants in UTC when possible.']
    ],
    related: ['timezones', 'age', 'pomodoro', 'json', 'uuid']
  },
  currency: {
    title: 'Currency Converter guide',
    intro: [
      'The Currency Converter converts between common currencies using live ECB-based rates when available and a built-in fallback table when offline. It is intended for quick estimates, budgeting, travel planning and checking approximate invoice or subscription amounts.',
      'Exchange rates move over time and providers may round differently. Treat the result as a practical reference, not as a guaranteed bank, card or tax rate.'
    ],
    useCases: [
      'Estimating the local cost of a subscription or purchase.',
      'Planning travel spending across multiple currencies.',
      'Checking approximate invoice amounts before sending or paying.',
      'Comparing recent rate movement using the available history chart.'
    ],
    steps: [
      'Enter the amount you want to convert.',
      'Choose the source and target currencies.',
      'Review the converted amount and rate date.',
      'Use the history chart when you need context for recent movement.',
      'Confirm final rates with your bank, payment provider or accountant when money decisions matter.'
    ],
    example: {
      input: '100 EUR to DKK',
      output: 'An estimated DKK amount based on the current or fallback rate shown by the tool.',
      note: 'Card issuers and banks can add fees or use a different rate date.'
    },
    privacy: 'The amount and selected currencies are handled in the browser. The tool may request public exchange-rate data, but your typed amount is not sent as personal account data to UtilityTools.eu.',
    limitations: [
      'Rates are informational and can differ from bank, card, cash exchange or accounting rates.',
      'Fallback offline rates may be stale and are only for rough estimates.',
      'Taxes, fees, spreads and settlement dates are not included.'
    ],
    faq: [
      ['Are these rates official for accounting?', 'No. Use your accounting system, bank statement or official tax guidance for formal records.'],
      ['Why does my bank show a different amount?', 'Banks and cards often include spreads, fees and different settlement dates.'],
      ['Can I use it offline?', 'The page includes fallback rates for estimates when live rates are unavailable.']
    ],
    related: ['budget', 'invoice', 'tip', 'fuel', 'calories']
  },
  budget: {
    title: 'Budget Calculator guide',
    intro: [
      'The Budget Calculator helps you list income and expenses, calculate totals and print a clean overview. It is useful for household planning, student budgets, freelance estimates, moving costs or a quick monthly checkup.',
      'A simple budget is often more useful than a complex finance app when you only need to see where money goes. The goal is to make income, fixed costs and flexible spending visible enough to support a decision.'
    ],
    useCases: [
      'Planning a monthly household budget.',
      'Estimating whether a rent, subscription or loan payment is affordable.',
      'Preparing a simple printable overview for a meeting.',
      'Checking how small recurring expenses affect the total.'
    ],
    steps: [
      'Enter your income sources first.',
      'Add fixed expenses such as rent, utilities, insurance and subscriptions.',
      'Add variable categories such as food, transport and entertainment.',
      'Review the remaining balance and adjust categories as needed.',
      'Print or save the report for your own records.'
    ],
    example: {
      input: 'Income: 2500. Expenses: rent 1000, food 350, transport 120, subscriptions 45.',
      output: 'A calculated remaining balance after listed expenses.',
      note: 'Use realistic monthly averages rather than the best-case month.'
    },
    privacy: 'Budget values are calculated in your browser. UtilityTools.eu does not store your income, expenses or printed report.',
    limitations: [
      'This is a planning tool, not financial advice.',
      'Irregular annual costs should be divided into monthly equivalents for a fair view.',
      'The result is only as accurate as the numbers you enter.'
    ],
    faq: [
      ['Should I include yearly bills?', 'Yes. Divide yearly costs by 12 so they are visible in the monthly budget.'],
      ['Can I use this for business accounting?', 'Use it for rough planning only. Formal accounting needs proper records and tax rules.'],
      ['Is my budget saved online?', 'No. The site has no account or database for your budget.']
    ],
    related: ['currency', 'invoice', 'tip', 'fuel', 'text-to-excel']
  },
  invoice: {
    title: 'Invoice Generator guide',
    intro: [
      'The Invoice Generator creates a clean invoice with line items, quantities, prices, tax or discount fields and payment details. It is intended for freelancers, small businesses and private one-off invoices that need a printable PDF-style document quickly.',
      'The tool helps with formatting and calculations, but you are responsible for the legal and tax details required in your country, industry and customer agreement.'
    ],
    useCases: [
      'Preparing a simple invoice for freelance work.',
      'Creating a printable record for a one-time sale or service.',
      'Estimating totals with tax and discounts before final accounting.',
      'Saving invoice data locally as JSON for later editing if the tool supports it.'
    ],
    steps: [
      'Enter seller and customer details.',
      'Add invoice number, date, due date and payment terms.',
      'Add each line item with quantity, unit price and tax or discount if needed.',
      'Review totals carefully before sending.',
      'Print to PDF or download the invoice according to the available controls.'
    ],
    example: {
      input: 'Design work, 10 hours at 60 EUR, plus 25% VAT.',
      output: 'An invoice showing subtotal, VAT amount and total due.',
      note: 'Check local invoice-numbering and VAT rules before using the document commercially.'
    },
    privacy: 'Invoice data is processed in your browser. UtilityTools.eu does not store customer names, addresses, line items or payment details on a server.',
    limitations: [
      'This is not accounting software and does not file taxes or send e-invoices.',
      'Legal invoice requirements vary by country and business type.',
      'You should keep your own records and backups of issued invoices.'
    ],
    faq: [
      ['Is this invoice legally valid?', 'It can help you create a document, but validity depends on local rules and the information you include.'],
      ['Can I add VAT?', 'Use the tax fields if available, and confirm the correct rate for your situation.'],
      ['Where is invoice data stored?', 'In the browser while you use the page, and only in local storage if the tool explicitly offers local save/autosave.']
    ],
    related: ['budget', 'currency', 'pdf-editor', 'pdf-signer', 'cv', 'text-to-excel']
  },
  count: {
    title: 'Text Counter guide',
    intro: [
      'The Text Counter measures characters, words, lines, bytes and estimated reading time as you type or paste text. It is useful for social posts, meta descriptions, essays, forms, translations, SMS-style limits and editorial checks.',
      'Counting rules can vary between platforms, especially for emojis, combined Unicode characters and line endings. This tool gives a practical browser-based count and makes the text length visible before you submit it elsewhere.'
    ],
    useCases: [
      'Checking a title, summary or meta description length.',
      'Counting words in an essay, application or translation.',
      'Estimating reading time for a blog post or documentation page.',
      'Finding whether pasted content exceeds a form limit.'
    ],
    steps: [
      'Paste or type your text into the input area.',
      'Review word, character, line and byte counts.',
      'Edit the text and watch the counts update.',
      'Use reading-time estimates as a rough editorial guide.',
      'Copy your final text into the destination platform and check its own counter if strict limits apply.'
    ],
    example: {
      input: 'UtilityTools.eu runs tools in your browser.',
      output: 'A count of words, characters and estimated read time for that sentence.',
      note: 'Bytes can be higher than characters when text contains emojis or non-ASCII letters.'
    },
    privacy: 'All counting happens locally in your browser. UtilityTools.eu does not upload or store the text you paste.',
    limitations: [
      'Different apps count hashtags, URLs, emojis and whitespace differently.',
      'Reading time is an estimate and depends on audience and content difficulty.',
      'Byte counts depend on encoding, normally UTF-8 on the web.'
    ],
    faq: [
      ['Why is byte count different from character count?', 'Characters outside basic ASCII can use multiple UTF-8 bytes. Emojis are a common example.'],
      ['What reading speed is used?', 'The tool uses a general words-per-minute estimate; treat it as approximate.'],
      ['Does the site store my writing?', 'No. The text remains in your browser.']
    ],
    related: ['case', 'markdown', 'slug', 'regex', 'lorem']
  },
  'xml-editor': {
    title: 'XML Editor guide',
    intro: [
      'The XML Editor helps you inspect and edit XML elements, attributes and text in a structured way. It is useful for configuration files, feeds, exports, integration samples and legacy systems where XML is still the required format.',
      'Instead of editing a dense XML string blindly, you can work with the document structure, then download the modified XML. This reduces common mistakes such as broken closing tags or misplaced attributes.'
    ],
    useCases: [
      'Editing a small XML configuration file.',
      'Renaming elements or updating attributes in an integration sample.',
      'Cleaning exported XML before sharing it with support or developers.',
      'Learning how nested XML documents are structured.'
    ],
    steps: [
      'Paste XML or load a local XML file.',
      'Review the parsed structure and locate the element you need.',
      'Edit element names, attributes or text values using the page controls.',
      'Validate or preview the resulting XML where available.',
      'Download the modified file and test it in the target system.'
    ],
    example: {
      input: '<book id="1"><title>Old title</title></book>',
      output: '<book id="1"><title>New title</title></book>',
      note: 'The structure stays the same while the text value changes.'
    },
    privacy: 'XML parsing and editing happen in your browser. Files are not uploaded to UtilityTools.eu.',
    limitations: [
      'Very large XML files may be slow because browser memory is limited.',
      'Schema validation such as XSD is not guaranteed unless the tool explicitly provides it.',
      'Some formatting, comments or processing instructions may be changed by parsing and serialization.'
    ],
    faq: [
      ['Can I edit attributes?', 'Yes, if the tool controls expose attributes for the selected element.'],
      ['Does it validate against XSD?', 'This editor focuses on structure and well-formed XML, not full schema validation.'],
      ['Is my XML sent to the server?', 'No. The document is processed locally in your browser.']
    ],
    related: ['xml', 'xml-explorer', 'json-editor', 'json-to-code', 'json-csv', 'base64']
  },
  'json-csv': {
    title: 'JSON and CSV Converter guide',
    intro: [
      'The JSON / CSV Converter changes structured data between JSON and comma-separated values. It is useful when data needs to move between APIs, spreadsheets, database exports, reports and small automation scripts.',
      'JSON supports nested objects and arrays, while CSV is a flat table. The converter can help flatten simple structures, but complex data may need manual cleanup so columns remain meaningful.'
    ],
    useCases: [
      'Turning an API response into a spreadsheet-friendly CSV.',
      'Converting a small CSV table into JSON for tests or mock data.',
      'Checking headers and delimiters before importing data elsewhere.',
      'Creating examples for documentation or support tickets.'
    ],
    steps: [
      'Paste JSON or CSV into the input area.',
      'Choose the conversion direction.',
      'Set delimiter or header options if the tool provides them.',
      'Review the output for nested values, quotes and empty cells.',
      'Copy or download the result and test it in the destination app.'
    ],
    example: {
      input: '[{"name":"Ada","role":"Developer"},{"name":"Niels","role":"Designer"}]',
      output: 'name,role\nAda,Developer\nNiels,Designer',
      note: 'Each object becomes a row and object keys become CSV headers.'
    },
    privacy: 'Conversion runs locally in your browser. UtilityTools.eu does not upload your dataset.',
    limitations: [
      'Nested JSON may be flattened or represented in a simplified way.',
      'CSV files with unusual delimiters, encodings or multiline fields can need cleanup.',
      'Large datasets may exceed browser memory or make the page slow.'
    ],
    faq: [
      ['Can CSV represent nested JSON?', 'Not directly. Nested values must be flattened, stringified or split into separate tables.'],
      ['Why are quotes doubled in CSV?', 'CSV escapes quotes inside quoted fields by doubling them.'],
      ['Is this suitable for confidential customer exports?', 'The conversion is local, but you should still follow your organization’s data-handling rules.']
    ],
    related: ['json', 'json-editor', 'excel-table', 'text-to-excel', 'xml', 'json-to-code']
  },
  xml: {
    title: 'XML Formatter guide',
    intro: [
      'The XML Formatter pretty-prints, minifies and checks whether XML is well formed. It is useful for feeds, SOAP messages, configuration files, SVG snippets and integration payloads that are difficult to read on one line.',
      'Formatting makes nested elements easier to inspect and helps spot missing closing tags, incorrect nesting and accidental text where an element was expected.'
    ],
    useCases: [
      'Reading XML returned by an old API or enterprise integration.',
      'Cleaning RSS, sitemap or SVG snippets before editing.',
      'Minifying XML for compact examples or test fixtures.',
      'Checking whether pasted XML is well formed before sending it to someone else.'
    ],
    steps: [
      'Paste XML into the input area.',
      'Choose format, minify or validate according to your goal.',
      'Review errors if the XML is not well formed.',
      'Copy the formatted or minified output.',
      'Test important XML in the system that will consume it.'
    ],
    example: {
      input: '<note><to>Ada</to><body>Hello</body></note>',
      output: '<note>\n  <to>Ada</to>\n  <body>Hello</body>\n</note>',
      note: 'The same document becomes easier to read with indentation.'
    },
    privacy: 'XML text is parsed in your browser. UtilityTools.eu does not receive the content you paste.',
    limitations: [
      'Well-formed XML is not the same as valid XML against a specific XSD or DTD.',
      'Whitespace can be meaningful in some XML documents, so review changes before saving.',
      'Huge XML files can be limited by browser memory.'
    ],
    faq: [
      ['Does it validate RSS or sitemaps fully?', 'It checks XML structure. Use a feed or sitemap validator for format-specific rules.'],
      ['Can it format SVG?', 'Yes, SVG is XML, but visual rendering should still be tested after editing.'],
      ['Does it upload XML?', 'No. Formatting happens locally.']
    ],
    related: ['xml-editor', 'xml-explorer', 'json', 'json-csv', 'svg-viewer', 'json-to-code']
  },
  'excel-table': {
    title: 'Excel and CSV Table Viewer guide',
    intro: [
      'The Excel / CSV to Table tool opens spreadsheet-like files in the browser so you can search, sort, inspect and print a table without uploading it to an online spreadsheet service. It is useful for quick checks of exports, reports and tabular data.',
      'For privacy-first workflows, viewing a file locally can be enough when you only need to confirm columns, spot a row, print a small subset or export a cleaned CSV.'
    ],
    useCases: [
      'Opening a CSV export before importing it into another system.',
      'Searching a spreadsheet on a device without office software installed.',
      'Printing a simple table for a meeting or record.',
      'Checking whether delimiters and headers were exported correctly.'
    ],
    steps: [
      'Choose an Excel, CSV or supported spreadsheet file.',
      'Wait for the browser to parse the table.',
      'Use search and sorting to inspect the rows you care about.',
      'Print or export if the result looks correct.',
      'For important data, verify formulas and formatting in a full spreadsheet app.'
    ],
    example: {
      input: 'orders.csv with columns date, customer and total.',
      output: 'A searchable table where each CSV row appears as a row in the browser.',
      note: 'The tool is best for inspection and lightweight cleanup, not full spreadsheet modeling.'
    },
    privacy: 'Files are parsed locally in your browser. UtilityTools.eu does not upload or store your spreadsheet.',
    limitations: [
      'Advanced formulas, macros, charts and pivot tables are outside the scope of a lightweight viewer.',
      'Very large spreadsheets may be slow or exceed browser memory.',
      'CSV encoding and delimiter issues can affect how columns appear.'
    ],
    faq: [
      ['Can it run Excel macros?', 'No. Macros are not supported and should not be run in a browser viewer.'],
      ['Will formulas be preserved?', 'This depends on the file and library support; verify important spreadsheets in Excel or LibreOffice.'],
      ['Is the file uploaded?', 'No. The file is opened locally in your browser.']
    ],
    related: ['json-csv', 'text-to-excel', 'budget', 'invoice', 'json-editor']
  },
  'text-to-excel': {
    title: 'Text to Excel guide',
    intro: [
      'Text to Excel helps turn plain text into a structured table that can be exported as CSV or spreadsheet-style output. It is useful when you copied data from email, chat, logs or a website and need to organize it into columns quickly.',
      'The tool is designed for small practical tables, not as a replacement for a full spreadsheet application. It is best for shaping data before importing it elsewhere.'
    ],
    useCases: [
      'Turning a pasted list into rows and columns.',
      'Preparing a simple CSV for an import tool.',
      'Cleaning copied text before sending it to a colleague.',
      'Creating a quick table for budgeting, inventory or planning.'
    ],
    steps: [
      'Paste or type the text you want to organize.',
      'Add or adjust rows and columns using the table controls.',
      'Edit cells until the data is structured consistently.',
      'Export as CSV or spreadsheet format if available.',
      'Open the result in your target app and confirm columns imported correctly.'
    ],
    example: {
      input: 'Three copied lines with product names and prices.',
      output: 'A two-column table with product and price columns ready for CSV export.',
      note: 'Consistent separators in the original text make cleanup faster.'
    },
    privacy: 'The text and table are handled locally in your browser. UtilityTools.eu does not store the data you enter.',
    limitations: [
      'Messy source text may still require manual cleanup.',
      'Complex formulas and spreadsheet automation are outside the scope of this tool.',
      'CSV imports can vary by delimiter and locale settings in the destination app.'
    ],
    faq: [
      ['Can I use this for big datasets?', 'It is best for small to medium manual cleanup tasks. Use dedicated spreadsheet tools for large datasets.'],
      ['What export format should I choose?', 'CSV is widely compatible; spreadsheet formats may preserve styling if the tool offers them.'],
      ['Is pasted business data sent anywhere?', 'No. It remains in the browser while you use the page.']
    ],
    related: ['excel-table', 'json-csv', 'budget', 'invoice', 'count']
  }
};

function pickProfile(tool) {
  const tags = new Set(tool.tags || []);
  if (tags.has('developer')) return { audience: 'developers and technical users', work: 'debugging, testing, documentation or small automation tasks', funny: 'The satisfying part is that a tiny focused page can replace opening a heavy IDE, spreadsheet or account-based service just to do one small job.' };
  if (tags.has('image')) return { audience: 'designers, makers, students and anyone preparing visual files', work: 'editing, converting, preparing or checking local media files', funny: 'The nice little surprise is seeing a browser do work that used to require a desktop graphics app, without uploading the file first.' };
  if (tags.has('documents')) return { audience: 'freelancers, office users, students and households', work: 'preparing, reviewing, printing or sharing documents', funny: 'The practical magic is turning a boring document task into a few clicks instead of a long trip through menus.' };
  if (tags.has('money')) return { audience: 'households, freelancers and small teams', work: 'quick estimates, planning and printable money-related calculations', funny: 'The useful thing is how quickly small numbers become clear once they are laid out in one simple place.' };
  if (tags.has('kids')) return { audience: 'children, parents and teachers', work: 'practice, classroom activities, homework support or printable exercises', funny: 'The fun part is that learning feels less like a worksheet when the page gives instant feedback or a playful result.' };
  if (tags.has('fun')) return { audience: 'writers, families, teachers and curious users', work: 'playful text, creative prompts, classroom warmups or quick experiments', funny: 'The funny part is the harmless surprise: the same ordinary input can become something silly, strange or unexpectedly shareable.' };
  if (tags.has('time')) return { audience: 'students, remote teams, developers and planners', work: 'dates, time zones, scheduling and time-based debugging', funny: 'The useful twist is that time looks simple until daylight saving, time zones or Unix timestamps get involved.' };
  if (tags.has('security') || tags.has('privacy')) return { audience: 'privacy-conscious users, developers and small teams', work: 'checking, protecting or sharing data more carefully', funny: 'The satisfying part is doing a sensitive task locally instead of handing it to a random upload form.' };
  return { audience: 'people who need a quick focused browser utility', work: 'everyday browser tasks without installing software or creating an account', funny: 'The best part is how boring it is: the page does one job, quickly, and then gets out of your way.' };
}

function exampleFor(tool) {
  const name = tool.name;
  const tags = new Set(tool.tags || []);
  if (tags.has('converter')) return { input: 'A small sample file, value or text in the source format.', output: 'The same content converted into the selected target format.', note: `Use ${name} for quick format changes, then verify the result in the app or system where you plan to use it.` };
  if (tags.has('generator')) return { input: 'Your selected options, text, size or style settings.', output: `A generated ${name.toLowerCase()} result ready to copy, download or print.`, note: 'Generate again whenever you want a different result or need another variation.' };
  if (tags.has('calculator') || tags.has('money') || tags.has('health') || tags.has('math')) return { input: 'A realistic set of numbers from your situation.', output: 'Calculated totals, estimates or comparison values shown immediately in the page.', note: 'Treat calculator output as a practical estimate and double-check important decisions.' };
  if (tags.has('text') || tags.has('writing')) return { input: 'A short paragraph, title, code snippet or copied text.', output: `A cleaned, transformed or analysed text result from ${name}.`, note: 'Try a small sample first so you understand exactly how the transformation behaves.' };
  if (tags.has('image') || tags.has('video')) return { input: 'A local media file selected from your device.', output: 'A preview or downloadable processed file created by the browser.', note: 'Keep the original file until you have checked the downloaded result.' };
  return { input: 'A small realistic example using the controls on the page.', output: `A ${name} result that you can copy, save, download or use as a reference.`, note: 'For important work, test the output in the destination app before relying on it.' };
}

function privacyFor(tool) {
  if (tool.slug === 'ftp-explorer') return 'FTP Explorer needs server-side help because browsers cannot connect directly to FTP/FTPS servers. Credentials are sent over HTTPS to UtilityTools.eu only to perform the requested FTP operation for that session; they are not stored.';
  if (tool.slug === 'ip-lookup') return 'IP lookup needs a network request to retrieve public IP and location data. The lookup result depends on external IP data providers and should be treated as approximate.';
  if (tool.slug === 'currency') return 'Currency conversion may request public exchange-rate data, but your selected amount and page interaction are not stored in a UtilityTools.eu account or database.';
  if (['p2p-call', 'p2p-voice', 'p2p-file', 'temp-chat'].includes(tool.slug)) return 'This communication tool uses the server only for small connection/signaling messages. The actual media, files or chat data are designed to flow browser-to-browser where supported by WebRTC.';
  return `The ${tool.name} tool is designed to run in your browser. Your input is processed locally by the page unless the interface explicitly says that a network request is needed for that specific feature.`;
}

function limitationsFor(tool) {
  const tags = new Set(tool.tags || []);
  const items = [
    'Browser performance, memory and file-size limits depend on your device and browser.',
    'Always review generated or transformed output before using it in production, legal, financial, medical or security-sensitive work.'
  ];
  if (tags.has('fun')) items.push('Playful and decorative outputs are for entertainment, teaching or drafting; they should not be treated as official translations or documents.');
  if (tags.has('health')) items.push('Health-related calculators provide general estimates only and are not medical advice.');
  if (tags.has('money')) items.push('Money-related results are estimates and do not replace accounting, tax, banking or professional financial advice.');
  if (tags.has('security')) items.push('Security tools help with everyday checks, but high-risk or regulated workflows may require audited specialist software.');
  if (tags.has('image') || tags.has('video')) items.push('Media exports can vary between browsers because codec and canvas support are not identical everywhere.');
  if (tags.has('developer')) items.push('Different programming languages and platforms can interpret formats, encodings or regular rules differently, so test in your target environment.');
  return items;
}

function createDefaultToolGuide(tool, allTools) {
  const profile = pickProfile(tool);
  const example = exampleFor(tool);
  const related = (allTools || [])
    .filter(other => other.slug !== tool.slug && other.tags && tool.tags && other.tags.some(tag => tool.tags.includes(tag)))
    .slice(0, 6)
    .map(other => other.slug);
  return {
    title: `${tool.name} guide`,
    intro: [
      `${tool.name} is a focused UtilityTools.eu page for ${profile.audience}. ${tool.desc}`,
      `Use it when you want to handle ${profile.work} without opening a larger app, creating an account or sending more data than the task requires.`
    ],
    useCases: [
      `Quickly complete a ${tool.name.toLowerCase()} task from any modern browser.`,
      'Check a small example before committing the result to a project, document or message.',
      'Prepare content for copying, printing, downloading or sharing with someone else.',
      'Keep a lightweight privacy-first alternative available for everyday work.'
    ],
    funFact: profile.funny,
    steps: [
      'Open the tool and read the short description at the top of the page.',
      'Paste text, choose a local file, or enter the values requested by the controls.',
      'Adjust any options such as format, size, quality, length, units or mode.',
      'Review the preview, output, status message or calculated result.',
      'Copy, download, print or clear the result when you are finished.'
    ],
    example,
    privacy: privacyFor(tool),
    limitations: limitationsFor(tool),
    faq: [
      [`What is ${tool.name} for?`, `${tool.name} is for ${tool.desc.charAt(0).toLowerCase() + tool.desc.slice(1)}`],
      ['When should I use it?', `Use it when you need ${profile.work} and want a quick page that stays focused on that one task.`],
      ['What is the funny or interesting thing about it?', profile.funny],
      ['Is it private?', privacyFor(tool)]
    ],
    related
  };
}

module.exports = { TOOL_GUIDES, createDefaultToolGuide };

