import { notificationConfig } from "./config";
import { NotificationChannel, NotificationEventName } from "./types";

export const resolveChannelsForEvent = (
  eventName: NotificationEventName
): NotificationChannel[] => {
  if (!notificationConfig.enabled) return [];
  if (notificationConfig.disabledEvents.has(eventName)) return [];

  const channels: NotificationChannel[] = [];
  if (notificationConfig.email.enabled) channels.push("email");

  return channels;
};
