"use client";

import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, MessageCircle } from 'lucide-react';
import RichMessageRenderer from './RichMessageRenderer';

interface ChatInterfaceProps {
  businessId: string;
  businessName: string;
  waNumber: string;
  preFilledMsg: string;
  isWidget?: boolean;
  initialMessage?: string;
  isDemo?: boolean;
  // Phase F new props
  assistantName?: string;
  assistantAvatarUrl?: string;
  quickReplies?: string[];
  collectCustomerData?: boolean;
  customerDataFields?: string[];
  escalationLabel?: string;
  primaryColor?: string;
  showBranding?: boolean;
}

interface Message {
  role: 'user' | 'model';
  content: string;
}

export default function ChatInterface({
  businessId,
  businessName,
  waNumber,
  preFilledMsg,
  isWidget = false,
  initialMessage,
  isDemo = false,
  // Phase F defaults
  assistantName,
  assistantAvatarUrl,
  quickReplies = [],
  collectCustomerData = false,
  customerDataFields = ['name'],
  escalationLabel = 'Owner',
  primaryColor = '#059669',
  showBranding = true,
}: ChatInterfaceProps) {
  const displayName = assistantName || businessName;
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', content: initialMessage || `Halo! Saya ${displayName} dari ${businessName}. Ada yang bisa saya bantu hari ini?` }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isQualified, setIsQualified] = useState(false);
  const [leadSummary, setLeadSummary] = useState('');
  const [showQuickReplies, setShowQuickReplies] = useState(true);
  const [dynamicSuggestions, setDynamicSuggestions] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Customer data form state
  const [customerData, setCustomerData] = useState<Record<string, string>>({});
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [customerDataSubmitted, setCustomerDataSubmitted] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Show customer form when qualified + collectCustomerData is on
  useEffect(() => {
    if (isQualified && collectCustomerData && !customerDataSubmitted) {
      setShowCustomerForm(true);
    }
  }, [isQualified, collectCustomerData, customerDataSubmitted]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    // Hide quick replies after first user message
    setShowQuickReplies(false);

    const userMessage = input.trim();
    setInput('');
    const newMessages: Message[] = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          businessId,
          isDemo,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP Error: ${response.status}`);
      }

      const data = await response.json();
      setMessages([...newMessages, { role: 'model', content: data.reply }]);

      if (data.suggestions && data.suggestions.length > 0) {
        setDynamicSuggestions(data.suggestions);
      } else {
        setDynamicSuggestions([]);
      }

      if (data.isQualified) {
        setIsQualified(true);
        if (data.leadSummary) setLeadSummary(data.leadSummary);
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages([...newMessages, { role: 'model', content: 'Maaf, terjadi kesalahan pada sistem kami. Silakan coba lagi nanti.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Quick reply click handler
  const handleQuickReplyClick = (reply: string) => {
    setInput(reply);
    setShowQuickReplies(false);
    // Auto-submit by simulating form submit
    const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
    // We need to set input and submit in a way that works with React state
    // Instead, let's just set the input and let user click send, or auto-send:
    setTimeout(() => {
      const form = document.querySelector('[data-chat-form]') as HTMLFormElement;
      if (form) form.requestSubmit();
    }, 50);
  };

  // Customer data form submit
  const handleCustomerDataSubmit = () => {
    setCustomerDataSubmitted(true);
    setShowCustomerForm(false);
    // Append customer data to lead summary
    const dataLines = customerDataFields
      .filter(f => customerData[f])
      .map(f => {
        const labels: Record<string, string> = { name: 'Nama', phone: 'WhatsApp', email: 'Email', city: 'Kota' };
        return `${labels[f] || f}: ${customerData[f]}`;
      });
    if (dataLines.length > 0) {
      setLeadSummary(prev => prev + '\n\n--- Data Customer ---\n' + dataLines.join('\n'));
    }
  };

  const generateWhatsAppLink = () => {
    let finalMessage = preFilledMsg;
    if (leadSummary) {
      finalMessage += `\n\n---\n*Ringkasan Prospek (Diisi oleh AI):*\n${leadSummary}`;
    }
    const encodedMessage = encodeURIComponent(finalMessage);
    const cleanNumber = waNumber.replace(/\D/g, '');
    return `https://wa.me/${cleanNumber}?text=${encodedMessage}`;
  };

  const fieldLabels: Record<string, { label: string; placeholder: string; type: string }> = {
    name: { label: 'Nama Lengkap', placeholder: 'Masukkan nama Anda', type: 'text' },
    phone: { label: 'Nomor WhatsApp', placeholder: '08123456789', type: 'tel' },
    email: { label: 'Email', placeholder: 'email@contoh.com', type: 'email' },
    city: { label: 'Kota / Lokasi', placeholder: 'Jakarta, Surabaya, dll.', type: 'text' },
  };

  return (
    <div className={`flex flex-col bg-white overflow-hidden ${isWidget ? 'h-full rounded-2xl shadow-2xl border border-gray-100/50' : 'h-screen w-full md:max-w-3xl md:mx-auto md:shadow-2xl md:h-[90vh] md:my-[5vh] md:rounded-3xl border border-gray-200/60'}`}>
      
      {/* Header */}
      <div 
        style={{ backgroundColor: primaryColor }}
        className="p-4 sm:p-5 flex items-center shadow-md z-10 shrink-0 relative overflow-hidden"
      >
        {/* Subtle background decoration */}
        <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-white opacity-10 blur-2xl"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full bg-emerald-400 opacity-20 blur-xl"></div>
        
        {/* Avatar */}
        <div className="h-11 w-11 bg-white/10 backdrop-blur-md border border-white/20 rounded-full flex items-center justify-center shadow-inner relative z-10 overflow-hidden shrink-0">
          {assistantAvatarUrl ? (
            <img src={assistantAvatarUrl} alt={displayName} className="h-full w-full object-cover" />
          ) : (
            <Bot className="h-6 w-6 text-white drop-shadow-md" />
          )}
        </div>
        <div className="ml-3.5 relative z-10">
          <h1 className="text-white font-bold text-lg tracking-wide leading-tight drop-shadow-sm">{displayName}</h1>
          <p className="text-emerald-100 text-xs font-medium flex items-center mt-0.5">
            <span className="relative flex h-2 w-2 mr-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-300 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400 border border-green-200"></span>
            </span>
            Online & Siap Membantu
          </p>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-6 bg-slate-50/80 relative scroll-smooth">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
            <div className={`flex max-w-[88%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              
              {/* Avatar */}
              <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center mt-auto mb-1 overflow-hidden ${msg.role === 'user' ? 'ml-2.5 shadow-sm' : 'bg-zinc-100 dark:bg-zinc-800 mr-2.5 shadow-sm border border-zinc-200 dark:border-zinc-700'}`}
                style={msg.role === 'user' ? { backgroundColor: `${primaryColor}20` } : {}}
              >
                {msg.role === 'user' ? (
                  <User className="h-4 w-4" style={{ color: primaryColor }} />
                ) : assistantAvatarUrl ? (
                  <img src={assistantAvatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <Bot className="h-4 w-4 text-zinc-700 dark:text-zinc-300" />
                )}
              </div>

              {/* Bubble */}
              <div 
                style={msg.role === 'user' ? { backgroundColor: primaryColor } : {}}
                className={`px-4 py-3.5 rounded-2xl text-[14.5px] leading-relaxed shadow-sm transition-all hover:shadow-md ${
                msg.role === 'user' 
                  ? 'text-white rounded-br-none border-transparent whitespace-pre-wrap' 
                  : 'bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 rounded-bl-none border border-gray-100/80 dark:border-zinc-700/80 backdrop-blur-sm'
              }`}>
                <RichMessageRenderer content={msg.content} isUser={msg.role === 'user'} />
              </div>
            </div>
          </div>
        ))}

        {/* Quick Reply Buttons */}
        {showQuickReplies && quickReplies.length > 0 && messages.length <= 1 && (
          <div className="flex flex-wrap gap-2 px-1 animate-in fade-in slide-in-from-bottom-3 duration-500">
            {quickReplies.map((reply, idx) => (
              <button key={idx} type="button" onClick={() => handleQuickReplyClick(reply)}
                style={{ borderColor: `${primaryColor}40`, color: primaryColor }}
                className="px-4 py-2.5 bg-white dark:bg-zinc-800 border text-sm font-medium rounded-2xl hover:bg-zinc-50 dark:hover:bg-zinc-900 shadow-sm hover:shadow-md transition-all active:scale-95">
                {reply}
              </button>
            ))}
          </div>
        )}

        {isLoading && (
          <div className="flex justify-start animate-in fade-in duration-300">
            <div className="flex flex-row max-w-[85%]">
              <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 mr-2.5 flex items-center justify-center mt-auto mb-1 shadow-sm border border-indigo-50 overflow-hidden">
                {assistantAvatarUrl ? (
                  <img src={assistantAvatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <Bot className="h-4 w-4 text-indigo-700" />
                )}
              </div>
              <div className="px-5 py-4 rounded-2xl rounded-bl-none bg-white border border-gray-100/80 shadow-sm flex items-center space-x-2">
                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}

        {/* Dynamic Follow-up Suggestions (NEW) */}
        {!isLoading && !isQualified && dynamicSuggestions.length > 0 && (
          <div className="flex flex-wrap gap-2 px-1 py-2 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {dynamicSuggestions.map((suggestion, idx) => (
              <button key={idx} type="button" onClick={() => handleQuickReplyClick(suggestion)}
                style={{ backgroundColor: `${primaryColor}15`, borderColor: `${primaryColor}30`, color: primaryColor }}
                className="px-4 py-2.5 border text-sm font-medium rounded-2xl hover:bg-white transition-all active:scale-95 shadow-sm">
                {suggestion} →
              </button>
            ))}
          </div>
        )}

        {/* Customer Data Collection Form */}
        {isQualified && !isLoading && showCustomerForm && collectCustomerData && (
          <div className="mt-4 p-5 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200/60 dark:border-blue-800/40 rounded-2xl shadow-sm animate-in zoom-in-95 fade-in duration-500">
            <div className="text-center mb-4">
              <h3 className="text-gray-900 dark:text-gray-100 font-bold text-base">Sebelum Lanjut</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Lengkapi data di bawah agar {escalationLabel} kami bisa melayani Anda dengan lebih baik.
              </p>
            </div>
            <div className="space-y-3">
              {customerDataFields.map(field => {
                const info = fieldLabels[field];
                if (!info) return null;
                return (
                  <div key={field}>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">{info.label}</label>
                    <input
                      type={info.type}
                      placeholder={info.placeholder}
                      value={customerData[field] || ''}
                      onChange={(e) => setCustomerData(prev => ({ ...prev, [field]: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-blue-200 dark:border-blue-800 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition-all"
                    />
                  </div>
                );
              })}
            </div>
            <button onClick={handleCustomerDataSubmit}
              className="w-full mt-4 py-3 px-4 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors shadow-sm active:scale-[0.98]">
              Lanjutkan ke {escalationLabel} →
            </button>
          </div>
        )}

        {/* WhatsApp CTA (shown when qualified + customer data done or not required) */}
        {isQualified && !isLoading && (!collectCustomerData || customerDataSubmitted) && (
          <div 
            style={{ borderColor: `${primaryColor}40`, boxShadow: `0 20px 25px -5px ${primaryColor}15` }}
            className="mt-6 p-6 bg-white dark:bg-zinc-800 border-2 rounded-3xl animate-in zoom-in-95 fade-in duration-700 relative overflow-hidden"
          >
            {/* Celebration Background */}
            <div style={{ backgroundColor: primaryColor }} className="absolute -top-10 -right-10 w-32 h-32 opacity-10 rounded-full blur-3xl animate-pulse"></div>
            <div style={{ backgroundColor: primaryColor, animationDelay: '1s' }} className="absolute -bottom-10 -left-10 w-32 h-32 opacity-10 rounded-full blur-3xl animate-pulse"></div>
            
            <div className="flex flex-col items-center text-center relative z-10">
              <div 
                style={{ backgroundColor: primaryColor }}
                className="w-16 h-16 text-white rounded-2xl flex items-center justify-center mb-4 rotate-3 shadow-lg animate-bounce"
              >
                <MessageCircle className="w-8 h-8" />
              </div>
              <h3 className="text-zinc-900 dark:text-zinc-50 font-black text-xl mb-2">🎉 Prospek Terverifikasi!</h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6 leading-relaxed px-4">
                Luar biasa! Semua data Anda sudah kami siapkan. Silakan klik tombol di bawah untuk terhubung langsung dengan <strong>{escalationLabel}</strong> kami.
              </p>
              
              <a 
                href={generateWhatsAppLink()} 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-full relative group overflow-hidden rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <div style={{ backgroundColor: primaryColor }} className="absolute inset-0 w-full h-full transition-all duration-300 group-hover:opacity-90"></div>
                <div className="relative flex items-center justify-center py-4 px-6 text-white font-bold text-base shadow-xl">
                  <MessageCircle className="w-5 h-5 mr-3 animate-pulse" />
                  Hubungi {escalationLabel} Sekarang
                </div>
              </a>
              
              <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-4 uppercase tracking-widest font-bold">
                Tersambung Secara Otomatis
              </p>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3.5 sm:p-4 bg-white border-t border-gray-100 shrink-0 shadow-[0_-4px_20px_-15px_rgba(0,0,0,0.1)] z-10 relative">
        <form data-chat-form onSubmit={handleSubmit} className="flex relative items-end group">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder={isQualified ? "Sesi chat selesai" : "Ketik pesan Anda..."}
            className="w-full bg-gray-50/80 border border-gray-200/80 rounded-2xl py-3.5 pl-4 pr-14 resize-none max-h-32 text-[15px] focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 focus:bg-white transition-all overflow-hidden disabled:opacity-60 disabled:cursor-not-allowed shadow-inner"
            rows={1}
            style={{ minHeight: '52px' }}
            disabled={isLoading || isQualified}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading || isQualified}
            style={(!input.trim() || isLoading || isQualified) ? {} : { backgroundColor: primaryColor }}
            className="absolute right-1.5 bottom-1.5 p-2.5 rounded-xl text-white disabled:bg-zinc-300 disabled:text-zinc-500 transition-all hover:shadow-md hover:scale-105 active:scale-95 disabled:scale-100 disabled:shadow-none"
          >
            <Send className="h-4 w-4 ml-0.5" />
          </button>
        </form>
        {isQualified ? (
           <p className="text-center text-xs text-gray-500 mt-2">
             Sesi chat ini telah selesai. Silakan lanjutkan via WhatsApp.
           </p>
        ) : showBranding && (
          <div className="flex justify-center mt-3">
             <a href="#" target="_blank" rel="noopener" className="text-[10px] text-zinc-400 hover:text-zinc-600 transition-colors flex items-center gap-1">
               Powered by <span className="font-bold">Sindaro IT</span>
             </a>
          </div>
        )}
      </div>
    </div>
  );
}
