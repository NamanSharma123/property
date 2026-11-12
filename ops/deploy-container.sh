#!/usr/bin/env bash
set -euo pipefail
service=${1:?service required}
image=${2:?image required}
case "$service" in
  frontend) port=3000; host=investview.com.au; path=/ ;;
  backend) port=5000; host=api.investview.com.au; path=/health ;;
  *) echo "Unknown service" >&2; exit 1 ;;
esac
[[ "$image" =~ ^[0-9]{12}\.dkr\.ecr\.ap-southeast-2\.amazonaws\.com/properly-$service:[0-9a-f]{40}$ ]] || { echo "Invalid commit image" >&2; exit 1; }
exec 9>"${DEPLOY_LOCK:-/var/lock/properly-deploy.lock}"
flock -w 600 9
cd "${DEPLOY_ROOT:-/opt/properly}"
container=$(docker compose ps -q "$service")
test -n "$container"
previous=$(docker inspect --format '{{.Image}}' "$container")
# Preserve the exact previous image locally, even if its mutable tag moved.
rollback="properly-$service:rollback"
docker tag "$previous" "$rollback"
override="$PWD/docker-compose.$service.release.yml"
write_image() { printf 'services:\n  %s:\n    image: %s\n' "$service" "$1" > "$override"; }
compose() { docker compose -f docker-compose.yml -f "$override" "$@"; }
healthy() {
  local attempt
  for attempt in $(seq 1 36); do
    if curl --fail --silent --max-time 10 -H "Host: $host" "http://127.0.0.1:$port$path" >/dev/null; then return 0; fi
    sleep 5
  done
  return 1
}
changed=false
rollback_on_failure() {
  local result=$?
  trap - EXIT INT TERM
  if [ "$result" -ne 0 ] && [ "$changed" = true ]; then
    echo "Deployment failed; restoring previous image" >&2
    write_image "$rollback"
    compose up -d --no-deps --pull never "$service"
    if ! healthy; then echo "CRITICAL: rollback health check failed" >&2; fi
    # Keep the rollback image override active so manual Compose calls can use it.
  fi
  exit "$result"
}
trap rollback_on_failure EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
docker pull "$image"
write_image "$image"
changed=true
compose up -d --no-deps "$service"
healthy
curl --fail --silent --show-error --max-time 20 "https://$host$path" >/dev/null
echo "$service deployed: $image"
