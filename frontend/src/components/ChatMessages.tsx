import { Message } from '@/app/chat/page';
import { User } from '@/context/AppContext';
import React, { useEffect, useRef, useMemo, useState } from 'react'
import Image from 'next/image';
import moment from 'moment';
import { Check, CheckCheck, MessageCircle, Trash2, X } from 'lucide-react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { chat_service } from '@/context/AppContext';

interface ChatMessagesProps{
    selectedUser: string | null;
    messages: Message[] | null;
    loggedInUser : User | null;
}

const ChatMessages = ({
    selectedUser, 
    messages, 
    loggedInUser
}:ChatMessagesProps) => {
    const bottomRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const longPressTimerRef = useRef<number | null>(null);

    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
    
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

    // Clear selection state when switching to another chat
    useEffect(() => {
        setSelectionMode(false);
        setSelectedIds(new Set());
    }, [selectedUser]);


    return (
        <div className='h-full w-full overflow-hidden relative'>
            <div 
                ref={messagesContainerRef}
                className='h-full w-full overflow-y-auto px-6 pt-6 pb-4 custom-scroll'
            >
               {!selectedUser ? (
                    <div className='flex flex-col items-center justify-center h-full min-h-[500px] text-center'>
                        <div className='p-4 bg-gray-800 rounded-full mb-4'>
                            <MessageCircle className='w-12 h-12 text-blue-400' />
                        </div>
                        <h3 className='text-xl font-bold text-white mb-2'>No conversation selected</h3>
                        <p className='text-gray-400 max-w-xs'>
                            Choose a conversation from the sidebar to start messaging
                        </p>
                    </div>
                ) : uniqueMessages.length === 0 ? (
                    <div className='flex flex-col items-center justify-center h-full text-center'>
                        <div className='p-4 bg-gray-800 rounded-full mb-4'>
                            <MessageCircle className='w-12 h-12 text-blue-400' />
                        </div>
                        <h3 className='text-xl font-bold text-white mb-2'>No messages yet</h3>
                        <p className='text-gray-400 max-w-xs'>
                            Send a message to start the conversation
                        </p>
                    </div>
                ) : (
                    <div className="min-h-full flex flex-col justify-end">
                        {/* Selection toolbar */}
                        {selectionMode && (
                            <div className="sticky top-0 z-10 -mt-2 mb-2 px-3 py-2 bg-gray-800/90 backdrop-blur border border-gray-700 rounded-lg flex items-center justify-between">
                                <div className="text-sm text-gray-200">{selectedIds.size} selected</div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => {
                                            if (selectedIds.size === 0) return;
                                            setHiddenIds(prev => {
                                                const next = new Set(prev);
                                                selectedIds.forEach(id => next.add(id));
                                                persistHidden(next);
                                                return next;
                                            });
                                            setSelectionMode(false);
                                            setSelectedIds(new Set());
                                        }}
                                        className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-md flex items-center gap-2"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        Me
                                    </button>
                                    <button
                                        onClick={async () => {
                                            if (selectedIds.size === 0) return;
                                            // Only sender can delete for everyone
                                            const allMine = sortedMessages
                                                .filter(m => selectedIds.has(m._id))
                                                .every(m => ((m as any).sender ?? m.senderId) === loggedInUser?._id);
                                            if (!allMine) return;
                                            const token = Cookies.get('token');
                                            const ids = Array.from(selectedIds);
                                            for (const id of ids) {
                                                try {
                                                    await axios.delete(`${chat_service}/api/v1/message/${id}`, {
                                                        headers: { Authorization: `Bearer ${token}` }
                                                    });
                                                } catch {}
                                            }
                                            setSelectionMode(false);
                                            setSelectedIds(new Set());
                                        }}
                                        className={`px-3 py-1.5 rounded-md flex items-center gap-2 ${
                                            (() => {
                                                const ids = Array.from(selectedIds);
                                                const allMine = sortedMessages
                                                    .filter(m => ids.includes(m._id))
                                                    .every(m => ((m as any).sender ?? m.senderId) === loggedInUser?._id);
                                                return allMine ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-gray-600 text-gray-300 cursor-not-allowed';
                                            })()
                                        }`}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        Everyone
                                    </button>
                                    <button
                                        onClick={() => { setSelectionMode(false); setSelectedIds(new Set()); }}
                                        className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-md flex items-center gap-2"
                                    >
                                        <X className="w-4 h-4" />
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}

                        {messagesWithDateSeparators.map((item, i) => {
                            if (item.type === 'dateSeparator') {
                                return (
                                    <div key={`date-${item.data.date}-${i}`} className="flex items-center justify-center my-6">
                                        <div className="bg-gray-700 text-gray-300 px-4 py-2 rounded-full text-sm font-medium">
                                            {item.data.label}
                                        </div>
                                    </div>
                                );
                            }
                            
                            const message = item.data;
                            const sender = (message as any).sender ?? message.senderId;
                            const isSentByMe = sender === loggedInUser?._id;
                            const uniqueKey = `${message._id}-${i}`;
                            const isMarked = selectedIds.has(message._id);
                            
                            return (
                                <div
                                    className={`flex mb-4 w-full ${isMarked ? 'ring-2 ring-blue-500/50 rounded-xl' : ''}`}
                                    style={{
                                        flexDirection: isSentByMe ? 'row-reverse' : 'row',
                                        justifyContent: isSentByMe ? 'flex-start' : 'flex-start'
                                    }}
                                    key={uniqueKey}
                                    onClick={(e) => {
                                        if (selectionMode) {
                                            e.preventDefault();
                                            setSelectedIds(prev => {
                                                const next = new Set(prev);
                                                if (next.has(message._id)) next.delete(message._id); else next.add(message._id);
                                                if (next.size === 0) setSelectionMode(false);
                                                return next;
                                            });
                                        }
                                    }}
                                    onContextMenu={(e) => {
                                        e.preventDefault();
                                        if (!selectionMode) {
                                            setSelectionMode(true);
                                            setSelectedIds(new Set([message._id]));
                                        } else {
                                            setSelectedIds(prev => {
                                                const next = new Set(prev);
                                                if (next.has(message._id)) next.delete(message._id); else next.add(message._id);
                                                if (next.size === 0) setSelectionMode(false);
                                                return next;
                                            });
                                        }
                                    }}
                                    onPointerDown={() => {
                                        if (longPressTimerRef.current) window.clearTimeout(longPressTimerRef.current);
                                        longPressTimerRef.current = window.setTimeout(() => {
                                            setSelectionMode(true);
                                            setSelectedIds(new Set([message._id]));
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
                                    <div className={`flex flex-col ${
                                        isSentByMe ? "items-end" : "items-start"
                                    }`}
                                    style={{ maxWidth: '70%', minWidth: '0' }}>
                                        <div
                                            className={`rounded-2xl p-4 shadow-lg transition-all duration-200 break-words
                                                ${
                                                    isSentByMe
                                                        ? "bg-blue-500 text-white rounded-tr-none"
                                                        : "bg-gray-700 text-white rounded-tl-none"
                                                }
                                                ${message.messageType === "image" ? "p-2" : ""}`}
                                        >
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
                                            {message.text && (
                                                <p
                                                    className={`break-words ${
                                                        message.messageType === "image"
                                                            ? "mt-2"
                                                            : ""
                                                    }`}
                                                >
                                                    {message.text}
                                                </p>
                                            )}
                                        </div>
                                        
                                        <div
                                            className={`flex items-center gap-1 text-xs mt-1 px-2 ${
                                                isSentByMe
                                                    ? "text-gray-300"
                                                    : "text-gray-400"
                                            }`}
                                            style={{
                                                flexDirection: isSentByMe ? 'row-reverse' : 'row'
                                            }}
                                        >
                                            <span>
                                                {moment(message.createdAt).format(
                                                    "h:mm A"
                                                )}
                                            </span>
                                            {isSentByMe && (
                                                <div className="flex items-center">
                                                    {message.seen ? (
                                                        <div className="flex items-center gap-1 text-blue-300">
                                                            <CheckCheck className="w-3 h-3" />
                                                            {message.seenAt && (
                                                                <span className="opacity-75">
                                                                    {moment(
                                                                        message.seenAt
                                                                    ).format("h:mm A")}
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
                            );
                        })}
                        <div ref={bottomRef} />
                    </div>
                )}
            </div>
            
        </div>
    )
}

export default ChatMessages