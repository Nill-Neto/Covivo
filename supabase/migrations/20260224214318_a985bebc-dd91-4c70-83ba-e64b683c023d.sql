
-- Fix the SECURITY DEFINER view by setting it to SECURITY INVOKER
ALTER VIEW public.group_member_profiles SET (security_invoker = on);
