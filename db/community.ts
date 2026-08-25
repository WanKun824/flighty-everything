import { env } from "cloudflare:workers";

export function getCommunityD1() {
  const bindings = env as typeof env & { DB?: D1Database };
  if (!bindings.DB) throw new Error("Community storage is unavailable");
  return bindings.DB;
}

export async function ensureCommunitySchema() {
  const d1 = getCommunityD1();
  await d1.batch([
    d1.prepare(`CREATE TABLE IF NOT EXISTS community_journeys (
      id TEXT PRIMARY KEY NOT NULL,
      creator_name TEXT NOT NULL,
      title TEXT NOT NULL,
      caption TEXT NOT NULL,
      mode TEXT NOT NULL,
      service TEXT NOT NULL,
      origin_code TEXT NOT NULL,
      origin_name TEXT NOT NULL,
      origin_city TEXT NOT NULL,
      origin_longitude INTEGER NOT NULL,
      origin_latitude INTEGER NOT NULL,
      destination_code TEXT NOT NULL,
      destination_name TEXT NOT NULL,
      destination_city TEXT NOT NULL,
      destination_longitude INTEGER NOT NULL,
      destination_latitude INTEGER NOT NULL,
      date TEXT NOT NULL,
      departure TEXT NOT NULL,
      arrival TEXT NOT NULL,
      duration_minutes INTEGER NOT NULL,
      note TEXT NOT NULL,
      likes INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    )`),
    d1.prepare(`CREATE INDEX IF NOT EXISTS idx_community_journeys_created_at
      ON community_journeys(created_at DESC)`),
  ]);
  return d1;
}
