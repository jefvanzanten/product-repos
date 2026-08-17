FROM node:24-alpine AS dependencies
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /repo
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/backend/package.json apps/backend/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN corepack pnpm install --filter @product-repos/backend... --frozen-lockfile

FROM oven/bun:1.3.9-alpine AS build
WORKDIR /repo
COPY --from=dependencies /repo /repo
COPY apps/backend apps/backend
COPY packages/contracts packages/contracts
COPY packages/shared packages/shared
RUN bun build apps/backend/src/index.ts --outfile apps/backend/dist/index.js --target bun \
    && bun build apps/backend/src/db/migrate.ts --outfile apps/backend/dist/migrate.js --target bun \
    && bun build apps/backend/src/db/seed.ts --outfile apps/backend/dist/seed.js --target bun \
    && bun build apps/backend/src/jobs/seed-auth-user.ts --outfile apps/backend/dist/seed-auth-user.js --target bun \
    && bun build apps/backend/src/jobs/cleanup-deleted-consumption-logs.ts --outfile apps/backend/dist/cleanup-deleted-consumption-logs.js --target bun

FROM oven/bun:1.3.9-alpine AS runtime
WORKDIR /app
ENV NODE_ENV="production"
ENV HOST="0.0.0.0"
ENV PORT="3000"
ENV DATABASE_URL="/data/sqlite.db"
COPY --from=build /repo/apps/backend/dist ./dist
COPY --from=build /repo/apps/backend/drizzle ./drizzle
RUN mkdir -p /data
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 CMD bun -e "const response = await fetch('http://127.0.0.1:3000/health/db'); if (!response.ok) process.exit(1)"
CMD ["sh", "-c", "bun dist/migrate.js && exec bun dist/index.js"]
