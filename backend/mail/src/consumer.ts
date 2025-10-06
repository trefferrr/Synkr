import amqp from "amqplib";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

export const startSendOtpConsumer = async () => {
  try {
    // Connect to RabbitMQ
    const connection = await amqp.connect({
      protocol: "amqp",
      hostname: process.env.RABBITMQ_HOST,
      port: 5672,
      username: process.env.RABBITMQ_USERNAME,
      password: process.env.RABBITMQ_PASSWORD,
    });

    const channel = await connection.createChannel();
    const queueName = "send-otp";

    await channel.assertQueue(queueName, { durable: true });
    console.log("✅ Mail Service consumer started, listening for OTP emails");

    // Setup Nodemailer transporter (Brevo SMTP)
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (!smtpUser || !smtpPass) {
      console.error(
        "❌ Missing SMTP credentials. Please set SMTP_USER and SMTP_PASS in your .env file."
      );
      return;
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp-relay.brevo.com",
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false, // Brevo uses STARTTLS on port 587
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    // Consume queue messages
    channel.consume(queueName, async (msg) => {
      if (!msg) return;

      try {
        const { to, subject, body } = JSON.parse(msg.content.toString());

        await transporter.sendMail({
          from: `"Synkr" <${smtpUser}>`,
          to,
          subject,
          text: body,
        });

        console.log(`📧 OTP mail sent to ${to}`);
        channel.ack(msg);
      } catch (err:any) {
        console.error("❌ Failed to send OTP:", err.message);
        channel.nack(msg, false, false);
      }
    });
  } catch (err:any) {
    console.error("🚨 Failed to start RabbitMQ consumer:", err.message);
  }
};
