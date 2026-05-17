import ChatInterface from '@/components/ChatInterface';
import { supabase } from '@/lib/supabase';
import { notFound } from 'next/navigation';

interface ChatPageProps {
  params: Promise<{
    businessId: string;
  }>;
}

export default async function ChatPage({ params }: ChatPageProps) {
  const { businessId } = await params;

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-indigo-50 flex items-center justify-center p-0 md:p-6 font-sans relative overflow-hidden">
      {/* Decorative background blurs for standalone page */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-400 opacity-10 blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-500 opacity-10 blur-[100px] pointer-events-none"></div>
      
      <div className="relative z-10 w-full h-full flex items-center justify-center">
        <ChatInterface
          businessId={businessProfile.id}
          businessName={businessProfile.name}
          waNumber={businessProfile.wa_number || ''}
          preFilledMsg={businessProfile.pre_filled_msg || ''}
          isWidget={false}
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
    </div>
  );
}

