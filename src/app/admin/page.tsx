"use client";

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import { createClient } from '@/utils/supabase/client';
import { Bot, Plus, Loader2, ArrowRight, MessageSquare, BarChart2, LogOut } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function BusinessHub() {
  const supabase = createClient();
  const router = useRouter();
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [convCounts, setConvCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchBusinesses();
  }, []);

  async function fetchBusinesses() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/login');
        return;
      }
      setUserId(user.id);

      const { data, error } = await supabase
        .from('BusinessProfiles')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      const biz = data || [];
      setBusinesses(biz);

      // Fetch conversation counts for each business
      if (biz.length > 0) {
        const counts: Record<string, number> = {};
        await Promise.all(biz.map(async (b: any) => {
          const { count } = await supabase
            .from('Conversations')
            .select('id', { count: 'exact', head: true })
            .eq('business_id', b.id);
          counts[b.id] = count || 0;
        }));
        setConvCounts(counts);
      }
    } catch (error) {
      console.error('Error fetching businesses:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleCreateBusiness = async () => {
    if (!userId) return;
    try {
      setCreating(true);
      const { data, error } = await supabase
        .from('BusinessProfiles')
        .insert([{
          owner_id: userId,
          name: 'Bot Baru (Belum Dikonfigurasi)',
          wa_number: '',
          pre_filled_msg: '',
          prompt_rules: '',
          api_keys: [],
        }])
        .select()
        .single();

      if (error) throw error;
      if (data) {
        router.push(`/admin/${data.id}/profile`);
      }
    } catch (error) {
      console.error('Error creating business:', error);
      alert('Gagal membuat bot bisnis baru.');
      setCreating(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  return (
    <div className="flex flex-col h-full w-full flex-1 overflow-y-auto">
      <Header title="Agency Hub" />
      
      <div className="p-4 sm:p-8 max-w-7xl mx-auto w-full">
        <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div>
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Klien & Bot Anda</h2>
            <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
              Kelola berbagai asisten AI untuk klien atau lini bisnis Anda dari satu dasbor pusat.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleLogout}
              className="inline-flex items-center px-4 py-2.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl text-sm font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Keluar
            </button>
            <button
              onClick={handleCreateBusiness}
              disabled={creating}
              className="inline-flex items-center px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50"
            >
              {creating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
              Buat Bot Baru
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-emerald-500" />
          </div>
        ) : businesses.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-12 text-center shadow-sm">
            <Bot className="h-16 w-16 text-zinc-300 dark:text-zinc-700 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">Belum ada Bot</h3>
            <p className="text-zinc-500 dark:text-zinc-400 mb-6 max-w-sm mx-auto">
              Anda belum membuat asisten AI. Klik tombol di bawah untuk membuat bot pertama Anda.
            </p>
            <button
              onClick={handleCreateBusiness}
              disabled={creating}
              className="inline-flex items-center px-6 py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl text-sm font-bold hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
            >
              {creating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
              Buat Bot Pertama
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {businesses.map((business) => (
              <div
                key={business.id}
                className="group bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-xl hover:border-emerald-300 dark:hover:border-emerald-700/50 transition-all flex flex-col"
              >
                <div className="p-6 flex-1">
                  {/* Bot avatar + status badge */}
                  <div className="flex items-start justify-between mb-5">
                    <div className="h-12 w-12 bg-gradient-to-br from-emerald-400 to-emerald-600 text-white rounded-2xl flex items-center justify-center shadow-md shadow-emerald-500/20">
                      <Bot className="h-6 w-6" />
                    </div>
                    {business.api_keys && business.api_keys.length > 0 ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                        ● Live
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20">
                        Setup Needed
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-1 truncate">
                    {business.name}
                  </h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 truncate mb-4">
                    WA: {business.wa_number || 'Belum diatur'}
                  </p>
                  
                  {/* Stats Row */}
                  <div className="flex items-center gap-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                    <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                      <MessageSquare className="h-3.5 w-3.5" />
                      <span className="font-semibold text-zinc-700 dark:text-zinc-300">{convCounts[business.id] ?? '—'}</span> percakapan
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                      <BarChart2 className="h-3.5 w-3.5" />
                      <span>{new Date(business.updated_at || business.created_at).toLocaleDateString('id-ID')}</span>
                    </div>
                  </div>
                </div>
                
                <div className="border-t border-zinc-100 dark:border-zinc-800 p-4 bg-zinc-50 dark:bg-zinc-950/50 rounded-b-3xl mt-auto flex gap-2">
                  <Link 
                    href={`/admin/${business.id}/preview`}
                    className="flex-1 flex items-center justify-between text-sm font-bold text-zinc-900 dark:text-zinc-100 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors group"
                  >
                    Buka Dashboard
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
