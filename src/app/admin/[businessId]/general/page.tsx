"use client";

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Loader2, Save, Upload, Trash2, ImageIcon } from 'lucide-react';
import { useParams } from 'next/navigation';

export default function GeneralSettingsPage() {
  const params = useParams();
  const businessId = params.businessId as string;
  const supabase = createClient();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    wa_number: '',
    primary_color: '#059669',
    show_branding: true,
    // we use assistant_avatar_url as the logo/avatar for now
    assistant_avatar_url: '' 
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
          primaryColor: formData.primary_color,
          showBranding: formData.show_branding,
          assistantAvatarUrl: formData.assistant_avatar_url,
          assistantName: formData.name
        }
      });
      return () => channel.close();
    }
  }, [formData, businessId]);

  async function fetchData() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('BusinessProfiles')
        .select('name, wa_number, primary_color, show_branding, assistant_avatar_url')
        .eq('id', businessId)
        .single();
        
      if (error && error.code !== 'PGRST116') throw error;
      if (data) {
        setFormData({
          name: data.name || '',
          wa_number: data.wa_number || '',
          primary_color: data.primary_color || '#059669',
          show_branding: data.show_branding !== undefined ? data.show_branding : true,
          assistant_avatar_url: data.assistant_avatar_url || ''
        });
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
          name: formData.name,
          wa_number: formData.wa_number,
          primary_color: formData.primary_color,
          show_branding: formData.show_branding,
          assistant_avatar_url: formData.assistant_avatar_url,
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

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !businessId) return;
    setUploadingLogo(true);
    try {
      const ext = file.name.split('.').pop();
      const filePath = `${businessId}/avatar.${ext}`;
      await supabase.storage.from('brand_assets').remove([filePath]);
      const { error: uploadError } = await supabase.storage.from('brand_assets').upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('brand_assets').getPublicUrl(filePath);
      setFormData(prev => ({ ...prev, assistant_avatar_url: urlData.publicUrl + '?t=' + Date.now() }));
    } catch (err: any) {
      console.error('Avatar upload error:', err);
      setMessage('Gagal mengunggah foto profil.');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleRemoveLogo = () => {
    setFormData(prev => ({ ...prev, assistant_avatar_url: '' }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
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
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">General Settings</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Atur identitas bisnis dan tampilan dasar widget chat.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Identitas */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-4">
          <h3 className="font-bold text-zinc-900 dark:text-zinc-50 mb-4">Profil Bisnis</h3>
          
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Nama Bisnis</label>
            <input type="text" name="name" value={formData.name} onChange={handleChange} required className={inputClass} placeholder="Contoh: Toko Kopi Sejahtera" />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Nomor WhatsApp Utama</label>
            <input type="text" name="wa_number" value={formData.wa_number} onChange={handleChange} required className={inputClass} placeholder="6281234567890" />
            <p className="mt-1.5 text-xs text-zinc-500">Nomor ini akan digunakan sebagai tujuan saat customer klik tombol WhatsApp atau eskalasi.</p>
          </div>
        </div>

        {/* Branding & Logo */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-6">
          <h3 className="font-bold text-zinc-900 dark:text-zinc-50">Tampilan & Branding</h3>
          
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Logo Bisnis / Foto Asisten</label>
            <div className="flex items-center gap-4">
              <div className="relative h-16 w-16 rounded-2xl bg-zinc-100 dark:bg-zinc-800 border-2 border-dashed border-zinc-300 dark:border-zinc-700 flex items-center justify-center overflow-hidden shrink-0">
                {formData.assistant_avatar_url ? (
                  <img src={formData.assistant_avatar_url} alt="Logo" className="h-full w-full object-cover" />
                ) : (
                  <ImageIcon className="h-6 w-6 text-zinc-400" />
                )}
                {uploadingLogo && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-2xl">
                    <Loader2 className="h-5 w-5 text-white animate-spin" />
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <input ref={logoInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleLogoUpload} />
                <button type="button" onClick={() => logoInputRef.current?.click()} disabled={uploadingLogo}
                  className="inline-flex items-center px-3 py-1.5 text-xs font-bold rounded-lg text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/30 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors disabled:opacity-50">
                  <Upload className="h-3.5 w-3.5 mr-1.5" />
                  {formData.assistant_avatar_url ? 'Ganti Foto' : 'Upload Foto'}
                </button>
                {formData.assistant_avatar_url && (
                  <button type="button" onClick={handleRemoveLogo}
                    className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                    <Trash2 className="h-3 w-3 mr-1" /> Hapus
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Warna Utama Widget</label>
              <div className="flex gap-3">
                <div className="h-11 w-11 rounded-lg border border-zinc-200 dark:border-zinc-800 shrink-0 shadow-sm" style={{ backgroundColor: formData.primary_color }} />
                <input type="text" name="primary_color" value={formData.primary_color} onChange={handleChange} className={`flex-1 ${inputClass}`} placeholder="#059669" />
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-950/50 rounded-xl border border-zinc-200 dark:border-zinc-800 self-end">
              <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Tampilkan Branding</p>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">Label &quot;Powered by&quot; di widget.</p>
              </div>
              <button type="button" onClick={() => setFormData(prev => ({ ...prev, show_branding: !prev.show_branding }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.show_branding ? 'bg-emerald-600' : 'bg-zinc-300 dark:bg-zinc-700'}`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${formData.show_branding ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
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
