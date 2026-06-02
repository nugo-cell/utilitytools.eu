# Remote Support — Developer-Ready Plan & Implementation

Feature: **Remote Support** inside UtilityTools.eu
Status: **Phase 1 MVP implemented** (browser-only screen share + mic + chat + consent + audit). Phases 2–3 specified below.

A simple, strictly-temporary, consent-first remote support feature (a much simpler TeamViewer). **No unattended access. No permanent access. No background access.** The customer is always in control.

---

## 1. Product Requirements Document (PRD)

### 1.1 Problem
Support staff need to see a customer's screen (and sometimes control it) to help them — but customers must never be exposed to silent/unattended remote access. We need a session that exists *only* because the customer started it, that the customer can watch and kill at any moment, and that leaves no standing access behind.

### 1.2 Goals
- Customer-initiated, time-boxed support sessions.
- One-time, short-lived, single-use session codes.
- Explicit, layered consent: join → view (screen share) → control.
- Always-visible "support connected" banner + a stronger warning while control is active.
- A big **Stop support** button that revokes everything instantly.
- A complete audit trail of who joined, when, and what was approved.

### 1.3 Non-Goals (hard constraints)
- ❌ No unattended access. ❌ No saved/permanent credentials. ❌ No silent reconnect.
- ❌ No background process that can be triggered without a fresh customer action.
- ❌ No storing remote-control permissions after a session ends.

### 1.4 Personas
- **Customer** — non-technical; needs the simplest possible flow and obvious "off" switch.
- **Support agent** — authenticated internal user; joins only with a code the customer reads out.

### 1.5 User stories (acceptance criteria)
| # | Story | Acceptance |
|---|-------|-----------|
| 1 | Customer starts a session | Customer sets a **session password**; a code is generated; nothing is shared yet |
| 2 | One-time code | Code is random, expires (~5 min), single-use (burned on successful join) |
| 3 | Joiner joins with code + password | Joiner must provide **both** the code **and** the customer-set password |
| 4 | Customer approves join | No signaling/chat/media reaches the joiner before approval |
| 5 | Screen share | Customer chooses to share; can stop anytime |
| 6 | Control needs separate approval | A distinct, stronger confirmation; never automatic |
| 7 | Control only while active | Server drops control messages unless approval is live |
| 8 | Revoke instantly | One click flips control off server-side |
| 9 | Text chat | Available after approval |
| 10 | Mic/camera | WebRTC audio (MVP: mic) / video (Phase 3) |
| 11 | Audit log | start, join, share, control grant/revoke, end are recorded |
| 12 | Auto-end | Customer close, inactivity (~15 min), or hard cap (2 h) ends it |

### 1.6 Success metrics
Time-to-connect, % sessions where control was requested vs granted, average session duration, 0 incidents of access persisting after end (verified by audit + automated tests).

---

## 2. Recommended Architecture

```
                 ┌──────────────────────────────────────────────────────┐
                 │                  UtilityTools server                 │
   Customer      │  Express (REST)        ws (WebSocket signaling)      │     Agent
   browser  ◄────┤  /api/support/*        /ws/support?session&role&token├────►  browser
   (tool)        │  support/remote-support.js  (in-memory session store)│   (/support-agent)
                 │   • codes, expiry, single-use                        │
                 │   • agent auth (shared secret → per-session token)   │
                 │   • approval gates (join / share / control)          │
                 │   • audit log + timeouts                             │
                 └──────────────────────────────────────────────────────┘
                                        ▲
                  WebRTC media (DTLS-SRTP) flows DIRECTLY browser↔browser
                  ── screen / mic / (camera) never traverse the server ──
```

- **Signaling server**: the existing `ws` setup, extended with an authenticated, **session-scoped** `/ws/support` channel (sits next to `/ws/p2p` and `/ws/chat` in the single upgrade router).
- **Secure backend**: `support/remote-support.js` owns codes, agent auth, permissions, audit logs, and timeouts. In-memory for MVP, isolated behind a small API so it can move to Redis/Postgres without touching transport/UI.
- **Media**: WebRTC. Screen, mic, and camera are peer-to-peer and encrypted (DTLS-SRTP); the server only relays SDP/ICE and control/chat envelopes.
- **Native helper (Phase 2)**: a small desktop agent is required for true OS-level mouse/keyboard control. Browser-only mode supports screen/audio/video/chat but **cannot** reliably control the desktop, so control input is gated and consumed by the helper.

