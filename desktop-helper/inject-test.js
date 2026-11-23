// Non-disruptive real-injection check for the PowerShell injector.
const { execSync } = require('child_process');
const inj = require('./inject-win');

function pos() {
  const script = 'Add-Type -AssemblyName System.Windows.Forms; $p=[System.Windows.Forms.Cursor]::Position; "{0},{1}" -f $p.X,$p.Y';
  const out = execSync('powershell -NoProfile -Command ' + JSON.stringify(script)).toString().trim();
  const [x, y] = out.split(',').map(Number);
  return { x, y };
}

inj.whenReady.then(async () => {
  const s = inj.screenSize();
  const before = pos();
  inj.moveNorm(before.x / (s.w - 1), before.y / (s.h - 1)); // command move to current pixel
  await new Promise(r => setTimeout(r, 400));
  const after = pos();
  const ok = Math.abs(after.x - before.x) <= 1 && Math.abs(after.y - before.y) <= 1;
  console.log(`screen=${s.w}x${s.h} before=${JSON.stringify(before)} after=${JSON.stringify(after)} -> injection ${ok ? 'OK (no net movement)' : 'MISMATCH'}`);
  inj.stop();
  process.exit(ok ? 0 : 1);
});

