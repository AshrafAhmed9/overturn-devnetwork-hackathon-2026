import "server-only";

import { createAdminClient } from "@supabase/server/core";

/**
 * Server-only database client. Never import this module into the agent loop or
 * client components. The secret is intentionally not a NEXT_PUBLIC_ variable.
 */
export function createServerClient() {
  if (!process.env.SUPABASE_SECRET_KEY) {
    throw new Error(
      "Supabase server configuration is missing. Set SUPABASE_SECRET_KEY for server-side audit storage.",
    );
  }

  return createAdminClient();
}
