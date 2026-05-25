-- =============================================
-- PHASE 4 MIGRATION: Knowledge Sources + Human Takeover
-- Jalankan di Supabase SQL Editor:
-- https://supabase.com/dashboard/project/xupbnhioklwandgtbmvr/sql/new
-- =============================================

-- 1. Create KnowledgeSources table (if not exists)
CREATE TABLE IF NOT EXISTS "public"."KnowledgeSources" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "business_id" uuid NOT NULL REFERENCES "public"."BusinessProfiles"("id") ON DELETE CASCADE,
    "type" text NOT NULL, -- 'faq', 'website', 'document'
    "title" text NOT NULL,
    "url" text,
    "status" text DEFAULT 'pending', -- 'pending', 'processing', 'ready', 'failed'
    "priority" integer DEFAULT 3, -- 1=FAQ, 2=Manual, 3=Document, 4=Website
    "metadata" jsonb DEFAULT '{}'::jsonb,
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now(),
    PRIMARY KEY ("id")
);

-- RLS for KnowledgeSources
ALTER TABLE "public"."KnowledgeSources" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first (safe to re-run)
DROP POLICY IF EXISTS "Users can read own KnowledgeSources" ON "public"."KnowledgeSources";
DROP POLICY IF EXISTS "Users can insert own KnowledgeSources" ON "public"."KnowledgeSources";
DROP POLICY IF EXISTS "Users can update own KnowledgeSources" ON "public"."KnowledgeSources";
DROP POLICY IF EXISTS "Users can delete own KnowledgeSources" ON "public"."KnowledgeSources";

CREATE POLICY "Users can read own KnowledgeSources" 
ON "public"."KnowledgeSources" FOR SELECT 
TO authenticated 
USING (
  "business_id" IN (
    SELECT id FROM "public"."BusinessProfiles" WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "Users can insert own KnowledgeSources" 
ON "public"."KnowledgeSources" FOR INSERT 
TO authenticated 
WITH CHECK (
  "business_id" IN (
    SELECT id FROM "public"."BusinessProfiles" WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "Users can update own KnowledgeSources" 
ON "public"."KnowledgeSources" FOR UPDATE 
TO authenticated 
USING (
  "business_id" IN (
    SELECT id FROM "public"."BusinessProfiles" WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "Users can delete own KnowledgeSources" 
ON "public"."KnowledgeSources" FOR DELETE 
TO authenticated 
USING (
  "business_id" IN (
    SELECT id FROM "public"."BusinessProfiles" WHERE owner_id = auth.uid()
  )
);

-- 2. Add source_id to KnowledgeDocuments (if not exists)
ALTER TABLE "public"."KnowledgeDocuments" 
ADD COLUMN IF NOT EXISTS "source_id" uuid REFERENCES "public"."KnowledgeSources"("id") ON DELETE CASCADE;

-- 3. Add status column to Conversations for Human Takeover (if not exists)
ALTER TABLE "public"."Conversations" 
ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'ai_handling';
-- Values: 'ai_handling', 'human_takeover', 'resolved'

-- 4. Recreate match_knowledge_documents to include priority + source_type
DROP FUNCTION IF EXISTS match_knowledge_documents(vector, integer, uuid);

CREATE OR REPLACE FUNCTION match_knowledge_documents(
  query_embedding vector(768),
  match_count int DEFAULT 5,
  filter_business_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  title text,
  content text,
  similarity float,
  priority integer,
  source_type text
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    kd.id,
    kd.title,
    kd.content,
    1 - (kd.embedding <=> query_embedding) AS similarity,
    COALESCE(ks.priority, 3) as priority,
    COALESCE(ks.type, 'document') as source_type
  FROM
    "public"."KnowledgeDocuments" kd
  LEFT JOIN 
    "public"."KnowledgeSources" ks ON kd.source_id = ks.id
  WHERE
    kd.business_id = filter_business_id
  ORDER BY
    kd.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 5. Allow service_role to access KnowledgeSources (for API server-side operations)
CREATE POLICY IF NOT EXISTS "Service role can access KnowledgeSources"
ON "public"."KnowledgeSources"
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Done!
SELECT 'Phase 4 migration completed successfully!' as status;
