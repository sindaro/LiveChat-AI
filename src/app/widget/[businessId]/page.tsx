import ChatWidget from '@/components/ChatWidget';
import { supabase } from '@/lib/supabase';
import { notFound } from 'next/navigation';

interface WidgetPageProps {
  params: Promise<{
    businessId: string;
  }>;
}

export default async function WidgetPage({ params }: WidgetPageProps) {
  const { businessId } = await params;

  // Server-side fetch business profile
  const { data: businessProfile, error } = await supabase
    .from('BusinessProfiles')
    .select('*')
    .eq('id', businessId)
    .single();

  if (error || !businessProfile) {
    console.error('Failed to load business profile for widget:', error);
    notFound();
  }

  const branding = businessProfile.branding || {};
  const chatFlow = businessProfile.chat_flow || {};
  const cta = businessProfile.cta_settings || {};
  const handover = businessProfile.handover_settings || {};

  return (
    <div className="bg-transparent w-full h-full pointer-events-auto font-sans">
      <ChatWidget
        businessId={businessProfile.id}
        businessName={businessProfile.name}
        waNumber={businessProfile.wa_number || ''}
        preFilledMsg={handover.pre_filled_msg || ''}
        assistantName={branding.assistant_name || businessProfile.name}
        assistantAvatarUrl={branding.logo_url || undefined}
        quickReplies={chatFlow.quick_replies || []}
        collectCustomerData={cta.capture_name || cta.capture_phone}
        customerDataFields={[...(cta.capture_name ? ['name'] : []), ...(cta.capture_phone ? ['phone'] : [])]}
        escalationLabel={handover.escalation_label || 'Owner'}
        primaryColor={branding.primary_color || '#059669'}
        showBranding={branding.show_branding !== false}
        themeId={businessProfile.theme_id}
        customThemeConfig={businessProfile.custom_theme}
      />
    </div>
  );
}

