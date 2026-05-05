// =====================================================================
// Fun Text Translator Toolkit — shared conversion library
// Loaded by every individual tool page (/runes, /morse, /binary, …)
// Exposes a single `TT` global so each page can wire its own UI.
// 100% browser-side. No network calls. No dependencies.
// =====================================================================
(function (root) {
  const TT = {};

  // ---------------- 1) RUNES (Elder Futhark, phonetic) ----------------
  const RUNES = {
    a:'ᚨ', b:'ᛒ', c:'ᚲ', d:'ᛞ', e:'ᛖ', f:'ᚠ', g:'ᚷ', h:'ᚺ', i:'ᛁ', j:'ᛃ',
    k:'ᚲ', l:'ᛚ', m:'ᛗ', n:'ᚾ', o:'ᛟ', p:'ᛈ', q:'ᚲᚹ', r:'ᚱ', s:'ᛊ', t:'ᛏ',
    u:'ᚢ', v:'ᚹ', w:'ᚹ', x:'ᚲᛊ', y:'ᛁ', z:'ᛉ'
  };
  TT.toRunes = function (text, nameMode) {
    if (!text) return '';
    let s = text.toLowerCase().replace(/th/g, 'ᚦ').replace(/ng/g, 'ᛜ');
    let out = '';
    for (const ch of s) {
      if (/\s/.test(ch)) out += nameMode ? '·' : ' ';
      else if (RUNES[ch]) out += RUNES[ch];
      else out += ch;
    }
    return nameMode ? '· ' + out + ' ·' : out;
  };

  // ---------------- 2) MORSE ----------------
  const MORSE = {
    A:'.-',B:'-...',C:'-.-.',D:'-..',E:'.',F:'..-.',G:'--.',H:'....',I:'..',J:'.---',
    K:'-.-',L:'.-..',M:'--',N:'-.',O:'---',P:'.--.',Q:'--.-',R:'.-.',S:'...',T:'-',
    U:'..-',V:'...-',W:'.--',X:'-..-',Y:'-.--',Z:'--..',
    '0':'-----','1':'.----','2':'..---','3':'...--','4':'....-','5':'.....',
    '6':'-....','7':'--...','8':'---..','9':'----.',
    '.':'.-.-.-',',':'--..--','?':'..--..',"'":'.----.','!':'-.-.--','/':'-..-.',
    '(':'-.--.',')':'-.--.-','&':'.-...',':':'---...',';':'-.-.-.','=':'-...-',
    '+':'.-.-.','-':'-....-','_':'..--.-','"':'.-..-.','$':'...-..-','@':'.--.-.'
  };
  const MORSE_REV = Object.fromEntries(Object.entries(MORSE).map(([k, v]) => [v, k]));
  TT.toMorse = function (text) {
    return text.toUpperCase().split(/(\s+)/).map(seg => {
      if (/\s/.test(seg)) return '/';
      return [...seg].map(c => MORSE[c] || '').filter(Boolean).join(' ');
    }).join(' ').replace(/\s+\/\s+/g, ' / ').trim();
  };
  TT.fromMorse = function (text) {
    return text.split('/').map(word =>
      word.trim().split(/\s+/).map(t => MORSE_REV[t] || '').join('')
    ).join(' ').trim();
  };
  // Web Audio playback
  let audioCtx = null, morseStop = false, morseTimer = [];
  TT.playMorse = function (code, onDone) {
    morseStop = false;
    audioCtx = audioCtx || new (root.AudioContext || root.webkitAudioContext)();
    const unit = 0.08;
    let t = audioCtx.currentTime + 0.05;
    const beep = (dur) => {
      const osc = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      osc.frequency.value = 600; osc.type = 'sine';
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.25, t + 0.005);
      g.gain.setValueAtTime(0.25, t + dur - 0.01);
      g.gain.linearRampToValueAtTime(0, t + dur);
      osc.connect(g).connect(audioCtx.destination);
      osc.start(t); osc.stop(t + dur + 0.02);
      t += dur;
    };
    for (const ch of code) {
      if (morseStop) break;
      if (ch === '.') { beep(unit); t += unit; }
      else if (ch === '-') { beep(unit * 3); t += unit; }
      else if (ch === ' ') t += unit * 2;
      else if (ch === '/') t += unit * 4;
    }
    const totalMs = (t - audioCtx.currentTime) * 1000 + 100;
    morseTimer.push(setTimeout(() => onDone && onDone(), totalMs));
  };
  TT.stopMorse = function () {
    morseStop = true;
    morseTimer.forEach(clearTimeout); morseTimer = [];
    if (audioCtx) { audioCtx.close().then(() => audioCtx = null); }
  };

  // ---------------- 3) BINARY ----------------
  TT.toBinary = function (text, style) {
    const enc = new TextEncoder();
    const bins = [...enc.encode(text)].map(b => b.toString(2).padStart(8, '0'));
    if (style === 'continuous') return bins.join('');
    if (style === 'word') {
      return text.split(/(\s+)/).map(seg => {
        if (/\s/.test(seg)) return '  ';
        return [...enc.encode(seg)].map(x => x.toString(2).padStart(8, '0')).join(' ');
      }).join('');
    }
    return bins.join(' ');
  };
  TT.fromBinary = function (input) {
    const clean = input.replace(/[^01]/g, '');
    if (!clean.length || clean.length % 8 !== 0)
      return '⚠ Binary length must be a multiple of 8 (got ' + clean.length + ' bits).';
    const bytes = new Uint8Array(clean.length / 8);
    for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(clean.substr(i * 8, 8), 2);
    try { return new TextDecoder('utf-8', { fatal: false }).decode(bytes); }
    catch (e) { return '⚠ Could not decode as UTF-8.'; }
  };

  // ---------------- 4) PIG LATIN ----------------
  function pigLatinWord(w) {
    const m = w.match(/^([A-Za-z']+)([^A-Za-z']*)$/);
    if (!m) return w;
    const word = m[1], punct = m[2] || '';
    if (!word) return w;
    const isCap = word[0] === word[0].toUpperCase() && word[0] !== word[0].toLowerCase();
    const allCaps = word.length > 1 && word === word.toUpperCase();
    const lower = word.toLowerCase();
    let res;
    if (/^[aeiou]/.test(lower)) res = lower + 'way';
    else {
      const cluster = lower.match(/^[^aeiou]+/)[0];
      res = lower.slice(cluster.length) + cluster + 'ay';
    }
    if (allCaps) res = res.toUpperCase();
    else if (isCap) res = res[0].toUpperCase() + res.slice(1);
    return res + punct;
  }
  TT.toPigLatin = function (text) {
    return text.split(/(\s+)/).map(seg => /\s/.test(seg) ? seg : pigLatinWord(seg)).join('');
  };

  // ---------------- 5) NATO ----------------
  TT.NATO = {
    A:'Alpha',B:'Bravo',C:'Charlie',D:'Delta',E:'Echo',F:'Foxtrot',G:'Golf',H:'Hotel',
    I:'India',J:'Juliett',K:'Kilo',L:'Lima',M:'Mike',N:'November',O:'Oscar',P:'Papa',
    Q:'Quebec',R:'Romeo',S:'Sierra',T:'Tango',U:'Uniform',V:'Victor',W:'Whiskey',
    X:'X-ray',Y:'Yankee',Z:'Zulu',
    '0':'Zero','1':'One','2':'Two','3':'Three','4':'Four','5':'Five','6':'Six',
    '7':'Seven','8':'Eight','9':'Niner'
  };
  TT.toNato = function (text, sep) {
    return [...text.toUpperCase()].map(c => {
      if (TT.NATO[c]) return TT.NATO[c];
      if (c === ' ') return '(space)';
      if (c === '-') return 'Dash';
      return null;
    }).filter(Boolean).join(sep);
  };

  // ---------------- 6) BRAILLE ----------------
  const BRAILLE = {
    a:'⠁',b:'⠃',c:'⠉',d:'⠙',e:'⠑',f:'⠋',g:'⠛',h:'⠓',i:'⠊',j:'⠚',
    k:'⠅',l:'⠇',m:'⠍',n:'⠝',o:'⠕',p:'⠏',q:'⠟',r:'⠗',s:'⠎',t:'⠞',
    u:'⠥',v:'⠧',w:'⠺',x:'⠭',y:'⠽',z:'⠵',
    '1':'⠁','2':'⠃','3':'⠉','4':'⠙','5':'⠑','6':'⠋','7':'⠛','8':'⠓','9':'⠊','0':'⠚',
    '.':'⠲',',':'⠂','?':'⠦','!':'⠖',"'":'⠄','-':'⠤',';':'⠆',':':'⠒',
    '(':'⠐⠣',')':'⠐⠜','"':'⠐⠶','/':'⠌'
  };
  const CAP = '⠠', NUM = '⠼';
  TT.toBraille = function (text) {
    let out = '', inNum = false;
    for (const ch of text) {
      if (/\s/.test(ch)) { out += ' '; inNum = false; continue; }
      if (/[0-9]/.test(ch)) {
        if (!inNum) { out += NUM; inNum = true; }
        out += BRAILLE[ch]; continue;
      }
      inNum = false;
      if (/[A-Z]/.test(ch)) out += CAP + (BRAILLE[ch.toLowerCase()] || ch);
      else if (BRAILLE[ch]) out += BRAILLE[ch];
      else out += ch;
    }
    return out;
  };

  // ---------------- 7) UPSIDE-DOWN ----------------
  const UD = {
    a:'ɐ',b:'q',c:'ɔ',d:'p',e:'ǝ',f:'ɟ',g:'ƃ',h:'ɥ',i:'ᴉ',j:'ɾ',k:'ʞ',l:'l',m:'ɯ',
    n:'u',o:'o',p:'d',q:'b',r:'ɹ',s:'s',t:'ʇ',u:'n',v:'ʌ',w:'ʍ',x:'x',y:'ʎ',z:'z',
    A:'∀',B:'𐐒',C:'Ɔ',D:'p',E:'Ǝ',F:'Ⅎ',G:'⅁',H:'H',I:'I',J:'ſ',K:'⋊',L:'˥',M:'W',
    N:'N',O:'O',P:'Ԁ',Q:'Q',R:'ᴿ',S:'S',T:'⊥',U:'∩',V:'Λ',W:'M',X:'X',Y:'⅄',Z:'Z',
    '0':'0','1':'⇂','2':'ᄅ','3':'Ɛ','4':'ㄣ','5':'ϛ','6':'9','7':'ㄥ','8':'8','9':'6',
    '.':'˙',',':"'","'":',','"':',,','?':'¿','!':'¡','(':')',')':'(','[':']',']':'[',
    '{':'}','}':'{','&':'⅋','_':'‾'
  };
  const UD_REV = Object.fromEntries(Object.entries(UD).map(([k, v]) => [v, k]));
  TT.flip = function (text, reverse) {
    let out = [...text].map(c => UD[c] || c).join('');
    if (reverse) out = [...out].reverse().join('');
    return out;
  };
  TT.unflip = function (text, wasReversed) {
    let s = text;
    if (wasReversed) s = [...s].reverse().join('');
    return [...s].map(c => UD_REV[c] || c).join('');
  };

  // ---------------- 8) MEDIEVAL / FANTASY ----------------
  function buildMap(uStart, lStart, exceptions) {
    const m = {};
    for (let i = 0; i < 26; i++) {
      m[String.fromCharCode(65 + i)] = String.fromCodePoint(uStart + i);
      m[String.fromCharCode(97 + i)] = String.fromCodePoint(lStart + i);
    }
    if (exceptions) Object.assign(m, exceptions);
    return m;
  }
  TT.STYLES = {
    bold:         buildMap(0x1D400, 0x1D41A),
    fraktur:      buildMap(0x1D504, 0x1D51E, { C:'ℭ',H:'ℌ',I:'ℑ',R:'ℜ',Z:'ℨ' }),
    boldFraktur:  buildMap(0x1D56C, 0x1D586),
    script:       buildMap(0x1D49C, 0x1D4B6, { B:'ℬ',E:'ℰ',F:'ℱ',H:'ℋ',I:'ℐ',L:'ℒ',M:'ℳ',R:'ℛ',e:'ℯ',g:'ℊ',o:'ℴ' }),
    boldScript:   buildMap(0x1D4D0, 0x1D4EA),
    doubleStruck: buildMap(0x1D538, 0x1D552, { C:'ℂ',H:'ℍ',N:'ℕ',P:'ℙ',Q:'ℚ',R:'ℝ',Z:'ℤ' }),
    monospace:    buildMap(0x1D670, 0x1D68A)
  };
  TT.toFantasy = function (text, style) {
    const map = TT.STYLES[style] || TT.STYLES.fraktur;
    return [...text].map(c => map[c] || c).join('');
  };

  // ---------------- 9) EMOJI ----------------
  TT.lettersToEmoji = function (text) {
    return [...text].map(c => {
      const u = c.toUpperCase();
      if (/[A-Z]/.test(u)) return String.fromCodePoint(0x1F1E6 + u.charCodeAt(0) - 65) + ' ';
      if (/[0-9]/.test(c)) return ['0️⃣','1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣'][+c] + ' ';
      if (c === ' ') return '   ';
      return c + ' ';
    }).join('').trim();
  };
  TT.EMOJI_KW = {
    love:'❤️', heart:'❤️', fire:'🔥', hot:'🔥', money:'💰', cash:'💵', star:'⭐',
    sun:'☀️', moon:'🌙', cat:'🐱', dog:'🐶', pizza:'🍕', coffee:'☕', cake:'🎂',
    party:'🎉', music:'🎵', rocket:'🚀', code:'💻', book:'📚', lock:'🔒',
    smile:'😊', laugh:'😂', cool:'😎', sad:'😢', angry:'😡', sleep:'😴',
    car:'🚗', plane:'✈️', tree:'🌳', flower:'🌸', game:'🎮', win:'🏆',
    yes:'✅', no:'❌', warning:'⚠️', idea:'💡', email:'📧', phone:'📱',
    earth:'🌍', europe:'🇪🇺', friend:'👋', work:'💼', time:'⏰', new:'🆕'
  };
  TT.keywordsToEmoji = function (text) {
    return text.replace(/[A-Za-z]+/g, w => {
      const e = TT.EMOJI_KW[w.toLowerCase()];
      return e ? w + ' ' + e : w;
    });
  };
  const DECO = ['✨','🌟','💫','⭐','🎀','🌈','🦄','🍀','🔥','💖','💎','🌸','💜','💛','🌷','🍓','🍑'];
  TT.decorate = function (text) {
    return text.split(/(\s+)/).map(seg => {
      if (/\s/.test(seg)) return seg;
      if (Math.random() < 0.4) {
        const e = DECO[Math.floor(Math.random() * DECO.length)];
        return Math.random() < 0.5 ? e + seg : seg + e;
      }
      return seg;
    }).join('');
  };

  // ---------------- 10) HIEROGLYPHICS ----------------
  TT.HIERO = {
    a:'𓄿',b:'𓃀',c:'𓎡',d:'𓂧',e:'𓇋',f:'𓆑',g:'𓎼',h:'𓉔',i:'𓇌',j:'𓆓',
    k:'𓎡',l:'𓃭',m:'𓅓',n:'𓈖',o:'𓅱',p:'𓊪',q:'𓏘',r:'𓂋',s:'𓋴',t:'𓏏',
    u:'𓅱',v:'𓆑',w:'𓅱',x:'𓐍',y:'𓇌',z:'𓊃'
  };
  TT.toHieroglyphs = function (text) {
    return [...text.toLowerCase()].map(c => TT.HIERO[c] || (c === ' ' ? '   ' : '')).join('');
  };
  TT.drawCartouche = function (canvas, name) {
    const glyphs = TT.toHieroglyphs(name);
    const glyphCount = [...name].filter(ch => /[a-zA-Z]/.test(ch)).length || 1;
    const W = Math.min(1200, Math.max(420, 90 + glyphCount * 70));
    const H = 200;
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
    bgGrad.addColorStop(0, '#f4e2b6'); bgGrad.addColorStop(1, '#dfc486');
    ctx.fillStyle = bgGrad; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 800; i++) {
      ctx.fillStyle = 'rgba(' + (80 + Math.random()*60 | 0) + ',' + (50 + Math.random()*40 | 0) + ',20,' + (Math.random()*0.06) + ')';
      ctx.fillRect(Math.random()*W, Math.random()*H, 2, 2);
    }
    ctx.strokeStyle = '#3b1f0a'; ctx.lineWidth = 6; ctx.lineJoin = 'round';
    const pad = 22, x0 = pad, y0 = 30, x1 = W - pad, y1 = H - 30, r = (y1 - y0) / 2;
    ctx.beginPath();
    ctx.moveTo(x0 + r, y0); ctx.lineTo(x1 - r, y0);
    ctx.arc(x1 - r, y0 + r, r, -Math.PI/2, Math.PI/2);
    ctx.lineTo(x0 + r, y1);
    ctx.arc(x0 + r, y0 + r, r, Math.PI/2, -Math.PI/2);
    ctx.closePath(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(W/2 - 30, y1); ctx.lineTo(W/2 + 30, y1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(W/2 - 30, y1 + 10); ctx.lineTo(W/2 + 30, y1 + 10); ctx.stroke();
    ctx.fillStyle = '#2a1306';
    ctx.font = '600 70px "Noto Sans Egyptian Hieroglyphs", "Segoe UI Historic", serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(glyphs, W/2, H/2);
  };

  // ---------------- 11) ANCIENT SCROLL ----------------
  TT.drawScroll = function (canvas, opts) {
    const { text = '', width: W = 900, height: H = 600, fontSize = 22,
            align = 'center', style = 'parchment' } = opts || {};
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    const palettes = {
      parchment: ['#f1e0b0','#d6b97a','#3a230c'],
      papyrus:   ['#e8c87a','#b88b3f','#3b240b'],
      aged:      ['#ddc187','#7d4a1c','#1f0d04']
    };
    const [pLight, pDark, ink] = palettes[style] || palettes.parchment;
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, pLight); g.addColorStop(0.5, pLight); g.addColorStop(1, pDark);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const rollH = Math.min(60, Math.round(H * 0.1));
    const rollGrad = ctx.createLinearGradient(0, 0, 0, rollH);
    rollGrad.addColorStop(0, pDark); rollGrad.addColorStop(0.5, pLight); rollGrad.addColorStop(1, pDark);
    ctx.fillStyle = rollGrad;
    ctx.fillRect(0, 0, W, rollH); ctx.fillRect(0, H - rollH, W, rollH);
    ctx.strokeStyle = ink; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, rollH); ctx.lineTo(W, rollH); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, H - rollH); ctx.lineTo(W, H - rollH); ctx.stroke();
    if (style === 'aged') {
      for (let i = 0; i < 60; i++) {
        const x = (Math.random() < 0.5 ? 0 : W) + (Math.random() - 0.5) * 60;
        const y = Math.random() * H, r = 10 + Math.random() * 40;
        const grd = ctx.createRadialGradient(x, y, 0, x, y, r);
        grd.addColorStop(0, 'rgba(40,15,5,0.45)'); grd.addColorStop(1, 'rgba(40,15,5,0)');
        ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2); ctx.fill();
      }
    }
    for (let i = 0; i < 1500; i++) {
      ctx.fillStyle = 'rgba(' + (100 + Math.random()*60 | 0) + ',' + (60 + Math.random()*40 | 0) + ',20,' + (Math.random()*0.05) + ')';
      ctx.fillRect(Math.random()*W, Math.random()*H, 2, 2);
    }
    ctx.strokeStyle = ink; ctx.lineWidth = 2;
    ctx.strokeRect(40, rollH + 30, W - 80, H - 2*rollH - 60);
    ctx.lineWidth = 1; ctx.strokeRect(48, rollH + 38, W - 96, H - 2*rollH - 76);
    function flourish(cx, cy, dx, dy) {
      ctx.beginPath();
      ctx.moveTo(cx, cy); ctx.lineTo(cx + 18*dx, cy);
      ctx.moveTo(cx, cy); ctx.lineTo(cx, cy + 18*dy);
      ctx.moveTo(cx + 6*dx, cy + 6*dy);
      ctx.arc(cx + 6*dx, cy + 6*dy, 5, 0, Math.PI*2);
      ctx.stroke();
    }
    ctx.lineWidth = 1.5;
    flourish(48, rollH + 38, 1, 1);
    flourish(W - 48, rollH + 38, -1, 1);
    flourish(48, H - rollH - 38, 1, -1);
    flourish(W - 48, H - rollH - 38, -1, -1);
    ctx.fillStyle = ink; ctx.font = 'bold 18px Georgia, serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('✦  ✦  ✦', W/2, rollH + 18);
    ctx.font = fontSize + 'px Georgia, "IM Fell English", serif';
    ctx.textBaseline = 'top';
    const padX = 80, padTop = rollH + 60, padBottom = rollH + 60;
    const maxW = W - padX*2, lineH = fontSize * 1.55;
    const paragraphs = text.split(/\n/);
    const lines = [];
    paragraphs.forEach(par => {
      if (!par.trim()) { lines.push(''); return; }
      const words = par.split(/\s+/);
      let cur = '';
      for (const w of words) {
        const tr = cur ? cur + ' ' + w : w;
        if (ctx.measureText(tr).width > maxW && cur) { lines.push(cur); cur = w; }
        else cur = tr;
      }
      if (cur) lines.push(cur);
    });
    let y = padTop;
    const usableH = H - padTop - padBottom;
    const maxLines = Math.floor(usableH / lineH);
    const renderLines = lines.slice(0, maxLines);
    renderLines.forEach((ln, idx) => {
      if (align === 'center') { ctx.textAlign = 'center'; ctx.fillText(ln, W/2, y); }
      else if (align === 'justify' && idx < renderLines.length - 1 && ln.trim().split(/\s+/).length > 1) {
        ctx.textAlign = 'left';
        const words = ln.split(/\s+/);
        const widths = words.map(w => ctx.measureText(w).width);
        const total = widths.reduce((a, b) => a + b, 0);
        const gap = (maxW - total) / (words.length - 1);
        let x = padX;
        words.forEach((w, i) => { ctx.fillText(w, x, y); x += widths[i] + gap; });
      } else { ctx.textAlign = 'left'; ctx.fillText(ln, padX, y); }
      y += lineH;
    });
    if (lines.length > maxLines) {
      ctx.textAlign = 'center'; ctx.font = 'italic ' + (fontSize*0.7) + 'px Georgia, serif';
      ctx.fillText('… (text truncated — increase scroll height) …', W/2, H - rollH - 20);
    }
  };

  // ---------------- 12) YODA-SPEAK ----------------
  // Yoda's grammar is famously OSV (Object–Subject–Verb) instead of English SVO.
  // We can't do real parsing in 50 lines of JS, but a tiny heuristic produces
  // very recognisable Yoda lines: split each sentence on its first "linker"
  // word (an auxiliary or copula), then swap the two halves.
  //   "I am happy."          -> "Happy, I am."
  //   "You will learn this." -> "This, you will learn."
  // For sentences without a linker we prepend a random Yoda flourish.
  const YODA_LINKERS = [
    'am','is','are','was','were','be','been','being',
    'will','would','shall','should','can','could','may','might','must',
    'have','has','had',
    'do','does','did',
    'need','want','wish','seek','feel','know','see','find','make','build','teach','learn','sense','train','believe','fear','hate','love'
  ];
  const YODA_FLOURISH = [
    'Hmmm.', 'Yes.', 'Mmm.', 'Strong with the Force, this one is.',
    'Patience you must have, my young padawan.', 'Do or do not. There is no try.',
    'Much to learn, you still have.', 'Truly wonderful, the mind of a child is.'
  ];
  function yodaSentence(s, idx) {
    // Strip and remember trailing punctuation
    const m = s.match(/^(\s*)(.*?)([.!?…]*)(\s*)$/);
    if (!m) return s;
    const [, lead, body, end, trail] = m;
    if (!body.trim()) return s;
    const tokens = body.split(/(\s+)/); // keep whitespace
    let linkerAt = -1;
    for (let i = 0; i < tokens.length; i++) {
      const w = tokens[i].toLowerCase().replace(/[^a-z']+/g, '');
      if (!w) continue;
      if (YODA_LINKERS.includes(w)) { linkerAt = i; break; }
    }
    let result;
    if (linkerAt > 0) {
      const left  = tokens.slice(0, linkerAt).join('').trim();          // subject
      const verb  = tokens[linkerAt].trim();                             // linker
      const right = tokens.slice(linkerAt + 1).join('').trim();          // rest
      if (right) {
        // "<right>, <left> <verb>"  — capitalise first letter of the new front
        const front = right.charAt(0).toUpperCase() + right.slice(1);
        const rest  = (left + ' ' + verb).toLowerCase();
        result = front + ', ' + rest;
      } else {
        result = (left + ' ' + verb);
      }
    } else {
      // No linker — append a Yoda flourish based on sentence index for stability.
      const f = YODA_FLOURISH[idx % YODA_FLOURISH.length];
      result = body.trim() + ', ' + f.toLowerCase().replace(/\.$/, '');
    }
    return lead + result + (end || '.') + trail;
  }
  TT.toYoda = function (text) {
    if (!text) return '';
    // Split on sentence boundaries while keeping the trailing punctuation/space.
    const parts = text.split(/(?<=[.!?…])\s+/);
    return parts.map((p, i) => yodaSentence(p, i)).join(' ');
  };

  // ---------------- 13) PIRATE-SPEAK ----------------
  // Word-level substitution table. Order of replacements matters (longer phrases
  // first) so we apply by length-descending and only on whole-word boundaries.
  TT.PIRATE = {
    'hello':'ahoy', 'hi':'ahoy', 'hey':'ahoy-hoy',
    'goodbye':'fare thee well', 'bye':'fare thee well',
    'friend':'matey', 'friends':'mateys', 'buddy':'matey', 'pal':'matey',
    'sir':'cap’n', 'madam':'wench', "ma'am":'wench',
    'man':'salty dog', 'men':'scallywags', 'guy':'scallywag', 'guys':'scallywags',
    'woman':'lass', 'women':'lasses', 'girl':'lass', 'girls':'lasses', 'boy':'lad', 'boys':'lads',
    'people':'crew', 'team':'crew', 'group':'crew', 'family':'crew',
    'children':'wee ones', 'kid':'wee one', 'kids':'wee ones', 'child':'wee one',
    'yes':'aye', 'no':'nay',
    'my':'me', 'you':'ye', 'your':'yer', "you're":"ye be", "you are":"ye be",
    'are':'be', 'is':'be', 'am':'be',
    'the':"th'", 'this':'this ’ere', 'that':'that there',
    'before':'afore', 'between':'betwixt',
    'old':'olde', 'small':'wee', 'little':'wee', 'big':'mighty', 'large':'mighty',
    'food':'grub', 'drink':'grog', 'beer':'grog', 'rum':'rum (the good stuff)',
    'money':'doubloons', 'cash':'doubloons', 'gold':'gold doubloons',
    'treasure':'booty', 'reward':'booty',
    'work':'plunderin’', 'job':'plunderin’', 'fight':'brawl', 'battle':'sea battle',
    'ship':'vessel', 'boat':'vessel', 'car':'wagon',
    'house':'cabin', 'home':'cabin', 'room':'quarters', 'office':'quarters',
    'bathroom':'head', 'toilet':'head',
    'restaurant':'tavern', 'bar':'tavern', 'hotel':'inn', 'shop':'tradin’ post', 'store':'tradin’ post',
    'song':'sea shanty', 'music':'shanties', 'flag':'colors',
    'enemy':'scurvy dog', 'enemies':'scurvy dogs', 'idiot':'bilge rat', 'fool':'bilge rat',
    'thief':'scallywag', 'liar':'scallywag', 'coward':'lily-livered swab',
    'happy':'merry', 'angry':'in a fury', 'tired':'weary', 'crazy':'mad as a sea-witch',
    'amazing':'glorious', 'awesome':'glorious', 'great':'grand', 'good':'fine',
    'bad':'foul', 'terrible':'cursed', 'dead':'in Davy Jones’ locker',
    'where':'whar', 'over':'o’er', 'ever':'e’er', 'never':'ne’er',
    'going':'sailin’', 'go':'sail', 'come':'come aboard',
    'death':'Davy Jones’ locker', 'ghost':'spectre',
    'ocean':'briny deep', 'sea':'briny deep', 'water':'briny',
    'dollar':'doubloon', 'dollars':'doubloons', 'euro':'doubloon', 'euros':'doubloons'
  };
  function pirateSwap(word, dict) {
    const lower = word.toLowerCase();
    const repl = dict[lower];
    if (!repl) return null;
    if (word === word.toUpperCase() && word.length > 1) return repl.toUpperCase();
    if (word[0] === word[0].toUpperCase()) return repl.charAt(0).toUpperCase() + repl.slice(1);
    return repl;
  }
  // "Arrr!" injections — sprinkled at sentence ends, deterministic per sentence index.
  const PIRATE_GRUNTS = ['Arrr!', 'Yarrr!', 'Avast!', 'Shiver me timbers!', 'Yo ho ho!', 'Aye!'];
  TT.toPirate = function (text, opts) {
    opts = opts || {};
    const sprinkle = opts.sprinkle !== false;
    const dict = TT.PIRATE;
    // Replace whole words first
    let out = text.replace(/[A-Za-z']+/g, w => pirateSwap(w, dict) || w);
    if (sprinkle) {
      let i = 0;
      out = out.replace(/([.!?])(\s|$)/g, (m, p, ws) => {
        // Add a grunt to roughly every other sentence
        if (i++ % 2 === 0) return p + ' ' + PIRATE_GRUNTS[(i - 1) % PIRATE_GRUNTS.length] + ws;
        return m;
      });
    }
    return out;
  };

  // ---------------- 14) SHAKESPEARE / EARLY MODERN ENGLISH ----------------
  // Pronoun + verb-conjugation substitutions. The verb forms are conditional
  // on subject ("thou hast" vs "I have") which is too complex for a regex,
  // so we approximate: 2nd-person-singular verb forms after "thou".
  TT.SHAKE_WORDS = {
    'you':'thou', "you're":"thou art", 'you are':'thou art', "you've":"thou hast",
    "you'll":"thou shalt", "you'd":"thou wouldst", 'your':'thy', 'yours':'thine',
    'yourself':'thyself',
    'are':'art', 'were':'wast',
    'have':'hast', 'has':'hath',
    'do':'dost', 'does':'doth', 'did':'didst',
    'will':'shalt', 'would':'wouldst', 'should':'shouldst', 'could':'couldst', 'shall':'shalt', 'can':'canst', 'must':'must',
    'know':'knowest', 'think':'thinkest', 'speak':'speakest', 'say':'sayest', 'go':'goest', 'come':'comest',
    'see':'seest', 'love':'lovest', 'hate':'hatest', 'want':'wishest', 'need':'needest',
    'hello':'hail', 'hi':'good morrow', 'hey':'hark', 'goodbye':'fare thee well', 'bye':'fare thee well',
    'yes':'aye', 'no':'nay', 'maybe':'perchance', 'perhaps':'perchance', 'really':'verily', 'very':'most',
    'before':'ere', 'often':'oft', 'always':'ever', 'never':'ne’er', 'over':'o’er', 'ever':'e’er',
    'between':'betwixt', 'among':'amongst', 'while':'whilst', 'against':'’gainst',
    'man':'gentleman', 'woman':'lady', 'guy':'fellow', 'guys':'fellows', 'people':'folk',
    'friend':'good friend', 'friends':'good friends',
    'sir':'good sir', 'lady':'fair lady',
    'father':'sire', 'mother':'lady mother', 'son':'son of mine', 'daughter':'daughter of mine',
    'death':'demise', 'die':'perish', 'dead':'lifeless', 'kill':'slay', 'killed':'slain',
    'house':'manor', 'home':'manor', 'room':'chamber', 'bed':'bedchamber',
    'happy':'merry', 'sad':'forlorn', 'angry':'wroth', 'tired':'weary', 'beautiful':'fair', 'pretty':'comely',
    'amazing':'wondrous', 'awesome':'wondrous', 'great':'noble', 'good':'good', 'bad':'foul', 'terrible':'most foul',
    'crazy':'mad', 'cool':'fine', 'awful':'most grievous',
    'food':'victuals', 'drink':'sack', 'wine':'sack', 'beer':'ale',
    'fight':'duel', 'battle':'fray', 'enemy':'foe', 'enemies':'foes',
    'love':'love', 'kiss':'kiss', 'truly':'verily', 'sure':'certes', 'quickly':'apace',
    'because':'for that', 'why':'wherefore', 'where':'whither', 'here':'hither', 'there':'thither',
    'lol':'ha! a most jocund jest!'
  };
  function shakeSwap(word, dict) {
    const lower = word.toLowerCase();
    const repl = dict[lower];
    if (!repl) return null;
    if (word === word.toUpperCase() && word.length > 1) return repl.toUpperCase();
    if (word[0] === word[0].toUpperCase()) return repl.charAt(0).toUpperCase() + repl.slice(1);
    return repl;
  }
  TT.toShakespeare = function (text) {
    if (!text) return '';
    // Two-word phrases first (e.g. "you are" -> "thou art") so they don't get
    // shadowed by single-word replacements.
    let out = text.replace(/\b(you are|you're|you've|you'll|you'd)\b/gi, (m) => {
      return shakeSwap(m, TT.SHAKE_WORDS) || m;
    });
    out = out.replace(/[A-Za-z']+/g, w => shakeSwap(w, TT.SHAKE_WORDS) || w);
    return out;
  };

  // ---------------- 15) OLD ENGLISH (þ / ð / ƿ / æ) ----------------
  // Re-orthographs modern English with the letters that fell out of use after
  // the Norman Conquest. Not a real Old English translation — the words stay
  // modern, only the spelling becomes archaic. Toggleable substitutions:
  //   th  -> þ  (thorn, voiceless)   /  ð (eth, voiced) for common voiced cases
  //   w   -> ƿ  (wynn)
  //   ae  -> æ  (ash)
  //   g   -> ȝ  (yogh) at start of words for fun
  //   and -> ond
  // "Voiced th" detection uses a small word list (the, this, that, then, there…)
  const ETH_WORDS = new Set([
    'the','this','that','these','those','they','them','their','there','then','than','though','thus','thee','thou','thy','thine','they’re','there’s','that’s','this’s','they’ve','they’ll','that’ll','there’ll'
  ]);
  TT.toOldEnglish = function (text, opts) {
    opts = opts || {};
    const useEth   = opts.useEth   !== false; // distinguish ð from þ
    const useWynn  = opts.useWynn  !== false; // w -> ƿ
    const useAsh   = opts.useAsh   !== false; // ae -> æ
    const useYogh  = opts.useYogh  === true;  // g -> ȝ (off by default, harder to read)
    const archaic  = opts.archaicAnd !== false; // and -> ond
    if (!text) return '';
    // Process word-by-word so we can pick þ vs ð based on the whole word.
    return text.replace(/[A-Za-z'’]+/g, (word) => {
      const lower = word.toLowerCase();
      const isEthWord = useEth && ETH_WORDS.has(lower);
      let out = '';
      for (let i = 0; i < word.length; i++) {
        const c = word[i], n = word[i + 1];
        // "th" digraph
        if ((c === 't' || c === 'T') && (n === 'h' || n === 'H')) {
          const upper = (c === 'T');
          out += isEthWord ? (upper ? 'Ð' : 'ð') : (upper ? 'Þ' : 'þ');
          i++;
          continue;
        }
        // "ae" -> æ
        if (useAsh && (c === 'a' || c === 'A') && (n === 'e' || n === 'E')) {
          out += (c === 'A') ? 'Æ' : 'æ';
          i++;
          continue;
        }
        // wynn
        if (useWynn && (c === 'w' || c === 'W')) {
          out += (c === 'W') ? 'Ƿ' : 'ƿ';
          continue;
        }
        // yogh at start of word
        if (useYogh && i === 0 && (c === 'g' || c === 'G')) {
          out += (c === 'G') ? 'Ȝ' : 'ȝ';
          continue;
        }
        out += c;
      }
      // Whole-word swaps
      if (archaic) {
        if (lower === 'and') out = (word === word.toUpperCase() ? 'OND' : (word[0] === word[0].toUpperCase() ? 'Ond' : 'ond'));
        else if (lower === 'is') out = (word[0] === word[0].toUpperCase() ? 'Ys' : 'ys');
      }
      return out;
    });
  };

  // ---------------- Helpers used by every page ----------------
  TT.copy = function (text, btn) {
    if (!text) {
      if (btn) { const o = btn.textContent; btn.textContent = 'Nothing to copy'; setTimeout(() => btn.textContent = o, 1200); }
      return;
    }
    navigator.clipboard.writeText(text).then(
      () => { if (btn) { const o = btn.textContent; btn.textContent = '✓ Copied'; setTimeout(() => btn.textContent = o, 1200); } },
      () => alert('Copy failed — please copy manually.')
    );
  };
  TT.downloadBlob = function (blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  root.TT = TT;
})(window);

