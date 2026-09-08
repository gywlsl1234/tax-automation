import "server-only";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * service_role 키는 RLS를 완전히 우회하는 최고 권한 키입니다.
 * 이 모듈은 "server-only"로 가드되어 있어, 실수로 클라이언트 컴포넌트나
 * 브라우저로 전달되는 번들에 포함되면 빌드 타임에 에러가 발생합니다.
 * (Route Handler, Server Action, 서버 전용 유틸에서만 import할 것)
 */

let cachedClient: SupabaseClient | null = null;

export function getSupabaseAdminClient(): SupabaseClient {
  if (cachedClient) return cachedClient;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 환경변수가 설정되지 않았습니다."
    );
  }

  cachedClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cachedClient;
}
