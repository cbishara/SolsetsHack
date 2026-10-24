# The agent as a shared service (Railway), so the team's app talks to Quito's Codex
# without anyone running it locally. One replica only: the store is a file and the
# chat orders requests inside one process.
FROM node:24-bookworm-slim

# Codex is a native binary that verifies TLS with the system certificates.
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=4180 \
    AGENT_ENGINE=codex \
    CODEX_BIN=/app/node_modules/.bin/codex \
    CODEX_HOME=/data/codex \
    AGENT_DATA_FILE=/data/state.json

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY src ./src
COPY console ./console
COPY cases ./cases
COPY criteria ./criteria
COPY scripts/start.sh scripts/worker.ts ./scripts/

EXPOSE 4180
HEALTHCHECK --interval=30s --timeout=5s CMD node -e "fetch('http://localhost:'+process.env.PORT+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["sh", "scripts/start.sh"]
