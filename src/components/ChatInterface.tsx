"use client";

import { useState, useRef, useEffect, useMemo } from 'react';
import { Send, Bot, User, MessageCircle, MoreVertical, Minus, X, Phone, Video, Mic, Check, CheckCheck, Paperclip, Smile } from 'lucide-react';
import RichMessageRenderer from './RichMessageRenderer';
import { createClient } from '@/utils/supabase/client';
import { getTheme, generateThemeVariables, ThemeConfig } from '@/lib/themes';

interface ChatInterfaceProps {
  businessId: string;
  businessName: string;
  waNumber: string;
  preFilledMsg: string;
  isWidget?: boolean;
  isFullScreen?: boolean;
  initialMessage?: string;
  isDemo?: boolean;
  
  // Customization
  assistantName?: string;
  assistantAvatarUrl?: string;
  quickReplies?: string[];
  collectCustomerData?: boolean;
  customerDataFields?: string[];
  escalationLabel?: string;
  primaryColor?: string;
  showBranding?: boolean;
  themeId?: string;
  customThemeConfig?: any;
  
  automationSettings?: {
    welcome_enabled: boolean;
    follow_up_enabled: boolean;
    idle_message: string;
    closing_reminder: string;
  };
}

interface Message {
  role: 'user' | 'model';
  content: string;
  timestamp?: string;
  status?: 'sent' | 'delivered' | 'read';
}