### 2.1 Why this shape
Reuses the app's proven `Express + ws + WebRTC` pattern (`p2p-call`, `temp-chat`), keeps the trust boundary on the server (codes/auth/permissions/audit) while keeping media off the server (privacy + cost), and makes every dangerous capability an explicit, revocable, server-enforced gate.

---

## 3. Database / Session Model

MVP uses an in-memory `Map`. The shape below maps 1:1 to a future `support_sessions` table + `support_audit` table.

```js
session = {
  id,                 // opaque random id (URL/WS safe)
  code,               // "XXXX-XXXX", single-use, unambiguous alphabet
  codeClaimed,        // bool — true after an agent claims it (burned)
  status,             // 'waiting' | 'agent_pending' | 'active' | 'ended'
  createdAt, codeExpiresAt, absoluteEndsAt, lastActivityAt,
  customerToken,      // bearer secret for the customer (WS + REST)
  agentToken,         // bearer secret issued ONLY on successful join (null before)
  agentId,            // which joiner joined
  secretSalt,         // random salt for the session password
  secretHash,         // scrypt(password, salt) — password is NEVER stored in clear
  joinAttempts,       // wrong-password counter; code is locked after 5
  approvals: { agentJoin, screenShare, remoteControl },   // all default false
  audit: [ { at, event, by, meta } ],                     // ring buffer (≤500)
  endedReason,
  sockets: { customer, agent },     // runtime only
  timers:  { code, inactivity, absolute }
}
```

### 3.1 Relational sketch (Phase 2+)
```
support_sessions(id PK, code, code_claimed, status, agent_id,
                 created_at, code_expires_at, ends_at, last_activity_at,
                 customer_token_hash, agent_token_hash, ended_reason)
support_audit(id PK, session_id FK, at, event, actor, meta_json)
agents(id PK, email, password_hash, role, disabled)   -- replaces shared secret
```
Store **hashes** of tokens, never the raw values. Audit rows are append-only and retained per your data-retention policy; they contain metadata only (never screen pixels, never chat content).

---

## 4. API Endpoints

All JSON. Auth via `Authorization: Bearer <token>`.

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/api/support/session` | none (customer action) | Create session with `{ secret }` (the session password) → `{ sessionId, code, customerToken, codeExpiresAt, endsAt }` (password is never echoed) |
| GET  | `/api/support/session/:id` | customer | Poll public state (WS is primary) |
| GET  | `/api/support/session/:id/audit` | customer **or** agent | Fetch audit log + state |
| POST | `/api/support/session/:id/end` | customer **or** agent | End session, revoke everything |
| POST | `/api/support/join` | code + password | Verify `{ code, secret }`, burn code, reserve session → `{ sessionId, agentToken }` |

Join page: `GET /support-agent` (served with `noindex,nofollow`). There is **no** global agent secret and **no** agent-login endpoint — authorisation to join is the per-session password the customer set.

### 4.1 Error contract
`{ ok:false, error:"..." }` with status codes: `400` missing/short password on create, `401` wrong session password (or bad token), `404` unknown code/session, `409` code already used, `410` code/session expired/ended, `429` too many wrong-password attempts (code locked), `503` capacity.

---

## 5. WebSocket / WebRTC Signaling Flow

Channel: `wss://host/ws/support?session=<id>&role=customer|agent&token=<token>`
The server validates `token` matches the role's secret for that session, then relays only what the current approvals allow.

