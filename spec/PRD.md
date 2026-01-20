# OCRBase - Summary

**Self-hosted OCR SaaS** using open-weight vLLM models for document parsing and LLM-powered data extraction.

## Core Features

| Feature           | Description                                        |
| ----------------- | -------------------------------------------------- |
| **Parse**         | PDF/Image → Markdown                               |
| **Extract**       | PDF/Image → Markdown → JSON (with optional schema) |
| **AI Schema Gen** | LLM suggests JSON schema from sample document      |

## Tech Stack

- **Backend**: Elysia + Bun + PostgreSQL + Drizzle + BullMQ + Redis + MinIO
- **Frontend**: TanStack Start + Eden Treaty + shadcn/ui (sidebar-07)
- **Auth**: Better Auth (GitHub + email/password, organizations)
- **OCR**: PaddleOCR-VL via `@ocrbase/paddleocr-vl-ts` SDK (extensible to GOT-OCR, etc.)
- **LLM**: Vercel AI SDK (`@ai-sdk/openai`) → OpenRouter / local vLLM

## Multi-Model OCR (Future)

- Config-based model registry
- User selects OCR model per job (PaddleOCR-VL, GOT-OCR, etc.)
- Each model has its own TS SDK wrapper
- Hot-swappable without downtime

## Key Patterns

- **Prefixed IDs**: `job_xxx`, `sch_xxx` for instant identification
- **Type-safe**: Drizzle → Elysia → Eden end-to-end
- **DX-first**: Ultracite, t3-env, OpenAPI auto-docs

## Scale

- 20k+ docs/day, 200MB max, RTX 3060 baseline

## Monorepo

```
apps/server, apps/web
packages/db, packages/env, packages/auth, packages/paddleocr-vl-ts
```

---

## `@ocrbase/paddleocr-vl-ts` SDK

Type-safe TypeScript client for PaddleOCR-VL with Zod validation.

### Installation

```bash
bun add @ocrbase/paddleocr-vl-ts
```

### Quick Start

```typescript
import { PaddleOCRClient } from "@ocrbase/paddleocr-vl-ts";

const client = new PaddleOCRClient({
  layoutUrl: "http://localhost:8080",
  timeout: 60_000,
});

// Parse PDF or image (base64-encoded)
const result = await client.parseDocument(base64File, { fileType: 0 });

// Combine all pages into markdown
const markdown = PaddleOCRClient.combineMarkdown(result);
```

### Configuration

| Option       | Type      | Default   | Description                         |
| ------------ | --------- | --------- | ----------------------------------- |
| `layoutUrl`  | `string`  | required  | Base URL for layout parsing service |
| `genaiUrl`   | `string`  | optional  | Base URL for GenAI service (future) |
| `timeout`    | `number`  | `300_000` | Request timeout in ms (5 min)       |
| `retries`    | `number`  | `0`       | Retry attempts for transient errors |
| `retryDelay` | `number`  | `1000`    | Delay between retries in ms         |
| `debug`      | `boolean` | `false`   | Enable debug logging                |

### Request Options

| Option               | Type      | Default | Description               |
| -------------------- | --------- | ------- | ------------------------- |
| `fileType`           | `0 \| 1`  | `0`     | 0 = PDF, 1 = Image        |
| `useLayoutDetection` | `boolean` | `true`  | Enable layout detection   |
| `maxNewTokens`       | `number`  | `2048`  | Max tokens for generation |
| `prettifyMarkdown`   | `boolean` | `true`  | Format output markdown    |

### API

```typescript
// Health check
const isHealthy = await client.checkHealth();

// Parse document
const result = await client.parseDocument(base64File, options);

// Static utilities
const markdown = PaddleOCRClient.combineMarkdown(result);
const pageCount = PaddleOCRClient.getPageCount(result);
const images = PaddleOCRClient.extractImages(result);
```

### Error Handling

All errors extend `PaddleOCRError`:

| Error Class                | When Thrown                          |
| -------------------------- | ------------------------------------ |
| `PaddleOCRHttpError`       | Non-2xx HTTP status                  |
| `PaddleOCRApiError`        | API returns `errorCode !== 0`        |
| `PaddleOCRValidationError` | Response fails Zod schema validation |
| `PaddleOCRNetworkError`    | Network/fetch failure                |
| `PaddleOCRTimeoutError`    | Request exceeds timeout              |

```typescript
import {
  PaddleOCRError,
  PaddleOCRTimeoutError,
  PaddleOCRApiError,
} from "@ocrbase/paddleocr-vl-ts";

try {
  const result = await client.parseDocument(file);
} catch (error) {
  if (error instanceof PaddleOCRTimeoutError) {
    console.error(`Timeout after ${error.timeoutMs}ms`);
  } else if (error instanceof PaddleOCRApiError) {
    console.error(`API error: ${error.errorMsg} (code: ${error.errorCode})`);
  } else if (error instanceof PaddleOCRError) {
    console.error("OCR failed:", error.message);
  }
}
```

### Response Types

```typescript
interface InferResult {
  layoutParsingResults: LayoutParsingResult[];
  dataInfo: DataInfo;
}

interface LayoutParsingResult {
  prunedResult: {
    model: string;
    markdownData: MarkdownData;
  };
  inputImage: { width: number; height: number };
}

interface MarkdownData {
  markdown: string;
  images: Record<string, string>; // base64 images
}
```

### Exports

```typescript
// Client
export { PaddleOCRClient } from "./client";

// Types
export type { InferResult, InferRequest, InferRequestOptions, ... };

// Errors
export { PaddleOCRError, PaddleOCRHttpError, PaddleOCRApiError, ... };

// Utilities
export { combineMarkdown, extractImages, getPageCount };

// Zod schemas (for extension)
export { InferResultSchema, InferRequestSchema, ... };
```
