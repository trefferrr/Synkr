import { publishToQueue } from "../config/rabbitmq.js";
import TryCatch from "../config/TryCatch.js";
import { redisClient } from "../index.js";
import { User } from "../model/User.js";
import { generateToken } from "../config/generateToken.js";
export const loginUser = TryCatch(async (req, res) => {
    const { email } = req.body;
    const rateLimitKey = `otp:ratelimit:${email}`;
    const rateLimit = await redisClient.get(rateLimitKey);
    if (rateLimit) {
        res.status(429).json({
            message: "Too many req. Please wait before requesting new otp"
        });
        return;
    }
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpKey = `otp:${email}`;
    await redisClient.set(otpKey, otp, {
        EX: 300,
    });
    await redisClient.set(rateLimitKey, "true", {
        EX: 60,
    });
    const message = {
        to: email,
        subject: "You otp code",
        body: `Your OTP is ${otp} is valid for 5 minutes`
    };
    await publishToQueue("send-otp", message);
    res.status(200).json({
        message: "OTP send to your mail"
    });
});
export const verifyUser = TryCatch(async (req, res) => {
    const { email, otp: entredOtp } = req.body;
    if (!email || !entredOtp) {
        res.status(400).json({
            message: "Email & OTP required",
        });
        return;
    }
    const otpKey = `otp:${email}`;
    const storedOtp = await redisClient.get(otpKey);
    if (!storedOtp || storedOtp !== entredOtp) {
        res.status(400).json({
            mesaage: "Invalid or expired OTP",
        });
        return;
    }
    let user = await User.findOne({ email });
    if (!user) {
        const name = email.slice(0, 8);
        user = await User.create({ name, email });
    }
    const token = generateToken(user);
    res.json({
        message: "User Verified",
        user,
        token,
    });
});
export const myProfile = TryCatch(async (req, res) => {
    const user = req.user;
    res.json(user);
});
export const updateName = TryCatch(async (req, res) => {
    // Validate request body
    if (!req.body.name || typeof req.body.name !== 'string') {
        res.status(400).json({
            message: "Name is required and must be a string",
        });
        return;
    }
    const trimmedName = req.body.name.trim();
    if (trimmedName.length < 2 || trimmedName.length > 15) {
        res.status(400).json({
            message: "Name must be between 2 and 15 characters",
        });
        return;
    }
    const user = await User.findById(req.user?._id);
    if (!user) {
        res.status(404).json({
            message: "Please login",
        });
        return;
    }
    // Check if name is already taken by another user
    const existingUser = await User.findOne({
        name: trimmedName,
        _id: { $ne: user._id }
    });
    if (existingUser) {
        res.status(409).json({
            message: "Name is already taken by another user",
        });
        return;
    }
    // If the name is the same, no need to update
    if (user.name === trimmedName) {
        res.status(200).json({
            message: "Name is already up to date",
            user,
            token: generateToken(user),
        });
        return;
    }
    user.name = trimmedName;
    try {
        await user.save();
        const token = generateToken(user);
        res.json({
            message: "Name updated successfully",
            user,
            token,
        });
    }
    catch (error) {
        // Handle MongoDB duplicate key error
        if (error.code === 11000) {
            res.status(400).json({
                message: "Name is already taken by another user",
            });
            return;
        }
        // Re-throw other errors to be handled by TryCatch
        throw error;
    }
});
export const getAllUsers = TryCatch(async (req, res) => {
    const users = await User.find();
    res.json(users);
});
export const getUser = TryCatch(async (req, res) => {
    const user = await User.findById(req.params.id);
    res.json(user);
});
//# sourceMappingURL=user.js.map