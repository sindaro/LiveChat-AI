"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Loader2, RefreshCw } from 'lucide-react';
import { useParams } from 'next/navigation';

export default function PreviewPage() {
  const params = useParams();
  const businessId = params.businessId as string;
  const supabase = createClient();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Just to verify access before showing preview
    async function checkAccess() {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        await supabase
          .from('BusinessProfiles')
          .select('id')
          .eq('id', businessId)
          .eq('owner_id', user.id)
          .single();
      } finally {
        setLoading(false);
      }
    }
    checkAccess();
  }, [businessId, supabase]);

  const getBaseUrl = () => {
    if (typeof window !== 'undefined') {
      return window.location.origin;
    }
    return '';
  };

  const standaloneUrl = businessId ? `${getBaseUrl()}/chat/${businessId}` : '';

  return (
    <div className="flex flex-col h-full bg-zinc-50 dark:bg-zinc-950 transition-colors">
      <div className="flex-1 overflow-y-auto p-4 sm:p-8">
        <div className="max-w-5xl mx-auto space-y-6">
          
          <div className="mb-6">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Interactive Preview</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              Uji coba bagaimana AI Anda merespons pelanggan berdasarkan profil dan *knowledge base* yang sudah Anda atur.
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center py-12 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
            </div>
          ) : (
            <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-sm border border-zinc-200 dark:border-zinc-800 p-6 sm:p-10 flex flex-col items-center">
              <div className="w-full max-w-[400px] h-[750px] border-[12px] border-zinc-900 dark:border-zinc-800 rounded-[3rem] overflow-hidden shadow-2xl relative bg-zinc-100 dark:bg-zinc-950 shrink-0">
                <div className="absolute top-4 right-4 z-30">
                  <button 
                    onClick={() => {
                      const iframe = document.querySelector('iframe');
                      if (iframe) {
                        // Reset session by reloading with a fresh key
                        iframe.src = `${standaloneUrl}?t=${Date.now()}`;
                      }
                    }}
                    className="p-2 bg-zinc-900/80 hover:bg-zinc-900 text-white rounded-full backdrop-blur-md shadow-lg transition-all"
                    title="Mulai Ulang Chat"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                </div>

                <iframe 
                  src={standaloneUrl} 
                  className="w-full h-full border-none pt-4"
                  title="Live Preview"
                />
              </div>
              <p className="mt-6 text-xs text-zinc-400 italic">
                Tips: Interaksi di sini tidak akan disimpan ke database statistik jika Anda menggunakan mode Demo.
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
