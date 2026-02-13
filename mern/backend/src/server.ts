import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// // MongoDB Connection
// const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mern_setup_db';

// mongoose.connect(MONGODB_URI)
//     .then(() => console.log('MongoDB connected'))
//     .catch((err) => console.log(err));

app.get('/', (req: Request, res: Response) => {
    res.send('Hello from MERN Backend (TypeScript)!');
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
