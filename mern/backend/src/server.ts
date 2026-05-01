

import dns from 'node:dns';
dns.setDefaultResultOrder('ipv4first');
import dotenv from 'dotenv';
import connectDB from './config/db';
import app from './app';
import { runAutomaticDeadlinePlagiarismChecks } from "./services/plagiarism.service";
import { startNotificationWorker, stopNotificationWorker } from './notifications';

dotenv.config();

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
    const server = app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });

    const checkerIntervalMs = Number(process.env.PLAGIARISM_DEADLINE_CHECK_INTERVAL_MS || 60_000);
    runAutomaticDeadlinePlagiarismChecks().catch((error) => {
        console.error("initial deadline plagiarism checker failed:", error);
    });
    setInterval(() => {
        runAutomaticDeadlinePlagiarismChecks().catch((error) => {
            console.error("deadline plagiarism checker failed:", error);
        });
    }, checkerIntervalMs);
    startNotificationWorker();

    const shutdown = (signal: string): void => {
        console.log(`Received ${signal}. Shutting down...`);
        stopNotificationWorker();
        server.close(() => {
            process.exit(0);
        });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
});
