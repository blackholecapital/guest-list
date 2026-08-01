import { success, failure, type Env } from "../lib/api";

export const onRequestGet: PagesFunction<Env> = async ({env}) => {
  const rows = await env.DB.prepare(`
    SELECT id,name,slug,pass_limit,reset_days,passes_used
    FROM promoters
    ORDER BY name
  `).all();

  return success({promoters: rows.results ?? []});
};

export const onRequestPost: PagesFunction<Env> = async ({request,env}) => {
  const body = await request.json() as any;

  await env.DB.prepare(`
    UPDATE promoters
    SET pass_limit=?, reset_days=?
    WHERE id=?
  `).bind(
    body.passLimit,
    body.resetDays,
    body.id
  ).run();

  return success({saved:true});
};
