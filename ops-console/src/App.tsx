import { useEffect, useState } from "react";

type SafetyReport = {
  id: string;
  reporterUserId: string;
  category: "UnsafeBehavior" | "FalseInfo" | "NoShow" | "VenueIssue" | "Other" | "LateArrival";
  summary: string;
  severity: "low" | "medium" | "high";
  status: "open" | "investigating" | "resolved";
  createdAt: string;
  investigatedAt?: string;
  investigatedBy?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  resolutionNotes?: string;
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
    pendingSelfieReviews: number;
    activeFreezes: number;
  };
  moderationQueue: SafetyReport[];
  selfieQueue: Array<{
    id: string;
    userId: string;
    imageUrl: string;
    reviewStatus: "pending" | "approved" | "rejected";
    submittedAt: string;
    userName?: string;
    userPhone?: string;
  }>;
  safety: {
    trustedContactName: string;
    trustedContactChannel: string;
    incidents: Array<{
      id: string;
      type: "NoShow" | "LateCancellation";
      bookingId: string;
      occurredAt: string;
      reportId?: string;
    }>;
    activeFreeze?: {
      id: string;
      reason: string;
      incidentCount: number;
      frozenAt: string;
      frozenUntil: string;
      canAppeal: boolean;
    };
    warnings: number;
    tokenLossPenalties: number;
  };
  venueNetwork: VenuePartner[];
  bookings: DateBooking[];
  reactions: Array<{
    profileId: string;
    displayName: string;
    city: string;
    reaction: string;
  }>;
};

