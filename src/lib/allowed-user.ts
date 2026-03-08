import type { User } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

/** 로그인한 사용자가 허용 목록(allowed_users)에 있는지 확인 */
export async function isAllowedUser(
  supabase: SupabaseClient,
  user: User | null
): Promise<boolean> {
  if (!user?.id) return false;
  const { data } = await supabase
    .from("allowed_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  return !!data;
}
