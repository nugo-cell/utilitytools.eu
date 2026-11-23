// Shared WebRTC ICE config. Starts with public STUN servers and, once
// /api/ice answers, swaps in the server-issued list (incl. short-lived TURN
// credentials) in place, so pages holding a reference see the update.
(function () {
  'use strict';
  const servers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' }
  ];
  window.UT_ICE_SERVERS = servers;
  window.UT_ICE_READY = fetch('/api/ice', { cache: 'no-store' })
    .then(r => (r.ok ? r.json() : null))
    .then(j => {
      if (j && Array.isArray(j.iceServers) && j.iceServers.length) {
        servers.splice(0, servers.length, ...j.iceServers);
      }
      return servers;
    })
    .catch(() => servers);
})();
