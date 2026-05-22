"use client";

import { useState } from 'react';
import { MessageCircle, X, RefreshCw } from 'lucide-react';

interface FloatingLivePreviewProps {
  businessId: string;
}

export default function FloatingLivePreview({ businessId }: FloatingLivePreviewProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [key, setKey] = useState(0); // Used to force reload the iframe

  const getBaseUrl = () => {
    if (typeof window !== 'undefined') {
      return window.location.origin;
    }
    return '';
  };

  const standaloneUrl = businessId ? `${getBaseUrl()}/chat/${businessId}?preview=true` : '';

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 h-14 px-6 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full shadow-2xl flex items-center space-x-3 transition-transform hover:scale-105 z-50"
        >
          <MessageCircle className="h-5 w-5" />
          <span className="font-semibold text-sm">Live Preview</span>
        </button>
      )}

      {/* Floating Widget */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-[380px] h-[650px] max-h-[85vh] bg-white dark:bg-zinc-950 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col overflow-hidden z-50 animate-in slide-in-from-bottom-8 fade-in duration-300">
          {/* Widget Header */}
          <div className="h-14 bg-zinc-900 flex items-center justify-between px-4 shrink-0">
            <span className="text-white font-medium text-sm flex items-center">
              <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse" />
              Live Preview
            </span>
            <div className="flex items-center space-x-2">
              <button 
                onClick={() => setKey(prev => prev + 1)}
                className="p-1.5 text-zinc-400 hover:text-white rounded-md transition-colors"
                title="Restart Chat"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-white rounded-md transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
          
          {/* Widget Content (Iframe) */}
          <div className="flex-1 bg-zinc-50 dark:bg-zinc-900 relative">
            <iframe
              key={key}
              src={standaloneUrl}
              className="w-full h-full border-none"
              title="Live Preview"
            />
          </div>
        </div>
      )}
    </>
  );
}
