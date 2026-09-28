---
name: Vite private-file boundary
description: Why Vite workspace defaults can expose non-app files through development previews.
---

In this pnpm workspace, Vite's `server.fs.strict: true` is **not** enough to keep files outside an artifact private. Vite may auto-allow the whole workspace root. Every Vite-powered preview service should use an explicit narrow `server.fs.allow` list rather than relying on the default workspace-root discovery.

**Why:** A private assessment document outside the app was retrievable through a development preview's `/@fs/` path even though strict mode was enabled. The same issue existed in a separate component-preview service.

**How to apply:** When adding or modifying a Vite service, allow only its artifact directory plus required shared client libraries and dependencies. Never allow the workspace root merely for convenience. Check `/@fs/` access for private project documents on *each* preview path after configuration changes.