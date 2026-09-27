---
name: tailwind-shadcn
description: Apply Tailwind and shadcn UI conventions.
version: 1.1.0
metadata:
  hermes:
    tags: [tailwind, shadcn, ui]
---

# Tailwind + shadcn Guide

## Class Names

- Use a plain string or template literal for static classes.
- Use `cn()` only for conditional classes or when merging an external `className` prop.
- Keep related classes in one string. Extract repeated class sets to `ui/styles.ts` in the owning slice.

```tsx
<div className="flex items-center gap-2" />
<div className={cn("flex gap-2", isActive && "bg-primary")} />
<Button className={cn("rounded-lg px-4", className)} />
```

## Ownership

- Keep design tokens, `@theme`, and base layers in the shared Tailwind configuration.
- Keep app fonts in the app root; do not set the font again in feature components.
- Keep shadcn primitives in the UI package with their upstream kebab-case filenames and named exports.
- Keep domain components such as cards and forms in their FSD slice, not in the UI package.

Run the project's formatter and lint command after modifying classes or UI components.

## Hermes adaptation

Inspect `package.json`, the actual UI exports, and styles with `read_file`/`search_files` before using `cn()` or shadcn primitives; shadcn may not be installed. In this single-app project the shared UI package means `src/shared/ui` when present. Use `terminal` to run `pnpm format:check` and `pnpm lint`, then the remaining project checks in `AGENTS.md` for code changes.
