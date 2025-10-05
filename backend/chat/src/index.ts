import express from 'express';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import chatRoutes from './routes/chat.js';
import cors from 'cors';
import { app , server} from './config/socket.js';

dotenv.config()

connectDB();

app.use(express.json());

app.use(cors({
    origin: [
        'https://frontend-fw0r5mpky-adityas-projects-6d993e50.vercel.app',
        'http://localhost:3000' 
    ],
    credentials: true
}));

app.use("/api/v1",chatRoutes);
 
const port = Number(process.env.PORT) || 5002;

server.listen(port, '0.0.0.0', () => {
    console.log(`Server is running on port ${port}`);
});
