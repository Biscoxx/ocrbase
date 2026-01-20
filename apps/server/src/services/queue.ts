import { env } from "@ocrbase/env/server";
import { Queue, type ConnectionOptions } from "bullmq";

// Job retention: 1 day for completed, 7 days for failed
const DEFAULT_JOB_RETENTION_COMPLETE = 86_400;
const DEFAULT_JOB_RETENTION_FAIL = 604_800;
const MAX_COMPLETED_JOBS = 1000;
const DEFAULT_BACKOFF_DELAY = 1000;
const DEFAULT_JOB_ATTEMPTS = 3;

export interface JobData {
  jobId: string;
  organizationId: string;
  userId: string;
}

export const connection: ConnectionOptions = {
  host: env.REDIS_URL ? new URL(env.REDIS_URL).hostname : "localhost",
  port: env.REDIS_URL ? Number(new URL(env.REDIS_URL).port) || 6379 : 6379,
};

export const jobQueue = new Queue<JobData>("ocr-jobs", {
  connection,
  defaultJobOptions: {
    attempts: DEFAULT_JOB_ATTEMPTS,
    backoff: {
      delay: DEFAULT_BACKOFF_DELAY,
      type: "exponential",
    },
    removeOnComplete: {
      age: DEFAULT_JOB_RETENTION_COMPLETE,
      count: MAX_COMPLETED_JOBS,
    },
    removeOnFail: {
      age: DEFAULT_JOB_RETENTION_FAIL,
    },
  },
});

export const addJob = async (data: JobData): Promise<string> => {
  const job = await jobQueue.add("process-document", data, {
    jobId: data.jobId,
  });
  return job.id ?? data.jobId;
};

export const checkQueueHealth = async (): Promise<boolean> => {
  try {
    await jobQueue.getJobCounts();
    return true;
  } catch {
    return false;
  }
};
