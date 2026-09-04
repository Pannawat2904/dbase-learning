-- Migration: Create function to permanently delete student account
-- Description: Runs with SECURITY DEFINER to allow admins to delete student profiles and auth records

CREATE OR REPLACE FUNCTION public.delete_student_account(student_uuid UUID)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- 1. Delete progress and scores
  DELETE FROM public.student_scores WHERE student_id = student_uuid;
  DELETE FROM public.student_assignments WHERE student_id = student_uuid;
  DELETE FROM public.student_lesson_progress WHERE student_id = student_uuid;
  
  -- 2. Delete certificates and exam violations
  DELETE FROM public.certificates WHERE student_id = student_uuid;
  DELETE FROM public.exam_violations WHERE student_id = student_uuid;
  
  -- 3. Delete messages and notifications
  DELETE FROM public.messages WHERE student_id = student_uuid;
  DELETE FROM public.chat_messages WHERE student_id = student_uuid;
  DELETE FROM public.ai_chat_logs WHERE student_id = student_uuid;
  DELETE FROM public.notifications WHERE user_id = student_uuid;
  
  -- 4. Delete profile
  DELETE FROM public.profiles WHERE id = student_uuid;
  
  -- 5. Delete from auth.users if exists
  DELETE FROM auth.users WHERE id = student_uuid;
  
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error in delete_student_account: %', SQLERRM;
    RETURN false;
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.delete_student_account(UUID) TO anon, authenticated, service_role;
