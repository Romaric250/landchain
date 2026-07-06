# Deploy LandChain Backend on Contabo (VPS)

This guide walks you from **zero** to a live API at:

**`https://api.lanchain.land`**

It also explains how to reach your server **by IP** (SSH, console, and testing before DNS is ready).

---

## What you are deploying

| Component | Runs where | Public URL |
|-----------|------------|------------|
| **FastAPI backend** | Contabo VPS (Docker) | `https://api.lanchain.land` |
| **MongoDB** | Same VPS (Docker, internal) | **Not public** |
| **Redis** | Same VPS (Docker, internal) | **Not public** |
| **Worker** (cron jobs) | Same VPS (Docker) | **Not public** |
| **Next.js frontend** | Vercel (recommended) | `https://lanchain.land` |

The backend listens on **port 8095** inside Docker. Nginx on the VPS receives HTTPS on port 443 and forwards to that port.

---

## Two different “panels” (important)

People often mix these up:

### 1. Contabo account panel (manage billing & VPS)

- **URL:** [https://my.contabo.com](https://my.contabo.com)
- **Not** your server IP — this is Contabo’s website.
- Use it to:
  - See your **server IPv4 address**
  - Reset root password
  - Open **VNC console** (browser terminal into the machine)
  - Reinstall the OS (destructive — avoid unless necessary)

**Steps:**

1. Log in at [https://my.contabo.com](https://my.contabo.com)
2. Go to **VPS** → click your server
3. Copy **IPv4** (example: `123.45.67.89`) — you need this everywhere below
4. Under **Access data** / **Passwords**: note the **root password** (sent by email at setup)

### 2. Your server itself (access using the server IP)

This is the Linux machine you paid for. You reach it **using the IP**:

| Method | Address | Purpose |
|--------|---------|---------|
| **SSH** (main way) | `ssh root@YOUR_SERVER_IP` | Run commands, deploy app |
| **VNC** | Contabo panel → VPS → **VNC** button | Emergency console if SSH fails |
| **HTTP (after setup)** | `http://YOUR_SERVER_IP` | Test Nginx before DNS works |
| **API (after Docker)** | `http://YOUR_SERVER_IP:8095` | Direct API test (temporary; lock down later) |

There is **no** LandChain web panel on the IP by default. If you installed aaPanel, Cockpit, or similar on the VPS, that panel would be at something like `http://YOUR_IP:7800` — that is separate from this project.

---

## Prerequisites checklist

Before you start, have:

- [ ] Contabo VPS running (Ubuntu 22.04 or 24.04 recommended)
- [ ] Server **IPv4** from Contabo panel
- [ ] **Root password** or SSH key
- [ ] Domain **lanchain.land** (you have this)
- [ ] Git repo access (GitHub/GitLab) or a way to copy files to the server
- [ ] Production secrets ready: Resend, Fapshi, UploadThing, strong JWT secret

---

## Step 1 — DNS (point `api` to your server IP)

Log in wherever **lanchain.land** DNS is managed (Contabo DNS, Cloudflare, Namecheap, etc.).

Add this record:

| Type | Host / Name | Value | TTL |
|------|-------------|-------|-----|
| **A** | `api` | `YOUR_SERVER_IP` | 300 |

Result: **`api.lanchain.land`** → your Contabo VPS.

**Verify from your PC** (wait 5–30 minutes after saving):

```bash
ping api.lanchain.land
# or
nslookup api.lanchain.land
```

The IP shown must match your Contabo IPv4.

> You can still deploy and test using **`http://YOUR_SERVER_IP`** before DNS propagates.

---

## Step 2 — First login to the server (using IP)

From **Git Bash**, **PowerShell**, or **Terminal** on your computer:

```bash
ssh root@YOUR_SERVER_IP
```

Example:

```bash
ssh root@123.45.67.89
```

- First time: type `yes` when asked about fingerprint
- Enter the **root password** from Contabo email or panel

If SSH fails:

1. Contabo panel → your VPS → **VNC** → log in as `root` there
2. Check firewall in Contabo panel allows port **22**
3. Reset root password from Contabo panel if needed

### Create a normal user (recommended)

Still as root:

```bash
adduser deploy
usermod -aG sudo deploy
```

If you use SSH keys, copy them:

```bash
mkdir -p /home/deploy/.ssh
cp /root/.ssh/authorized_keys /home/deploy/.ssh/
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys
```

Log in as deploy from now on:

```bash
ssh deploy@YOUR_SERVER_IP
```

---

## Step 3 — Install Docker, Nginx, firewall

Run on the server (as `deploy`, with `sudo`):

```bash
sudo apt update && sudo apt upgrade -y

# Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
```

**Log out and SSH back in** so Docker permissions apply:

```bash
exit
ssh deploy@YOUR_SERVER_IP
```

Continue:

```bash
sudo apt install -y git nginx certbot python3-certbot-nginx ufw

# Firewall: SSH + web only
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

---

## Step 4 — Put the code on the server

### Option A — Git clone (preferred)

```bash
cd ~
git clone https://github.com/YOUR_USERNAME/landchain.git
cd landchain/backend
```

Replace with your real repository URL.

### Option B — Copy from your PC (if repo is private / local only)

From **your Windows machine** (not the server):

```bash
scp -r C:/Users/Romaric/Desktop/companies/landchain deploy@YOUR_SERVER_IP:~/landchain
```

Then on the server:

```bash
cd ~/landchain/backend
```

---

## Step 5 — Configure production `.env`

On the server:

```bash
cd ~/landchain/backend
cp .env.example .env
nano .env
```

Set at minimum:

```env
ENV=production

FRONTEND_URL=https://lanchain.land
CORS_ORIGINS=https://lanchain.land,https://www.lanchain.land

JWT_SECRET=PASTE_A_LONG_RANDOM_STRING
# Generate one: openssl rand -hex 32

SUPER_ADMIN_EMAIL=admin@lanchain.app
SUPER_ADMIN_PASSWORD=USE_A_STRONG_PASSWORD

RESEND_API_KEY=your_resend_key
EMAIL_FROM=LandChain <noreply@lanchain.land>

FAPSHI_API_USER=...
FAPSHI_API_KEY=...
FAPSHI_WEBHOOK_SECRET=your_webhook_secret

UPLOADTHING_SECRET=...
UPLOADTHING_APP_ID=...
```

**Do not set `MONGO_URI` or `REDIS_URL` in `.env` for Docker deploy.**

`docker-compose.yml` overrides them to use internal Docker hostnames:

- `mongodb://mongo:27017/landchain`
- `redis://redis:6379/0`

Save: `Ctrl+O`, Enter, `Ctrl+X`.

---

## Step 6 — Start the stack with Docker Compose

```bash
cd ~/landchain/backend
docker compose up --build -d
```

Check status:

```bash
docker compose ps
docker compose logs -f backend
```

You should see a line like: `LandChain API started (env=production)`.

### Test using the server IP (before DNS / HTTPS)

On the **server**:

```bash
curl -I http://127.0.0.1:8095
```

From **your PC** — use Nginx on port 80/443 (Step 7), not `:8095` directly. The API is bound to localhost inside the VPS.

```bash
curl -I http://YOUR_SERVER_IP
```

In production you will put Nginx in front and can bind the API to localhost only (see Step 7).

### Useful Docker commands

```bash
docker compose logs -f backend   # API logs
docker compose logs -f worker    # background jobs
docker compose restart backend   # restart API only
docker compose down              # stop everything
docker compose up -d --build     # rebuild after git pull
```

---

## Step 7 — Reverse proxy (choose one)

Your server already runs **Nginx Proxy Manager** (`nginx-proxy-manager` on ports 80/443, admin UI on port **81**). **Use Option A** — do not install a second Nginx on the host.

### Option A — Nginx Proxy Manager (recommended on your server)

1. Open the NPM admin panel in your browser:

   **`http://YOUR_SERVER_IP:81`**

   (Example: `http://164.68.127.137:81`)

2. Log in (default first-time login is often `admin@example.com` / `changeme` — change it if you haven't).

3. **Hosts → Proxy Hosts → Add Proxy Host**

   | Field | Value |
   |-------|--------|
   | Domain names | `api.lanchain.land` |
   | Scheme | `http` |
   | Forward hostname / IP | `164.68.127.137` (your server IP) |
   | Forward port | `8095` |
   | Block common exploits | ✓ on |
   | Websockets support | ✓ on (optional) |

4. **SSL** tab → Request a new SSL certificate → Force SSL → Save.

5. DNS: ensure `api.lanchain.land` A record points to your server IP.

6. Test:

   ```bash
   curl -I https://api.lanchain.land
   ```

> NPM runs inside Docker, so the LandChain API must listen on the **host** at port **8095** (`8095:8095` in compose). Do **not** use `127.0.0.1:8095` only — NPM cannot reach that from its container.

### Option B — Manual Nginx on the host (skip if using NPM)

Nginx listens on port **80/443** on your **server IP** and forwards to the API.

Create config:

```bash
sudo nano /etc/nginx/sites-available/api.lanchain.land
```

Paste:

```nginx
server {
    listen 80;
    server_name api.lanchain.land YOUR_SERVER_IP;

    location / {
        proxy_pass http://127.0.0.1:8095;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Replace `YOUR_SERVER_IP` with your real IP (e.g. `123.45.67.89`).

Enable site:

```bash
sudo ln -sf /etc/nginx/sites-available/api.lanchain.land /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

### Test in browser using IP

Open:

**`http://YOUR_SERVER_IP`**

You should get a response from the API (not an Nginx error page).

After DNS works, the same Nginx config serves **`http://api.lanchain.land`**.

---

## Step 8 — HTTPS (Let’s Encrypt)

Only run this after **`api.lanchain.land`** resolves to your server IP.

```bash
sudo certbot --nginx -d api.lanchain.land
```

Follow prompts (email, agree, redirect HTTP → HTTPS yes).

Test:

```bash
curl -I https://api.lanchain.land
```

Open in browser: **https://api.lanchain.land**

> Swagger `/docs` is **disabled** when `ENV=production` — that is intentional.

---

## Step 9 — Connect the frontend (Vercel)

The frontend does not run on Contabo in this setup. Deploy it on Vercel:

1. Import the `frontend` folder from GitHub on [vercel.com](https://vercel.com)
2. Set environment variables:

```env
NEXT_PUBLIC_SITE_URL=https://lanchain.land
NEXT_PUBLIC_API_BASE_URL=https://api.lanchain.land
UPLOADTHING_TOKEN=your_uploadthing_v7_token
```

3. Add custom domains in Vercel: `lanchain.land`, `www.lanchain.land`
4. Update DNS for `@` and `www` as Vercel instructs

---

## Step 10 — Production hardening (do before going live)

### Bind API to localhost only

Edit `docker-compose.yml` on the server so the API is not exposed on the public IP:

```yaml
ports:
  - "127.0.0.1:8095:8095"
```

Only Nginx should be public on 80/443.

### Do not expose MongoDB / Redis publicly

Remove or change these in `docker-compose.yml`:

```yaml
# Remove public ports — services still talk on Docker internal network
mongo:
  image: mongo:7
  volumes:
    - mongo_data:/data/db
  restart: unless-stopped

redis:
  image: redis:7-alpine
  restart: unless-stopped
```

Then:

```bash
docker compose up -d
```

### Fapshi webhook URL

In Fapshi dashboard, set webhook to:

**`https://api.lanchain.land/payments/webhook`**

Use the same secret as `FAPSHI_WEBHOOK_SECRET` in `.env`.

---

## How Docker networking works (no extra `networks:` block needed)

Docker Compose **automatically** creates a private network for all services in `docker-compose.yml`.

- Service name `mongo` → hostname `mongo`
- Service name `redis` → hostname `redis`
- Service name `backend` → hostname `backend`

That is why `MONGO_URI=mongodb://mongo:27017/landchain` works inside containers without defining `networks:` manually.

You only need a custom network for advanced multi-compose setups — not for this project.

---

## Updating the app after code changes

On the server:

```bash
cd ~/landchain/backend
git pull
docker compose up -d --build
docker compose logs -f backend
```

---

## Troubleshooting

| Problem | What to check |
|---------|----------------|
| `ssh root@IP` refused | Port 22 open in Contabo firewall; use VNC from Contabo panel |
| `docker compose` permission denied | `sudo usermod -aG docker $USER` then log out/in |
| Backend exits on start | `docker compose logs backend` — often Mongo not ready; run `docker compose restart backend` |
| `address already in use` on 6379 or 27017 | Another Redis/Mongo runs on the host. Our compose no longer publishes those ports — `git pull` and `docker compose up -d --build`. Or stop host service: `sudo systemctl stop redis-server` |
| `curl IP:8095` from outside fails | Expected — API is on `127.0.0.1:8095`; use Nginx (`http://YOUR_SERVER_IP`) |
| Certbot fails | DNS must point to this server first; port 80 open |
| Frontend CORS errors | `CORS_ORIGINS` in `.env` must include `https://lanchain.land` |
| Login works locally but not prod | Frontend `NEXT_PUBLIC_API_BASE_URL=https://api.lanchain.land` |

---

## Quick reference

| What | Value |
|------|--------|
| Contabo panel | [https://my.contabo.com](https://my.contabo.com) |
| SSH | `ssh deploy@YOUR_SERVER_IP` |
| API (production) | `https://api.lanchain.land` |
| API test via IP | `http://YOUR_SERVER_IP` (after Nginx) |
| Docker API port (internal) | `8095` |
| Default super admin | `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD` from `.env` |

---

## Local Docker test (on your PC before Contabo)

Same folder, on Windows with Docker Desktop:

```bash
cd backend
cp .env.example .env
docker compose up --build
```

API: **http://localhost:8095**  
Docs (dev only): set `ENV=development` in `.env` → http://localhost:8095/docs
