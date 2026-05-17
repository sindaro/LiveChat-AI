"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { MessageSquare, Flame, Clock, Loader2, Search, User, Bot, X, RefreshCw } from 'lucide-react';
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

  useEffect(() => { fetchConversations(); }, []);

  async function fetchConversations() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase.from('Conversations').select('*').eq('business_id', businessId).order('created_at', { ascending: false });
      if (error) throw error;
      if (data) setConversations(data);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally { setLoading(false); }
  }

  const filteredConversations = conversations.filter(conv => {
    const matchesSearch = conv.id.toLowerCase().includes(search.toLowerCase()) || (conv.lead_summary && conv.lead_summary.toLowerCase().includes(search.toLowerCase()));
    if (filter === 'qualified') return conv.is_qualified && matchesSearch;
    if (filter === 'unqualified') return !conv.is_qualified && matchesSearch;
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
          <div className="flex space-x-1">
            {['all', 'qualified', 'unqualified'].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${filter === f ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}>
                {f === 'all' ? 'Semua' : f === 'qualified' ? '🔥 Hot' : 'Biasa'}
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
                    <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{conv.is_qualified ? 'Hot Lead' : 'Percakapan'}</span>
                  </div>
                  <span className="text-xs text-zinc-400">{new Date(conv.created_at).toLocaleDateString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">ID: {conv.id.split('-')[0]}... • {conv.logs?.length || 0} pesan</p>
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
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{selectedConv.is_qualified ? 'Hot Lead' : 'Visitor'}</p>
                  <p className="text-xs text-zinc-400">ID: {selectedConv.id.split('-')[0]}</p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {(selectedConv.logs || []).map((msg: any, idx: number) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex max-w-[82%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'} items-end`}>
                    <div className={`shrink-0 h-7 w-7 rounded-full flex items-center justify-center ${msg.role === 'user' ? 'bg-emerald-100 dark:bg-emerald-900/30 ml-2 mb-1' : 'bg-zinc-100 dark:bg-zinc-800 mr-2 mb-1'}`}>
                      {msg.role === 'user' ? <User className="h-3.5 w-3.5 text-emerald-600" /> : <Bot className="h-3.5 w-3.5 text-zinc-500" />}
                    </div>
                    <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      msg.role === 'user' ? 'bg-emerald-600 text-white rounded-br-sm whitespace-pre-wrap' : 'bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 rounded-bl-sm'
                    }`}>
                      <RichMessageRenderer content={msg.content} isUser={msg.role === 'user'} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-400">
            <MessageSquare className="h-12 w-12 mb-4 text-zinc-300 dark:text-zinc-700" />
            <p className="text-sm">Pilih percakapan dari daftar di samping.</p>
          </div>
        )}
      </div>

      {/* Right Pane: Lead Details (Desktop only) */}
      {selectedConv && (
        <div className="hidden lg:flex flex-col w-80 border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shrink-0">
          <div className="p-5 border-b border-zinc-200 dark:border-zinc-800">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Lead Details</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* Status */}
            <div>
              <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Status</label>
              <div className="mt-2">
                <span className={`inline-flex items-center text-xs font-semibold px-3 py-1.5 rounded-full ${
                  selectedConv.is_qualified ? 'bg-orange-100 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                }`}>
                  {selectedConv.is_qualified ? '🔥 Qualified Lead' : 'Belum Kualifikasi'}
                </span>
              </div>
            </div>
            {/* Messages Count */}
            <div>
              <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Total Pesan</label>
              <p className="mt-1 text-sm text-zinc-900 dark:text-zinc-100 font-medium">{selectedConv.logs?.length || 0} pesan</p>
            </div>
            {/* Created */}
            <div>
              <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Waktu</label>
              <p className="mt-1 text-sm text-zinc-900 dark:text-zinc-100">{new Date(selectedConv.created_at).toLocaleString('id-ID')}</p>
            </div>
            {/* AI Summary */}
            {selectedConv.lead_summary && (
              <div>
                <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Ringkasan AI</label>
                <div className="mt-2 p-4 bg-orange-50 dark:bg-orange-500/5 border border-orange-100 dark:border-orange-500/20 rounded-xl">
                  <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">{selectedConv.lead_summary}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
