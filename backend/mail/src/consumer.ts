import amqp from "amqplib"
import nodemailer from "nodemailer"
import dontenv from "dotenv"
dontenv.config();

export const startSendOtpConsumer=async()=>{
    try{
        const connection=await amqp.connect({
            protocol:"amqp",
            hostname:process.env.RABBITMQ_HOST!,
            port:5672,
            username:process.env.RABBITMQ_USERNAME!,
            password:process.env.RABBITMQ_PASSWORD!,

        });
        const channel=await connection.createChannel()

        const queuename="send-otp"

        await channel.assertQueue(queuename,{durable:true});
        console.log("✅ Mail Service consumer started, listening for otp emails");
        channel.consume(queuename,async(msg)=>{
            if(msg){
                try{
                 const{to,subject,body}=JSON.parse(msg.content.toString())

                 const smtpUser=process.env.SMTP_USER || process.env.USER
                 const smtpPass=process.env.SMTP_PASSWORD || process.env.PASSWORD

                 if(!smtpUser || !smtpPass){
                    console.error("Mail service: Missing SMTP credentials. Set SMTP_USER/SMTP_PASSWORD (or USER/PASSWORD).")
                    return;
                 }

                 const transporter=nodemailer.createTransport({
                    host:"smtp.gmail.com",
                    port:465,
                    secure:true,
                    auth:{
                        user:smtpUser,
                        pass:smtpPass
                    }
                 });
                 await transporter.sendMail({
                    from:`Synkr <${smtpUser}>`,
                    to,
                    subject,
                    text:body
                 })
                 console.log(`OTP mail sent ${to}`)

                }
                catch(e){
                    console.log("Failed to send otp",e)
                }
            }
        })
    }
    catch(e){
        console.log("Failed to start rabbitmq consumer",e);
    }
}