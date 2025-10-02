"use client"

import {io, Socket } from "socket.io-client"
import { createContext, ReactNode,useContext,useEffect, useState } from "react";
import { chat_service, useAppData } from "./AppContext";

interface SocketContextType{
    socket: Socket | null;
    onlineUsers?: string[];
    sendMessage: (message: any) => void;
    sendTyping: (data: { chatId: string; userId: string }) => void;
    sendStopTyping: (data: { chatId: string; userId: string }) => void;
}

const SocketContext= createContext<SocketContextType>({
    socket:null,
    onlineUsers:[],
    sendMessage: () => {},
    sendTyping: () => {},
    sendStopTyping: () => {},
});

interface ProviderProps{
    children: React.ReactNode;
}

export const SocketProvider= ({children}:ProviderProps)=>{
    const [socket,setSocket]= useState<Socket|null>(null)
    const {user}= useAppData();
    const [onlineUsers,setOnlineUsers]= useState<string[]>([]);

    useEffect(()=>{
        if(!user?._id) return;

        const newSocket=io(chat_service,{
            query:{
                userId:user._id
            }
        });

        newSocket.on("connect", () => {
            console.log("Socket.io connected:", newSocket.id);
        });

        setSocket(newSocket);

        newSocket.on("getOnlineUser",(users:string[])=>{
          setOnlineUsers(users);
        });


        return ()=>{
           newSocket.disconnect(); 
        };
    },[user?._id]);

    // Socket functions
    const sendMessage = (message: any) => {
        if (socket) {
            socket.emit("newMessage", message);
        }
    };

    const sendTyping = (data: { chatId: string; userId: string }) => {
        if (socket) {
            socket.emit("typing", data);
        }
    };

    const sendStopTyping = (data: { chatId: string; userId: string }) => {
        if (socket) {
            socket.emit("stopTyping", data);
        }
    };

    return (
        <SocketContext.Provider value={{ socket, onlineUsers, sendMessage, sendTyping, sendStopTyping }}>
            {children}
        </SocketContext.Provider>
    );
} 

export const SocketData=()=> useContext(SocketContext);