export type City = "Lagos" | "Abuja" | "PortHarcourt";
export type DatingIntent = "SeriousRelationship" | "IntentionalDating";
export type DateType = "Cafe" | "Lounge" | "DessertSpot" | "Brunch" | "CasualRestaurant" | "HotelLobby";
export type BadgeTone = "Trust" | "Intentional" | "Boost";
export type HighlightTone = "Light" | "Rich";
export type CheckInStatus = "Pending" | "Confirmed" | "SupportFlagged";
export type BookingStatus = "intent" | "availability_submitted" | "payment_pending" | "confirmed" | "completed" | "cancelled";
export type ShareChannel = "WhatsApp" | "SMS";
export type NotificationCategory = "Update" | "Booking" | "Cancellation";
export type NotificationType = "new_round" | "booking_update" | "payment_required" | "reminder" | "verification_update" | "safety_alert" | "general";
export type DevicePlatform = "android" | "ios";
export type RoundReaction = "Accepted" | "Declined";
export type PaymentMethod = "card" | "bank_transfer" | "ussd";
export type PaymentStatus = "initiated" | "pending" | "completed" | "failed" | "refunded";
export type ReportSeverity = "high" | "medium";
export type ReportStatus = "open" | "investigating" | "resolved";

export type Session = {
  id: string;
  userId: string;
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string;
  refreshTokenExpiresAt: string;
  deviceInfo?: string;
  createdAt: string;
  updatedAt: string;
  lastUsedAt: string;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string;
  refreshTokenExpiresAt: string;
};

export type VerificationStatus = {
  phoneVerified: boolean;
  selfieVerified: boolean;
  governmentIdVerified: boolean;
  idRequiredBeforeDate: boolean;
  govIdStatus?: "not_submitted" | "pending_review" | "approved" | "rejected";
  govIdSubmissionId?: string;
  govIdRejectionReason?: string;
};

export type SignupMethod = "Phone";
export type OnboardingStep = "Welcome" | "PhoneEntry" | "OtpVerification" | "BasicProfile" | "Complete";

export type OnboardingState = {
  signupMethod: SignupMethod;
  step: OnboardingStep;
  completed: boolean;
  phoneNumber: string;
};

export type ProfileBadge = {
  label: string;
  tone: BadgeTone;
};

export type ProfileHighlight = {
  title: string;
  body: string;
  tone: HighlightTone;
};

export type SuggestionProfile = {
  id: string;
  displayName: string;
  age: number;
  gender: string;
  heightCm: number;
  city: City;
  bio: string;
  intent: DatingIntent;
  preferredDateType: DateType;
  trustScore: number;
  occupation: string;
  education: string;
  neighborhood: string;
  languages: string[];
  compatibilityHeadline: string;
  profilePrompt: string;
  venuePreview: string;
  photoMoments: string[];
  traitTags: string[];
  interestTags: string[];
  preferenceTags: string[];
  badges: ProfileBadge[];
  highlights: ProfileHighlight[];
};

