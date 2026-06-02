// ---------------------------------------------------------------------------
// Remote Support — Desktop Helper
//
// Runs on the CUSTOMER's machine. It lets the customer's browser tab forward
// the support agent's mouse/keyboard events to the real OS, so the agent can
// actually control the computer during a remote-control-approved session.
//
// Trust model (consent-first, matches the web feature):
//   * Listens ONLY on 127.0.0.1 — never reachable from the network.
//   * The browser must complete a one-time PAIRING CODE handshake.
//   * Input is injected ONLY while the browser reports the control GATE is on
//     (which mirrors the customer's server-side remote-control approval).
//   * Closing this window, pressing the panic key, or the customer revoking
//     control in the browser stops all injection immediately.
//
// No native build tools required — input injection uses koffi (prebuilt FFI).
// Windows is implemented; macOS/Linux print a clear "not yet supported" notice.
// ---------------------------------------------------------------------------

'use strict';

const readline = require('readline');
const { WebSocketServer } = require('ws');

const PORT = Number(process.env.HELPER_PORT) || 8765;
const IDLE_STOP_MS = 30 * 1000;   // auto-close the control gate after silence

// ---- Load the platform input injector ----
let inject = null;
let injectError = null;
try {
  if (process.platform === 'win32') {
    inject = require('./inject-win');
    if (inject && inject.whenReady) {
      inject.whenReady.then(() => {
        const s = inject.screenSize();
        console.log(`[helper] input ready — screen ${s.w} x ${s.h}`);
      });
    }
  } else {
    injectError = `Input injection is not implemented for ${process.platform} yet (Windows only in this build).`;
  }
} catch (e) {
  injectError = 'Could not start the input engine: ' + e.message;
}

// ---- Pairing code: 6 digits, shown to the customer to type into the browser ----
// HELPER_PAIR_CODE may pin it (used by automated tests); otherwise it is random.
const pairCode = (/^\d{6}$/.test(process.env.HELPER_PAIR_CODE || '') ? process.env.HELPER_PAIR_CODE
  : String(Math.floor(100000 + Math.random() * 900000)));

function banner() {
  const size = inject ? inject.screenSize() : { w: '?', h: '?' };
  console.log('\n==================================================');
  console.log('  Remote Support — Desktop Helper');
  console.log('==================================================');
  console.log('  This lets a support agent control THIS computer,');
  console.log('  but only while you allow it. Keep this window open.');
  console.log('');
  console.log(`  >>>  PAIRING CODE:  ${pairCode}  <<<`);
  console.log('');
  console.log('  What to do:');
  console.log('   1) Go back to the Remote Support web page.');
  console.log('   2) Open "Desktop control (mouse & keyboard)".');
  console.log('   3) Type the pairing code above and click "Connect helper".');
  console.log('');
  console.log('  Control only works while you approve it in the browser.');
  console.log('  To STOP at any time: close this window, press Ctrl+C,');
  console.log('  or type q then Enter.');
  if (injectError) {
    console.log('\n  NOTE: ' + injectError);
    console.log('  The helper will still pair, but cannot move the mouse/keyboard.');
  }
  console.log('==================================================\n');
}

let gateOn = false;
let idleTimer = null;
let activeSocket = null;

function setGate(on, reason) {
  const next = !!on;
  if (next === gateOn) return;
  gateOn = next;
  console.log(`[helper] control ${gateOn ? 'ENABLED' : 'disabled'}${reason ? ' (' + reason + ')' : ''}`);
  if (gateOn) armIdle(); else clearIdle();
}

function armIdle() {
  clearIdle();
  idleTimer = setTimeout(() => setGate(false, 'idle timeout'), IDLE_STOP_MS);
  if (idleTimer.unref) idleTimer.unref();
}
function clearIdle() { if (idleTimer) { clearTimeout(idleTimer); idleTimer = null; } }

