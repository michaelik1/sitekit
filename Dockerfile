FROM node:22.18-bookworm-slim AS dependencies
WORKDIR /app
COPY package*.json ./
RUN npm ci --no-audit --no-fund

FROM dependencies AS media-sync
COPY scripts ./scripts
ENTRYPOINT ["node", "scripts/sync-media.mjs"]

FROM dependencies AS build
COPY . .
RUN SKIP_CONTENT_PRERENDER=true node ./node_modules/@nuxt/cli/bin/nuxi.mjs build


FROM node:22.18-bookworm-slim AS runtime
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000
WORKDIR /app
COPY --from=build --chown=node:node /app/.output ./.output
COPY --from=build --chown=node:node /app/scripts/prepare-content.mjs ./scripts/prepare-content.mjs
USER node
EXPOSE 3000
STOPSIGNAL SIGTERM
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.status===204?0:1)).catch(()=>process.exit(1))"
CMD ["node", ".output/server/index.mjs"]
