-- Phase J Migration: Theme Management

-- 1. Add theme_id to BusinessProfiles
ALTER TABLE "public"."BusinessProfiles" ADD COLUMN IF NOT EXISTS "theme_id" text DEFAULT 'light-blue';

-- 2. Add custom_theme to BusinessProfiles (to store custom JSON configurations)
ALTER TABLE "public"."BusinessProfiles" ADD COLUMN IF NOT EXISTS "custom_theme" jsonb;
