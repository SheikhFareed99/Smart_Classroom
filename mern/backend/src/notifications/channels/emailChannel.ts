import nodemailer, { SendMailOptions, Transporter } from "nodemailer";
import { notificationConfig } from "../config";

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export interface EmailChannel {
  send: (message: EmailMessage) => Promise<void>;
}

class SmtpEmailChannel implements EmailChannel {
  private transporter: Transporter | null = null;

  private getTransporter(): Transporter {
    if (this.transporter) return this.transporter;

    const { host, port, secure, user, pass } = notificationConfig.email;

    if (!host || !user || !pass) {
      throw new Error("SMTP is not configured: set SMTP_HOST, SMTP_USER, SMTP_PASS");
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });

    return this.transporter;
  }

  async send(message: EmailMessage): Promise<void> {
    const transporter = this.getTransporter();

    const mail: SendMailOptions = {
      from: `${notificationConfig.email.fromName} <${notificationConfig.email.fromAddress}>`,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    };

    await transporter.sendMail(mail);
  }
}

let singleton: EmailChannel | null = null;

export const getEmailChannel = (): EmailChannel => {
  if (!singleton) singleton = new SmtpEmailChannel();
  return singleton;
};
