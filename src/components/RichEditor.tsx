"use client";

import { useState, useRef, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import {
  Bold, Italic, Heading2, List, ListOrdered, Link2, ImagePlus,
  Sparkles, ScanSearch, Loader2, Wand2
} from 'lucide-react';

interface RichEditorProps {
  value: string;
  onChange: (value: string) => void;
  title?: string;
  businessId: string;
  disabled?: boolean;
  placeholder?: string;
}

export default function RichEditor({
  value,
  onChange,
  title = '',
  businessId,
  disabled = false,
  placeholder = 'Tuliskan konten knowledge base di sini...',
}: RichEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const supabase = createClient();
  const [uploadingImage, setUploadingImage] = useState(false);
  const [aiLoading, setAiLoading] = useState<'generate' | 'audit' | null>(null);
  const [aiResult, setAiResult] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Insert markdown syntax at cursor position
  const insertMarkdown = useCallback((before: string, after: string = '', placeholder: string = '') => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = value.substring(start, end) || placeholder;
    const newValue = value.substring(0, start) + before + selected + after + value.substring(end);
    onChange(newValue);
    // Restore cursor position after state update
    setTimeout(() => {
      ta.focus();
      const cursorPos = start + before.length + selected.length;
      ta.setSelectionRange(cursorPos, cursorPos);
    }, 0);
  }, [value, onChange]);

  // Toolbar actions
  const toolbarActions = [
    { icon: Bold, label: 'Bold', action: () => insertMarkdown('**', '**', 'teks tebal') },
    { icon: Italic, label: 'Italic', action: () => insertMarkdown('*', '*', 'teks miring') },
    { icon: Heading2, label: 'Heading', action: () => insertMarkdown('\n## ', '\n', 'Judul') },
    { icon: List, label: 'Bullet List', action: () => insertMarkdown('\n- ', '', 'item') },
    { icon: ListOrdered, label: 'Numbered List', action: () => insertMarkdown('\n1. ', '', 'item') },
    {
      icon: Link2, label: 'Link', action: () => {
        const url = prompt('Masukkan URL:');
        if (url) insertMarkdown('[', `](${url})`, 'teks link');
      }
    },
  ];

  // Image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !businessId) return;
    setUploadingImage(true);
    try {
      const ext = file.name.split('.').pop();
      const fileName = `${businessId}/kb_${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('brand_assets').upload(fileName, file, { upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from('brand_assets').getPublicUrl(fileName);
      insertMarkdown(`\n![Gambar](${urlData.publicUrl})\n`, '', '');
    } catch (err: any) {
      console.error('Image upload error:', err);
      alert('Gagal mengunggah gambar: ' + (err.message || 'Unknown error'));
    } finally {
      setUploadingImage(false);
      if (e.target) e.target.value = '';
    }
  };

  // AI Suggest / Audit
  const handleAiAction = async (action: 'generate' | 'audit') => {
    setAiLoading(action);
    setAiResult(null);
    try {
      const response = await fetch('/api/ai-suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content: value, businessId, action }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'AI request failed');
      }
      const data = await response.json();
      setAiResult(data.suggestion);
    } catch (err: any) {
      console.error('AI action error:', err);
      setAiResult(`❌ Error: ${err.message}`);
    } finally {
      setAiLoading(null);
    }
  };

  // Insert AI suggestion into editor
  const insertAiSuggestion = () => {
    if (aiResult && !aiResult.startsWith('❌')) {
      if (value.trim()) {
        onChange(value + '\n\n' + aiResult);
      } else {
        onChange(aiResult);
      }
      setAiResult(null);
    }
  };

  return (
    <div className="space-y-2">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-2 bg-zinc-50 dark:bg-zinc-950/50 rounded-xl border border-zinc-200 dark:border-zinc-800">
        {/* Format buttons */}
        {toolbarActions.map((action, idx) => (
          <button
            key={idx}
            type="button"
            onClick={action.action}
            disabled={disabled}
            title={action.label}
            className="p-2 rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors disabled:opacity-40"
          >
            <action.icon className="h-4 w-4" />
          </button>
        ))}

        {/* Image upload */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || uploadingImage}
          title="Sisipkan Gambar"
          className="p-2 rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors disabled:opacity-40"
        >
          {uploadingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
        </button>
        <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleImageUpload} />

        {/* Divider */}
        <div className="w-px h-6 bg-zinc-300 dark:bg-zinc-700 mx-1" />

        {/* AI Generate */}
        <button
          type="button"
          onClick={() => handleAiAction('generate')}
          disabled={disabled || !!aiLoading || !title.trim()}
          title="Saran AI — Generate outline konten berdasarkan judul"
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-900/40 transition-colors disabled:opacity-40 border border-violet-200 dark:border-violet-700/50"
        >
          {aiLoading === 'generate' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          Saran AI
        </button>

        {/* AI Audit */}
        <button
          type="button"
          onClick={() => handleAiAction('audit')}
          disabled={disabled || !!aiLoading || !value.trim()}
          title="Audit Konten — AI periksa kelengkapan informasi"
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors disabled:opacity-40 border border-amber-200 dark:border-amber-700/50"
        >
          {aiLoading === 'audit' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ScanSearch className="h-3.5 w-3.5" />}
          Audit Konten
        </button>
      </div>

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        rows={14}
        className="block w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm p-4 text-zinc-900 dark:text-zinc-100 transition-colors font-mono leading-relaxed resize-y min-h-[200px]"
      />

      {/* AI Result Panel */}
      {aiResult && (
        <div className={`p-4 rounded-xl border text-sm animate-in fade-in slide-in-from-top-2 duration-300 ${
          aiResult.startsWith('❌')
            ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400'
            : 'bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-violet-950/30 dark:to-indigo-950/30 border-violet-200 dark:border-violet-700/50'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-bold text-violet-800 dark:text-violet-300 flex items-center gap-1.5">
              <Wand2 className="h-4 w-4" />
              {aiResult.startsWith('❌') ? 'Error' : 'Rekomendasi AI'}
            </h4>
            <div className="flex gap-2">
              {!aiResult.startsWith('❌') && (
                <button
                  type="button"
                  onClick={insertAiSuggestion}
                  className="px-3 py-1 text-xs font-bold rounded-lg bg-violet-600 text-white hover:bg-violet-700 transition-colors"
                >
                  Sisipkan ke Editor
                </button>
              )}
              <button
                type="button"
                onClick={() => setAiResult(null)}
                className="px-3 py-1 text-xs font-medium rounded-lg bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
          <div className="whitespace-pre-wrap text-zinc-700 dark:text-zinc-300 text-[13px] leading-relaxed max-h-[300px] overflow-y-auto">
            {aiResult}
          </div>
        </div>
      )}
    </div>
  );
}
