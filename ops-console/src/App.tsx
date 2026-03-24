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
  area: string;
  address: string;
  type: string;
  status: "active" | "inactive" | "maintenance";
  capacity: number;
  contactPhone: string;
  contactEmail: string;
  operatingHours: Record<string, { open: string; close: string } | null>;
  blackoutDates: string[];
  readiness: "ready" | "paused" | "waitlist";
  createdAt?: string;
  updatedAt?: string;
};

type VenueDetail = VenuePartner & {
  recentBookings: DateBooking[];
  timeSlots: Array<{
    id: string;
    venueId: string;
    slotDate: string;
    startTime: string;
    endTime: string;
    maxCapacity: number;
    bookedCount: number;
  }>;
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

type BookingSupportRequest = {
  id: string;
  bookingId: string;
  userId: string;
  type: "cancellation" | "reschedule";
  reason?: string;
  status: "requested" | "under_review" | "approved" | "denied";
  refundStatus?: string;
  newAvailability?: string[];
  resolutionNotes?: string;
  resolvedBy?: string;
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
    pendingGovIdReviews: number;
    activeFreezes: number;
    pendingSupportRequests: number;
  };
  featureToggles: {
    requireGovIdForBooking: boolean;
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
  govIdQueue: Array<{
    id: string;
    userId: string;
    frontImageUrl: string;
    backImageUrl?: string;
    idType: "national_id" | "drivers_license" | "passport" | "voters_card";
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
  supportQueue: BookingSupportRequest[];
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

type ReminderLog = {
  id: string;
  userId: string;
  bookingId?: string;
  channel: "whatsapp" | "sms";
  templateId: string;
  phoneNumber: string;
  status: "sent" | "delivered" | "read" | "failed";
  failureReason?: string;
  sentAt: string;
  deliveredAt?: string;
  readAt?: string;
  failedAt?: string;
};

export function App() {
  const [dashboard, setDashboard] = useState<OpsDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Venue management state
  const [venueView, setVenueView] = useState<"list" | "detail" | "create" | "edit">("list");
  const [selectedVenue, setSelectedVenue] = useState<VenueDetail | null>(null);
  const [venueList, setVenueList] = useState<VenuePartner[]>([]);
  const [venueFilters, setVenueFilters] = useState<{ area: string; status: string; type: string; search: string }>({
    area: "", status: "", type: "", search: ""
  });
  const [venueForm, setVenueForm] = useState({
    name: "", city: "Lagos", area: "", address: "", type: "Cafe",
    capacity: 20, contactPhone: "", contactEmail: ""
  });

  // Delivery log state
  const [deliveryLogs, setDeliveryLogs] = useState<ReminderLog[]>([]);
  const [deliveryLogFilter, setDeliveryLogFilter] = useState<string>("");

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
    fetchDeliveryLogs();
  }, []);

  const fetchDeliveryLogs = async () => {
    try {
      const params = new URLSearchParams();
      if (deliveryLogFilter) params.set("status", deliveryLogFilter);
      params.set("limit", "50");
      const qs = params.toString();
      const response = await fetch(`${API_BASE}/ops/delivery-logs${qs ? `?${qs}` : ""}`, {
        headers: { "x-user-id": "ops-user" }
      });
      if (!response.ok) throw new Error("Failed to fetch delivery logs");
      const data = await response.json();
      setDeliveryLogs(data);
    } catch (err) {
      console.error("Error fetching delivery logs:", err);
    }
  };

  useEffect(() => {
    fetchDeliveryLogs();
  }, [deliveryLogFilter]);

  // ── Venue Management Handlers ────────────────────────────────────

  const fetchVenueList = async () => {
    try {
      const params = new URLSearchParams();
      if (venueFilters.area) params.set("area", venueFilters.area);
      if (venueFilters.status) params.set("status", venueFilters.status);
      if (venueFilters.type) params.set("type", venueFilters.type);
      if (venueFilters.search) params.set("search", venueFilters.search);
      const qs = params.toString();
      const response = await fetch(`${API_BASE}/ops/venues${qs ? `?${qs}` : ""}`, {
        headers: { "x-user-id": "ops-user" }
      });
      if (!response.ok) throw new Error("Failed to fetch venues");
      const data = await response.json();
      setVenueList(data);
    } catch (err) {
      console.error("Error fetching venues:", err);
    }
  };

  const fetchVenueDetail = async (venueId: string) => {
    try {
      setActionLoading(venueId);
      const response = await fetch(`${API_BASE}/ops/venues/${venueId}`, {
        headers: { "x-user-id": "ops-user" }
      });
      if (!response.ok) throw new Error("Failed to fetch venue detail");
      const data = await response.json();
      setSelectedVenue(data);
      setVenueView("detail");
    } catch (err) {
      console.error("Error fetching venue detail:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreateVenue = async () => {
    try {
      setActionLoading("create-venue");
      const response = await fetch(`${API_BASE}/ops/venues`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": "ops-user" },
        body: JSON.stringify(venueForm)
      });
      if (!response.ok) throw new Error("Failed to create venue");
      setVenueForm({ name: "", city: "Lagos", area: "", address: "", type: "Cafe", capacity: 20, contactPhone: "", contactEmail: "" });
      setVenueView("list");
      await fetchVenueList();
      await fetchDashboard();
    } catch (err) {
      console.error("Error creating venue:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateVenue = async (venueId: string, updates: Record<string, unknown>) => {
    try {
      setActionLoading(venueId);
      const response = await fetch(`${API_BASE}/ops/venues/${venueId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-user-id": "ops-user" },
        body: JSON.stringify(updates)
      });
      if (!response.ok) throw new Error("Failed to update venue");
      await fetchVenueList();
      await fetchDashboard();
      if (selectedVenue?.id === venueId) {
        await fetchVenueDetail(venueId);
      }
    } catch (err) {
      console.error("Error updating venue:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleSetVenueStatus = async (venueId: string, status: string) => {
    try {
      setActionLoading(venueId);
      const response = await fetch(`${API_BASE}/ops/venues/${venueId}/${status === "active" ? "activate" : status === "maintenance" ? "maintenance" : "deactivate"}`, {
        method: "POST",
        headers: { "x-user-id": "ops-user" }
      });
      if (!response.ok) throw new Error("Failed to update venue status");
      await fetchVenueList();
      await fetchDashboard();
    } catch (err) {
      console.error("Error updating venue status:", err);
    } finally {
      setActionLoading(null);
    }
  };

  useEffect(() => {
    if (venueView === "list") fetchVenueList();
  }, [venueView, venueFilters]);

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

  const handleApproveGovId = async (submissionId: string) => {
    try {
      setActionLoading(submissionId);
      const response = await fetch(`${API_BASE}/ops/gov-ids/${submissionId}/approve`, {
        method: "POST",
        headers: {
          "x-user-id": "ops-user"
        }
      });
      if (!response.ok) {
        throw new Error("Failed to approve government ID");
      }
      const updatedDashboard = await response.json();
      setDashboard(updatedDashboard);
    } catch (err) {
      console.error("Error approving government ID:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectGovId = async (submissionId: string) => {
    const reason = prompt("Rejection reason (optional):");
    try {
      setActionLoading(submissionId);
      const response = await fetch(`${API_BASE}/ops/gov-ids/${submissionId}/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": "ops-user"
        },
        body: JSON.stringify({ reason: reason || undefined })
      });
      if (!response.ok) {
        throw new Error("Failed to reject government ID");
      }
      const updatedDashboard = await response.json();
      setDashboard(updatedDashboard);
    } catch (err) {
      console.error("Error rejecting government ID:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleApproveSupportRequest = async (requestId: string) => {
    const notes = prompt("Resolution notes (optional):");
    try {
      setActionLoading(requestId);
      const response = await fetch(`${API_BASE}/ops/support-requests/${requestId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": "ops-user" },
        body: JSON.stringify({ notes: notes || undefined })
      });
      if (!response.ok) throw new Error("Failed to approve support request");
      await fetchDashboard();
    } catch (err) {
      console.error("Error approving support request:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDenySupportRequest = async (requestId: string) => {
    const notes = prompt("Denial reason:");
    if (!notes) return;
    try {
      setActionLoading(requestId);
      const response = await fetch(`${API_BASE}/ops/support-requests/${requestId}/deny`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": "ops-user" },
        body: JSON.stringify({ notes })
      });
      if (!response.ok) throw new Error("Failed to deny support request");
      await fetchDashboard();
    } catch (err) {
      console.error("Error denying support request:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleForceCancel = async (bookingId: string) => {
    const reason = prompt("Reason for force cancellation:");
    if (!reason) return;
    try {
      setActionLoading(bookingId);
      const response = await fetch(`${API_BASE}/ops/bookings/${bookingId}/force-cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": "ops-user" },
        body: JSON.stringify({ reason })
      });
      if (!response.ok) throw new Error("Failed to force-cancel booking");
      await fetchDashboard();
    } catch (err) {
      console.error("Error force-cancelling booking:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleGovIdRequirement = async () => {
    if (!dashboard) return;
    const newValue = !dashboard.featureToggles.requireGovIdForBooking;
    const action = newValue ? "enable" : "disable";
    
    if (!confirm(`${newValue ? "Enable" : "Disable"} government ID requirement for booking?`)) {
      return;
    }

    try {
      setActionLoading("toggle-govid");
      const response = await fetch(`${API_BASE}/ops/feature-toggles/require_gov_id_for_booking/${action}`, {
        method: "POST",
        headers: {
          "x-user-id": "ops-user"
        }
      });
      if (!response.ok) {
        throw new Error(`Failed to ${action} feature toggle`);
      }
      const updatedDashboard = await response.json();
      setDashboard(updatedDashboard);
    } catch (err) {
      console.error(`Error toggling gov ID requirement:`, err);
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

  const { overview, moderationQueue, venueNetwork, supportQueue, bookings } = dashboard;

  const inputStyle: React.CSSProperties = {
    padding: "0.5rem", fontSize: "0.9rem", border: "1px solid #ccc", borderRadius: "4px"
  };

  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">Ayuni Operations</p>
        <h1>Support, moderation, and venue coverage in one console.</h1>
        <p className="lede">
          Designed for real-date operations: trust reviews, freeze decisions, venue readiness, and booking escalations.
        </p>
        <div style={{ marginTop: "1rem", fontSize: "0.9rem", opacity: 0.8 }}>
          <strong>Overview:</strong> {overview.pendingReports} pending reports • {overview.pendingSelfieReviews || 0} pending selfies • {overview.pendingGovIdReviews || 0} pending IDs • {overview.pendingSupportRequests || 0} support requests • {overview.activeVenueCount} active
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
          <h2>Government ID Verification ({dashboard.govIdQueue?.length || 0})</h2>
          {(!dashboard.govIdQueue || dashboard.govIdQueue.length === 0) ? (
            <p style={{ opacity: 0.6, fontStyle: "italic" }}>No pending ID reviews</p>
          ) : (
            dashboard.govIdQueue.map((submission) => (
              <div key={submission.id} className="row" style={{ borderBottom: "1px solid #eee", paddingBottom: "1rem", marginBottom: "1rem" }}>
                <div>
                  <strong>{submission.userName || "Unknown User"}</strong>
                  <p style={{ fontSize: "0.85rem", opacity: 0.8 }}>
                    {submission.userPhone || submission.userId}
                  </p>
                  <p style={{ fontSize: "0.85rem", marginTop: "0.25rem" }}>
                    <strong>ID Type:</strong> {submission.idType.replace("_", " ").toUpperCase()}
                  </p>
                  <small>Submitted: {new Date(submission.submittedAt).toLocaleString()}</small>
                  <br/>
                  <div style={{ display: "flex", gap: "1rem", marginTop: "0.5rem" }}>
                    <a 
                      href={submission.frontImageUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{ fontSize: "0.85rem", color: "#C17F5F" }}
                    >
                      View Front Image
                    </a>
                    {submission.backImageUrl && (
                      <a 
                        href={submission.backImageUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{ fontSize: "0.85rem", color: "#C17F5F" }}
                      >
                        View Back Image
                      </a>
                    )}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "0.5rem", flexDirection: "column" }}>
                  <button
                    onClick={() => handleApproveGovId(submission.id)}
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
                    onClick={() => handleRejectGovId(submission.id)}
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
          <h2>Feature Configuration</h2>
          <div className="row" style={{ borderBottom: "1px solid #eee", paddingBottom: "1rem" }}>
            <div>
              <strong>Require Government ID for Booking</strong>
              <p style={{ fontSize: "0.85rem", opacity: 0.8, marginTop: "0.25rem" }}>
                When enabled, users must have an approved government ID before they can book their first date.
              </p>
              <p style={{ fontSize: "0.85rem", marginTop: "0.5rem" }}>
                <strong>Status:</strong> {" "}
                <span style={{ 
                  color: dashboard.featureToggles?.requireGovIdForBooking ? "#4CAF50" : "#999",
                  fontWeight: "bold"
                }}>
                  {dashboard.featureToggles?.requireGovIdForBooking ? "✓ ENABLED" : "○ DISABLED"}
                </span>
              </p>
            </div>
            <div>
              <button
                onClick={handleToggleGovIdRequirement}
                disabled={actionLoading === "toggle-govid"}
                style={{
                  padding: "0.5rem 1rem",
                  fontSize: "0.9rem",
                  backgroundColor: dashboard.featureToggles?.requireGovIdForBooking ? "#f44336" : "#4CAF50",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: actionLoading === "toggle-govid" ? "wait" : "pointer"
                }}
              >
                {actionLoading === "toggle-govid" ? "..." : dashboard.featureToggles?.requireGovIdForBooking ? "Disable" : "Enable"}
              </button>
            </div>
          </div>
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

        <article className="panel" style={{ gridColumn: "1 / -1" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h2>Venue Management ({venueNetwork.length} total, {venueNetwork.filter(v => v.status === "active" || v.readiness === "ready").length} active)</h2>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              {venueView !== "list" && (
                <button
                  onClick={() => { setVenueView("list"); setSelectedVenue(null); }}
                  style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem", cursor: "pointer", backgroundColor: "#6c757d", color: "white", border: "none", borderRadius: "4px" }}
                >
                  Back to List
                </button>
              )}
              {venueView === "list" && (
                <button
                  onClick={() => setVenueView("create")}
                  style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem", cursor: "pointer", backgroundColor: "#C17F5F", color: "white", border: "none", borderRadius: "4px" }}
                >
                  + New Venue
                </button>
              )}
            </div>
          </div>

          {venueView === "create" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1rem" }}>
              <input placeholder="Venue name" value={venueForm.name} onChange={e => setVenueForm(f => ({ ...f, name: e.target.value }))} style={inputStyle} />
              <select value={venueForm.city} onChange={e => setVenueForm(f => ({ ...f, city: e.target.value }))} style={inputStyle}>
                <option value="Lagos">Lagos</option>
                <option value="Abuja">Abuja</option>
                <option value="PortHarcourt">Port Harcourt</option>
              </select>
              <input placeholder="Area / Neighborhood" value={venueForm.area} onChange={e => setVenueForm(f => ({ ...f, area: e.target.value }))} style={inputStyle} />
              <input placeholder="Full address" value={venueForm.address} onChange={e => setVenueForm(f => ({ ...f, address: e.target.value }))} style={inputStyle} />
              <select value={venueForm.type} onChange={e => setVenueForm(f => ({ ...f, type: e.target.value }))} style={inputStyle}>
                <option value="Cafe">Cafe</option>
                <option value="Lounge">Lounge</option>
                <option value="DessertSpot">Dessert Spot</option>
                <option value="Brunch">Brunch</option>
                <option value="CasualRestaurant">Casual Restaurant</option>
                <option value="HotelLobby">Hotel Lobby</option>
              </select>
              <input type="number" placeholder="Capacity" value={venueForm.capacity} onChange={e => setVenueForm(f => ({ ...f, capacity: parseInt(e.target.value) || 0 }))} style={inputStyle} />
              <input placeholder="Contact phone" value={venueForm.contactPhone} onChange={e => setVenueForm(f => ({ ...f, contactPhone: e.target.value }))} style={inputStyle} />
              <input placeholder="Contact email" value={venueForm.contactEmail} onChange={e => setVenueForm(f => ({ ...f, contactEmail: e.target.value }))} style={inputStyle} />
              <div style={{ gridColumn: "1 / -1", display: "flex", gap: "0.5rem" }}>
                <button
                  onClick={handleCreateVenue}
                  disabled={actionLoading === "create-venue" || !venueForm.name || !venueForm.area}
                  style={{ padding: "0.5rem 1.2rem", backgroundColor: "#4CAF50", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}
                >
                  {actionLoading === "create-venue" ? "Creating..." : "Create Venue"}
                </button>
                <button onClick={() => setVenueView("list")} style={{ padding: "0.5rem 1.2rem", border: "1px solid #ccc", borderRadius: "4px", cursor: "pointer", background: "white" }}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {venueView === "detail" && selectedVenue && (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
                <div>
                  <h3 style={{ margin: "0 0 0.5rem" }}>{selectedVenue.name}</h3>
                  <p style={{ margin: "0.25rem 0", fontSize: "0.9rem" }}><strong>City:</strong> {selectedVenue.city}</p>
                  <p style={{ margin: "0.25rem 0", fontSize: "0.9rem" }}><strong>Area:</strong> {selectedVenue.area}</p>
                  <p style={{ margin: "0.25rem 0", fontSize: "0.9rem" }}><strong>Address:</strong> {selectedVenue.address}</p>
                  <p style={{ margin: "0.25rem 0", fontSize: "0.9rem" }}><strong>Type:</strong> {selectedVenue.type}</p>
                </div>
                <div>
                  <p style={{ margin: "0.25rem 0", fontSize: "0.9rem" }}><strong>Status:</strong>{" "}
                    <span style={{ color: selectedVenue.status === "active" ? "#4CAF50" : selectedVenue.status === "maintenance" ? "#ffc107" : "#dc3545", fontWeight: "bold" }}>
                      {selectedVenue.status.toUpperCase()}
                    </span>
                  </p>
                  <p style={{ margin: "0.25rem 0", fontSize: "0.9rem" }}><strong>Capacity:</strong> {selectedVenue.capacity}</p>
                  <p style={{ margin: "0.25rem 0", fontSize: "0.9rem" }}><strong>Phone:</strong> {selectedVenue.contactPhone || "N/A"}</p>
                  <p style={{ margin: "0.25rem 0", fontSize: "0.9rem" }}><strong>Email:</strong> {selectedVenue.contactEmail || "N/A"}</p>
                </div>
              </div>

              {selectedVenue.operatingHours && (
                <div style={{ marginBottom: "1.5rem" }}>
                  <h4 style={{ margin: "0 0 0.5rem" }}>Operating Hours (WAT)</h4>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "0.5rem", fontSize: "0.8rem" }}>
                    {["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].map(day => {
                      const hours = selectedVenue.operatingHours?.[day];
                      return (
                        <div key={day} style={{ backgroundColor: "#f8f9fa", padding: "0.5rem", borderRadius: "4px", textAlign: "center" }}>
                          <strong>{day.slice(0, 3).toUpperCase()}</strong>
                          <p style={{ margin: "0.25rem 0 0", fontSize: "0.75rem" }}>
                            {hours ? `${hours.open}-${hours.close}` : "Closed"}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem" }}>
                {selectedVenue.status !== "active" && (
                  <button onClick={() => handleSetVenueStatus(selectedVenue.id, "active")} disabled={actionLoading === selectedVenue.id}
                    style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem", backgroundColor: "#4CAF50", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>
                    Activate
                  </button>
                )}
                {selectedVenue.status !== "inactive" && (
                  <button onClick={() => handleSetVenueStatus(selectedVenue.id, "inactive")} disabled={actionLoading === selectedVenue.id}
                    style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem", backgroundColor: "#dc3545", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>
                    Deactivate
                  </button>
                )}
                {selectedVenue.status !== "maintenance" && (
                  <button onClick={() => handleSetVenueStatus(selectedVenue.id, "maintenance")} disabled={actionLoading === selectedVenue.id}
                    style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem", backgroundColor: "#ffc107", color: "#333", border: "none", borderRadius: "4px", cursor: "pointer" }}>
                    Set Maintenance
                  </button>
                )}
              </div>

              {selectedVenue.timeSlots && selectedVenue.timeSlots.length > 0 && (
                <div style={{ marginBottom: "1.5rem" }}>
                  <h4 style={{ margin: "0 0 0.5rem" }}>Upcoming Time Slots</h4>
                  {selectedVenue.timeSlots.map(slot => (
                    <div key={slot.id} style={{ fontSize: "0.85rem", padding: "0.5rem", backgroundColor: "#f8f9fa", marginBottom: "0.25rem", borderRadius: "4px", display: "flex", justifyContent: "space-between" }}>
                      <span>{slot.slotDate} • {slot.startTime}-{slot.endTime}</span>
                      <span>{slot.bookedCount}/{slot.maxCapacity} booked</span>
                    </div>
                  ))}
                </div>
              )}

              <div>
                <h4 style={{ margin: "0 0 0.5rem" }}>Recent Bookings ({selectedVenue.recentBookings?.length || 0})</h4>
                {(!selectedVenue.recentBookings || selectedVenue.recentBookings.length === 0) ? (
                  <p style={{ opacity: 0.6, fontStyle: "italic", fontSize: "0.9rem" }}>No bookings at this venue yet</p>
                ) : (
                  selectedVenue.recentBookings.map(b => (
                    <div key={b.id} style={{ fontSize: "0.85rem", padding: "0.5rem", backgroundColor: "#f8f9fa", marginBottom: "0.25rem", borderRadius: "4px" }}>
                      <strong>{b.id}</strong> • {b.counterpartName} • Status: {b.status} • {b.startAt ? new Date(b.startAt).toLocaleDateString() : "TBD"}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {venueView === "list" && (
            <>
              <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
                <input
                  placeholder="Search venues..."
                  value={venueFilters.search}
                  onChange={e => setVenueFilters(f => ({ ...f, search: e.target.value }))}
                  style={{ ...inputStyle, flex: "1", minWidth: "150px" }}
                />
                <select value={venueFilters.status} onChange={e => setVenueFilters(f => ({ ...f, status: e.target.value }))} style={{ ...inputStyle, width: "auto" }}>
                  <option value="">All statuses</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="maintenance">Maintenance</option>
                </select>
                <select value={venueFilters.type} onChange={e => setVenueFilters(f => ({ ...f, type: e.target.value }))} style={{ ...inputStyle, width: "auto" }}>
                  <option value="">All types</option>
                  <option value="Cafe">Cafe</option>
                  <option value="Lounge">Lounge</option>
                  <option value="DessertSpot">Dessert Spot</option>
                  <option value="Brunch">Brunch</option>
                  <option value="CasualRestaurant">Casual Restaurant</option>
                  <option value="HotelLobby">Hotel Lobby</option>
                </select>
                <input
                  placeholder="Filter by area..."
                  value={venueFilters.area}
                  onChange={e => setVenueFilters(f => ({ ...f, area: e.target.value }))}
                  style={{ ...inputStyle, width: "150px" }}
                />
              </div>
              {venueList.length === 0 && venueNetwork.length === 0 ? (
                <p style={{ opacity: 0.6, fontStyle: "italic" }}>No venues found</p>
              ) : (
                (venueList.length > 0 ? venueList : venueNetwork).map((venue) => (
                  <div key={venue.id} className="row" style={{ cursor: "pointer" }} onClick={() => fetchVenueDetail(venue.id)}>
                    <div>
                      <strong>{venue.name}</strong>
                      <p>
                        {venue.city} • {venue.area}
                      </p>
                      <small>Type: {venue.type} • Capacity: {venue.capacity || "N/A"}</small>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", alignItems: "flex-end" }}>
                      <span className={`pill ${venue.status === "active" ? "ready" : venue.status === "maintenance" ? "waitlist" : "paused"}`}>
                        {venue.status || venue.readiness}
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleToggleVenue(venue.id); }}
                        disabled={actionLoading === venue.id}
                        style={{
                          padding: "0.25rem 0.5rem",
                          fontSize: "0.8rem",
                          cursor: actionLoading === venue.id ? "wait" : "pointer"
                        }}
                      >
                        {actionLoading === venue.id ? "..." : venue.status === "active" || venue.readiness === "ready" ? "Pause" : "Activate"}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </>
          )}
        </article>

        <article className="panel">
          <h2>Support Queue ({supportQueue?.length || 0})</h2>
          {(!supportQueue || supportQueue.length === 0) ? (
            <p style={{ opacity: 0.6, fontStyle: "italic" }}>No pending support requests</p>
          ) : (
            supportQueue.map((req) => (
              <div key={req.id} className="row">
                <div>
                  <strong style={{ textTransform: "capitalize" }}>{req.type}</strong>
                  <p>
                    Booking: {req.bookingId} &bull; User: {req.userId}
                  </p>
                  {req.reason && <small>Reason: {req.reason}</small>}
                  {req.newAvailability && (
                    <small style={{ display: "block" }}>
                      New availability: {req.newAvailability.join(", ")}
                    </small>
                  )}
                  <small style={{ display: "block", marginTop: "0.25rem" }}>
                    Submitted: {new Date(req.createdAt).toLocaleString()}
                    {req.refundStatus && ` • Refund: ${req.refundStatus}`}
                  </small>
                </div>
                <div style={{ display: "flex", gap: "0.5rem", flexDirection: "column", alignItems: "flex-end" }}>
                  <span className={`pill ${req.status === "requested" ? "waitlist" : "paused"}`}>
                    {req.status}
                  </span>
                  {(req.status === "requested" || req.status === "under_review") && (
                    <div style={{ display: "flex", gap: "0.25rem" }}>
                      <button
                        onClick={() => handleApproveSupportRequest(req.id)}
                        disabled={actionLoading === req.id}
                        style={{ padding: "0.25rem 0.5rem", fontSize: "0.8rem", background: "#4CAF50", color: "#fff", border: "none", borderRadius: "4px", cursor: actionLoading === req.id ? "wait" : "pointer" }}
                      >
                        {actionLoading === req.id ? "..." : "Approve"}
                      </button>
                      <button
                        onClick={() => handleDenySupportRequest(req.id)}
                        disabled={actionLoading === req.id}
                        style={{ padding: "0.25rem 0.5rem", fontSize: "0.8rem", background: "#f44336", color: "#fff", border: "none", borderRadius: "4px", cursor: actionLoading === req.id ? "wait" : "pointer" }}
                      >
                        {actionLoading === req.id ? "..." : "Deny"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
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
                  {booking.status !== "cancelled" && booking.status !== "completed" && (
                    <button
                      onClick={() => handleForceCancel(booking.id)}
                      disabled={actionLoading === booking.id}
                      style={{
                        marginTop: "0.25rem",
                        padding: "0.25rem 0.5rem",
                        fontSize: "0.75rem",
                        background: "#f44336",
                        color: "#fff",
                        border: "none",
                        borderRadius: "4px",
                        cursor: actionLoading === booking.id ? "wait" : "pointer"
                      }}
                    >
                      {actionLoading === booking.id ? "..." : "Force Cancel"}
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </article>

        <article className="panel">
          <h2>Delivery Logs ({deliveryLogs.length})</h2>
          <div style={{ marginBottom: "1rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {["", "sent", "delivered", "read", "failed"].map(f => (
              <button
                key={f}
                onClick={() => setDeliveryLogFilter(f)}
                style={{
                  padding: "0.3rem 0.6rem",
                  fontSize: "0.8rem",
                  backgroundColor: deliveryLogFilter === f ? "#C17F5F" : "#eee",
                  color: deliveryLogFilter === f ? "white" : "#333",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer"
                }}
              >
                {f || "All"}
              </button>
            ))}
          </div>
          {deliveryLogs.length === 0 ? (
            <p style={{ opacity: 0.6, fontStyle: "italic" }}>No delivery logs</p>
          ) : (
            deliveryLogs.map((log) => (
              <div key={log.id} className="row" style={{ borderBottom: "1px solid #eee", paddingBottom: "0.75rem", marginBottom: "0.75rem" }}>
                <div>
                  <strong style={{ textTransform: "capitalize" }}>{log.channel}</strong>
                  <span style={{ marginLeft: "0.5rem", fontSize: "0.85rem", opacity: 0.7 }}>
                    {log.templateId.replace(/_/g, " ")}
                  </span>
                  <p style={{ fontSize: "0.85rem", margin: "0.25rem 0" }}>
                    {log.phoneNumber} • User: {log.userId.slice(0, 12)}...
                  </p>
                  <small>{new Date(log.sentAt).toLocaleString()}</small>
                  {log.failureReason && (
                    <p style={{ fontSize: "0.8rem", color: "#dc3545", margin: "0.25rem 0 0" }}>
                      {log.failureReason}
                    </p>
                  )}
                </div>
                <span className={`pill ${log.status === "delivered" || log.status === "read" ? "ready" : log.status === "failed" ? "paused" : "waitlist"}`}>
                  {log.status}
                </span>
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

