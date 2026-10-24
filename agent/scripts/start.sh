#!/bin/sh
# Container entrypoint. Leaves the Codex session on the volume and starts the agent.
#
# CODEX_AUTH_JSON_B64 seeds $CODEX_HOME/auth.json (base64 of an auth.json made with
# `codex login --device-auth`). Codex refreshes the tokens in that file as it runs,
# so the volume copy wins over the variable. Changing the variable reseeds it.
set -eu

mkdir -p "$CODEX_HOME" "$(dirname "$AGENT_DATA_FILE")"
auth="$CODEX_HOME/auth.json"

if [ -n "${CODEX_AUTH_JSON_B64:-}" ]; then
  seed=$(printf '%s' "$CODEX_AUTH_JSON_B64" | sha256sum | cut -d' ' -f1)
  if [ ! -s "$auth" ] || [ "$(cat "$CODEX_HOME/.seed-sha" 2>/dev/null || true)" != "$seed" ]; then
    printf '%s' "$CODEX_AUTH_JSON_B64" | base64 -d > "$auth.tmp"
    chmod 600 "$auth.tmp"
    mv "$auth.tmp" "$auth"
    printf '%s' "$seed" > "$CODEX_HOME/.seed-sha"
    echo "Sesión de Codex sembrada desde CODEX_AUTH_JSON_B64."
  fi
fi

"$CODEX_BIN" login status || echo "Codex sin sesión: el chat responderá 'unavailable' y la clasificación caerá a reglas."

exec node src/server.ts
