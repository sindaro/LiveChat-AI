"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Loader2, Save, Bot, Clock } from 'lucide-react';
import { useParams } from 'next/navigation';

export default function AutomationPage() {
  const params = useParams();
  const businessId = params.businessId as string;
  const supabase = createClient();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  
  const [automationSettings, setAutomationSettings] = useState({
    welcome_enabled: true,
    follow_up_enabled: false,
    idle_message: 'Halo kak, apakah masih ada yang ingin ditanyakan? 😊',
    closing_reminder: 'Karena tidak ada respon, sesi chat ini saya tutup sementara ya. Silakan ketik pesan kapan saja jika butuh bantuan kembali! 🙏'
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
          automationSettings: automationSettings,
        }
      });
      return () => channel.close();
    }
  }, [automationSettings, businessId]);

  async function fetchData() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('BusinessProfiles')
        .select('automation_settings')
        .eq('id', businessId)
        .single();
        
      if (error && error.code !== 'PGRST116') throw error;
      if (data && data.automation_settings) {
        setAutomationSettings(prev => ({ ...prev, ...data.automation_settings }));
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
          automation_settings: automationSettings,
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
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
          <Bot className="h-6 w-6 text-emerald-500" /> Automation
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Atur otomatisasi percakapan dan follow-up pintar (Basic Automation).</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Toggle Automation */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-4">
          <label className="flex items-center justify-between p-3 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer transition-colors">
            <div>
              <span className="block text-sm font-medium text-zinc-900 dark:text-zinc-100">Auto Welcome Message</span>
              <span className="text-xs text-zinc-500">Otomatis mengirim sapaan ketika user membuka chat pertama kali.</span>
            </div>
            <input type="checkbox" checked={automationSettings.welcome_enabled} onChange={e => setAutomationSettings({...automationSettings, welcome_enabled: e.target.checked})}
              className="h-5 w-5 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500" />
          </label>

          <label className="flex items-center justify-between p-3 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer transition-colors">
            <div>
              <span className="block text-sm font-medium text-zinc-900 dark:text-zinc-100">Follow-up Otomatis (Idle Follow-up)</span>
              <span className="text-xs text-zinc-500">Mengingatkan user jika mereka tidak membalas chat.</span>
            </div>
            <input type="checkbox" checked={automationSettings.follow_up_enabled} onChange={e => setAutomationSettings({...automationSettings, follow_up_enabled: e.target.checked})}
              className="h-5 w-5 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500" />
          </label>
        </div>

        {/* Messages config when follow-up is enabled */}
        {automationSettings.follow_up_enabled && (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-emerald-200 dark:border-emerald-900/50 p-6 space-y-5 animate-in slide-in-from-top-4 fade-in">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
              <Clock className="h-4 w-4 text-emerald-500" /> Pengaturan Follow-up
            </h3>
            
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Pesan saat Idle (Setelah 10 Menit)</label>
              <textarea 
                rows={2}
                value={automationSettings.idle_message} 
                onChange={e => setAutomationSettings({...automationSettings, idle_message: e.target.value})} 
                className={inputClass} 
              />
              <p className="mt-1 text-xs text-zinc-500">Dikirim jika user berhenti membalas selama 10 menit berturut-turut.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Pesan Penutup (Setelah 24 Jam)</label>
              <textarea 
                rows={3}
                value={automationSettings.closing_reminder} 
                onChange={e => setAutomationSettings({...automationSettings, closing_reminder: e.target.value})} 
                className={inputClass} 
              />
              <p className="mt-1 text-xs text-zinc-500">Dikirim untuk mengakhiri sesi percakapan secara halus.</p>
            </div>
          </div>
        )}
        
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
