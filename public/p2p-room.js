/* Shared 1-to-1 WebRTC DataChannel room helper for Quick Drop and Photo Drop.
 * Uses the existing /ws/p2p signaling relay (max 2 peers per room). The server
 * only forwards SDP/ICE; all payload data flows browser-to-browser over a
 * DTLS-encrypted DataChannel.
 */
(function () {
  'use strict';

  const ICE_SERVERS = window.UT_ICE_SERVERS || [{ urls: 'stun:stun.l.google.com:19302' }];
  // No 0/O/1/I/L so codes are easy to read aloud and type on a phone.
  const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

  function genCode(len) {
    const a = new Uint8Array(len || 8);
    crypto.getRandomValues(a);
    return [...a].map(b => ALPHABET[b % ALPHABET.length]).join('');
  }

  function normalizeCode(input) {
    let v = String(input || '').trim();
    const m = v.match(/#([A-Za-z0-9_-]{4,64})/);
    if (m) v = m[1];
    v = v.replace(/[\s-]/g, '').toUpperCase();
    return /^[A-Z0-9]{4,32}$/.test(v) ? v : null;
  }

  function renderQr(box, text, size) {
    if (!box) return false;
    box.innerHTML = '';
    if (typeof QRCode === 'undefined') return false;
    try {
      new QRCode(box, {
        text, width: size || 180, height: size || 180,
        colorDark: '#000000', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.M
      });
      return true;
    } catch (e) { console.warn('QR render failed', e); return false; }
  }

  /**
   * connect({ room, onStatus(kind, msg), onOpen(channel), onClose(), onMessage(data), onPeerJoined(), onPeerLeft(), onFull() })
   * kind is one of 'live' | 'ok' | 'err'.
   */
  function connect(opts) {
    const o = Object.assign({
      onStatus() {}, onOpen() {}, onClose() {}, onMessage() {}, onPeerJoined() {}, onPeerLeft() {}, onFull() {}
    }, opts);
    let ws = null, pc = null, dc = null, closed = false;
    let isInitiator = false, polite = true, makingOffer = false, ignoreOffer = false;

    function signal(obj) { if (ws && ws.readyState === 1) ws.send(JSON.stringify(obj)); }

    function createPeerConnection() {
      if (pc) return;
      pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      pc.onicecandidate = ev => { if (ev.candidate) signal({ candidate: ev.candidate }); };
      pc.onnegotiationneeded = makeOffer;
      pc.ondatachannel = ev => attach(ev.channel);
      pc.onconnectionstatechange = () => {
        if (!pc) return;
        const st = pc.connectionState;
        if (st === 'failed') o.onStatus('err', 'Connection failed — a strict firewall may be blocking direct connections. Try another network (e.g. mobile data).');
        else if (st === 'disconnected') o.onStatus('err', 'Connection interrupted — trying to recover…');
      };
      if (isInitiator) attach(pc.createDataChannel('drop', { ordered: true }));
    }

    async function makeOffer() {
      if (!pc) return;
      try {
        makingOffer = true;
        await pc.setLocalDescription();
        signal({ sdp: pc.localDescription });
      } catch (e) { console.warn(e); }
      finally { makingOffer = false; }
    }

    function attach(channel) {
      dc = channel;
      dc.binaryType = 'arraybuffer';
      dc.onopen = () => { o.onStatus('ok', '🟢 Connected directly and encrypted.'); o.onOpen(dc); };
      dc.onclose = () => { if (!closed) o.onClose(); };
      dc.onmessage = ev => o.onMessage(ev.data);
    }

    function dropPeer() {
      try { dc && dc.close(); } catch (_) {}
      try { pc && pc.close(); } catch (_) {}
      dc = null; pc = null;
      // Whoever stays waits for the next device, which joins as the initiator.
      isInitiator = false; polite = true;
    }

    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    ws = new WebSocket(`${proto}://${location.host}/ws/p2p?room=${encodeURIComponent(o.room)}`);
    ws.onerror = () => o.onStatus('err', 'Could not reach the signaling server. Check your connection and reload.');
    ws.onclose = () => { if (!closed && !dc) o.onStatus('err', 'Signaling connection closed. Reload to try again.'); };
    ws.onmessage = async ev => {
      let msg; try { msg = JSON.parse(ev.data); } catch (_) { return; }
      if (msg.type === 'full') { o.onStatus('err', 'This room already has two devices. Create a new one.'); o.onFull(); api.close(); return; }
      if (msg.type === 'init') {
        isInitiator = !!msg.initiator; polite = !isInitiator;
        createPeerConnection();
        if (isInitiator) { o.onStatus('live', 'Joined — connecting directly to the other device…'); await makeOffer(); }
        else o.onStatus('live', 'Waiting for the other device to join…');
        return;
      }
      if (msg.type === 'peer-joined') { o.onStatus('live', 'Device joined — establishing encrypted connection…'); o.onPeerJoined(); return; }
      if (msg.type === 'peer-left') { dropPeer(); o.onStatus('err', 'The other device left. Waiting for a device to (re)join…'); o.onPeerLeft(); return; }
      if (!pc) createPeerConnection();
      try {
        if (msg.sdp) {
          const collision = msg.sdp.type === 'offer' && (makingOffer || pc.signalingState !== 'stable');
          ignoreOffer = !polite && collision;
          if (ignoreOffer) return;
          await pc.setRemoteDescription(msg.sdp);
          if (msg.sdp.type === 'offer') { await pc.setLocalDescription(); signal({ sdp: pc.localDescription }); }
        } else if (msg.candidate) {
          try { await pc.addIceCandidate(msg.candidate); } catch (e) { if (!ignoreOffer) throw e; }
        }
      } catch (e) { console.warn('signaling error', e); }
    };

    const api = {
      get channel() { return dc; },
      get isOpen() { return !!dc && dc.readyState === 'open'; },
      send(data) { if (!api.isOpen) return false; dc.send(data); return true; },
      close() {
        closed = true;
        try { dc && dc.close(); } catch (_) {}
        try { pc && pc.close(); } catch (_) {}
        try { ws && ws.close(); } catch (_) {}
        dc = null; pc = null; ws = null;
      }
    };
    return api;
  }

  window.P2PRoom = { genCode, normalizeCode, renderQr, connect };
})();
