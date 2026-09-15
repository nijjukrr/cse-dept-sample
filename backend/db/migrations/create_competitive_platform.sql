-- ═══════════════════════════════════════════════════════════════════════════
-- Migration: CSE Competitive Profile & Department Achievement Platform
-- Sri Shakthi Institute of Engineering & Technology (SSIET)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PLATFORM DEFINITIONS
CREATE TABLE IF NOT EXISTS public.platform_definitions (
  code        text PRIMARY KEY,
  name        text NOT NULL,
  category    text NOT NULL,
  base_url    text NOT NULL,
  description text,
  is_active   boolean DEFAULT true,
  created_at  timestamptz DEFAULT now()
);

-- Seed platform definitions
INSERT INTO public.platform_definitions (code, name, category, base_url, description)
VALUES
  ('github', 'GitHub', 'Open Source & Projects', 'https://github.com', 'Repositories, contributions, pull requests, stars, and open source activity.'),
  ('leetcode', 'LeetCode', 'Problem Solving', 'https://leetcode.com', 'Coding questions, difficulty tiers (Easy/Medium/Hard), contest ratings, and streaks.'),
  ('codeforces', 'Codeforces', 'Competitive Programming', 'https://codeforces.com', 'Global competitive contests, division ranks, official rating, and problem solutions.'),
  ('codechef', 'CodeChef', 'Competitive Programming', 'https://codechef.com', 'Divisional contests, star ratings, global rank, and contest participation.'),
  ('hackerrank', 'HackerRank', 'Problem Solving & Skills', 'https://hackerrank.com', 'Domain badges, skill certifications, stars, and problem-solving badges.'),
  ('geeksforgeeks', 'GeeksforGeeks', 'Problem Solving', 'https://auth.geeksforgeeks.org', 'Practice problems solved, coding score, institute ranking, and contest events.'),
  ('kaggle', 'Kaggle', 'Data Science & AI', 'https://kaggle.com', 'Machine learning competitions, datasets, community notebooks, and tier medals.')
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name,
    category = EXCLUDED.category,
    base_url = EXCLUDED.base_url,
    description = EXCLUDED.description;

-- 2. STUDENT PLATFORM CONNECTIONS
CREATE TABLE IF NOT EXISTS public.student_platform_connections (
  id                 uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id            uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  platform_code      text NOT NULL REFERENCES public.platform_definitions(code) ON DELETE CASCADE,
  username           text NOT NULL,
  profile_url        text NOT NULL,
  connection_status  text NOT NULL DEFAULT 'connected' CHECK (connection_status IN ('connected', 'disconnected', 'error', 'pending')),
  verification_level text NOT NULL DEFAULT 'public_linked' CHECK (verification_level IN ('verified_oauth', 'verified_public_api', 'public_linked', 'unverified')),
  sync_status        text NOT NULL DEFAULT 'never_synced' CHECK (sync_status IN ('success', 'failed', 'syncing', 'never_synced', 'rate_limited')),
  ownership_status   text NOT NULL DEFAULT 'unverified' CHECK (ownership_status IN ('unverified', 'pending', 'verified', 'invalidated')),
  verification_token text,
  verification_started_at timestamptz,
  verified_at        timestamptz,
  raw_metrics        jsonb DEFAULT '{}'::jsonb,
  normalized_metrics jsonb DEFAULT '{}'::jsonb,
  platform_score     numeric NOT NULL DEFAULT 0,
  last_synced_at     timestamptz,
  last_attempted_at  timestamptz,
  error_message      text,
  created_at         timestamptz DEFAULT now(),
  updated_at         timestamptz DEFAULT now(),
  UNIQUE (user_id, platform_code)
);

-- 3. STUDENT COMPETITIVE PROFILES (Authoritative Scoring Snapshot)
CREATE TABLE IF NOT EXISTS public.student_competitive_profiles (
  user_id                        uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  overall_score                  numeric NOT NULL DEFAULT 0,
  department_rank                int DEFAULT 0,
  problem_solving_score          numeric NOT NULL DEFAULT 0,
  competitive_programming_score  numeric NOT NULL DEFAULT 0,
  open_source_score              numeric NOT NULL DEFAULT 0,
  certifications_score           numeric NOT NULL DEFAULT 0,
  community_score                numeric NOT NULL DEFAULT 0,
  category_breakdown             jsonb DEFAULT '{}'::jsonb,
  platform_breakdown             jsonb DEFAULT '{}'::jsonb,
  connected_platform_count       int NOT NULL DEFAULT 0,
  last_calculated_at             timestamptz DEFAULT now(),
  updated_at                     timestamptz DEFAULT now()
);

-- 4. SYNC AUDIT LOGS (Diagnostic history)
CREATE TABLE IF NOT EXISTS public.sync_audit_logs (
  id             uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  platform_code  text NOT NULL,
  status         text NOT NULL,
  error_category text,
  duration_ms    int,
  created_at     timestamptz DEFAULT now()
);

-- 5. INDEXES
CREATE INDEX IF NOT EXISTS idx_student_platforms_user ON public.student_platform_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_student_platforms_platform ON public.student_platform_connections(platform_code);
CREATE INDEX IF NOT EXISTS idx_student_platforms_sync ON public.student_platform_connections(sync_status);
CREATE INDEX IF NOT EXISTS idx_competitive_profiles_score ON public.student_competitive_profiles(overall_score DESC);
CREATE INDEX IF NOT EXISTS idx_competitive_profiles_rank ON public.student_competitive_profiles(department_rank ASC);
CREATE INDEX IF NOT EXISTS idx_sync_audit_user ON public.sync_audit_logs(user_id, created_at DESC);

-- 6. ROW LEVEL SECURITY
ALTER TABLE public.platform_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_platform_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_competitive_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on platform_definitions" ON public.platform_definitions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on student_platform_connections" ON public.student_platform_connections FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on student_competitive_profiles" ON public.student_competitive_profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on sync_audit_logs" ON public.sync_audit_logs FOR ALL USING (true) WITH CHECK (true);
