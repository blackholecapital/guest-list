export type DemoRole = "door" | "admin" | "promoter";

export type DemoSession = {
  username: string;
  role: DemoRole;
  promoterSlug?: "blue" | "yellow" | "red" | "green" | "purple" | "orange" | "teal" | "pink";
};

const SESSION_KEY = "guest-list-demo-session";

export const LOGIN_ACCOUNTS: DemoSession[] = [
  { username: "Door", role: "door" },
  { username: "Admin", role: "admin" },
  {
    username: "Blue",
    role: "promoter",
    promoterSlug: "blue",
  },
  {
    username: "Yellow",
    role: "promoter",
    promoterSlug: "yellow",
  },
  {
    username: "Red",
    role: "promoter",
    promoterSlug: "red",
  },
  {
    username: "Green",
    role: "promoter",
    promoterSlug: "green",
  },
  {
    username: "Purple",
    role: "promoter",
    promoterSlug: "purple",
  },
  {
    username: "Orange",
    role: "promoter",
    promoterSlug: "orange",
  },
  {
    username: "Teal",
    role: "promoter",
    promoterSlug: "teal",
  },
  {
    username: "Pink",
    role: "promoter",
    promoterSlug: "pink",
  },
];

export function getDemoSession(): DemoSession | null {
  try {
    const stored = window.sessionStorage.getItem(SESSION_KEY);
    if (!stored) return null;

    const parsed = JSON.parse(stored) as DemoSession;
    if (parsed.role === "promoter") {
      const validSlug = LOGIN_ACCOUNTS.some(
        account => account.role === "promoter" && account.promoterSlug === parsed.promoterSlug,
      );
      return validSlug && typeof parsed.username === "string" && parsed.username.length > 0
        ? parsed
        : null;
    }
    return LOGIN_ACCOUNTS.some(
      account => account.username === parsed.username && account.role === parsed.role,
    ) ? parsed : null;
  } catch {
    return null;
  }
}

export async function loginDemoAccount(
  username: string,
  password: string,
): Promise<DemoSession | null> {
  const response = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const result = await response.json() as { ok: boolean; data?: { session?: DemoSession } };
  const session = result.data?.session;
  if (!response.ok || !result.ok || !session) return null;

  window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export function logoutDemoAccount() {
  void fetch("/api/logout", { method: "POST", keepalive: true });
  window.sessionStorage.removeItem(SESSION_KEY);
  window.location.assign("/login");
}

export function landingPath(session: DemoSession) {
  if (session.role === "door") return "/guest-list";
  if (session.role === "promoter") return `/promoter/${session.promoterSlug}`;
  return "/stats";
}

export function canAccessInternalPath(session: DemoSession, path: string) {
  if (session.role === "admin") return true;
  if (session.role === "door") return path === "/guest-list";

  return path === `/promoter/${session.promoterSlug}` ||
    path === `/promoter/${session.promoterSlug}/stats` ||
    path === `/vip/${session.promoterSlug}`;
}
