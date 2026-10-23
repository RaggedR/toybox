#!/usr/bin/env bash
# Deploy toybox to the OCI box over SSH. Runs on the CI runner (or your laptop).
#
#   ./infra/deploy.sh <dist-dir> --env <staging|production>
#
# <dist-dir> is the frontend built by `vite build` (the CI `bundle` artifact).
# The box has no cloud identity provider, so — exactly the "bare box" case from
# the document — we authenticate with a dedicated SSH deploy key rather than
# OIDC, and here that key deploys the *whole* app, not just the worker.
#
# Required environment:
#   BOX_HOST           hostname/IP of the box
#   SSH_KEY_FILE       path to the private deploy key
# Optional:
#   BOX_USER           ssh user (default: ubuntu)
#   TOYBOX_DB_PASSWORD Postgres password for the stack (default: postgres)
set -euo pipefail

DIST_DIR="${1:?usage: deploy.sh <dist-dir> --env <staging|production>}"
shift
ENVIRONMENT="production"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --env) ENVIRONMENT="${2:?--env needs a value}"; shift 2 ;;
    *) echo "unknown argument: $1" >&2; exit 2 ;;
  esac
done

: "${BOX_HOST:?BOX_HOST is not set}"
: "${SSH_KEY_FILE:?SSH_KEY_FILE is not set}"
BOX_USER="${BOX_USER:-ubuntu}"
DB_PASSWORD="${TOYBOX_DB_PASSWORD:-postgres}"

# One box, two environments: give each its own published port and its own
# compose project (so its own containers, network, and db volume).
case "$ENVIRONMENT" in
  production) HOST_PORT=8088 ;;
  staging)    HOST_PORT=8089 ;;
  *) echo "unknown environment: $ENVIRONMENT (want staging|production)" >&2; exit 2 ;;
esac

PROJECT="toybox-$ENVIRONMENT"
REMOTE_DIR="/home/$BOX_USER/$PROJECT"
SSH_OPTS=(-i "$SSH_KEY_FILE" -o StrictHostKeyChecking=accept-new -o UserKnownHostsFile=/dev/null)

echo "==> Deploying toybox [$ENVIRONMENT] to $BOX_USER@$BOX_HOST:$REMOTE_DIR (port $HOST_PORT)"

# 1. Ship the source tree. Exclude junk and web/dist (sent separately, next),
#    so --delete can't wipe the frontend we're about to place.
rsync -az --delete \
  --exclude '.git' --exclude 'node_modules' --exclude 'web/node_modules' \
  --exclude 'web/.vite' --exclude '.env' --exclude '*.log' --exclude 'web/dist' \
  -e "ssh ${SSH_OPTS[*]}" \
  ./ "$BOX_USER@$BOX_HOST:$REMOTE_DIR/"

# 2. Ship the prebuilt frontend into web/dist (the backend serves it from there).
rsync -az --delete -e "ssh ${SSH_OPTS[*]}" \
  "${DIST_DIR%/}/" "$BOX_USER@$BOX_HOST:$REMOTE_DIR/web/dist/"

# 3. Build and (re)start the stack on the box. The build happens here, on arm64,
#    which is how the worker's native image comes out right.
ssh "${SSH_OPTS[@]}" "$BOX_USER@$BOX_HOST" \
  "cd '$REMOTE_DIR' && HOST_PORT=$HOST_PORT POSTGRES_PASSWORD='$DB_PASSWORD' docker compose -p '$PROJECT' up -d --build --remove-orphans"

# 4. Smoke check on the box: 'exited 0' and 'is serving' are not the same thing.
echo "==> Smoke-checking http://localhost:$HOST_PORT/health on the box"
ssh "${SSH_OPTS[@]}" "$BOX_USER@$BOX_HOST" \
  "curl -fsS --retry 10 --retry-delay 3 http://localhost:$HOST_PORT/health"
echo ""
echo "==> toybox [$ENVIRONMENT] is serving on 127.0.0.1:$HOST_PORT (box-local)."
