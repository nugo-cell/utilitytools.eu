// End-to-end smoke test for Remote Support over HTTP + WebSocket.
// Requires the server running on localhost:3000 with SUPPORT_AGENT_TOKEN=dev-support-secret.
const WebSocket = require('ws');
const BASE = 'http://localhost:3000';
const WSBASE = 'ws://localhost:3000/ws/support';
let pass = 0, fail = 0;
const ok = (n, c) => { c ? (pass++, console.log('PASS ' + n)) : (fail++, console.log('FAIL ' + n)); };
const post = async (p, body, token) => {
  const r = await fetch(BASE + p, { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, token ? { Authorization: 'Bearer ' + token } : {}), body: JSON.stringify(body || {}) });
  return { status: r.status, json: await r.json().catch(() => ({})) };
};
const wait = ms => new Promise(r => setTimeout(r, ms));
function connect(url) {
  const ws = new WebSocket(url);
  ws._msgs = [];
  ws.on('message', d => { try { ws._msgs.push(JSON.parse(d.toString())); } catch (_) {} });
  return new Promise((res, rej) => { ws.on('open', () => res(ws)); ws.on('error', rej); ws.on('close', (c) => { ws._closed = c; }); });
}
const last = (ws, type) => [...ws._msgs].reverse().find(m => m.type === type);

(async () => {
  const PW = 'hunter2pw';

  // 1. Customer creates a session with a password.
  const noPw = await post('/api/support/session', {});
  ok('create without password rejected', noPw.status === 400 && !noPw.json.ok);
  const c = await post('/api/support/session', { secret: PW });
  ok('create session 200', c.status === 200 && c.json.ok);
  const { sessionId, customerToken, code } = c.json;
  ok('got code + token', !!sessionId && !!customerToken && /^[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(code));
  ok('server does not echo password', !('secret' in c.json) && !('password' in c.json));

  // 3. Customer connects WS.
  const cws = await connect(`${WSBASE}?session=${sessionId}&role=customer&token=${encodeURIComponent(customerToken)}`);
  ok('customer WS open', cws.readyState === 1);

  // 3b. Unauthorized WS rejected. NB: like /ws/p2p, the HTTP upgrade completes
  // (101) and the app then closes the socket with policy code 1008. So we must
  // assert on the CLOSE CODE, not on whether 'open' fired.
  let badRejected = false;
  await new Promise(r => {
    const bad = new WebSocket(`${WSBASE}?session=${sessionId}&role=agent&token=wrong`);
    bad.on('error', () => { badRejected = true; r(); });
    bad.on('close', (codeNum) => { badRejected = (codeNum === 1008 || codeNum === 1006 || codeNum >= 1002); r(); });
    setTimeout(r, 1500);
  });
  ok('unauthorized agent WS rejected', badRejected);

  // 4. Join requires the correct password.
  const wrongPw = await post('/api/support/join', { code, secret: 'nope' });
  ok('join with wrong password 401', wrongPw.status === 401);
  const wrongCode = await post('/api/support/join', { code: 'ZZZZ-ZZZZ', secret: PW });
  ok('join with bad code 404', wrongCode.status === 404);

  const claim = await post('/api/support/join', { code, secret: PW });
  ok('join with code+password 200', claim.status === 200 && claim.json.ok);
  const agentToken = claim.json.agentToken;

  // 4b. Re-join same code fails (single use).
  const reclaim = await post('/api/support/join', { code, secret: PW });
  ok('reclaim rejected', reclaim.status === 404 || reclaim.status === 409 || reclaim.status === 410);

  await wait(150);
  ok('customer got join_request', !!last(cws, 'join_request'));

  // 5. Agent connects WS.
  const aws = await connect(`${WSBASE}?session=${sessionId}&role=agent&token=${encodeURIComponent(agentToken)}`);
  ok('agent WS open', aws.readyState === 1);

  // 6. Before approval: signaling + chat must NOT reach the other side.
  aws.send(JSON.stringify({ type: 'signal', data: { sdp: 'x' } }));
  aws.send(JSON.stringify({ type: 'chat', text: 'hello before approval' }));
  await wait(150);
  ok('no signal relayed pre-approval', !last(cws, 'signal'));
  ok('no chat relayed pre-approval', !last(cws, 'chat'));

  // 7. Customer approves join.
  cws.send(JSON.stringify({ type: 'approve_join' }));
  await wait(150);
  ok('agent got join_approved', !!last(aws, 'join_approved'));
  const st1 = last(aws, 'state');
  ok('state active + agentJoin', st1 && st1.state.status === 'active' && st1.state.approvals.agentJoin === true);

  // 8. After approval: signaling + chat flow.
  aws.send(JSON.stringify({ type: 'signal', data: { candidate: 'c1' } }));
  aws.send(JSON.stringify({ type: 'chat', text: 'hi customer' }));
  await wait(150);
  ok('signal relayed post-approval', !!last(cws, 'signal'));
  ok('chat relayed post-approval', last(cws, 'chat') && last(cws, 'chat').text === 'hi customer');

  // 9. Control gating: agent control dropped before approval.
  aws.send(JSON.stringify({ type: 'control', data: { x: 1 } }));
  await wait(120);
  ok('control dropped before approval', !last(cws, 'control'));

  // 10. Agent requests control -> customer prompted -> approves.
  aws.send(JSON.stringify({ type: 'request_control' }));
  await wait(120);
  ok('customer got control_request', !!last(cws, 'control_request'));
  cws.send(JSON.stringify({ type: 'approve_control' }));
  await wait(150);
  ok('agent got control_approved', !!last(aws, 'control_approved'));

  // 11. Now control flows.
  aws.send(JSON.stringify({ type: 'control', data: { move: [10, 20] } }));
  await wait(120);
  ok('control relayed while approved', !!last(cws, 'control'));

  // 12. Customer revokes -> control dropped again.
  cws.send(JSON.stringify({ type: 'revoke_control' }));
  await wait(150);
  cws._msgs = []; // clear so we can detect new control
  aws.send(JSON.stringify({ type: 'control', data: { move: [1, 1] } }));
  await wait(150);
  ok('control dropped after revoke', !last(cws, 'control'));

  // 13. Audit log contains the key events.
  const audit = await fetch(`${BASE}/api/support/session/${sessionId}/audit`, { headers: { Authorization: 'Bearer ' + customerToken } }).then(r => r.json());
  const events = audit.audit.map(a => a.event);
  for (const ev of ['session_started', 'agent_claimed_code', 'agent_join_approved', 'control_approved', 'control_revoked']) {
    ok('audit has ' + ev, events.includes(ev));
  }

  // 14. End session -> both told, customer disconnect also ends.
  cws.send(JSON.stringify({ type: 'end' }));
  await wait(200);
  ok('agent got ended', !!last(aws, 'ended'));

  console.log(`\n${pass} passed, ${fail} failed`);
  cws.close(); aws.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('TEST ERROR', e); process.exit(2); });



