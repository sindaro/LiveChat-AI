-- Enable the pgvector extension to work with embedding vectors
create extension if not exists vector;

-- Drop existing tables if they exist to allow a clean migration for Phase 2
drop table if exists "public"."CampaignRules" cascade;
drop table if exists "public"."KnowledgeDocuments" cascade;
drop table if exists "public"."Conversations" cascade;
drop table if exists "public"."BusinessProfiles" cascade;

-- Create BusinessProfiles table
create table "public"."BusinessProfiles" (
  "id" uuid primary key default gen_random_uuid(),
  "owner_id" uuid references auth.users(id) on delete cascade,
  "name" text not null,
  "wa_number" text,
  "pre_filled_msg" text,
  "prompt_rules" text,
  "api_keys" jsonb default '[]'::jsonb,
  -- Phase F: Chatbot Identity & Conversation Flow
  "assistant_name" text default 'Asisten AI',
  "assistant_avatar_url" text,
  "quick_replies" jsonb default '[]'::jsonb,
  "collect_customer_data" boolean default false,
  "customer_data_fields" jsonb default '["name"]'::jsonb,
   "escalation_label" text default 'Owner',
+  "primary_color" text default '#059669',
+  "show_branding" boolean default true,
   "updated_at" timestamp with time zone default timezone('utc'::text, now()),
   "created_at" timestamp with time zone default timezone('utc'::text, now()) not null
 );

-- Create Conversations table
create table "public"."Conversations" (
  "id" uuid primary key default gen_random_uuid(),
  "business_id" uuid references "public"."BusinessProfiles"("id") on delete cascade,
  "owner_id" uuid references auth.users(id) on delete cascade,
  "user_id" text, -- A session ID or identifier for the end user
  "status" text default 'active',
  "is_qualified" boolean default false,
  "lead_summary" text,
  "logs" jsonb default '[]'::jsonb,
  "created_at" timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create KnowledgeDocuments table for RAG
create table "public"."KnowledgeDocuments" (
  "id" uuid primary key default gen_random_uuid(),
  "business_id" uuid references "public"."BusinessProfiles"("id") on delete cascade,
  "owner_id" uuid references auth.users(id) on delete cascade,
  "title" text not null,
  "content" text not null,
  "embedding" vector(768), -- Dimensions: 768 (gemini-embedding-001 with outputDimensionality=768)
  "metadata" jsonb default '{}'::jsonb,
  "created_at" timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create CampaignRules table
create table "public"."CampaignRules" (
  "id" uuid primary key default gen_random_uuid(),
  "business_id" uuid references "public"."BusinessProfiles"("id") on delete cascade,
  "owner_id" uuid references auth.users(id) on delete cascade,
  "url_target" text not null,
  "time_delay_sec" integer default 5,
  "trigger_message" text not null,
  "is_active" boolean default true,
  "created_at" timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create indexes
create index idx_knowledge_documents_embedding on "public"."KnowledgeDocuments" using hnsw ("embedding" vector_cosine_ops);
create index idx_business_owner on "public"."BusinessProfiles"("owner_id");
create index idx_conversations_owner on "public"."Conversations"("owner_id");
create index idx_knowledge_owner on "public"."KnowledgeDocuments"("owner_id");
create index idx_campaign_owner on "public"."CampaignRules"("owner_id");

-- Create a function to search for documents based on cosine similarity
create or replace function match_knowledge_documents (
  query_embedding vector(768),
  match_count int default null,
  filter_business_id uuid default null
) returns table (
  id uuid,
  business_id uuid,
  title text,
  content text,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    "KnowledgeDocuments".id,
    "KnowledgeDocuments".business_id,
    "KnowledgeDocuments".title,
    "KnowledgeDocuments".content,
    1 - ("KnowledgeDocuments".embedding <=> query_embedding) as similarity
  from "public"."KnowledgeDocuments"
  where filter_business_id is null or "KnowledgeDocuments".business_id = filter_business_id
  order by "KnowledgeDocuments".embedding <=> query_embedding
  limit match_count;
end;
$$;

-- Create a storage bucket for knowledge base files
insert into storage.buckets (id, name, public)
values ('knowledge_base', 'knowledge_base', false)
on conflict (id) do nothing;

-- Phase F: Brand assets bucket (public, for avatars)
insert into storage.buckets (id, name, public)
values ('brand_assets', 'brand_assets', true)
on conflict (id) do nothing;

-- RLS for Storage (Clean up existing policies)
drop policy if exists "Allow public uploads to knowledge_base" on storage.objects;
drop policy if exists "Allow public access to knowledge_base" on storage.objects;
drop policy if exists "Allow public deletion from knowledge_base" on storage.objects;

create policy "Allow authenticated uploads to knowledge_base"
on storage.objects for insert to authenticated with check ( bucket_id = 'knowledge_base' );

create policy "Allow public access to knowledge_base"
on storage.objects for select to public using ( bucket_id = 'knowledge_base' );

create policy "Allow authenticated deletion from knowledge_base"
on storage.objects for delete to authenticated using ( bucket_id = 'knowledge_base' );

-- Set up RLS for tables
alter table "public"."BusinessProfiles" enable row level security;
alter table "public"."Conversations" enable row level security;
alter table "public"."KnowledgeDocuments" enable row level security;
alter table "public"."CampaignRules" enable row level security;

-- Policies for BusinessProfiles
create policy "Users can view their own profile" on "public"."BusinessProfiles" for select using ( auth.uid() = owner_id );
create policy "Users can insert their own profile" on "public"."BusinessProfiles" for insert with check ( auth.uid() = owner_id );
create policy "Users can update their own profile" on "public"."BusinessProfiles" for update using ( auth.uid() = owner_id );
create policy "Users can delete their own profile" on "public"."BusinessProfiles" for delete using ( auth.uid() = owner_id );
create policy "Public can view business profiles" on "public"."BusinessProfiles" for select to public using ( true );

-- Policies for Conversations
create policy "Users can view their own conversations" on "public"."Conversations" for select using ( auth.uid() = owner_id );
create policy "Users can manage their own conversations" on "public"."Conversations" for all using ( auth.uid() = owner_id );
create policy "Public can insert conversations" on "public"."Conversations" for insert to public with check ( true );
create policy "Public can update conversations" on "public"."Conversations" for update to public using ( true );
create policy "Public can view conversations" on "public"."Conversations" for select to public using ( true );

-- Policies for KnowledgeDocuments
create policy "Users can view their own documents" on "public"."KnowledgeDocuments" for select using ( auth.uid() = owner_id );
create policy "Users can manage their own documents" on "public"."KnowledgeDocuments" for all using ( auth.uid() = owner_id );
create policy "Public can view documents" on "public"."KnowledgeDocuments" for select to public using ( true );

-- Policies for CampaignRules
create policy "Users can view their own campaigns" on "public"."CampaignRules" for select using ( auth.uid() = owner_id );
create policy "Users can manage their own campaigns" on "public"."CampaignRules" for all using ( auth.uid() = owner_id );
create policy "Public can view campaigns" on "public"."CampaignRules" for select to public using ( true );
