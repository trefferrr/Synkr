import { User } from '@/context/AppContext';
import { MessageCircle, UserCircle, Menu, MoreHorizontal } from 'lucide-react'
import React from 'react'

interface ChatHeaderProps{
  user: User | null;
  isTyping: boolean;
  onlineUsers?: string[];
  sidebarOpen?: boolean;
  setSidebarOpen?: (open: boolean) => void;
}
const ChatHeader = ({user, isTyping, onlineUsers, sidebarOpen, setSidebarOpen}: ChatHeaderProps) => {
  const isOnline = user && onlineUsers && onlineUsers.includes(user._id);
  return (
    <>
      {/* Header content */}
      <div className="px-4 py-4.5 bg-gradient-to-r from-gray-900 to-gray-800 flex items-center justify-between sticky top-0 z-0">
        {/* Left side */}
        <div className="flex items-center gap-3">
          {/* Arrow for mobile only */}
          
          {user ? (
            <>
              {/* User avatar */}
              <div className="relative flex-shrink-0">
                <div className="p-2 bg-blue-600 rounded-lg flex items-center justify-center">
                  <UserCircle className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                </div>
                {isOnline && (
                  <span className="absolute -bottom-0.5 -right-1 w-4 h-4 rounded-full bg-green-500 border-2 border-gray-800">
                    <div className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-75"></div>
                  </span>
                )}
              </div>

              {/* User info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 sm:gap-3 mb-1">
                  <h2 className="text-lg sm:text-xl font-bold text-white truncate">
                    {user.name.split("@")[0]}
                  </h2>
                </div>
                {isTyping && (
                  <div className="flex items-center gap-2 text-sm">
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"></div>
                      <div
                        className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"
                        style={{ animationDelay: "0.1s" }}
                      ></div>
                      <div
                        className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"
                        style={{ animationDelay: "0.2s" }}
                      ></div>
                    </div>
                    <span className="text-blue-500 font-medium">typing...</span>
                  </div>
                )}
                {!isTyping && (
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        isOnline ? "bg-green-500" : "bg-gray-500"
                      }`}
                    ></div>
                    <span
                      className={`text-sm font-medium ${
                        isOnline ? "text-green-500" : "text-gray-500"
                      }`}
                    >
                      {isOnline ? "Online" : "Offline"}
                    </span>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3 sm:gap-4 w-full">
              <div className="p-2 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <MessageCircle className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg sm:text-xl font-bold text-white truncate">
                  Select a User
                </h2>
                <p className="text-xs sm:text-sm text-gray-400 mt-1 hidden sm:block">
                  Choose a user from the sidebar to start messaging
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default ChatHeader
