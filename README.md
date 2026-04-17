# Social-bot

Multi-platform promotion bot with a built-in admin web interface.

## Features
- Admin dashboard to manage promotion campaigns from the browser
- Automated promotion scheduler with configurable interval
- Multi-channel delivery using per-channel webhook endpoints
- Promotion logs for success/failure tracking

## Run locally
```bash
npm install
npm run start
```

Then open:
- `http://localhost:3000/`

## Admin API
- `GET /api/admin/automation` — read supported channels + current settings
- `POST /api/admin/automation/settings` — save automation settings
- `POST /api/admin/automation/promote` — trigger promotion immediately
- `GET /api/admin/automation/logs?limit=20` — read recent promotion runs

## Deployment
See [DEPLOYMENT.md](./DEPLOYMENT.md) for full deployment and production setup instructions.
