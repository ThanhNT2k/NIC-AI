#!/usr/bin/env bash
set -Eeuo pipefail

if [[ ${SSH_ORIGINAL_COMMAND:-} =~ ^deploy\ ([0-9a-f]{40})$ ]]; then
  exec /usr/local/sbin/deploy-nic "${BASH_REMATCH[1]}"
fi

echo "Only 'deploy <full-commit-sha>' is allowed." >&2
exit 64
