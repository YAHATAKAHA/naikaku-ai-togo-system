# syntax=docker/dockerfile:1

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS build
ARG VITE_NAIKAKU_GATEWAY_URL=http://127.0.0.1:8787
ENV VITE_NAIKAKU_GATEWAY_URL=$VITE_NAIKAKU_GATEWAY_URL
COPY . .
RUN npm run build

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
ENV NAIKAKU_GATEWAY_HOST=0.0.0.0
ENV NAIKAKU_GATEWAY_PORT=8787
WORKDIR /app
RUN addgroup -S naikaku && adduser -S naikaku -G naikaku
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/tsconfig.json ./tsconfig.json
COPY --from=build /app/dist ./dist
COPY --from=build /app/server ./server
COPY --from=build /app/src ./src
COPY --from=build /app/scripts ./scripts
RUN mkdir -p /data && chown -R naikaku:naikaku /app /data
USER naikaku
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.NAIKAKU_GATEWAY_PORT||8787)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["npm", "run", "gateway"]

FROM runtime AS web-preview
ENV NAIKAKU_PUBLIC_GATEWAY_URL=http://127.0.0.1:8787
EXPOSE 4173
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:4173/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["sh", "-c", "node scripts/write-runtime-config.mjs && npm run preview -- --host 0.0.0.0 --port 4173"]
