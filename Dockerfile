# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

COPY tsconfig.build.json tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:22-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production

RUN groupadd --gid 1001 moltbot \
  && useradd --uid 1001 --gid moltbot --shell /bin/false --create-home moltbot

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts \
  && npm cache clean --force

COPY --from=builder /app/dist ./dist

RUN chown -R moltbot:moltbot /app

USER moltbot

# Long-running agent: polls x402 facilitator (no inbound HTTP port).
CMD ["node", "dist/index.js"]
