import {success,type Env} from "../lib/api";

export const onRequestGet: PagesFunction<Env> = async ({env})=>{
 const rows = await env.DB.prepare(`
 SELECT
 SUM(event='qr_generated') qrGenerated,
 SUM(event='qr_scanned') qrScanned,
 SUM(event='guest_registered') guestRegistered,
 SUM(event='checked_in') checkedIn
 FROM analytics_events
 `).first();

 return success(rows);
};
