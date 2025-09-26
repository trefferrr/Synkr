import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();
const connectDB = async () => {
    const url = process.env.MONGO_URI;
    if (!url) {
        throw new Error("MONGO_URI is not defined");
    }
    try {
        await mongoose.connect(url, {
            dbName: "Synkr_app"
        });
        console.log("Connected to MongoDB");
    }
    catch (error) {
        console.error("Failed to connect to MongoDB", error);
        process.exit(1);
    }
};
export default connectDB;
//# sourceMappingURL=db.js.map