export type DemoRole = "door" | "admin" | "promoter";

export type DemoSession = {
  username: "Door" | "Admin" | "Blue" | "Yellow" | "Red";
  role: DemoRole;
  promoterSlug?: "mike" | "james" | "sarah";
};

type DemoAccount = DemoSession & {
  password: string;
};

const SESSION_KEY = "guest-list-demo-session";

export const DEMO_ACCOUNTS: DemoAccount[] = [
  { username: "Door", password: "Door111", role: "door" },
  { username: "Admin", password: "admin222", role: "admin" },
  {
    username: "Blue",
    password: "Blue333",
    role: "promoter",
    promoterSlug: "mike",
  },
  {
    username: "Yellow",
    password: "Yellow444",
    role: "promoter",
    promoterSlug: "james",
  },
  {
    username: "Red",
    password: "Red555",
    role: "promoter",
    promoterSlug: "sarah",
  },
];

export function getDemoSession(): DemoSession | null {
  try {
    const stored = window.sessionStorage.getItem(SESSION_KEY);
    if (!stored) return null;

    const parsed = JSON.parse(stored) as DemoSession;
    return DEMO_ACCOUNTS.some(
      (account) =>
        account.username === parsed.username &&
        account.role === parsed.role &&
        account.promoterSlug === parsed.promoterSlug,
    )
      ? parsed
      : null;
  } catch {
    return null;
  }
}

export function loginDemoAccount(
  username: string,
  password: string,
): DemoSession | null {
  const account = DEMO_ACCOUNTS.find(
    (candidate) =>
      candidate.username.toLowerCase() === username.toLowerCase() &&
      candidate.password === password,
  );

  if (!account) return null;

  const session: DemoSession = {
    username: account.username,
    role: account.role,
    promoterSlug: account.promoterSlug,
  };

  window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export function logoutDemoAccount() {
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

  return path === `/promoter/${session.promoterSlug}`;
}
