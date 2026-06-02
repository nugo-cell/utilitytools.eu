// ---------------------------------------------------------------------------
// Remote Support — temporary, consent-first remote support sessions.
//
// Design rules (enforced here, not just in the UI):
//   * A session only exists because the CUSTOMER created it (no unattended access).
//   * The agent can only join by claiming a short-lived, single-use CODE.
//   * Nothing is relayed to the agent until the customer APPROVES the join.
//   * Screen sharing is a separate customer-controlled gate.
//   * Remote control is a SEPARATE approval, instantly revocable, and dropped
//     by the server whenever the approval is not currently active.
//   * Everything is in memory and dies with the session — no saved credentials,
//     no permanent access, no silent reconnect.
//
// Storage is intentionally in-memory for the MVP. The store is isolated behind
// a small API so it can be swapped for Redis/Postgres later without touching
// the transport or UI layers (see docs/REMOTE-SUPPORT.md).
// ---------------------------------------------------------------------------

'use strict';

const crypto = require('crypto');

// ---------------- Tunables ----------------
const CODE_TTL_MS          = 5 * 60 * 1000;        // code must be claimed within 5 min
const INACTIVITY_TTL_MS    = 15 * 60 * 1000;       // auto-end after 15 min of silence
const ABSOLUTE_MAX_MS      = 2 * 60 * 60 * 1000;   // hard cap on any session (2 h)
const MAX_SESSIONS         = 500;                  // global safety cap
const MAX_AUDIT_ENTRIES    = 500;                  // per-session audit ring buffer
const WS_MAX_MSG_BYTES     = 64 * 1024;            // SDP/ICE can be a few KB
const WS_RATE_PER_WIN      = 600;                  // messages per window (high: live mouse moves)
const WS_RATE_WIN_MS       = 5000;

// Code alphabet excludes easily-confused characters (0/O, 1/I/L).
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH   = 8;

const MIN_SECRET_LEN = 4;
const MAX_SECRET_LEN = 128;
const MAX_JOIN_ATTEMPTS = 5;        // wrong-password attempts before the code is locked

// ---------------- Helpers ----------------
function randToken(bytes = 24) {
  return crypto.randomBytes(bytes).toString('base64url');
}

// The session password is set by whoever CREATES the session. We never store it
// in clear text — only a salted scrypt hash, compared in constant time. (In a
// DB-backed version this becomes a hashed column; see docs/REMOTE-SUPPORT.md.)
function hashSecret(secret, salt) {
  return crypto.scryptSync(String(secret == null ? '' : secret), salt, 32);
}

function randCode() {
  const buf = crypto.randomBytes(CODE_LENGTH);
  let out = '';
  for (let i = 0; i < CODE_LENGTH; i++) out += CODE_ALPHABET[buf[i] % CODE_ALPHABET.length];
  // Group as XXXX-XXXX for readability.
  return out.slice(0, 4) + '-' + out.slice(4);
}

