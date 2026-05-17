import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const businessId = searchParams.get('businessId');

    if (!businessId) {
      return NextResponse.json({ error: 'businessId is required' }, { status: 400 });
    }

    // 1. Fetch all conversations for this business
    const { data: conversations, error: convError } = await supabaseAdmin
      .from('Conversations')
      .select('id, is_qualified, created_at')
      .eq('business_id', businessId);

    if (convError) throw convError;

    // 2. Fetch Knowledge Base stats
    const { count: docCount, error: docError } = await supabaseAdmin
      .from('KnowledgeDocuments')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', businessId);

    if (docError) throw docError;

    // 3. Process analytics
    const totalChats = conversations?.length || 0;
    const qualifiedLeads = conversations?.filter(c => c.is_qualified).length || 0;
    const conversionRate = totalChats > 0 ? (qualifiedLeads / totalChats) * 100 : 0;

    // 4. Group by day for the chart (last 7 days)
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    }).reverse();

    const chatsByDay = last7Days.map(day => {
      const count = conversations?.filter(c => c.created_at.startsWith(day)).length || 0;
      const qualified = conversations?.filter(c => c.created_at.startsWith(day) && c.is_qualified).length || 0;
      return { day, count, qualified };
    });

    // 5. Fetch latest 5 qualified leads for the table
    const { data: recentLeads, error: leadsError } = await supabaseAdmin
      .from('Conversations')
      .select('id, lead_summary, created_at')
      .eq('business_id', businessId)
      .eq('is_qualified', true)
      .order('created_at', { ascending: false })
      .limit(5);

    return NextResponse.json({
      summary: {
        totalChats,
        qualifiedLeads,
        conversionRate: conversionRate.toFixed(1) + '%',
        totalDocs: docCount || 0
      },
      charts: {
        chatsByDay
      },
      recentLeads: recentLeads || []
    });

  } catch (error: any) {
    console.error('Analytics error:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
