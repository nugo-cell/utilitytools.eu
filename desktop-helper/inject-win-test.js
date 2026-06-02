// Standalone smoke test for the Windows injector (inject-win.js).
//
// Run it the boring way — no nested shell quoting needed:
//   node inject-win-test.js
//
// It spins up the real PowerShell worker and checks ONLY the safe, read-only
// surface: that the worker becomes ready and reports a sane screen size. It
// never calls moveNorm/button/wheel/keyEvent, so it never moves the real
// cursor or presses real keys.
'use strict';

const inj = require('./inject-win');

let pass = 0, fail = 0;
const ok = (name, cond) => {
  if (cond) { pass++; console.log('PASS ' + name); }
  else { fail++; console.log('FAIL ' + name); }
};

(async () => {
  ok('module exposes win32 contract',
    inj.platform === 'win32' &&
    typeof inj.whenReady?.then === 'function' &&
    typeof inj.screenSize === 'function' &&
    typeof inj.stop === 'function');

  // Wait for the PowerShell worker, but don't hang forever if it can't start.
  const timeout = new Promise((res) => setTimeout(() => res('timeout'), 8000));
  const result = await Promise.race([inj.whenReady, timeout]);
  ok('PowerShell worker reached READY', result !== 'timeout');

  const size = inj.screenSize();
  ok('screenSize() returns positive dimensions',
    size && Number.isFinite(size.w) && Number.isFinite(size.h) && size.w > 0 && size.h > 0);
  console.log(`  screen = ${size.w} x ${size.h}`);

  console.log(`\n${pass} passed, ${fail} failed`);
  try { inj.stop(); } catch (_) {}
  process.exit(fail ? 1 : 0);
})().catch((e) => {
  console.error('TEST ERROR:', e.message);
  try { inj.stop(); } catch (_) {}
  process.exit(2);
});

