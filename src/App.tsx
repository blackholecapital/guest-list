import {
  AdminPage,
  GuestListPage,
  JoinTokenPage,
  LoginPage,
  NotFoundPage,
  PromoterControlPage,
  PromoterPage,
  PromotersDashboardPage,
  StatsPage,
} from "./pages";
import {
  canAccessInternalPath,
  getDemoSession,
  landingPath,
} from "./auth";

export default function App() {
  const path = window.location.pathname.replace(/\/+$/, "") || "/";

  if (path === "/login") {
    return <LoginPage />;
  }

  const isPublicGuestPath = path.startsWith("/join/") || path.startsWith("/p/");
  const session = getDemoSession();

  if (!isPublicGuestPath && !session) {
    window.location.replace("/login");
    return null;
  }

  if (session && path === "/") {
    window.location.replace(landingPath(session));
    return null;
  }

  if (session && !canAccessInternalPath(session, path)) {
    window.location.replace(landingPath(session));
    return null;
  }

  if (path === "/") {
    return null;
  }

  if (path === "/guest-list") {
    return <GuestListPage />;
  }

  if (path === "/stats") {
    return <StatsPage />;
  }

  if (path === "/promoters") {
    return <PromotersDashboardPage />;
  }

  if (path === "/admin") {
    return <AdminPage />;
  }

  if (path.startsWith("/promoter/")) {
    const promoterSlug = path.split("/")[2]?.toLowerCase();

    if (promoterSlug) {
      return <PromoterControlPage promoterSlug={promoterSlug} />;
    }
  }

  if (path.startsWith("/join/")) {
    const token = path.split("/")[2];

    if (token) {
      return <JoinTokenPage token={token} />;
    }
  }

  if (path.startsWith("/p/")) {
    const promoterSlug = path.split("/")[2]?.toLowerCase();

    if (promoterSlug) {
      return <PromoterPage promoterSlug={promoterSlug} />;
    }
  }

  return <NotFoundPage />;
}
