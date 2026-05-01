import NotificationOutbox from "../models/notificationOutbox.model";
import { notificationConfig } from "./config";
import { getEventDefinition } from "./eventDefinitions";
import { resolveChannelsForEvent } from "./routingPolicy";
import { NotificationEvent, NotificationEventName } from "./types";

export interface PublishResult {
  queued: number;
  skipped: number;
}

const normalizePayload = <TName extends NotificationEventName>(
  event: NotificationEvent<TName>
): Record<string, unknown> => {
  return { ...event.payload } as Record<string, unknown>;
};

export const publishNotificationEvent = async <TName extends NotificationEventName>(
  event: NotificationEvent<TName>
): Promise<PublishResult> => {
  if (!notificationConfig.enabled) {
    return { queued: 0, skipped: 0 };
  }

  const channels = resolveChannelsForEvent(event.name);
  if (channels.length === 0) {
    return { queued: 0, skipped: 0 };
  }

  const definition = getEventDefinition(event.name);
  const recipients = await definition.resolveRecipients(event.payload);

  if (recipients.length === 0) {
    return { queued: 0, skipped: 0 };
  }

  const payload = normalizePayload(event);
  let queued = 0;
  let skipped = 0;

  for (const channel of channels) {
    for (const recipient of recipients) {
      const idempotencyKey = definition.buildIdempotencyKey(
        event.payload,
        recipient,
        channel
      );

      const result = await NotificationOutbox.updateOne(
        { idempotencyKey },
        {
          $setOnInsert: {
            eventName: event.name,
            channel,
            recipient,
            payload,
            idempotencyKey,
            status: "pending",
            attempts: 0,
            maxAttempts: notificationConfig.maxAttempts,
            nextAttemptAt: new Date(),
          },
        },
        { upsert: true }
      );

      if ((result.upsertedCount || 0) > 0) queued += 1;
      else skipped += 1;
    }
  }

  return { queued, skipped };
};
