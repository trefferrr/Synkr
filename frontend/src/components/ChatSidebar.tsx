import { User } from "@/context/AppContext";
import {
  CornerDownRight,
  CornerUpLeft,
  LogOut,
  MessageCircle,
  Plus,
  Search,
  Trash2,
  UserCircle,
  X,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

interface ChatSidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  showAllUsers: boolean;
  setShowAllUsers: (show: boolean | ((prev: boolean) => boolean)) => void;
  users: User[] | null;
  loggedInUser: User | null;
  chats:any[] | null;
  selectedUser: string | null;
  setSelectedUser: (userId: string | null) => void;
  handleLogout: () => void;
  createChat: (user: User) => void;
  onlineUsers: string[] | undefined;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({
  sidebarOpen,
  setSidebarOpen,
  showAllUsers,
  setShowAllUsers,
  users,
  loggedInUser,
  chats,
  selectedUser,
  setSelectedUser,
  handleLogout,
  createChat,
  onlineUsers,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedChatIds, setSelectedChatIds] = useState<Set<string>>(new Set());
  const [hiddenChatIds, setHiddenChatIds] = useState<Set<string>>(new Set());
  const longPressTimerRef = useRef<number | null>(null);

  // Load hidden chats per logged-in user from localStorage
  useEffect(() => {
    const key = `hiddenChats:${loggedInUser?._id || "anon"}`;
    try {
      const raw = typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
      if (raw) {
        const parsed: string[] = JSON.parse(raw);
        setHiddenChatIds(new Set(parsed));
      } else {
        setHiddenChatIds(new Set());
      }
    } catch {
      setHiddenChatIds(new Set());
    }
  }, [loggedInUser?._id]);

  const persistHidden = (ids: Set<string>) => {
    const key = `hiddenChats:${loggedInUser?._id || "anon"}`;
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(Array.from(ids)));
      }
    } catch {}
  };

  // If a chat becomes selected (e.g., user started it again), unhide it
  useEffect(() => {
    if (!selectedUser) return;
    if (hiddenChatIds.has(selectedUser)) {
      const next = new Set(hiddenChatIds);
      next.delete(selectedUser);
      setHiddenChatIds(next);
      persistHidden(next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUser]);

  const enterSelectionWith = (chatId: string) => {
    setSelectionMode(true);
    setSelectedChatIds(new Set([chatId]));
  };

  const toggleSelect = (chatId: string) => {
    setSelectedChatIds(prev => {
      const next = new Set(prev);
      if (next.has(chatId)) next.delete(chatId); else next.add(chatId);
      if (next.size === 0) setSelectionMode(false);
      return next;
    });
  };

  const clearSelection = () => {
    setSelectionMode(false);
    setSelectedChatIds(new Set());
  };

  const hideSelected = () => {
    if (selectedChatIds.size === 0) return;
    setHiddenChatIds(prev => {
      const next = new Set(prev);
      selectedChatIds.forEach(id => next.add(id));
      persistHidden(next);
      // If current selected chat is being hidden, clear it
      if (selectedUser && next.has(selectedUser)) {
        setSelectedUser(null);
      }
      return next;
    });
    clearSelection();
  };

  return (
    <div>
      <aside
        className={`fixed z-20 sm:static top-0 left-0 h-screen w-80 bg-gradient-to-b from-gray-900 to-gray-950 border-r border-gray-700 transform ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } sm:translate-x-0 transition-transform duration-300 flex flex-col shadow-2xl`}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-700 bg-gray-900 backdrop-blur-sm">
          <div className="sm:hidden flex justify-end mb-2">
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5 text-gray-300" />
            </button>
          </div>
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="p-2 bg-blue-600 rounded-lg flex-shrink-0">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-bold text-white truncate">
                {showAllUsers ? "New Chat" : "Messages"}
              </h2>
            </div>
            <button
              className={`p-2.5 rounded-lg transition-all duration-200 flex-shrink-0 shadow-md hover:shadow-lg ${
                showAllUsers
                  ? "bg-red-600 hover:bg-red-700 text-white"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              }`}
              onClick={() => setShowAllUsers((prev) => !prev)}
              aria-label={showAllUsers ? "Close new chat" : "New chat"}
              style={{ minWidth: '40px', minHeight: '40px' }}
            >
              {showAllUsers ? (
                <X className="w-4 h-4" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
            </button>
          </div>
          {selectionMode && (
            <div className="mt-4 px-3 py-2 border border-gray-700 rounded-lg bg-gray-800 flex items-center justify-between">
              <div className="text-gray-200 text-sm">
                {selectedChatIds.size} selected
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={hideSelected}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-md flex items-center gap-2"
                  aria-label="Hide selected"
                >
                  <Trash2 className="w-4 h-4" />
                  Hide
                </button>
                <button
                  onClick={clearSelection}
                  className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-md"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden px-4 py-4">
          {showAllUsers ? (
            <div className="flex flex-col h-full">
              {/* Search Bar */}
              <div className="relative mb-4 group">
                <input
                  type="text"
                  placeholder="Search users..."
                  className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-gradient-to-r from-gray-800/90 to-gray-900/90 border border-gray-700/50 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/70 focus:border-transparent transition-all duration-300 shadow-lg group-hover:shadow-blue-500/5"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2 transition-all duration-300 group-hover:text-blue-300">
                  <Search className="w-5 h-5 text-blue-400" strokeWidth={2.5} />
                </div>
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 p-1 rounded-full hover:bg-gray-700/50 transition-colors"
                  >
                    <X className="w-4 h-4 text-gray-400 hover:text-white" />
                  </button>
                )}
              </div>

              {/* Users List */}
              <div className="flex-1 overflow-y-auto pb-4 space-y-2">
                {users?.filter(
                  (u) =>
                    u._id !== loggedInUser?._id &&
                    u.name.toLowerCase().includes(searchQuery.toLowerCase())
                ).length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500">
                    <div className="p-4 bg-gray-800 rounded-full mb-3">
                      <UserCircle className="w-12 h-12 text-gray-600" />
                    </div>
                    <span className="font-medium">No users found</span>
                  </div>
                ) : (
                  users
                    ?.filter(
                      (u) =>
                        u._id !== loggedInUser?._id &&
                        u.name.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map((u) => (
                      <button
                        key={u._id}
                        className="w-full flex items-center gap-4 px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 hover:border-blue-500 hover:bg-gray-800 transition-all duration-200 shadow-md group"
                        onClick={() => createChat(u)}
                      >
                        <div className="relative p-2 bg-blue-600 rounded-full flex items-center justify-center">
                          <UserCircle className="w-7 h-7 text-white" />
                          {onlineUsers && onlineUsers.includes(u._id) && (
                            <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-gray-900 flex items-center justify-center">
                              <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                            </div>
                          )}
                        </div>
                         
                         

                        <div className="flex-1 min-w-0 text-left">
                          <div className="font-semibold text-lg text-white truncate">
                            {u.name.split("@")[0]}
                          </div>
                          <div className="text-xs text-blue-300 mt-0.5 flex items-center">
                            <Plus className="w-3 h-3 mr-1" />
                            <span>Start conversation</span>
                          </div>
                        </div>
                      </button>
                    ))
                )}
              </div>
            </div>
          ) : chats && chats.length > 0 ? (
            <div className="space-y-2 overflow-y-auto h-full pb-4">
              {chats
                .filter((c) => !hiddenChatIds.has(c.chat._id))
                .sort((a, b) => {
                  // Sort by latest message time or chat updatedAt, most recent first
                  const aTime = a.chat.latestMessage?.createdAt || a.chat.updatedAt;
                  const bTime = b.chat.latestMessage?.createdAt || b.chat.updatedAt;
                  return new Date(bTime).getTime() - new Date(aTime).getTime();
                })
                .map((chat) => {
                const latestMessage = chat.chat.latestMessage;
                const isSelected = selectedUser === chat.chat._id;
                const isMarked = selectedChatIds.has(chat.chat._id);
                const isSentByMe = latestMessage?.sender === loggedInUser?._id;
                const unseenCount = chat.chat.unseenCount || 0;

                return (
                  <button
                    key={chat.chat._id}
                    onClick={(e) => {
                      if (selectionMode) {
                        e.preventDefault();
                        toggleSelect(chat.chat._id);
                        return;
                      }
                      setSelectedUser(chat.chat._id);
                      setSidebarOpen(false);
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      if (!selectionMode) enterSelectionWith(chat.chat._id); else toggleSelect(chat.chat._id);
                    }}
                    onPointerDown={() => {
                      if (longPressTimerRef.current) window.clearTimeout(longPressTimerRef.current);
                      longPressTimerRef.current = window.setTimeout(() => {
                        enterSelectionWith(chat.chat._id);
                      }, 500);
                    }}
                    onPointerUp={() => {
                      if (longPressTimerRef.current) {
                        window.clearTimeout(longPressTimerRef.current);
                        longPressTimerRef.current = null;
                      }
                    }}
                    onPointerLeave={() => {
                      if (longPressTimerRef.current) {
                        window.clearTimeout(longPressTimerRef.current);
                        longPressTimerRef.current = null;
                      }
                    }}
                    className={`w-full text-left p-4 rounded-xl transition-all duration-200 border ${
                      isMarked
                        ? "bg-gray-800 border-blue-500 ring-2 ring-blue-500/50"
                        : isSelected
                          ? "bg-blue-600 border-blue-500 shadow-md"
                          : "bg-gray-800 border-gray-700 hover:border-blue-500 hover:bg-gray-800"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {selectionMode && (
                        <div className={`w-5 h-5 rounded-md border flex items-center justify-center ${
                          isMarked ? 'bg-blue-600 border-blue-500' : 'border-gray-500'
                        }`}>
                          {isMarked && <div className="w-3 h-3 bg-white rounded-sm" />}
                        </div>
                      )}
                      <div className={`relative p-2 rounded-full flex items-center justify-center ${
                        isSelected ? "bg-white/20" : "bg-blue-600"
                      }`}>
                        <UserCircle className="w-6 h-6 text-white" />
                        {onlineUsers && onlineUsers.includes(chat.user._id) && (
                          <div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-gray-900 flex items-center justify-center">
                            <div className="w-1 h-1 rounded-full bg-white"></div>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span
                            className={`font-semibold truncate ${
                              isSelected ? "text-white" : "text-gray-200"
                            }`}
                          >
                            {chat.user.name.split("@")[0]}
                          </span>
                          {unseenCount > 0 && (
                            <div className="bg-green-500 text-white text-xs font-bold rounded-full min-w-[22px] h-5 flex items-center justify-center px-2">
                              {unseenCount > 99 ? "99+" : unseenCount}
                            </div>
                          )}
                        </div>
                        {latestMessage && (
                          <div className="flex items-center gap-2">
                            {isSentByMe ? (
                              <CornerUpLeft
                                size={14}
                                className={`flex-shrink-0 ${
                                  isSelected ? "text-blue-200" : "text-blue-400"
                                }`}
                              />
                            ) : (
                              <CornerDownRight
                                size={14}
                                className={`flex-shrink-0 ${
                                  isSelected ? "text-green-200" : "text-green-400"
                                }`}
                              />
                            )}
                            <span className={`text-sm truncate flex-1 ${
                              isSelected ? "text-gray-200" : "text-gray-400"
                            }`}>
                              {latestMessage.text}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <div className="relative">
                <div className="absolute inset-0 bg-blue-500/10 rounded-full blur-xl"></div>
                <div className="p-6 bg-gradient-to-br from-gray-800 to-gray-900 rounded-full mb-4 shadow-xl relative z-10 border border-gray-700/30">
                  <MessageCircle className="w-12 h-12 text-blue-400" strokeWidth={1.5} />
                </div>
              </div>
              <p className="text-transparent bg-clip-text bg-gradient-to-r from-white to-blue-200 font-semibold text-xl mb-2">
                No conversations yet
              </p>
              <p className="text-sm text-blue-300/80 max-w-[200px]">
                Click the <span className="inline-flex items-center mx-1 text-blue-400"><Plus className="w-3 h-3 mr-1" /> New</span> button above or below to start messaging
              </p>
              <button 
                onClick={() => setShowAllUsers(true)}
                className="mt-6 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg shadow-lg hover:shadow-blue-500/20 transition-all duration-300 flex items-center gap-2 font-medium text-base"
              >
                <Plus className="w-5 h-5" />
                Start New Chat
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700 space-y-1 bg-gray-900 backdrop-blur-sm">
          <button
            onClick={() => {/* Add navigation to profile */}}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-gray-800 transition-all duration-200 group"
          >
            <div className="p-1.5 bg-gray-700 rounded-full flex items-center justify-center">
              <UserCircle className="w-5 h-5 text-gray-300" />
            </div>
            <span className="font-medium text-gray-300 group-hover:text-white transition-colors">
              Profile
            </span>
          </button>
          
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-red-600 transition-all duration-200 text-red-400 hover:text-white group"
          >
            <div className="p-1.5 bg-red-600/80 rounded-full flex items-center justify-center">
              <LogOut className="w-4 h-4 text-white" />
            </div>
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>
    </div>
  );
};

export default ChatSidebar;