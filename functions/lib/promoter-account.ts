import type { Env } from "./api";

const encoder = new TextEncoder();

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
}

function bytesToBase64Url(bytes: Uint8Array) {
  let value = "";
  for (const byte of bytes) value += String.fromCharCode(byte);
  return btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function createAccountToken() {
  return bytesToBase64Url(crypto.getRandomValues(new Uint8Array(32)));
}

export async function hashAccountToken(token: string) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(token));
  return bytesToHex(new Uint8Array(digest));
}

export function validEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

export function validUsername(username: string) {
  return /^[A-Za-z][A-Za-z0-9._-]{2,39}$/.test(username) &&
    username.toLowerCase() !== "admin" &&
    username.toLowerCase() !== "door";
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function accountEmail(
  to: string,
  promoterName: string,
  setupUrl: string,
  purpose: "invite" | "reset",
) {
  const action = purpose === "invite" ? "set up" : "reset";
  const safeName = escapeHtml(promoterName);
  const safeUrl = escapeHtml(setupUrl);
  return {
    kind: "promoter_account_email",
    to,
    subject: purpose === "invite"
      ? "Set up your Scores Tampa promoter account"
      : "Reset your Scores Tampa promoter password",
    text: `Hi ${promoterName}, use this secure one-time link to ${action} your Scores Tampa promoter account: ${setupUrl}\n\nIf you did not expect this message, you can ignore it.`,
    html: `<p>Hi ${safeName},</p><p>Use the secure one-time link below to ${action} your Scores Tampa promoter account.</p><p><a href="${safeUrl}">${purpose === "invite" ? "Set up my account" : "Reset my password"}</a></p><p>This link expires automatically and can only be used once.</p><p>If you did not expect this message, you can ignore it.</p>`,
  };
}

export async function queueAccountEmail(env: Env, message: ReturnType<typeof accountEmail>) {
  if (!env.guest_followups) return false;
  try {
    await env.guest_followups.send(message);
    return true;
  } catch (error) {
    console.error("promoter account email enqueue failed", error);
    return false;
  }
}
