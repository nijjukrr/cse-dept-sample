-- Migration: Create announcements table for Department News / Post & Notify system
-- Run this in your Supabase SQL Editor if persistent announcement storage is not yet configured.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.announcements (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title       text NOT NULL,
  content     text NOT NULL,
  image_url   text,
  category    text DEFAULT 'General' CHECK (category IN ('General', 'Hackathon Winner', 'Placement', 'Department Update', 'Event', 'Achievement', 'Important')),
  is_active   boolean DEFAULT true,
  created_by  uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_announcements_active ON public.announcements(is_active);

-- Enable RLS and add Service role policy for announcements
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'announcements' AND policyname = 'Service role full access on announcements'
  ) THEN
    CREATE POLICY "Service role full access on announcements" ON public.announcements FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
