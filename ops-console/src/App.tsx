import { useEffect, useState } from "react";

type SafetyReport = {
  id: string;
  reporterUserId: string;
  category: "UnsafeBehavior" | "FalseInfo" | "NoShow" | "VenueIssue" | "Other";
  summary: string;
  severity: "low" | "medium" | "high";
  status: "open" | "resolved";
  createdAt: string;
};

type VenuePartner = {
  id: string;
  name: string;
  city: string;
  readiness: "ready" | "paused" | "waitlist";
  address: string;
  neighborhood: string;
  googleMapsUrl: string;
  contactPhone: string;
  capacity: number;
};

type DateBooking = {
  id: string;
  matchId: string;
  status: string;
  venueName: string;
  city: string;
  dateType: string;
  startAt: string;
  logisticsChatOpensBeforeHours: number;
  checkInStatus: string;
  tokenAmountNgn: number;
  bothPaid: boolean;
  counterpartName: string;
  venueAddress: string;
  availability?: string[];
  createdAt: string;
  updatedAt: string;
};

type OpsDashboard = {
  overview: {
    pendingReports: number;
    activeVenueCount: number;
    totalAcceptedThisRound: number;
    totalDeclinedThisRound: number;
    onboardingCompleted: boolean;
    supportWindow: string;
  };
  moderationQueue: SafetyReport[];
  venueNetwork: VenuePartner[];
  bookings: DateBooking[];
  reactions: Array<{
    profileId: string;
    displayName: string;
    city: string;
    reaction: string;
  }>;
};

const API_BASE = "http://localhost:3000/v1";

