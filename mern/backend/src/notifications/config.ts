const boolFromEnv = (value: string | undefined, fallback: boolean): boolean => {
  if (value === undefined) return fallback;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
};

const numberFromEnv = (value: string | undefined, fallback: number): number => {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const csvFromEnv = (value: string | undefined): string[] => {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

export const notificationConfig = {
  enabled: boolFromEnv(process.env.NOTIFICATIONS_ENABLED, true),
  outboxBatchSize: numberFromEnv(process.env.NOTIFICATION_OUTBOX_BATCH_SIZE, 30),
  workerPollMs: numberFromEnv(process.env.NOTIFICATION_WORKER_POLL_MS, 5000),
  processingLockTimeoutMs: numberFromEnv(process.env.NOTIFICATION_PROCESSING_LOCK_TIMEOUT_MS, 60000),
  retryBaseDelayMs: numberFromEnv(process.env.NOTIFICATION_RETRY_BASE_DELAY_MS, 10000),
  maxAttempts: numberFromEnv(process.env.NOTIFICATION_MAX_ATTEMPTS, 5),
  appBaseUrl: (process.env.APP_BASE_URL || process.env.FRONTEND_ORIGIN || "http://localhost:5173").replace(/\/$/, ""),
  disabledEvents: new Set(csvFromEnv(process.env.NOTIFICATION_DISABLED_EVENTS)),
  email: {
    enabled: boolFromEnv(process.env.EMAIL_NOTIFICATIONS_ENABLED, true),
    fromAddress: process.env.MAIL_FROM_ADDRESS || process.env.SMTP_USER || "noreply@example.com",
    fromName: process.env.MAIL_FROM_NAME || "AiCo",
    host: process.env.SMTP_HOST,
    port: numberFromEnv(process.env.SMTP_PORT, 587),
    secure: boolFromEnv(process.env.SMTP_SECURE, false),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
};
