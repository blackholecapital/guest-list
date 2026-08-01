export interface Env {
  DB: D1Database;
  ADMIN_CONFIG_KEY?: string;
  guest_followups?: Queue;
}

export interface VenueRow {
  id: number;
  slug: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
}

export function json(
  body: unknown,
  status = 200,
): Response {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

export function success(data: unknown, status = 200): Response {
  return json({ ok: true, data }, status);
}

export function failure(
  code: string,
  message: string,
  status = 400,
): Response {
  return json({
    ok: false,
    error: { code, message },
  }, status);
}

export async function readJson(
  request: Request,
): Promise<Record<string, unknown> | null> {
  try {
    const value: unknown = await request.json();

    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return null;
    }

    return value as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function normalizePhone(value: string): string {
  return value.replace(/\D/g, "");
}

export function haversineMeters(
  latitude1: number,
  longitude1: number,
  latitude2: number,
  longitude2: number,
): number {
  const earthRadiusMeters = 6371000;
  const radians = (degrees: number) => degrees * Math.PI / 180;

  const latitudeDelta = radians(latitude2 - latitude1);
  const longitudeDelta = radians(longitude2 - longitude1);

  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(radians(latitude1)) *
      Math.cos(radians(latitude2)) *
      Math.sin(longitudeDelta / 2) ** 2;

  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