export function App() {
  const [dashboard, setDashboard] = useState<OpsDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/ops/dashboard`, {
        headers: {
          "x-user-id": "demo-user"
        }
      });
      if (!response.ok) {
        throw new Error("Failed to fetch dashboard");
      }
      const data = await response.json();
      setDashboard(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleResolveReport = async (reportId: string) => {
    try {
      setActionLoading(reportId);
      const response = await fetch(`${API_BASE}/ops/reports/${reportId}/resolve`, {
        method: "POST",
        headers: {
          "x-user-id": "demo-user"
        }
      });
      if (!response.ok) {
        throw new Error("Failed to resolve report");
      }
      const updatedDashboard = await response.json();
      setDashboard(updatedDashboard);
    } catch (err) {
      console.error("Error resolving report:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleVenue = async (venueId: string) => {
    try {
      setActionLoading(venueId);
      const response = await fetch(`${API_BASE}/ops/venues/${venueId}/toggle`, {
        method: "POST"
      });
      if (!response.ok) {
        throw new Error("Failed to toggle venue");
      }
      const updatedDashboard = await response.json();
      setDashboard(updatedDashboard);
    } catch (err) {
      console.error("Error toggling venue:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleEscalateBooking = async (bookingId: string) => {
    try {
      setActionLoading(bookingId);
      const response = await fetch(`${API_BASE}/ops/bookings/${bookingId}/escalate`, {
        method: "POST",
        headers: {
          "x-user-id": "demo-user"
        }
      });
      if (!response.ok) {
        throw new Error("Failed to escalate booking");
      }
      const updatedDashboard = await response.json();
      setDashboard(updatedDashboard);
    } catch (err) {
      console.error("Error escalating booking:", err);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <main className="shell">
        <section className="hero">
          <p className="eyebrow">Ayuni Operations</p>
          <h1>Loading dashboard...</h1>
        </section>
      </main>
    );
  }

  if (error || !dashboard) {
    return (
      <main className="shell">
        <section className="hero">
          <p className="eyebrow">Ayuni Operations</p>
          <h1>Error loading dashboard</h1>
          <p className="lede">{error || "Unknown error occurred"}</p>
          <button onClick={fetchDashboard}>Retry</button>
        </section>
      </main>
    );
  }

  const { overview, moderationQueue, venueNetwork, bookings } = dashboard;

  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">Ayuni Operations</p>
        <h1>Support, moderation, and venue coverage in one console.</h1>
        <p className="lede">
          Designed for real-date operations: trust reviews, freeze decisions, venue readiness, and booking escalations.
        </p>
        <div style={{ marginTop: "1rem", fontSize: "0.9rem", opacity: 0.8 }}>
          <strong>Overview:</strong> {overview.pendingReports} pending reports • {overview.activeVenueCount} active
          venues • {overview.totalAcceptedThisRound} accepted / {overview.totalDeclinedThisRound} declined this round
        </div>
      </section>

      <section className="grid">
        <article className="panel">
          <h2>Moderation queue ({moderationQueue.length})</h2>
          {moderationQueue.length === 0 ? (
            <p style={{ opacity: 0.6, fontStyle: "italic" }}>No pending reports</p>
          ) : (
            moderationQueue.map((item) => (
              <div key={item.id} className="row">
                <div>
                  <strong>{item.id}</strong>
                  <p>{item.summary}</p>
                  <small>Category: {item.category}</small>
                </div>
                <div>
                  <span className={`pill ${item.severity}`}>{item.severity}</span>
                  <button
                    onClick={() => handleResolveReport(item.id)}
                    disabled={actionLoading === item.id}
                    style={{
                      marginTop: "0.5rem",
                      padding: "0.25rem 0.5rem",
                      fontSize: "0.8rem",
                      cursor: actionLoading === item.id ? "wait" : "pointer"
                    }}
                  >
                    {actionLoading === item.id ? "Resolving..." : "Resolve"}
                  </button>
                </div>
              </div>
            ))
          )}
        </article>

        <article className="panel">
          <h2>Venue network ({venueNetwork.length})</h2>
          {venueNetwork.map((venue) => (
            <div key={venue.id} className="row">
              <div>
                <strong>{venue.name}</strong>
                <p>
                  {venue.city} • {venue.neighborhood}
                </p>
                <small>Capacity: {venue.capacity}</small>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", alignItems: "flex-end" }}>
                <span className={`pill ${venue.readiness}`}>{venue.readiness}</span>
                <button
                  onClick={() => handleToggleVenue(venue.id)}
                  disabled={actionLoading === venue.id}
                  style={{
                    padding: "0.25rem 0.5rem",
                    fontSize: "0.8rem",
                    cursor: actionLoading === venue.id ? "wait" : "pointer"
                  }}
                >
                  {actionLoading === venue.id ? "..." : venue.readiness === "ready" ? "Pause" : "Activate"}
                </button>
              </div>
            </div>
          ))}
        </article>

        <article className="panel">
          <h2>Bookings ({bookings.length})</h2>
          {bookings.length === 0 ? (
            <p style={{ opacity: 0.6, fontStyle: "italic" }}>No bookings yet</p>
          ) : (
            bookings.map((booking) => (
              <div key={booking.id} className="row">
                <div>
                  <strong>{booking.id}</strong>
                  <p>
                    {booking.counterpartName} • {booking.venueName}
                  </p>
                  <small>
                    Status: {booking.status} • Check-in: {booking.checkInStatus}
                  </small>
                </div>
                <div>
                  <span className={`pill ${booking.bothPaid ? "ready" : "waitlist"}`}>
                    {booking.bothPaid ? "Paid" : "Pending"}
                  </span>
                  {booking.checkInStatus !== "SupportFlagged" && (
                    <button
                      onClick={() => handleEscalateBooking(booking.id)}
                      disabled={actionLoading === booking.id}
                      style={{
                        marginTop: "0.5rem",
                        padding: "0.25rem 0.5rem",
                        fontSize: "0.8rem",
                        cursor: actionLoading === booking.id ? "wait" : "pointer"
                      }}
                    >
                      {actionLoading === booking.id ? "..." : "Escalate"}
                    </button>
                  )}
                  {booking.checkInStatus === "SupportFlagged" && (
                    <span style={{ fontSize: "0.8rem", color: "orange" }}>⚠ Escalated</span>
                  )}
                </div>
              </div>
            ))
          )}
        </article>

        <article className="panel">
          <h2>Reactions ({dashboard.reactions.length})</h2>
          {dashboard.reactions.length === 0 ? (
            <p style={{ opacity: 0.6, fontStyle: "italic" }}>No reactions yet</p>
          ) : (
            dashboard.reactions.slice(0, 5).map((reaction) => (
              <div key={reaction.profileId} className="row">
                <div>
                  <strong>{reaction.displayName}</strong>
                  <p>{reaction.city}</p>
                </div>
                <span className={`pill ${reaction.reaction === "Accepted" ? "ready" : "paused"}`}>
                  {reaction.reaction}
                </span>
              </div>
            ))
          )}
        </article>
      </section>
    </main>
  );
}

