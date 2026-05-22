import { createClient } from '@/utils/supabase/server';
import WorkspaceHeader from '@/components/WorkspaceHeader';
import WorkspaceSidebar from '@/components/WorkspaceSidebar';
import FloatingLivePreview from '@/components/FloatingLivePreview';
import { notFound, redirect } from 'next/navigation';

export default async function BusinessLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ businessId: string }>;
}) {
  const { businessId } = await params;
  
  // Use the SSR-aware Supabase client that reads auth cookies
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  const { data: businesses, error } = await supabase
    .from('BusinessProfiles')
    .select('id, name')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false });

  if (error || !businesses || businesses.length === 0) {
    notFound();
  }

  // Verify the user actually owns the current businessId they are trying to access
  const hasAccess = businesses.some(b => b.id === businessId);
  if (!hasAccess) {
    notFound();
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden bg-zinc-50 dark:bg-zinc-950">
      <WorkspaceHeader businesses={businesses} currentBusinessId={businessId} />
      
      <div className="flex-1 flex overflow-hidden">
        {/* Left SaaS Sidebar */}
        <WorkspaceSidebar currentBusinessId={businessId} />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto focus:outline-none bg-zinc-50 dark:bg-zinc-950 relative">
          {children}
          
          {/* Global Floating Preview */}
          <FloatingLivePreview businessId={businessId} />
        </main>
      </div>
    </div>
  );
}
