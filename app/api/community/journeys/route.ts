import { desc, eq, sql } from "drizzle-orm";
import { ensureCommunitySchema } from "../../../../db/community";
import { getDb } from "../../../../db";
import { communityJourneys } from "../../../../db/schema";

const MODES = new Set(["flight", "train", "car", "ferry"]);

export async function GET(request: Request) {
  try {
    await ensureCommunitySchema();
    const id = clean(new URL(request.url).searchParams.get("id"), 100);
    if (id) {
      const [journey] = await getDb()
        .select()
        .from(communityJourneys)
        .where(eq(communityJourneys.id, id))
        .limit(1);
      if (!journey) return Response.json({ error: "行程不存在" }, { status: 404 });
      return Response.json({ journey });
    }
    const journeys = await getDb()
      .select()
      .from(communityJourneys)
      .orderBy(desc(communityJourneys.createdAt))
      .limit(60);
    return Response.json({ journeys });
  } catch (error) {
    return responseError(error);
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Record<string, unknown>;
    const creatorName = clean(payload.creatorName, 40);
    const title = clean(payload.title, 80);
    const caption = clean(payload.caption, 240);
    const mode = clean(payload.mode, 12);
    if (!creatorName || !title || !MODES.has(mode)) {
      return Response.json({ error: "发布者、标题和交通类型不能为空" }, { status: 400 });
    }

    const origin = readPlace(payload.origin);
    const destination = readPlace(payload.destination);
    if (!origin || !destination) {
      return Response.json({ error: "行程起点或终点无效" }, { status: 400 });
    }

    await ensureCommunitySchema();
    const id = `community-${crypto.randomUUID()}`;
    const [journey] = await getDb()
      .insert(communityJourneys)
      .values({
        id,
        creatorName,
        title,
        caption,
        mode: mode as "flight" | "train" | "car" | "ferry",
        service: clean(payload.service, 50) || "自定义路线",
        originCode: origin.code,
        originName: origin.name,
        originCity: origin.city,
        originLongitude: coordinateInteger(origin.coordinate[0], 180),
        originLatitude: coordinateInteger(origin.coordinate[1], 90),
        destinationCode: destination.code,
        destinationName: destination.name,
        destinationCity: destination.city,
        destinationLongitude: coordinateInteger(destination.coordinate[0], 180),
        destinationLatitude: coordinateInteger(destination.coordinate[1], 90),
        date: clean(payload.date, 40) || "日期待定",
        departure: clean(payload.departure, 10) || "09:00",
        arrival: clean(payload.arrival, 10) || "10:00",
        durationMinutes: boundedInteger(payload.durationMinutes, 1, 43200, 60),
        note: clean(payload.note, 240),
        likes: 0,
        createdAt: new Date(),
      })
      .returning();
    return Response.json({ journey }, { status: 201 });
  } catch (error) {
    return responseError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const payload = (await request.json()) as { id?: unknown };
    const id = clean(payload.id, 100);
    if (!id) return Response.json({ error: "缺少行程 ID" }, { status: 400 });
    await ensureCommunitySchema();
    const [journey] = await getDb()
      .update(communityJourneys)
      .set({ likes: sql`${communityJourneys.likes} + 1` })
      .where(eq(communityJourneys.id, id))
      .returning();
    if (!journey) return Response.json({ error: "行程不存在" }, { status: 404 });
    return Response.json({ journey });
  } catch (error) {
    return responseError(error);
  }
}

function clean(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function boundedInteger(value: unknown, min: number, max: number, fallback: number) {
  const number = typeof value === "number" ? Math.round(value) : Number.NaN;
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
}

function coordinateInteger(value: number, limit: number) {
  return Math.round(Math.min(limit, Math.max(-limit, value)) * 1_000_000);
}

function readPlace(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const place = value as Record<string, unknown>;
  const coordinate = Array.isArray(place.coordinate) ? place.coordinate : [];
  const longitude = typeof coordinate[0] === "number" ? coordinate[0] : Number.NaN;
  const latitude = typeof coordinate[1] === "number" ? coordinate[1] : Number.NaN;
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) return null;
  return {
    code: clean(place.code, 12) || "—",
    name: clean(place.name, 80) || clean(place.city, 50),
    city: clean(place.city, 50) || clean(place.code, 12),
    coordinate: [longitude, latitude] as [number, number],
  };
}

function responseError(error: unknown) {
  console.error("Community journey request failed", error);
  return Response.json({ error: "社区服务暂时不可用，请稍后重试" }, { status: 500 });
}