function timingSafeEqual(a, b) {
  const ba = Buffer.from(String(a || ''));
  const bb = Buffer.from(String(b || ''));
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

function now() { return Date.now(); }

// ---------------- Store ----------------
const sessions = new Map();      // sessionId -> session
const codeIndex = new Map();     // CODE -> sessionId (only while claimable)

function publicState(s) {
  return {
    sessionId: s.id,
    status: s.status,                 // 'waiting' | 'agent_pending' | 'active' | 'ended'
    approvals: { ...s.approvals },
    presence: { customer: !!s.sockets.customer, agent: !!s.sockets.agent },
    agentId: s.agentId || null,
    codeExpiresAt: s.codeExpiresAt,
    endsAt: s.absoluteEndsAt,
    endedReason: s.endedReason || null
  };
}

function addAudit(s, event, by, meta) {
  const entry = { at: new Date().toISOString(), event, by: by || 'system', meta: meta || null };
  s.audit.push(entry);
  if (s.audit.length > MAX_AUDIT_ENTRIES) s.audit.shift();
  // One structured log line per audit event — useful for container log review.
  console.log(`[support][audit] session=${s.id} event=${event} by=${by || 'system'}` +
    (meta ? ' meta=' + JSON.stringify(meta) : ''));
  return entry;
}

function touch(s) {
  s.lastActivityAt = now();
  rescheduleInactivity(s);
}

function rescheduleInactivity(s) {
  if (s.timers.inactivity) clearTimeout(s.timers.inactivity);
  s.timers.inactivity = setTimeout(() => endSession(s.id, 'inactivity_timeout', 'system'), INACTIVITY_TTL_MS);
  if (s.timers.inactivity.unref) s.timers.inactivity.unref();
}

function broadcast(s) {
  const msg = JSON.stringify({ type: 'state', state: publicState(s) });
  for (const role of ['customer', 'agent']) {
    const ws = s.sockets[role];
    if (ws && ws.readyState === 1) {
      try { ws.send(msg); } catch (_) {}
    }
  }
}

function sendTo(s, role, obj) {
  const ws = s.sockets[role];
  if (ws && ws.readyState === 1) {
    try { ws.send(JSON.stringify(obj)); } catch (_) {}
  }
}

// ---------------- Lifecycle ----------------
function createSession(opts) {
  const o = opts || {};
  // The creator MUST set a password. Joining later requires the code AND this.
  const pw = String(o.secret == null ? '' : o.secret);
  if (pw.length < MIN_SECRET_LEN) {
    const err = new Error(`A session password of at least ${MIN_SECRET_LEN} characters is required.`);
    err.statusCode = 400;
    throw err;
  }
  if (pw.length > MAX_SECRET_LEN) {
    const err = new Error('Session password is too long.');
    err.statusCode = 400;
    throw err;
  }
  if (sessions.size >= MAX_SESSIONS) {
    const err = new Error('Server is at capacity, please try again shortly.');
    err.statusCode = 503;
    throw err;
  }
  // Generate a code that is not currently in use.
  let code;
  do { code = randCode(); } while (codeIndex.has(code));

  const secretSalt = crypto.randomBytes(16);
  const id = randToken(16);
  const s = {
    id,
    code,
    codeClaimed: false,
    status: 'waiting',
    createdAt: now(),
    codeExpiresAt: now() + CODE_TTL_MS,
    absoluteEndsAt: now() + ABSOLUTE_MAX_MS,
    lastActivityAt: now(),
    customerToken: randToken(),
    agentToken: null,
    agentId: null,
    secretSalt,
    secretHash: hashSecret(pw, secretSalt),
    joinAttempts: 0,
    approvals: { agentJoin: false, screenShare: false, remoteControl: false },
    audit: [],
    endedReason: null,
    sockets: { customer: null, agent: null },
    timers: { code: null, inactivity: null, absolute: null },
    meta: o.meta || {}
  };

  sessions.set(id, s);
  codeIndex.set(code, id);

  addAudit(s, 'session_started', 'customer', { userAgent: o.userAgent || null });
  addAudit(s, 'code_generated', 'system', { expiresInMs: CODE_TTL_MS });

  // Code expiry: if nobody claims it in time, invalidate just the code (the
  // customer can still keep the session open and regenerate).
  s.timers.code = setTimeout(() => {
    if (!s.codeClaimed && s.status === 'waiting') {
      codeIndex.delete(s.code);
      addAudit(s, 'code_expired', 'system');
      broadcast(s);
    }
  }, CODE_TTL_MS);
  if (s.timers.code.unref) s.timers.code.unref();

  // Absolute cap.
  s.timers.absolute = setTimeout(() => endSession(id, 'max_duration', 'system'), ABSOLUTE_MAX_MS);
  if (s.timers.absolute.unref) s.timers.absolute.unref();

  rescheduleInactivity(s);
  return s;
}

// A joiner provides the one-time CODE and the session PASSWORD that the creator
// set. Both must be correct. This does NOT grant any access on its own — the
// customer must still approve the join. The password is checked BEFORE the code
// is burned, with a small attempt limit to stop brute force.
function join(rawCode, secret, agentId) {
  const code = String(rawCode || '').trim().toUpperCase();
  const sessionId = codeIndex.get(code);
  if (!sessionId) {
    const err = new Error('Invalid or expired support code.');
    err.statusCode = 404;
    throw err;
  }
  const s = sessions.get(sessionId);
  if (!s || s.status === 'ended') {
    codeIndex.delete(code);
    const err = new Error('This support session has ended.');
    err.statusCode = 410;
    throw err;
  }
  if (s.codeClaimed) {
    const err = new Error('This support code has already been used.');
    err.statusCode = 409;
    throw err;
  }
  if (now() > s.codeExpiresAt) {
    codeIndex.delete(code);
    const err = new Error('This support code has expired.');
    err.statusCode = 410;
    throw err;
  }

  // Verify the password the creator set (constant-time).
  const attempt = hashSecret(secret, s.secretSalt);
  const good = s.secretHash && attempt.length === s.secretHash.length && crypto.timingSafeEqual(attempt, s.secretHash);
  if (!good) {
    s.joinAttempts = (s.joinAttempts || 0) + 1;
    addAudit(s, 'join_password_failed', 'agent', { attempt: s.joinAttempts });
    if (s.joinAttempts >= MAX_JOIN_ATTEMPTS) {
      // Lock the code: too many wrong passwords. The customer can start over.
      codeIndex.delete(code);
      addAudit(s, 'code_locked', 'system', { reason: 'too_many_password_attempts' });
      broadcast(s);
      const err = new Error('Too many incorrect attempts. Ask the customer to start a new session.');
      err.statusCode = 429;
      throw err;
    }
    const err = new Error('Incorrect session password.');
    err.statusCode = 401;
    throw err;
  }

  // Single-use: burn the code now that code + password are both correct.
  s.codeClaimed = true;
  codeIndex.delete(code);
  s.agentToken = randToken();
  s.agentId = agentId;
  s.status = 'agent_pending';
  addAudit(s, 'agent_claimed_code', 'agent', { agentId });
  touch(s);
  broadcast(s);
  // Let the customer know an agent is requesting to join.
  sendTo(s, 'customer', { type: 'join_request', agentId });
  return { sessionId: s.id, agentToken: s.agentToken };
}

function endSession(sessionId, reason, by) {
  const s = sessions.get(sessionId);
  if (!s) return false;
  if (s.status === 'ended') return true;

  s.status = 'ended';
  s.endedReason = reason || 'ended';
  s.approvals.agentJoin = false;
  s.approvals.screenShare = false;
  s.approvals.remoteControl = false;
  addAudit(s, 'session_ended', by || 'system', { reason: s.endedReason });

  broadcast(s);

  // Tell both sides explicitly, then close.
  for (const role of ['customer', 'agent']) {
    const ws = s.sockets[role];
    if (ws) {
      try { ws.send(JSON.stringify({ type: 'ended', reason: s.endedReason })); } catch (_) {}
      try { ws.close(1000, 'session ended'); } catch (_) {}
    }
  }

  // Clear timers + indexes.
  for (const t of Object.values(s.timers)) { if (t) clearTimeout(t); }
  if (s.code) codeIndex.delete(s.code);

  // Keep a short tombstone so a late poll gets a clean "ended" instead of 404,
  // then drop it from memory.
  setTimeout(() => sessions.delete(sessionId), 60 * 1000).unref?.();
  return true;
}

// ---------------- Approvals (all customer-driven, except agent requests) ----------------
function approveJoin(s) {
  if (s.status === 'ended') return;
  s.approvals.agentJoin = true;
  if (s.status === 'agent_pending') s.status = 'active';
  addAudit(s, 'agent_join_approved', 'customer');
  touch(s);
  broadcast(s);
  sendTo(s, 'agent', { type: 'join_approved' });
}

function denyJoin(s) {
  if (s.status === 'ended') return;
  s.approvals.agentJoin = false;
  addAudit(s, 'agent_join_denied', 'customer');
  // Disconnect the agent; they would need a fresh code to try again.
  sendTo(s, 'agent', { type: 'join_denied' });
  const ws = s.sockets.agent;
  if (ws) { try { ws.close(1008, 'join denied'); } catch (_) {} }
  s.agentToken = null;
  s.agentId = null;
  s.status = 'waiting';
  touch(s);
  broadcast(s);
}

function setShare(s, on) {
  if (s.status === 'ended' || !s.approvals.agentJoin) return;
  s.approvals.screenShare = !!on;
  addAudit(s, on ? 'screen_share_started' : 'screen_share_stopped', 'customer');
  touch(s);
  broadcast(s);
}

function approveControl(s) {
  if (s.status === 'ended' || !s.approvals.agentJoin) return;
  s.approvals.remoteControl = true;
  addAudit(s, 'control_approved', 'customer');
  touch(s);
  broadcast(s);
  sendTo(s, 'agent', { type: 'control_approved' });
}

function revokeControl(s, by) {
  if (!s.approvals.remoteControl) { return; }
  s.approvals.remoteControl = false;
  addAudit(s, 'control_revoked', by || 'customer');
  touch(s);
  broadcast(s);
  sendTo(s, 'agent', { type: 'control_revoked' });
}

// ---------------- HTTP API ----------------
function readJsonBody(req) {
  return req.body && typeof req.body === 'object' ? req.body : {};
}

function bearer(req) {
  const h = req.headers['authorization'] || '';
  const m = /^Bearer\s+(.+)$/i.exec(h);
  return m ? m[1].trim() : '';
}

function requireCustomer(req, res) {
  const s = sessions.get(req.params.id);
  if (!s) { res.status(404).json({ ok: false, error: 'Session not found' }); return null; }
  if (!timingSafeEqual(bearer(req), s.customerToken)) {
    res.status(401).json({ ok: false, error: 'Unauthorized' });
    return null;
  }
  return s;
}

function registerRoutes(app, jsonMiddleware) {
  const json = jsonMiddleware || require('express').json({ limit: '8kb' });

  // Customer: create a session and receive a one-time code. The customer also
  // sets a password here; joiners must provide the code AND this password.
  app.post('/api/support/session', json, (req, res) => {
    try {
      const { secret } = readJsonBody(req);
      const s = createSession({ secret, userAgent: (req.headers['user-agent'] || '').slice(0, 120) });
      res.json({
        ok: true,
        sessionId: s.id,
        code: s.code,
        customerToken: s.customerToken,
        codeExpiresAt: s.codeExpiresAt,
        endsAt: s.absoluteEndsAt
      });
    } catch (e) {
      res.status(e.statusCode || 500).json({ ok: false, error: e.message });
    }
  });

  // Customer: poll session state (WS is primary; this is a fallback).
  app.get('/api/support/session/:id', (req, res) => {
    const s = requireCustomer(req, res);
    if (!s) return;
    res.json({ ok: true, state: publicState(s) });
  });

  // Customer or agent: fetch the audit log.
  app.get('/api/support/session/:id/audit', (req, res) => {
    const s = sessions.get(req.params.id);
    if (!s) return res.status(404).json({ ok: false, error: 'Session not found' });
    const token = bearer(req);
    const isCustomer = timingSafeEqual(token, s.customerToken);
    const isAgent = s.agentToken && timingSafeEqual(token, s.agentToken);
    if (!isCustomer && !isAgent) return res.status(401).json({ ok: false, error: 'Unauthorized' });
    res.json({ ok: true, audit: s.audit, state: publicState(s) });
  });

  // Customer or agent: end the session.
  app.post('/api/support/session/:id/end', json, (req, res) => {
    const s = sessions.get(req.params.id);
    if (!s) return res.status(404).json({ ok: false, error: 'Session not found' });
    const token = bearer(req);
    const isCustomer = timingSafeEqual(token, s.customerToken);
    const isAgent = s.agentToken && timingSafeEqual(token, s.agentToken);
    if (!isCustomer && !isAgent) return res.status(401).json({ ok: false, error: 'Unauthorized' });
    endSession(s.id, 'closed_by_' + (isCustomer ? 'customer' : 'agent'), isCustomer ? 'customer' : 'agent');
    res.json({ ok: true });
  });

  // Joiner: provide the code + the password the creator set -> reserve the
  // session (still needs the customer's approval). No global/agent secret.
  app.post('/api/support/join', json, (req, res) => {
    const { code, secret, agentId } = readJsonBody(req);
    try {
      const out = join(code, secret, agentId || 'agent');
      res.json({ ok: true, ...out });
    } catch (e) {
      res.status(e.statusCode || 500).json({ ok: false, error: e.message });
    }
  });
}

// ---------------- WebSocket transport ----------------
// URL: /ws/support?session=<id>&role=customer|agent&token=<token>
function isId(v) { return typeof v === 'string' && /^[A-Za-z0-9_-]{8,64}$/.test(v); }

function handleConnection(ws, req) {
  let url;
  try { url = new URL(req.url, 'http://localhost'); } catch (_) { try { ws.close(1008, 'bad url'); } catch (_) {} return; }
  const sessionId = url.searchParams.get('session');
  const role = url.searchParams.get('role');
  const token = url.searchParams.get('token') || '';

  if (!isId(sessionId) || (role !== 'customer' && role !== 'agent')) {
    try { ws.close(1008, 'bad params'); } catch (_) {} return;
  }
  const s = sessions.get(sessionId);
  if (!s || s.status === 'ended') { try { ws.close(1008, 'no session'); } catch (_) {} return; }

  const expected = role === 'customer' ? s.customerToken : s.agentToken;
  if (!expected || !timingSafeEqual(token, expected)) {
    try { ws.close(1008, 'unauthorized'); } catch (_) {} return;
  }

  // Only one socket per role; replace any stale one.
  const prev = s.sockets[role];
  if (prev && prev !== ws) { try { prev.close(1000, 'replaced'); } catch (_) {} }
  s.sockets[role] = ws;
  ws._role = role;
  ws._rate = [];

  addAudit(s, role === 'customer' ? 'customer_connected' : 'agent_connected', role);
  touch(s);
  broadcast(s);

  ws.on('message', (data) => {
    const text = data.toString();
    if (text.length > WS_MAX_MSG_BYTES) return;

    // Per-socket sliding-window rate limit (ICE can burst).
    const t = now();
    ws._rate = ws._rate.filter(x => t - x < WS_RATE_WIN_MS);
    if (ws._rate.length >= WS_RATE_PER_WIN) return;
    ws._rate.push(t);

    let msg;
    try { msg = JSON.parse(text); } catch (_) { return; }
    if (!msg || typeof msg.type !== 'string') return;

    touch(s);
    routeMessage(s, role, msg);
  });

  ws.on('close', () => {
    if (s.sockets[role] === ws) s.sockets[role] = null;
    addAudit(s, role === 'customer' ? 'customer_disconnected' : 'agent_disconnected', role);
    // If the customer leaves, the session is over — no unattended access.
    if (role === 'customer' && s.status !== 'ended') {
      endSession(s.id, 'customer_disconnected', 'system');
    } else {
      broadcast(s);
    }
  });
}

function routeMessage(s, role, msg) {
  switch (msg.type) {
    // ---- Customer-only control actions ----
    case 'approve_join':   if (role === 'customer') approveJoin(s); break;
    case 'deny_join':      if (role === 'customer') denyJoin(s); break;
    case 'share':          if (role === 'customer') setShare(s, !!msg.on); break;
    case 'approve_control':if (role === 'customer') approveControl(s); break;
    case 'revoke_control': revokeControl(s, role); break;   // either side may revoke
    case 'end':            endSession(s.id, 'closed_by_' + role, role); break;

    // ---- Agent-initiated requests (notify the customer, never auto-grant) ----
    case 'request_control':
      if (role === 'agent' && s.approvals.agentJoin) {
        addAudit(s, 'control_requested', 'agent');
        sendTo(s, 'customer', { type: 'control_request', agentId: s.agentId });
      }
      break;
    case 'request_share':
      if (role === 'agent' && s.approvals.agentJoin) {
        addAudit(s, 'screen_share_requested', 'agent');
        sendTo(s, 'customer', { type: 'share_request', agentId: s.agentId });
      }
      break;

    // ---- WebRTC signaling relay (gated on the join approval) ----
    case 'signal':
      if (!s.approvals.agentJoin) return;            // nothing flows before approval
      sendTo(s, role === 'customer' ? 'agent' : 'customer', { type: 'signal', data: msg.data });
      break;

    // ---- Text chat relay (only after approval; content is NOT stored) ----
    case 'chat':
      if (!s.approvals.agentJoin) return;
      if (typeof msg.text !== 'string' || !msg.text.length) return;
      sendTo(s, role === 'customer' ? 'agent' : 'customer', {
        type: 'chat', from: role, text: msg.text.slice(0, 4000), at: Date.now()
      });
      break;

    // ---- Remote-control input: agent -> customer, ONLY while approved ----
    case 'control':
      if (role !== 'agent') return;
      if (!s.approvals.remoteControl) return;        // hard server-side gate
      sendTo(s, 'customer', { type: 'control', data: msg.data });
      break;

    // ---- Desktop helper presence (customer side). Audited + shown to agent so
    //      the agent knows real OS control is actually possible. ----
    case 'helper':
      if (role !== 'customer') return;
      addAudit(s, msg.on ? 'desktop_helper_connected' : 'desktop_helper_disconnected', 'customer');
      sendTo(s, 'agent', { type: 'helper', on: !!msg.on });
      break;

    default:
      break;
  }
}

module.exports = {
  registerRoutes,
  handleConnection,
  // Exposed for tests / introspection.
  _internal: { sessions, createSession, join, endSession, approveJoin }
};



