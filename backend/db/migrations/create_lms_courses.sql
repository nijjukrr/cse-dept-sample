-- ═══════════════════════════════════════════════════════════════════════════
-- Migration: LMS Domain - Courses, Modules, and Lessons
-- Sri Shakthi Institute of Engineering & Technology (SSIET) CSE Portal LMS
-- ═══════════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. COURSES
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

-- 2. MODULES
CREATE TABLE IF NOT EXISTS public.modules (
  id             uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id      uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title          text NOT NULL,
  sequence_order int NOT NULL DEFAULT 1 CHECK (sequence_order >= 0),
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now()
);

-- 3. LESSONS
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

-- 4. INDEXES
CREATE INDEX IF NOT EXISTS idx_courses_code ON public.courses(code);
CREATE INDEX IF NOT EXISTS idx_courses_instructor_id ON public.courses(instructor_id);
CREATE INDEX IF NOT EXISTS idx_courses_is_published ON public.courses(is_published);
CREATE INDEX IF NOT EXISTS idx_modules_course_id ON public.modules(course_id);
CREATE INDEX IF NOT EXISTS idx_modules_seq ON public.modules(course_id, sequence_order);
CREATE INDEX IF NOT EXISTS idx_lessons_module_id ON public.lessons(module_id);
CREATE INDEX IF NOT EXISTS idx_lessons_seq ON public.lessons(module_id, sequence_order);

-- 5. ROW LEVEL SECURITY
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on courses" ON public.courses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on modules" ON public.modules FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on lessons" ON public.lessons FOR ALL USING (true) WITH CHECK (true);
