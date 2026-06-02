// Post-build packer: wraps the built RemoteSupportHelper.exe into a .zip next to
// it (dist/RemoteSupportHelper.zip), together with a short README.txt. Shipping a
// zip instead of a bare .exe trips fewer browser "can't be downloaded safely"
// warnings, and the customer just unzips and double-clicks.
//
// Run automatically as part of `npm run build`, or on its own with:
//   node pack-zip.js
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const dist = path.join(__dirname, 'dist');
const exe = path.join(dist, 'RemoteSupportHelper.exe');
const zip = path.join(dist, 'RemoteSupportHelper.zip');
const readme = path.join(dist, 'README.txt');

if (!fs.existsSync(exe)) {
  console.error('[pack-zip] dist/RemoteSupportHelper.exe not found — build it first (npm run build:exe).');
  process.exit(1);
}

// A plain-text quick-start the customer sees inside the zip.
fs.writeFileSync(readme, [
  'Remote Support — Desktop Helper',
  '================================',
  '',
  '1. Double-click RemoteSupportHelper.exe. A small window opens with a',
  '   6-digit PAIRING CODE. Nothing is installed.',
  '2. Go back to the Remote Support web page, open "Desktop control',
  '   (mouse & keyboard)", type the pairing code and click "Connect helper".',
  '3. The agent can only move your mouse/keyboard while you allow it.',
  '',
  'To STOP at any time: close the helper window, press Ctrl+C, or type q + Enter.',
  '',
  'If Windows shows a blue SmartScreen box the first time, click',
  '"More info" then "Run anyway". The file is safe; it is just unsigned.',
  ''
].join('\r\n'), 'utf8');

// Remove any stale zip so we never append to an old archive.
try { fs.unlinkSync(zip); } catch (_) {}

// Build to a unique temp file first, then atomically move it into place. This
// means a process that still has the final .zip open (e.g. a running dev server
// that served the download) can't make the whole build fail — we just retry the
// swap a few times instead of failing on Compress-Archive's -Force delete.
const tmpZip = path.join(dist, `.RemoteSupportHelper.${process.pid}.tmp.zip`);
try { fs.unlinkSync(tmpZip); } catch (_) {}

if (process.platform === 'win32') {
  execFileSync('powershell.exe', [
    '-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command',
    `Compress-Archive -Path "${exe}","${readme}" -DestinationPath "${tmpZip}" -Force`
  ], { stdio: 'inherit' });
} else {
  // Fallback for building on macOS/Linux CI: requires the standard `zip` tool.
  execFileSync('zip', ['-j', tmpZip, exe, readme], { stdio: 'inherit' });
}

// Swap temp -> final, retrying if the destination is briefly locked.
function sleep(ms) { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms); }
let swapped = false;
for (let attempt = 1; attempt <= 5 && !swapped; attempt++) {
  try {
    try { fs.unlinkSync(zip); } catch (_) {}     // best-effort remove old
    fs.renameSync(tmpZip, zip);
    swapped = true;
  } catch (e) {
    if (attempt === 5) {
      try { fs.unlinkSync(tmpZip); } catch (_) {}
      console.error(
        `[pack-zip] Could not replace ${path.basename(zip)} — it is open in another program.\n` +
        '           Stop the dev web server (it serves /downloads/...) and run "node pack-zip.js" again.'
      );
      process.exit(1);
    }
    sleep(400);
  }
}

const kb = Math.round(fs.statSync(zip).size / 1024);
console.log(`[pack-zip] created ${path.relative(__dirname, zip)} (${kb} KB)`);