// API Configuration
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/v1";

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

  const handleInvestigateReport = async (reportId: string) => {
    try {
      setActionLoading(reportId);
      const response = await fetch(`${API_BASE}/ops/reports/${reportId}/investigate`, {
        method: "POST",
        headers: {
          "x-user-id": "demo-user"
        }
      });
      if (!response.ok) {
        throw new Error("Failed to investigate report");
      }
      const updatedDashboard = await response.json();
      setDashboard(updatedDashboard);
    } catch (err) {
      console.error("Error investigating report:", err);
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

  const handleApproveSelfie = async (submissionId: string) => {
    try {
      setActionLoading(submissionId);
      const response = await fetch(`${API_BASE}/ops/selfies/${submissionId}/approve`, {
        method: "POST",
        headers: {
          "x-user-id": "ops-user"
        }
      });
      if (!response.ok) {
        throw new Error("Failed to approve selfie");
      }
      const updatedDashboard = await response.json();
      setDashboard(updatedDashboard);
    } catch (err) {
      console.error("Error approving selfie:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectSelfie = async (submissionId: string) => {
    try {
      setActionLoading(submissionId);
      const response = await fetch(`${API_BASE}/ops/selfies/${submissionId}/reject`, {
        method: "POST",
        headers: {
          "x-user-id": "ops-user"
        }
      });
      if (!response.ok) {
        throw new Error("Failed to reject selfie");
      }
      const updatedDashboard = await response.json();
      setDashboard(updatedDashboard);
    } catch (err) {
      console.error("Error rejecting selfie:", err);
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
          <strong>Overview:</strong> {overview.pendingReports} pending reports • {overview.pendingSelfieReviews || 0} pending selfies • {overview.activeVenueCount} active
          venues • {overview.totalAcceptedThisRound} accepted / {overview.totalDeclinedThisRound} declined this round
        </div>
      </section>

      <section className="grid">
        <article className="panel">
          <h2>Selfie verification ({dashboard.selfieQueue?.length || 0})</h2>
          {(!dashboard.selfieQueue || dashboard.selfieQueue.length === 0) ? (
            <p style={{ opacity: 0.6, fontStyle: "italic" }}>No pending selfie reviews</p>
          ) : (
            dashboard.selfieQueue.map((submission) => (
              <div key={submission.id} className="row">
                <div>
                  <strong>{submission.userName || "Unknown User"}</strong>
                  <p style={{ fontSize: "0.85rem", opacity: 0.8 }}>
                    {submission.userPhone || submission.userId}
                  </p>
                  <small>Submitted: {new Date(submission.submittedAt).toLocaleString()}</small>
                  <br/>
                  <a 
                    href={submission.imageUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ fontSize: "0.85rem", color: "#C17F5F" }}
                  >
                    View Image
                  </a>
                </div>
                <div style={{ display: "flex", gap: "0.5rem", flexDirection: "column" }}>
                  <button
                    onClick={() => handleApproveSelfie(submission.id)}
                    disabled={actionLoading === submission.id}
                    style={{
                      padding: "0.4rem 0.8rem",
                      fontSize: "0.85rem",
                      backgroundColor: "#4CAF50",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: actionLoading === submission.id ? "wait" : "pointer"
                    }}
                  >
                    {actionLoading === submission.id ? "..." : "✓ Approve"}
                  </button>
                  <button
                    onClick={() => handleRejectSelfie(submission.id)}
                    disabled={actionLoading === submission.id}
                    style={{
                      padding: "0.4rem 0.8rem",
                      fontSize: "0.85rem",
                      backgroundColor: "#f44336",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: actionLoading === submission.id ? "wait" : "pointer"
                    }}
                  >
                    {actionLoading === submission.id ? "..." : "✗ Reject"}
                  </button>
                </div>
              </div>
            ))
          )}
        </article>

        <article className="panel">
          <h2>Account Safety & Freezes</h2>
         {dashboard.safety?.activeFreeze ? (
            <div className="row" style={{ backgroundColor: '#fff3cd', borderRadius: '8px', padding: '1rem' }}>
              <div>
                <strong style={{ color: '#dc3545' }}>🔒 Account Frozen</strong>
                <p style={{ margin: '0.5rem 0' }}><strong>Reason:</strong> {dashboard.safety.activeFreeze.reason}</p>
                <p style={{ margin: '0.25rem 0' }}><strong>Frozen Until:</strong> {new Date(dashboard.safety.activeFreeze.frozenUntil).toLocaleDateString()}</p>
                <small>Incident Count: {dashboard.safety.activeFreeze.incidentCount}</small>
                {dashboard.safety.activeFreeze.canAppeal && (
                  <small style={{ display: 'block', marginTop: '0.5rem', color: '#856404' }}>
                    User can appeal this freeze
                  </small>
                )}
              </div>
              <div>
                <button
                  style={{
                    padding: "0.5rem 1rem",
                    backgroundColor: "#28a745",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer"
                  }}
                >
                  Lift Freeze
                </button>
              </div>
            </div>
          ) : (
            <div>
              <p style={{ marginBottom: '1rem' }}><strong>Status:</strong> <span style={{ color: '#28a745' }}>✓ Active</span></p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                <div style={{ backgroundColor: '#f8f9fa', padding: '0.75rem', borderRadius: '4px' }}>
                  <small style={{ color: '#666' }}>Incidents (90 days)</small>
                  <p style={{ fontSize: '1.5rem', margin: '0.25rem 0', fontWeight: 'bold' }}>
                    {dashboard.safety?.incidents?.filter(i => {
                      const ninetyDaysAgo = new Date();
                      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
                      return new Date(i.occurredAt) >= ninetyDaysAgo;
                    }).length || 0}
                  </p>
                </div>
                <div style={{ backgroundColor: '#fff3cd', padding: '0.75rem', borderRadius: '4px' }}>
                  <small style={{ color: '#666' }}>Warnings</small>
                  <p style={{ fontSize: '1.5rem', margin: '0.25rem 0', fontWeight: 'bold' }}>{dashboard.safety?.warnings || 0}</p>
                </div>
                <div style={{ backgroundColor: '#f8d7da', padding: '0.75rem', borderRadius: '4px' }}>
                  <small style={{ color: '#666' }}>Token Penalties</small>
                  <p style={{ fontSize: '1.5rem', margin: '0.25rem 0', fontWeight: 'bold' }}>{dashboard.safety?.tokenLossPenalties || 0}</p>
                </div>
              </div>
              {dashboard.safety?.incidents && dashboard.safety.incidents.length > 0 && (
                <div style={{ marginTop: '1rem' }}>
                  <small style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>Recent Incidents:</small>
                  {dashboard.safety.incidents.slice(0, 3).map(incident => (
                    <div key={incident.id} style={{ fontSize: '0.85rem', padding: '0.5rem', backgroundColor: '#f8f9fa', marginBottom: '0.25rem', borderRadius: '4px' }}>
                      <strong>{incident.type}</strong> • Booking {incident.bookingId} • {new Date(incident.occurredAt).toLocaleDateString()}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </article>

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
                  {item.investigatedAt && (
                    <small style={{ display: 'block', marginTop: '0.25rem', color: '#666' }}>
                      Investigating since {new Date(item.investigatedAt).toLocaleString()}
                    </small>
                  )}
                </div>
                <div>
                  <span className={`pill ${item.severity}`}>{item.severity}</span>
                  <span className={`pill ${item.status}`} style={{ marginLeft: '0.5rem' }}>{item.status}</span>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                    {item.status === "open" && (
                      <button
                        onClick={() => handleInvestigateReport(item.id)}
                        disabled={actionLoading === item.id}
                        style={{
                          padding: "0.25rem 0.5rem",
                          fontSize: "0.8rem",
                          cursor: actionLoading === item.id ? "wait" : "pointer",
                          backgroundColor: "#ffc107",
                          border: "none",
                          borderRadius: "4px"
                        }}
                      >
                        {actionLoading === item.id ? "Investigating..." : "Investigate"}
                      </button>
                    )}
                    {item.status !== "resolved" && (
                      <button
                        onClick={() => handleResolveReport(item.id)}
                        disabled={actionLoading === item.id}
                        style={{
                          padding: "0.25rem 0.5rem",
                          fontSize: "0.8rem",
                          cursor: actionLoading === item.id ? "wait" : "pointer",
                          backgroundColor: "#28a745",
                          border: "none",
                          borderRadius: "4px",
                          color: "white"
                        }}
                      >
                        {actionLoading === item.id ? "Resolving..." : "Resolve"}
                      </button>
                    )}
                  </div>
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

