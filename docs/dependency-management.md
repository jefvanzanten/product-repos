# Dependency management

This workspace uses pnpm as its only dependency installer.

## Rules

- Use `corepack pnpm install` to install or repair dependencies.
- Use `corepack pnpm`, not a global `pnpm`, for pnpm commands.
- Never run bare `pnpm`. In the Codex runtime it may resolve to a different major version than the version pinned in `package.json`.
- Do not run `bun install`, `npm install`, or `yarn install` in this workspace.
- Bun may be used as a runtime or test runner, for example `bun test`.
- Keep workspace packages linked by pnpm. Do not manually edit `node_modules` except as a short-lived recovery step.

## Enforced safeguards

The repository does not rely on agent instructions alone:

- `package.json` pins pnpm through `packageManager`.
- `package.json` also pins `engines.pnpm`, so an incompatible pnpm executable is rejected before it can run workspace commands.
- `pnpm-workspace.yaml` sets `pmOnFail: error` as an additional version guard for pnpm 11 and newer.
- `pnpm-workspace.yaml` sets `verifyDepsBeforeRun: error`, so running a test, typecheck, build, or executable can never trigger an automatic install or modules purge.
- Root scripts invoke `corepack pnpm`, so nested workspace commands also use the pinned version.

If dependencies are stale or incomplete, verification must fail with an error. It must not attempt to repair `node_modules`.

## Agent guardrails

Agents must treat `node_modules` as fragile on Windows.

- Do not set `CI=true` to bypass a pnpm prompt that says `node_modules` will be removed or rebuilt.
- Do not answer yes to a pnpm modules-purge prompt during ordinary verification.
- Do not use `confirmModulesPurge=false`, `--no-optional`, or similar flags to force a partial repair.
- Do not run install, purge, rebuild, or repair commands unless dependency recovery is the explicit task.
- If a normal command such as `corepack pnpm --filter inventory typecheck` triggers a modules-purge prompt, stop the command and report that dependency recovery is required.
- If verification is needed and dependencies are already broken, prefer reporting the blocked verification over trying ad hoc node_modules fixes.

The only acceptable way to proceed after a purge prompt or `EPERM` is the recovery flow below.

## Windows EPERM recovery

Windows can keep files in `node_modules` locked while editors, TypeScript servers, Vite, Bun, Node, pnpm, antivirus, or file indexing are still reading them. If pnpm fails with `EPERM`, the workspace can be left with a partially rebuilt `node_modules` tree.

Use this recovery flow from the repository root:

```powershell
Get-Process node,bun,pnpm,esbuild,vite -ErrorAction SilentlyContinue | Stop-Process

Remove-Item -LiteralPath .\node_modules,.\apps\backend\node_modules,.\apps\inventory+admin_panel\node_modules,.\apps\calory_tracker\node_modules -Recurse -Force

corepack pnpm install --frozen-lockfile
```

If the same error keeps returning, exclude the repository path and `.pnpm-store` from realtime antivirus scanning.

## Why this matters

pnpm manages workspace packages through its own `node_modules` layout. Mixing installers can move packages into `.ignored` folders or replace pnpm-managed links, which makes tests and typechecks fail even when the lockfile is correct.

The same risk exists when two pnpm major versions touch the workspace. For example, this repository is pinned to pnpm 10.28.2 while a Codex runtime may expose pnpm 11 on `PATH`. That is why every command must go through Corepack.

Changes to `AGENTS.MD` are reliably picked up by new Codex tasks. A task that was already active when the file changed may still have the older instructions in its context; start a new task after changing repository instructions.
