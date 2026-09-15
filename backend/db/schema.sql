-- ╔════════════════════════════════════════════════════════════════════════╗
-- ║  SIET INCEPTRON CSE — Complete Supabase Database Schema             ║
-- ║  Run this entire file in your Supabase SQL Editor (Dashboard)       ║
-- ║  https://supabase.com/dashboard → SQL Editor → New Query            ║
-- ╚════════════════════════════════════════════════════════════════════════╝

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ═══════════════════════════════════════════════════════════════════════
-- 1. USERS — Authentication / login table
-- ═══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.users (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  email         text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  role          text NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'faculty', 'admin')),
  created_at    timestamptz DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════════════
-- 2. STUDENTS — Student profile linked to users
-- ═══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.students (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id        uuid UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name           text NOT NULL,
  roll_no        text UNIQUE NOT NULL,
  reg_no         text,
  year           int,
  class          text,
  batch          text,
  date_of_birth  date,
  bio            text,
  github         text,
  linkedin       text,
  instagram      text,
  twitter        text,
  portfolio      text,
  avatar_url     text,
  phone          text,
  phone_public   boolean DEFAULT false,
  dob_public     boolean DEFAULT false,
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════════════
-- 3. FACULTY — Faculty/Admin profile linked to users
-- ═══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.faculty (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id         uuid UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name            text NOT NULL,
  designation     text DEFAULT 'Faculty',
  department      text DEFAULT 'CSE',
  avatar_url      text,
  advising_class  text,
  advising_batch  text,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════════════
-- 4. ACHIEVEMENTS — Student achievements (hackathons, internships, etc.)
-- ═══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.achievements (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type             text NOT NULL CHECK (type IN ('hackathon', 'internship', 'course', 'project', 'certification')),
  title            text NOT NULL,
  description      text,
  position         text,        -- '1st', '2nd', '3rd', 'participated' (for hackathons)
  duration         text,        -- 'short', 'medium', 'long' (for internships)
  proof_url        text,
  points           int NOT NULL DEFAULT 0,
  verified         boolean DEFAULT false,
  status           text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason text,
  reviewed_by      uuid REFERENCES public.users(id),
  reviewed_at      timestamptz,
  created_at       timestamptz DEFAULT now()
);

-- Migration for existing databases
ALTER TABLE public.achievements ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected'));
ALTER TABLE public.achievements ADD COLUMN IF NOT EXISTS rejection_reason text;
ALTER TABLE public.achievements ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES public.users(id);
ALTER TABLE public.achievements ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

-- Backfill existing achievement statuses during migration
UPDATE public.achievements
SET status = CASE
    WHEN verified = true THEN 'approved'
    ELSE 'pending'
END
WHERE status IS NULL;

-- ═══════════════════════════════════════════════════════════════════════
-- 5. TEAMS — Student teams (hackathon teams, project groups, etc.)
-- ═══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.teams (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        text NOT NULL,
  description text,
  type        text NOT NULL CHECK (type IN ('hackathon', 'project', 'research')),
  creator_id  uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  is_open     boolean DEFAULT true,
  created_at  timestamptz DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════════════
-- 6. TEAM_MEMBERS — Many-to-many: users ↔ teams with role + status
-- ═══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.team_members (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  team_id    uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role       text NOT NULL DEFAULT 'member' CHECK (role IN ('leader', 'member')),
  status     text NOT NULL DEFAULT 'accepted' CHECK (status IN ('pending', 'accepted')),
  joined_at  timestamptz DEFAULT now(),
  UNIQUE (team_id, user_id)
);

-- ═══════════════════════════════════════════════════════════════════════
-- 7. STUDENT_LEADERBOARD — Materialized View for fast leaderboard queries
--    (Used by /api/leaderboard routes)
-- ═══════════════════════════════════════════════════════════════════════
CREATE OR REPLACE VIEW public.student_leaderboard AS
SELECT
  s.user_id,
  s.name,
  s.roll_no,
  s.class,
  s.batch,
  s.year,
  s.avatar_url,
  s.github,
  s.linkedin,
  COALESCE(agg.score, 0)             AS score,
  COALESCE(agg.achievement_count, 0) AS achievement_count,
  COALESCE(agg.gold_wins, 0)         AS gold_wins,
  COALESCE(agg.silver_wins, 0)       AS silver_wins,
  COALESCE(agg.bronze_wins, 0)       AS bronze_wins
FROM public.students s
LEFT JOIN (
  SELECT
    a.user_id,
    SUM(a.points)                                                           AS score,
    COUNT(*)                                                                AS achievement_count,
    COUNT(*) FILTER (WHERE a.type = 'hackathon' AND a.position = '1st')     AS gold_wins,
    COUNT(*) FILTER (WHERE a.type = 'hackathon' AND a.position = '2nd')     AS silver_wins,
    COUNT(*) FILTER (WHERE a.type = 'hackathon' AND a.position = '3rd')     AS bronze_wins
  FROM public.achievements a
  WHERE a.verified = true
  GROUP BY a.user_id
) agg ON agg.user_id = s.user_id;

CREATE TABLE IF NOT EXISTS public.announcements (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title       text NOT NULL,
  content     text NOT NULL,
  image_url   text,
  category    text DEFAULT 'General' CHECK (category IN ('General', 'Hackathon Winner', 'Placement', 'Department Update', 'Event', 'Achievement')),
  is_active   boolean DEFAULT true,
  created_by  uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════════════
-- 8. INDEXES for performance
-- ═══════════════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_students_user_id       ON public.students(user_id);
CREATE INDEX IF NOT EXISTS idx_students_roll_no       ON public.students(roll_no);
CREATE INDEX IF NOT EXISTS idx_students_class_batch   ON public.students(class, batch);
CREATE INDEX IF NOT EXISTS idx_faculty_user_id        ON public.faculty(user_id);
CREATE INDEX IF NOT EXISTS idx_achievements_user_id   ON public.achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_achievements_verified  ON public.achievements(verified);
CREATE INDEX IF NOT EXISTS idx_teams_creator_id       ON public.teams(creator_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team_id   ON public.team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id   ON public.team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_status    ON public.team_members(status);
CREATE INDEX IF NOT EXISTS idx_announcements_active   ON public.announcements(is_active);

-- ═══════════════════════════════════════════════════════════════════════
-- 9. ROW LEVEL SECURITY — Disable for now (service role key bypasses RLS)
--    Enable these later for production with proper policies
-- ═══════════════════════════════════════════════════════════════════════
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faculty ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════════════════
-- 10. LMS — Courses, Modules, and Lessons
-- ═══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.courses (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  code          text UNIQUE NOT NULL,
  title         text NOT NULL,
  description   text,
  instructor_id uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  semester      int NOT NULL CHECK (semester >= 1 AND semester <= 8),
  credits       int NOT NULL DEFAULT 3 CHECK (credits >= 1 AND credits <= 10),
  target_class  text,
  target_year   int CHECK (target_year IS NULL OR (target_year >= 1 AND target_year <= 4)),
  is_published  boolean NOT NULL DEFAULT false,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.modules (
  id             uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id      uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title          text NOT NULL,
  sequence_order int NOT NULL DEFAULT 1 CHECK (sequence_order >= 0),
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.lessons (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  module_id        uuid NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  title            text NOT NULL,
  content_markdown text,
  video_url        text,
  sequence_order   int NOT NULL DEFAULT 1 CHECK (sequence_order >= 0),
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_courses_code          ON public.courses(code);
CREATE INDEX IF NOT EXISTS idx_courses_instructor_id ON public.courses(instructor_id);
CREATE INDEX IF NOT EXISTS idx_courses_is_published  ON public.courses(is_published);
CREATE INDEX IF NOT EXISTS idx_modules_course_id     ON public.modules(course_id);
CREATE INDEX IF NOT EXISTS idx_modules_seq           ON public.modules(course_id, sequence_order);
CREATE INDEX IF NOT EXISTS idx_lessons_module_id     ON public.lessons(module_id);
CREATE INDEX IF NOT EXISTS idx_lessons_seq           ON public.lessons(module_id, sequence_order);

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

-- Allow service_role full access (your backend uses service_role key)
CREATE POLICY "Service role full access on users"         ON public.users         FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on students"      ON public.students      FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on faculty"       ON public.faculty       FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on achievements"  ON public.achievements  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on teams"         ON public.teams         FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on team_members"  ON public.team_members  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on announcements" ON public.announcements FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on courses"       ON public.courses       FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on modules"       ON public.modules       FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on lessons"       ON public.lessons       FOR ALL USING (true) WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════════════
-- 11. COMPETITIVE PROFILES & PLATFORM INTEGRATIONS
-- ═══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.platform_definitions (
  code        text PRIMARY KEY,
  name        text NOT NULL,
  category    text NOT NULL,
  base_url    text NOT NULL,
  description text,
  is_active   boolean DEFAULT true,
  created_at  timestamptz DEFAULT now()
);

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

CREATE TABLE IF NOT EXISTS public.sync_audit_logs (
  id             uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  platform_code  text NOT NULL,
  status         text NOT NULL,
  error_category text,
  duration_ms    int,
  created_at     timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_student_platforms_user ON public.student_platform_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_student_platforms_platform ON public.student_platform_connections(platform_code);
CREATE INDEX IF NOT EXISTS idx_student_platforms_sync ON public.student_platform_connections(sync_status);
CREATE INDEX IF NOT EXISTS idx_competitive_profiles_score ON public.student_competitive_profiles(overall_score DESC);
CREATE INDEX IF NOT EXISTS idx_competitive_profiles_rank ON public.student_competitive_profiles(department_rank ASC);
CREATE INDEX IF NOT EXISTS idx_sync_audit_user ON public.sync_audit_logs(user_id, created_at DESC);

ALTER TABLE public.platform_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_platform_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_competitive_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on platform_definitions" ON public.platform_definitions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on student_platform_connections" ON public.student_platform_connections FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on student_competitive_profiles" ON public.student_competitive_profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on sync_audit_logs" ON public.sync_audit_logs FOR ALL USING (true) WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════════════
-- DONE! Your database is ready.
-- Next: seed an admin user so you can log in.
-- ═══════════════════════════════════════════════════════════════════════


