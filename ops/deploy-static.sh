#!/usr/bin/env bash
set -euo pipefail
archive=${1:?archive required}
release=${2:?release required}
[[ "$release" =~ ^[0-9a-f]{40}-[0-9]+-[0-9]+$ ]] || { echo "Invalid release" >&2; exit 1; }
exec 9>"${DEPLOY_LOCK:-/var/lock/properly-deploy.lock}"
flock -w 600 9
base=${RELEASES_ROOT:-/var/www/ozfirstchoice-releases}
live=${STATIC_ROOT:-/var/www/ozfirstchoice}
mkdir -p "$base"
target="$base/$release"
test ! -e "$target"
mkdir "$target"
tar -xzf "$archive" -C "$target" --no-same-owner
for page in index.html contact.html 404.html; do test -s "$target/$page"; done
chmod -R a+rX "$target"
# Convert the initial manual directory deployment to a release symlink once.
if [ -d "$live" ] && [ ! -L "$live" ]; then
  legacy="$base/bootstrap-$(date +%s)"
  mv "$live" "$legacy"
  ln -s "$legacy" "$live"
fi
previous=$(readlink -f "$live")
test -d "$previous"
link="$live.next"
ln -sfn "$target" "$link"
mv -Tf "$link" "$live"
rollback() {
  local result=$?
  trap - EXIT INT TERM
  if [ "$result" -ne 0 ]; then
    ln -sfn "$previous" "$link"
    mv -Tf "$link" "$live"
    echo "Static deployment failed; previous release restored" >&2
  fi
  exit "$result"
}
trap rollback EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
nginx -t
curl --fail --silent --show-error --max-time 20 -H 'Host: ozfirstchoice.com.au' http://127.0.0.1/ >/dev/null
curl --fail --silent --show-error --max-time 20 https://ozfirstchoice.com.au/ >/dev/null
echo "OZFIRSTCHOICE deployed: $release"
# Retain current and previous releases for manual rollback; remove older releases.
for directory in "$base"/*; do
  [ -d "$directory" ] || continue
  [ "$directory" = "$target" ] || [ "$directory" = "$previous" ] || rm -rf -- "$directory"
done
rm -f -- "$archive"
