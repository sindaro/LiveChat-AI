"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Loader2, Link as LinkIcon, Code2, Copy, CheckCircle2, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function IntegrationPage() {
  const params = useParams();
  const businessId = params.businessId as string;
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    async function fetchBusinessProfile() {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
          .from('BusinessProfiles')
          .select('id')
          .eq('id', businessId)
          .eq('owner_id', user.id)
          .single();
        
        if (!data) {
           console.error('Business not found or access denied');
        }
      } catch (err) {
        console.error('Error fetching business ID:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchBusinessProfile();
  }, [businessId, supabase]);

  const getBaseUrl = () => {
    if (typeof window !== 'undefined') {
      return window.location.origin;
    }
    return '';
  };

  const handleCopy = async (text: string, type: 'link' | 'code') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'link') {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      } else {
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
      }
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const standaloneUrl = businessId ? `${getBaseUrl()}/chat/${businessId}` : '';
  const loaderCode = businessId ? `<script 
  src="${getBaseUrl()}/loader.js" 
  data-business-id="${businessId}"
  async
></script>` : '';
  const iframeCode = businessId ? `<iframe 
  src="${getBaseUrl()}/widget/${businessId}" 
  style="position:fixed; bottom:20px; right:20px; width:400px; height:600px; border:none; z-index:9999; border-radius:16px; box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);"
  allowtransparency="true"
></iframe>` : '';

  const [activeTab, setActiveTab] = useState<'script' | 'iframe'>('script');

  return (
    <div className="flex flex-col h-full bg-zinc-50 dark:bg-zinc-950 transition-colors">
      <div className="flex-1 overflow-y-auto p-4 sm:p-8">
        <div className="max-w-5xl mx-auto space-y-8">
          
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Deployment Hub</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              Pilih cara Anda ingin membagikan asisten AI Anda ke pelanggan.
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center py-12 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
            </div>
          ) : !businessId ? (
            <div className="p-8 text-center bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800">
              <p className="text-zinc-600 dark:text-zinc-400">
                Profil bisnis Anda belum diatur. Silakan atur <Link href="/admin/profile" className="text-emerald-600 hover:underline">Profil Bisnis</Link> terlebih dahulu untuk mendapatkan tautan deploy.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Left Column: Methods */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* 1. Recommended: Script Loader */}
                <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                  <div className="p-6 sm:p-8 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center">
                        <Code2 className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Embed Website (Recommended)</h3>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Metode paling stabil dan responsif.</p>
                      </div>
                    </div>
                    <div className="hidden sm:flex gap-1 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl">
                       <button onClick={() => setActiveTab('script')} className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all ${activeTab === 'script' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm' : 'text-zinc-500'}`}>SCRIPT</button>
                       <button onClick={() => setActiveTab('iframe')} className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all ${activeTab === 'iframe' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm' : 'text-zinc-500'}`}>IFRAME</button>
                    </div>
                  </div>
                  
                  <div className="p-6 sm:p-8">
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6 leading-relaxed">
                      Salin kode di bawah ini dan tempel tepat sebelum tag pembuka <code>&lt;/body&gt;</code> di website Anda. 
                      Widget akan muncul secara otomatis di pojok kanan bawah.
                    </p>
                    
                    <div className="bg-zinc-900 dark:bg-black p-5 rounded-2xl border border-zinc-800 mb-6 overflow-x-auto relative group">
                      <pre className="text-[13px] text-zinc-300 font-mono leading-relaxed">
                        <code>{activeTab === 'script' ? loaderCode : iframeCode}</code>
                      </pre>
                      <button 
                        onClick={() => handleCopy(activeTab === 'script' ? loaderCode : iframeCode, 'code')}
                        className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all backdrop-blur-md"
                      >
                        {copiedCode ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4">
                      <button
                        onClick={() => handleCopy(activeTab === 'script' ? loaderCode : iframeCode, 'code')}
                        className="flex-1 flex items-center justify-center px-6 py-3.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl text-sm font-bold hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors shadow-lg"
                      >
                        {copiedCode ? <CheckCircle2 className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                        {copiedCode ? 'Tersalin!' : 'Salin Kode'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* 2. Standalone Link */}
                <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-sm border border-zinc-200 dark:border-zinc-800 p-6 sm:p-8">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center">
                      <LinkIcon className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Standalone Link</h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Untuk bio media sosial atau pesan langsung.</p>
                    </div>
                  </div>
                  
                  <div className="bg-zinc-50 dark:bg-zinc-950/50 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex items-center justify-between mb-6">
                    <span className="text-sm text-zinc-600 dark:text-zinc-400 truncate pr-4 font-mono select-all">
                      {standaloneUrl}
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={() => handleCopy(standaloneUrl, 'link')}
                      className="flex-1 flex items-center justify-center px-6 py-3.5 bg-blue-600 text-white rounded-2xl text-sm font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20"
                    >
                      {copiedLink ? <CheckCircle2 className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                      {copiedLink ? 'Tersalin!' : 'Salin Tautan'}
                    </button>
                    <a
                      href={standaloneUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center px-6 py-3.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-2xl text-sm font-bold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" /> Preview
                    </a>
                  </div>
                </div>

                {/* 3. Webhook Architecture */}
                <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                  <div className="p-6 border-b border-zinc-100 dark:border-zinc-800">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-purple-50 dark:bg-purple-900/20 text-purple-600 rounded-lg">
                        <Code2 className="h-5 w-5" />
                      </div>
                      <h3 className="font-bold text-zinc-900 dark:text-zinc-50">Webhook API (Advanced)</h3>
                    </div>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">Gunakan endpoint webhook ini untuk menghubungkan LiveChat-AI dengan Make, Zapier, atau custom backend Anda.</p>
                  </div>
                  <div className="p-6 bg-zinc-50 dark:bg-zinc-950/50">
                    <div className="mb-4">
                      <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-2 uppercase tracking-wider">Incoming Webhook URL</label>
                      <div className="flex">
                        <input 
                          type="text" 
                          readOnly 
                          value={`https://livechat-ai.com/api/webhooks/incoming/${businessId}`} 
                          className="block w-full rounded-l-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 shadow-sm text-sm p-3 text-zinc-600 dark:text-zinc-400 font-mono"
                        />
                        <button 
                          onClick={() => handleCopy(`https://livechat-ai.com/api/webhooks/incoming/${businessId}`, 'link')}
                          className="px-4 rounded-r-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors border border-l-0 border-zinc-900 dark:border-white flex items-center justify-center shrink-0"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <div className="bg-zinc-100 dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
                      <p className="text-xs font-semibold mb-2 text-zinc-700 dark:text-zinc-300">Event Triggers yang didukung:</p>
                      <ul className="text-xs text-zinc-500 dark:text-zinc-400 space-y-1.5 list-disc list-inside">
                        <li><code className="text-zinc-900 dark:text-zinc-300 font-medium">lead.captured</code> - Terjadi saat AI berhasil mendapatkan data pelanggan.</li>
                        <li><code className="text-zinc-900 dark:text-zinc-300 font-medium">handover.requested</code> - Terjadi saat pelanggan meminta eskalasi ke manusia.</li>
                      </ul>
                    </div>
                  </div>
                </div>

              </div>

              {/* Right Column: Platform Guides */}
              <div className="space-y-6">
                <div className="bg-gradient-to-br from-zinc-800 to-black p-8 rounded-3xl text-white shadow-xl">
                  <h4 className="text-base font-bold mb-6 flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400" /> Platform Guides
                  </h4>
                  <div className="space-y-6">
                    <div>
                      <p className="text-sm font-bold text-emerald-400 mb-2">WordPress</p>
                      <p className="text-xs text-zinc-400 leading-relaxed">
                        Gunakan plugin seperti "Insert Headers and Footers" atau edit file <code>footer.php</code> dan tempel kode sebelum tag <code>&lt;/body&gt;</code>.
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-blue-400 mb-2">Shopify</p>
                      <p className="text-xs text-zinc-400 leading-relaxed">
                        Masuk ke Online Store &rarr; Themes &rarr; Edit Code. Buka file <code>theme.liquid</code> dan tempel kode di bagian paling bawah.
                      </p>
                    </div>
                    <div className="pt-4 border-t border-white/10">
                      <p className="text-[11px] text-zinc-500 italic">
                        Membutuhkan bantuan integrasi khusus? Hubungi tim support agensi kami.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-emerald-50 dark:bg-emerald-900/10 p-6 rounded-3xl border border-emerald-100 dark:border-emerald-800/50">
                  <h4 className="text-sm font-bold text-emerald-800 dark:text-emerald-400 mb-2">💡 Pro Tip</h4>
                  <p className="text-xs text-emerald-700 dark:text-emerald-500 leading-relaxed">
                    Anda bisa mengubah warna dan identitas asisten AI Anda di halaman <strong>Settings</strong> tanpa perlu mengganti kode embed yang sudah terpasang.
                  </p>
                </div>
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
}
