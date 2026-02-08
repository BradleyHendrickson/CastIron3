import { supabase } from './supabase';

export type Profile = {
  id: string;
  is_tester: boolean;
  username?: string;
  full_name?: string;
  avatar_url?: string;
  website?: string;
};

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, is_tester, username, full_name, avatar_url, website')
    .eq('id', userId)
    .single();

  if (error || !data) return null;
  return data as Profile;
}
