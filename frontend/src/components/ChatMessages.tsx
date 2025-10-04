import { Message } from '@/app/chat/page';
import { User, useAppData } from '@/context/AppContext';
import React, { useEffect, useRef, useMemo, useState } from 'react'
import Image from 'next/image';
import moment from 'moment';
import { Check, CheckCheck, MessageCircle, Trash2, X, Reply as ReplyIcon, Copy as CopyIcon, Forward as ForwardIcon, Pin as PinIcon, Send } from 'lucide-react';
import axios from 'axios';
import Cookies from 'js-cookie';
import toast from 'react-hot-toast';
import { chat_service } from '@/context/AppContext';

// Utility function to make links clickable
const makeLinksClickable = (text: string) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  
  return parts.map((part, index) => {
    if (urlRegex.test(part)) {
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:text-blue-300 underline break-all"
        >
          {part}
        </a>
      );
    }
    return part;
  });
};

interface ChatMessagesProps{
    selectedUser: string | null;
    messages: Message[] | null;
    loggedInUser : User | null;
    onSelectionChange?: (active: boolean)=>void;
    onMultiSelectChange?: (active: boolean)=>void;
    onReply?: (msg: any)=>void;
    replyTo?: any;
    onCancelReply?: ()=>void;
    onMessageForwarded?: (message: any) => void;
}