```
Customer                         Server                          Agent
   │ POST /session  ───────────────►│   (customer sets a password)
   │◄── code, customerToken ────────│
   │ WS connect (customer) ────────►│
   │  (reads code + password aloud) │
   │                                │◄──── POST /join (code + password)  [code burned]
   │◄── {join_request} ─────────────│──── {state: agent_pending} ───►│ WS connect (agent)
   │                                │
   │ {approve_join} ───────────────►│──── {join_approved} ──────────►│
   │                                │   (now signaling is allowed)
   │◄────────── {signal sdp/ice}  ──┼──  {signal sdp/ice} ──────────►│   (perfect-negotiation)
   │ ===== WebRTC media P2P (screen/mic), DTLS-SRTP, NOT via server =====
   │                                │
   │ {share:true}  ────────────────►│──── {state: screenShare=on} ──►│   agent sees screen
   │                                │◄──── {request_control} ────────│
   │◄── {control_request} ──────────│
   │ {approve_control} ────────────►│──── {control_approved} ───────►│
   │   ◄══ {control} events (agent→customer) ONLY while approval live ══│
   │ {revoke_control} ─────────────►│──── {control_revoked} ────────►│   (server now drops control)
   │ {end} ────────────────────────►│──── {ended} ──────────────────►│   sockets closed, code gone
```

### 5.1 Server-enforced gates (not just UI)
- `signal` is dropped unless `approvals.agentJoin === true`.
- `chat` is dropped unless `approvals.agentJoin === true`.
- `control` is dropped unless `role === 'agent'` **and** `approvals.remoteControl === true`.
- Customer WS close → session ends immediately (`customer_disconnected`). No silent reconnect: a new session + new code is required.

---

## 6. Customer UI Flow (`/remote-support`)

1. **Start panel** — set a **session password**, then *Start support session* (or *Join a session*).
2. **Code panel** — large one-time code **and the password to share**; "expires in ~5 min, single use".
3. **Join prompt** — *An agent entered your code and wants to join.* → Approve / Deny.
4. **Live actions** (after approval) — *Share my screen*, *Turn on microphone*.
5. **Control prompt** — separate, red, stronger confirmation; default answer is *No, keep view-only*.
6. **Persistent banner** — sticky, always visible while connected; turns red ("REMOTE CONTROL IS ACTIVE") during control; contains its own Stop button.
7. **Revoke control** — one click, instant.
8. **Chat** + **Session activity** (audit) visible to the customer.
9. **Stop support & end session** — big red button; also fires on tab close.

---

## 7. Joiner UI Flow (`/support-agent`, noindex)

1. **Join** by entering the customer's one-time **code + the password** the customer set (no global secret, no separate sign-in). Sent here from the Remote Support tool, the code arrives pre-filled.
2. **Live**: badges for Join/Screen/Control status, the customer's screen video, **Ask customer to share**, **Request remote control**, **End session**, chat, and a live audit panel.
3. A persistent **control warning** appears while control is active ("every action is logged, customer can revoke instantly").

---

## 8. Permission & Security Model

| Capability | Who grants | Default | Enforcement | Revoke |
|------------|-----------|---------|-------------|--------|
| Join the session | Customer (sets password) + Customer (approves) | denied | Joiner needs code **and** password; then no signaling/chat/media is relayed until the customer approves | Deny → joiner socket closed |
| Screen share | Customer | off | Customer's own `getDisplayMedia`; server tracks/audits | Stop sharing (track removed) |
| Remote control | Customer (separate) | off | Server drops `control` unless flag live | Revoke → server stops relaying instantly |

- **Joiner authorisation**: the **customer who creates the session sets a password**. To join, the other person must supply the one-time code **and** that password. There is no global/shared agent secret and no separate agent login. (Phase 3 can layer real agent accounts on top for staffed support desks.)
- **Password storage**: never stored in clear — a per-session random salt + `scrypt` hash, compared with `crypto.timingSafeEqual`. The password is checked **before** the code is burned, and the code is **locked after 5 wrong attempts** to stop brute force.
- **Codes**: `crypto.randomBytes`, unambiguous alphabet, single-use (burned only on a fully-correct join), short TTL.
- **Tokens**: per-session bearer secrets; compared with `crypto.timingSafeEqual`. Store hashes in a DB-backed version.
- **Scoping**: every control/signal/chat message is checked against the *active* session's approvals; nothing is global.
- **Visibility**: persistent banner + stronger control warning + customer-visible audit.
- **No persistence**: approvals live only in memory and are cleared on end; a 60s tombstone returns a clean "ended" then the session is deleted.
- **Timeouts**: code TTL 5 min, inactivity 15 min, absolute cap 2 h (all tunable).
- **Abuse limits**: global session cap, per-socket sliding-window rate limit, 64 KB max WS message.

