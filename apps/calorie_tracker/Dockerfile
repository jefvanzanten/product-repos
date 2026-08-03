FROM node:24-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /repo

FROM base AS development-dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/calorie_tracker/package.json apps/calorie_tracker/package.json
COPY packages/auth-client/package.json packages/auth-client/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN corepack pnpm install --filter calorie_tracker... --frozen-lockfile

FROM base AS production-dependencies
ENV NODE_ENV="production"
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/calorie_tracker/package.json apps/calorie_tracker/package.json
COPY packages/auth-client/package.json packages/auth-client/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN corepack pnpm install --filter calorie_tracker... --prod --frozen-lockfile

FROM development-dependencies AS build
ARG VITE_API_URL=https://api.jefvanzanten.dev
ENV VITE_API_URL="$VITE_API_URL"
COPY apps/calorie_tracker apps/calorie_tracker
COPY packages/auth-client packages/auth-client
COPY packages/contracts packages/contracts
COPY packages/shared packages/shared
RUN corepack pnpm --filter calorie_tracker build

FROM base AS runtime
ENV NODE_ENV="production"
ENV HOST="0.0.0.0"
ENV PORT="3000"
COPY --from=production-dependencies /repo/node_modules /repo/node_modules
COPY --from=production-dependencies /repo/apps/calorie_tracker/node_modules /repo/apps/calorie_tracker/node_modules
COPY --from=build /repo/apps/calorie_tracker/package.json /repo/apps/calorie_tracker/package.json
COPY --from=build /repo/apps/calorie_tracker/build /repo/apps/calorie_tracker/build
WORKDIR /repo/apps/calorie_tracker
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 CMD node -e "fetch('http://127.0.0.1:3000/calorie-tracker/login').then((response) => { if (!response.ok) process.exit(1); }).catch(() => process.exit(1))"
CMD ["node", "./node_modules/@react-router/serve/bin.cjs", "./build/server/index.js"]
