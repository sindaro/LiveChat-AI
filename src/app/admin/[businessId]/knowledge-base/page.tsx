"use client";

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Trash2, FileText, Loader2, Plus, CheckCircle, Clock, Search, Pencil, RefreshCw, X } from 'lucide-react';
import { useParams } from 'next/navigation';
import AddSourceModal from '@/components/AddSourceModal';
import RichEditor from '@/components/RichEditor';

export default function KnowledgeBasePage() {
  const params = useParams();
  const businessId = params.businessId as string;
  const supabase = createClient();
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // Edit modal state
  const [editModal, setEditModal] = useState<{ open: boolean; fileName: string; title: string; content: string }>({
    open: false, fileName: '', title: '', content: ''
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editSaving, setEditSaving] = useState(false);

  // Retrain state
  const [retrainingFile, setRetrainingFile] = useState<string | null>(null);

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

  const fetchFiles = useCallback(async () => {
    if (!businessId) return;
    try {
      setLoading(true);
      const { data, error } = await supabase.storage.from('knowledge_base').list(businessId);
      if (error) throw error;
      const visibleFiles = data?.filter(file => !file.name.startsWith('.')) || [];
      setFiles(visibleFiles);
    } catch (error) {
      console.error('Error fetching files:', error);
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    if (businessId) fetchFiles();
  }, [businessId, fetchFiles]);

  const processFile = async (file: File) => {
    setUploading(true);
    setMessage('');
    try {
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`;
      const filePath = `${businessId}/${fileName}`;
      const { error: uploadError } = await supabase.storage.from('knowledge_base').upload(filePath, file);
      if (uploadError) throw uploadError;
      setMessage('File berhasil diunggah! Sedang diproses AI...');
      const response = await fetch('/api/process-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: filePath, businessId })
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to process document');
      }
      setMessage('Berhasil diproses oleh AI!');
      fetchFiles();
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error uploading/processing file:', error);
      setMessage('Gagal mengunggah atau memproses dokumen.');
    } finally {
      setUploading(false);
    }
  };

  const handleUploadFile = async (file: File) => {
    await processFile(file);
  };

  const handleSubmitText = async (title: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const safeTitle = title.trim().endsWith('.txt') ? title.trim() : `${title.trim()}.txt`;
    const file = new File([blob], safeTitle, { type: 'text/plain' });
    await processFile(file);
  };

  const handleDelete = async (fileName: string) => {
    if (!businessId) return;
    if (!confirm(`Hapus file "${getDisplayName(fileName)}"? Ini juga akan menghapus data AI yang terkait.`)) return;
    try {
      setLoading(true);
      const filePath = `${businessId}/${fileName}`;
      await supabase.from('KnowledgeDocuments').delete().eq('title', filePath);
      await supabase.storage.from('knowledge_base').remove([filePath]);
      setMessage('File dan data AI berhasil dihapus.');
      fetchFiles();
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error deleting file:', error);
      setMessage('Gagal menghapus file.');
    } finally {
      setLoading(false);
    }
  };

  // --- EDIT FUNCTIONALITY ---
  const handleOpenEdit = async (fileName: string) => {
    setEditLoading(true);
    const filePath = `${businessId}/${fileName}`;
    try {
      // Try to download file content from storage
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('knowledge_base')
        .download(filePath);

      let content = '';
      if (!downloadError && fileData) {
        content = await fileData.text();
      } else {
        // Fallback: get content from KnowledgeDocuments
        const { data: docs } = await supabase
          .from('KnowledgeDocuments')
          .select('content')
          .eq('title', filePath)
          .order('metadata->chunk_index', { ascending: true });
        if (docs && docs.length > 0) {
          content = docs.map(d => d.content).join('\n\n');
        }
      }

      setEditModal({
        open: true,
        fileName,
        title: getDisplayName(fileName),
        content,
      });
    } catch (err) {
      console.error('Error loading file for edit:', err);
      setMessage('Gagal memuat konten file.');
    } finally {
      setEditLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editModal.content.trim()) return;
    setEditSaving(true);
    try {
      const filePath = `${businessId}/${editModal.fileName}`;

      // 1. Update file in storage
      const blob = new Blob([editModal.content], { type: 'text/plain' });
      const file = new File([blob], editModal.fileName, { type: 'text/plain' });
      await supabase.storage.from('knowledge_base').update(filePath, file, { upsert: true });

      // 2. Delete old embeddings
      await supabase.from('KnowledgeDocuments').delete().eq('title', filePath);

      // 3. Re-process (re-chunk + re-embed)
      setMessage('Menyimpan perubahan & melatih ulang AI...');
      const response = await fetch('/api/process-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: filePath, businessId })
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to re-process document');
      }

      setMessage('Konten berhasil diperbarui & AI dilatih ulang!');
      setEditModal({ open: false, fileName: '', title: '', content: '' });
      fetchFiles();
      setTimeout(() => setMessage(''), 4000);
    } catch (err: any) {
      console.error('Error saving edit:', err);
      setMessage(`Gagal menyimpan: ${err.message || 'Unknown error'}`);
    } finally {
      setEditSaving(false);
    }
  };

  // --- RETRAIN FUNCTIONALITY ---
  const handleRetrain = async (fileName: string) => {
    if (!confirm(`Latih ulang "${getDisplayName(fileName)}"? Proses ini akan menghapus embedding lama dan membuat yang baru.`)) return;
    setRetrainingFile(fileName);
    try {
      const filePath = `${businessId}/${fileName}`;
      // Delete old embeddings
      await supabase.from('KnowledgeDocuments').delete().eq('title', filePath);
      setMessage('Menghapus data lama & melatih ulang AI...');

      // Re-process
      const response = await fetch('/api/process-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: filePath, businessId })
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to retrain');
      }
      setMessage('AI berhasil dilatih ulang!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      console.error('Retrain error:', err);
      setMessage(`Gagal melatih ulang: ${err.message || 'Unknown error'}`);
    } finally {
      setRetrainingFile(null);
    }
  };

  const getDisplayName = (name: string) => name.includes('_') ? name.substring(name.indexOf('_') + 1) : name;

  const getSourceType = (name: string) => {
    if (name.endsWith('.pdf')) return 'File';
    if (name.endsWith('.txt')) return 'Text';
    return 'File';
  };

  const filteredFiles = files.filter(f => getDisplayName(f.name).toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex flex-col h-full bg-zinc-50 dark:bg-zinc-950 transition-colors">
      <div className="flex-1 overflow-y-auto p-4 sm:p-8">
        <div className="max-w-5xl mx-auto space-y-6">

          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Data Sources</h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Kelola sumber pengetahuan yang digunakan AI untuk menjawab pertanyaan pelanggan.</p>
            </div>
            <button onClick={() => setShowAddModal(true)}
              className="inline-flex items-center px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors shadow-sm">
              <Plus className="h-4 w-4 mr-2" /> Add New
            </button>
          </div>

          {message && (
            <div className={`p-4 rounded-xl text-sm font-medium ${message.includes('Gagal') ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800' : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'}`}>
              {message}
            </div>
          )}

          {/* Table Card */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden transition-colors">
            {/* Search bar */}
            <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari dokumen..."
                  className="w-full pl-9 pr-4 py-2 border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 rounded-lg text-sm focus:ring-emerald-500 focus:border-emerald-500 transition-colors" />
              </div>
              <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium whitespace-nowrap">{files.length} dokumen</span>
            </div>

            {/* Table Header */}
            <div className="hidden sm:grid grid-cols-12 gap-4 px-5 py-3 bg-zinc-50 dark:bg-zinc-950/50 border-b border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              <div className="col-span-4">Name</div>
              <div className="col-span-2">Source</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-2">Last Updated</div>
              <div className="col-span-2 text-right">Actions</div>
            </div>

            {/* Table Body */}
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {loading && files.length === 0 ? (
                <div className="p-12 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-emerald-500" /></div>
              ) : filteredFiles.length === 0 ? (
                <div className="p-12 flex flex-col items-center text-center text-zinc-500 dark:text-zinc-400">
                  <FileText className="h-12 w-12 text-zinc-300 dark:text-zinc-700 mb-4" />
                  <p className="text-sm">{files.length === 0 ? 'Belum ada dokumen. Klik "Add New" untuk mulai melatih AI.' : 'Tidak ada hasil pencarian.'}</p>
                </div>
              ) : (
                filteredFiles.map((file) => (
                  <div key={file.name} className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 px-5 py-4 items-center hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors group">
                    {/* Name */}
                    <div className="sm:col-span-4 flex items-center space-x-3">
                      <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg shrink-0">
                        <FileText className="h-4 w-4" />
                      </div>
                      <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">{getDisplayName(file.name)}</span>
                    </div>
                    {/* Source Badge */}
                    <div className="sm:col-span-2">
                      <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full ${
                        getSourceType(file.name) === 'File'
                          ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400'
                          : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                      }`}>
                        {getSourceType(file.name)}
                      </span>
                    </div>
                    {/* Status */}
                    <div className="sm:col-span-2">
                      {retrainingFile === file.name ? (
                        <span className="inline-flex items-center text-xs font-medium text-amber-700 dark:text-amber-400">
                          <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> Retraining...
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-xs font-medium text-emerald-700 dark:text-emerald-400">
                          <CheckCircle className="h-3.5 w-3.5 mr-1" /> Trained
                        </span>
                      )}
                    </div>
                    {/* Date */}
                    <div className="sm:col-span-2">
                      <span className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {new Date(file.created_at).toLocaleDateString('id-ID')}
                      </span>
                    </div>
                    {/* Actions */}
                    <div className="sm:col-span-2 flex justify-end gap-1">
                      {/* Edit */}
                      <button
                        onClick={() => handleOpenEdit(file.name)}
                        disabled={editLoading}
                        className="p-2 text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors sm:opacity-0 sm:group-hover:opacity-100"
                        title="Edit konten"
                      >
                        {editLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
                      </button>
                      {/* Retrain */}
                      <button
                        onClick={() => handleRetrain(file.name)}
                        disabled={retrainingFile === file.name}
                        className="p-2 text-zinc-400 hover:text-amber-600 dark:hover:text-amber-400 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors sm:opacity-0 sm:group-hover:opacity-100"
                        title="Latih ulang AI"
                      >
                        <RefreshCw className={`h-4 w-4 ${retrainingFile === file.name ? 'animate-spin' : ''}`} />
                      </button>
                      {/* Delete */}
                      <button onClick={() => handleDelete(file.name)}
                        className="p-2 text-zinc-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors sm:opacity-0 sm:group-hover:opacity-100"
                        title="Hapus dokumen">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Add Source Modal */}
      <AddSourceModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onUploadFile={handleUploadFile}
        onSubmitText={handleSubmitText}
        uploading={uploading}
        businessId={businessId}
      />

      {/* Edit Document Modal */}
      {editModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-3xl w-full shadow-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                Edit: {editModal.title}
              </h3>
              <button onClick={() => setEditModal({ open: false, fileName: '', title: '', content: '' })}
                className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            {/* Body */}
            <div className="p-6 overflow-y-auto flex-1">
              <RichEditor
                value={editModal.content}
                onChange={(val) => setEditModal(prev => ({ ...prev, content: val }))}
                title={editModal.title}
                businessId={businessId}
                disabled={editSaving}
              />
            </div>
            {/* Footer */}
            <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-end gap-3 shrink-0">
              <button
                onClick={() => setEditModal({ open: false, fileName: '', title: '', content: '' })}
                className="px-4 py-2.5 text-sm font-medium rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={editSaving || !editModal.content.trim()}
                className="inline-flex items-center px-5 py-2.5 text-sm font-bold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
              >
                {editSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                {editSaving ? 'Menyimpan & Melatih...' : 'Simpan & Latih Ulang'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
