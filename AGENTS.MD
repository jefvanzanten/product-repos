# Rules

- Use pnpm as the only dependency installer in this workspace. Bun may be used as a runtime or test runner, but do not run `bun install`; see `docs/dependency-management.md`.
- Use `corepack pnpm`, not a global `pnpm`, for pnpm commands.
- Never run bare `pnpm`, including for tests, typechecks, builds, or root package scripts. The Codex runtime may expose a different pnpm major version on `PATH`.
- Do not set `CI=true` or otherwise bypass pnpm's interactive prompt when pnpm wants to remove/recreate `node_modules`. Stop and follow the recovery flow in `docs/dependency-management.md` instead.
- Do not use `confirmModulesPurge=false`, `--no-optional`, or similar flags as an ad hoc dependency repair.
- Do not run dependency install, purge, rebuild, or repair commands unless dependency recovery is the explicit task. Normal verification commands must not mutate `node_modules`.

## Documentation

- Use only the documentation directly relevant to the current task.
- Do not recursively scan `docs/` or read unrelated documentation.
- Start with the nearest matching feature spec. Read requirements, endpoint docs, or ERDs only when the task specifically affects those areas.
- Treat the selected documentation as the source of truth.
- If the requested code conflicts with it, propose a spec change first with pros and cons.
- Do not edit `docs/` unless explicitly requested.
