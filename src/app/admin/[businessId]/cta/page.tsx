"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Loader2, Save, Target, CheckCircle2 } from 'lucide-react';
import { useParams } from 'next/navigation';

export default function CTAConversionPage() {
  const params = useParams();
  const businessId = params.businessId as string;
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  
  const [ctaSettings, setCtaSettings] = useState({
    mode: 'soft', // soft, hard
    capture_name: true,
    capture_phone: true,
    auto_summary: true,
  });
  
  const [escalationLabel, setEscalationLabel] = useState('Hubungi Admin');

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
          escalationLabel: escalationLabel,
        }
      });
      return () => channel.close();
    }
  }, [escalationLabel, businessId]);

  async function fetchData() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('BusinessProfiles')
        .select('cta_settings, escalation_label')
        .eq('id', businessId)
        .single();
        
      if (error && error.code !== 'PGRST116') throw error;
      if (data) {
        setEscalationLabel(data.escalation_label || 'Hubungi Admin');
        if (data.cta_settings) {
          setCtaSettings(prev => ({ ...prev, ...data.cta_settings }));
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
          cta_settings: ctaSettings,
          escalation_label: escalationLabel,
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
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">CTA & Conversion</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Tingkatkan kualitas prospek (lead) yang masuk ke tim sales Anda.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* CTA Mode */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6">
          <label className="block text-sm font-bold text-zinc-900 dark:text-zinc-50 mb-2">Gaya Call to Action (CTA)</label>
          <p className="text-xs text-zinc-500 mb-4">Bagaimana cara AI mengarahkan pelanggan ke admin?</p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button type="button" onClick={() => setCtaSettings({...ctaSettings, mode: 'soft'})} 
              className={`p-4 rounded-xl border-2 text-left transition-colors relative overflow-hidden ${ctaSettings.mode === 'soft' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300'}`}>
              {ctaSettings.mode === 'soft' && <CheckCircle2 className="h-5 w-5 text-emerald-500 absolute top-4 right-4" />}
              <Target className={`h-6 w-6 mb-2 ${ctaSettings.mode === 'soft' ? 'text-emerald-500' : 'text-zinc-400'}`} />
              <div className="font-bold text-sm text-zinc-900 dark:text-white">Soft CTA</div>
              <div className="text-xs text-zinc-500 mt-1">Sopan dan bertahap. "Boleh saya simpan nama kakak dulu?"</div>
            </button>
            
            <button type="button" onClick={() => setCtaSettings({...ctaSettings, mode: 'hard'})}
              className={`p-4 rounded-xl border-2 text-left transition-colors relative overflow-hidden ${ctaSettings.mode === 'hard' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300'}`}>
              {ctaSettings.mode === 'hard' && <CheckCircle2 className="h-5 w-5 text-emerald-500 absolute top-4 right-4" />}
              <Target className={`h-6 w-6 mb-2 ${ctaSettings.mode === 'hard' ? 'text-emerald-500' : 'text-zinc-400'}`} />
              <div className="font-bold text-sm text-zinc-900 dark:text-white">Hard CTA</div>
              <div className="text-xs text-zinc-500 mt-1">Langsung mengarahkan. "Silakan hubungi admin sekarang."</div>
            </button>
          </div>
        </div>

        {/* Lead Capture */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-6">
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50 mb-1">Pengumpulan Data (Lead Capture)</h3>
            <p className="text-xs text-zinc-500 mb-4">Informasi apa yang AI harus tanyakan sebelum transfer chat ke manusia?</p>
            
            <div className="space-y-3">
              <label className="flex items-center justify-between p-3 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer transition-colors">
                <div>
                  <span className="block text-sm font-medium text-zinc-900 dark:text-zinc-100">Ambil Nama</span>
                  <span className="text-xs text-zinc-500">Tanyakan nama untuk disimpan ke kontak.</span>
                </div>
                <input type="checkbox" checked={ctaSettings.capture_name} onChange={e => setCtaSettings({...ctaSettings, capture_name: e.target.checked})}
                  className="h-5 w-5 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500" />
              </label>

              <label className="flex items-center justify-between p-3 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer transition-colors">
                <div>
                  <span className="block text-sm font-medium text-zinc-900 dark:text-zinc-100">Ambil WhatsApp</span>
                  <span className="text-xs text-zinc-500">Tanyakan nomor aktif jika chat dari channel lain.</span>
                </div>
                <input type="checkbox" checked={ctaSettings.capture_phone} onChange={e => setCtaSettings({...ctaSettings, capture_phone: e.target.checked})}
                  className="h-5 w-5 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500" />
              </label>
            </div>
          </div>
          
          <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50 mb-1">AI Auto Summary</h3>
            <label className="flex items-center justify-between p-3 border border-emerald-100 dark:border-emerald-900/30 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-900/20 cursor-pointer transition-colors mt-3">
              <div>
                <span className="block text-sm font-medium text-emerald-800 dark:text-emerald-300">Ringkasan Lead Otomatis</span>
                <span className="text-xs text-emerald-600/80 dark:text-emerald-400/80">AI akan merangkum kebutuhan pelanggan untuk admin.</span>
              </div>
              <input type="checkbox" checked={ctaSettings.auto_summary} onChange={e => setCtaSettings({...ctaSettings, auto_summary: e.target.checked})}
                className="h-5 w-5 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500" />
            </label>
          </div>
        </div>

        {/* Transfer Target */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6">
          <label className="block text-sm font-bold text-zinc-900 dark:text-zinc-50 mb-2">Teks Tombol Transfer / Eskalasi</label>
          <input type="text" value={escalationLabel} onChange={e => setEscalationLabel(e.target.value)} required className={inputClass} placeholder="Hubungi CS Kami" />
          <p className="mt-2 text-xs text-zinc-500">Teks ini akan muncul sebagai tombol apabila AI tidak bisa menjawab dan harus transfer ke manusia.</p>
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
