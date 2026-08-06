import {
  AdminPage,
  GuestListPage,
  JoinTokenPage,
  NotFoundPage,
  PromoterControlPage,
  PromoterPage,
  PromotersDashboardPage,
  StatsPage,
} from "./pages";

export default function App() {
  const path = window.location.pathname.replace(/\/+$/, "") || "/";

  if (path === "/") {
    return <StatsPage />;
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
