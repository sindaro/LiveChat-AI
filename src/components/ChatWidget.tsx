"use client";

import { useState, useEffect } from 'react';
import { MessageSquare, X } from 'lucide-react';
import ChatInterface from './ChatInterface';

interface ChatWidgetProps {
  businessId: string;
  businessName: string;
  waNumber: string;
  preFilledMsg: string;
  isDemo?: boolean;
  // Phase F props
  assistantName?: string;
  assistantAvatarUrl?: string;
  quickReplies?: string[];
  collectCustomerData?: boolean;
  customerDataFields?: string[];
  escalationLabel?: string;
  primaryColor?: string;
  showBranding?: boolean;
  themeId?: string;
  customThemeConfig?: any;
}

export default function ChatWidget({
  businessId,
  businessName,
  waNumber,
  preFilledMsg,
  isDemo = false,
  assistantName,
  assistantAvatarUrl,
  quickReplies,
  collectCustomerData,
  customerDataFields,
  escalationLabel,
  primaryColor,
  showBranding,
  themeId,
  customThemeConfig,
}: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const displayName = assistantName || businessName;
  const [triggerMessage, setTriggerMessage] = useState(`Halo! Saya ${displayName} dari ${businessName}. Ada yang bisa saya bantu hari ini?`);
  const [hasTriggered, setHasTriggered] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const checkCampaign = async () => {
      try {
        const pathname = window.location.pathname;
        const res = await fetch(`/api/campaigns?businessId=${businessId}&pathname=${encodeURIComponent(pathname)}`);
        
        if (res.ok) {
          const data = await res.json();
          if (data.rule) {
            setTriggerMessage(data.rule.trigger_message);
            // Trigger auto open tooltip after delay
            timeoutId = setTimeout(() => {
              if (!hasTriggered && !isOpen) {
                setShowTooltip(true);
                setHasTriggered(true);
              }
            }, data.rule.time_delay_sec * 1000);
          }
        }
      } catch (error) {
        console.error('Failed to check campaign', error);
      }
    };

    checkCampaign();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [businessId, businessName, hasTriggered, isOpen]);

  const toggleOpen = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setShowTooltip(false);
      setHasTriggered(true);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 flex flex-col items-end">
      
      {/* Tooltip for proactive engage */}
      {!isOpen && showTooltip && (
        <div className="mb-4 bg-white p-4 rounded-xl shadow-lg border border-gray-100 animate-in slide-in-from-bottom-2 fade-in relative max-w-[250px] cursor-pointer" onClick={toggleOpen}>
          <div className="text-sm text-gray-800 font-medium pr-4">{triggerMessage}</div>
          <div className="absolute -bottom-2 right-6 w-4 h-4 bg-white border-b border-r border-gray-100 transform rotate-45"></div>
          <button 
            onClick={(e) => { e.stopPropagation(); setShowTooltip(false); }}
            className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Chat Popover */}
      {isOpen && (
        <div className="mb-4 w-[calc(100vw-2rem)] sm:w-[400px] h-[75vh] sm:h-[650px] max-h-[800px] bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-8 fade-in zoom-in-95 duration-300 origin-bottom-right border border-gray-100/50">
          <ChatInterface
            businessId={businessId}
            businessName={businessName}
            waNumber={waNumber}
            preFilledMsg={preFilledMsg}
            isWidget={true}
            initialMessage={triggerMessage}
            isDemo={isDemo}
            assistantName={assistantName}
            assistantAvatarUrl={assistantAvatarUrl}
            quickReplies={quickReplies}
            collectCustomerData={collectCustomerData}
            customerDataFields={customerDataFields}
            escalationLabel={escalationLabel}
            primaryColor={primaryColor}
            showBranding={showBranding}
            themeId={themeId}
            customThemeConfig={customThemeConfig}
          />
        </div>
      )}

      {/* FAB (Floating Action Button) */}
      <button
        onClick={toggleOpen}
        className={`relative flex items-center justify-center w-[60px] h-[60px] rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-all duration-300 hover:scale-105 active:scale-95 group overflow-hidden ${
          isOpen ? 'bg-white text-gray-800' : ''
        }`}
        aria-label={isOpen ? "Tutup obrolan" : "Mulai obrolan"}
      >
        {/* Dynamic Color Background for FAB */}
        {!isOpen && (
          <div 
            style={{ backgroundColor: primaryColor || '#4f46e5' }}
            className="absolute inset-0 w-full h-full transition-transform duration-500 group-hover:scale-110 group-hover:rotate-12"
          ></div>
        )}
        
        {/* Border / Shine Effect */}
        <div className="absolute inset-0 rounded-full border border-white/20"></div>

        {isOpen ? (
          <X className="w-6 h-6 animate-in spin-in-90 duration-300 relative z-10 text-gray-600" />
        ) : (
          <MessageSquare className="w-6 h-6 animate-in spin-in-90 duration-300 text-white relative z-10 drop-shadow-md fill-white/20" />
        )}
        
        {/* Pulse Effect for CTA */}
        {!isOpen && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 z-20">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 border-2 border-white"></span>
          </span>
        )}
      </button>
    </div>
  );
}
