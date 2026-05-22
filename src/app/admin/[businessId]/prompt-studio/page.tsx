"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Loader2, Save, Sparkles, AlertCircle } from 'lucide-react';
import { useParams } from 'next/navigation';

export default function PromptStudioPage() {
  const params = useParams();
  const businessId = params.businessId as string;
  const supabase = createClient();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  
  const [promptStudio, setPromptStudio] = useState({
    system_instructions: '',
    custom_prompt: ''
  });

  useEffect(() => {
    fetchData();
  }, [businessId]);

  async function fetchData() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('BusinessProfiles')
        .select('prompt_studio, prompt_rules')
        .eq('id', businessId)
        .single();
        
      if (error && error.code !== 'PGRST116') throw error;
      if (data) {
        // Fallback to old prompt_rules if prompt_studio is empty
        if (data.prompt_studio) {
          setPromptStudio(prev => ({ ...prev, ...data.prompt_studio }));
        } else if (data.prompt_rules) {
          setPromptStudio(prev => ({ ...prev, system_instructions: data.prompt_rules }));
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
          prompt_studio: promptStudio,
          // Sync with old column for backward compatibility for now
          prompt_rules: promptStudio.system_instructions, 
          updated_at: new Date().toISOString(),
        })
        .eq('id', businessId);
        
      if (error) throw error;
      setMessage('Prompt berhasil disimpan!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      setMessage(`Gagal menyimpan: ${err?.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  }

  const inputClass = "block w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm p-4 text-zinc-900 dark:text-zinc-100 transition-colors font-mono";

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto space-y-6 pb-24">
      <div>
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-emerald-500" /> AI Prompt Studio
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Sesuaikan instruksi dasar AI Anda (Hanya disarankan untuk Advanced Users).</p>
      </div>

      <div className="bg-orange-50 dark:bg-orange-900/20 text-orange-800 dark:text-orange-300 p-4 rounded-xl flex gap-3 text-sm border border-orange-100 dark:border-orange-800">
        <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
        <p>Hati-hati! Perubahan di sini dapat mengubah perilaku utama AI secara drastis. Pastikan Anda menguji AI di Widget Preview setelah mengubah instruksi.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* System Instructions */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 flex flex-col h-[400px]">
          <div className="mb-4">
            <label className="block text-sm font-bold text-zinc-900 dark:text-zinc-50 mb-2">Instruksi Kualifikasi (Bouncer Rules)</label>
            <p className="text-xs text-zinc-500">Aturan khusus yang wajib ditaati AI. Contoh: "Selalu tanyakan lokasi pengiriman sebelum mengakhiri chat."</p>
          </div>
          <textarea 
            className={`flex-1 resize-none ${inputClass}`} 
            placeholder="Ketik instruksi spesifik di sini..."
            value={promptStudio.system_instructions}
            onChange={e => setPromptStudio({...promptStudio, system_instructions: e.target.value})}
          />
        </div>

        {/* Custom Prompt Wrapper */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 flex flex-col h-[300px]">
          <div className="mb-4">
            <label className="block text-sm font-bold text-zinc-900 dark:text-zinc-50 mb-2">Custom System Prompt (Override)</label>
            <p className="text-xs text-zinc-500">Isi jika Anda ingin menulis ulang SELURUH prompt bawaan AI dari awal. Biarkan kosong untuk menggunakan setting default.</p>
          </div>
          <textarea 
            className={`flex-1 resize-none ${inputClass}`} 
            placeholder="Kamu adalah AI Customer Service yang bertugas..."
            value={promptStudio.custom_prompt}
            onChange={e => setPromptStudio({...promptStudio, custom_prompt: e.target.value})}
          />
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
