"use client";

import { createBrowserClient } from "@supabase/ssr";

function publicConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error("Supabase browser configuration is missing.");
  }

  return { url, key };
}

/** A browser client for public reads only. This app has no user auth flow. */
export function createClient() {
  const { url, key } = publicConfig();
  return createBrowserClient(url, key);
}
