import {
  AdminPage,
  DoorInstructionsPage,
  EventJoinPage,
  GuestListPage,
  JoinTokenPage,
  LoginPage,
  LocationHelpPage,
  NotFoundPage,
  PromoterControlPage,
  PromoterAccountPage,
  PromoterInstructionsPage,
  PromoterPasswordRequestPage,
  PromoterStatsPage,
  PromoterPage,
  PromotersDashboardPage,
  StatsPage,
} from "./pages";
import { ContestAdminPage, ContestEntryPage, ContestEventPage } from "./contest";
import { VipAdminPage, VipServicePage } from "./vip";
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

  if (path === "/instructions/promoter") {
    return <PromoterInstructionsPage />;
  }

  if (path === "/instructions/door") {
    return <DoorInstructionsPage />;
  }

  const isPublicGuestPath =
    path.startsWith("/join/") ||
    path.startsWith("/event/") ||
    path.startsWith("/p/") ||
    path.startsWith("/vip/") ||
    path === "/location-help" ||
    path === "/promoter-account" ||
    path === "/promoter-password-reset" ||
    path === "/contest" ||
    path === "/contest/register";
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

  if (path === "/contest") {
    return <ContestEventPage />;
  }

  if (path === "/contest/register") {
    return <ContestEntryPage />;
  }

  if (path === "/contest-admin") {
    return <ContestAdminPage />;
  }

  if (path === "/vip-admin") {
    return <VipAdminPage />;
  }

  if (path === "/location-help") {
    return <LocationHelpPage />;
  }

  if (path === "/promoter-account") {
    return <PromoterAccountPage />;
  }

  if (path === "/promoter-password-reset") {
    return <PromoterPasswordRequestPage />;
  }

  if (path.startsWith("/promoter/")) {
    const promoterSlug = path.split("/")[2]?.toLowerCase();

    if (promoterSlug) {
      if (path === `/promoter/${promoterSlug}/stats`) {
        return <PromoterStatsPage promoterSlug={promoterSlug} />;
      }
      return <PromoterControlPage promoterSlug={promoterSlug} />;
    }
  }

  if (path.startsWith("/join/")) {
    const token = path.split("/")[2];

    if (token) {
      return <JoinTokenPage token={token} />;
    }
  }

  if (path.startsWith("/event/")) {
    const [, , eventIdValue, promoterSlugValue] = path.split("/");
    const eventId = Number(eventIdValue);
    const promoterSlug = promoterSlugValue?.toLowerCase();
    if (Number.isInteger(eventId) && eventId > 0 && promoterSlug) {
      return <EventJoinPage eventId={eventId} promoterSlug={promoterSlug} />;
    }
  }

  if (path.startsWith("/p/")) {
    const promoterSlug = path.split("/")[2]?.toLowerCase();

    if (promoterSlug) {
      return <PromoterPage promoterSlug={promoterSlug} />;
    }
  }

  if (path.startsWith("/vip/")) {
    const promoterSlug = path.split("/")[2]?.toLowerCase();
    if (promoterSlug) return <VipServicePage promoterSlug={promoterSlug} />;
  }

  return <NotFoundPage />;
}
