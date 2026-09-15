-- Add ownership verification fields to student_platform_connections
ALTER TABLE public.student_platform_connections
ADD COLUMN IF NOT EXISTS ownership_status text NOT NULL DEFAULT 'unverified' CHECK (ownership_status IN ('unverified', 'pending', 'verified', 'invalidated')),
ADD COLUMN IF NOT EXISTS verification_token text,
ADD COLUMN IF NOT EXISTS verification_started_at timestamptz,
ADD COLUMN IF NOT EXISTS verified_at timestamptz;

-- Update existing records to unverified by default
UPDATE public.student_platform_connections
SET ownership_status = 'unverified'
WHERE ownership_status IS NULL;