export type DateBooking = {
  id: string;
  matchId: string;
  status: BookingStatus;
  venueName: string;
  city: City;
  dateType: DateType;
  startAt: string;
  logisticsChatOpensBeforeHours: number;
  checkInStatus: CheckInStatus;
  tokenAmountNgn: number;
  bothPaid: boolean;
  counterpartName: string;
  venueAddress: string;
  availability?: string[];
  cancellationReason?: string;
  cancelledAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type SafetyState = {
  trustedContactName: string;
  trustedContactChannel: ShareChannel;
  incidents: SafetyIncident[];
  activeFreeze?: AccountFreeze;
  warnings: number;
  tokenLossPenalties: number;
};

export type SafetyIncident = {
  id: string;
  type: "NoShow" | "LateCancellation";
  bookingId: string;
  occurredAt: string;
  reportId?: string;
};

export type AccountFreeze = {
  id: string;
  reason: string;
  incidentCount: number;
  frozenAt: string;
  frozenUntil: string;
  canAppeal: boolean;
};

export type MatchroundState = {
  currentWindowLabel: string;
  nextMatchroundLabel: string;
  countdown: string;
  usersLeftToday: number;
};

export type UserSummary = {
  firstName: string;
  completionScore: number;
  completionLabel: string;
  profilePhotoMood: string;
  badges: ProfileBadge[];
};

export type ProfileQa = {
  question: string;
  answer: string;
};

export type EditableProfile = {
  mediaSlots: string[];
  interests: string[];
  traits: string[];
  bio: string;
  qas: ProfileQa[];
  religion: string[];
  smoking: string;
  drinking: string;
  education: string;
  job: string;
  datingIntention: string;
  sexualOrientation: string;
  languages: string[];
};

export type DatingPreferences = {
  ageRange: string;
  genderIdentity: string;
  heightRange: string;
  dateCities: string[];
  dateAreas: string[];
  preferredDateActivities: string[];
};

export type AccountSettings = {
  name: string;
  gender: string;
  birthDate: string;
  height: string;
  residence: string;
  educationLevel: string;
  email: string;
  phoneNumber: string;
};

export type AppPreferences = {
  notifications: string;
  appLanguage: string;
};

export type InboxNotification = {
  id: string;
  title: string;
  body: string;
  timestampLabel: string;
  category: NotificationCategory;
  notificationType?: NotificationType;
  readAt?: string;
  deepLinkTarget?: string;
  deepLinkId?: string;
};

export type DeviceToken = {
  id: string;
  userId: string;
  platform: DevicePlatform;
  token: string;
  createdAt: string;
  updatedAt: string;
};

export type NotificationPreferences = {
  userId: string;
  newRound: boolean;
  bookingUpdate: boolean;
  paymentRequired: boolean;
  reminder: boolean;
  verificationUpdate: boolean;
  safetyAlert: boolean;
  pushEnabled: boolean;
  inboxEnabled: boolean;
};

export type PushPayload = {
  title: string;
  body: string;
  data?: Record<string, string>;
};

export type SafetyReport = {
  id: string;
  bookingId: string;
  category: "LateArrival" | "NoShow" | "UnsafeBehavior";
  details: string;
  severity: ReportSeverity;
  status: ReportStatus;
  createdAt: string;
  investigatedAt?: string;
  investigatedBy?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  resolutionNotes?: string;
};

export type VenueStatus = "active" | "inactive" | "maintenance";

export type OperatingHours = {
  [day in "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday"]?: { open: string; close: string } | null;
};

export type VenueTimeSlot = {
  id: string;
  venueId: string;
  slotDate: string;
  startTime: string;
  endTime: string;
  maxCapacity: number;
  bookedCount: number;
};

export type VenuePartner = {
  id: string;
  name: string;
  city: City;
  area: string;
  address: string;
  type: DateType;
  status: VenueStatus;
  capacity: number;
  contactPhone: string;
  contactEmail: string;
  operatingHours: OperatingHours;
  blackoutDates: string[];
  readiness: "ready" | "waitlist" | "paused";
  createdAt?: string;
  updatedAt?: string;
};

export type CreateVenuePayload = {
  name: string;
  city: City;
  area: string;
  address: string;
  type: DateType;
  capacity: number;
  contactPhone?: string;
  contactEmail?: string;
  operatingHours?: OperatingHours;
};

export type UpdateVenuePayload = Partial<Omit<CreateVenuePayload, "city">> & {
  status?: VenueStatus;
  blackoutDates?: string[];
};

export type VenueListFilter = {
  area?: string;
  status?: VenueStatus;
  type?: DateType;
  city?: City;
  search?: string;
};

export type VenueDetail = VenuePartner & {
  recentBookings: DateBooking[];
  timeSlots: VenueTimeSlot[];
};

export type SelfieSubmission = {
  id: string;
  userId: string;
  imageUrl: string;
  reviewStatus: "pending" | "approved" | "rejected";
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
  userName?: string;
  userPhone?: string;
};

export type GovIdSubmission = {
  id: string;
  userId: string;
  frontImageUrl: string;
  backImageUrl?: string;
  idType: "national_id" | "drivers_license" | "passport" | "voters_card";
  reviewStatus: "pending" | "approved" | "rejected";
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
  userName?: string;
  userPhone?: string;
  extractedName?: string;
  extractedDob?: string;
  extractedIdNumber?: string;
};

export type PaymentRecord = {
  id: string;
  paymentMethod: PaymentMethod;
  amountNgn: number;
  expiresInMinutes: number;
  status: PaymentStatus;
  paystackReference?: string;
  paystackAuthUrl?: string;
  bookingId?: string;
  createdAt: string;
  updatedAt: string;
};

export type ProfileMedia = {
  id: string;
  userId: string;
  mediaType: "image" | "video";
  storageUrl: string;
  displayOrder: number;
  uploadedAt: string;
};

export type BootstrapPayload = {
  onboarding: OnboardingState;
  verification: VerificationStatus;
  suggestions: SuggestionProfile[];
  bookings: DateBooking[];
  safety: SafetyState;
  matchround: MatchroundState;
  userSummary: UserSummary;
  notifications: InboxNotification[];
  editableProfile: EditableProfile;
  datingPreferences: DatingPreferences;
  accountSettings: AccountSettings;
  appPreferences: AppPreferences;
  reactions: Record<string, RoundReaction>;
  media: ProfileMedia[];
};

export type OpsDashboard = {
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
    totalDeviceTokens: number;
  };
  featureToggles: {
    requireGovIdForBooking: boolean;
  };
  moderationQueue: SafetyReport[];
  selfieQueue: SelfieSubmission[];
  govIdQueue: GovIdSubmission[];
  supportQueue: BookingSupportRequest[];
  venueNetwork: VenuePartner[];
  bookings: DateBooking[];
  verification: VerificationStatus;
  profile: EditableProfile;
  datingPreferences: DatingPreferences;
  accountSettings: AccountSettings;
  safety: SafetyState;
  notifications: InboxNotification[];
  reactions: Array<{
    profileId: string;
    displayName: string;
    city: City;
    reaction: RoundReaction;
  }>;
};

