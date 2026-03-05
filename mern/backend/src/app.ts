import express from "express";
import session from "express-session";
import passport from "passport";
import mongoose from "mongoose";
import dotenv from "dotenv";

import authRoutes from "./routes/auth";
import "./config/passport";

dotenv.config();

const app = express();


// Sessions
app.use(
  session({
    secret: process.env.SESSION_SECRET as string,
    resave: false,
    saveUninitialized: false
  })
);

// Passport
app.use(passport.initialize());
app.use(passport.session());

// FOR DEBUGGING PURPOSES ONLY, WE SERVE STATIC HTML FILES

app.use(express.static("src/public"));


// Routes
app.use("/auth", authRoutes);

app.get("/", (req, res) => {
  res.send("Home");
});

export default app;