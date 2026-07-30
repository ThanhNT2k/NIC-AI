#!/usr/bin/env bash
set -Eeuo pipefail

APP_ROOT=/opt/nic-erp
REPOSITORY=https://github.com/ThanhNT2k/NIC-AI.git
SERVICE=nic-erp.service
SHA=${1:-}

if [[ ! "$SHA" =~ ^[0-9a-f]{40}$ ]]; then
  echo "Expected a full lowercase commit SHA." >&2
  exit 64
fi

exec 9>"$APP_ROOT/.deploy.lock"
flock -n 9 || {
  echo "Another NIC deployment is already running." >&2
  exit 75
}

release="$APP_ROOT/releases/$SHA"
build_dir="$APP_ROOT/releases/.building-$SHA-$$"
previous="$(readlink -f "$APP_ROOT/current")"
activated=0

rollback() {
  status=$?
  if [[ "$activated" == 1 && -n "$previous" && -d "$previous" ]]; then
    echo "Deployment failed; rolling back to $previous" >&2
    ln -sfn "$previous" "$APP_ROOT/current"
    systemctl restart "$SERVICE" || true
  fi
  exit "$status"
}
trap rollback ERR

if [[ ! -d "$release" ]]; then
  git clone --quiet --no-checkout "$REPOSITORY" "$build_dir"
  git -C "$build_dir" checkout --quiet "$SHA"
  test "$(git -C "$build_dir" rev-parse HEAD)" = "$SHA"

  ln -s "$APP_ROOT/shared/.env" "$build_dir/.env"
  npm ci --prefix "$build_dir"
  npm run build --prefix "$build_dir"

  printf 'commit=%s\ncreated_utc=%s\n' "$SHA" "$(date -u +%FT%TZ)" > "$build_dir/RELEASE"
  chown -R root:nic-erp "$build_dir"
  chmod -R g+rX,o-rwx "$build_dir"
  mv "$build_dir" "$release"
fi

grep -qx "commit=$SHA" "$release/RELEASE"

ln -sfn "$release" "$APP_ROOT/current"
activated=1
systemctl restart "$SERVICE"

curl --fail --silent --show-error --head \
  --retry 15 --retry-delay 2 --retry-connrefused \
  http://127.0.0.1:3000 >/dev/null
curl --fail --silent --show-error --head \
  --retry 8 --retry-delay 2 \
  https://nic.thanhnt2k.app >/dev/null

activated=0
echo "NIC deployed at $SHA"
