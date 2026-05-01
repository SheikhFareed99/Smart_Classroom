import NotificationOutbox, {
  INotificationOutbox,
} from "../models/notificationOutbox.model";
import { notificationConfig } from "./config";
import { getEmailChannel } from "./channels/emailChannel";
import { renderEmailTemplate } from "./templateRegistry";
import { NotificationEventName } from "./types";

let timer: NodeJS.Timeout | null = null;
let inFlight = false;

const computeBackoffMs = (attempt: number): number => {
  const base = notificationConfig.retryBaseDelayMs;
  return base * Math.max(1, attempt * attempt);
};

const recoverStaleProcessingJobs = async (): Promise<void> => {
  const staleBefore = new Date(
    Date.now() - notificationConfig.processingLockTimeoutMs
  );

  await NotificationOutbox.updateMany(
    {
      status: "processing",
      lockedAt: { $lte: staleBefore },
    },
    {
      $set: {
        status: "failed",
        nextAttemptAt: new Date(),
        lastError: "Recovered stale processing lock",
      },
      $unset: {
        lockedAt: "",
      },
    }
  );
};

const reserveJob = async (
  jobId: string
): Promise<INotificationOutbox | null> => {
  return NotificationOutbox.findOneAndUpdate(
    {
      _id: jobId,
      status: { $in: ["pending", "failed"] },
    },
    {
      $set: {
        status: "processing",
        lockedAt: new Date(),
      },
    },
    { new: true }
  );
};

const markSent = async (jobId: string): Promise<void> => {
  await NotificationOutbox.findByIdAndUpdate(jobId, {
    $set: {
      status: "sent",
      sentAt: new Date(),
    },
    $unset: {
      lastError: "",
      lockedAt: "",
    },
  });
};

const markFailed = async (
  reserved: INotificationOutbox,
  error: unknown
): Promise<void> => {
  const attempts = reserved.attempts + 1;
  const isDead = attempts >= reserved.maxAttempts;

  await NotificationOutbox.findByIdAndUpdate(reserved._id, {
    $set: {
      status: isDead ? "dead" : "failed",
      attempts,
      nextAttemptAt: isDead
        ? null
        : new Date(Date.now() + computeBackoffMs(attempts)),
      lastError: error instanceof Error ? error.message : String(error),
    },
    $unset: {
      lockedAt: "",
    },
  });
};

const sendJob = async (reserved: INotificationOutbox): Promise<void> => {
  const eventName = reserved.eventName as NotificationEventName;

  if (reserved.channel === "email") {
    const emailTemplate = renderEmailTemplate(
      eventName,
      reserved.payload as never,
      reserved.recipient
    );

    await getEmailChannel().send({
      to: reserved.recipient.email,
      subject: emailTemplate.subject,
      text: emailTemplate.text,
      html: emailTemplate.html,
    });

    return;
  }

  throw new Error(`Unsupported notification channel: ${reserved.channel}`);
};

export const processNotificationOutboxBatch = async (): Promise<void> => {
  if (!notificationConfig.enabled) return;
  if (inFlight) return;

  inFlight = true;
  try {
    await recoverStaleProcessingJobs();

    const dueJobs = await NotificationOutbox.find({
      status: { $in: ["pending", "failed"] },
      nextAttemptAt: { $lte: new Date() },
    })
      .sort({ nextAttemptAt: 1, createdAt: 1 })
      .limit(notificationConfig.outboxBatchSize)
      .select("_id");

    for (const due of dueJobs) {
      const reserved = await reserveJob(String(due._id));
      if (!reserved) continue;

      try {
        await sendJob(reserved);
        await markSent(String(reserved._id));
      } catch (error) {
        await markFailed(reserved, error);
      }
    }
  } catch (error) {
    console.error("Notification worker batch failed:", error);
  } finally {
    inFlight = false;
  }
};

export const startNotificationWorker = (): void => {
  if (!notificationConfig.enabled) {
    console.log("Notifications disabled. Worker not started.");
    return;
  }

  if (timer) return;

  timer = setInterval(() => {
    processNotificationOutboxBatch().catch((error) => {
      console.error("Notification worker error:", error);
    });
  }, notificationConfig.workerPollMs);

  processNotificationOutboxBatch().catch((error) => {
    console.error("Notification worker startup batch failed:", error);
  });

  console.log("Notification worker started");
};

export const stopNotificationWorker = (): void => {
  if (!timer) return;
  clearInterval(timer);
  timer = null;
  console.log("Notification worker stopped");
};
