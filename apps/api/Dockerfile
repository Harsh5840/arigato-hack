# Tag and multi-platform registry digest verified 2026-10-25; rebuild after reviewed base updates.
FROM node:22.23.4-bookworm-slim@sha256:de170b39439eb0e5a3444ad7d60b015614a381e10fecae2e30ec9e735122f38d AS dependencies
WORKDIR /app/apps/api
COPY apps/api/package.json apps/api/package-lock.json ./
# tsx is the current TypeScript runtime entrypoint and is intentionally retained.
RUN npm ci --ignore-scripts

FROM node:22.23.4-bookworm-slim@sha256:de170b39439eb0e5a3444ad7d60b015614a381e10fecae2e30ec9e735122f38d AS runtime
ENV NODE_ENV=production PROOFPATCH_ROOT=/app PROOFPATCH_DB=/app/.data/proofpatch.sqlite API_HOST=0.0.0.0 API_PORT=8787 ALLOW_GIT_CREDENTIAL_MANAGER=false
WORKDIR /app/apps/api
COPY --from=dependencies --chown=node:node /app/apps/api/node_modules ./node_modules
COPY --chown=node:node apps/api/src ./src
COPY --chown=node:node apps/api/package.json ./package.json
COPY --chown=node:node packages/contracts /app/packages/contracts
RUN mkdir -p /app/.data /app/output/live-runs && chown -R node:node /app/.data /app/output
USER node
EXPOSE 8787
CMD ["node", "--experimental-sqlite", "--import", "tsx", "src/index.ts"]
