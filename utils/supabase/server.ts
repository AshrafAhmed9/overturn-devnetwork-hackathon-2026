import "server-only";

import { createClient } from "@supabase/supabase-js";

function serverConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!url || !secretKey) {
    throw new Error(
      "Supabase server configuration is missing. Set SUPABASE_SECRET_KEY for server-side audit storage.",
    );
  }

  return { url, secretKey };
}

/**
 * Server-only database client. Never import this module into the agent loop or
 * client components. The secret is intentionally not a NEXT_PUBLIC_ variable.
 */
export function createServerClient() {
  const { url, secretKey } = serverConfig();

  return createClient(url, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