export default function ChatInterface({
  businessId,
  businessName,
  waNumber,
  preFilledMsg = '',
  isWidget = false,
  isFullScreen = false,
  initialMessage,
  isDemo = false,
  assistantName,
  assistantAvatarUrl,
  quickReplies = [],
  collectCustomerData = false,
  customerDataFields = ['name'],
  escalationLabel = 'Owner',
  primaryColor = '#059669',
  showBranding = true,
  themeId = 'light-blue',
  customThemeConfig = null,
  automationSettings = {
    welcome_enabled: true,
    follow_up_enabled: false,
    idle_message: 'Halo kak, apakah masih ada yang ingin ditanyakan? 😊',
    closing_reminder: 'Karena tidak ada respon, sesi chat ini saya tutup sementara ya. Silakan ketik pesan kapan saja jika butuh bantuan kembali! 🙏'
  }
}: ChatInterfaceProps) {
  
  // Live Config State
  const [liveConfig, setLiveConfig] = useState({
    primaryColor,
    assistantName,
    assistantAvatarUrl,
    quickReplies,
    escalationLabel,
    showBranding,
    automationSettings,
    themeId,
    customThemeConfig
  });

  const displayName = liveConfig.assistantName || businessName;
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isQualified, setIsQualified] = useState(false);
  const [leadSummary, setLeadSummary] = useState('');
  const [waMessageDraft, setWaMessageDraft] = useState('');
  const [showQuickReplies, setShowQuickReplies] = useState(true);
  const [dynamicSuggestions, setDynamicSuggestions] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Forms
  const [customerData, setCustomerData] = useState<Record<string, string>>({});
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [customerDataSubmitted, setCustomerDataSubmitted] = useState(false);

  const supabase = useMemo(() => createClient(), []);
  
  const conversationId = useMemo(() => {
     if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
         return window.crypto.randomUUID();
     }
     return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }, []);

  // Realtime
  useEffect(() => {
     if (!conversationId) return;
     const channel = supabase.channel(`conversation-${conversationId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'Conversations', filter: `id=eq.${conversationId}` },
        (payload: any) => {
          if (payload.new && payload.new.logs) {
            // Map old logs to new format if needed
            const newLogs = payload.new.logs.map((m: any) => ({
              ...m,
              timestamp: m.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              status: m.status || 'read'
            }));
            setMessages(newLogs);
          }
        }
      )
      .subscribe();
     return () => { supabase.removeChannel(channel); };
  }, [conversationId, supabase]);

  // Initial Greetings
  useEffect(() => {
    if (messages.length === 0 && liveConfig.automationSettings.welcome_enabled) {
      const greetings = [
        `Halo! Saya ${displayName} dari ${businessName}. Ada yang bisa saya bantu hari ini?`,
        `Selamat datang di ${businessName}! Saya ${displayName}, ada yang ingin ditanyakan?`
      ];
      const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];
      setMessages([{ 
        role: 'model', 
        content: initialMessage || randomGreeting,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'read'
      }]);
    }
  }, [displayName, businessName, initialMessage, liveConfig.automationSettings.welcome_enabled]);

  // Live Sync
  useEffect(() => {
    if (!isDemo && typeof window !== 'undefined') {
      const channel = new BroadcastChannel(`livechat-preview-${businessId}`);
      channel.onmessage = (event) => {
        if (event.data?.type === 'UPDATE_CONFIG') {
          setLiveConfig(prev => ({ ...prev, ...event.data.payload }));
        }
      };
      return () => channel.close();
    }
  }, [businessId, isDemo]);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(() => scrollToBottom(), [messages, isLoading]);

  useEffect(() => {
    if (isQualified && collectCustomerData && !customerDataSubmitted && !showCustomerForm) {
      setShowCustomerForm(true);
    }
  }, [isQualified, collectCustomerData, customerDataSubmitted, showCustomerForm]);

  const handleCustomerDataSubmit = () => {
    setCustomerDataSubmitted(true);
    setShowCustomerForm(false);
    
    const dataLines = customerDataFields
      .filter(f => customerData[f])
      .map(f => {
        const labels: Record<string, string> = { name: 'Nama', phone: 'WhatsApp', email: 'Email', city: 'Kota' };
        return `${labels[f] || f}: ${customerData[f]}`;
      });
      
    if (dataLines.length > 0) {
      setLeadSummary(prev => prev + '\n\n--- Data Customer ---\n' + dataLines.join('\n'));
      if (waMessageDraft) {
        setWaMessageDraft(prev => prev + '\n\nData Saya:\n' + dataLines.join('\n'));
      } else {
        setWaMessageDraft('Data Saya:\n' + dataLines.join('\n') + '\n\nMohon info langkah selanjutnya 😊');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    setShowQuickReplies(false);
    const userMessage = input.trim();
    setInput('');
    const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    const newMessages: Message[] = [...messages, { 
      role: 'user', 
      content: userMessage,
      timestamp: timeString,
      status: 'sent'
    }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          businessId,
          conversationId,
          isDemo,
        }),
      });

      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
      const data = await response.json();
      
      if (data.humanTakeoverActive) {
          setIsLoading(false);
          return;
      }

      const replyLength = data.reply ? data.reply.length : 0;
      let typingDelay = Math.min(600 + (replyLength * 15), 3000);
      
      setTimeout(() => {
        // Update user message to read
        const updatedMsgs = newMessages.map(m => m.role === 'user' ? { ...m, status: 'read' as const } : m);
        setMessages([...updatedMsgs, { 
          role: 'model', 
          content: data.reply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: 'read'
        }]);

        setDynamicSuggestions(data.suggestions || []);
        if (data.isQualified || data.leadStatus === 'hot') {
          setIsQualified(true);
          if (data.leadSummary) setLeadSummary(data.leadSummary);
        }
        if (data.waMessageDraft) setWaMessageDraft(data.waMessageDraft);
        if (data.showForm && collectCustomerData && !customerDataSubmitted) setShowCustomerForm(true);
        setIsLoading(false);
      }, typingDelay);

    } catch (error) {
      setIsLoading(false);
    }
  };

  const handleQuickReplyClick = (reply: string) => {
    setInput(reply);
    setShowQuickReplies(false);
    setTimeout(() => {
      const form = document.querySelector('[data-chat-form]') as HTMLFormElement;
      if (form) form.requestSubmit();
    }, 50);
  };

  // Themes
  const theme: ThemeConfig = useMemo(() => {
    if (liveConfig.customThemeConfig) return liveConfig.customThemeConfig;
    return getTheme(liveConfig.themeId);
  }, [liveConfig.themeId, liveConfig.customThemeConfig]);

  const cssVariables = useMemo(() => {
    return generateThemeVariables(theme, liveConfig.primaryColor);
  }, [theme, liveConfig.primaryColor]);

  const isWA = theme.layout === 'whatsapp';

  let containerClass = '';
  if (isFullScreen) {
    containerClass = 'h-full w-full';
  } else if (isWidget) {
    containerClass = 'w-full h-full sm:rounded-2xl shadow-2xl flex flex-col';
  } else {
    containerClass = 'w-full h-full md:max-w-3xl md:mx-auto md:shadow-2xl md:h-[90vh] md:my-[5vh] md:rounded-3xl flex flex-col';
  }

  // --- INTERCOM STYLE COMPONENTS ---
  const IntercomHeader = () => (
    <div className="relative px-5 py-4 flex items-center justify-between shrink-0 z-10 border-b"
      style={{ backgroundColor: 'var(--header-bg)', borderColor: 'var(--widget-border)' }}>
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-sm overflow-hidden"
               style={{ backgroundColor: 'var(--primary-color)', color: '#fff' }}>
            {liveConfig.assistantAvatarUrl ? (
              <img src={liveConfig.assistantAvatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : "CS"}
          </div>
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 rounded-full" style={{ borderColor: 'var(--header-bg)' }}></div>
        </div>
        <div>
          <h3 className="font-semibold text-sm tracking-wide" style={{ color: 'var(--header-text)' }}>{displayName}</h3>
          <p className="text-xs font-medium flex items-center gap-1" style={{ color: 'var(--primary-color)' }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: 'var(--primary-color)' }}></span>
            Online
          </p>
        </div>
      </div>
    </div>
  );

  const IntercomInput = () => (
    <div className="relative px-4 py-4 shrink-0 z-10 border-t" style={{ backgroundColor: 'var(--input-container)', borderColor: 'var(--widget-border)' }}>
      <form data-chat-form onSubmit={handleSubmit} className="flex items-end gap-2 border rounded-xl p-1.5 focus-within:ring-2 transition-all shadow-inner"
            style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--input-border)' }}>
        <button type="button" className="p-2 hover:bg-black/5 rounded-lg shrink-0" style={{ color: 'var(--header-icon)' }}>
          <Paperclip size={20} />
        </button>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e); } }}
          placeholder="Ketik pesan..."
          className="w-full max-h-32 min-h-[40px] bg-transparent text-[14.5px] px-1 py-2 focus:outline-none resize-none overflow-y-auto"
          style={{ color: 'var(--input-text)' }}
          rows={1}
          disabled={isLoading || isQualified}
        />
        <button type="button" className="p-2 hover:bg-black/5 rounded-lg shrink-0 hidden sm:block" style={{ color: 'var(--header-icon)' }}>
          <Smile size={20} />
        </button>
        <button type="submit" disabled={!input.trim()}
          className="p-2 rounded-lg transition-all shrink-0 flex items-center justify-center disabled:opacity-50"
          style={{ backgroundColor: input.trim() ? 'var(--primary-color)' : 'var(--input-border)', color: input.trim() ? '#fff' : 'var(--input-text)' }}>
          <Send size={18} className={input.trim() ? "ml-0.5" : ""} />
        </button>
      </form>
      {liveConfig.showBranding && (
        <div className="text-center mt-2">
          <span className="text-[10px] font-medium" style={{ color: 'var(--header-icon)' }}>Powered by Sindaro IT</span>
        </div>
      )}
    </div>
  );

  // --- WHATSAPP STYLE COMPONENTS ---


  return (
    <div className={`flex flex-col h-full w-full overflow-hidden ${containerClass} font-sans relative`} style={{ ...cssVariables as any, backgroundColor: 'var(--widget-bg)' }}>
      
      {/* Container Background */}
      {isWA && (
        <div className="absolute inset-0 z-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'var(--chat-bg-image)', backgroundSize: '100px' }}></div>
      )}

      {/* Header */}
      <IntercomHeader />

      {/* Messages Area */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 flex flex-col gap-4 scroll-smooth relative z-10" style={{ backgroundColor: 'var(--chat-bg)' }}>
        
        

        {messages.map((msg, idx) => {
          const isUser = msg.role === 'user';
          const prevMsg = idx > 0 ? messages[idx - 1] : null;
          const isFirstInGroup = !prevMsg || prevMsg.role !== msg.role;
          
          return (
            <div key={idx} className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} ${!isFirstInGroup ? '-mt-2' : ''}`}>
              <div className={`flex flex-col max-w-[85%] ${isUser ? 'items-end' : 'items-start'}`}>
                <div className={`relative px-4 py-2.5 text-[14.5px] leading-relaxed break-words shadow-sm rounded-2xl ${isUser ? 'rounded-br-sm' : 'rounded-bl-sm'}`}
                     style={{ backgroundColor: isUser ? 'var(--user-bubble)' : 'var(--agent-bubble)', color: isUser ? 'var(--user-text)' : 'var(--agent-text)' }}>
                  <RichMessageRenderer content={msg.content} isUser={isUser} />
                </div>
                <div className={`flex items-center gap-1 mt-1 text-[11px] opacity-60 ${isUser ? 'mr-1' : 'ml-1'}`} style={{ color: 'var(--input-text)' }}>
                  <span>{msg.timestamp || '10:00'}</span>
                  {isUser && (
                    <span className="ml-0.5">
                      {msg.status === 'read' ? <CheckCheck size={12} className="text-indigo-400" /> : <Check size={12} />}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Loading */}
        {isLoading && (
          <div className="flex justify-start">
             <div className="px-5 py-4 rounded-2xl rounded-bl-none shadow-sm flex items-center space-x-2 border" style={{ backgroundColor: 'var(--agent-bubble)', borderColor: 'var(--widget-border)' }}>
                <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: 'var(--primary-color)', animationDelay: '0ms' }}></div>
                <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: 'var(--primary-color)', animationDelay: '150ms' }}></div>
                <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: 'var(--primary-color)', animationDelay: '300ms' }}></div>
              </div>
          </div>
        )}
        
        <div ref={messagesEndRef} className="h-2" />
      </div>

      {/* Input Area */}
      <IntercomInput />

    </div>
  );
}
