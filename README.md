# DRIP QUEEN MD — FINAL INTEGRATED BUILD

## Deployment architecture
Use Render for the persistent Baileys worker. Vercel is optional for the public dashboard/API proxy.

### Render environment
Do **not** set `BOT_WORKER_URL` on Render.

```env
BOT_NAME=DRIP QUEEN MD
BOT_VERSION=1.0.0
PREFIX=.
OWNER_NUMBER=256XXXXXXXXX
MULTI_USER=true
PAIRING_CODE_ONLY=true
HOST=0.0.0.0
```

Start command:
```bash
npm start
```

### Vercel environment
If the dashboard is deployed through Vercel, set:
```env
BOT_WORKER_URL=https://YOUR-RENDER-SERVICE.onrender.com
```
Then redeploy Vercel.

## Pairing
1. Dashboard → Connect WhatsApp.
2. Enter the number with country code, digits only.
3. Click Generate Pair Code.
4. Enter the 8-character code in WhatsApp → Linked Devices → Link with phone number.
5. Credentials are saved in `sessions/<number>/` and restored after restart.

## APIs
- `GET /api/status`
- `GET /api/sessions`
- `DELETE /api/sessions/:userId`
- `POST /api/pair`
- `GET /api/commands`
- `GET /api/features`
- `POST /api/features/:featureName`
- `GET /api/settings`
- `POST /api/settings`

## Dashboard
The dashboard includes live status, pairing, sessions, commands, auto-features, settings, API error handling, a non-blocking loading screen, and `bot.png` branding.

## Security
Never commit `.env` or real WhatsApp session credentials. Keep `sessions/` private.

## Vercel ↔ Render backend connection

The dashboard is designed as a frontend/API layer on Vercel while the Baileys WhatsApp worker runs persistently on Render.

### Vercel environment variable

Set this in the Vercel project:

```env
BOT_WORKER_URL=https://drip-queen-md.onrender.com
```

The current build also contains a **Vercel-only fallback** to that Render URL. This means pairing and dashboard API requests can still reach Render if the Vercel variable was accidentally omitted. The fallback is never enabled on Render, preventing the worker from proxying to itself.

### Render environment

Do **not** set `BOT_WORKER_URL` or `RENDER_WORKER_URL` on Render. Render should run the bot locally with `npm start`.

### Proxied dashboard APIs

When deployed to Vercel, these requests are forwarded to the Render worker:

- `GET /api/status`
- `GET /api/sessions`
- `DELETE /api/sessions/:userId`
- `POST /api/pair`
- `GET /api/commands`
- `GET /api/features`
- `POST /api/features/:featureName`
- `GET /api/settings`
- `POST /api/settings`
- `GET /api/backend-status`

If Render is unreachable, the dashboard now reports a backend/worker connection error instead of attempting to create a WhatsApp session inside Vercel.
