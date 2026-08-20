import {
  failure,
  readJson,
  success,
  type Env,
} from "../lib/api";
import { hasAdminSession } from "../lib/admin-session";

interface VenueRow {
  id: number;
  slug: string;
  name: string;
  address: string;
  phone: string | null;
  latitude: number;
  longitude: number;
  radius_meters: number;
  hours_json: string | null;
  customer_cooldown_days: number;
  geofence_enabled: number;
  customer_geofence_enabled: number;
  location_assistance_enabled: number;
  weekly_reset_day: number;
}

interface PromoterRow {
  id: number;
  slug: string;
  name: string;
  active: number;
  pass_limit: number;
  reset_days: number;
}

interface HourRow {
  day: string;
  open: string;
  close: string;
}

function parseHours(value: string | null): HourRow[] {
  if (!value) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(value);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((row): row is HourRow => {
      if (!row || typeof row !== "object") {
        return false;
      }

      const item = row as Record<string, unknown>;

      return (
        typeof item.day === "string" &&
        typeof item.open === "string" &&
        typeof item.close === "string"
      );
    });
  } catch {
    return [];
  }
}

async function getVenue(env: Env): Promise<VenueRow | null> {
  return env.DB
    .prepare(`
      SELECT
        id,
        slug,
        name,
        address,
        phone,
        latitude,
        longitude,
        radius_meters,
        hours_json,
        customer_cooldown_days,
        geofence_enabled,
        customer_geofence_enabled,
        location_assistance_enabled,
        weekly_reset_day
      FROM venues
      ORDER BY id ASC
      LIMIT 1
    `)
    .first<VenueRow>();
}

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  try {
    const venue = await getVenue(env);

    if (!venue) {
      return failure(
        "VENUE_NOT_FOUND",
        "Venue configuration does not exist.",
        404,
      );
    }

    const promoters = await env.DB
      .prepare(`
        SELECT id, slug, name, active, pass_limit, reset_days
        FROM promoters
        WHERE venue_id = ?
        ORDER BY name ASC
      `)
      .bind(venue.id)
      .all<PromoterRow>();

    return success({
      venue: {
        id: venue.id,
        slug: venue.slug,
        name: venue.name,
        address: venue.address,
        phone: venue.phone ?? "",
        latitude: venue.latitude,
        longitude: venue.longitude,
        radiusMeters: venue.radius_meters,
        customerCooldownDays: venue.customer_cooldown_days ?? 14,
        geofenceEnabled: venue.geofence_enabled === 1,
        promoterGeofenceEnabled: venue.geofence_enabled === 1,
        customerGeofenceEnabled: venue.customer_geofence_enabled === 1,
        locationAssistanceEnabled: venue.location_assistance_enabled === 1,
        weeklyResetDay: venue.weekly_reset_day ?? 1,
        hours: parseHours(venue.hours_json),
      },
      promoters: (promoters.results ?? []).map((promoter) => ({
        id: promoter.id,
        slug: promoter.slug,
        name: promoter.name,
        active: promoter.active === 1,
        passLimit: promoter.pass_limit ?? 25,
        resetDays: promoter.reset_days ?? 3,
        qrPath: `/p/${promoter.slug}`,
      })),
    });
  } catch (error) {
    console.error("config GET failed", error);

    return failure(
      "DATABASE_ERROR",
      "Configuration could not be loaded.",
      500,
    );
  }
};

export const onRequestPost: PagesFunction<Env> = async ({
  request,
  env,
}) => {
  if (!await hasAdminSession(request, env.DB)) {
    return failure(
      "ADMIN_SESSION_REQUIRED",
      "Your Admin session expired. Log out and sign in again.",
      401,
    );
  }

  const body = await readJson(request);

  if (!body) {
    return failure(
      "VALIDATION_ERROR",
      "A valid JSON body is required.",
      400,
    );
  }

  const name =
    typeof body.name === "string" ? body.name.trim() : "";

  const address =
    typeof body.address === "string" ? body.address.trim() : "";

  const phone =
    typeof body.phone === "string" ? body.phone.trim() : "";

  const latitude = Number(body.latitude);
  const longitude = Number(body.longitude);
  const radiusMeters = Number(body.radiusMeters);
  const customerCooldownDays = Number(body.customerCooldownDays);
  const geofenceEnabled = body.geofenceEnabled === true;
  const customerGeofenceEnabled = body.customerGeofenceEnabled !== false;
  const locationAssistanceEnabled = body.locationAssistanceEnabled === true;
  const weeklyResetDay = Number(body.weeklyResetDay);

  const hours = Array.isArray(body.hours)
    ? body.hours
    : [];

  if (
    name.length < 2 ||
    address.length < 5 ||
    !Number.isFinite(latitude) ||
    latitude < -90 ||
    latitude > 90 ||
    !Number.isFinite(longitude) ||
    longitude < -180 ||
    longitude > 180 ||
    !Number.isInteger(radiusMeters) ||
    radiusMeters < 50 ||
    radiusMeters > 10000 ||
    !Number.isInteger(customerCooldownDays) ||
    customerCooldownDays < 0 ||
    customerCooldownDays > 90 ||
    !Number.isInteger(weeklyResetDay) ||
    weeklyResetDay < 0 ||
    weeklyResetDay > 6
  ) {
    return failure(
      "VALIDATION_ERROR",
      "Check the venue details, reporting week, cooldown, and geofence settings.",
      400,
    );
  }

  try {
    const venue = await getVenue(env);

    if (!venue) {
      return failure(
        "VENUE_NOT_FOUND",
        "Venue configuration does not exist.",
        404,
      );
    }

    await env.DB
      .prepare(`
        UPDATE venues
        SET
          name = ?,
          address = ?,
          phone = ?,
          latitude = ?,
          longitude = ?,
          radius_meters = ?,
          hours_json = ?,
          customer_cooldown_days = ?,
          geofence_enabled = ?,
          customer_geofence_enabled = ?,
          location_assistance_enabled = ?,
          weekly_reset_day = ?
        WHERE id = ?
      `)
      .bind(
        name,
        address,
        phone,
        latitude,
        longitude,
        radiusMeters,
        JSON.stringify(hours),
        customerCooldownDays,
        geofenceEnabled ? 1 : 0,
        customerGeofenceEnabled ? 1 : 0,
        locationAssistanceEnabled ? 1 : 0,
        weeklyResetDay,
        venue.id,
      )
      .run();

    return success({
      saved: true,
      venueId: venue.id,
    });
  } catch (error) {
    console.error("config POST failed", error);

    return failure(
      "DATABASE_ERROR",
      "Venue configuration could not be saved.",
      500,
    );
  }
};

export const onRequest: PagesFunction<Env> = async (context) => {
  if (context.request.method === "GET") {
    return onRequestGet(context);
  }

  if (context.request.method === "POST") {
    return onRequestPost(context);
  }

  return failure(
    "METHOD_NOT_ALLOWED",
    "Use GET or POST for this endpoint.",
    405,
  );
};
