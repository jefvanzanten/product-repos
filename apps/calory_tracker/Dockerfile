FROM node:24-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /repo

FROM base AS development-dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/calory_tracker/package.json apps/calory_tracker/package.json
COPY packages/auth-client/package.json packages/auth-client/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN corepack pnpm install --filter calory_tracker... --frozen-lockfile

FROM base AS production-dependencies
ENV NODE_ENV="production"
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/calory_tracker/package.json apps/calory_tracker/package.json
COPY packages/auth-client/package.json packages/auth-client/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN corepack pnpm install --filter calory_tracker... --prod --frozen-lockfile

FROM development-dependencies AS build
ARG VITE_API_URL=https://api.jefvanzanten.dev
ENV VITE_API_URL="$VITE_API_URL"
COPY apps/calory_tracker apps/calory_tracker
COPY packages/auth-client packages/auth-client
COPY packages/shared packages/shared
RUN corepack pnpm --filter calory_tracker build

FROM base AS runtime
ENV NODE_ENV="production"
ENV API_URL="http://backend:3000"
COPY --from=production-dependencies /repo/node_modules /repo/node_modules
COPY --from=production-dependencies /repo/apps/calory_tracker/node_modules /repo/apps/calory_tracker/node_modules
COPY --from=build /repo/apps/calory_tracker/package.json /repo/apps/calory_tracker/package.json
COPY --from=build /repo/apps/calory_tracker/build /repo/apps/calory_tracker/build
WORKDIR /repo/apps/calory_tracker
CMD ["node", "./node_modules/@react-router/serve/bin.cjs", "./build/server/index.js"]
