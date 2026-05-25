"use client";

import { useState, useEffect } from 'react';
import { builtInThemes, ThemeConfig } from '@/lib/themes';
import { createClient } from '@/utils/supabase/client';
import { Save, Loader2, MonitorSmartphone } from 'lucide-react';
import FloatingLivePreview from '@/components/FloatingLivePreview';

export default function ThemeManager({ businessId }: { businessId: string }) {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [themeId, setThemeId] = useState('light-blue');
  const [primaryColor, setPrimaryColor] = useState('#2563eb');
  const [previewMode, setPreviewMode] = useState<'widget' | 'fullpage'>('widget');
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');

  useEffect(() => {
    async function fetchConfig() {
      setLoading(true);
      const { data } = await supabase
        .from('BusinessProfiles')
        .select('theme_id, primary_color')
        .eq('id', businessId)
        .single();
      
      if (data) {
        if (data.theme_id) setThemeId(data.theme_id);
        if (data.primary_color) setPrimaryColor(data.primary_color);
      }
      setLoading(false);
    }
    fetchConfig();
  }, [businessId, supabase]);

  // Sync to Live Preview
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const channel = new BroadcastChannel(`livechat-preview-${businessId}`);
      channel.postMessage({
        type: 'UPDATE_CONFIG',
        payload: {
          themeId,
          primaryColor
        }
      });
      return () => channel.close();
    }
  }, [themeId, primaryColor, businessId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await supabase
        .from('BusinessProfiles')
        .update({
          theme_id: themeId,
          primary_color: primaryColor
        })
        .eq('id', businessId);
      alert('Tema berhasil disimpan!');
    } catch (err) {
      console.error(err);
    }
    setSaving(false);
  };

  const handleThemeChange = (id: string) => {
    setThemeId(id);
    const theme = builtInThemes[id];
    if (theme && theme.primaryColor) {
      setPrimaryColor(theme.primaryColor);
    }
  };

  if (loading) return <div className="p-8 text-center"><Loader2 className="animate-spin h-8 w-8 mx-auto" /></div>;

  return (
    <div className="flex flex-col lg:flex-row gap-8 h-[calc(100vh-140px)]">
      {/* Configuration Panel */}
      <div className="w-full lg:w-1/2 flex flex-col gap-6 overflow-y-auto pr-2 pb-10">
        
        {/* Theme Selection */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-4">Pilih Tema</h3>
          <div className="grid grid-cols-2 gap-4">
            {Object.values(builtInThemes).map((t) => (
              <button
                key={t.id}
                onClick={() => handleThemeChange(t.id)}
                className={`relative p-4 rounded-2xl border-2 text-left transition-all ${themeId === t.id ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/20' : 'border-zinc-100 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'}`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-6 h-6 rounded-full" style={{ backgroundColor: t.primaryColor }}></div>
                  <span className="font-semibold text-zinc-900 dark:text-white">{t.name}</span>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 capitalize">Layout: {t.layout}</p>
                {themeId === t.id && (
                  <div className="absolute top-4 right-4 text-emerald-500 font-bold">✓</div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Customization */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-4">Kustomisasi</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Warna Utama (Primary Color)</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-12 h-12 rounded-xl cursor-pointer border-0 p-0"
                />
                <input
                  type="text"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="px-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
            
            {/* Future customization like Custom JSON Theme can go here */}
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl font-bold hover:opacity-90 flex items-center justify-center gap-2 shadow-lg"
        >
          {saving ? <Loader2 className="animate-spin h-5 w-5" /> : <Save className="h-5 w-5" />}
          Simpan Tema
        </button>

      </div>

      {/* Live Preview Panel */}
      <div className="w-full lg:w-1/2 flex flex-col bg-zinc-100 dark:bg-zinc-950 rounded-3xl border border-zinc-200 dark:border-zinc-800 overflow-hidden relative">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-white dark:bg-zinc-900">
          <h3 className="font-bold flex items-center gap-2 text-zinc-900 dark:text-white">
            <MonitorSmartphone className="h-5 w-5" /> Live Preview
          </h3>
          <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
            <button onClick={() => setPreviewMode('widget')} className={`px-3 py-1.5 text-xs font-bold rounded-lg ${previewMode === 'widget' ? 'bg-white dark:bg-zinc-700 shadow-sm' : 'text-zinc-500'}`}>Widget</button>
            <button onClick={() => setPreviewMode('fullpage')} className={`px-3 py-1.5 text-xs font-bold rounded-lg ${previewMode === 'fullpage' ? 'bg-white dark:bg-zinc-700 shadow-sm' : 'text-zinc-500'}`}>Full Page</button>
          </div>
        </div>

        <div className={`flex-1 relative overflow-hidden flex items-center justify-center ${previewMode === 'fullpage' ? 'p-0' : 'p-4'}`}>
          <div className="absolute inset-0 pointer-events-none opacity-50" style={{ backgroundImage: 'radial-gradient(circle at center, #9ca3af 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
          
          <div className={`relative z-10 w-full h-full flex ${previewMode === 'widget' ? 'justify-end items-end' : ''}`}>
             <div className={`${previewMode === 'widget' ? 'w-[380px] h-[600px] shadow-2xl rounded-2xl overflow-hidden' : 'w-full h-full'} border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950`}>
               <iframe 
                 src={`/chat/${businessId}?preview=true${previewMode === 'fullpage' ? '&mode=fullscreen' : ''}`}
                 className="w-full h-full border-none"
                 title="Live Preview"
               />
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
