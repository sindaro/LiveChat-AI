"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Loader2, Save, Plus, X, GitMerge, MessageSquare, Info } from 'lucide-react';
import { useParams } from 'next/navigation';

export default function ChatFlowPage() {
  const params = useParams();
  const businessId = params.businessId as string;
  const supabase = createClient();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  
  const [quickReplies, setQuickReplies] = useState<string[]>([]);
  const [newQuickReply, setNewQuickReply] = useState('');

  // Future structure for Rules-Based builder (stored in JSON)
  const [chatFlow, setChatFlow] = useState({
    greeting: 'Halo! Ada yang bisa saya bantu hari ini?',
    rules: [] as { trigger: string, action: string, value: string }[]
  });

  useEffect(() => {
    fetchData();
  }, [businessId]);

  // Broadcast realtime updates to Live Preview
  useEffect(() => {
    if (typeof window !== 'undefined' && businessId) {
      const channel = new BroadcastChannel(`livechat-preview-${businessId}`);
      channel.postMessage({
        type: 'UPDATE_CONFIG',
        payload: {
          quickReplies: quickReplies,
        }
      });
      return () => channel.close();
    }
  }, [quickReplies, businessId]);

  async function fetchData() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('BusinessProfiles')
        .select('quick_replies, chat_flow')
        .eq('id', businessId)
        .single();
        
      if (error && error.code !== 'PGRST116') throw error;
      if (data) {
        setQuickReplies(data.quick_replies || []);
        if (data.chat_flow) {
          setChatFlow(prev => ({ ...prev, ...data.chat_flow }));
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const { error } = await supabase
        .from('BusinessProfiles')
        .update({
          quick_replies: quickReplies,
          chat_flow: chatFlow,
          updated_at: new Date().toISOString(),
        })
        .eq('id', businessId);
        
      if (error) throw error;
      setMessage('Pengaturan berhasil disimpan!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      setMessage(`Gagal menyimpan: ${err?.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  }

  const handleAddQuickReply = () => {
    if (newQuickReply.trim() && quickReplies.length < 6) {
      setQuickReplies([...quickReplies, newQuickReply.trim()]);
      setNewQuickReply('');
    }
  };

  const handleRemoveQuickReply = (i: number) => {
    setQuickReplies(quickReplies.filter((_, idx) => idx !== i));
  };

  const inputClass = "block w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm p-3 text-zinc-900 dark:text-zinc-100 transition-colors";

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-3xl mx-auto space-y-6 pb-24">
      <div>
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
          <GitMerge className="h-6 w-6 text-emerald-500" /> Chat Flow (Rules-Based)
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Mengatur alur percakapan awal dan tombol balasan cepat.</p>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 p-4 rounded-xl flex gap-3 text-sm border border-blue-100 dark:border-blue-800">
        <Info className="h-5 w-5 shrink-0 mt-0.5" />
        <p>Tahap ini menggunakan Form Builder dasar. Visual Node Drag & Drop sedang dalam pengembangan arsitektur.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Greeting */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6">
          <label className="block text-sm font-bold text-zinc-900 dark:text-zinc-50 mb-2 flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-emerald-500" /> Sapaan Awal (Greeting)
          </label>
          <p className="text-xs text-zinc-500 mb-3">Pesan pembuka saat pengguna baru membuka chat.</p>
          <textarea 
            rows={3}
            value={chatFlow.greeting} 
            onChange={e => setChatFlow({...chatFlow, greeting: e.target.value})} 
            required 
            className={inputClass} 
            placeholder="Halo! Ada yang bisa saya bantu?" 
          />
        </div>

        {/* Quick Replies */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6">
          <label className="block text-sm font-bold text-zinc-900 dark:text-zinc-50 mb-2">Tombol Cepat (Quick Replies)</label>
          <p className="text-xs text-zinc-500 mb-4">Maksimal 6 tombol saran yang muncul di bawah pesan sapaan awal.</p>
          
          <div className="flex flex-wrap gap-2 mb-4">
            {quickReplies.map((reply, idx) => (
              <span key={idx} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700/50 text-emerald-700 dark:text-emerald-300 text-sm font-medium rounded-full">
                {reply}
                <button type="button" onClick={() => handleRemoveQuickReply(idx)}
                  className="text-emerald-500 hover:text-red-500 transition-colors">
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
            {quickReplies.length === 0 && (
              <span className="text-sm text-zinc-400 italic py-1">Belum ada tombol.</span>
            )}
          </div>
          
          {quickReplies.length < 6 && (
            <div className="flex gap-2">
              <input type="text" value={newQuickReply} onChange={(e) => setNewQuickReply(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddQuickReply(); } }}
                className={`flex-1 ${inputClass}`} placeholder="Contoh: Info Harga Produk" />
              <button type="button" onClick={handleAddQuickReply} disabled={!newQuickReply.trim()}
                className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 disabled:opacity-50 transition-colors shrink-0">
                <Plus className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
        
        {/* Save */}
        <div className="flex items-center justify-end gap-4 mt-6">
          {message && <span className={`text-sm font-medium ${message.includes('Gagal') ? 'text-red-500' : 'text-emerald-500'}`}>{message}</span>}
          <button type="submit" disabled={saving}
            className="inline-flex justify-center items-center rounded-xl bg-zinc-900 dark:bg-white py-2.5 px-6 text-sm font-bold text-white dark:text-zinc-900 shadow-sm hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 transition-colors">
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Simpan Perubahan
          </button>
        </div>
      </form>
    </div>
  );
}
