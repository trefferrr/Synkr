"use client";
import ChatSidebar from "@/components/ChatSidebar";
import AppRail from "@/components/AppRail";
import Loading from "@/components/Loading";
import { chat_service, useAppData, User } from "@/context/AppContext";
import { useRouter } from "next/navigation";
import React, { useEffect, useRef, useState, useCallback } from "react";
import Cookies from "js-cookie";
import toast from "react-hot-toast";
import axios from "axios";
import ChatHeader from "@/components/ChatHeader";
import ChatMessages from "@/components/ChatMessages";
import MessageInput from "@/components/MessageInput";
import { SocketData } from "@/context/SocketContext";
import { ArrowLeft, ArrowRight, Send } from "lucide-react";

export interface Message {
  _id: string;
  chatId: string;
  senderId: string;
  text?: string;
  image?: {
    url: string;
    publicId: string;
  };
  messageType: "text" | "image";
  seen: boolean;
  seenAt?: string;
  createdAt: string;
}
const ChatApp = () => {
  const {
    loading,
    isAuth,
    logoutUser,
    chats,
    user: loggedInUser,
    users,
    fetchChats,
    setChats,
  } = useAppData();

  const {onlineUsers, socket, sendMessage, sendTyping, sendStopTyping, onMessageReceived, offMessageReceived}= SocketData();

  // Update chat order and latest message when new message is sent or received
  const updateChatOrder = useCallback((chatId: string, newMessage?: any) => {
    setChats((prev) => {
      if (!prev) return prev;
      
      // Find the chat and move it to the top
      const chatIndex = prev.findIndex(chat => chat.chat._id === chatId);
      if (chatIndex === -1) return prev;
      
      const updatedChats = [...prev];
      const [movedChat] = updatedChats.splice(chatIndex, 1);
      
      // Update latest message if provided
      if (newMessage) {
        movedChat.chat.latestMessage = {
          text: newMessage.text || (newMessage.messageType === 'image' ? '📸 Image' : 'File'),
          sender: newMessage.sender,
          createdAt: newMessage.createdAt
        };
        movedChat.chat.updatedAt = new Date().toISOString();
      }
      
      updatedChats.unshift(movedChat);
      
      return updatedChats;
    });
  }, [setChats]);

  console.log(onlineUsers);

  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth <= 768; // Show sidebar by default on mobile
    }
    return false;
  });
  const [user, setUsers] = useState<User | null>(null);
  const [showAllUser, setShowAllUser] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingTimeOut, setTypingTimeOut] = useState<NodeJS.Timeout | null>(
    null
  );
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [previewType, setPreviewType] = useState<'image' | 'document' | null>(null);
  const messageInputRef = useRef<any>(null);
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth > 768;
    }
    return false;
  });
  const [activeFilter, setActiveFilter] = useState<'all'|'favourites'|'hidden'>('all');
  const [replyTo, setReplyTo] = useState<any>(null);

  // Handler for forwarded messages from ChatMessages component
  const handleMessageForwarded = useCallback((message: any) => {
    console.log("Forwarded message received:", message);
    console.log("Current selectedUser:", selectedUser);
    
    // Update chat order for sidebar
    updateChatOrder(message.chatId, message);
    
    // If the forwarded message is for the current chat, add it to messages
    if (message.chatId === selectedUser) {
      console.log("Adding forwarded message to current chat");
      setMessages((prev) => {
        const currentMessages = prev || [];
        const messageExists = currentMessages.some((msg) => msg._id === message._id);
        
        if (!messageExists) {
          console.log("Forwarded message added to current chat");
          return [...currentMessages, message];
        }
        console.log("Forwarded message already exists in current chat");
        return currentMessages;
      });
    } else {
      console.log("Forwarded message is not for current chat");
    }
    
    // Also emit socket event to ensure other clients receive the forwarded message
    if (socket) {
      console.log("Emitting socket event for forwarded message");
      sendMessage(message);
    }
  }, [updateChatOrder, selectedUser, socket, sendMessage]);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth > 768);
    handleResize(); // check on mount
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  
  const router = useRouter();
  useEffect(() => {
    if (!isAuth && !loading) {
      router.push("/login");
    }
  }, [isAuth, router, loading]);

  const handleLogout = () => logoutUser();

  async function fetchChat(){
    const token=Cookies.get("token")
    try {
      const {data}= await axios.get(`${chat_service}/api/v1/message/${selectedUser}`,{
        headers:{
          Authorization: `Bearer ${token}`,
        },
      }
        );
        setMessages(data.messages);
        setMessage(data.message)
        setUsers(data.user)
        await fetchChats()
    } catch (error) {
      console.log(error)
      toast.error("Failed to load messages");
    }
  }

  async function createChat(u: User){
    try {
      const token=Cookies.get("token");
      const {data}=await axios.post(`${chat_service}/api/v1/chat/new`,{
        userId: loggedInUser?._id,
        otherUserId: u._id,
      },
      {
        headers:{
          Authorization: `Bearer ${token}`,
        },
    });
     
    setSelectedUser(data.chatId)
    setShowAllUser(false)
    // Close sidebar on mobile after selecting chat
    setSidebarOpen(false)
    await fetchChats();
    } catch {
      toast.error("Failed to start chat");
    }
  }

  const handleMessageSend= async(e:any, imageFile?:File | null)=>{
    e.preventDefault();
    if(!message.trim() && !imageFile ) return;

    if(!selectedUser) return;
    //socket 

    const token=Cookies.get("token");

    try {
      const formData=new FormData();
      formData.append("chatId", selectedUser);
      if(message.trim()){
        formData.append("text", message);
      }
      if(imageFile){
        formData.append("image", imageFile);
      }
      if(replyTo){
        formData.append("replyTo", JSON.stringify(replyTo));
      }
      const {data}= await axios.post(`${chat_service}/api/v1/message/`,formData,{
        headers:{
          Authorization: `Bearer ${token}`,
          "Content-Type" : "multipart/form-data",
      },
    } 
  );
   setMessages((prev)=>{
    const currentMessages= prev || [];
    const messageExists=currentMessages.some((msg)=>msg._id === data.message._id);

    if(!messageExists){
      return [...currentMessages, data.message];
    }
    return currentMessages;
   });

   setMessage("");
   setPreviewFile(null);
   setPreviewType(null);
   setReplyTo(null);

   // Emit socket event for real-time updates
   if (socket) {
     sendMessage(data.message);
   }

   updateChatOrder(selectedUser, data.message);

   // Force refresh chat list to ensure real-time update
   setTimeout(() => {
     updateChatOrder(selectedUser, data.message);
   }, 100);

   const displayText = imageFile ? "📸 Image":message;
    } catch (error : any) {
      toast.error(error.response.data.message);
    }
  }
  const handleFileSelect = (file: File) => {
    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size too large. Maximum size is 10MB.");
      return;
    }
    
    setPreviewFile(file);
    if (file.type.startsWith("image/")) {
      setPreviewType('image');
    } else {
      setPreviewType('document');
    }
  };

  const handleRemovePreview = () => {
    setPreviewFile(null);
    setPreviewType(null);
    // Clear the file input in MessageInput component
    if (messageInputRef.current) {
      messageInputRef.current.clearFileInput();
    }
  };

  const handleTyping=(value:string)=>{
    setMessage(value);
  }

  const handleReply = (msg: any) => {
    setReplyTo(msg);
  };

  const handleCancelReply = () => {
    setReplyTo(null);
  };

  useEffect(()=>{
    socket?.on("userTyping",(data:any)=>{
    console.log("recieved user typing",data);
    if(data.chatId === selectedUser && data.userId !== loggedInUser?._id){
      setIsTyping(true);
      
      // Clear existing timeout
      if(typingTimeOut){
        clearTimeout(typingTimeOut);
      }
      
      // Set new timeout to stop typing after 3 seconds
      const timeout = setTimeout(() => {
        setIsTyping(false);
      }, 3000);
      
      setTypingTimeOut(timeout);
    }
    });

    socket?.on("userStopTyping",(data:any)=>{
      console.log("recieved user stopped typing",data);
      if(data.chatId === selectedUser && data.userId !== loggedInUser?._id){
        setIsTyping(false);
        
        // Clear timeout when user stops typing
        if(typingTimeOut){
          clearTimeout(typingTimeOut);
          setTypingTimeOut(null);
        }
      }
      });

      return ()=>{
        socket?.off("userTyping");
        socket?.off("userStopTyping");
      }
  },[selectedUser, loggedInUser, typingTimeOut])

  useEffect(()=>{
    if(selectedUser){
      fetchChat();
      setIsTyping(false);


      socket?.emit("joinChat",selectedUser);

      return ()=>{
        socket?.emit("leaveChat",selectedUser);
        setMessages(null);
      }
    }
  },[selectedUser,socket]);

  useEffect(()=>{
    return()=>{
      if(typingTimeOut){
        clearTimeout(typingTimeOut);
      }
    }
  },[typingTimeOut]);

  // Socket event listeners for message deletion and receiving
  useEffect(() => {
    if (!socket) return;

    const handleMessageReceived = (message: any) => {
      console.log("Socket message received:", message);
      console.log("Message text:", message.text);
      console.log("Is forwarded:", message.text?.includes('Forwarded'));
      
      // Update messages if it's for the current chat
      if (message.chatId === selectedUser) {
        console.log("Socket message is for current chat, updating messages");
        setMessages((prev) => {
          const currentMessages = prev || [];
          const messageExists = currentMessages.some((msg) => msg._id === message._id);
          
          if (!messageExists) {
            console.log("Socket message added to current chat");
            return [...currentMessages, message];
          }
          console.log("Socket message already exists in current chat");
          return currentMessages;
        });
      } else {
        console.log("Socket message is not for current chat");
      }
      
      // Update chat order and latest message for ALL messages (including forwarded)
      updateChatOrder(message.chatId, message);
    };

    // Use global message handler for better reliability
    onMessageReceived?.(handleMessageReceived);
    
    // Also register direct socket handler as backup
    socket.on("messageReceived", handleMessageReceived);
    
    const handleMessageDeleted = (payload: any) => {
      if (!payload || payload.chatId !== selectedUser) return;
      setMessages(prev => {
        if (!prev) return prev;
        return prev.filter(m => m._id !== payload.messageId);
      });
    };
    socket.on("messageDeleted", handleMessageDeleted);

    return () => {
      offMessageReceived?.(handleMessageReceived);
      socket.off("messageReceived", handleMessageReceived);
      socket.off("messageDeleted", handleMessageDeleted);
    };
  }, [socket, selectedUser, onMessageReceived, offMessageReceived]);

  if (loading) return <Loading />; 
   return (
     <div className="min-h-screen flex bg-gray-900 text-white relative overflow-hidden">
       {/* AppRail: hidden on <769px */}
       {isDesktop && (
         <div className="flex">
           <AppRail 
             onLogout={handleLogout} 
             onProfile={() => router.push('/profile')}
             activeFilter={activeFilter}
             setActiveFilter={setActiveFilter}
           />
         </div>
       )}

       {/* Mobile overlay backdrop */}
       {sidebarOpen && (
         <div
           className="fixed inset-0 bg-black/50 z-25 md:hidden"
           onClick={() => setSidebarOpen(false)}
         />
       )}

       {/* Sidebar overlays on mobile, static on desktop */}
       <div className={`fixed top-0 bottom-0 left-0 z-30 ${isDesktop ? 'left-16' : ''} ${!isDesktop && !sidebarOpen ? 'hidden' : ''}`}>
         <ChatSidebar
           sidebarOpen={sidebarOpen}
           setSidebarOpen={setSidebarOpen}
           showAllUsers={showAllUser}
           setShowAllUsers={setShowAllUser}
           users={users}
           loggedInUser={loggedInUser}
           chats={chats}
           selectedUser={selectedUser}
           setSelectedUser={setSelectedUser}
           createChat={createChat}
           handleLogout={handleLogout}
           onlineUsers={onlineUsers}
           activeFilter={activeFilter}
           onProfileClick={() => router.push('/profile')}
         />
       </div>

       {/* Main chat area with proper spacing for sidebar and fixed elements */}
       <div className={`flex-1 flex flex-col w-full relative ${isDesktop ? 'ml-[calc(16rem+8rem)]' : ''}`}>
         {/* Header: fixed on top */}
         <div className="sticky top-0 w-full z-10 bg-gray-900">
           <ChatHeader
             user={user}
             setSidebarOpen={setSidebarOpen}
             isTyping={isTyping}
             onlineUsers={onlineUsers}
             sidebarOpen={sidebarOpen}
           />
         </div>

         {/* Messages: scrollable area with padding for input */}
         <div
           className="absolute left-0 right-0 bg-gradient-to-b from-gray-900 to-gray-950"
           style={{
             top: "64px", // height of ChatHeader
             bottom: "80px", // height of MessageInput
             overflowY: "auto",
           }}
         >
           <ChatMessages
             selectedUser={selectedUser}
             messages={messages}
             loggedInUser={loggedInUser}
             onReply={handleReply}
             replyTo={replyTo}
             onCancelReply={handleCancelReply}
             onMessageForwarded={handleMessageForwarded}
           />
           {/* Arrow toggle button for mobile */}
           {!isDesktop && (
             <button
               onClick={() => setSidebarOpen(!sidebarOpen)}
               className={`fixed top-1/2 transform -translate-y-1/2 z-40 bg-gray-800  hover:bg-gray-700 transition-all duration-200 ${
                 sidebarOpen 
                   ? "right-0 rounded-l-full p-1 shadow-lg" 
                   : "left-0 rounded-r-full p-1 shadow-lg"
               }`}
             >
               <ArrowRight
                 className={`w-4 h-4 text-white transition-transform duration-200 ${
                   sidebarOpen ? "rotate-180" : "rotate-0"
                 }`}
               />
             </button>
           )}

           {/* WhatsApp-style File Preview - Center of chat */}
           {previewFile && (
             <div
               className="fixed inset-0 z-50 flex items-center justify-center"
               style={{
                 backgroundColor: "rgba(0, 0, 0, 0.3)",
                 backdropFilter: "blur(8px)",
                 WebkitBackdropFilter: "blur(8px)",
               }}
             >
               <div
                 className="bg-gray-800 rounded-2xl p-4 sm:p-6 max-w-sm sm:max-w-md w-full mx-4 relative border border-gray-700"
                 style={{
                   backgroundColor: "rgba(31, 41, 55, 0.95)",
                   backdropFilter: "blur(10px)",
                   WebkitBackdropFilter: "blur(10px)",
                 }}
               >
                 {/* Close button - top right */}
                 <button
                   onClick={handleRemovePreview}
                   className="absolute -top-2 -right-2 bg-white text-gray-800 rounded-full w-8 h-8 flex items-center justify-center text-lg hover:bg-gray-400 transition-colors"
                 >
                   ×
                 </button>

                 {/* File preview content */}
                 <div className="text-center">
                   {previewType === "image" ? (
                     <div className="mb-4">
                       <img
                         src={URL.createObjectURL(previewFile)}
                         alt="preview"
                         className="max-w-full max-h-64 object-contain rounded-lg mx-auto"
                       />
                     </div>
                   ) : (
                     <div className="mb-4 flex justify-center">
                       <div className="w-24 h-24 bg-blue-600 rounded-2xl flex items-center justify-center">
                         <span className="text-white text-2xl font-bold">
                           {previewFile.name.split(".").pop()?.toUpperCase()}
                         </span>
                       </div>
                     </div>
                   )}

                   {/* File details */}
                   <div className="mb-4 sm:mb-6">
                     <h3 className="text-white text-base sm:text-lg font-semibold mb-2 truncate">
                       {previewFile.name}
                     </h3>
                     <p className="text-gray-400 text-xs sm:text-sm">
                       {(previewFile.size / 1024 / 1024).toFixed(2)} MB
                     </p>
                   </div>

                   {/* Send button - bottom right */}
                   <div className="flex justify-end">
                     <button
                       onClick={(e) => {
                         e.preventDefault();
                         handleMessageSend(e, previewFile);
                       }}
                       className="bg-blue-600 hover:bg-blue-700 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-full text-xs sm:text-sm font-medium flex items-center gap-2 transition-colors"
                     >
                       <Send className="w-4 h-4" />
                     </button>
                   </div>
                 </div>
               </div>
             </div>
           )}
         </div>

         {/* Input: fixed at bottom */}
         <div className={`fixed bottom-0 right-0 left-0 z-10 bg-gray-900 pb-2 px-2 pt-1 ${isDesktop ? 'left-[calc(16rem+8rem)]' : ''}`}>
           <MessageInput
             ref={messageInputRef}
             selectedUser={selectedUser}
             message={message}
             setMessage={handleTyping}
             handleMessageSend={handleMessageSend}
             onFileSelect={handleFileSelect}
             replyPreview={replyTo}
             onCancelReply={handleCancelReply}
             loggedInUser={loggedInUser}
             chats={chats || []}
             sendTyping={sendTyping}
             sendStopTyping={sendStopTyping}
           />
         </div>
       </div>
     </div>
   );
};

export default ChatApp;
