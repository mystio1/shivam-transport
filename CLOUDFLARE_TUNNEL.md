# Making the server reachable from anywhere (Cloudflare Tunnel)

By default, `npm run start` only works for phones on the **same WiFi** as the admin's PC. If
drivers need to submit trips while out on the road (on mobile data, a different WiFi, etc.),
you need a permanent internet address for your PC. A **Cloudflare Tunnel** gives you that for
free, without opening any ports on your router, and it works even if your internet connection
is behind CGNAT (very common with Indian ISPs/mobile hotspots, and the reason plain port
forwarding often doesn't work).

There are two ways to do this:

- **Quick test (5 minutes, no domain needed)** — gives you a random address that changes every
  time you restart it. Good for trying things out today.
- **Permanent setup (needs a domain, ~15 minutes one-time)** — gives you a fixed address like
  `https://api.yourbusiness.com` that never changes. This is what you actually want once you're
  really using the app with drivers.

## 1. Quick test (no domain required)

1. Download `cloudflared` for Windows: https://github.com/cloudflare/cloudflared/releases
   (grab `cloudflared-windows-amd64.exe`, rename it to `cloudflared.exe` for convenience).
2. Start your app server first, in one terminal:
   ```
   npm run start
   ```
3. In a **second** terminal, run:
   ```
   cloudflared tunnel --url http://localhost:4000
   ```
4. It prints a line like `https://random-words-1234.trycloudflare.com` — that's your server's
   internet address, right now. Paste it into the app's "Server Address" field (on the
   login/join screen, under "Advanced") to test from a phone on mobile data.
5. This URL stops working as soon as you close that terminal window, and you'll get a
   **different** URL next time. Fine for testing, not fine for real drivers to rely on daily —
   set up the permanent version below once you're ready.

## 2. Permanent setup (fixed address, needs a domain)

You need a domain name pointed at Cloudflare (free Cloudflare account, the domain itself costs
around ₹700–900/year from any registrar — Namecheap, GoDaddy, Cloudflare Registrar, etc.). If
you already have a domain for your business, you can just use a subdomain like
`api.yourbusiness.com` — you don't need a new domain.

1. Create a free account at https://dash.cloudflare.com and add your domain (Cloudflare will
   give you two nameservers to set at your domain registrar — takes a few minutes to a few
   hours to activate).
2. Install `cloudflared` (same download link as above), then log it in:
   ```
   cloudflared tunnel login
   ```
   This opens a browser — pick your domain and approve.
3. Create a named tunnel (only once):
   ```
   cloudflared tunnel create shivam-transport
   ```
   This prints a Tunnel ID and saves a credentials file — remember the ID.
4. Create a config file at `C:\Users\<you>\.cloudflared\config.yml`:
   ```yaml
   tunnel: <the Tunnel ID from the previous step>
   credentials-file: C:\Users\<you>\.cloudflared\<tunnel-id>.json
   ingress:
     - hostname: api.yourbusiness.com
       service: http://localhost:4000
     - service: http_status:404
   ```
5. Point the DNS record at your tunnel (only once):
   ```
   cloudflared tunnel route dns shivam-transport api.yourbusiness.com
   ```
6. Run it:
   ```
   cloudflared tunnel run shivam-transport
   ```
   `https://api.yourbusiness.com` now reaches your PC's server — permanently, as long as this
   is running.
7. **Make it survive reboots** — install it as a Windows service so you don't have to remember
   to start it:
   ```
   cloudflared service install
   ```
   Now it starts automatically with Windows, alongside your `npm run start` server (you can add
   that to Windows startup too, or use `start-server.ps1`).

## 3. Tell the app about it

Once you have a fixed address:

1. Log in as admin → **Bill Branding & Settings** → "Driver Connection" → paste it into
   **Server Address** → "Use This Address". This updates it on your own device and also saves
   it to "Public Server Address" so it shows up in the Join QR code / info for new drivers.
2. Share the QR code / join info shown on that page with each driver (WhatsApp, or let them
   scan it). They enter it once under "Advanced: Server Address" on their own login screen —
   after that it's remembered on their phone, and the app works the same as any other app,
   from anywhere with internet.

## Troubleshooting

- **"This site can't be reached" from a driver's phone** — check that `cloudflared` is still
  running on the office PC, and that `npm run start` (the actual app server) is also running.
  The tunnel only forwards traffic to a server that must already be running on port 4000.
- **Works on WiFi but not mobile data** — you're probably still using the plain LAN address
  (`http://192.168.x.x:4000`) instead of the tunnel's `https://` address. Double-check the
  Server Address field on the phone.
- **DNS not resolving yet** — after adding your domain to Cloudflare, nameserver changes can
  take a few hours to propagate worldwide. Use the quick-test method in the meantime.
