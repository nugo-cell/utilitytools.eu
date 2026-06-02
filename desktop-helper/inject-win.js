// ---------------------------------------------------------------------------
// Windows input injector — dependency-free.
//
// Instead of a native Node addon (which is painful to package into a single
// .exe for non-technical customers), we drive input through a single long-lived
// PowerShell process that P/Invokes the Win32 user32.dll functions:
//   SetCursorPos, mouse_event, keybd_event, GetSystemMetrics
//
// The Node side just writes one tiny command line per event to PowerShell's
// stdin. This keeps the helper 100% pure JavaScript so it bundles cleanly into
// a standalone executable with no compiler, no node-gyp and no native files.
// ---------------------------------------------------------------------------

'use strict';

const os = require('os');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Mouse event flags (legacy mouse_event API).
const MF = { LEFTDOWN: 0x0002, LEFTUP: 0x0004, RIGHTDOWN: 0x0008, RIGHTUP: 0x0010, MIDDLEDOWN: 0x0020, MIDDLEUP: 0x0040 };
const KEYEVENTF_KEYUP = 0x0002;
const WHEEL_DELTA = 120;

// The PowerShell worker: defines the Win32 calls once, then streams commands.
const PS_SCRIPT = `
$ErrorActionPreference = 'Stop'
Add-Type -Namespace RS -Name Native -MemberDefinition @'
[DllImport("user32.dll")] public static extern bool SetCursorPos(int X, int Y);
[DllImport("user32.dll")] public static extern void mouse_event(uint dwFlags, uint dx, uint dy, uint dwData, System.UIntPtr dwExtraInfo);
[DllImport("user32.dll")] public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, System.UIntPtr dwExtraInfo);
[DllImport("user32.dll")] public static extern int GetSystemMetrics(int nIndex);
'@
$w = [RS.Native]::GetSystemMetrics(0); $h = [RS.Native]::GetSystemMetrics(1)
Write-Output ("SIZE " + $w + " " + $h)
Write-Output "READY"
[Console]::Out.Flush()
while (($line = [Console]::In.ReadLine()) -ne $null) {
  if ($line.Length -eq 0) { continue }
  $p = $line.Split(' ')
  try {
    switch ($p[0]) {
      'M' { [RS.Native]::SetCursorPos([int]$p[1], [int]$p[2]) | Out-Null }
      'B' { [RS.Native]::mouse_event([uint32]$p[1], 0, 0, 0, [System.UIntPtr]::Zero) }
      'W' { [RS.Native]::mouse_event(0x0800, 0, 0, [uint32]$p[1], [System.UIntPtr]::Zero) }
      'K' { [RS.Native]::keybd_event([byte]$p[1], 0, [uint32]$p[2], [System.UIntPtr]::Zero) }
      'X' { exit }
    }
  } catch { }
}
`;

let proc = null;
let ready = false;
let size = { w: 1920, h: 1080 };
const queue = [];
let resolveReady;
const whenReady = new Promise((res) => { resolveReady = res; });

function start() {
  // Write the worker script to a temp file so PowerShell's stdin stays free for
  // streaming commands (works the same whether run from Node or a packaged exe).
  const scriptPath = path.join(os.tmpdir(), `rs-helper-inject-${process.pid}.ps1`);
  fs.writeFileSync(scriptPath, PS_SCRIPT, 'utf8');

  proc = spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scriptPath], {
    stdio: ['pipe', 'pipe', 'ignore'], windowsHide: true
  });

  let buf = '';
  proc.stdout.on('data', (d) => {
    buf += d.toString();
    let nl;
    while ((nl = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (line.startsWith('SIZE')) {
        const m = line.split(/\s+/);
        const w = parseInt(m[1], 10), h = parseInt(m[2], 10);
        if (w > 0 && h > 0) size = { w, h };
      } else if (line === 'READY') {
        ready = true;
        for (const cmd of queue.splice(0)) write(cmd);
        try { fs.unlinkSync(scriptPath); } catch (_) {}
        resolveReady(true);
      }
    }
  });

  proc.on('error', () => { ready = false; });
  proc.on('exit', () => { ready = false; proc = null; });
}

