# Chrome: let the POS reach the Printer Agent (one-time per till)

## Why

Chrome 141+ has a security rule called **Local Network Access**. A web page may not talk to programs on the PC
(here `PrinterAgent.exe` on `ws://localhost:9191`) unless the site is allowed. Without it the POS shows
**"Printer Agent not reachable"** and nothing prints (console: `ERR_BLOCKED_BY_LOCAL_NETWORK_ACCESS_CHECKS`).
A POS opened from an internet address (public IP) is always blocked; a local address asks once.

The fix below allows the POS server addresses for good, with Chrome policies. Newer Chrome (seen on 157)
splits the rule in two, so all three names are set: `LoopbackNetworkAllowedForUrls` (programs on this PC — the
Printer Agent), `LocalNetworkAllowedForUrls` (devices on the network) and the older
`LocalNetworkAccessAllowedForUrls`. It works for **every server** you list, whichever server's IIS hosts the
`dist` files, and survives clearing the browser data. It is set on the **till** (the PC with the printer and
Printer Agent), not on the server.

## Steps on each till

1. Copy this folder to the till.
2. **Either** double-click `allow-pos-printing.reg` → **Yes** (allow changes) → **Yes** (continue) → **OK**. It allows:
   `localhost`, `127.0.0.1`, `192.168.1.48`, `192.168.1.53`, `103.209.220.154` (every port on each).
   **Or**, for other servers, open PowerShell **as Administrator** in this folder and run:
   ```powershell
   Set-ExecutionPolicy -Scope Process Bypass
   .\allow-pos-address.ps1 192.168.1.53 103.209.220.154
   ```
   (give the address the till types in Chrome; `http://` and the port are optional — every port is covered).
3. Close **all** Chrome windows and open Chrome again.
4. Open `chrome://policy` → click **Reload policies** → **LoopbackNetworkAllowedForUrls** (and the other two)
   should be listed with status **OK**.
5. Open the POS → printer settings: no warning, printers listed → **Test Print**.

## Later

- New server: run `.\allow-pos-address.ps1 <its address>` on the tills (as Administrator).
- See what is allowed: `.\allow-pos-address.ps1 -List`
- Remove one: `.\allow-pos-address.ps1 -Remove <address>`

## Notes

- Allowing a server only lets **pages from that server** reach the Printer Agent. Do not add `*` (every website)
  unless the till is used for nothing but the POS.
- The Android app prints over the network without the browser and does not need this.
- Microsoft Edge has the same policy under `HKLM\SOFTWARE\Policies\Microsoft\Edge\LocalNetworkAccessAllowedForUrls`
  (not set by these files).
