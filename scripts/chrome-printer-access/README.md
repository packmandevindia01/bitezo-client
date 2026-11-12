# Chrome: let the POS reach the Printer Agent (one-time per till)

## Why

Chrome's security rule **Local Network Access** blocks a web page from talking to programs on the PC (here
`PrinterAgent.exe` on `ws://localhost:9191`). Without the fix the POS shows **"Printer Agent not reachable"** and
nothing prints (console: `ERR_BLOCKED_BY_LOCAL_NETWORK_ACCESS_CHECKS`). It is a Chrome rule, not an app error.
It is set on the **till** (the PC with the printer and Printer Agent), never on the server.

## Steps on each till (2 minutes)

1. Copy this folder to the till. `PrinterAgent.exe` must be installed and running.
2. Double-click **`allow-pos-printing.reg`** → **Yes** (allow changes) → **Yes** (continue) → **OK**.
3. In Chrome, type **`chrome://restart`** and press Enter (a full restart is needed).
4. Open the POS → More → Printer Settings → printers listed, no yellow warning → **Save** → **Test Print**.

Check if needed: `chrome://policy` → **Reload policies** → every line below shows **OK**.

## What the file sets (proven on Chrome 157, 2026-11-12)

| Chrome setting | Value | Why |
| --- | --- | --- |
| `LocalNetworkAccessRestrictionsTemporaryOptOut` | on | Turns the check off on this till. Chrome may drop this option in a later version; the lines below keep working then |
| `OverrideSecurityRestrictionsOnInsecureOrigin` | the exact POS page addresses | Chrome only applies the allow-lists to secure pages; this treats our `http://` POS pages as secure |
| `LoopbackNetworkAllowedForUrls` | POS servers | Allowed to reach programs on this PC (the Printer Agent) |
| `LocalNetworkAllowedForUrls` | POS servers | Allowed to reach the local network |
| `LocalNetworkAccessAllowedForUrls` | POS servers | The older combined name |

Servers in the file: `http://103.209.220.154:8056`, `http://192.168.1.53:8056`, `http://192.168.1.48:8090`
(and those IPs on any port, plus `localhost`).

## A server that is not in the file

In PowerShell **as Administrator**, in this folder, give the **full address the till types in Chrome**:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\allow-pos-address.ps1 http://192.168.1.60:8056
```

Then `chrome://restart`. See what is allowed: `.\allow-pos-address.ps1 -List`. Remove a server:
`.\allow-pos-address.ps1 -Remove 192.168.1.60`.

## Notes

- These settings only let **pages from our POS servers** reach the Printer Agent (except the temporary opt-out,
  which is till-wide). Use it on tills that are used for the POS.
- The Android app prints over the network without the browser and does not need this.
- Port 8181 on some tills answers with an old QZ Tray program; that is harmless.
