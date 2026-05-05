export {};

declare global {
  namespace Express {
    interface Request {
      voiceUser?: { userId: string; email?: string; name?: string };
    }
  }
}
