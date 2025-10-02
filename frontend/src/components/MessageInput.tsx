import { File, Loader2, Paperclip, Send, Smile, X, Search } from 'lucide-react';
import React, { useState, useRef, forwardRef, useImperativeHandle } from 'react';
import { EmojiPicker } from 'frimousse';

interface MessageInputProps {
    selectedUser: string | null;
    message: string;
    setMessage: (message: string) => void;
    handleMessageSend: (e:any, imageFile?: File | null) => void;
    onFileSelect?: (file: File) => void;
}

const MessageInput = forwardRef<any, MessageInputProps>(({
  selectedUser,
  message,
  setMessage,
  handleMessageSend,
  onFileSelect,
}, ref) => {
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [fileType, setFileType] = useState<'image' | 'document' | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textInputRef = useRef<HTMLInputElement>(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const pickerRef = useRef<HTMLDivElement>(null);

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
        } else if (file.type === "application/pdf" || 
                  file.type === "application/msword" || 
                  file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
                  file.type === "text/plain") {
            setFileType('document');
            setImageFile(file);
            if (onFileSelect) {
                onFileSelect(file);
            }
        } else {
            alert("Unsupported file type. Please upload an image or document (PDF, DOC, DOCX, TXT).");
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
        // restore caret after emoji
        requestAnimationFrame(() => {
            input.focus();
            const caret = start + emoji.length;
            input.setSelectionRange(caret, caret);
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
    accept="image/*,.pdf,.doc,.docx,.txt"
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
            setShowEmojiPicker(false);
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
  <input
    type="text"
    ref={textInputRef}
    className="flex-1 bg-gray-800 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
    placeholder={imageFile ? "Add a caption..." : "Type a message..."}
    value={typeof message === 'string' ? message : ''}
    onChange={(e) => setMessage(e.target.value)}
  />

  {/* Send Button */}
  <button
    type='submit'
    disabled={(!imageFile && !message) || isUploading}
    className='bg-blue-600 hover:bg-blue-700 px-4 py-3 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-white'
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