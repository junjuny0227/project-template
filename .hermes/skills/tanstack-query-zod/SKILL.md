---
name: tanstack-query-zod
description: Apply TanStack Query and Zod conventions.
version: 1.1.0
metadata:
  hermes:
    tags: [tanstack-query, zod, api]
---

# TanStack Query + Zod Guide

## API and Queries

- Call the project's typed HTTP method wrappers, not the raw Axios instance.
- Keep URL factories in the owning entity or feature `api/` segment.
- Name hooks `useGet<Resource>`, `usePost<Resource>`, `usePatch<Resource>`, `usePut<Resource>`, or `useDelete<Resource>`.
- Build query keys hierarchically with an `all()` root so mutations can invalidate the narrowest applicable key.

```ts
export const jobQueryKeys = {
  all: () => ['jobs'] as const,
  getJobs: () => ['jobs', 'list'] as const,
  getJob: (jobId?: number) => ['jobs', 'detail', jobId] as const,
} as const;
```

## Zod Types

- Name schemas in PascalCase with the `Schema` suffix.
- Infer request types from schemas with the `ReqType` suffix.
- Prefer explicit unions and `Record<Union, Metadata>` constants over `enum`.

```ts
export const JobRegistrationSchema = z.object({
  title: z.string().trim().min(1, '제목을 입력해주세요'),
});

export type JobRegistrationReqType = z.infer<typeof JobRegistrationSchema>;
```

## Hermes adaptation

Check installed packages and the existing `src/shared/api` wrappers with `read_file` before using Zod or React Hook Form (they may not be installed). Treat the code examples as patterns, not imports from existing files. Keep browser `/backend` and server-only `API_BASE_URL` clients separate. Use `terminal` for the relevant tests and `AGENTS.md` verification commands.
