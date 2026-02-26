
-- Allow admins to view profiles of members in their groups
CREATE POLICY "Admin can view group member profiles"
ON public.profiles
FOR SELECT
USING (public.is_admin_of_user(auth.uid(), id));
