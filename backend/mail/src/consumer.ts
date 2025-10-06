import amqp from "amqplib";
import dotenv from "dotenv";
import { Resend } from "resend";

dotenv.config();

export const startSendOtpConsumer = async () => {
  try {
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

    const resend = new Resend(process.env.RESEND_API_KEY);
    {/*hi*/}
    channel.consume(queueName, async (msg) => {
      if (msg) {
        try {
          const { to, subject, body } = JSON.parse(msg.content.toString());

          if (!to || !subject || !body) {
            console.error("❌ Missing email parameters in message:", msg.content.toString());
            channel.nack(msg, false, false);
            return;
          }

          const fromEmail = process.env.FROM_EMAIL || "onboarding@resend.dev";

          // Send email using Resend
          const response = await resend.emails.send({
            from: `Synkr <${fromEmail}>`,
            to,
            subject,
            html: `<p>${body}</p>`,
          });

          // Handle Resend response: log id if available, else log the whole response
          if ('data' in response && response.data && 'id' in response.data) {
            console.log(`✅ OTP mail sent to ${to}:`, response.data.id);
          } else {
            console.log(`✅ OTP mail sent to ${to}:`, response);
          }
          channel.ack(msg); // mark as processed
        } catch (error) {
          console.error("❌ Failed to send OTP:", error);
          channel.nack(msg, false, false); // reject message
        }
      }
    });
  } catch (error) {
    console.error("❌ Failed to start RabbitMQ consumer:", error);
  }
};
