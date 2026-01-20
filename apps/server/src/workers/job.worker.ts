/* eslint-disable eslint-plugin-jest/require-hook */
/* eslint-disable eslint/max-statements */
import { type Job as BullJob, Worker } from "bullmq";

import {
  completeJob,
  failJob,
  getJobById,
  updateJobStatus,
} from "../lib/job-status";
import { llmService } from "../services/llm";
import { parseDocument } from "../services/ocr";
import { type JobData, connection } from "../services/queue";
import { StorageService } from "../services/storage";

const runExtraction = async (
  jobId: string,
  markdown: string,
  schema: Record<string, unknown> | undefined,
  llmModel: string | null,
  llmProvider: string | null,
  pageCount: number,
  startTime: number
): Promise<void> => {
  await updateJobStatus(jobId, "extracting");

  const jsonResult = await llmService.processExtraction({
    markdown,
    model: llmModel ?? undefined,
    provider: llmProvider ?? undefined,
    schema,
  });

  const processingTimeMs = Date.now() - startTime;

  await completeJob(jobId, {
    jsonResult,
    markdownResult: markdown,
    pageCount,
    processingTimeMs,
  });
};

const finishParseJob = async (
  jobId: string,
  markdown: string,
  pageCount: number,
  startTime: number
): Promise<void> => {
  const processingTimeMs = Date.now() - startTime;

  await completeJob(jobId, {
    markdownResult: markdown,
    pageCount,
    processingTimeMs,
  });
};

const processJob = async (bullJob: BullJob<JobData>): Promise<void> => {
  const { jobId } = bullJob.data;
  const startTime = Date.now();

  const job = await getJobById(jobId);

  if (!job) {
    throw new Error(`Job not found: ${jobId}`);
  }

  await updateJobStatus(jobId, "processing", { startedAt: new Date() });

  const fileBuffer = await StorageService.getFile(job.fileKey);
  const { markdown, pageCount } = await parseDocument(fileBuffer, job.mimeType);

  await updateJobStatus(jobId, "processing", {
    markdownResult: markdown,
    pageCount,
  });

  if (job.type === "extract") {
    const schema = job.schema?.jsonSchema as
      | Record<string, unknown>
      | undefined;
    await runExtraction(
      jobId,
      markdown,
      schema,
      job.llmModel,
      job.llmProvider,
      pageCount,
      startTime
    );
  } else {
    await finishParseJob(jobId, markdown, pageCount, startTime);
  }
};

const worker = new Worker<JobData>("ocr-jobs", processJob, {
  concurrency: 5,
  connection,
});

worker.on("active", (job) => {
  console.info(`[Worker] Job ${job.id} started processing`);
});

worker.on("completed", (job) => {
  console.info(`[Worker] Job ${job.id} completed successfully`);
});

worker.on("failed", async (job, error) => {
  const jobId = job?.data.jobId;
  console.error(`[Worker] Job ${job?.id} failed:`, error.message);

  if (jobId) {
    const errorCode = error.name || "PROCESSING_ERROR";
    const errorMessage = error.message || "Unknown error occurred";
    const attempts = job?.attemptsMade ?? 0;
    const maxAttempts = job?.opts.attempts ?? 3;
    const shouldRetry = attempts < maxAttempts;

    await failJob(jobId, errorCode, errorMessage, shouldRetry);
  }
});

worker.on("error", (error) => {
  console.error("[Worker] Worker error:", error.message);
});

const shutdown = async (): Promise<void> => {
  console.info("[Worker] Shutting down...");
  await worker.close();
  process.exit(0);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

console.info("[Worker] Job worker started, waiting for jobs...");
