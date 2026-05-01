import {
  NotificationChannel,
  NotificationEventName,
  NotificationEventPayloadMap,
  NotificationRecipient,
} from "./types";
import {
  getActiveStudentRecipientsForCourse,
  makeSingleRecipient,
} from "./recipientResolvers";

interface EventDefinition<TName extends NotificationEventName> {
  resolveRecipients: (
    payload: NotificationEventPayloadMap[TName]
  ) => Promise<NotificationRecipient[]>;
  buildIdempotencyKey: (
    payload: NotificationEventPayloadMap[TName],
    recipient: NotificationRecipient,
    channel: NotificationChannel
  ) => string;
}

type NotificationEventDefinitionMap = {
  [TName in NotificationEventName]: EventDefinition<TName>;
};

const eventDefinitions: NotificationEventDefinitionMap = {
  "course.announcement.created": {
    resolveRecipients: async (payload) =>
      getActiveStudentRecipientsForCourse(payload.courseId),
    buildIdempotencyKey: (payload, recipient, channel) =>
      `${channel}:course.announcement.created:${payload.announcementId}:${recipient.email}`,
  },
  "course.material.created": {
    resolveRecipients: async (payload) =>
      getActiveStudentRecipientsForCourse(payload.courseId),
    buildIdempotencyKey: (payload, recipient, channel) =>
      `${channel}:course.material.created:${payload.materialId}:${recipient.email}`,
  },
  "course.deliverable.created": {
    resolveRecipients: async (payload) =>
      getActiveStudentRecipientsForCourse(payload.courseId),
    buildIdempotencyKey: (payload, recipient, channel) =>
      `${channel}:course.deliverable.created:${payload.deliverableId}:${recipient.email}`,
  },
  "submission.graded": {
    resolveRecipients: async (payload) =>
      makeSingleRecipient({
        email: payload.studentEmail,
        userId: payload.studentId,
        name: payload.studentName,
      }),
    buildIdempotencyKey: (payload, recipient, channel) =>
      `${channel}:submission.graded:${payload.submissionId}:${payload.grade}:${recipient.email}`,
  },
};

export const getEventDefinition = <TName extends NotificationEventName>(
  name: TName
): EventDefinition<TName> => eventDefinitions[name];
