
-- 1. Fix profiles: replace broad SELECT policy with one that only exposes non-sensitive fields
-- We restrict the "same group" policy to only allow viewing id, full_name, avatar_url (non-sensitive)
-- Since RLS is row-level not column-level, we create a view for group member lookups
-- Instead, we tighten the policy approach: keep the policy but create a secure function
-- that other components should use for fetching group member profiles without email/phone.

-- Actually, RLS can't do column-level filtering. The proper fix is to keep the policy
-- but ensure the app only selects needed columns. However the scanner flags it as error.
-- The real fix: restrict the "same group" SELECT policy so it doesn't expose email/phone.
-- We'll use a secure view approach, but simplest: narrow the policy to only admins of the group
-- can see full profiles, regular members see only their own.

-- Drop the existing broad policy
DROP POLICY IF EXISTS "Users can view profiles in same group" ON public.profiles;

-- Replace with: group members can see only id, full_name, avatar_url of co-members
-- Since RLS is row-level, we need a different approach. Create a secure function instead.
-- For now, restrict to: admins can view group member profiles, regular members see basic info
-- via a secure view.

-- Create a secure view for group member display (no email/phone)
CREATE OR REPLACE VIEW public.group_member_profiles AS
SELECT 
  p.id,
  p.full_name,
  p.avatar_url,
  gm.group_id,
  gm.active,
  gm.split_percentage
FROM public.profiles p
JOIN public.group_members gm ON gm.user_id = p.id
WHERE gm.active = true;

-- The profiles table now only has "Users can view own profile" policy for SELECT
-- Group member display should use the view or the get_member_balances RPC

-- 2. Fix receipts storage: restrict to group co-members only
DROP POLICY IF EXISTS "Members can view group receipts" ON storage.objects;

CREATE POLICY "Members can view group receipts"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'receipts' AND (
      -- Owner can always view their own receipts
      auth.uid()::text = (storage.foldername(name))[1]
      OR
      -- Co-members: viewer shares a group with the uploader
      EXISTS (
        SELECT 1 FROM public.group_members gm1
        JOIN public.group_members gm2 ON gm1.group_id = gm2.group_id
        WHERE gm1.user_id = auth.uid()
        AND gm2.user_id = (storage.foldername(name))[1]::uuid
        AND gm1.active = true
        AND gm2.active = true
      )
    )
  );
