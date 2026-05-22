-- =============================================
-- Phase H Migration: Universal Settings Architecture
-- Adds JSONB columns for advanced AI & Chat configuration
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/xupbnhioklwandgtbmvr/sql/new
-- =============================================

-- Add JSONB columns for new settings architecture
ALTER TABLE "public"."BusinessProfiles" ADD COLUMN IF NOT EXISTS "general_settings" jsonb DEFAULT '{}'::jsonb;
ALTER TABLE "public"."BusinessProfiles" ADD COLUMN IF NOT EXISTS "ai_personality" jsonb DEFAULT '{"mode": "professional", "formality": 3, "emoji_level": 2}'::jsonb;
ALTER TABLE "public"."BusinessProfiles" ADD COLUMN IF NOT EXISTS "chat_flow" jsonb DEFAULT '{"rules": []}'::jsonb;
ALTER TABLE "public"."BusinessProfiles" ADD COLUMN IF NOT EXISTS "cta_settings" jsonb DEFAULT '{"mode": "soft", "capture_name": true, "capture_phone": true}'::jsonb;
ALTER TABLE "public"."BusinessProfiles" ADD COLUMN IF NOT EXISTS "embed_settings" jsonb DEFAULT '{"position": "right", "auto_open_delay": 0}'::jsonb;
ALTER TABLE "public"."BusinessProfiles" ADD COLUMN IF NOT EXISTS "automation_settings" jsonb DEFAULT '{"welcome_enabled": true, "follow_up_enabled": false}'::jsonb;
ALTER TABLE "public"."BusinessProfiles" ADD COLUMN IF NOT EXISTS "handover_settings" jsonb DEFAULT '{"target": "admin", "keywords": ["komplain", "marah", "admin", "refund"]}'::jsonb;
ALTER TABLE "public"."BusinessProfiles" ADD COLUMN IF NOT EXISTS "prompt_studio" jsonb DEFAULT '{"custom_prompt": "", "system_instructions": ""}'::jsonb;

-- New Table for Smart Inbox / Lead Management
CREATE TABLE IF NOT EXISTS "public"."Leads" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "business_id" uuid NOT NULL REFERENCES "public"."BusinessProfiles"("id") ON DELETE CASCADE,
    "conversation_id" uuid NOT NULL REFERENCES "public"."Conversations"("id") ON DELETE CASCADE,
    "name" text,
    "phone" text,
    "email" text,
    "status" text DEFAULT 'New Lead',
    "priority" text DEFAULT 'medium',
    "assigned_to" text,
    "ai_summary" text,
    "score" integer DEFAULT 0,
    "tags" jsonb DEFAULT '[]'::jsonb,
    "notes" text,
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now(),
    PRIMARY KEY ("id")
);

-- Enable RLS for Leads
ALTER TABLE "public"."Leads" ENABLE ROW LEVEL SECURITY;

-- Leads policies
CREATE POLICY "Users can read own business leads" 
ON "public"."Leads" FOR SELECT 
TO authenticated 
USING (
  "business_id" IN (
    SELECT id FROM "public"."BusinessProfiles" WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "Users can insert own business leads" 
ON "public"."Leads" FOR INSERT 
TO authenticated 
WITH CHECK (
  "business_id" IN (
    SELECT id FROM "public"."BusinessProfiles" WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "Users can update own business leads" 
ON "public"."Leads" FOR UPDATE 
TO authenticated 
USING (
  "business_id" IN (
    SELECT id FROM "public"."BusinessProfiles" WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "Users can delete own business leads" 
ON "public"."Leads" FOR DELETE 
TO authenticated 
USING (
  "business_id" IN (
    SELECT id FROM "public"."BusinessProfiles" WHERE owner_id = auth.uid()
  )
);

-- Trigger for updated_at on Leads
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_leads_updated_at ON "public"."Leads";
CREATE TRIGGER update_leads_updated_at
    BEFORE UPDATE ON "public"."Leads"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
