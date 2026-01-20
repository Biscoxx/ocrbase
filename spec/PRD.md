# OCRBase

Self-hosted OCR SaaS using open-weight vLLM models.

## Features

| Feature        | Description                             |
| -------------- | --------------------------------------- |
| **Parse**      | PDF/Image → Markdown                    |
| **Extract**    | PDF/Image → JSON (with optional schema) |
| **Schema Gen** | LLM suggests JSON schema from sample    |

## Stack

- **Backend**: Elysia + Bun + PostgreSQL + BullMQ + Redis + MinIO
- **Frontend**: TanStack Start + Eden Treaty + shadcn/ui
- **Auth**: Better Auth (GitHub + email, organizations)
- **OCR**: PaddleOCR-VL via `@ocrbase/paddleocr-vl-ts`
- **LLM**: Vercel AI SDK → OpenRouter / local vLLM

## SDK: `@ocrbase/paddleocr-vl-ts`

Type-safe PaddleOCR client with Zod validation, retries, and timeout handling.

- **Config**: `layoutUrl` (required), `timeout` (300s), `retries` (0), `debug`
- **Options**: `fileType` (0=PDF, 1=Image), `useLayoutDetection`, `maxNewTokens`
- **Errors**: `HttpError`, `ApiError`, `ValidationError`, `NetworkError`, `TimeoutError`

## Monorepo

```
apps/server, apps/web
packages/db, packages/env, packages/auth, packages/paddleocr-vl-ts
```

## Scale

20k+ docs/day, 200MB max, RTX 3060 baseline
