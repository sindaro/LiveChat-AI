"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Loader2, Save, UserPlus, Plus, X } from 'lucide-react';
import { useParams } from 'next/navigation';

export default function HumanHandoverPage() {
  const params = useParams();
  const businessId = params.businessId as string;
  const supabase = createClient();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  
  const [handoverSettings, setHandoverSettings] = useState({
    target: 'admin',
    keywords: ['komplain', 'marah', 'admin', 'refund', 'cs']
  });

  const [newKeyword, setNewKeyword] = useState('');

  useEffect(() => {
    fetchData();
  }, [businessId]);

  async function fetchData() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('BusinessProfiles')
        .select('handover_settings')
        .eq('id', businessId)
        .single();
        
      if (error && error.code !== 'PGRST116') throw error;
      if (data && data.handover_settings) {
        setHandoverSettings(prev => ({ ...prev, ...data.handover_settings }));
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
          handover_settings: handoverSettings,
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

  const handleAddKeyword = () => {
    const word = newKeyword.trim().toLowerCase();
    if (word && !handoverSettings.keywords.includes(word)) {
      setHandoverSettings({ ...handoverSettings, keywords: [...handoverSettings.keywords, word] });
      setNewKeyword('');
    }
  };

  const handleRemoveKeyword = (index: number) => {
    const k = [...handoverSettings.keywords];
    k.splice(index, 1);
    setHandoverSettings({ ...handoverSettings, keywords: k });
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
          <UserPlus className="h-6 w-6 text-emerald-500" /> Human Handover
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Mengatur kapan dan ke mana AI harus mentransfer percakapan ke CS Manusia.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Handover Target */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6">
          <label className="block text-sm font-bold text-zinc-900 dark:text-zinc-50 mb-2">Target Transfer</label>
          <p className="text-xs text-zinc-500 mb-3">Ke divisi mana chat akan diarahkan saat Customer meminta bantuan manusia?</p>
          <select 
            value={handoverSettings.target}
            onChange={e => setHandoverSettings({...handoverSettings, target: e.target.value})}
            className={inputClass}
          >
            <option value="admin">Admin Umum</option>
            <option value="sales">Tim Sales</option>
            <option value="support">Tim Support / Teknisi</option>
            <option value="owner">Owner Bisnis</option>
          </select>
        </div>

        {/* Handover Keywords */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6">
          <label className="block text-sm font-bold text-zinc-900 dark:text-zinc-50 mb-2">Keyword Trigger (Pemicu Transfer)</label>
          <p className="text-xs text-zinc-500 mb-4">Jika pesan customer mengandung salah satu kata ini, AI akan otomatis menawarkan transfer ke manusia.</p>
          
          <div className="flex flex-wrap gap-2 mb-4">
            {handoverSettings.keywords.map((word, idx) => (
              <span key={idx} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-sm font-medium rounded-lg">
                {word}
                <button type="button" onClick={() => handleRemoveKeyword(idx)}
                  className="text-zinc-400 hover:text-red-500 transition-colors ml-1">
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
          </div>
          
          <div className="flex gap-2">
            <input type="text" value={newKeyword} onChange={(e) => setNewKeyword(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddKeyword(); } }}
              className={`flex-1 ${inputClass}`} placeholder="Ketik kata kunci lalu Enter (misal: penipu, kecewa)" />
            <button type="button" onClick={handleAddKeyword} disabled={!newKeyword.trim()}
              className="px-4 py-2 bg-zinc-800 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl text-sm font-bold hover:bg-zinc-700 disabled:opacity-50 transition-colors shrink-0">
              <Plus className="h-4 w-4" />
            </button>
          </div>
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
