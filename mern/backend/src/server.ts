import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './db'
dotenv.config();
connectDB()
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());



app.get('/', (req: Request, res: Response) => {
    res.send('Hello from MERN Backend (TypeScript)!');
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
