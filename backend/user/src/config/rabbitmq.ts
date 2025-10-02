import amqp from 'amqplib'

let channel:amqp.Channel;

export const connectRabbitMQ = async() =>{
    try{
        const connection=await amqp.connect({
            protocol:"amqp",
            hostname:process.env.RABBITMQ_HOST!,
            port:5672,
            username:process.env.RABBITMQ_USERNAME!,
            password:process.env.RABBITMQ_PASSWORD!,

        });
        channel=await connection.createChannel()
        console.log("✅ Connected to Rabbit")
    }
    catch(e){
        console.log("Failed to connect to RabbitMQ",e);
    }
};
export const publishToQueue=async(queueName:string,message:any)=>{
    if(!channel){
        console.log("RabbitMQ channel is not initialised");
        return;
    }
    await channel.assertQueue(queueName,{durable:true});

    channel.sendToQueue(queueName, Buffer.from(JSON.stringify(message)),{
        persistent:false
    });
};