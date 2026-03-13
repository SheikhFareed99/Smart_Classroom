// voice_service/middleware/auth.ts
// TEMP: auth bypassed — revisit with team for VC-3
type Request = import("express").Request;
type Response = import("express").Response;
type NextFunction = import("express").NextFunction;
type Socket = import("socket.io").Socket;

const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  next(); // TODO: re-enable when auth strategy confirmed
};

const requireAuthSocket = (socket: Socket, next: (err?: Error) => void) => {
  (socket as any).user = { userId: "dev", email: "dev@temp.com", name: "Dev User" };
  next(); // TODO: re-enable when auth strategy confirmed
};

export = { requireAuth, requireAuthSocket };