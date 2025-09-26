import express from 'express'
import dotenv from 'dotenv'
import connectDB from './config/db.js'
import { createClient } from 'redis'
import userRoutes from './routes/user.js'
import { connectRabbitMQ } from './config/rabbitmq.js'
import cors from 'cors';

dotenv.config()


await connectDB();

await connectRabbitMQ();

export const redisClient = createClient({
    url : process.env.REDIS_URL!,
});
await redisClient
.connect()
.then(()=>console.log("Connected to Redis"))
.catch(console.error)

const app = express()


app.use(express.json());

app.use(cors());

app.use("/api/v1",userRoutes);

const port = process.env.PORT || 5000


app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});