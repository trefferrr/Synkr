import { User } from "@/context/AppContext";
import {
  CornerDownRight,
  CornerUpLeft,
  LogOut,
  MessageCircle,
  Pin,
  Plus,
  Search,
  Trash2,
  UserCircle,
  X,
  MoreVertical,
  Star,
  EyeOff,
  ArrowLeft,
  ArrowRight,
  MoreHorizontal,
  User as UserIcon,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

interface ChatSidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  showAllUsers: boolean;
  setShowAllUsers: (show: boolean | ((prev: boolean) => boolean)) => void;
  users: User[] | null;
  loggedInUser: User | null;
  chats: any[] | null;
  selectedUser: string | null;
  setSelectedUser: (userId: string | null) => void;
  handleLogout: () => void;
  createChat: (user: User) => void;
  onlineUsers: string[] | undefined;
  activeFilter?: 'all'|'favourites'|'hidden';
  onProfileClick?: () => void;
  setChats?: React.Dispatch<React.SetStateAction<any[] | null>>;
  setMessages?: React.Dispatch<React.SetStateAction<any[] | null>>;
  setMessage?: React.Dispatch<React.SetStateAction<string>>;
  setUsers?: React.Dispatch<React.SetStateAction<any>>;
}

// Responsive: AppRail actions as menu
const FILTERS = [
  { key: 'all', icon: <span className="text-xs">All</span> },
  { key: 'favourites', icon: <Star className="w-4 h-4" /> },
  { key: 'hidden', icon: <EyeOff className="w-4 h-4" /> },
];

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
  activeFilter = 'all',
  onProfileClick,
  setChats,
  setMessages,
  setMessage,
  setUsers,
}) => {
  // Responsive menu state
  const [showRailMenu, setShowRailMenu] = useState(false);
  const [mobileFilter, setMobileFilter] = useState<'all'|'favourites'|'hidden'>(activeFilter);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedChatIds, setSelectedChatIds] = useState<Set<string>>(new Set());
  const [hiddenChatIds, setHiddenChatIds] = useState<Set<string>>(new Set());
  const [pinnedChatIds, setPinnedChatIds] = useState<Set<string>>(new Set());
  const [favouriteChatIds, setFavouriteChatIds] = useState<Set<string>>(new Set());
  const longPressTimerRef = useRef<number | null>(null);
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth > 768;
    }
    return false;
  });

  // Handle screen size for hiding text on small screens and desktop detection
  useEffect(() => {
    const handleResize = () => {
      setIsSmallScreen(window.innerWidth < 425);
      setIsDesktop(window.innerWidth > 768);
    };
    
    handleResize(); // Check on mount
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle click outside to close rail menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showRailMenu) {
        const target = event.target as Element;
        // Check if click is outside the menu and button
        if (!target.closest('[data-rail-menu]') && !target.closest('[data-rail-menu-button]')) {
          setShowRailMenu(false);
        }
      }
    };

    if (showRailMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showRailMenu]);

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

  useEffect(()=>{
    const keyP = `pinnedChats:${loggedInUser?._id || 'anon'}`;
    const keyF = `favouriteChats:${loggedInUser?._id || 'anon'}`;
    try{
      const p = typeof window!=='undefined'? window.localStorage.getItem(keyP): null;
      const f = typeof window!=='undefined'? window.localStorage.getItem(keyF): null;
      setPinnedChatIds(new Set(p? JSON.parse(p): []));
      setFavouriteChatIds(new Set(f? JSON.parse(f): []));
    }catch{
      setPinnedChatIds(new Set());
      setFavouriteChatIds(new Set());
    }
  },[loggedInUser?._id]);

  const persistSet=(key:string, ids:Set<string>)=>{
    try{ if(typeof window!=='undefined'){ window.localStorage.setItem(key, JSON.stringify(Array.from(ids))); } }catch{}
  }

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

  // Context menu state
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{x:number,y:number}>({x:0,y:0});
  const [menuChatId, setMenuChatId] = useState<string | null>(null);

  const openMenu=(e: React.MouseEvent, chatId: string)=>{
    e.preventDefault();
    setMenuChatId(chatId);
    setMenuPos({x: e.clientX, y: e.clientY});
    setMenuOpen(true);
  };
  const closeMenu=()=> setMenuOpen(false);

  const togglePin=(chatId:string)=>{
    setPinnedChatIds(prev=>{ const next=new Set(prev); if(next.has(chatId)) next.delete(chatId); else next.add(chatId); persistSet(`pinnedChats:${loggedInUser?._id||'anon'}`,next); return next; });
    closeMenu();
  }
  const toggleFavourite=(chatId:string)=>{
    setFavouriteChatIds(prev=>{ const next=new Set(prev); if(next.has(chatId)) next.delete(chatId); else next.add(chatId); persistSet(`favouriteChats:${loggedInUser?._id||'anon'}`,next); return next; });
    closeMenu();
  }
  const deleteForMe=(chatId:string)=>{
    // If the deleted chat is currently selected, close it and reset to default state
    if (selectedUser === chatId) {
      setSelectedUser(null);
      // Clear all messages, message input, and user data
      if (setMessages) setMessages(null);
      if (setMessage) setMessage("");
      if (setUsers) setUsers(null);
    }
    
    // Remove chat from the chats array
    if (setChats) {
        setChats((prev) => prev ? prev.filter(c => c.chat._id !== chatId) : prev);
    }
    // Also add to hidden (as backup)
    const next=new Set(hiddenChatIds); next.add(chatId);
     setHiddenChatIds(next); persistHidden(next); closeMenu();
  }

  return (
    <div>
      <aside
        className={` ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
    fixed inset-y-0 left-0 h-screen w-[60vw] max-w-[350px] bg-gray-900 border-r border-gray-800
    transition-transform duration-300 ease-in-out z-30 
 flex flex-col shadow-2xl backdrop-blur-xl rounded-r-2xl
    ${isDesktop ? 'md:static md:left-16 md:w-80 md:translate-x-0 md:rounded-none' : 'md:left-0'}`}
      >
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-gray-800 bg-gray-900/90 backdrop-blur-xl relative rounded-tr-2xl sm:rounded-none shadow-md">
          {/* Mobile: Close button */}
          <div className={`flex items-center justify-end mb-2 ${isDesktop ? 'md:hidden' : 'md:flex'}`}>
           

            {/* 3-dot menu dropdown */}
            {showRailMenu && (
              <div className="absolute left-30 top-20 z-40 bg-gray-900/95 border border-gray-800 rounded-xl shadow-2xl w-48 py-2 flex flex-col gap-1 animate-fade-in backdrop-blur-xl" data-rail-menu>
                {/* Filters */}
                <div className="px-2 pb-1 text-xs text-gray-400 font-semibold tracking-wide">
                  Filters
                </div>
                {FILTERS.map((f) => (
                  <button
                    key={f.key}
                    onClick={() => {
                      setMobileFilter(f.key as any);
                      setShowRailMenu(false);
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-left transition-all duration-150 ${
                      mobileFilter === f.key
                        ? "bg-blue-900/60 text-blue-400 font-bold shadow"
                        : "hover:bg-gray-800 text-gray-200"
                    }`}
                  >
                    {f.icon}
                    <span className="ml-2 capitalize">{f.key}</span>
                  </button>
                ))}
                <hr className="my-2 border-gray-800" />
                <button
                  onClick={() => {
                    onProfileClick?.();
                    setShowRailMenu(false);
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-md text-left hover:bg-gray-800 text-gray-200 transition-all duration-150"
                >
                  <UserIcon className="w-4 h-4" />
                  <span>Profile</span>
                </button>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-4 py-2 rounded-md text-left hover:bg-gray-800 text-red-400 font-semibold transition-all duration-150"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
          {/* Title and new chat button */}
          <div className="flex items-center justify-between w-full mt-2">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="p-2 bg-gradient-to-br from-blue-700 via-blue-500 to-indigo-500 rounded-xl flex-shrink-0 shadow-md">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              {!isSmallScreen && (
                <h2 className="text-xl font-bold text-white truncate drop-shadow-sm tracking-tight">
                  {showAllUsers ? "New Chat" : "Messages"}
                </h2>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                className="p-2.5 rounded-md transition-all duration-200 flex-shrink-0  text-white"
                onClick={() => setShowAllUsers((prev) => !prev)}
                aria-label={showAllUsers ? "Close new chat" : "New chat"}
                style={{ minWidth: "40px", minHeight: "40px" }}
              >
                {showAllUsers ? (
                  <X className="w-4 h-4" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
              </button>
              <button
                className={`p-2.5 rounded-md text-white transition-all duration-200 ${isDesktop ? 'md:hidden' : 'md:flex'}`}
                onClick={() => setShowRailMenu(!showRailMenu)}
                aria-label="More options"
                data-rail-menu-button
                style={{ minWidth: "40px", minHeight: "40px" }}
              >
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>
          </div>
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
                  className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-gradient-to-r from-gray-800/90 to-gray-900/90 border border-gray-700/50 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/70 focus:border-transparent transition-all duration-300 shadow-md group-hover:shadow-blue-500/5"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2 transition-all duration-300 group-hover:text-blue-300">
                  <Search className="w-5 h-5 text-blue-400" strokeWidth={2.5} />
                </div>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 p-1 rounded-full hover:bg-gray-700/50 transition-colors"
                  >
                    <X className="w-4 h-4 text-gray-400 hover:text-white" />
                  </button>
                )}
              </div>

              {/* Users List */}
              <div
                className="flex-1 overflow-y-auto scrollbar-hide pb-4 space-y-2"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
              >
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
                          <div className="font-semibold text-md text-white truncate">
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
            <div
              className="space-y-2 overflow-y-auto scrollbar-hide h-full pb-4"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {chats
                .filter((c) => {
                  // For Hidden filter, show hidden items; otherwise exclude them
                  const filterKey =
                    typeof window !== "undefined" && window.innerWidth <= 768
                      ? mobileFilter
                      : activeFilter;
                  if (filterKey === "hidden")
                    return hiddenChatIds.has(c.chat._id);
                  return !hiddenChatIds.has(c.chat._id);
                })
                .filter((c) => {
                  const filterKey =
                    typeof window !== "undefined" && window.innerWidth <= 768
                      ? mobileFilter
                      : activeFilter;
                  if (filterKey === "all") return true;
                  if (filterKey === "favourites")
                    return favouriteChatIds.has(c.chat._id);
                  if (filterKey === "hidden")
                    return hiddenChatIds.has(c.chat._id);
                  return true;
                })
                .sort((a, b) => {
                  const aPinned = pinnedChatIds.has(a.chat._id) ? 1 : 0;
                  const bPinned = pinnedChatIds.has(b.chat._id) ? 1 : 0;
                  if (aPinned !== bPinned) return bPinned - aPinned;
                  const aTime =
                    a.chat.latestMessage?.createdAt || a.chat.updatedAt;
                  const bTime =
                    b.chat.latestMessage?.createdAt || b.chat.updatedAt;
                  return new Date(bTime).getTime() - new Date(aTime).getTime();
                })
                .map((chat) => {
                  const latestMessage = chat.chat.latestMessage;
                  const isSelected = selectedUser === chat.chat._id;
                  const isMarked = selectedChatIds.has(chat.chat._id);
                  const isSentByMe =
                    latestMessage?.sender === loggedInUser?._id;
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
                      onContextMenu={(e) => openMenu(e, chat.chat._id)}
                      onPointerDown={() => {
                        if (isDesktop) return; // Disable long press on desktop
                        if (longPressTimerRef.current)
                          window.clearTimeout(longPressTimerRef.current);
                        longPressTimerRef.current = window.setTimeout(() => {
                          enterSelectionWith(chat.chat._id);
                        }, 500);
                      }}
                      onPointerUp={() => {
                        if (isDesktop) return; // Disable long press on desktop
                        if (longPressTimerRef.current) {
                          window.clearTimeout(longPressTimerRef.current);
                          longPressTimerRef.current = null;
                        }
                      }}
                      onPointerLeave={() => {
                        if (isDesktop) return; // Disable long press on desktop
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
                          <div
                            className={`w-5 h-5 rounded-md border flex items-center justify-center ${
                              isMarked
                                ? "bg-blue-600 border-blue-500"
                                : "border-gray-500"
                            }`}
                          >
                            {isMarked && (
                              <div className="w-3 h-3 bg-white rounded-sm" />
                            )}
                          </div>
                        )}
                        <div
                          className={`relative p-2 rounded-full flex items-center justify-center ${
                            isSelected ? "bg-white/20" : "bg-blue-600"
                          }`}
                        >
                          <UserCircle className="w-6 h-6 text-white" />
                          {onlineUsers &&
                            onlineUsers.includes(chat.user._id) && (
                              <div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-gray-900 flex items-center justify-center">
                                <div className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-75"></div>
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
                            <div className="flex items-center gap-2">
                              {pinnedChatIds.has(chat.chat._id) && (
                                <Pin className="w-4 h-4 text-blue-500" />
                              )}
                              {unseenCount > 0 && (
                                <div className="bg-blue-500 text-white text-xs font-bold rounded-full min-w-[22px] h-5 flex items-center justify-center px-2">
                                  {unseenCount > 99 ? "99+" : unseenCount}
                                </div>
                              )}
                            </div>
                          </div>
                          {latestMessage && (
                            <div className="flex items-center gap-2">
                              {isSentByMe ? (
                                <CornerUpLeft
                                  size={14}
                                  className={`flex-shrink-0 ${
                                    isSelected
                                      ? "text-blue-200"
                                      : "text-blue-400"
                                  }`}
                                />
                              ) : (
                                <CornerDownRight
                                  size={14}
                                  className={`flex-shrink-0 ${
                                    isSelected
                                      ? "text-green-200"
                                      : "text-green-400"
                                  }`}
                                />
                              )}
                              {(() => {
                                const raw = latestMessage.text || "";
                                const clean =
                                  typeof raw === "string"
                                    ? raw.replace(/^Forwarded\s*\n?/i, "")
                                    : raw;
                                return (
                                  <span
                                    className={`text-sm truncate flex-1 ${
                                      isSelected
                                        ? "text-gray-200"
                                        : "text-gray-400"
                                    }`}
                                  >
                                    {clean}
                                  </span>
                                );
                              })()}
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
                  <MessageCircle
                    className="w-12 h-12 text-blue-400"
                    strokeWidth={1.5}
                  />
                </div>
              </div>
              <p className="text-transparent bg-clip-text bg-gradient-to-r from-white to-blue-200 font-semibold text-xl mb-2">
                No conversations yet
              </p>
              <p className="text-sm text-blue-300/80 max-w-[200px]">
                Click the{" "}
                <span className="inline-flex items-center mx-1 text-blue-400">
                  <Plus className="w-3 h-3 mr-1" /> New
                </span>{" "}
                button above or below to start messaging
              </p>
              <button
                onClick={() => setShowAllUsers(true)}
                className="mt-6 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-md shadow-md hover:shadow-blue-500/20 transition-all duration-300 flex items-center gap-2 font-medium text-base"
              >
                <Plus className="w-5 h-5" />
                Start New Chat
              </button>
            </div>
          )}
        </div>

        {/* Context Menu */}
        {menuOpen && menuChatId && (
          <div
            className="fixed z-40 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-64 py-2"
            style={{ left: menuPos.x + 8, top: menuPos.y + 8 }}
            onMouseLeave={closeMenu}
            onClick={closeMenu}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                const n = new Set(hiddenChatIds);
                if (n.has(menuChatId!)) {
                  n.delete(menuChatId!);
                } else {
                  n.add(menuChatId!);
                }
                setHiddenChatIds(n);
                persistHidden(n);
              }}
              className="w-full text-left px-4 py-2 hover:bg-gray-800 text-gray-200"
            >
              {hiddenChatIds.has(menuChatId!) ? "Unhide chat" : "Hide chat"}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteForMe(menuChatId!);
              }}
              className="w-full text-left px-4 py-2 hover:bg-gray-800 text-gray-200"
            >
              Delete chat (for me)
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                togglePin(menuChatId!);
              }}
              className="w-full text-left px-4 py-2 hover:bg-gray-800 text-gray-200"
            >
              {pinnedChatIds.has(menuChatId!) ? "Unpin chat" : "Pin chat"}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFavourite(menuChatId!);
              }}
              className="w-full text-left px-4 py-2 hover:bg-gray-800 text-gray-200"
            >
              {favouriteChatIds.has(menuChatId!)
                ? "Remove from favourites"
                : "Add to favourites"}
            </button>
          </div>
        )}
      </aside>
    </div>
  );
};

export default ChatSidebar;