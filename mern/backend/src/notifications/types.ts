export type NotificationChannel = "email";

export type NotificationEventName =
  | "course.announcement.created"
  | "course.material.created"
  | "course.deliverable.created"
  | "submission.graded";

export interface CourseAnnouncementCreatedPayload {
  courseId: string;
  courseTitle: string;
  announcementId: string;
  announcementText: string;
  actorName: string;
}

export interface CourseMaterialCreatedPayload {
  courseId: string;
  courseTitle: string;
  moduleId: string;
  moduleTitle: string;
  materialId: string;
  materialTitle: string;
  actorName: string;
}

export interface CourseDeliverableCreatedPayload {
  courseId: string;
  courseTitle: string;
  deliverableId: string;
  deliverableTitle: string;
  deadline?: string;
  totalPoints: number;
  actorName: string;
}

export interface SubmissionGradedPayload {
  courseId: string;
  courseTitle: string;
  submissionId: string;
  deliverableId: string;
  deliverableTitle: string;
  grade: number;
  totalPoints: number;
  studentId: string;
  studentEmail: string;
  studentName?: string;
  actorName: string;
}

export interface NotificationEventPayloadMap {
  "course.announcement.created": CourseAnnouncementCreatedPayload;
  "course.material.created": CourseMaterialCreatedPayload;
  "course.deliverable.created": CourseDeliverableCreatedPayload;
  "submission.graded": SubmissionGradedPayload;
}

export interface NotificationRecipient {
  email: string;
  userId?: string;
  name?: string;
}

export interface NotificationEvent<TName extends NotificationEventName = NotificationEventName> {
  name: TName;
  payload: NotificationEventPayloadMap[TName];
}

export interface EmailTemplate {
  subject: string;
  text: string;
  html: string;
}

export type NotificationJobStatus = "pending" | "processing" | "failed" | "sent" | "dead";
