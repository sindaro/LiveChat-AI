"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Settings2, Plus, Trash2, Save, Loader2, Link2, Clock, MessageSquareText } from 'lucide-react';
import { useParams } from 'next/navigation';

export default function EngagePage() {
  const params = useParams();
  const businessId = params.businessId as string;
  const supabase = createClient();
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchData();
  }, [businessId]);

  async function fetchData() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data: rulesData, error: rulesError } = await supabase
        .from('CampaignRules')
        .select('*')
        .eq('business_id', businessId)
        .eq('owner_id', user.id)
        .order('created_at', { ascending: true });

      if (rulesData) {
        setRules(rulesData);
      }
    } catch (error) {
      console.error('Error fetching engage rules:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleAddRule = () => {
    setRules([...rules, { 
      id: `temp_${Date.now()}`, 
      url_target: '/', 
      time_delay_sec: 5, 
      trigger_message: 'Halo! Ada yang bisa kami bantu?',
      is_active: true 
    }]);
  };

  const handleRuleChange = (index: number, field: string, value: any) => {
    const newRules = [...rules];
    newRules[index][field] = value;
    setRules(newRules);
  };

  const handleRemoveRule = async (index: number) => {
    const ruleToRemove = rules[index];
    if (!ruleToRemove.id.toString().startsWith('temp_')) {
      if (!confirm('Hapus rule ini secara permanen?')) return;
      try {
        await supabase.from('CampaignRules').delete().eq('id', ruleToRemove.id);
      } catch (error) {
        console.error('Failed to delete rule', error);
      }
    }
    const newRules = rules.filter((_, i) => i !== index);
    setRules(newRules);
  };

  const handleSave = async () => {
    if (!userId || !businessId) {
      setMessage('Profil Bisnis belum disetup.');
      return;
    }

    setSaving(true);
    setMessage('');

    try {
      for (const rule of rules) {
        if (rule.id.toString().startsWith('temp_')) {
          await supabase.from('CampaignRules').insert([{
            business_id: businessId,
            owner_id: userId,
            url_target: rule.url_target,
            time_delay_sec: rule.time_delay_sec,
            trigger_message: rule.trigger_message,
            is_active: rule.is_active
          }]);
        } else {
          await supabase.from('CampaignRules').update({
            url_target: rule.url_target,
            time_delay_sec: rule.time_delay_sec,
            trigger_message: rule.trigger_message,
            is_active: rule.is_active
          }).eq('id', rule.id);
        }
      }
      setMessage('Berhasil menyimpan pengaturan campaign!');
      fetchData(); 
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error saving rules:', error);
      setMessage('Gagal menyimpan pengaturan.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-50 dark:bg-zinc-950 transition-colors">
      <div className="flex-1 overflow-y-auto p-4 sm:p-8">
        <div className="max-w-4xl mx-auto">
          
          <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
            <div>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Pengaturan Kampanye Otomatis</h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                Atur kapan dan di mana widget chat harus muncul secara otomatis menyapa pengunjung.
              </p>
            </div>
            <button
              onClick={handleAddRule}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 shadow-sm transition-colors dark:focus:ring-offset-zinc-900"
            >
              <Plus className="h-4 w-4 mr-2" />
              Tambah Aturan
            </button>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 p-6 transition-colors">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
              </div>
            ) : rules.length === 0 ? (
              <div className="text-center py-12 text-zinc-500 dark:text-zinc-400 border-2 border-dashed rounded-2xl border-zinc-200 dark:border-zinc-800">
                <Settings2 className="mx-auto h-12 w-12 text-zinc-300 dark:text-zinc-700 mb-3" />
                <p>Belum ada aturan kampanye yang dibuat.</p>
                <button
                  onClick={handleAddRule}
                  className="mt-4 text-emerald-600 dark:text-emerald-400 font-medium hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
                >
                  Buat Aturan Pertama
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {rules.map((rule, index) => (
                  <div key={rule.id} className="relative p-6 bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl group transition-all hover:border-emerald-300 dark:hover:border-emerald-700/50 hover:shadow-md">
                    
                    <button
                      onClick={() => handleRemoveRule(index)}
                      className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5 pr-10">
                      <div>
                        <label className="flex items-center text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                          <Link2 className="w-4 h-4 mr-1.5 text-zinc-400" />
                          Target URL (Path)
                        </label>
                        <input
                          type="text"
                          value={rule.url_target}
                          onChange={(e) => handleRuleChange(index, 'url_target', e.target.value)}
                          className="block w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm p-3 text-zinc-900 dark:text-zinc-100 transition-colors"
                          placeholder="Contoh: /, /pricing, /products/*"
                        />
                      </div>
                      <div>
                        <label className="flex items-center text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                          <Clock className="w-4 h-4 mr-1.5 text-zinc-400" />
                          Waktu Jeda (Detik)
                        </label>
                        <input
                          type="number"
                          value={rule.time_delay_sec}
                          onChange={(e) => handleRuleChange(index, 'time_delay_sec', parseInt(e.target.value))}
                          className="block w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm p-3 text-zinc-900 dark:text-zinc-100 transition-colors"
                          min={0}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="flex items-center text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                        <MessageSquareText className="w-4 h-4 mr-1.5 text-zinc-400" />
                        Pesan Pemicu (Trigger Message)
                      </label>
                      <input
                        type="text"
                        value={rule.trigger_message}
                        onChange={(e) => handleRuleChange(index, 'trigger_message', e.target.value)}
                        className="block w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm p-3 text-zinc-900 dark:text-zinc-100 transition-colors"
                        placeholder="Contoh: Halo! Mau lihat promo hari ini?"
                      />
                    </div>

                    <div className="mt-5 flex items-center">
                      <input
                        id={`active-${index}`}
                        type="checkbox"
                        checked={rule.is_active}
                        onChange={(e) => handleRuleChange(index, 'is_active', e.target.checked)}
                        className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-zinc-300 dark:border-zinc-700 rounded bg-white dark:bg-zinc-900"
                      />
                      <label htmlFor={`active-${index}`} className="ml-2 block text-sm font-medium text-zinc-900 dark:text-zinc-300">
                        Aktifkan Kampanye Ini
                      </label>
                    </div>

                  </div>
                ))}

                <div className="pt-6 flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800">
                  <div className="text-sm">
                    {message && (
                      <span className={message.includes('Gagal') ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400 font-medium'}>
                        {message}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="inline-flex justify-center items-center rounded-xl border border-transparent bg-zinc-900 dark:bg-white py-3 px-6 text-sm font-bold text-white dark:text-zinc-900 shadow-sm hover:bg-zinc-800 dark:hover:bg-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 transition-colors dark:focus:ring-offset-zinc-900"
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Simpan Semua Aturan
                  </button>
                </div>

              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
