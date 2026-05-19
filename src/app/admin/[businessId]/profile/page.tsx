"use client";

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Loader2, Save, Plus, Trash2, KeyRound, ExternalLink, User2, ShieldCheck, X, Sparkles, MessageSquareText, UserCheck, ChevronDown, ChevronUp, Upload, Image as ImageIcon } from 'lucide-react';
import { useParams } from 'next/navigation';

// --- Accordion Component ---
function AccordionSection({ title, icon: Icon, children, defaultOpen = false }: {
  title: string; icon: any; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden transition-colors">
      <button type="button" onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
        <div className="flex items-center space-x-3">
          <Icon className="h-5 w-5 text-emerald-500" />
          <span className="font-bold text-zinc-900 dark:text-zinc-50">{title}</span>
        </div>
        {isOpen ? <ChevronUp className="h-4 w-4 text-zinc-400" /> : <ChevronDown className="h-4 w-4 text-zinc-400" />}
      </button>
      {isOpen && <div className="px-6 pb-6 space-y-4 border-t border-zinc-100 dark:border-zinc-800 pt-4">{children}</div>}
    </div>
  );
}

// --- Escalation Label Options ---
const ESCALATION_OPTIONS = ['Owner', 'Admin', 'Tim Customer Service', 'Konsultan'];
const CUSTOMER_DATA_OPTIONS = [
  { key: 'name', label: 'Nama Lengkap' },
  { key: 'phone', label: 'Nomor WhatsApp' },
  { key: 'email', label: 'Email' },
  { key: 'city', label: 'Kota / Lokasi' },
];

