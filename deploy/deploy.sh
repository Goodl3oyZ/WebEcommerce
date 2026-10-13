#!/usr/bin/env bash
# Deploy one commit of the production stack, with a health check and rollback.
#   deploy.sh <sha>     (run by deploy/webhook/server.mjs, or by hand)
#
# 1. Fetch the branch and check that <sha> is on it.
# 2. Check it out and rebuild/restart the stack (compose runs the schema
#    migration and storage init before the API starts).
# 3. Wait for GET /api/health. If it never passes, go back to the commit that
#    was running before and rebuild that, so the site stays up.
# Writes $STATE_DIR/status.json for the status endpoint.
set -euo pipefail

SHA="${1:?usage: deploy.sh <sha>}"
APP_DIR="${APP_DIR:-/opt/webecommerce}"
BRANCH="${DEPLOY_BRANCH:-main}"
STATE_DIR="${STATE_DIR:-/var/lib/webecommerce-deploy}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:${TUNNEL_PORT:-8095}/api/health}"
COMPOSE=(docker compose --env-file .env.production -f docker-compose.prod.yml -f docker-compose.tunnel.yml)

mkdir -p "$STATE_DIR"
exec 9>"$STATE_DIR/deploy.lock"
flock 9

STARTED="$(date -u +%FT%TZ)"
status() { # state message
  printf '{"state":"%s","sha":"%s","startedAt":"%s","finishedAt":"%s","message":"%s"}\n' \
    "$1" "$SHA" "$STARTED" "$( [ "$1" = running ] && echo "" || date -u +%FT%TZ)" "$2" > "$STATE_DIR/status.json"
}
log() { echo "[$(date -u +%FT%TZ)] $*"; }
# Any unexpected failure (fetch, checkout...) is reported, not left "running".
trap 'status failed "error at line $LINENO"' ERR

status running "deploying"
log "=== deploy $SHA ($BRANCH) ==="
cd "$APP_DIR"

git fetch --quiet origin "$BRANCH"
if ! git merge-base --is-ancestor "$SHA" "origin/$BRANCH"; then
  log "refused: $SHA is not on origin/$BRANCH"
  status failed "commit is not on $BRANCH"
  exit 1
fi

PREVIOUS="$(git rev-parse HEAD)"
git checkout --quiet -B "$BRANCH" "$SHA"

healthy() {
  for _ in $(seq 1 60); do
    if curl -fsS --max-time 5 "$HEALTH_URL" >/dev/null 2>&1; then return 0; fi
    sleep 5
  done
  return 1
}

if "${COMPOSE[@]}" up -d --build --remove-orphans && healthy; then
  log "healthy, deployed $SHA"
  docker image prune -f >/dev/null 2>&1 || true
  status success "deployed"
  exit 0
fi

log "deploy of $SHA failed the health check"
if [ "$PREVIOUS" != "$SHA" ]; then
  log "rolling back to $PREVIOUS"
  git checkout --quiet -B "$BRANCH" "$PREVIOUS"
  if "${COMPOSE[@]}" up -d --build --remove-orphans && healthy; then
    status failed "unhealthy; rolled back to ${PREVIOUS:0:7}"
  else
    status failed "unhealthy; rollback to ${PREVIOUS:0:7} also unhealthy"
  fi
else
  status failed "unhealthy"
fi
exit 1
