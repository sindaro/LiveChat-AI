-- =============================================
-- Phase G Migration: Add Branding fields to BusinessProfiles
-- Run this in Supabase SQL Editor for your Production Environment
-- =============================================

ALTER TABLE "public"."BusinessProfiles" ADD COLUMN IF NOT EXISTS "primary_color" text DEFAULT '#059669';
ALTER TABLE "public"."BusinessProfiles" ADD COLUMN IF NOT EXISTS "show_branding" boolean DEFAULT true;
