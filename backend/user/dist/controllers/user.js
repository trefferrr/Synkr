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
//# sourceMappingURL=user.js.map