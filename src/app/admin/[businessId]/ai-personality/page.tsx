"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Loader2, Save, Smile, Heart, Briefcase, Zap } from 'lucide-react';
import { useParams } from 'next/navigation';

export default function AiPersonalityPage() {
  const params = useParams();
  const businessId = params.businessId as string;
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  
  const [assistantName, setAssistantName] = useState('Asisten AI');
  const [personality, setPersonality] = useState({
    mode: 'friendly', // friendly, professional, fast-selling
    formality: 3, // 1 to 5
    emoji_level: 3, // 1 to 5
    response_length: 'medium', // short, medium, long
    closing_speed: 'medium' // slow, medium, fast
  });

  useEffect(() => {
    fetchData();
  }, [businessId]);

  async function fetchData() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('BusinessProfiles')
        .select('assistant_name, ai_personality')
        .eq('id', businessId)
        .single();
        
      if (error && error.code !== 'PGRST116') throw error;
      if (data) {
        setAssistantName(data.assistant_name || 'Asisten AI');
        if (data.ai_personality) {
          setPersonality(prev => ({ ...prev, ...data.ai_personality }));
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
          assistant_name: assistantName,
          ai_personality: personality,
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

  const handleModeChange = (mode: string) => {
    let defaults = { ...personality, mode };
    if (mode === 'friendly') {
      defaults.formality = 2;
      defaults.emoji_level = 4;
      defaults.closing_speed = 'slow';
    } else if (mode === 'professional') {
      defaults.formality = 4;
      defaults.emoji_level = 2;
      defaults.closing_speed = 'medium';
    } else if (mode === 'fast-selling') {
      defaults.formality = 3;
      defaults.emoji_level = 3;
      defaults.closing_speed = 'fast';
      defaults.response_length = 'short';
    }
    setPersonality(defaults);
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
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">AI Personality</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Mengatur karakter AI tanpa coding agar terasa seperti Customer Service manusia.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Name */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6">
          <label className="block text-sm font-bold text-zinc-900 dark:text-zinc-50 mb-2">Nama AI Asisten</label>
          <p className="text-xs text-zinc-500 mb-3">Nama ini akan digunakan AI saat memperkenalkan dirinya.</p>
          <input type="text" value={assistantName} onChange={e => setAssistantName(e.target.value)} required className={inputClass} placeholder="Misal: Sarah" />
        </div>

        {/* Mode AI */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6">
          <label className="block text-sm font-bold text-zinc-900 dark:text-zinc-50 mb-2">Mode AI (Karakter Utama)</label>
          <p className="text-xs text-zinc-500 mb-4">Pilih gaya bahasa yang paling cocok dengan brand Anda.</p>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <button type="button" onClick={() => handleModeChange('friendly')} 
              className={`p-4 rounded-xl border-2 text-left transition-colors ${personality.mode === 'friendly' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300'}`}>
              <Heart className={`h-6 w-6 mb-2 ${personality.mode === 'friendly' ? 'text-emerald-500' : 'text-zinc-400'}`} />
              <div className="font-bold text-sm text-zinc-900 dark:text-white">Friendly</div>
              <div className="text-xs text-zinc-500 mt-1">Hangat, empatik, cocok untuk edukasi/komunitas.</div>
            </button>
            
            <button type="button" onClick={() => handleModeChange('professional')}
              className={`p-4 rounded-xl border-2 text-left transition-colors ${personality.mode === 'professional' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300'}`}>
              <Briefcase className={`h-6 w-6 mb-2 ${personality.mode === 'professional' ? 'text-emerald-500' : 'text-zinc-400'}`} />
              <div className="font-bold text-sm text-zinc-900 dark:text-white">Professional</div>
              <div className="text-xs text-zinc-500 mt-1">Rapi, sopan, cocok untuk B2B/konsultan.</div>
            </button>
            
            <button type="button" onClick={() => handleModeChange('fast-selling')}
              className={`p-4 rounded-xl border-2 text-left transition-colors ${personality.mode === 'fast-selling' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300'}`}>
              <Zap className={`h-6 w-6 mb-2 ${personality.mode === 'fast-selling' ? 'text-emerald-500' : 'text-zinc-400'}`} />
              <div className="font-bold text-sm text-zinc-900 dark:text-white">Fast Selling</div>
              <div className="text-xs text-zinc-500 mt-1">Singkat, to-the-point, fokus pada conversion.</div>
            </button>
          </div>
        </div>

        {/* Sliders (Formality & Emoji) */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-6">
          <div>
            <div className="flex justify-between mb-2">
              <label className="text-sm font-bold text-zinc-900 dark:text-zinc-50">Tingkat Formalitas</label>
              <span className="text-xs font-medium px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded">{personality.formality}/5</span>
            </div>
            <input type="range" min="1" max="5" value={personality.formality} onChange={e => setPersonality({...personality, formality: parseInt(e.target.value)})}
              className="w-full h-2 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-emerald-500" />
            <div className="flex justify-between text-xs text-zinc-400 mt-2">
              <span>Sangat Santai (1)</span>
              <span>Sangat Kaku (5)</span>
            </div>
          </div>
          
          <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <div className="flex justify-between mb-2">
              <label className="text-sm font-bold text-zinc-900 dark:text-zinc-50">Penggunaan Emoji</label>
              <span className="text-xs font-medium px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded">{personality.emoji_level}/5</span>
            </div>
            <input type="range" min="1" max="5" value={personality.emoji_level} onChange={e => setPersonality({...personality, emoji_level: parseInt(e.target.value)})}
              className="w-full h-2 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-emerald-500" />
            <div className="flex justify-between text-xs text-zinc-400 mt-2">
              <span>Tanpa Emoji (1)</span>
              <span>Banyak Emoji (5)</span>
            </div>
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
