"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Loader2, Search, Contact, Flame, CheckCircle, Clock, MoreVertical, ShieldCheck, Mail, Phone } from 'lucide-react';
import { useParams } from 'next/navigation';

export default function LeadsPage() {
  const params = useParams();
  const businessId = params.businessId as string;
  const supabase = createClient();
  
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchLeads();
  }, [businessId]);

  async function fetchLeads() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('Leads')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });
        
      if (error) {
        // If Leads table doesn't exist yet, just mock or fail silently
        console.error('Error fetching leads:', error);
      }
      
      if (data) {
        setLeads(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const filteredLeads = leads.filter(lead => {
    const term = search.toLowerCase();
    const matchesSearch = 
      (lead.name && lead.name.toLowerCase().includes(term)) ||
      (lead.wa_number && lead.wa_number.toLowerCase().includes(term)) ||
      (lead.email && lead.email.toLowerCase().includes(term));
      
    if (filter === 'hot') return lead.priority === 'hot' && matchesSearch;
    if (filter === 'new') return lead.status === 'new' && matchesSearch;
    if (filter === 'contacted') return lead.status === 'contacted' && matchesSearch;
    return matchesSearch;
  });

  return (
    <div className="flex flex-col h-full bg-zinc-50 dark:bg-zinc-950 transition-colors">
      <div className="flex-1 overflow-y-auto p-4 sm:p-8">
        <div className="max-w-6xl mx-auto space-y-6">

          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                <Contact className="h-6 w-6 text-emerald-500" /> Lead Management
              </h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Daftar calon pelanggan (leads) yang berhasil dikumpulkan oleh AI.</p>
            </div>
          </div>

          {/* Table Card */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden transition-colors">
            {/* Search & Filters */}
            <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="relative w-full sm:max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari nama, WhatsApp, email..."
                  className="w-full pl-9 pr-4 py-2 border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 rounded-lg text-sm focus:ring-emerald-500 focus:border-emerald-500 transition-colors" />
              </div>
              <div className="flex space-x-1 w-full sm:w-auto overflow-x-auto no-scrollbar pb-1 sm:pb-0">
                {[
                  { id: 'all', label: 'Semua' },
                  { id: 'new', label: 'Baru' },
                  { id: 'hot', label: '🔥 Hot' },
                  { id: 'contacted', label: 'Dihubungi' }
                ].map(f => (
                  <button key={f.id} onClick={() => setFilter(f.id)}
                    className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${filter === f.id ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Table Header */}
            <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3 bg-zinc-50 dark:bg-zinc-950/50 border-b border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              <div className="col-span-3">Customer</div>
              <div className="col-span-3">Kontak</div>
              <div className="col-span-2">Prioritas & Status</div>
              <div className="col-span-2">Tags</div>
              <div className="col-span-2 text-right">Waktu</div>
            </div>

            {/* Table Body */}
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {loading ? (
                <div className="p-12 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-emerald-500" /></div>
              ) : filteredLeads.length === 0 ? (
                <div className="p-12 flex flex-col items-center text-center text-zinc-500 dark:text-zinc-400">
                  <Contact className="h-12 w-12 text-zinc-300 dark:text-zinc-700 mb-4" />
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-1">Belum ada Lead</p>
                  <p className="text-xs">AI akan otomatis mengumpulkan data customer berdasarkan pengaturan CTA.</p>
                </div>
              ) : (
                filteredLeads.map((lead) => (
                  <div key={lead.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 px-5 py-4 items-center hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors group">
                    {/* Name */}
                    <div className="md:col-span-3 flex items-center space-x-3">
                      <div className="h-9 w-9 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-sm shrink-0">
                        {lead.name ? lead.name.charAt(0).toUpperCase() : '?'}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">{lead.name || 'Tanpa Nama'}</div>
                        <div className="text-xs text-zinc-500 truncate mt-0.5">ID: {lead.id.split('-')[0]}</div>
                      </div>
                    </div>
                    
                    {/* Contact Info */}
                    <div className="md:col-span-3 space-y-1">
                      {lead.wa_number && (
                        <div className="flex items-center text-xs text-zinc-700 dark:text-zinc-300">
                          <Phone className="h-3 w-3 mr-1.5 text-zinc-400" /> {lead.wa_number}
                        </div>
                      )}
                      {lead.email && (
                        <div className="flex items-center text-xs text-zinc-700 dark:text-zinc-300 truncate">
                          <Mail className="h-3 w-3 mr-1.5 text-zinc-400" /> {lead.email}
                        </div>
                      )}
                      {!lead.wa_number && !lead.email && <span className="text-xs text-zinc-400 italic">Tidak ada kontak</span>}
                    </div>

                    {/* Priority & Status */}
                    <div className="md:col-span-2 flex flex-col items-start gap-1.5">
                      {lead.priority === 'hot' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400 uppercase">
                          <Flame className="h-3 w-3 mr-1" /> Hot
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 uppercase">
                          Normal
                        </span>
                      )}
                      
                      {lead.status === 'new' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                          Baru
                        </span>
                      )}
                      {lead.status === 'contacted' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                          <CheckCircle className="h-3 w-3 mr-1" /> Followed Up
                        </span>
                      )}
                    </div>

                    {/* Tags */}
                    <div className="md:col-span-2 flex flex-wrap gap-1">
                      {lead.tags && lead.tags.length > 0 ? (
                        lead.tags.map((tag: string, idx: number) => (
                          <span key={idx} className="inline-block px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 text-[10px] text-zinc-600 dark:text-zinc-400">
                            #{tag}
                          </span>
                        ))
                      ) : (
                        <span className="text-[10px] text-zinc-400 italic">-</span>
                      )}
                    </div>

                    {/* Date & Actions */}
                    <div className="md:col-span-2 flex items-center justify-between md:justify-end">
                      <span className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {new Date(lead.created_at).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' })}
                      </span>
                      <button className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 rounded ml-2">
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
