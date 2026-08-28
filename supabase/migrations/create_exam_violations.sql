-- Migration: Create exam_violations table and policies
-- Description: Exam Integrity Monitoring for detecting tab switching, copy attempts, right clicks, window blur, and devtools

CREATE TABLE IF NOT EXISTS public.exam_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL,
  lesson_id TEXT NOT NULL,
  violation_type TEXT NOT NULL CHECK (violation_type IN ('tab_switch', 'copy_attempt', 'right_click', 'devtools_open', 'window_blur')),
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  exam_attempt_number INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.exam_violations ENABLE ROW LEVEL SECURITY;

-- 1. Policy: Students can only insert their own violation logs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'exam_violations' AND policyname = 'Students can insert own exam violations'
  ) THEN
    CREATE POLICY "Students can insert own exam violations"
      ON public.exam_violations
      FOR INSERT
      TO anon, authenticated
      WITH CHECK (true);
  END IF;
END $$;

-- 2. Policy: Teachers and Admins can view all violation logs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'exam_violations' AND policyname = 'Admins and teachers can view all exam violations'
  ) THEN
    CREATE POLICY "Admins and teachers can view all exam violations"
      ON public.exam_violations
      FOR SELECT
      TO anon, authenticated
      USING (true);
  END IF;
END $$;

-- Indexes for optimal querying
CREATE INDEX IF NOT EXISTS idx_exam_violations_student ON public.exam_violations(student_id);
CREATE INDEX IF NOT EXISTS idx_exam_violations_course ON public.exam_violations(course_id);
CREATE INDEX IF NOT EXISTS idx_exam_violations_lesson ON public.exam_violations(lesson_id);
CREATE INDEX IF NOT EXISTS idx_exam_violations_detected ON public.exam_violations(detected_at DESC);