function write(cmd) {
  if (!proc || !proc.stdin.writable) return;
  if (!ready) { queue.push(cmd); return; }
  try { proc.stdin.write(cmd + '\n'); } catch (_) {}
}

// ---- Public interface (matches the cross-platform injector contract) ----
function screenSize() { return size; }

function moveNorm(x, y) {
  const px = Math.round(Math.max(0, Math.min(1, Number(x))) * (size.w - 1));
  const py = Math.round(Math.max(0, Math.min(1, Number(y))) * (size.h - 1));
  write(`M ${px} ${py}`);
}

function button(btn, down) {
  let flag;
  if (btn === 'right')       flag = down ? MF.RIGHTDOWN  : MF.RIGHTUP;
  else if (btn === 'middle') flag = down ? MF.MIDDLEDOWN : MF.MIDDLEUP;
  else                       flag = down ? MF.LEFTDOWN   : MF.LEFTUP;
  write(`B ${flag >>> 0}`);
}

function wheel(dy) {
  const amount = (dy > 0 ? -WHEEL_DELTA : WHEEL_DELTA);
  write(`W ${amount >>> 0}`);   // pass as unsigned 32-bit
}

// Map DOM KeyboardEvent.code (layout-independent) -> Windows virtual-key code.
function vkFromCode(code, key) {
  if (!code) {
    if (key && key.length === 1) {
      const c = key.toUpperCase().charCodeAt(0);
      if ((c >= 0x41 && c <= 0x5A) || (c >= 0x30 && c <= 0x39)) return c;
    }
    return null;
  }
  if (/^Key([A-Z])$/.test(code))    return code.charCodeAt(3);
  if (/^Digit([0-9])$/.test(code))  return 0x30 + Number(code[5]);
  if (/^Numpad([0-9])$/.test(code)) return 0x60 + Number(code.slice(6));
  if (/^F([1-9]|1[0-9]|2[0-4])$/.test(code)) return 0x70 + (Number(code.slice(1)) - 1);
  const MAP = {
    Backspace: 0x08, Tab: 0x09, Enter: 0x0D, NumpadEnter: 0x0D,
    ShiftLeft: 0xA0, ShiftRight: 0xA1, ControlLeft: 0xA2, ControlRight: 0xA3,
    AltLeft: 0xA4, AltRight: 0xA5, Pause: 0x13, CapsLock: 0x14, Escape: 0x1B,
    Space: 0x20, PageUp: 0x21, PageDown: 0x22, End: 0x23, Home: 0x24,
    ArrowLeft: 0x25, ArrowUp: 0x26, ArrowRight: 0x27, ArrowDown: 0x28,
    PrintScreen: 0x2C, Insert: 0x2D, Delete: 0x2E, MetaLeft: 0x5B, MetaRight: 0x5C,
    NumpadMultiply: 0x6A, NumpadAdd: 0x6B, NumpadSubtract: 0x6D,
    NumpadDecimal: 0x6E, NumpadDivide: 0x6F,
    Semicolon: 0xBA, Equal: 0xBB, Comma: 0xBC, Minus: 0xBD, Period: 0xBE,
    Slash: 0xBF, Backquote: 0xC0, BracketLeft: 0xDB, Backslash: 0xDC,
    BracketRight: 0xDD, Quote: 0xDE
  };
  return MAP[code] || null;
}

function keyEvent(code, key, down) {
  const vk = vkFromCode(code, key);
  if (vk == null) return false;
  write(`K ${vk} ${down ? 0 : KEYEVENTF_KEYUP}`);
  return true;
}

function stop() { if (proc) { try { write('X'); proc.stdin.end(); } catch (_) {} try { proc.kill(); } catch (_) {} } }

start();

module.exports = { moveNorm, button, wheel, keyEvent, screenSize, whenReady, stop, platform: 'win32' };
