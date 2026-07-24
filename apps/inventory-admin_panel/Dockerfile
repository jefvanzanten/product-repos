FROM node:24-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /repo

FROM base AS development-dependencies-env
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/admin_panel/package.json apps/admin_panel/package.json
RUN pnpm install --filter admin_panel... --frozen-lockfile

FROM base AS production-dependencies-env
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/admin_panel/package.json apps/admin_panel/package.json
RUN pnpm install --filter admin_panel... --prod --frozen-lockfile

FROM development-dependencies-env AS build-env
COPY apps/admin_panel apps/admin_panel
RUN pnpm --filter admin_panel build

FROM base
ENV NODE_ENV="production"
COPY --from=production-dependencies-env /repo/package.json /repo/package.json
COPY --from=production-dependencies-env /repo/pnpm-workspace.yaml /repo/pnpm-workspace.yaml
COPY --from=production-dependencies-env /repo/node_modules /repo/node_modules
COPY --from=production-dependencies-env /repo/apps/admin_panel/node_modules /repo/apps/admin_panel/node_modules
COPY --from=build-env /repo/apps/admin_panel/package.json /repo/apps/admin_panel/package.json
COPY --from=build-env /repo/apps/admin_panel/build /repo/apps/admin_panel/build
WORKDIR /repo/apps/admin_panel
CMD ["pnpm", "start"]
