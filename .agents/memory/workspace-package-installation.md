---
name: Workspace package installation
description: Replit's package installer callback and pnpm's workspace-root guard in this project
---

The generic language-package installer tries to run `pnpm add` at the workspace root and can fail with pnpm's workspace-root guard. It also rejects `--filter` as a package token, so it cannot target a specific package.

**Why:** Both the direct installer and a filtered-token retry failed while adding backend dependencies; a package-scoped pnpm command succeeded.

**How to apply:** When adding a dependency to an individual workspace package, use `pnpm --filter @workspace/<package> add ...` (or `add -D ...`) if the generic installer cannot express that target. Keep declarations in the owning package, not at the workspace root.