import ChatInterface from '@/components/ChatInterface';
import { supabase } from '@/lib/supabase';
import { notFound } from 'next/navigation';

interface ChatPageProps {
  params: Promise<{
    businessId: string;
  }>;
  searchParams: Promise<{
    preview?: string;
  }>;
}

export default async function ChatPage({ params, searchParams }: ChatPageProps) {
  const { businessId } = await params;
  const { preview } = await searchParams;
  const isPreview = preview === 'true';

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-indigo-50 flex items-start md:items-center justify-center p-0 md:p-6 font-sans relative overflow-hidden">
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

