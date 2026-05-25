"use client";

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { MessageSquare, Flame, Loader2, Search, User, Bot, X, Send, UserCheck, ShieldAlert } from 'lucide-react';
import { useParams } from 'next/navigation';
import RichMessageRenderer from '@/components/RichMessageRenderer';

export default function ConversationsPage() {
  const params = useParams();
  const businessId = params.businessId as string;
  const supabase = createClient();
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedConv, setSelectedConv] = useState<any | null>(null);
  
  // Reply State
  const [replyInput, setReplyInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { 
    fetchConversations(); 

    // Subscribe to Realtime Updates
    const channel = supabase.channel('admin-inbox-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'Conversations', filter: `business_id=eq.${businessId}` },
        (payload: any) => {
          if (payload.eventType === 'INSERT') {
            setConversations(prev => [payload.new, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setConversations(prev => prev.map(c => c.id === payload.new.id ? payload.new : c));
            setSelectedConv((prev: any) => prev?.id === payload.new.id ? payload.new : prev);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [businessId, supabase]);

  useEffect(() => {
    // Auto scroll to bottom
    if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedConv?.logs]);

  async function fetchConversations() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase.from('Conversations').select('*').eq('business_id', businessId).order('updated_at', { ascending: false });
      if (error) throw error;
      if (data) setConversations(data);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally { setLoading(false); }
  }

  const handleTakeover = async () => {
      if (!selectedConv) return;
      try {
          await supabase.from('Conversations').update({ status: 'human_takeover' }).eq('id', selectedConv.id);
      } catch (e) {
          console.error(e);
      }
  };

  const handleResolve = async () => {
      if (!selectedConv) return;
      try {
          await supabase.from('Conversations').update({ status: 'resolved' }).eq('id', selectedConv.id);
      } catch (e) {
          console.error(e);
      }
  };

  const handleSendReply = async () => {
      if (!replyInput.trim() || !selectedConv || isSending) return;
      setIsSending(true);
      const msg = replyInput.trim();
      setReplyInput('');

      try {
          const newLogs = [...(selectedConv.logs || []), { role: 'model', content: msg, is_admin: true }];
          
          await supabase.from('Conversations').update({
              logs: newLogs,
              status: 'human_takeover', // Automatically takeover if admin sends a message
              updated_at: new Date().toISOString()
          }).eq('id', selectedConv.id);
          
      } catch (e) {
          console.error('Error sending reply:', e);
          alert('Gagal mengirim pesan.');
      } finally {
          setIsSending(false);
      }
  };

  const filteredConversations = conversations.filter(conv => {
    const matchesSearch = conv.id.toLowerCase().includes(search.toLowerCase()) || (conv.lead_summary && conv.lead_summary.toLowerCase().includes(search.toLowerCase()));
    if (filter === 'qualified') return conv.is_qualified && matchesSearch;
    if (filter === 'unqualified') return !conv.is_qualified && matchesSearch;
    if (filter === 'human_takeover') return conv.status === 'human_takeover' && matchesSearch;
    return matchesSearch;
  });

  return (
    <div className="flex h-full bg-zinc-50 dark:bg-zinc-950 transition-colors overflow-hidden">

      {/* Left Pane: Queue */}
      <div className={`${selectedConv ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-80 lg:w-96 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shrink-0`}>
        {/* Search & Filter */}
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <input type="text" placeholder="Cari percakapan..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 rounded-lg text-sm focus:ring-emerald-500 focus:border-emerald-500 transition-colors" />
          </div>
          <div className="flex space-x-1 overflow-x-auto pb-1 no-scrollbar">
            {['all', 'qualified', 'human_takeover'].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`shrink-0 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${filter === f ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}>
                {f === 'all' ? 'Semua' : f === 'qualified' ? '🔥 Hot' : 'Admin'}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-emerald-500" /></div>
          ) : filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-zinc-400">
              <MessageSquare className="h-10 w-10 mb-3" />
              <p className="text-sm">Belum ada percakapan.</p>
            </div>
          ) : (
            filteredConversations.map(conv => (
              <button key={conv.id} onClick={() => setSelectedConv(conv)}
                className={`w-full text-left p-4 border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors ${selectedConv?.id === conv.id ? 'bg-emerald-50 dark:bg-emerald-500/5 border-l-2 border-l-emerald-500' : ''}`}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center space-x-2">
                    {conv.is_qualified ? <Flame className="h-4 w-4 text-orange-500" /> : <MessageSquare className="h-4 w-4 text-zinc-400" />}
                    <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 line-clamp-1">
                        {conv.customer_name ? conv.customer_name : (conv.is_qualified ? 'Hot Lead' : 'Visitor')}
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-400">{new Date(conv.updated_at || conv.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                    {conv.status === 'human_takeover' && <span className="font-bold text-purple-600 dark:text-purple-400 mr-1">[Admin]</span>}
                    {conv.logs && conv.logs.length > 0 ? conv.logs[conv.logs.length - 1].content : 'No messages'}
                </p>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Center Pane: Chat Thread */}
      <div className={`${selectedConv ? 'flex' : 'hidden md:flex'} flex-1 flex-col bg-zinc-50 dark:bg-zinc-950`}>
        {selectedConv ? (
          <>
            {/* Chat Header */}
            <div className="h-14 px-4 flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shrink-0">
              <div className="flex items-center space-x-3">
                <button className="md:hidden p-1.5 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-lg" onClick={() => setSelectedConv(null)}>
                  <X className="h-5 w-5" />
                </button>
                <div className={`h-8 w-8 rounded-full flex items-center justify-center ${selectedConv.is_qualified ? 'bg-orange-100 dark:bg-orange-500/10 text-orange-600' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'}`}>
                  {selectedConv.is_qualified ? <Flame className="h-4 w-4" /> : <User className="h-4 w-4" />}
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {selectedConv.customer_name || (selectedConv.is_qualified ? 'Hot Lead' : 'Visitor')}
                  </p>
                  <p className="text-[10px] text-zinc-400 flex items-center gap-1">
                      ID: {selectedConv.id.split('-')[0]}
                      {selectedConv.status === 'human_takeover' && <span className="text-purple-500 font-bold ml-1">• Human Takeover Active</span>}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                 {selectedConv.status !== 'human_takeover' && (
                    <button onClick={handleTakeover} className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 rounded-lg text-xs font-bold hover:bg-purple-200 transition-colors">
                        <ShieldAlert className="w-3.5 h-3.5" />
                        Takeover
                    </button>
                 )}
                 {selectedConv.status === 'human_takeover' && (
                    <button onClick={handleResolve} className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 rounded-lg text-xs font-bold hover:bg-zinc-200 transition-colors">
                        <UserCheck className="w-3.5 h-3.5" />
                        Kembalikan ke AI
                    </button>
                 )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {(selectedConv.logs || []).map((msg: any, idx: number) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex max-w-[82%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'} items-end`}>
                    <div className={`shrink-0 h-7 w-7 rounded-full flex items-center justify-center ${msg.role === 'user' ? 'bg-emerald-100 dark:bg-emerald-900/30 ml-2 mb-1' : (msg.is_admin ? 'bg-purple-100 text-purple-600 mr-2 mb-1' : 'bg-zinc-100 dark:bg-zinc-800 mr-2 mb-1')}`}>
                      {msg.role === 'user' ? <User className="h-3.5 w-3.5 text-emerald-600" /> : <Bot className={`h-3.5 w-3.5 ${msg.is_admin ? 'text-purple-600' : 'text-zinc-500'}`} />}
                    </div>
                    <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      msg.role === 'user' ? 'bg-emerald-600 text-white rounded-br-sm whitespace-pre-wrap' : 
                      msg.is_admin ? 'bg-purple-50 border border-purple-200 text-purple-900 dark:bg-purple-900/20 dark:border-purple-800 dark:text-purple-100 rounded-bl-sm' :
                      'bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 rounded-bl-sm'
                    }`}>
                      <RichMessageRenderer content={msg.content} isUser={msg.role === 'user'} />
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Admin Input Box */}
            <div className="p-4 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800">
                {selectedConv.status === 'resolved' ? (
                    <div className="text-center py-2 text-sm text-zinc-500">Percakapan ini telah dikembalikan ke AI.</div>
                ) : (
                    <div className="flex items-end gap-2">
                        <textarea 
                            value={replyInput}
                            onChange={(e) => setReplyInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendReply();
                                }
                            }}
                            placeholder={selectedConv.status === 'human_takeover' ? "Ketik pesan sebagai Admin..." : "Balas untuk otomatis Takeover dari AI..."}
                            className="flex-1 max-h-32 min-h-[44px] p-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-sm resize-none focus:ring-emerald-500 focus:border-emerald-500"
                            rows={1}
                        />
                        <button 
                            onClick={handleSendReply}
                            disabled={!replyInput.trim() || isSending}
                            className="p-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center justify-center shrink-0"
                        >
                            {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                        </button>
                    </div>
                )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-400">
            <MessageSquare className="h-12 w-12 mb-4 text-zinc-300 dark:text-zinc-700" />
            <p className="text-sm">Pilih percakapan dari daftar di samping untuk memulai Live Inbox.</p>
          </div>
        )}
      </div>

      {/* Right Pane: Lead Details (Desktop only) */}
      {selectedConv && (
        <div className="hidden lg:flex flex-col w-80 border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shrink-0">
          <div className="p-5 border-b border-zinc-200 dark:border-zinc-800">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Detail Percakapan</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* Status */}
            <div>
              <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Status & Handling</label>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full ${
                  selectedConv.is_qualified ? 'bg-orange-100 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                }`}>
                  {selectedConv.is_qualified ? '🔥 Qualified Lead' : 'Belum Kualifikasi'}
                </span>
                <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full ${
                  selectedConv.status === 'human_takeover' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800' : 
                  'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                }`}>
                  {selectedConv.status === 'human_takeover' ? '👤 Handled by Admin' : '🤖 Handled by AI'}
                </span>
              </div>
            </div>

            {/* Identity */}
            {(selectedConv.customer_name || selectedConv.customer_phone) && (
                <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-100 dark:border-zinc-800">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-2">Identitas Terkumpul</label>
                    <div className="space-y-1">
                        {selectedConv.customer_name && <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{selectedConv.customer_name}</p>}
                        {selectedConv.customer_phone && <p className="text-xs font-mono text-zinc-600 dark:text-zinc-400">{selectedConv.customer_phone}</p>}
                    </div>
                </div>
            )}
            
            {/* AI Summary */}
            {selectedConv.lead_summary && (
              <div>
                <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Ringkasan AI</label>
                <div className="mt-2 p-4 bg-orange-50 dark:bg-orange-500/5 border border-orange-100 dark:border-orange-500/20 rounded-xl text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed space-y-2">
                  <RichMessageRenderer content={selectedConv.lead_summary} isUser={false} />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
