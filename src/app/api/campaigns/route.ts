import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const businessId = searchParams.get('businessId');
    const pathname = searchParams.get('pathname');

    if (!businessId) {
      return NextResponse.json({ error: 'businessId is required' }, { status: 400 });
    }

    const { data: rules, error } = await supabaseAdmin
      .from('CampaignRules')
      .select('*')
      .eq('business_id', businessId)
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching campaigns:', error);
      return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 });
    }

    if (!rules || rules.length === 0) {
      return NextResponse.json({ rule: null });
    }

    // Match rules based on pathname
    const matchedRule = rules.find(rule => {
      const target = rule.url_target || '/';
      if (target === pathname) return true;
      if (target.endsWith('/*')) {
        const basePath = target.slice(0, -2);
        if (pathname?.startsWith(basePath)) return true;
      }
      return false;
    });

    return NextResponse.json({ rule: matchedRule || null });
  } catch (error: any) {
    console.error('Campaign API error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
