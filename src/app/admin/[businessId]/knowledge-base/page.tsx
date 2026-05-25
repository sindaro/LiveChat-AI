"use client";

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Trash2, FileText, Loader2, Plus, CheckCircle, Clock, Search, RefreshCw, X, Globe, Type, AlertCircle } from 'lucide-react';
import { useParams } from 'next/navigation';
import AddSourceModal from '@/components/AddSourceModal';

export default function KnowledgeBasePage() {
  const params = useParams();
  const businessId = params.businessId as string;
  const supabase = createClient();
  const [sources, setSources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [testQuery, setTestQuery] = useState('');
  const [testResults, setTestResults] = useState<any[]>([]);
  const [testingKnowledge, setTestingKnowledge] = useState(false);

  // Edit modal state (Only for FAQ/Manual text)
  const [editModal, setEditModal] = useState<{ open: boolean; sourceId: string; title: string; content: string }>({
    open: false, sourceId: '', title: '', content: ''
  });
  const [editSaving, setEditSaving] = useState(false);
  const [retrainingId, setRetrainingId] = useState<string | null>(null);

  useEffect(() => {
    async function checkAccess() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        await supabase.from('BusinessProfiles').select('id').eq('id', businessId).eq('owner_id', user.id).single();
      } catch (err) {
        console.error('Error verifying business access:', err);
      }
    }
    checkAccess();
  }, [businessId, supabase]);

  const fetchSources = useCallback(async () => {
    if (!businessId) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('KnowledgeSources')
        .select('*')
        .eq('business_id', businessId)
        .order('priority', { ascending: true })
        .order('created_at', { ascending: false });
      
      if (error) {
        // If table doesn't exist, ignore (migration not run yet)
        if (error.code !== '42P01') throw error;
      } else {
        setSources(data || []);
      }
    } catch (error) {
      console.error('Error fetching sources:', error);
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    if (businessId) fetchSources();
  }, [businessId, fetchSources]);

  const processSource = async (sourceId: string, customMessage = 'Berhasil diproses oleh AI!') => {
    try {
      const response = await fetch('/api/process-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId, businessId })
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to process document');
      }
      setMessage(customMessage);
      fetchSources();
      setTimeout(() => setMessage(''), 3000);
    } catch (error: any) {
      console.error('Error processing file:', error);
      setMessage(`Gagal memproses: ${error.message}`);
      await supabase.from('KnowledgeSources').update({ status: 'failed' }).eq('id', sourceId);
      fetchSources();
    } finally {
      setUploading(false);
      setRetrainingId(null);
    }
  };

  const handleUploadFile = async (file: File) => {
    setUploading(true);
    setMessage('');
    try {
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`;
      const filePath = `${businessId}/${fileName}`;
      
      // Upload to storage
      const { error: uploadError } = await supabase.storage.from('knowledge_base').upload(filePath, file);
      if (uploadError) throw uploadError;

      // Create Source Record
      const { data: source, error: insertError } = await supabase.from('KnowledgeSources').insert({
        business_id: businessId,
        type: 'document',
        title: file.name,
        url: filePath,
        priority: 3,
        status: 'pending'
      }).select().single();

      if (insertError) throw insertError;

      setMessage('File berhasil diunggah! Sedang memproses AI...');
      await processSource(source.id);
    } catch (err: any) {
      console.error(err);
      setMessage('Gagal mengunggah file.');
      setUploading(false);
    }
  };

  const handleSubmitText = async (title: string, content: string) => {
    setUploading(true);
    setMessage('');
    try {
      const blob = new Blob([content], { type: 'text/plain' });
      const safeTitle = title.trim().endsWith('.txt') ? title.trim() : `${title.trim()}.txt`;
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${safeTitle}`;
      const filePath = `${businessId}/${fileName}`;
      
      const file = new File([blob], safeTitle, { type: 'text/plain' });
      const { error: uploadError } = await supabase.storage.from('knowledge_base').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: source, error: insertError } = await supabase.from('KnowledgeSources').insert({
        business_id: businessId,
        type: 'faq',
        title: title.trim(),
        url: filePath,
        priority: 1, // FAQ Priority High
        status: 'pending'
      }).select().single();

      if (insertError) throw insertError;

      setMessage('Teks berhasil disimpan! Sedang memproses AI...');
      await processSource(source.id);
    } catch (err: any) {
      console.error(err);
      setMessage('Gagal menyimpan teks.');
      setUploading(false);
    }
  };

  const handleWebsiteSubmit = async (url: string) => {
    setUploading(true);
    setMessage('');
    try {
      const { data: source, error: insertError } = await supabase.from('KnowledgeSources').insert({
        business_id: businessId,
        type: 'website',
        title: url,
        url: url,
        priority: 4, // Website Priority Low
        status: 'pending'
      }).select().single();

      if (insertError) throw insertError;

      setMessage('URL Website ditambahkan! AI sedang membaca website...');
      await processSource(source.id);
    } catch (err: any) {
      console.error(err);
      setMessage('Gagal menambahkan URL website.');
      setUploading(false);
    }
  }

  const handleDelete = async (id: string, url: string, type: string) => {
    if (!confirm(`Hapus sumber pengetahuan ini? Ini juga akan menghapus data AI yang terkait.`)) return;
    try {
      setLoading(true);
      
      // Delete from storage if it's a document/faq
      if ((type === 'document' || type === 'faq') && url) {
         await supabase.storage.from('knowledge_base').remove([url]);
      }
      
      // Delete Source (cascade will delete chunks)
      await supabase.from('KnowledgeSources').delete().eq('id', id);
      
      setMessage('Sumber pengetahuan berhasil dihapus.');
      fetchSources();
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error deleting:', error);
      setMessage('Gagal menghapus.');
    } finally {
      setLoading(false);
    }
  };

  const handleRetrain = async (id: string) => {
    if (!confirm(`Latih ulang data ini? Proses ini akan mengambil data terbaru (scrape ulang / baca file ulang) dan melatih ulang AI.`)) return;
    setRetrainingId(id);
    setMessage('Memulai proses training ulang...');
    await processSource(id, 'AI berhasil dilatih ulang!');
  };

  const handleTestKnowledge = async () => {
    if (!testQuery.trim()) return;
    setTestingKnowledge(true);
    setTestResults([]);
    try {
      // Create embedding for test query
      const embedRes = await fetch('/api/test-embedding', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: testQuery, businessId })
      });

      if (!embedRes.ok) throw new Error("Failed to get embedding");
      const { embedding } = await embedRes.json();

      // Call RPC match_knowledge_documents
      const { data, error } = await supabase.rpc('match_knowledge_documents', {
        query_embedding: embedding,
        match_count: 3,
        filter_business_id: businessId
      });

      if (error) throw error;
      setTestResults(data || []);
    } catch (e: any) {
        console.error("Test error:", e);
        alert("Gagal melakukan test pencarian.");
    } finally {
        setTestingKnowledge(false);
    }
  };

  const filteredSources = sources.filter(s => s.title.toLowerCase().includes(search.toLowerCase()));

  const getTypeColor = (type: string) => {
    switch(type) {
        case 'faq': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800';
        case 'website': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800';
        default: return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
    }
  };

  const getTypeIcon = (type: string) => {
      switch(type) {
          case 'faq': return <Type className="w-3.5 h-3.5 mr-1" />;
          case 'website': return <Globe className="w-3.5 h-3.5 mr-1" />;
          default: return <FileText className="w-3.5 h-3.5 mr-1" />;
      }
  }

  const formatTimeAgo = (dateString: string) => {
      if (!dateString) return '';
      const date = new Date(dateString);
      const now = new Date();
      const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
      
      if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
      const diffInMinutes = Math.floor(diffInSeconds / 60);
      if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
      const diffInHours = Math.floor(diffInMinutes / 60);
      if (diffInHours < 24) return `${diffInHours}h ago`;
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d ago`;
  };

  return (
    <div className="flex flex-col h-full bg-zinc-50 dark:bg-zinc-950 transition-colors">
      <div className="flex-1 overflow-y-auto p-4 sm:p-8">
        <div className="max-w-5xl mx-auto space-y-6">

          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Knowledge Base AI</h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Kelola sumber pengetahuan yang digunakan AI untuk menjawab pertanyaan pelanggan.</p>
            </div>
            <div className="flex items-center gap-3">
                <button onClick={() => setShowTestModal(true)}
                  className="inline-flex items-center px-4 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800 text-sm font-bold rounded-xl hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors shadow-sm">
                  Test Knowledge
                </button>
                <button onClick={() => setShowAddModal(true)}
                  className="inline-flex items-center px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-bold rounded-xl hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors shadow-sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Tambah Sumber
                </button>
            </div>
          </div>

          {message && (
            <div className={`p-4 rounded-xl flex items-center gap-3 text-sm font-medium border ${
              message.includes('Gagal') 
                ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/30'
                : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/30'
            }`}>
              {message.includes('Gagal') ? <AlertCircle className="h-5 w-5" /> : <CheckCircle className="h-5 w-5" />}
              {message}
            </div>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <input type="text" placeholder="Cari sumber pengetahuan..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm focus:ring-emerald-500 focus:border-emerald-500 dark:text-zinc-100 transition-colors" />
          </div>

          {/* List */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
            {loading ? (
              <div className="flex justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
              </div>
            ) : filteredSources.length === 0 ? (
              <div className="text-center p-12">
                <FileText className="h-12 w-12 text-zinc-300 dark:text-zinc-700 mx-auto mb-4" />
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Belum ada sumber pengetahuan</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">AI Anda belum memiliki memori. Tambahkan website, FAQ, atau PDF agar AI bisa menjawab dengan akurat.</p>
                <button onClick={() => setShowAddModal(true)} className="mt-4 inline-flex items-center text-sm font-bold text-emerald-600 hover:text-emerald-700">
                  <Plus className="h-4 w-4 mr-1" /> Tambah Sekarang
                </button>
              </div>
            ) : (
              <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {filteredSources.map((source) => (
                  <li key={source.id} className="p-4 sm:p-5 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-zinc-500">
                        {getTypeIcon(source.type)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 line-clamp-1">{source.title}</h4>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${getTypeColor(source.type)}`}>
                                {source.type}
                            </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                          <span className="flex items-center gap-1">
                            {source.status === 'ready' ? (
                                <><CheckCircle className="w-3 h-3 text-emerald-500" /> Trained</>
                            ) : source.status === 'failed' ? (
                                <><AlertCircle className="w-3 h-3 text-red-500" /> Failed</>
                            ) : (
                                <><Loader2 className="w-3 h-3 text-amber-500 animate-spin" /> Processing...</>
                            )}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {source.status === 'ready' ? `Last trained ${formatTimeAgo(source.updated_at)}` : `Added ${formatTimeAgo(source.created_at)}`}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <button onClick={() => handleRetrain(source.id)} disabled={retrainingId === source.id || source.status === 'processing'}
                        className="p-2 text-zinc-500 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-900/20 dark:hover:text-emerald-400 rounded-lg transition-colors flex items-center justify-center disabled:opacity-50"
                        title="Latih Ulang (Retrain)">
                        <RefreshCw className={`w-4 h-4 ${retrainingId === source.id ? 'animate-spin' : ''}`} />
                      </button>
                      <button onClick={() => handleDelete(source.id, source.url, source.type)} disabled={retrainingId === source.id}
                        className="p-2 text-zinc-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400 rounded-lg transition-colors flex items-center justify-center"
                        title="Hapus">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <AddSourceModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onUploadFile={handleUploadFile}
        onSubmitText={handleSubmitText}
        onSubmitWebsite={handleWebsiteSubmit}
        uploading={uploading}
        businessId={businessId}
      />

      {showTestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
                    <div>
                        <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Test AI Knowledge</h3>
                        <p className="text-xs text-zinc-500 mt-1">Cek apakah AI dapat menemukan konteks dari Knowledge Base Anda.</p>
                    </div>
                    <button onClick={() => setShowTestModal(false)} className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>
                <div className="p-6 overflow-y-auto flex-1">
                    <div className="flex gap-2 mb-6">
                        <input type="text" value={testQuery} onChange={e => setTestQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleTestKnowledge()}
                            placeholder="Ketik pertanyaan simulasi user..." className="flex-1 p-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-sm" />
                        <button onClick={handleTestKnowledge} disabled={testingKnowledge || !testQuery.trim()} className="px-5 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-sm disabled:opacity-50">
                            {testingKnowledge ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Test'}
                        </button>
                    </div>

                    {testResults.length > 0 && (
                        <div className="space-y-4">
                            <p className="text-xs font-bold text-zinc-500 uppercase">Top {testResults.length} Retrieve Results (RAG)</p>
                            {testResults.map((res, i) => (
                                <div key={i} className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                                    <div className="flex justify-between items-center mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{res.title}</span>
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getTypeColor(res.source_type)}`}>{res.source_type} (Pri: {res.priority})</span>
                                        </div>
                                        <span className={`text-xs font-bold ${res.similarity > 0.7 ? 'text-emerald-500' : res.similarity > 0.5 ? 'text-amber-500' : 'text-red-500'}`}>
                                            Conf: {(res.similarity * 100).toFixed(1)}%
                                        </span>
                                    </div>
                                    <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-3 leading-relaxed">{res.content}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}
    </div>
  );
}
