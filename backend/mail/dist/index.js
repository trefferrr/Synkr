import express from "express";
import dotenv from "dotenv";
import { startSendOtpConsumer } from "./consumer.js";
const app = express();
dotenv.config();
startSendOtpConsumer();
const port = process.env.PORT || 6000;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
//# sourceMappingURL=index.js.map