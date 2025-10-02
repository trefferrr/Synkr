import {Server, Socket} from 'socket.io'
import http from 'http'
import express from 'express'

const app= express()

const server=http.createServer(app);

const io= new Server(server, {
    cors:{
        origin:'*',
        methods:['GET','POST']
    },
});

const userSocketMap: Record<string,string>= {};

io.on('connection', (socket: Socket)=>{
    console.log("User Connected", socket.id);

    socket.on("connect", () => {
        console.log("Socket.io server: client connected event", socket.id);
    });

    const userId = socket.handshake.query.userId as string | undefined;

    if (userId && userId !== 'undefined') {
        userSocketMap[userId] = socket.id;
        console.log(`User ${userId} mapped to socket ${socket.id}`);
    }

    io.emit("getOnlineUser", Object.keys(userSocketMap));

    if(userId){
        socket.join(userId);   
    }

   socket.on("typing",(data)=>{
console.log(`User ${data.userId} is typing in chat ${data.chatId} `);
  socket.to(data.chatId).emit("userTyping",{
    chatId: data.chatId,
    userId: data.userId
  });
   })

   socket.on("stopTyping",(data)=>{
    console.log(`User ${data.userId} stopped typing in chat ${data.chatId} `);
    socket.to(data.chatId).emit("userStopTyping",{
        chatId: data.chatId,
        userId: data.userId
    });
   })

   socket.on("joinChat",(chatId)=>{
    socket.join(chatId);
    console.log(`User ${userId} joined chat ${chatId} `);

   })

   socket.on("leaveChat",(chatId)=>{
   socket.leave(chatId);
   console.log(`User ${userId} left chat ${chatId} `);
   })

    socket.on("disconnect",()=>{
        console.log("User Disconnected", socket.id);

        if(userId){
            delete userSocketMap[userId]
            console.log(`User ${userId} removed from online users`);
            io.emit("getOnlineUser", Object.keys(userSocketMap));
        }
    });

    

    socket.on("connect_error", (err)=>{
        console.log('Socket connection Error:',err);
    })

    // Handle new message events
    socket.on("newMessage", (message) => {
        console.log("New message received:", message);
        // Broadcast the message to all users in the chat
        socket.broadcast.emit("messageReceived", message);
    });

    // Handle typing events
    socket.on("typing", (data) => {
        console.log("User typing:", data);
        socket.broadcast.emit("userTyping", data);
    });

    socket.on("stopTyping", (data) => {
        console.log("User stopped typing:", data);
        socket.broadcast.emit("userStopTyping", data);
    });

})

export {app, server,io};
