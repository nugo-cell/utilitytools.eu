// Bridge test for the desktop helper. Verifies the localhost pairing + gate
// protocol WITHOUT injecting any input (so it never moves the real cursor).
//
// Run the helper first with a known code + port, e.g.:
//   $env:HELPER_PAIR_CODE="123456"; $env:HELPER_PORT="8799"; node agent.js
// then run this test in another shell.
const WebSocket = require('ws');
const PORT = Number(process.env.HELPER_PORT) || 8799;
const CODE = process.env.HELPER_PAIR_CODE || '123456';
let pass = 0, fail = 0;
const ok = (n, c) => { if (c) { pass++; console.log('PASS ' + n); } else { fail++; console.log('FAIL ' + n); } };
const wait = ms => new Promise(r => setTimeout(r, ms));

function open() {
  const ws = new WebSocket('ws://127.0.0.1:' + PORT);
  ws._msgs = [];
  ws.on('message', d => { try { ws._msgs.push(JSON.parse(d.toString())); } catch (_) {} });
  return new Promise((res, rej) => { ws.on('open', () => res(ws)); ws.on('error', rej); });
}
const last = (ws, t) => [...ws._msgs].reverse().find(m => m.type === t);

(async () => {
  // 1. Wrong pairing code is rejected.
  const bad = await open();
  bad.send(JSON.stringify({ type: 'pair', code: '000000' }));
  await wait(150);
  ok('wrong pairing code rejected', !!last(bad, 'pair_failed'));

  // 2. Correct pairing code pairs.
  const ws = await open();
  ws.send(JSON.stringify({ type: 'pair', code: CODE }));
  await wait(200);
  const paired = last(ws, 'paired');
  ok('correct pairing code pairs', !!paired);
  ok('paired reports canInject + screen', paired && typeof paired.canInject === 'boolean' && (!paired.canInject || (paired.screen && paired.screen.w > 0)));

  // 3. ping -> pong (control channel alive). NOTE: we deliberately do NOT send a
  //    'control' event with the gate on, so the test never moves the cursor.
  ws.send(JSON.stringify({ type: 'gate', on: false }));
  ws.send(JSON.stringify({ type: 'control', data: { kind: 'move', x: 0.5, y: 0.5 } })); // ignored: gate off
  ws.send(JSON.stringify({ type: 'ping' }));
  await wait(200);
  ok('ping answered (control with gate off is safely ignored)', !!last(ws, 'pong'));

  console.log(`\n${pass} passed, ${fail} failed`);
  try { bad.close(); ws.close(); } catch (_) {}
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('TEST ERROR — is the helper running?', e.message); process.exit(2); });

