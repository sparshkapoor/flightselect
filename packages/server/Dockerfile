FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY tsconfig.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY packages/server/package*.json ./packages/server/
RUN npm ci --workspace=packages/shared --workspace=packages/server
COPY packages/shared ./packages/shared
COPY packages/server ./packages/server
RUN npm run build --workspace=packages/shared
RUN npm run build --workspace=packages/server
RUN cd packages/server && npx prisma generate

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/packages/server/dist ./dist
COPY --from=builder /app/packages/server/node_modules ./node_modules
COPY --from=builder /app/packages/server/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./.prisma
COPY packages/server/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh
EXPOSE 3001
HEALTHCHECK --interval=10s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:3001/api/health || exit 1
ENTRYPOINT ["./docker-entrypoint.sh"]
