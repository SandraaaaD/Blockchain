import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getMessagesApi, sendMessageApi } from '../../api/projects';
import type { Message } from '../../types';
import { Send, Paperclip, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

interface Props {
  projectId: number;
}

export default function ChatPanel({ projectId }: Props) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [content, setContent] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, 3000);
    return () => clearInterval(interval);
  }, [projectId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadMessages = async () => {
    try {
      const msgs = await getMessagesApi(projectId);
      setMessages(msgs);
    } catch {
      // silent
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && !file) return;
    setSending(true);
    try {
      const msg = await sendMessageApi(projectId, content, file || undefined);
      setMessages((prev) => [...prev, msg]);
      setContent('');
      setFile(null);
    } catch {
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col bg-white rounded-xl border border-gray-200 overflow-hidden" style={{ height: '600px' }}>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p className="text-sm">No messages yet. Start the conversation!</p>
          </div>
        )}
        {messages.map((msg) => {
          const isMe = msg.sender.id === user?.id;
          return (
            <div key={msg.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-sm shrink-0">
                {msg.sender.fullName.charAt(0).toUpperCase()}
              </div>
              <div className={`max-w-[70%] ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 font-medium">{isMe ? 'You' : msg.sender.fullName}</span>
                  <span className="text-xs text-gray-400">
                    {format(new Date(msg.createdAt), 'HH:mm')}
                  </span>
                </div>
                <div className={`rounded-2xl px-4 py-2.5 ${
                  isMe
                    ? 'bg-blue-600 text-white rounded-tr-sm'
                    : 'bg-gray-100 text-gray-900 rounded-tl-sm'
                }`}>
                  {msg.content && <p className="text-sm">{msg.content}</p>}
                  {msg.fileUrl && (
                    <a
                      href={msg.fileUrl ?? '#'}
                      target="_blank"
                      rel="noreferrer"
                      className={`flex items-center gap-1.5 text-xs mt-1 ${isMe ? 'text-blue-200 hover:text-white' : 'text-blue-600 hover:text-blue-800'}`}
                    >
                      <Paperclip size={12} />
                      {msg.fileName || 'Attachment'}
                    </a>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* File preview */}
      {file && (
        <div className="px-4 py-2 bg-blue-50 border-t border-blue-100 flex items-center gap-2">
          <Paperclip size={14} className="text-blue-500" />
          <span className="text-sm text-blue-700 flex-1 truncate">{file.name}</span>
          <button onClick={() => setFile(null)} className="text-blue-400 hover:text-blue-600">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSend} className="border-t border-gray-200 p-3 flex items-center gap-2">
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <Paperclip size={18} />
        </button>
        <input
          type="text"
          className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Type a message..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <button
          type="submit"
          disabled={sending || (!content.trim() && !file)}
          className="btn-primary p-2 !px-3"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}
