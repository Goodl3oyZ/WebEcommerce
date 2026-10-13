# Continuous deployment

A push to `main` runs `.github/workflows/ci-cd.yml`: backend tests and the
frontend build, then (only if both pass) a signed request to the server's
deploy webhook. The server pulls that commit, rebuilds the stack, waits for
`/api/health`, and rolls back to the previous commit if the check fails. The
workflow waits for the result, so a failed deploy shows up as a failed run.

| File | Purpose |
| --- | --- |
| `webhook/server.mjs` | Webhook (Node 18+, no dependencies) on `127.0.0.1:9095`, reached through Cloudflare Tunnel. Verifies the HMAC signature, deploys only `main`, never two deploys at once. |
| `deploy.sh` | `git fetch` + checkout of the commit, `docker compose up -d --build`, health check, rollback. |
| `webhook/webecommerce-deploy.service` | systemd unit for the webhook. |

## Server setup (once)

```bash
# The app directory must be a git clone; .env.production stays untracked.
cd /opt/webecommerce && git status

# Secret shared with GitHub (mode 600)
printf 'DEPLOY_SECRET=%s\nDEPLOY_BRANCH=main\n' "$(openssl rand -hex 32)" > /etc/webecommerce-deploy.env
chmod 600 /etc/webecommerce-deploy.env

cp deploy/webhook/webecommerce-deploy.service /etc/systemd/system/
systemctl daemon-reload && systemctl enable --now webecommerce-deploy
```

Expose it with cloudflared (before the `http_status:404` rule), then
`cloudflared tunnel route dns <tunnel> deploy.example.com` and restart cloudflared:

```yaml
  - hostname: deploy.example.com
    service: http://localhost:9095
```

## GitHub (Settings -> Secrets and variables -> Actions)

- `DEPLOY_WEBHOOK_URL` = `https://deploy.example.com/hooks/deploy`
- `DEPLOY_WEBHOOK_SECRET` = the `DEPLOY_SECRET` value from `/etc/webecommerce-deploy.env`

## Operating

- Status: `curl https://deploy.example.com/hooks/deploy/status`
- Logs: `journalctl -u webecommerce-deploy -f` and `/var/lib/webecommerce-deploy/deploy.log`
- Deploy by hand: `bash /opt/webecommerce/deploy/deploy.sh <sha>`
