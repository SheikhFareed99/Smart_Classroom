import { notificationConfig } from "./config";
import {
  EmailTemplate,
  NotificationEventName,
  NotificationEventPayloadMap,
  NotificationRecipient,
} from "./types";

const escapeHtml = (input: string): string =>
  input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");

const joinUrl = (path: string): string => `${notificationConfig.appBaseUrl}${path}`;

const greeting = (recipient: NotificationRecipient): string => {
  const name = recipient.name?.trim();
  return name ? `Hi ${name},` : "Hi,";
};

export const renderEmailTemplate = <TName extends NotificationEventName>(
  eventName: TName,
  payload: NotificationEventPayloadMap[TName],
  recipient: NotificationRecipient
): EmailTemplate => {
  switch (eventName) {
    case "course.announcement.created": {
      const p = payload as NotificationEventPayloadMap["course.announcement.created"];
      const courseLink = joinUrl(`/enrolled/${p.courseId}`);
      const trimmed = p.announcementText.length > 240
        ? `${p.announcementText.slice(0, 237)}...`
        : p.announcementText;
      const subject = `[${p.courseTitle}] New announcement`;
      return {
        subject,
        text: [
          greeting(recipient),
          "",
          `${p.actorName} posted a new announcement in ${p.courseTitle}.`,
          "",
          `Announcement: ${trimmed}`,
          `Open course: ${courseLink}`,
        ].join("\n"),
        html: `<p>${escapeHtml(greeting(recipient))}</p><p><strong>${escapeHtml(
          p.actorName
        )}</strong> posted a new announcement in <strong>${escapeHtml(
          p.courseTitle
        )}</strong>.</p><p>${escapeHtml(trimmed)}</p><p><a href="${courseLink}">Open course</a></p>`,
      };
    }

    case "course.material.created": {
      const p = payload as NotificationEventPayloadMap["course.material.created"];
      const materialsLink = joinUrl(`/enrolled/${p.courseId}/materials`);
      const subject = `[${p.courseTitle}] New material: ${p.materialTitle}`;
      return {
        subject,
        text: [
          greeting(recipient),
          "",
          `${p.actorName} uploaded new material in ${p.courseTitle}.`,
          `Module: ${p.moduleTitle}`,
          `Material: ${p.materialTitle}`,
          "",
          `Open materials: ${materialsLink}`,
        ].join("\n"),
        html: `<p>${escapeHtml(greeting(recipient))}</p><p><strong>${escapeHtml(
          p.actorName
        )}</strong> uploaded new material in <strong>${escapeHtml(
          p.courseTitle
        )}</strong>.</p><ul><li><strong>Module:</strong> ${escapeHtml(
          p.moduleTitle
        )}</li><li><strong>Material:</strong> ${escapeHtml(
          p.materialTitle
        )}</li></ul><p><a href="${materialsLink}">Open materials</a></p>`,
      };
    }

    case "course.deliverable.created": {
      const p = payload as NotificationEventPayloadMap["course.deliverable.created"];
      const assignmentLink = joinUrl(`/student-assignment/${p.deliverableId}`);
      const due = p.deadline ? new Date(p.deadline).toLocaleString() : "No deadline";
      const subject = `[${p.courseTitle}] New assignment: ${p.deliverableTitle}`;
      return {
        subject,
        text: [
          greeting(recipient),
          "",
          `${p.actorName} posted a new assignment in ${p.courseTitle}.`,
          `Assignment: ${p.deliverableTitle}`,
          `Points: ${p.totalPoints}`,
          `Due: ${due}`,
          "",
          `Open assignment: ${assignmentLink}`,
        ].join("\n"),
        html: `<p>${escapeHtml(greeting(recipient))}</p><p><strong>${escapeHtml(
          p.actorName
        )}</strong> posted a new assignment in <strong>${escapeHtml(
          p.courseTitle
        )}</strong>.</p><ul><li><strong>Assignment:</strong> ${escapeHtml(
          p.deliverableTitle
        )}</li><li><strong>Points:</strong> ${p.totalPoints}</li><li><strong>Due:</strong> ${escapeHtml(
          due
        )}</li></ul><p><a href="${assignmentLink}">Open assignment</a></p>`,
      };
    }

    case "submission.graded": {
      const p = payload as NotificationEventPayloadMap["submission.graded"];
      const assignmentLink = joinUrl(`/student-assignment/${p.deliverableId}`);
      const subject = `[${p.courseTitle}] Your assignment was graded`;
      return {
        subject,
        text: [
          greeting(recipient),
          "",
          `${p.actorName} graded your assignment in ${p.courseTitle}.`,
          `Assignment: ${p.deliverableTitle}`,
          `Grade: ${p.grade}/${p.totalPoints}`,
          "",
          `Open assignment: ${assignmentLink}`,
        ].join("\n"),
        html: `<p>${escapeHtml(greeting(recipient))}</p><p><strong>${escapeHtml(
          p.actorName
        )}</strong> graded your assignment in <strong>${escapeHtml(
          p.courseTitle
        )}</strong>.</p><ul><li><strong>Assignment:</strong> ${escapeHtml(
          p.deliverableTitle
        )}</li><li><strong>Grade:</strong> ${p.grade}/${p.totalPoints}</li></ul><p><a href="${assignmentLink}">Open assignment</a></p>`,
      };
    }

    default:
      return {
        subject: "New notification",
        text: `${greeting(recipient)}\n\nYou have a new notification.`,
        html: `<p>${escapeHtml(greeting(recipient))}</p><p>You have a new notification.</p>`,
      };
  }
};
