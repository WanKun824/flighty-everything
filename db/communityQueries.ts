import { desc, eq } from "drizzle-orm";
import { getDb } from "./index";
import { ensureCommunitySchema } from "./community";
import { communityJourneys } from "./schema";

export async function listCommunityJourneyRows(limit = 60) {
  await ensureCommunitySchema();
  return getDb()
    .select()
    .from(communityJourneys)
    .orderBy(desc(communityJourneys.createdAt))
    .limit(Math.min(60, Math.max(1, limit)));
}

export async function findCommunityJourneyRow(id: string) {
  await ensureCommunitySchema();
  const [journey] = await getDb()
    .select()
    .from(communityJourneys)
    .where(eq(communityJourneys.id, id.slice(0, 100)))
    .limit(1);
  return journey ?? null;
}
