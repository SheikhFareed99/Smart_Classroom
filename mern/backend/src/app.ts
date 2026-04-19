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
import announcementRouter from "./routes/announcement";
import chatbotRouter from "./routes/chatbot";
import { csrfProtection, initCsrfProtection } from "./security/csrf";

import "./config/passport";

dotenv.config();

const isProduction = process.env.NODE_ENV === "production";
const sessionMaxAgeMs = Number(process.env.SESSION_TIMEOUT_MS || 1000 * 60 * 60 * 2);
const frontendOrigin = process.env.FRONTEND_ORIGIN || "http://localhost:5173";

if (!process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET is required");
}

if (isProduction) {
  // trust first proxy in production deployments (e.g., reverse proxy / load balancer)
}

initCsrfProtection({ isProduction });

const app = express();

if (isProduction) {
  app.set("trust proxy", 1);
}

// CORS
app.use(cors({
  origin: frontendOrigin,
  credentials: true
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

app.use(csrfProtection);

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
app.use("/api/announcements", announcementRouter);
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