function applyControl(data) {
  if (!gateOn || !inject || !data || typeof data.kind !== 'string') return;
  armIdle();
  try {
    switch (data.kind) {
      case 'move':  inject.moveNorm(data.x, data.y); break;
      case 'down':  if (data.x != null) inject.moveNorm(data.x, data.y); inject.button(data.button || 'left', true); break;
      case 'up':    if (data.x != null) inject.moveNorm(data.x, data.y); inject.button(data.button || 'left', false); break;
      case 'click': if (data.x != null) inject.moveNorm(data.x, data.y); inject.button(data.button || 'left', true); inject.button(data.button || 'left', false); break;
      case 'wheel': inject.wheel(Number(data.dy) || 0); break;
      case 'key':   inject.keyEvent(data.code, data.key, data.action === 'down'); break;
      default: break;
    }
  } catch (e) {
    console.warn('[helper] inject error:', e.message);
  }
}

// ---- Localhost WebSocket server ----
const wss = new WebSocketServer({ host: '127.0.0.1', port: PORT }, banner);

// Keep the window open after a fatal error so a double-click user can read it.
function pauseExit(code) {
  try {
    if (process.stdin.isTTY) {
      console.log('\nPress Enter to close this window…');
      process.stdin.resume();
      process.stdin.once('data', () => process.exit(code || 0));
      return;
    }
  } catch (_) {}
  process.exit(code || 0);
}

wss.on('error', (e) => {
  if (e && e.code === 'EADDRINUSE') {
    console.error(`\n[helper] Port ${PORT} is already in use — is the helper already running?`);
    console.error('Close the other window, or set HELPER_PORT to a different number.');
    pauseExit(1);
    return;
  }
  console.error('[helper] server error:', e.message);
  pauseExit(1);
});

wss.on('connection', (ws, req) => {
  // Defensive: only accept loopback peers.
  const ip = (req.socket.remoteAddress || '').replace(/^::ffff:/, '');
  if (ip !== '127.0.0.1' && ip !== '::1') { try { ws.close(); } catch (_) {} return; }

  let paired = false;
  ws.on('message', (buf) => {
    let m;
    try { m = JSON.parse(buf.toString()); } catch (_) { return; }
    if (!m || typeof m.type !== 'string') return;

    if (!paired) {
      if (m.type === 'pair' && String(m.code) === pairCode) {
        paired = true;
        activeSocket = ws;
        try { ws.send(JSON.stringify({ type: 'paired', screen: inject ? inject.screenSize() : null, canInject: !!inject })); } catch (_) {}
        console.log('[helper] browser paired ✓');
      } else {
        try { ws.send(JSON.stringify({ type: 'pair_failed' })); ws.close(1008, 'pair failed'); } catch (_) {}
        console.log('[helper] rejected a connection (bad pairing code)');
      }
      return;
    }

    if (m.type === 'gate')    { setGate(m.on, 'browser'); return; }
    if (m.type === 'control') { applyControl(m.data); return; }
    if (m.type === 'end')     { setGate(false, 'session ended'); return; }
    if (m.type === 'ping')    { try { ws.send(JSON.stringify({ type: 'pong' })); } catch (_) {} return; }
  });

  ws.on('close', () => {
    if (activeSocket === ws) activeSocket = null;
    setGate(false, 'browser disconnected');
    console.log('[helper] browser disconnected');
  });
});

// ---- Panic / stop controls ----
function shutdown() {
  setGate(false, 'shutting down');
  try { if (inject && inject.stop) inject.stop(); } catch (_) {}
  try { wss.close(); } catch (_) {}
  console.log('[helper] stopped. No further input can be injected.');
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

if (process.stdin.isTTY) {
  const rl = readline.createInterface({ input: process.stdin });
  rl.on('line', (line) => {
    const v = line.trim().toLowerCase();
    if (v === 'q' || v === 'quit' || v === 'stop' || v === 'exit') shutdown();
    if (v === 'off') setGate(false, 'manual');
  });
}

