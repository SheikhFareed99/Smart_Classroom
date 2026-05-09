import express from "express";
import session from "express-session";
import passport from "passport";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";

import authRoutes from "./routes/auth";
import courseRouter from "./routes/course";
import voiceAuthRouter from "./routes/voiceAuth";
import deliverableRouter from "./routes/deliverable";
import materialRouter from "./routes/material";
import whiteboardRouter from "./routes/whiteboard";
import announcementRouter from "./routes/announcement";
import todoRouter from "./routes/todo";
import studentTodoRouter from "./routes/studentTodo";
import studentEventRouter from "./routes/studentEvent";
import chatbotRouter from "./routes/chatbot";

import "./config/passport";

dotenv.config();



const isProduction = process.env.NODE_ENV === "production";
const sessionMaxAgeMs = Number(process.env.SESSION_TIMEOUT_MS || 1000 * 60 * 60 * 2);

// Build an allowlist from env vars — supports both FRONTEND_ORIGIN and APP_BASE_URL
// NOTE: cannot use origin:'*' with credentials:true, so we use a function
const allowedOrigins = [
  process.env.FRONTEND_ORIGIN,
  process.env.APP_BASE_URL,
  "http://localhost:5173",
  "http://localhost:3000",
].filter(Boolean).map(o => o!.replace(/\/$/, "")) as string[];

if (!process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET is required");
}



const app = express();

if (isProduction) {
  app.set("trust proxy", 1);
}

// CORS — allow all configured origins with credentials
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g., server-to-server, curl)
    if (!origin) return callback(null, true);
    const clean = origin.replace(/\/$/, "");
    if (allowedOrigins.includes(clean)) {
      return callback(null, true);
    }
    console.warn(`CORS blocked origin: ${origin}`);
    return callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));

app.use(cookieParser());
app.use(express.json());

// Sessions (MemoryStore for local/dev simplicity)
app.use(
  session({
    name: process.env.SESSION_COOKIE_NAME || "aico.sid",
    secret: process.env.SESSION_SECRET as string,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    unset: "destroy",
    cookie: {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      maxAge: sessionMaxAgeMs,
    },
  })
);

// Passport

app.use(passport.initialize());
app.use(passport.session());

// FOR DEBUGGING PURPOSES ONLY, WE SERVE STATIC HTML FILES
app.use(express.static("src/public"));

// Routes
app.use("/api/auth", voiceAuthRouter);
app.use("/auth", authRoutes);
app.use("/api/courses", courseRouter);
app.use("/api", deliverableRouter);
app.use("/api", materialRouter);
app.use("/api/whiteboard", whiteboardRouter);
app.use("/api/announcements", announcementRouter);
app.use("/api/todo", todoRouter);
app.use("/api/student-todos", studentTodoRouter);
app.use("/api/student-events", studentEventRouter);
app.use("/api/chatbot", chatbotRouter);
app.get("/", (req, res) => {
  res.send("Home");
});

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err?.code === "EBADCSRFTOKEN") {
    return res.status(403).json({ message: "Invalid CSRF token" });
  }
  return next(err);
});

export default app;