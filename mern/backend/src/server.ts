

import dns from 'node:dns';
dns.setDefaultResultOrder('ipv4first');
import dotenv from 'dotenv';
import connectDB from './config/db';
import app from './app';
import { startNotificationWorker, stopNotificationWorker } from './notifications';

dotenv.config();

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
    const server = app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });

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