export type UserStateRecord = {
  onboarding: OnboardingState;
  verification: VerificationStatus;
  safety: SafetyState;
  matchround: MatchroundState;
  userSummary: UserSummary;
  editableProfile: EditableProfile;
  datingPreferences: DatingPreferences;
  accountSettings: AccountSettings;
  appPreferences: AppPreferences;
  pendingPhoneNumber: string;
  nextNotificationId: number;
  nextBookingId: number;
  nextReportId: number;
  nextPaymentId: number;
  nextIncidentId: number;
};

export type ReminderChannel = "whatsapp" | "sms";
export type ReminderStatus = "sent" | "delivered" | "read" | "failed";
export type ReminderTemplate = "booking_confirmed" | "reminder_24h" | "reminder_2h" | "payment_nudge" | "cancellation_notice";

export type ReminderLog = {
  id: string;
  userId: string;
  bookingId?: string;
  channel: ReminderChannel;
  templateId: ReminderTemplate;
  phoneNumber: string;
  status: ReminderStatus;
  failureReason?: string;
  sentAt: string;
  deliveredAt?: string;
  readAt?: string;
  failedAt?: string;
};

export type ReminderPreferences = {
  userId: string;
  bookingConfirmations: boolean;
  reminders: boolean;
  paymentNudges: boolean;
  cancellationNotices: boolean;
};

export type CancellationReason =
  | "schedule_conflict"
  | "no_longer_interested"
  | "safety_concern"
  | "venue_issue"
  | "other";

export type SupportRequestStatus = "requested" | "under_review" | "approved" | "denied";
export type RefundEligibility = "eligible" | "partial" | "ineligible" | "processed";
export type SupportRequestType = "cancellation" | "reschedule";

export type BookingSupportRequest = {
  id: string;
  bookingId: string;
  userId: string;
  type: SupportRequestType;
  reason?: string;
  status: SupportRequestStatus;
  refundStatus?: RefundEligibility;
  newAvailability?: string[];
  resolutionNotes?: string;
  resolvedBy?: string;
  createdAt: string;
  updatedAt: string;
};

export type BookingAuditEntry = {
  id: string;
  bookingId: string;
  actorId: string;
  actorType: "user" | "ops" | "system";
  action: string;
  details?: Record<string, unknown>;
  createdAt: string;
};

export type BasicOnboardingPayload = {
  firstName: string;
  birthDate: string;
  genderIdentity: string;
  interestedIn: string;
  city: City;
  acceptedTerms: boolean;
};

// ── P1-11: Account Deletion & Privacy ───────────────────────────────

export type DeletionStatus = "pending" | "cancelled" | "completed";

export type AccountDeletionRequest = {
  deletionRequestedAt: string;
  deletionScheduledAt: string;
  status: DeletionStatus;
  gracePeriodDays: number;
};

export type DataExportRequest = {
  id: string;
  userId: string;
  status: "pending" | "completed" | "failed";
  createdAt: string;
  completedAt?: string;
};

export type DataExportPayload = {
  exportedAt: string;
  profile: EditableProfile;
  accountSettings: AccountSettings;
  datingPreferences: DatingPreferences;
  verification: {
    phoneVerified: boolean;
    selfieVerified: boolean;
    governmentIdVerified: boolean;
  };
  bookingHistory: Array<{
    id: string;
    status: BookingStatus;
    venueName: string;
    city: City;
    startAt: string;
    createdAt: string;
  }>;
  notificationHistory: Array<{
    title: string;
    body: string;
    category: NotificationCategory;
  }>;
  termsAcceptances: Array<{
    termsVersion: string;
    privacyVersion: string;
    acceptedAt: string;
  }>;
};

// ── Ops User Management ────────────────────────────────────────────

export type OpsUser = {
  id: string;
  phoneNumber: string;
  name: string;
  city: string;
  onboardingStep: string;
  onboardingCompleted: boolean;
  phoneVerified: boolean;
  selfieVerified: boolean;
  governmentIdVerified: boolean;
  isFrozen: boolean;
  freezeReason?: string;
  bookingCount: number;
  reportCount: number;
  deletionStatus?: string;
  createdAt: string;
  updatedAt: string;
};

export type OpsUserDetail = OpsUser & {
  bio: string;
  interests: string[];
  traits: string[];
  education: string;
  occupation: string;
  gender: string;
  birthDate: string;
  datingIntention: string;
  warnings: number;
  tokenLossPenalties: number;
  incidents: SafetyIncident[];
  activeFreeze?: AccountFreeze;
  bookings: DateBooking[];
  reports: SafetyReport[];
};

// ── Analytics ──────────────────────────────────────────────────────

export type AnalyticsEvent = {
  id: string;
  userIdHash: string;
  eventName: string;
  properties: Record<string, unknown>;
  createdAt: string;
};

export type AnalyticsEventInput = {
  eventName: string;
  properties?: Record<string, unknown>;
  timestamp?: string;
};

export type FunnelStep = {
  step: string;
  count: number;
};

export type FunnelResult = {
  name: string;
  steps: FunnelStep[];
  period: string;
};

