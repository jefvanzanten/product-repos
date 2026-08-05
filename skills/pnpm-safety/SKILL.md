---
name: pnpm-safety
description: Must be loaded before running pnpm, package scripts, or dependency-provided commands such as test, lint, typecheck, build, exec, tsc, vite, vitest, eslint, or Playwright. Do not load for code or documentation work that runs none of these commands.
---

# pnpm safety

Read and follow `../../docs/pnpm-rules.md` before running the command.

If `ERR_PNPM_VERIFY_DEPS_BEFORE_RUN` occurs, stop and report it. Never bypass it with `node_modules/.bin`, `npx`, `bunx`, or another direct executable.
