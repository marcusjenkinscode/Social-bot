# Deployment Instructions

## 1) Prerequisites
- Node.js 18+
- A Linux server, VM, or container with outbound HTTPS access

## 2) Install dependencies
```bash
cd /home/runner/work/Social-bot/Social-bot
npm install
```

## 3) Configure environment variables
Set these before running:

- `PORT` (optional): HTTP port (default `3000`)
- `PLATFORM_URL`: your site URL to promote (example: `https://example.com`)
- `ADMIN_TOKEN`: admin API/UI token (strongly recommended in production)
- `PROMOTION_INTERVAL_MINUTES` (optional): default scheduler interval

For channel automation, configure webhook endpoints in the web admin UI:
- Twitter
- Facebook
- LinkedIn
- Reddit
- Telegram
- Discord

Each enabled channel must have a valid webhook URL to post automatically.

## 4) Start the service
```bash
npm run start
```

The admin interface is served at:
- `http://<host>:<port>/`

## 5) Production process manager (recommended)
Use `systemd`, `pm2`, or container orchestration so the app restarts automatically.

Example with PM2:
```bash
npm install -g pm2
pm2 start server.js --name social-bot
pm2 save
pm2 startup
```

## 6) Reverse proxy and TLS (recommended)
Place the app behind Nginx/Caddy and enable HTTPS.

Also restrict admin access:
- set `ADMIN_TOKEN`
- allow only trusted IPs if possible

## 7) Verify deployment
1. Open `/` and load the admin dashboard.
2. Save automation settings.
3. Run **Promote Now**.
4. Confirm logs appear in **Recent Promotion Runs**.
5. Confirm webhook receivers received promotion payloads.
