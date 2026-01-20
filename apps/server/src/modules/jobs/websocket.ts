import { auth } from "@ocrbase/auth";
import { db } from "@ocrbase/db";
import { jobs } from "@ocrbase/db/schema/jobs";
import { and, eq } from "drizzle-orm";
import { Elysia } from "elysia";

import {
  subscribeToJob,
  unsubscribeFromJob,
  type JobUpdateMessage,
} from "../../services/websocket";

interface WebSocketData {
  jobId: string;
  userId: string;
  organizationId: string;
  callback: (message: JobUpdateMessage) => void;
}

export const jobsWebSocket = new Elysia().ws("/ws/jobs/:jobId", {
  close(ws) {
    const { wsData } = ws.data as unknown as { wsData?: WebSocketData };

    if (wsData) {
      unsubscribeFromJob(wsData.jobId, wsData.callback);
    }
  },

  message(ws, message) {
    if (typeof message === "string") {
      try {
        const parsed = JSON.parse(message) as { type?: string };
        if (parsed.type === "ping") {
          ws.send(JSON.stringify({ type: "pong" }));
        }
      } catch {
        // Ignore invalid messages
      }
    }
  },

  async open(ws) {
    const { jobId } = ws.data.params;

    const headers = new Headers();
    const cookie = ws.data.headers?.cookie;

    if (cookie) {
      headers.set("cookie", cookie);
    }

    const session = await auth.api.getSession({
      headers,
    });

    if (!session?.user) {
      ws.send(JSON.stringify({ error: "Unauthorized", type: "error" }));
      ws.close();
      return;
    }

    const userId = session.user.id;
    const activeOrg = session.session.activeOrganizationId;

    if (!activeOrg) {
      ws.send(
        JSON.stringify({ error: "No active organization", type: "error" })
      );
      ws.close();
      return;
    }

    const job = await db.query.jobs.findFirst({
      where: and(eq(jobs.id, jobId), eq(jobs.organizationId, activeOrg)),
    });

    if (!job) {
      ws.send(JSON.stringify({ error: "Job not found", type: "error" }));
      ws.close();
      return;
    }

    const callback = (message: JobUpdateMessage): void => {
      ws.send(JSON.stringify(message));
    };

    (ws.data as unknown as { wsData: WebSocketData }).wsData = {
      callback,
      jobId,
      organizationId: activeOrg,
      userId,
    };

    subscribeToJob(jobId, callback);

    ws.send(
      JSON.stringify({
        data: { status: job.status },
        jobId,
        type: "status",
      })
    );
  },
});
