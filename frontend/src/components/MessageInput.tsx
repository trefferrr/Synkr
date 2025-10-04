import { File, Loader2, Paperclip, Send, Smile, X, Search } from 'lucide-react';
import React, { useState, useRef, forwardRef, useImperativeHandle, useEffect } from 'react';
import { EmojiPicker } from 'frimousse';

interface MessageInputProps {
    selectedUser: string | null;
    message: string;
    setMessage: (message: string) => void;
    handleMessageSend: (e:any, imageFile?: File | null) => void;
    onFileSelect?: (file: File) => void;
    replyPreview?: any | null;
    onCancelReply?: () => void;
    loggedInUser?: any;
    chats?: any[];
    sendTyping?: (data: { chatId: string; userId: string }) => void;
    sendStopTyping?: (data: { chatId: string; userId: string }) => void;
}

const MessageInput = forwardRef<any, MessageInputProps>(({
  selectedUser,
  message,
  setMessage,
  handleMessageSend,
  onFileSelect,
  replyPreview,
  onCancelReply,
  loggedInUser,
  chats,
  sendTyping,
  sendStopTyping,
}, ref) => {
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [fileType, setFileType] = useState<'image' | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textInputRef = useRef<HTMLTextAreaElement>(null);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const pickerRef = useRef<HTMLDivElement>(null);
    const [textareaHeight, setTextareaHeight] = useState('auto');

    const getUserName = (senderId: string) => {
        if (senderId === loggedInUser?._id) return 'You';
        
        // Find the chat to get the other user's name
        const currentChat = chats?.find(chat => chat.chat._id === selectedUser);
        if (currentChat && (currentChat as any).user) {
            return (currentChat as any).user.name.split('@')[0];
        }
        
        return 'User';
    };

    const handleTyping = (value: string) => {
      setMessage(value);
      
      // Send typing event
      if (selectedUser && loggedInUser && sendTyping) {
        sendTyping({ chatId: selectedUser, userId: loggedInUser._id });
        
        // Clear existing timeout
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        
        // Set new timeout to send stop typing after 2 seconds
        typingTimeoutRef.current = setTimeout(() => {
          if (sendStopTyping) {
            sendStopTyping({ chatId: selectedUser, userId: loggedInUser._id });
          }
        }, 2000);
      }
    };

    const adjustTextareaHeight = () => {
        if (textInputRef.current) {
            textInputRef.current.style.height = 'auto';
            const scrollHeight = textInputRef.current.scrollHeight;
            const maxHeight = 120; // Maximum height in pixels (about 5 lines)
            const newHeight = Math.min(scrollHeight, maxHeight);
            textInputRef.current.style.height = `${newHeight}px`;
            setTextareaHeight(`${newHeight}px`);
        }
    };

    const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        handleTyping(e.target.value);
        adjustTextareaHeight();
    };

    // Adjust height when message changes externally (e.g., after sending)
    useEffect(() => {
        adjustTextareaHeight();
    }, [message]);

    // Expose methods to parent component
    useImperativeHandle(ref, () => ({
        clearFileInput: () => {
            setImageFile(null);
            setFileType(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    }));
    
    const handleSubmit = async(e:any) => {
    e.preventDefault();
    if(!message && !imageFile) return;

        setIsUploading(true);
        try {
            await handleMessageSend(e, imageFile);
            setImageFile(null);
            setFileType(null);
        } catch (error) {
            console.error("Error sending message:", error);
        } finally {
            setIsUploading(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        if (file.type.startsWith("image/")) {
            setFileType('image');
            setImageFile(file);
            if (onFileSelect) {
                onFileSelect(file);
            }
        } else {
            alert("Unsupported file type. Please upload an image only.");
        }
    };

    const insertEmoji = (emoji: string) => {
        const current = typeof message === 'string' ? message : '';
        const input = textInputRef.current;
        if (!input) {
            setMessage(current + emoji);
            return;
        }
        const start = input.selectionStart ?? current.length;
        const end = input.selectionEnd ?? current.length;
        const next = current.slice(0, start) + emoji + current.slice(end);
        setMessage(next);
        // restore caret after emoji and adjust height
        requestAnimationFrame(() => {
            input.focus();
            const caret = start + emoji.length;
            input.setSelectionRange(caret, caret);
            adjustTextareaHeight();
        });
    };

    // Custom Frimousse components to control size/spacing
    const EmojiRow = (props: any) => (
      <div {...props} className={`grid grid-cols-6 gap-3 px-1 ${props.className || ''}`} />
    );
    const EmojiButton = (props: any) => {
      const { emoji, className, ...rest } = props;
      return (
        <button
          {...rest}
          className={`text-3xl h-12 w-12 rounded-lg hover:bg-gray-800 flex items-center justify-center ${className || ''}`}
          title={emoji?.label}
        >
          {emoji?.emoji}
        </button>
      );
    };
    const EmojiHeader = (props: any) => {
      const { category, className, ...rest } = props;
      return (
        <div
          {...rest}
          className={`sticky top-0 z-10 bg-gray-900/95 backdrop-blur px-2 py-1 text-xs text-gray-400 border-b border-gray-800 ${className || ''}`}
        >
          {category?.label}
        </div>
      );
    };

    // Close emoji picker on outside click / Escape
    React.useEffect(() => {
        if (!showEmojiPicker) return;
        const onClick = (e: MouseEvent) => {
            if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
                setShowEmojiPicker(false);
            }
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setShowEmojiPicker(false);
        };
        document.addEventListener('mousedown', onClick);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onClick);
            document.removeEventListener('keydown', onKey);
        };
    }, [showEmojiPicker]);

    if(!selectedUser) return null;

  return (
        <form
  onSubmit={handleSubmit}
  className="flex items-center gap-2 border-t border-gray-700 px-3 py-2 bg-gray-900"
  style={{ margin: '0px', paddingTop: '8px', paddingBottom: '8px', marginTop: '-20px' }}
>
  {replyPreview && (
    <div className="absolute bottom-18.5 left-3 right-3 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2">
      <div className="flex items-center gap-2 mb-1 ">
        <div className="text-blue-400 text-xs font-medium">Replying</div>
        <div className="text-gray-400 text-xs">
          {(() => {
            const sender = (replyPreview as any).sender ?? replyPreview.senderId;
            return getUserName(sender);
          })()}
        </div>
        <button type="button" onClick={onCancelReply} className="ml-auto p-1 hover:bg-gray-700 rounded transition-colors">
          <X className="w-4 h-4 text-gray-400 hover:text-gray-200" />
        </button>
      </div>
      <div className="text-gray-300 text-xs truncate">
        {(() => {
          const rawText = replyPreview?.text || '';
          const isForwarded = typeof rawText === 'string' && /^Forwarded(\s*\n)?/i.test(rawText);
          const displayText = isForwarded ? rawText.replace(/^Forwarded\s*\n?/i, '') : rawText;
          const finalText = displayText || (replyPreview?.image ? '📸 Photo' : 'Message');
          // Show only first 40 characters in preview
          return finalText.length > 40 ? finalText.substring(0, 40) + '...' : finalText;
        })()}
      </div>
    </div>
  )}
  {/* File Button */}
  <button
    type="button"
    onClick={() => fileInputRef.current?.click()}
    className="cursor-pointer bg-gray-800 hover:bg-gray-700 rounded-lg px-3 py-2 transition-colors flex items-center gap-1"
  >
    <Paperclip size={18} className="w-5 h-5 text-gray-300" />
    <span className="text-xs text-gray-300"></span>
  </button>
  <input
    ref={fileInputRef}
    type="file"
    accept="image/*"
    className="hidden"
    onChange={handleFileChange}
  />

  {/* Emoji Button and Panel */}
  <div className="relative">
    <button
      type="button"
      onClick={() => setShowEmojiPicker(v => !v)}
      className={`cursor-pointer rounded-lg px-3 py-2 transition-colors flex items-center gap-1 ml-1 ${showEmojiPicker ? 'bg-gray-700 ring-2 ring-blue-500' : 'bg-gray-800 hover:bg-gray-700'}`}
      aria-label="Toggle emojis"
    >
      <Smile className="w-5 h-5 text-gray-300" />
    </button>
    {showEmojiPicker && (
      <div ref={pickerRef} className="absolute bottom-12 left-0 z-30 w-[360px] bg-gray-900/95 backdrop-blur border border-gray-700 rounded-xl shadow-2xl p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-200">Emoji</span>
          <button
            type="button"
            onClick={() => setShowEmojiPicker(false)}
            className="p-1 rounded-md hover:bg-gray-800 text-gray-300"
            aria-label="Close emoji picker"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <EmojiPicker.Root
          onEmojiSelect={(e: any) => {
            const value = e?.emoji || e?.native || e?.shortcode || '';
            if (value) insertEmoji(value);
          }}
          columns={6}
        >
          <div className="relative mb-1/2">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <EmojiPicker.Search className="w-full bg-gray-800 text-white rounded-md pl-8 pr-3 py-2 outline-none border border-gray-700 focus:border-blue-600 focus:ring-1 focus:ring-blue-600" placeholder="Search emoji..." />
          </div>
          <EmojiPicker.Viewport className="h-64 overflow-auto rounded-md emoji-scroll px-2 pb-3">
            <EmojiPicker.Loading>
              <div className="text-sm text-gray-400 px-2 py-1">Loading…</div>
            </EmojiPicker.Loading>
            <EmojiPicker.Empty>
              <div className="text-sm text-gray-400 px-2 py-1">No emoji found.</div>
            </EmojiPicker.Empty>
            <EmojiPicker.List components={{ Row: EmojiRow, Emoji: EmojiButton, CategoryHeader: EmojiHeader }} />
          </EmojiPicker.Viewport>
        </EmojiPicker.Root>
      </div>
    )}
  </div>


  {/* Message Input */}
  <textarea
    ref={textInputRef}
    className="flex-1 bg-gray-800 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none overflow-hidden"
    placeholder={imageFile ? "Add a caption..." : "Type a msg..."}
    value={typeof message === 'string' ? message : ''}
    onChange={handleMessageChange}
    onKeyDown={(e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit(e);
      }
    }}
    style={{ height: textareaHeight, minHeight: '48px' }}
    rows={1}
  />

  {/* Send Button */}
  <button
    type='submit'
    disabled={(!imageFile && !message) || isUploading}
    className='bg-blue-600 hover:bg-blue-700 px-2 py-3 rounded-full transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed text-white'
  >
    {isUploading ? (
      <Loader2 className='w-4 h-4 animate-spin'/>
    ) : (
      <Send className='w-4 h-4'/>
    )}
    <span className="text-sm hidden sm:inline"/>
  </button>
</form>
    );
});

MessageInput.displayName = 'MessageInput';

export default MessageInput;