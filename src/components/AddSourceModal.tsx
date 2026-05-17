"use client";

import { useState } from 'react';
import { X, FileUp, Type, Globe, Loader2 } from 'lucide-react';
import RichEditor from './RichEditor';

interface AddSourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadFile: (file: File) => Promise<void>;
  onSubmitText: (title: string, content: string) => Promise<void>;
  uploading: boolean;
  businessId: string;
}

export default function AddSourceModal({ isOpen, onClose, onUploadFile, onSubmitText, uploading, businessId }: AddSourceModalProps) {
  const [step, setStep] = useState<'choose' | 'file' | 'text' | 'website'>('choose');
  const [manualTitle, setManualTitle] = useState('');
  const [manualText, setManualText] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [isScraping, setIsScraping] = useState(false);

  if (!isOpen) return null;

  const handleClose = () => {
    setStep('choose');
    setManualTitle('');
    setManualText('');
    setWebsiteUrl('');
    setIsScraping(false);
    onClose();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    await onUploadFile(e.target.files[0]);
    e.target.value = '';
    handleClose();
  };

  const handleTextSubmit = async () => {
    if (!manualTitle.trim() || !manualText.trim()) return;
    await onSubmitText(manualTitle, manualText);
    handleClose();
  };

  const handleWebsiteSubmit = async () => {
    if (!websiteUrl.trim()) return;
    setIsScraping(true);
    try {
      const response = await fetch('/api/scrape-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: websiteUrl, businessId }),
      });
      
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Gagal mengambil data website');
      }
      
      const data = await response.json();
      
      // After scraping, we have the file path. Now process it.
      const processRes = await fetch('/api/process-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: data.fileName, businessId })
      });

      if (!processRes.ok) throw new Error('Gagal melatih AI dengan data website');

      handleClose();
    } catch (err: any) {
      console.error('Scraping error:', err);
      alert(err.message || 'Terjadi kesalahan saat scraping');
    } finally {
      setIsScraping(false);
    }
  };

  const sources = [
    { id: 'file', icon: FileUp, title: 'Files', desc: 'Upload PDF atau TXT', color: 'emerald' },
    { id: 'text', icon: Type, title: 'Editor', desc: 'Tulis dengan Rich Editor', color: 'blue' },
    { id: 'website', icon: Globe, title: 'Website', desc: 'Scrape halaman web', color: 'purple' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className={`bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden transition-all ${
        step === 'text' ? 'max-w-3xl w-full' : 'max-w-lg w-full'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            {step !== 'choose' && (
              <button onClick={() => setStep('choose')} className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 font-medium">
                ← Kembali
              </button>
            )}
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              {step === 'choose' ? 'Train Your Chatbot' : step === 'file' ? 'Upload File' : step === 'text' ? 'Rich Text Editor' : 'Website Scraper'}
            </h3>
          </div>
          <button onClick={handleClose} className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {step === 'choose' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {sources.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setStep(s.id as any)}
                  className="flex flex-col items-center p-5 rounded-xl border-2 border-zinc-200 dark:border-zinc-800 hover:border-emerald-400 dark:hover:border-emerald-600 hover:shadow-md cursor-pointer transition-all text-center"
                >
                  <div className={`p-3 rounded-xl mb-3 ${
                    s.color === 'emerald' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' :
                    s.color === 'blue' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' :
                    'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                  }`}>
                    <s.icon className="h-6 w-6" />
                  </div>
                  <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{s.title}</span>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{s.desc}</span>
                </button>
              ))}
            </div>
          )}

          {step === 'file' && (
            <div className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl p-10 text-center relative hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
              <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" accept=".pdf,.txt" onChange={handleFileChange} disabled={uploading} />
              {uploading ? (
                <div className="flex flex-col items-center">
                  <Loader2 className="h-10 w-10 text-emerald-500 animate-spin mb-3" />
                  <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Mengunggah & Memproses...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <FileUp className="h-10 w-10 text-zinc-400 mb-3" />
                  <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Klik atau seret file ke sini</p>
                  <p className="text-xs text-zinc-500 mt-1">PDF, TXT</p>
                </div>
              )}
            </div>
          )}

          {step === 'website' && (
            <div className="space-y-4">
              <div className="p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800 rounded-xl">
                <p className="text-xs text-purple-700 dark:text-purple-400 leading-relaxed">
                  AI kami akan memindai halaman web tersebut, membersihkan teks yang tidak perlu, dan mengekstrak informasi penting secara otomatis.
                </p>
              </div>
              <div>
                <label className="block text-sm font-bold text-zinc-900 dark:text-zinc-300 mb-1.5">Website URL</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                    <input 
                      type="url" 
                      value={websiteUrl} 
                      onChange={(e) => setWebsiteUrl(e.target.value)} 
                      disabled={isScraping}
                      className="block w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-sm text-zinc-900 dark:text-zinc-100 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                      placeholder="https://toko-anda.com/faq" 
                    />
                  </div>
                  <button 
                    onClick={handleWebsiteSubmit} 
                    disabled={isScraping || !websiteUrl.trim()}
                    className="inline-flex items-center px-5 py-2.5 rounded-xl bg-purple-600 text-white text-sm font-bold hover:bg-purple-700 disabled:opacity-50 transition-colors shadow-sm"
                  >
                    {isScraping ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                    {isScraping ? 'Scraping...' : 'Fetch'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 'text' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-zinc-900 dark:text-zinc-300 mb-1.5">Judul Dokumen</label>
                <input type="text" value={manualTitle} onChange={(e) => setManualTitle(e.target.value)} disabled={uploading}
                  className="block w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm p-3 text-zinc-900 dark:text-zinc-100 transition-colors"
                  placeholder="Contoh: FAQ Produk, Katalog Harga, Kebijakan Retur" />
              </div>
              <div>
                <label className="block text-sm font-bold text-zinc-900 dark:text-zinc-300 mb-1.5">Konten</label>
                <RichEditor
                  value={manualText}
                  onChange={setManualText}
                  title={manualTitle}
                  businessId={businessId}
                  disabled={uploading}
                  placeholder="Gunakan toolbar di atas untuk formatting. Klik 'Saran AI' untuk generate outline otomatis."
                />
              </div>
              <div className="flex justify-end">
                <button onClick={handleTextSubmit} disabled={uploading || !manualTitle.trim() || !manualText.trim()}
                  className="inline-flex items-center rounded-xl bg-emerald-600 py-2.5 px-5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors">
                  {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Type className="h-4 w-4 mr-2" />}
                  {uploading ? 'Memproses...' : 'Simpan & Proses'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
