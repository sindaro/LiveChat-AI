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

  return (
    <div className="bg-transparent w-full h-full pointer-events-auto font-sans">
      <ChatWidget
        businessId={businessProfile.id}
        businessName={businessProfile.name}
        waNumber={businessProfile.wa_number || ''}
        preFilledMsg={businessProfile.pre_filled_msg || ''}
        assistantName={businessProfile.assistant_name || undefined}
        assistantAvatarUrl={businessProfile.assistant_avatar_url || undefined}
        quickReplies={businessProfile.quick_replies || []}
        collectCustomerData={businessProfile.collect_customer_data || false}
        customerDataFields={businessProfile.customer_data_fields || ['name']}
        escalationLabel={businessProfile.escalation_label || 'Owner'}
        primaryColor={businessProfile.primary_color || undefined}
        showBranding={businessProfile.show_branding !== undefined ? businessProfile.show_branding : true}
      />
    </div>
  );
}

