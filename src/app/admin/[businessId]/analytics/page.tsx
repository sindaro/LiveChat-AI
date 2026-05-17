"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { 
  BarChart3, Users, MessageSquare, TrendingUp, 
  FileText, Loader2, Calendar, ArrowUpRight 
} from 'lucide-react';
import { useParams } from 'next/navigation';

export default function AnalyticsPage() {
  const params = useParams();
  const businessId = params.businessId as string;
  const supabase = createClient();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        setLoading(true);
        const res = await fetch(`/api/analytics?businessId=${businessId}`);
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (err) {
        console.error('Failed to fetch analytics:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchAnalytics();
  }, [businessId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  const stats = [
    { label: 'Total Conversations', value: data?.summary.totalChats, icon: MessageSquare, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    { label: 'Qualified Leads', value: data?.summary.qualifiedLeads, icon: Users, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20' },
    { label: 'Conversion Rate', value: data?.summary.conversionRate, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
    { label: 'Knowledge Assets', value: data?.summary.totalDocs, icon: FileText, color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-900/20' },
  ];

  return (
    <div className="flex flex-col h-full bg-zinc-50 dark:bg-zinc-950 transition-colors">
      <div className="flex-1 overflow-y-auto p-4 sm:p-8">
        <div className="max-w-6xl mx-auto space-y-8">
          
          <div className="flex justify-between items-end">
            <div>
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Analytics</h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Pantau performa asisten AI Anda dalam menangkap prospek.</p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-medium text-zinc-600 dark:text-zinc-400">
              <Calendar className="h-3.5 w-3.5" />
              7 Hari Terakhir
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat, i) => (
              <div key={i} className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm transition-all hover:shadow-md">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-2.5 rounded-xl ${stat.bg} ${stat.color}`}>
                    <stat.icon className="h-5 w-5" />
                  </div>
                  <div className="flex items-center text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded-full uppercase tracking-wider">
                    <ArrowUpRight className="h-2.5 w-2.5 mr-0.5" /> Live
                  </div>
                </div>
                <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">{stat.label}</p>
                <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mt-1">{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Chart Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-emerald-500" /> Tren Aktivitas Chat
                </h3>
                <div className="flex gap-4">
                  <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
                    <span className="w-2.5 h-2.5 rounded-full bg-zinc-200 dark:bg-zinc-700"></span> Total Chat
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Qualified
                  </div>
                </div>
              </div>
              
              <div className="h-64 flex items-end justify-between gap-2 px-2">
                {data?.charts.chatsByDay.map((day: any, i: number) => {
                  const maxVal = Math.max(...data.charts.chatsByDay.map((d: any) => d.count), 5);
                  const totalHeight = (day.count / maxVal) * 100;
                  const qualHeight = day.count > 0 ? (day.qualified / day.count) * totalHeight : 0;
                  
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center group relative">
                      <div className="w-full max-w-[40px] bg-zinc-100 dark:bg-zinc-800 rounded-t-lg relative overflow-hidden transition-all hover:bg-zinc-200 dark:hover:bg-zinc-700" style={{ height: `${totalHeight}%` }}>
                        <div className="absolute bottom-0 left-0 right-0 bg-emerald-500 transition-all group-hover:bg-emerald-400" style={{ height: `${(day.qualified / Math.max(day.count, 1)) * 100}%` }}></div>
                      </div>
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-600 mt-3 font-medium uppercase">
                        {new Date(day.day).toLocaleDateString('id-ID', { weekday: 'short' })}
                      </span>
                      
                      {/* Tooltip */}
                      <div className="absolute bottom-full mb-2 bg-zinc-900 text-white text-[10px] p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-xl whitespace-nowrap">
                        <p className="font-bold border-b border-white/10 pb-1 mb-1">{day.day}</p>
                        <p>Total: {day.count}</p>
                        <p className="text-emerald-400">Qualified: {day.qualified}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top Keywords / Insights Placeholder */}
            <div className="bg-gradient-to-br from-emerald-600 to-teal-700 p-8 rounded-2xl text-white shadow-lg relative overflow-hidden flex flex-col justify-center">
              <div className="absolute top-0 right-0 -mr-12 -mt-12 w-48 h-48 rounded-full bg-white opacity-10 blur-3xl"></div>
              <div className="relative z-10">
                <BarChart3 className="h-10 w-10 mb-6 opacity-80" />
                <h3 className="text-xl font-bold mb-3">AI Insights</h3>
                <p className="text-emerald-50 text-sm leading-relaxed mb-6 opacity-90">
                  Sistem AI Anda mendeteksi bahwa sebagian besar pengunjung menanyakan tentang <strong>Kebijakan Pengembalian</strong>.
                </p>
                <div className="p-4 bg-white/10 backdrop-blur-md rounded-xl border border-white/20">
                  <p className="text-xs font-bold uppercase tracking-wider mb-2 opacity-80">Rekomendasi:</p>
                  <p className="text-[13px]">Tambahkan detail garansi di Knowledge Base untuk meningkatkan skor kualifikasi hingga 15%.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Leads Table */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                <Users className="h-4 w-4 text-orange-500" /> Prospek Terkini
              </h3>
              <a href={`/admin/${businessId}/conversations`} className="text-[11px] font-bold text-emerald-600 hover:underline uppercase tracking-wider">
                Lihat Semua
              </a>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50 dark:bg-zinc-950/50">
                    <th className="px-6 py-3 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Waktu</th>
                    <th className="px-6 py-3 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Ringkasan Prospek</th>
                    <th className="px-6 py-3 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {(!data?.recentLeads || data.recentLeads.length === 0) ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-12 text-center text-sm text-zinc-500 italic">Belum ada prospek terverifikasi.</td>
                    </tr>
                  ) : (
                    data?.recentLeads.map((lead: any) => (
                      <tr key={lead.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                        <td className="px-6 py-4 text-[13px] text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                          {new Date(lead.created_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-[13px] text-zinc-900 dark:text-zinc-100 line-clamp-1">
                            {lead.lead_summary || 'Tidak ada ringkasan'}
                          </p>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <a 
                            href={`/admin/${businessId}/conversations`}
                            className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors"
                          >
                            Detail <ArrowUpRight className="h-3 w-3" />
                          </a>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
