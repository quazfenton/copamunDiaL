# CopaMundial Deployment Files

## Files

| File | Purpose |
|------|---------|
| `Dockerfile.copa` | Docker image for CopaMundial (Next.js + Socket.IO) |
| `docker-compose.copa.yml` | Docker Compose for Oracle instance deployment |
| `Caddyfile` | Updated Caddy config with `/copa/*` route |
| `sync-tunnel-url.js` | Node.js sync script (runs locally or on instance) |
| `sync-tunnel-url.sh` | Bash sync script (runs on instance via systemd) |
| `tunnel-sync.service` | Systemd service for sync |
| `tunnel-sync.timer` | Systemd timer (runs every 60s) |
| `worker.js` | Cloudflare Worker for unified proxy |
| `wrangler.toml` | Wrangler config for Worker deployment |
| `config.fish` | Fish shell config with aliases |
| `copa` | CopaMundial management CLI |
| `xstartup` | VNC startup script with CopaMundial auto-start |

## Architecture

```
Frontend (Vercel)
       │
       ▼
Cloudflare Worker (stable URL)
       │
       ▼
Cloudflare Tunnel (trycloudflare.com)
       │
       ▼
Caddy (on Oracle instance)
       │
       ├── /copa/*     → copa-app:3000 (CopaMundial)
       ├── /nocturne/* → nocturne_backend:8000
       ├── /api/*      → backend:3001 (bing)
       └── /*          → ninerouter:3000
```

## Setup

### 1. Deploy Cloudflare Worker

```bash
cd deploy
wrangler deploy
```

### 2. Create KV Namespace

```bash
wrangler kv:namespace create tunnel-urls
```

Update `wrangler.toml` with the namespace ID.

### 3. Configure Sync

Create `/opt/tunnel-sync/.env` on the Oracle instance:

```bash
CF_ACCOUNT_ID=your_account_id
CF_API_TOKEN=your_api_token
KV_NAMESPACE_ID=your_kv_namespace_id
```

### 4. Enable Systemd Timer

```bash
sudo cp tunnel-sync.service /etc/systemd/system/
sudo cp tunnel-sync.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now tunnel-sync.timer
```

### 5. Update Vercel Env Vars

Set on Vercel:
```
NEXT_PUBLIC_API_URL=https://copamundial-proxy.your-subdomain.workers.dev/copa
NEXTAUTH_URL=https://copamundial-proxy.your-subdomain.workers.dev/copa
```

## CopaMundial Management

```bash
copa status    # Show container status
copa logs      # Follow logs
copa restart   # Restart container
copa edit      # Edit .env
copa health    # Health checks
copa shell     # Exec into container
copa rebuild   # Rebuild and restart
```
