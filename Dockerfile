# One image for the API and the web app (phase 1: local demo only).
# docker compose up --build, then open http://localhost:3000
FROM node:22-bookworm-slim

# Chromium renders the PDFs; Noto fonts are embedded by the report itself.
RUN apt-get update \
  && apt-get install -y --no-install-recommends chromium ca-certificates \
  && rm -rf /var/lib/apt/lists/*
ENV KALACHAKRA_CHROME=/usr/bin/chromium \
    NEXT_TELEMETRY_DISABLED=1

RUN corepack enable
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile \
  && pnpm --filter @kalachakra/web build

EXPOSE 8787 3000