### 8.1 Threat model highlights
- *Code guessing* → high-entropy + short TTL + single-use + (recommended) claim rate-limit per IP.
- *Agent connecting without consent* → impossible; `agentJoin` gate blocks all relay.
- *Control after revoke* → impossible; server is the gate, not the client.
- *Server reading media* → impossible; media is P2P DTLS-SRTP, server only relays SDP/ICE.
- *Standing access* → impossible; nothing is stored, customer disconnect ends the session.

---

## 9. MVP Implementation Plan

### Phase 1 — ✅ Implemented in this change
- Temporary single-use code + **customer-set session password** + expiry (`support/remote-support.js`).
- Join with **code + password** (scrypt-hashed, brute-force locked).
- Customer approval gate for join.
- WebRTC **screen sharing** + **microphone** (customer offerer, agent recvonly).
- **Text chat** (relayed, content never stored).
- **Audit log** (start/join/share/control/end) visible to both parties.
- Persistent banner, control warning, big Stop button, auto-end on disconnect/inactivity/cap.

**Files**
- `support/remote-support.js` — session store, REST routes, WS handler.
- `server.js` — registers routes, `/ws/support` upgrade, `remote-support` tool, `/support-agent` route.
- `public/tools/remote-support.html` — customer UI (Start + Join).
- `public/support-agent.html` — join screen (code + password).

**Config**
- None required. There is no shared agent secret — each session's password is set by its creator. (`SUPPORT_AGENT_TOKEN` is no longer used.)

**Try it locally (two tabs)**
```powershell
npm start
# Tab A — http://localhost:3000/remote-support → set a password → Start → note the code + password
# Tab B — http://localhost:3000/remote-support → Join a session → enter the code → Continue
#          (or open http://localhost:3000/support-agent directly) → enter code + password → Join
# Back in Tab A → Approve the join → Share my screen.
```

### Phase 2 — Native helper for true control
- Small signed desktop helper (Tauri/Electron/Go) that connects to the same session with the agent token and injects mouse/keyboard **only** while `remoteControl` is approved.
- Separate customer password/confirmation for control (already modelled); instant revoke (already wired).
- Optional safe file transfer over a WebRTC DataChannel (size/type limits, customer-approved).

### Phase 3 — Polish & scale
- Real agent accounts (DB), JWT + MFA, role-based access, multi-agent sessions.
- Camera support, optional session recording (with explicit consent + retention policy).
- Branding, support history, and a TURN server for strict-NAT reliability.

---

## 10. Future Roadmap

| Area | Next |
|------|------|
| Identity | Per-agent accounts, MFA, SSO, audit export |
| Reliability | TURN servers, reconnection-with-fresh-consent, health metrics |
| Control | Native helper, clipboard, multi-monitor, file transfer |
| Compliance | Configurable retention, GDPR data-subject tooling, signed audit logs |
| Scale | Redis/Postgres session store, horizontal signaling, queueing |
| UX | Co-browse mode, annotations on screen, recorded session playback |

---

## Appendix A — Message reference (`/ws/support`)

**Server → client**
`state`, `join_request`, `join_approved`, `join_denied`, `share_request`, `control_request`,
`control_approved`, `control_revoked`, `signal`, `chat`, `control`, `ended`.

**Client → server**
- Customer: `approve_join`, `deny_join`, `share{on}`, `approve_control`, `revoke_control`, `signal`, `chat`, `end`.
- Agent: `request_share`, `request_control`, `revoke_control`, `signal`, `chat`, `control`, `end`.

## Appendix B — Audit events
`session_started`, `code_generated`, `code_expired`, `join_password_failed`, `code_locked`,
`agent_claimed_code`, `agent_join_approved`, `agent_join_denied`, `customer_connected`,
`agent_connected`, `customer_disconnected`, `agent_disconnected`, `screen_share_requested`,
`screen_share_started`, `screen_share_stopped`, `control_requested`,
`control_approved`, `control_revoked`, `session_ended`.

