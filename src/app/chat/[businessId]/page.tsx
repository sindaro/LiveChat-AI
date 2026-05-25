import ChatInterface from '@/components/ChatInterface';
import { supabase } from '@/lib/supabase';
import { notFound } from 'next/navigation';

interface ChatPageProps {
  params: Promise<{
    businessId: string;
  }>;
  searchParams: Promise<{
    preview?: string;
    mode?: string;
  }>;
}

export default async function ChatPage({ params, searchParams }: ChatPageProps) {
  const { businessId } = await params;
  const { preview, mode } = await searchParams;
  const isPreview = preview === 'true';
  const isFullScreen = mode === 'fullscreen';

  // Server-side fetch business profile
  // Fetch columns individually to avoid crashing if some are missing
  const { data: businessProfile, error } = await supabase
    .from('BusinessProfiles')
    .select('*')
    .eq('id', businessId)
    .single();

  if (error || !businessProfile) {
    console.error('Failed to load business profile for chat:', error);
    notFound();
  }

  const branding = businessProfile.branding || {};
  const chatFlow = businessProfile.chat_flow || {};
  const cta = businessProfile.cta_settings || {};
  const handover = businessProfile.handover_settings || {};

  if (isFullScreen) {
    const showSidebar = branding.show_sidebar !== false;
    return (
      <div className="flex w-full h-screen bg-gray-50 dark:bg-zinc-950 overflow-hidden font-sans">
        {/* Main Chat Area */}
        <div className="flex-1 flex justify-center items-center h-full relative">
          <ChatInterface
            businessId={businessProfile.id}
            businessName={businessProfile.name}
            waNumber={businessProfile.wa_number || ''}
            preFilledMsg={handover.pre_filled_msg || businessProfile.pre_filled_msg || ''}
            isWidget={false}
            isFullScreen={true}
            assistantName={businessProfile.assistant_name || branding.assistant_name || businessProfile.name}
            assistantAvatarUrl={businessProfile.assistant_avatar_url || branding.logo_url || undefined}
            quickReplies={chatFlow.quick_replies || businessProfile.quick_replies || []}
            collectCustomerData={cta.capture_name || cta.capture_phone || businessProfile.collect_customer_data}
            customerDataFields={businessProfile.customer_data_fields || [...(cta.capture_name ? ['name'] : []), ...(cta.capture_phone ? ['phone'] : [])]}
            escalationLabel={handover.escalation_label || businessProfile.escalation_label || 'Owner'}
            primaryColor={businessProfile.primary_color || branding.primary_color || '#059669'}
            showBranding={businessProfile.show_branding !== false}
            themeId={businessProfile.theme_id}
            customThemeConfig={businessProfile.custom_theme}
          />
        </div>
        
        {/* Optional Sidebar for Full Page Experience */}
        {showSidebar && (
          <div className="hidden lg:flex w-80 xl:w-96 bg-white dark:bg-zinc-900 border-l border-gray-200 dark:border-zinc-800 flex-col h-full overflow-y-auto">
            <div className="p-6 border-b border-gray-100 dark:border-zinc-800">
              {branding.logo_url ? (
                <img src={branding.logo_url} alt={businessProfile.name} className="h-12 w-auto object-contain mb-4" />
              ) : (
                <div 
                  className="w-12 h-12 rounded-xl mb-4 flex items-center justify-center text-white font-bold text-xl"
                  style={{ backgroundColor: businessProfile.primary_color || branding.primary_color || '#059669' }}
                >
                  {businessProfile.name.charAt(0)}
                </div>
              )}
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{businessProfile.name}</h2>
              <p className="text-sm text-gray-500 mt-1">Layanan Bantuan Pelanggan</p>
            </div>
            
            <div className="p-6 flex-1 space-y-6">
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Tentang Kami</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                  Kami siap membantu menjawab pertanyaan Anda, memberikan informasi produk, dan memandu Anda menuju solusi terbaik.
                </p>
              </div>
              
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Jam Operasional</h3>
                <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                  <div className="flex justify-between">
                    <span>Senin - Jumat</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">09:00 - 17:00</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Sabtu</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">09:00 - 14:00</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Minggu</span>
                    <span className="text-gray-400">Tutup</span>
                  </div>
                </div>
              </div>
              
              <div className="pt-6 border-t border-gray-100 dark:border-zinc-800">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Powered By</h3>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-indigo-600 flex items-center justify-center text-white font-bold text-[10px]">
                    LA
                  </div>
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">LiveChat AI</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-gradient-to-br from-slate-100 via-white to-indigo-50 flex items-start md:items-center justify-center p-0 md:p-6 font-sans relative overflow-hidden">
      {/* Decorative background blurs for standalone page */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-400 opacity-10 blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-500 opacity-10 blur-[100px] pointer-events-none"></div>
      
      <div className="relative z-10 w-full h-full flex items-start md:items-center justify-center">
        <ChatInterface
          businessId={businessProfile.id}
          businessName={businessProfile.name}
          waNumber={businessProfile.wa_number || ''}
          preFilledMsg={handover.pre_filled_msg || businessProfile.pre_filled_msg || ''}
          isWidget={isPreview}
          assistantName={businessProfile.assistant_name || branding.assistant_name || businessProfile.name}
          assistantAvatarUrl={businessProfile.assistant_avatar_url || branding.logo_url || undefined}
          quickReplies={chatFlow.quick_replies || businessProfile.quick_replies || []}
          collectCustomerData={cta.capture_name || cta.capture_phone || businessProfile.collect_customer_data}
          customerDataFields={businessProfile.customer_data_fields || [...(cta.capture_name ? ['name'] : []), ...(cta.capture_phone ? ['phone'] : [])]}
          escalationLabel={handover.escalation_label || businessProfile.escalation_label || 'Owner'}
          primaryColor={businessProfile.primary_color || branding.primary_color || '#059669'}
          showBranding={businessProfile.show_branding !== false}
        />
      </div>
    </div>
  );
}