export default function ProfilePage() {
  const params = useParams();
  const businessId = params.businessId as string;
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [showApiKeyGuide, setShowApiKeyGuide] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    id: '',
    name: '',
    wa_number: '',
    pre_filled_msg: '',
    prompt_rules: '',
    api_keys: [] as string[],
    // Phase F new fields
    assistant_name: 'Asisten AI',
    assistant_avatar_url: '',
    quick_replies: [] as string[],
    collect_customer_data: false,
    customer_data_fields: ['name'] as string[],
    escalation_label: 'Owner',
    primary_color: '#059669',
    show_branding: true,
  });

  // Quick reply input state
  const [newQuickReply, setNewQuickReply] = useState('');

  useEffect(() => { fetchProfile(); }, []);

  async function fetchProfile() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const { data, error } = await supabase.from('BusinessProfiles').select('*').eq('id', businessId).eq('owner_id', user.id).single();
      if (error && error.code !== 'PGRST116') throw error;
      if (data) {
        setFormData({
          id: data.id,
          name: data.name || '',
          wa_number: data.wa_number || '',
          pre_filled_msg: data.pre_filled_msg || '',
          prompt_rules: data.prompt_rules || '',
          api_keys: data.api_keys || [],
          assistant_name: data.assistant_name || 'Asisten AI',
          assistant_avatar_url: data.assistant_avatar_url || '',
          quick_replies: data.quick_replies || [],
          collect_customer_data: data.collect_customer_data || false,
          customer_data_fields: data.customer_data_fields || ['name'],
          escalation_label: data.escalation_label || 'Owner',
          primary_color: data.primary_color || '#059669',
          show_branding: data.show_branding !== undefined ? data.show_branding : true,
        });
      }
    } catch (error: any) {
      console.error('Error fetching profile:', error.message || error);
    } finally { setLoading(false); }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    setSaving(true); setMessage('');
    try {
      const payload = {
        name: formData.name,
        wa_number: formData.wa_number,
        pre_filled_msg: formData.pre_filled_msg,
        prompt_rules: formData.prompt_rules,
        api_keys: formData.api_keys,
        assistant_name: formData.assistant_name,
        assistant_avatar_url: formData.assistant_avatar_url,
        quick_replies: formData.quick_replies,
        collect_customer_data: formData.collect_customer_data,
        customer_data_fields: formData.customer_data_fields,
        escalation_label: formData.escalation_label,
        primary_color: formData.primary_color,
        show_branding: formData.show_branding,
        updated_at: new Date().toISOString(),
      };
      if (formData.id) {
        const { error } = await supabase.from('BusinessProfiles').update(payload).eq('id', formData.id).select().single();
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('BusinessProfiles').insert([{ owner_id: userId, ...payload }]).select().single();
        if (error) throw error;
        if (data) setFormData(prev => ({ ...prev, id: data.id }));
      }
      setMessage('Profil berhasil disimpan!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error: any) {
      setMessage(`Gagal menyimpan: ${error?.message || 'Unknown error'}`);
    } finally { setSaving(false); }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // API Key handlers
  const handleAddApiKey = () => setFormData({ ...formData, api_keys: [...formData.api_keys, ''] });
  const handleApiKeyChange = (i: number, v: string) => { const k = [...formData.api_keys]; k[i] = v; setFormData({ ...formData, api_keys: k }); };
  const handleRemoveApiKey = (i: number) => setFormData({ ...formData, api_keys: formData.api_keys.filter((_, idx) => idx !== i) });

  // Quick Reply handlers
  const handleAddQuickReply = () => {
    if (newQuickReply.trim() && formData.quick_replies.length < 4) {
      setFormData({ ...formData, quick_replies: [...formData.quick_replies, newQuickReply.trim()] });
      setNewQuickReply('');
    }
  };
  const handleRemoveQuickReply = (i: number) => {
    setFormData({ ...formData, quick_replies: formData.quick_replies.filter((_, idx) => idx !== i) });
  };

  // Customer data field toggle
  const toggleCustomerDataField = (field: string) => {
    const fields = formData.customer_data_fields.includes(field)
      ? formData.customer_data_fields.filter(f => f !== field)
      : [...formData.customer_data_fields, field];
    setFormData({ ...formData, customer_data_fields: fields });
  };

  // Avatar upload
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !businessId) return;
    setUploadingAvatar(true);
    try {
      const ext = file.name.split('.').pop();
      const filePath = `${businessId}/avatar.${ext}`;
      // Remove old avatar first
      await supabase.storage.from('brand_assets').remove([filePath]);
      const { error: uploadError } = await supabase.storage.from('brand_assets').upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('brand_assets').getPublicUrl(filePath);
      setFormData(prev => ({ ...prev, assistant_avatar_url: urlData.publicUrl + '?t=' + Date.now() }));
    } catch (err: any) {
      console.error('Avatar upload error:', err);
      setMessage('Gagal mengunggah foto profil.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = () => {
    setFormData(prev => ({ ...prev, assistant_avatar_url: '' }));
  };

  const inputClass = "block w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm p-3 text-zinc-900 dark:text-zinc-100 transition-colors";

  return (
    <div className="flex flex-col h-full bg-zinc-50 dark:bg-zinc-950 transition-colors">
      <div className="flex-1 overflow-y-auto p-4 sm:p-8">
        <div className="max-w-3xl mx-auto space-y-6">

          <div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Settings</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Konfigurasi identitas, perilaku AI, dan integrasi bisnis Anda.</p>
          </div>

          {loading ? (
            <div className="flex justify-center py-12 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* ===== ACCORDION 1: Identity & Business Info ===== */}
              <AccordionSection title="Identity & Business Info" icon={User2} defaultOpen={true}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Nama Bisnis</label>
                    <input type="text" name="name" id="name" value={formData.name} onChange={handleChange} required className={inputClass} placeholder="Contoh: Toko Kopi Sejahtera" />
                  </div>
                  <div>
                    <label htmlFor="wa_number" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Nomor WhatsApp Owner</label>
                    <input type="text" name="wa_number" id="wa_number" value={formData.wa_number} onChange={handleChange} required className={inputClass} placeholder="6281234567890" />
                  </div>
                </div>
                <div>
                  <label htmlFor="pre_filled_msg" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Pre-filled Pesan WhatsApp</label>
                  <textarea name="pre_filled_msg" id="pre_filled_msg" rows={2} value={formData.pre_filled_msg} onChange={handleChange} className={inputClass} placeholder="Halo Kak, saya mau order..." />
                  <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">Pesan otomatis saat user klik tombol WhatsApp.</p>
                </div>
              </AccordionSection>

              {/* ===== ACCORDION 2: Chatbot Appearance (NEW) ===== */}
              <AccordionSection title="Chatbot Appearance" icon={Sparkles} defaultOpen={true}>
                {/* Assistant Name */}
                <div>
                  <label htmlFor="assistant_name" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Nama Asisten AI</label>
                  <input type="text" name="assistant_name" id="assistant_name" value={formData.assistant_name} onChange={handleChange} className={inputClass} placeholder="Contoh: Sarah - Customer Success" />
                  <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">Nama yang ditampilkan di header chat widget.</p>
                </div>

                {/* Avatar Upload */}
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Foto Profil Asisten</label>
                  <div className="flex items-center gap-4">
                    {/* Preview */}
                    <div className="relative h-16 w-16 rounded-2xl bg-zinc-100 dark:bg-zinc-800 border-2 border-dashed border-zinc-300 dark:border-zinc-700 flex items-center justify-center overflow-hidden shrink-0">
                      {formData.assistant_avatar_url ? (
                        <img src={formData.assistant_avatar_url} alt="Avatar" className="h-full w-full object-cover" />
                      ) : (
                        <ImageIcon className="h-6 w-6 text-zinc-400" />
                      )}
                      {uploadingAvatar && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-2xl">
                          <Loader2 className="h-5 w-5 text-white animate-spin" />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <input ref={avatarInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleAvatarUpload} />
                      <button type="button" onClick={() => avatarInputRef.current?.click()} disabled={uploadingAvatar}
                        className="inline-flex items-center px-3 py-1.5 text-xs font-bold rounded-lg text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/30 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors disabled:opacity-50">
                        <Upload className="h-3.5 w-3.5 mr-1.5" />
                        {formData.assistant_avatar_url ? 'Ganti Foto' : 'Upload Foto'}
                      </button>
                      {formData.assistant_avatar_url && (
                        <button type="button" onClick={handleRemoveAvatar}
                          className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                          <Trash2 className="h-3 w-3 mr-1" /> Hapus
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">JPG, PNG, atau WebP. Max 2MB.</p>
                </div>

                {/* Quick Replies */}
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Pertanyaan Cepat (Quick Replies)</label>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3">Tombol saran pertanyaan yang muncul di chat agar customer bisa langsung klik. Maksimal 4.</p>
                  {/* Chips */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {formData.quick_replies.map((reply, idx) => (
                      <span key={idx} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700/50 text-emerald-700 dark:text-emerald-300 text-sm font-medium rounded-full">
                        {reply}
                        <button type="button" onClick={() => handleRemoveQuickReply(idx)}
                          className="text-emerald-500 hover:text-red-500 transition-colors">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                  {/* Add new */}
                  {formData.quick_replies.length < 4 && (
                    <div className="flex gap-2">
                      <input type="text" value={newQuickReply} onChange={(e) => setNewQuickReply(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddQuickReply(); } }}
                        className={`flex-1 ${inputClass}`} placeholder="Contoh: Lihat katalog produk" />
                      <button type="button" onClick={handleAddQuickReply} disabled={!newQuickReply.trim()}
                        className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 disabled:opacity-50 transition-colors shrink-0">
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </AccordionSection>

              {/* ===== ACCORDION 3: Theme & Branding (NEW) ===== */}
              <AccordionSection title="Theme & Branding" icon={ShieldCheck} defaultOpen={false}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Primary Color */}
                  <div>
                    <label htmlFor="primary_color" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Warna Utama Widget</label>
                    <div className="flex gap-3">
                      <div 
                        className="h-10 w-10 rounded-lg border border-zinc-200 dark:border-zinc-800 shrink-0" 
                        style={{ backgroundColor: formData.primary_color }}
                      />
                      <input 
                        type="text" 
                        name="primary_color" 
                        value={formData.primary_color} 
                        onChange={handleChange}
                        className={`flex-1 ${inputClass}`} 
                        placeholder="#059669" 
                      />
                    </div>
                    <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">Gunakan format HEX (misal: #059669).</p>
                  </div>

                  {/* Show Branding Toggle */}
                  <div className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-950/50 rounded-xl border border-zinc-200 dark:border-zinc-800 self-start">
                    <div>
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Tampilkan Branding</p>
                      <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">Label &quot;Powered by&quot; di bawah chat.</p>
                    </div>
                    <button type="button" onClick={() => setFormData(prev => ({ ...prev, show_branding: !prev.show_branding }))}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.show_branding ? 'bg-emerald-600' : 'bg-zinc-300 dark:bg-zinc-700'}`}>
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${formData.show_branding ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                </div>

                {/* Preview Box */}
                <div className="mt-4 p-4 bg-zinc-900 dark:bg-black rounded-2xl border border-zinc-800">
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-3">Live Preview Warna</p>
                  <div className="flex gap-2">
                    <div style={{ backgroundColor: formData.primary_color }} className="h-10 w-24 rounded-xl flex items-center justify-center text-white text-[10px] font-bold shadow-lg">TOMBOL</div>
                    <div style={{ borderColor: formData.primary_color, color: formData.primary_color }} className="h-10 w-24 rounded-xl border flex items-center justify-center text-[10px] font-bold bg-white">OUTLINE</div>
                  </div>
                </div>
              </AccordionSection>

              {/* ===== ACCORDION 3: Behavior & Instructions ===== */}
              <AccordionSection title="Behavior & Instructions (Bouncer)" icon={ShieldCheck}>
                <div>
                  <label htmlFor="prompt_rules" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Aturan Kualifikasi Prospek</label>
                  <textarea name="prompt_rules" id="prompt_rules" rows={5} value={formData.prompt_rules} onChange={handleChange} className={inputClass} placeholder="Wajib menanyakan lokasi pengiriman dan budget sebelum memberikan tombol WA." />
                  <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">Instruksi ini akan ditambahkan ke System Prompt AI sebagai aturan kualifikasi.</p>
                </div>
              </AccordionSection>

              {/* ===== ACCORDION 4: Lead Collection & Handoff (NEW) ===== */}
              <AccordionSection title="Lead Collection & Handoff" icon={UserCheck}>
                {/* Toggle */}
                <div className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-950/50 rounded-xl border border-zinc-200 dark:border-zinc-800">
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Kumpulkan Data Customer</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Tampilkan form sebelum tombol WhatsApp muncul.</p>
                  </div>
                  <button type="button" onClick={() => setFormData(prev => ({ ...prev, collect_customer_data: !prev.collect_customer_data }))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.collect_customer_data ? 'bg-emerald-600' : 'bg-zinc-300 dark:bg-zinc-700'}`}>
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${formData.collect_customer_data ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

                {/* Data Fields (shown when toggle is on) */}
                {formData.collect_customer_data && (
                  <div className="p-4 bg-zinc-50 dark:bg-zinc-950/50 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-3">
                    <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Data yang Diminta:</p>
                    <div className="grid grid-cols-2 gap-2">
                      {CUSTOMER_DATA_OPTIONS.map((opt) => (
                        <label key={opt.key} className="flex items-center gap-2.5 p-2.5 rounded-lg hover:bg-white dark:hover:bg-zinc-900 cursor-pointer transition-colors">
                          <input type="checkbox" checked={formData.customer_data_fields.includes(opt.key)}
                            onChange={() => toggleCustomerDataField(opt.key)}
                            className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-600 text-emerald-600 focus:ring-emerald-500" />
                          <span className="text-sm text-zinc-700 dark:text-zinc-300">{opt.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Escalation Label */}
                <div>
                  <label htmlFor="escalation_label" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Label Tujuan Eskalasi</label>
                  <select name="escalation_label" id="escalation_label" value={formData.escalation_label} onChange={handleChange} className={inputClass}>
                    {ESCALATION_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                  <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">Teks yang ditampilkan di tombol eskalasi, misal &quot;Lanjutkan ke Owner&quot; atau &quot;Hubungi Tim CS&quot;.</p>
                </div>
              </AccordionSection>

              {/* ===== ACCORDION 5: LLM / API Keys ===== */}
              <AccordionSection title="LLM Model & API Keys" icon={KeyRound}>
                <div className="flex items-center justify-between mb-3">
                  <button type="button" onClick={() => setShowApiKeyGuide(true)} className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline flex items-center">
                    <ExternalLink className="h-3 w-3 mr-1" /> Cara mendapatkan API Key gratis
                  </button>
                  <button type="button" onClick={handleAddApiKey}
                    className="inline-flex items-center px-3 py-1.5 text-xs font-bold rounded-lg text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/30 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors">
                    <Plus className="h-3.5 w-3.5 mr-1" /> Tambah Key
                  </button>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3">Sistem otomatis menggunakan key pertama, dan beralih ke berikutnya jika limit.</p>
                {formData.api_keys.length === 0 ? (
                  <div className="text-sm text-zinc-500 dark:text-zinc-400 italic p-5 bg-zinc-50 dark:bg-zinc-950/50 rounded-xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 text-center">
                    Belum ada API Key. Harap tambahkan minimal 1 Gemini API Key.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {formData.api_keys.map((key, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <input type="password" value={key} onChange={(e) => handleApiKeyChange(index, e.target.value)} required className={`flex-1 ${inputClass}`} placeholder={`AIzaSy... (Key ${index + 1})`} />
                        <button type="button" onClick={() => handleRemoveApiKey(index)} className="p-2.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </AccordionSection>

              {/* Save */}
              <div className="flex flex-col sm:flex-row items-center justify-end gap-4 pt-4">
                {message && (
                  <span className={`text-sm font-medium ${message.includes('Gagal') ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>{message}</span>
                )}
                <button type="submit" disabled={saving}
                  className="w-full sm:w-auto inline-flex justify-center items-center rounded-xl bg-zinc-900 dark:bg-white py-3 px-8 text-sm font-bold text-white dark:text-zinc-900 shadow-sm hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 transition-colors">
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Simpan Perubahan
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* API Key Guide Modal */}
      {showApiKeyGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-xl border border-zinc-200 dark:border-zinc-800">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 mb-4">Cara Mendapatkan API Key (Gratis)</h3>
            <div className="space-y-3 text-sm text-zinc-600 dark:text-zinc-400">
              <p>1. Kunjungi <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-emerald-600 dark:text-emerald-400 font-medium hover:underline">aistudio.google.com/app/apikey</a>.</p>
              <p>2. Login menggunakan akun Google (Gmail) Anda.</p>
              <p>3. Klik tombol biru <strong>&quot;Create API key&quot;</strong>.</p>
              <p>4. Pilih <strong>&quot;Create API key in new project&quot;</strong>.</p>
              <p>5. Salin kode (berawalan <code className="bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-xs">AIzaSy...</code>) dan tempel di kolom API Key.</p>
            </div>
            <div className="mt-6 flex justify-end">
              <button type="button" onClick={() => setShowApiKeyGuide(false)}
                className="px-5 py-2.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-xl text-sm font-bold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