const ChatMessages = (props: ChatMessagesProps) => {
    const { selectedUser, messages, loggedInUser, onMessageForwarded } = props;
    const bottomRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const longPressTimerRef = useRef<number | null>(null);

    // selection removed; per-message actions only
    const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
    const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());
    const [optionsOpen, setOptionsOpen] = useState(false);
    const [optionsMsg, setOptionsMsg] = useState<any|null>(null);
    const [forwardOpen, setForwardOpen] = useState(false);
    const [forwardQuery, setForwardQuery] = useState("");
    const [forwardTargets, setForwardTargets] = useState<Set<string>>(new Set());
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [currentPinnedIndex, setCurrentPinnedIndex] = useState(0);
    const [multiSelectMode, setMultiSelectMode] = useState(false);
    const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());
    const [multiDeleteOpen, setMultiDeleteOpen] = useState(false);
    const { chats } = useAppData();

    // Load pinned messages from localStorage
    useEffect(() => {
        const saved = localStorage.getItem('pinnedMessages');
        if (saved) {
            try {
                setPinnedIds(new Set(JSON.parse(saved)));
            } catch {}
        }
    }, []);

    // Notify parent when multi-select mode changes
    useEffect(() => {
        props.onMultiSelectChange?.(multiSelectMode);
    }, [multiSelectMode, props]);

    const persistPinned = (ids: Set<string>) => {
        localStorage.setItem('pinnedMessages', JSON.stringify(Array.from(ids)));
    };

    const togglePin = (messageId: string) => {
        setPinnedIds(prev => {
            const next = new Set(prev);
            if (next.has(messageId)) {
                next.delete(messageId);
            } else {
                // Max 2 pinned messages
                if (next.size >= 2) {
                    const firstPinned = Array.from(next)[0];
                    next.delete(firstPinned);
                }
                next.add(messageId);
            }
            persistPinned(next);
            return next;
        });
    };

    const scrollToMessage = (messageId: string) => {
        const element = document.getElementById(`message-${messageId}`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // Highlight the message briefly
            element.classList.add('ring-2', 'ring-yellow-500', 'rounded-xl');
            setTimeout(() => {
                element.classList.remove('ring-2', 'ring-yellow-500', 'rounded-xl');
            }, 2000);
        }
    };

    const getUserName = (senderId: string) => {
        if (senderId === loggedInUser?._id) return 'You';
        
        // Find the chat to get the other user's name
        const currentChat = chats?.find(chat => chat.chat._id === selectedUser);
        if (currentChat && (currentChat as any).user) {
            return (currentChat as any).user.name.split('@')[0];
        }
        
        return 'User';
    };

    const renderReferencedMessage = (referencedMsg: any) => {
        if (!referencedMsg) return null;
        
        const sender = (referencedMsg as any).sender ?? referencedMsg.senderId;
        const isSentByMe = sender === loggedInUser?._id;
        const senderName = isSentByMe ? 'You' : 'Other'; // You can get actual name from chat data
        
        const rawText: string = referencedMsg.text || '';
        const isForwarded = typeof rawText === 'string' && /^Forwarded(\s*\n)?/i.test(rawText);
        const displayText = isForwarded ? rawText.replace(/^Forwarded\s*\n?/i, '') : rawText;
        
        return (
            <div className="bg-gray-700/50 border-l-2 border-blue-500 rounded-l-md p-2 mb-2">
                <div className="text-xs text-blue-400 font-medium mb-1">{senderName}</div>
                {referencedMsg.messageType === 'image' && referencedMsg.image ? (
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-gray-600 rounded flex items-center justify-center">
                            <span className="text-xs">📸</span>
                        </div>
                        <Image
                            src={referencedMsg.image.url}
                            alt="Referenced image"
                            width={40}
                            height={40}
                            className="rounded object-cover"
                        />
                    </div>
                  ) : (
                      <div className="text-xs text-gray-300 truncate">
                         {displayText ? makeLinksClickable(displayText) : 'Message'}
                      </div>
                  )}
            </div>
        );
    };
    
    const uniqueMessages = useMemo(() => {
        if(!messages) return []
        const seen = new Set()
        return messages.filter((message) => {
            if(seen.has(message._id)) return false;
            seen.add(message._id)
            return true
        });
    },[messages])

    const sortedMessages = useMemo(() => {
        // Sort messages by creation time in ascending order (oldest first, newest last)
        return [...uniqueMessages].sort((a, b) => 
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
    }, [uniqueMessages]);

    // Load per-user, per-chat hidden messages from localStorage
    useEffect(() => {
        if (!loggedInUser?._id || !selectedUser) {
            setHiddenIds(new Set());
            return;
        }
        const key = `hiddenMsgs:${loggedInUser._id}:${selectedUser}`;
        try {
            const raw = typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
            if (raw) {
                const parsed: string[] = JSON.parse(raw);
                setHiddenIds(new Set(parsed));
            } else {
                setHiddenIds(new Set());
            }
        } catch {
            setHiddenIds(new Set());
        }
    }, [loggedInUser?._id, selectedUser]);

    const persistHidden = (ids: Set<string>) => {
        if (!loggedInUser?._id || !selectedUser) return;
        const key = `hiddenMsgs:${loggedInUser._id}:${selectedUser}`;
        try {
            if (typeof window !== 'undefined') {
                window.localStorage.setItem(key, JSON.stringify(Array.from(ids)));
            }
        } catch {}
    };

    // pinned persistence

    // Group messages by date and add date separators (filter hidden first)
    const messagesWithDateSeparators = useMemo(() => {
        const visible = sortedMessages.filter(m => !hiddenIds.has(m._id));
        if (visible.length === 0) return [];
        
        const result: Array<{ type: 'message' | 'dateSeparator', data: any }> = [];
        let lastDate: string | null = null;
        
        visible.forEach((message) => {
            const messageDate = moment(message.createdAt).format('YYYY-MM-DD');
            const today = moment().format('YYYY-MM-DD');
            const yesterday = moment().subtract(1, 'day').format('YYYY-MM-DD');
            
            // Add date separator if this is a new day
            if (lastDate !== messageDate) {
                let dateLabel: string;
                if (messageDate === today) {
                    dateLabel = 'Today';
                } else if (messageDate === yesterday) {
                    dateLabel = 'Yesterday';
                } else {
                    dateLabel = moment(message.createdAt).format('MMMM D, YYYY');
                }
                
                result.push({
                    type: 'dateSeparator',
                    data: { date: messageDate, label: dateLabel }
                });
                lastDate = messageDate;
            }
            
            result.push({
                type: 'message',
                data: message
            });
        });
        
        return result;
    }, [sortedMessages, hiddenIds]);

    useEffect(() => {
        // Always scroll to bottom when user changes or new messages arrive
        setTimeout(() => {
            bottomRef.current?.scrollIntoView({behavior: "smooth"})
        }, 100);
    }, [selectedUser, uniqueMessages]);

    // always ensure parent knows no selection mode is active
    useEffect(()=>{
        if (typeof props.onSelectionChange === 'function') props.onSelectionChange(false);
    },[selectedUser]);

    // Clear any ephemeral UI when switching chat
    useEffect(() => {
        setOptionsOpen(false);
        setForwardOpen(false);
        setConfirmOpen(false);
        setCurrentPinnedIndex(0);
    }, [selectedUser]);

    // Reset pinned index when pinned messages change
    useEffect(() => {
        setCurrentPinnedIndex(0);
    }, [pinnedIds]);


  function setShowEmojiPicker(arg0: boolean): void {
    throw new Error('Function not implemented.');
  }

    return (
      <div className="h-full w-full overflow-hidden relative">
            <div 
                ref={messagesContainerRef}
          className="h-full w-full overflow-y-auto px-6 pt-6 pb-4 scrollbar-hide"
            >
                {!selectedUser ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[500px] text-center">
              <div className="p-4 bg-gray-800 rounded-full mb-4">
                <MessageCircle className="w-12 h-12 text-blue-400" />
                        </div>
              <h3 className="text-xl font-bold text-white mb-2">
                No conversation selected
              </h3>
              <p className="text-gray-400 max-w-xs">
                            Choose a conversation from the sidebar to start messaging
                        </p>
                    </div>
                ) : uniqueMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="p-4 bg-gray-800 rounded-full mb-4">
                <MessageCircle className="w-12 h-12 text-blue-400" />
                        </div>
              <h3 className="text-xl font-bold text-white mb-2">
                No messages yet
              </h3>
              <p className="text-gray-400 max-w-xs">
                            Send a message to start the conversation
                        </p>
                    </div>
                ) : (
                    <>
              {/* Pinned Messages Section */}
              {(() => {
                const pinnedMessages = sortedMessages.filter((msg) =>
                  pinnedIds.has(msg._id)
                );
                if (pinnedMessages.length === 0) return null;

                return (
                  <div className="sticky top-0 z-10 bg-gray-900/95 backdrop-blur-sm border-b border-gray-700/50 px-3 py-2 flex items-center gap-2 w-full">
                    <PinIcon className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                    <span className="text-xs text-gray-300 font-medium flex-shrink-0 hidden sm:block">
                      Pinned Message
                    </span>
                    <span className="text-xs text-gray-300 font-medium flex-shrink-0 sm:hidden">
                      Pinned
                    </span>

                    {/* Current pinned message */}
                    {pinnedMessages.length > 0 &&
                      (() => {
                        const msg = pinnedMessages[currentPinnedIndex];
                        const sender = (msg as any).sender ?? msg.senderId;
                        const isSentByMe = sender === loggedInUser?._id;
                        const rawText: string = msg.text || "";
                        const isForwarded =
                          typeof rawText === "string" &&
                          /^Forwarded(\s*\n)?/i.test(rawText);
                        const displayText = isForwarded
                          ? rawText.replace(/^Forwarded\s*\n?/i, "")
                          : rawText;

                        return (
                          <button
                            onClick={() => scrollToMessage(msg._id)}
                            className="flex-1 flex items-center gap-2 min-w-0 hover:bg-gray-800/50 rounded-md px-2 py-1 transition-all duration-200 group"
                          >
                            <div
                              className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                isSentByMe ? "bg-blue-500" : "bg-green-500"
                              }`}
                            />
                            <span className="text-xs text-gray-100 truncate group-hover:text-white transition-colors">
                              {displayText ||
                                (msg.image ? "📸 Photo" : "Message")}
                            </span>
                          </button>
                        );
                      })()}

                    {/* Navigation and indicators */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {/* Previous button */}
                      {pinnedMessages.length > 1 && currentPinnedIndex > 0 && (
                        <button
                          onClick={() =>
                            setCurrentPinnedIndex((prev) =>
                              Math.max(0, prev - 1)
                            )
                          }
                          className="p-1 hover:bg-gray-800/50 rounded transition-colors"
                          title="Previous pinned message"
                        >
                          <svg
                            className="w-3 h-3 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 19l-7-7 7-7"
                            />
                          </svg>
                        </button>
                      )}

                      {/* Slider dots */}
                      {pinnedMessages.length > 1 && (
                        <div className="flex items-center gap-0.5">
                          {pinnedMessages.map((_, index) => (
                            <button
                              key={index}
                              onClick={() => setCurrentPinnedIndex(index)}
                              className={`w-1.5 h-1.5 rounded-full transition-all duration-200 ${
                                index === currentPinnedIndex
                                  ? "bg-blue-500 scale-125"
                                  : "bg-gray-500 hover:bg-gray-400"
                              }`}
                              title={`Go to pinned message ${index + 1}`}
                            />
                          ))}
                        </div>
                      )}

                      {/* Next button */}
                      {pinnedMessages.length > 1 &&
                        currentPinnedIndex < pinnedMessages.length - 1 && (
                          <button
                            onClick={() =>
                              setCurrentPinnedIndex((prev) =>
                                Math.min(pinnedMessages.length - 1, prev + 1)
                              )
                            }
                            className="p-1 hover:bg-gray-800/50 rounded transition-colors"
                            title="Next pinned message"
                          >
                            <svg
                              className="w-3 h-3 text-gray-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 5l7 7-7 7"
                              />
                            </svg>
                          </button>
                        )}
                    </div>

                    {/* Close button */}
                    <button
                      onClick={() => {
                        setPinnedIds(new Set());
                        persistPinned(new Set());
                      }}
                      className="p-1 hover:bg-gray-800/50 rounded-md transition-all duration-200 flex-shrink-0"
                      title="Unpin all messages"
                    >
                      <X className="w-4 h-4 text-gray-400 hover:text-gray-200 transition-colors" />
                    </button>
                  </div>
                );
              })()}
              <div className="min-h-full flex flex-col justify-end">
                {messagesWithDateSeparators.map((item, i) => {
                  if (item.type === "dateSeparator") {
                    return (
                      <div
                        key={`date-${item.data.date}-${i}`}
                        className="flex items-center justify-center my-6"
                      >
                        <div className="bg-gray-800 text-gray-100 px-4 py-2 rounded-full text-sm font-medium">
                          {item.data.label}
                        </div>
                      </div>
                    );
                  }

                  const message = item.data;
                  const sender = (message as any).sender ?? message.senderId;
                  const isSentByMe = sender === loggedInUser?._id;
                            const uniqueKey = `${message._id}-${i}`;
                  const isMarked = false;
                  const rawText: string = message.text || "";
                  const isForwarded =
                    typeof rawText === "string" &&
                    /^Forwarded(\s*\n)?/i.test(rawText);
                  const displayText = isForwarded
                    ? rawText.replace(/^Forwarded\s*\n?/i, "")
                    : rawText;
                            
                            return (
                                      <div
                      className={`flex mb-4 w-full`}
                      style={{
                        flexDirection: isSentByMe ? "row-reverse" : "row",
                        justifyContent: isSentByMe
                          ? "flex-start"
                          : "flex-start",
                      }}
                                        key={uniqueKey}
                      onClick={(e) => {
                        /* normal click does nothing in single-select mode */
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setOptionsMsg(message);
                        setOptionsOpen(true);
                      }}
                      onPointerDown={() => {
                        if (longPressTimerRef.current)
                          window.clearTimeout(longPressTimerRef.current);
                        longPressTimerRef.current = window.setTimeout(() => {
                          setOptionsMsg(message);
                          setOptionsOpen(true);
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
                    >
                      <div
                        id={`message-${message._id}`}
                        className={`flex items-start gap-2 min-w-0 ${
                          isSentByMe ? "flex-row-reverse" : "flex-row"
                        }`}
                        style={{ maxWidth: "300px" }}
                      >
                        {/* Checkbox for multi-select */}
                        {multiSelectMode && (
                          <div className="flex-shrink-0 mt-1">
                            <input
                              type="checkbox"
                              checked={selectedMessages.has(message._id)}
                              onChange={(e) => {
                                const newSelected = new Set(selectedMessages);
                                if (e.target.checked) {
                                  newSelected.add(message._id);
                                } else {
                                  newSelected.delete(message._id);
                                }
                                setSelectedMessages(newSelected);
                              }}
                              className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                            />
                          </div>
                        )}

                        <div
                          className={`flex flex-col min-w-0 ${
                            isSentByMe ? "items-end" : "items-start"
                          }`}
                                      >
                                        <div
                            className={`rounded-3xl p-4 shadow-lg transition-all duration-200 break-words w-full
                                              ${
                                              isSentByMe
                                                ? "bg-blue-950/100 text-white rounded-tr-none"
                                                : "bg-gray-700 text-white rounded-tl-none"
                                            }
                                            ${
                                              message.messageType === "image"
                                                ? "p-2"
                                                : ""
                                            }`}
                          >
                            {isForwarded && (
                              <div className="flex items-center gap-1 text-xs opacity-90 mb-1">
                                <ForwardIcon className="w-3 h-3" />
                                <span className="italic">Forwarded</span>
                              </div>
                            )}
                            {/* Referenced message for replies */}
                            {message.replyTo && (
                              <button
                                onClick={() =>
                                  scrollToMessage(message.replyTo._id)
                                }
                                className="w-full text-left bg-gray-700/50 border-l-2 border-blue-500 rounded-l-md p-2 mb-2 hover:bg-gray-700/70 transition-colors cursor-pointer"
                              >
                                <div className="text-xs text-blue-400 font-medium mb-1">
                                  {(() => {
                                    const replySender =
                                      (message.replyTo as any).sender ??
                                      message.replyTo.senderId;
                                    return getUserName(replySender);
                                  })()}
                                </div>
                                {message.replyTo.messageType === "image" &&
                                message.replyTo.image ? (
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 bg-gray-600 rounded flex items-center justify-center">
                                      <span className="text-xs">📸</span>
                                    </div>
                                    <Image
                                      src={message.replyTo.image.url}
                                      alt="Referenced image"
                                      width={40}
                                      height={40}
                                      className="rounded object-cover"
                                    />
                                  </div>
                                ) : (
                                  <div className="text-xs text-gray-300 truncate">
                                    {(() => {
                                      const rawText =
                                        message.replyTo.text || "";
                                      const isForwarded =
                                        typeof rawText === "string" &&
                                        /^Forwarded(\s*\n)?/i.test(rawText);
                                      const cleanText = isForwarded
                                        ? rawText.replace(
                                            /^Forwarded\s*\n?/i,
                                            ""
                                          )
                                        : rawText || "Message";
                                      // Show only first 30 characters
                                      const displayText = cleanText.length > 30
                                        ? cleanText.substring(0, 30) + "..."
                                        : cleanText;
                                      return makeLinksClickable(displayText);
                                    })()}
                                  </div>
                                )}
                              </button>
                            )}
                                          {message.messageType === "image" &&
                                            message.image && (
                                              <div className="relative group overflow-hidden rounded-lg">
                                                <Image
                                                  src={message.image.url}
                                                  alt="shared image"
                                                  width={400}
                                                  height={300}
                                                  className="max-w-full h-auto rounded-lg hover:scale-[1.02] transition-transform duration-300"
                                                  style={{ objectFit: "cover" }}
                                                />
                                              </div>
                                            )}
                              {displayText && (
                                <p
                                  className={`break-words whitespace-pre-wrap overflow-wrap-anywhere ${
                                   message.messageType === "image" ? "mt-2" : ""
                                  }`}
                                >
                                 {makeLinksClickable(displayText)}
                                              </p>
                                            )}
                                        </div>

                                        <div
                            className={`flex items-center gap-1 text-xs mt-1 px-2 ${
                              isSentByMe ? "text-gray-300" : "text-gray-400"
                            }`}
                            style={{
                              flexDirection: isSentByMe ? "row-reverse" : "row",
                            }}
                                        >
                                          <span>
                              {moment(message.createdAt).format("h:mm A")}
                                          </span>
                                          {isSentByMe && (
                              <div className="flex items-center">
                                              {message.seen ? (
                                                <div className="flex items-center gap-1 text-blue-300">
                                                  <CheckCheck className="w-3 h-3" />
                                                  {message.seenAt && (
                                                    <span className="opacity-75">
                                        {moment(message.seenAt).format(
                                          "h:mm A"
                                        )}
                                                    </span>
                                                  )}
                                                </div>
                                              ) : (
                                                <Check className="w-3 h-3 text-gray-400" />
                                              )}
                                            </div>
                                          )}
                          </div>
                        </div>
                                        </div>
                                       </div>
                            );
                        })}
                        <div ref={bottomRef} />
              </div>
                    </>
                )}
            </div>
            
        {/* Options Modal (centered) */}
        {optionsOpen && optionsMsg && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
            onClick={() => setOptionsOpen(false)}
          >
            <div
              className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-xs py-2"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => {
                  setMultiSelectMode(true);
                  setSelectedMessages(new Set([optionsMsg._id]));
                  setOptionsOpen(false);
                }}
                className="w-full px-4 py-2 text-left hover:bg-gray-800 text-gray-200 flex items-center gap-2"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>{" "}
                Select
              </button>
              <div className="my-1 h-px bg-gray-800" />
              <button
                onClick={() => {
                  props.onReply && props.onReply(optionsMsg);
                  setOptionsOpen(false);
                }}
                className="w-full px-4 py-2 text-left hover:bg-gray-800 text-gray-200 flex items-center gap-2"
              >
                <ReplyIcon className="w-4 h-4" /> Reply
              </button>
              {optionsMsg.text && (
                <button
                  onClick={() => {
                    const rawText = optionsMsg.text || "";
                    const isForwarded = typeof rawText === "string" && /^Forwarded(\s*\n)?/i.test(rawText);
                    const cleanText = isForwarded ? rawText.replace(/^Forwarded\s*\n?/i, "") : rawText;
                    navigator.clipboard.writeText(cleanText);
                    setOptionsOpen(false);
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-gray-800 text-gray-200 flex items-center gap-2"
                >
                  <CopyIcon className="w-4 h-4" /> Copy
                </button>
              )}
              <button
                onClick={() => {
                  setForwardOpen(true);
                  setForwardTargets(new Set());
                  setOptionsOpen(false);
                }}
                className="w-full px-4 py-2 text-left hover:bg-gray-800 text-gray-200 flex items-center gap-2"
              >
                <ForwardIcon className="w-4 h-4" /> Forward
              </button>
              <button
                onClick={() => {
                  setPinnedIds((prev) => {
                    const next = new Set(prev);
                    if (next.has(optionsMsg._id)) next.delete(optionsMsg._id);
                    else {
                      const arr = [...next];
                      if (arr.length >= 2) {
                        next.delete(arr[0]);
                      }
                      next.add(optionsMsg._id);
                    }
                    persistPinned(next);
                    return next;
                  });
                  setOptionsOpen(false);
                }}
                className="w-full px-4 py-2 text-left hover:bg-gray-800 text-gray-200 flex items-center gap-2"
              >
                <PinIcon className="w-4 h-4" />{" "}
                {pinnedIds.has(optionsMsg._id) ? "Unpin" : "Pin"}
              </button>
              <div className="my-1 h-px bg-gray-800" />
              <button
                onClick={() => {
                  setOptionsOpen(false);
                  setConfirmOpen(true);
                }}
                className="w-full px-4 py-2 text-left hover:bg-gray-800 text-red-300 flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            </div>
        </div>
        )}

        {/* Forward Modal */}
        {forwardOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            onClick={() => setForwardOpen(false)}
          >
            <div
              className="bg-gray-900 border border-gray-700 rounded-xl p-5 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-white font-semibold mb-3 flex items-center justify-between">Forward to
              <button
                  onClick={() => {
                    setForwardOpen(false);
                    if (multiSelectMode) {
                      setMultiSelectMode(false);
                      setSelectedMessages(new Set());
                    }
                  }}
                  className="px-3 py-2 rounded-md text-gray-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <input
                value={forwardQuery}
                onChange={(e) => setForwardQuery(e.target.value)}
                placeholder="Search users..."
                className="w-full bg-gray-800 text-white rounded-md px-3 py-2 border border-gray-700 mb-3"
              />
              <div className="max-h-64 overflow-auto space-y-2">
                {chats
                  ?.filter((c) =>
                    ((c as any).user?.name || "")
                      .toLowerCase()
                      .includes(forwardQuery.toLowerCase())
                  )
                  .map((c) => {
                    const checked = forwardTargets.has(c.chat._id);
                    return (
                      <label
                        key={c.chat._id}
                        className={`flex items-center gap-2 p-2 rounded-lg border ${
                          checked
                            ? "border-blue-500 bg-gray-800"
                            : "border-gray-700 hover:bg-gray-800"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            setForwardTargets((prev) => {
                              const next = new Set(prev);
                              if (next.has(c.chat._id)) next.delete(c.chat._id);
                              else next.add(c.chat._id);
                              return next;
                            });
                          }}
                        />
                        <span className="text-white">
                          {(c as any).user?.name?.split("@")[0]}
                        </span>
                      </label>
                    );
                  })}
              </div>
              <div className="flex justify-end gap-2 mt-3">
                
                <button
                  onClick={async () => {
                    const token = Cookies.get("token");
                    const ids = Array.from(forwardTargets);
                    const selected = optionsMsg
                      ? [optionsMsg._id]
                      : Array.from(selectedMessages);
                    for (const chatId of ids) {
                      const text = selected
                        .map((id) => {
                          const m = sortedMessages.find((mm) => mm._id === id);
                          const rawText = m?.text || (m?.image ? "Photo" : "");
                          // Clean "Forwarded" prefix if present
                          const isForwarded = typeof rawText === "string" && /^Forwarded(\s*\n)?/i.test(rawText);
                          return isForwarded ? rawText.replace(/^Forwarded\s*\n?/i, "") : rawText;
                        })
                        .filter(Boolean)
                        .join("\n");
                      if (!text) continue;
                      const fd = new FormData();
                      fd.append("chatId", chatId);
                      fd.append("text", `Forwarded\n${text}`);
                      try {
                        const response = await axios.post(
                          `${chat_service}/api/v1/message/`,
                          fd,
                          { headers: { Authorization: `Bearer ${token}` } }
                        );
                        
                        // Trigger real-time update for forwarded message
                        if (response.data && response.data.message) {
                          console.log("Forwarding message, calling onMessageForwarded:", response.data.message);
                          onMessageForwarded?.(response.data.message);
                          toast.success('Message forwarded successfully');
                        } else {
                          console.log("No message data in response:", response.data);
                        }
                      } catch (error) {
                        console.error('Error forwarding message:', error);
                        toast.error('Failed to forward message');
                      }
                    }
                    setForwardOpen(false);
                    setMultiSelectMode(false);
                    setSelectedMessages(new Set());
                  }}
                  disabled={forwardTargets.size === 0}
                  className="bg-blue-600 hover:bg-blue-700 px-3 py-3 rounded-full transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed text-white"
                >
                  <Send />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete confirm */}
        {confirmOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            onClick={() => setConfirmOpen(false)}
          >
            <div
              className="bg-gray-900 border border-gray-700 rounded-xl p-4 w-full max-w-xs"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-white font-semibold mb-4">
                Delete message
              </div>

              <div className="flex flex-col gap-2">
                <button
                  onClick={() => {
                    if (!optionsMsg) return;
                    setHiddenIds((prev) => {
                      const next = new Set(prev);
                      next.add(optionsMsg._id);
                      persistHidden(next);
                      return next;
                    });
                    setConfirmOpen(false);
                  }}
                  className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white font-medium transition-colors"
                >
                  Delete for me
                </button>

                {(() => {
                  if (!optionsMsg) return null;
                  const isFromSender =
                    ((optionsMsg as any).sender ?? optionsMsg.senderId) ===
                    loggedInUser?._id;
                  if (!isFromSender) return null; // Hide for receiver messages

                  return (
                    <button
                      onClick={async () => {
                        if (!optionsMsg) return;
                        const token = Cookies.get("token");
                        try {
                          await axios.delete(
                            `${chat_service}/api/v1/message/${optionsMsg._id}`,
                            {
                              headers: { Authorization: `Bearer ${token}` },
                            }
                          );
                        } catch {}
                        setConfirmOpen(false);
                      }}
                      className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium transition-colors"
                    >
                      Delete for everyone
                    </button>
                  );
                })()}

                <button
                  onClick={() => setConfirmOpen(false)}
                  className="w-full px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-300 font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Multi-Select Action Panel */}
        {multiSelectMode && selectedMessages.size > 0 && (
          <div className="fixed bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-700 px-4 py-3 flex items-center justify-between z-40">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setMultiSelectMode(false);
                  setSelectedMessages(new Set());
                }}
                className="p-2 hover:bg-gray-700 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-300" />
              </button>
              <span className="text-white font-medium">
                {selectedMessages.size} selected
              </span>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  setForwardOpen(true);
                  setForwardTargets(new Set());
                }}
                className="p-2 hover:bg-gray-700 rounded-full transition-colors"
                title="Forward"
              >
                <ForwardIcon className="w-5 h-5 text-gray-300" />
              </button>

              <button
                onClick={() => setMultiDeleteOpen(true)}
                className="p-2 hover:bg-gray-700 rounded-full transition-colors"
                title="Delete"
              >
                <Trash2 className="w-5 h-5 text-gray-300" />
              </button>
            </div>
          </div>
        )}

        {/* Multi-Delete Confirm */}
        {multiDeleteOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            onClick={() => setMultiDeleteOpen(false)}
          >
            <div
              className="bg-gray-900 border border-gray-700 rounded-xl p-4 w-full max-w-xs"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-white font-semibold mb-4">
                Delete {selectedMessages.size} messages
              </div>

              <div className="flex flex-col gap-2">
                <button
                  onClick={async () => {
                    // Delete for me (local hide)
                    const selectedIds = Array.from(selectedMessages);
                    let hiddenMessages = JSON.parse(
                      localStorage.getItem("hiddenMessages") || "[]"
                    );
                    hiddenMessages = [...hiddenMessages, ...selectedIds];
                    localStorage.setItem(
                      "hiddenMessages",
                      JSON.stringify(hiddenMessages)
                    );

                    setMultiSelectMode(false);
                    setSelectedMessages(new Set());
                    setMultiDeleteOpen(false);
                  }}
                  className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white font-medium transition-colors"
                >
                  Delete for me
                </button>

                {(() => {
                  const selectedMsgs = sortedMessages.filter((m) =>
                    selectedMessages.has(m._id)
                  );
                  const allFromSender = selectedMsgs.every((m) => {
                    const sender = (m as any).sender ?? m.senderId;
                    return sender === loggedInUser?._id;
                  });

                  if (allFromSender) {
                    return (
                      <button
                        onClick={async () => {
                          // Delete for everyone (API call)
                          const token = Cookies.get("token");
                          const selectedIds = Array.from(selectedMessages);

                          for (const messageId of selectedIds) {
                            try {
                              await axios.delete(
                                `${chat_service}/api/v1/message/${messageId}`,
                                {
                                  headers: { Authorization: `Bearer ${token}` },
                                }
                              );
                            } catch (error) {
                              console.error("Error deleting message:", error);
                            }
                          }

                          setMultiSelectMode(false);
                          setSelectedMessages(new Set());
                          setMultiDeleteOpen(false);
                        }}
                        className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium transition-colors"
                      >
                        Delete for everyone
                      </button>
                    );
                  }
                  return null;
                })()}

                <button
                  onClick={() => {
                    setMultiDeleteOpen(false);
                  }}
                  className="w-full px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-300 font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
}

export default ChatMessages