export type City = "Lagos" | "Abuja" | "PortHarcourt";
export type DatingIntent = "SeriousRelationship" | "IntentionalDating";
export type DateType = "Cafe" | "Lounge" | "DessertSpot" | "Brunch" | "CasualRestaurant" | "HotelLobby";
export type BadgeTone = "Trust" | "Intentional" | "Boost";
export type HighlightTone = "Light" | "Rich";
export type CheckInStatus = "Pending" | "Confirmed" | "SupportFlagged";
export type ShareChannel = "WhatsApp" | "SMS";
export type NotificationCategory = "Update" | "Booking" | "Cancellation";
export type RoundReaction = "Accepted" | "Declined";
export type PaymentMethod = "card" | "bank_transfer" | "ussd";
export type PaymentStatus = "initiated";
export type ReportSeverity = "high" | "medium";
export type ReportStatus = "open" | "resolved";

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
};

export type SafetyState = {
  trustedContactName: string;
  trustedContactChannel: ShareChannel;
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
};

export type SafetyReport = {
  id: string;
  bookingId: string;
  category: "LateArrival" | "NoShow" | "UnsafeBehavior";
  details: string;
  severity: ReportSeverity;
  status: ReportStatus;
  createdAt: string;
};

export type VenuePartner = {
  id: string;
  name: string;
  city: City;
  area: string;
  type: DateType;
  readiness: "ready" | "waitlist" | "paused";
};

export type PaymentRecord = {
  id: string;
  paymentMethod: PaymentMethod;
  amountNgn: number;
  expiresInMinutes: number;
  status: PaymentStatus;
  createdAt: string;
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
  };
  moderationQueue: SafetyReport[];
  venueNetwork: VenuePartner[];
  bookings: DateBooking[];
  verification: VerificationStatus;
  profile: EditableProfile;
  datingPreferences: DatingPreferences;
  accountSettings: AccountSettings;
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
};

export type BasicOnboardingPayload = {
  firstName: string;
  birthDate: string;
  genderIdentity: string;
  interestedIn: string;
  city: City;
  acceptedTerms: boolean;
};

