-- =============================================
-- Phase F Migration: Chatbot Identity & Conversation Flow
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/xupbnhioklwandgtbmvr/sql/new
-- =============================================

-- 1. Add new columns to BusinessProfiles
ALTER TABLE "public"."BusinessProfiles" ADD COLUMN IF NOT EXISTS "assistant_name" text DEFAULT 'Asisten AI';
ALTER TABLE "public"."BusinessProfiles" ADD COLUMN IF NOT EXISTS "assistant_avatar_url" text;
ALTER TABLE "public"."BusinessProfiles" ADD COLUMN IF NOT EXISTS "quick_replies" jsonb DEFAULT '[]'::jsonb;
ALTER TABLE "public"."BusinessProfiles" ADD COLUMN IF NOT EXISTS "collect_customer_data" boolean DEFAULT false;
ALTER TABLE "public"."BusinessProfiles" ADD COLUMN IF NOT EXISTS "customer_data_fields" jsonb DEFAULT '["name"]'::jsonb;
ALTER TABLE "public"."BusinessProfiles" ADD COLUMN IF NOT EXISTS "escalation_label" text DEFAULT 'Owner';
ALTER TABLE "public"."BusinessProfiles" ADD COLUMN IF NOT EXISTS "updated_at" timestamptz DEFAULT now();

-- 2. Storage policies for brand_assets bucket (bucket already created via API)
CREATE POLICY "Allow public read of brand_assets" ON storage.objects FOR SELECT TO public USING (bucket_id = 'brand_assets');
CREATE POLICY "Allow authenticated uploads to brand_assets" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'brand_assets');
CREATE POLICY "Allow authenticated deletion from brand_assets" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'brand_assets');
