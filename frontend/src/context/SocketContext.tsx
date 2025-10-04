"use client"

import {io, Socket } from "socket.io-client"
import { createContext, ReactNode,useContext,useEffect, useState, useCallback } from "react";
import { chat_service, useAppData } from "./AppContext";

interface SocketContextType{
    socket: Socket | null;
    onlineUsers?: string[];
    sendMessage: (message: any) => void;
    sendTyping: (data: { chatId: string; userId: string }) => void;
    sendStopTyping: (data: { chatId: string; userId: string }) => void;
    onMessageReceived?: (callback: (message: any) => void) => void;
    offMessageReceived?: (callback: (message: any) => void) => void;
}

const SocketContext= createContext<SocketContextType>({
    socket:null,
    onlineUsers:[],
    sendMessage: () => {},
    sendTyping: () => {},
    sendStopTyping: () => {},
    onMessageReceived: () => {},
    offMessageReceived: () => {},
});

interface ProviderProps{
    children: React.ReactNode;
}

export const SocketProvider= ({children}:ProviderProps)=>{
    const [socket,setSocket]= useState<Socket|null>(null)
    const {user}= useAppData();
    const [onlineUsers,setOnlineUsers]= useState<string[]>([]);
    const [messageCallbacks, setMessageCallbacks] = useState<Set<(message: any) => void>>(new Set());

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

        newSocket.on("disconnect", () => {
            console.log("Socket.io disconnected");
        });

        newSocket.on("connect_error", (error) => {
            console.log("Socket.io connection error:", error);
        });

        setSocket(newSocket);

        newSocket.on("getOnlineUser",(users:string[])=>{
          setOnlineUsers(users);
        });

        // Global message handler
        newSocket.on("messageReceived", (message: any) => {
          messageCallbacks.forEach(callback => callback(message));
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

    const onMessageReceived = useCallback((callback: (message: any) => void) => {
        setMessageCallbacks(prev => new Set([...prev, callback]));
    }, []);

    const offMessageReceived = useCallback((callback: (message: any) => void) => {
        setMessageCallbacks(prev => {
            const newSet = new Set(prev);
            newSet.delete(callback);
            return newSet;
        });
    }, []);

    return (
        <SocketContext.Provider value={{ socket, onlineUsers, sendMessage, sendTyping, sendStopTyping, onMessageReceived, offMessageReceived }}>
            {children}
        </SocketContext.Provider>
    );
} 

export const SocketData=()=> useContext(SocketContext);