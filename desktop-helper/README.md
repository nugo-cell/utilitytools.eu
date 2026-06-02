# Remote Support — Desktop Helper

This small program lets a **support agent actually move your mouse and type** during a
Remote Support session. Browser tabs cannot inject real operating-system input, so this
helper does it — but only with your explicit, revocable consent.

It runs on **your** computer (the person receiving support) and only ever listens on
`127.0.0.1` (localhost). It is not reachable from the internet.

## When you need it

- **Screen sharing, voice, chat** → no helper needed (the browser handles those).
- **The agent controlling your mouse/keyboard** → you need this helper running and paired.

---

## For customers — the easy way (no install, no Node, no npm)

1. On the Remote Support page, open **Desktop control (mouse & keyboard)** and click
   **Download RemoteSupportHelper.exe**.
2. **Double-click** the downloaded `RemoteSupportHelper.exe`. A small window opens showing
   a **6-digit pairing code** — nothing gets installed.
3. Back in the browser, click **Connect helper**, type the **pairing code**, then
   **Allow control** when you're ready.

That's it. To stop at any time: close the helper window, press **Ctrl+C**, or type `q`
then Enter. Windows might show a SmartScreen prompt the first time — choose
**More info → Run anyway**.

---

## For developers — building the customer `.exe`

The `.exe` is a self-contained binary (Node runtime bundled in). Customers never need
Node or `npm`. To produce it:

```powershell
cd desktop-helper
npm install        # one-time, for the build tool only
npm run build      # -> dist/RemoteSupportHelper.exe
```

The web server serves the built file at `/downloads/RemoteSupportHelper.exe`
(if it hasn't been built yet, that URL returns a short "build it first" message).

Run from source instead (for development):

```powershell
npm start
```

The helper is **pure JavaScript** — input is injected through Windows' built-in
PowerShell + `user32.dll` (no native modules, no compiler), which is why it packages
into a single `.exe` cleanly.

## Stopping (any one of these stops all input instantly)

- Click **Revoke remote control** or **Stop support** in the browser.
- Close the helper window, press **Ctrl+C**, or type `q` then Enter.
- Do nothing for 30 seconds — the control gate auto-closes (`idle timeout`).

## Safety summary

| Layer | Guarantee |
|-------|-----------|
| Network | Listens on `127.0.0.1` only; rejects non-loopback peers |
| Pairing | Browser must send the one-time 6-digit code |
| Gate | Injects only while the browser reports control is approved |
| Server | The server only relays control while your approval is active |
| Idle | Auto-disables after 30 s of no input |
| Panic | Ctrl+C / `q` / closing the window kills injection |

## Platform support

- **Windows** — implemented (`inject-win.js`, driving Win32 `user32.dll` through a
  bundled PowerShell bridge — no native modules).
- **macOS / Linux** — the helper pairs but reports input injection is not implemented
  yet. Add `inject-mac.js` / `inject-linux.js` exporting the same interface
  (`moveNorm`, `button`, `wheel`, `keyEvent`, `screenSize`) to enable them.

## Control protocol (browser → helper, over localhost)

```jsonc
{ "type": "pair",    "code": "482910" }
{ "type": "gate",    "on": true }                       // mirrors approval
{ "type": "control", "data": { "kind": "move",  "x": 0.5, "y": 0.5 } }
{ "type": "control", "data": { "kind": "down",  "button": "left", "x": 0.5, "y": 0.5 } }
{ "type": "control", "data": { "kind": "up",    "button": "left" } }
{ "type": "control", "data": { "kind": "wheel", "dy": 120 } }
{ "type": "control", "data": { "kind": "key",   "action": "down", "code": "KeyA" } }
{ "type": "end" }
```

Coordinates are normalized `0..1` relative to the shared screen and mapped to pixels
using the primary display size.

