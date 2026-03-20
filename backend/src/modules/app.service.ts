import { Injectable } from "@nestjs/common";

type City = "Lagos" | "Abuja" | "PortHarcourt";
type DatingIntent = "SeriousRelationship" | "IntentionalDating";
type DateType = "Cafe" | "Lounge" | "DessertSpot" | "Brunch" | "CasualRestaurant" | "HotelLobby";
type BadgeTone = "Trust" | "Intentional" | "Boost";
type HighlightTone = "Light" | "Rich";
type CheckInStatus = "Pending" | "Confirmed" | "SupportFlagged";
type ShareChannel = "WhatsApp" | "SMS";
type NotificationCategory = "Update" | "Booking" | "Cancellation";
type RoundReaction = "Accepted" | "Declined";
type PaymentMethod = "card" | "bank_transfer" | "ussd";
type ReportSeverity = "high" | "medium";
type ReportStatus = "open" | "resolved";

type VerificationStatus = {
  phoneVerified: boolean;
  selfieVerified: boolean;
  governmentIdVerified: boolean;
  idRequiredBeforeDate: boolean;
};

type SignupMethod = "Phone";
type OnboardingStep = "Welcome" | "PhoneEntry" | "OtpVerification" | "BasicProfile" | "Complete";

type OnboardingState = {
  signupMethod: SignupMethod;
  step: OnboardingStep;
  completed: boolean;
  phoneNumber: string;
};

type ProfileBadge = {
  label: string;
  tone: BadgeTone;
};

type ProfileHighlight = {
  title: string;
  body: string;
  tone: HighlightTone;
};

type SuggestionProfile = {
  id: string;
  displayName: string;
  age: number;
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

type DateBooking = {
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

type SafetyState = {
  trustedContactName: string;
  trustedContactChannel: ShareChannel;
};

type MatchroundState = {
  currentWindowLabel: string;
  nextMatchroundLabel: string;
  countdown: string;
  usersLeftToday: number;
};

type UserSummary = {
  firstName: string;
  completionScore: number;
  completionLabel: string;
  profilePhotoMood: string;
  badges: ProfileBadge[];
};

type ProfileQa = {
  question: string;
  answer: string;
};

type EditableProfile = {
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

type DatingPreferences = {
  ageRange: string;
  genderIdentity: string;
  heightRange: string;
  dateCities: string[];
  dateAreas: string[];
  preferredDateActivities: string[];
};

type AccountSettings = {
  name: string;
  gender: string;
  birthDate: string;
  height: string;
  residence: string;
  educationLevel: string;
  email: string;
  phoneNumber: string;
};

type AppPreferences = {
  notifications: string;
  appLanguage: string;
};

type InboxNotification = {
  id: string;
  title: string;
  body: string;
  timestampLabel: string;
  category: NotificationCategory;
};

type SafetyReport = {
  id: string;
  bookingId: string;
  category: "LateArrival" | "NoShow" | "UnsafeBehavior";
  details: string;
  severity: ReportSeverity;
  status: ReportStatus;
  createdAt: string;
};

type VenuePartner = {
  id: string;
  name: string;
  city: City;
  area: string;
  type: DateType;
  readiness: "ready" | "waitlist" | "paused";
};

type BootstrapPayload = {
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

@Injectable()
export class AppService {
  private readonly verification: VerificationStatus = {
    phoneVerified: false,
    selfieVerified: false,
    governmentIdVerified: false,
    idRequiredBeforeDate: true
  };

  private onboarding: OnboardingState = {
    signupMethod: "Phone",
    step: "Welcome",
    completed: false,
    phoneNumber: ""
  };

  private readonly suggestions: SuggestionProfile[] = [
    {
      id: "sug-1",
      displayName: "Amaka",
      age: 28,
      city: "Lagos",
      bio: "Product designer who likes brunch dates and long walks by the water.",
      intent: "SeriousRelationship",
      preferredDateType: "Brunch",
      trustScore: 92,
      occupation: "Product Designer",
      education: "UNILAG, Visual Communication",
      neighborhood: "Lekki Phase 1",
      languages: ["English", "Yoruba"],
      compatibilityHeadline: "You both prefer day dates, good conversation, and soft-launch energy.",
      profilePrompt: "Proudest of building a side studio from scratch and still making time for Sunday brunch.",
      venuePreview: "If you match, we will line up brunch in Lekki or Victoria Island.",
      photoMoments: ["Golden hour portrait", "Brunch patio", "Gallery night"],
      traitTags: ["Curious", "Kind", "Intentional", "Playful"],
      interestTags: ["Brunch", "Design", "Afrobeats", "Art fairs", "Road trips"],
      preferenceTags: ["Serious dating", "Monogamous", "Open to kids", "Occasional drinks"],
      badges: [
        { label: "Phone verified", tone: "Trust" },
        { label: "Intentional", tone: "Intentional" }
      ],
      highlights: [
        { title: "Personal motto", body: "Slow burn, strong values, clean communication.", tone: "Rich" },
        {
          title: "Ideal first date",
          body: "Small plates, mocktails, and somewhere we can actually hear each other.",
          tone: "Light"
        }
      ]
    },
    {
      id: "sug-2",
      displayName: "Tosin",
      age: 31,
      city: "Lagos",
      bio: "Finance lead, into live music, books, and quiet cafes.",
      intent: "IntentionalDating",
      preferredDateType: "Cafe",
      trustScore: 88,
      occupation: "Finance Lead",
      education: "Covenant University",
      neighborhood: "Yaba",
      languages: ["English"],
      compatibilityHeadline: "Both of you want a calm first meeting instead of endless texting.",
      profilePrompt: "Most awkward moment: joining the wrong wedding table and staying for jollof anyway.",
      venuePreview: "If you match, we will set up coffee and dessert around Yaba or Ikoyi.",
      photoMoments: ["Bookshop stop", "Cafe booth", "Live set night"],
      traitTags: ["Calm", "Bookish", "Warm", "Direct"],
      interestTags: ["Coffee", "Books", "Jazz bars", "Padel", "Museums"],
      preferenceTags: ["Intentional dating", "No smoking", "Weekend dates"],
      badges: [
        { label: "ID ready", tone: "Trust" },
        { label: "New tonight", tone: "Boost" }
      ],
      highlights: [
        { title: "Proud of", body: "Helping my younger siblings through school without turning bitter.", tone: "Light" },
        { title: "Best energy", body: "Low-noise places, witty banter, and good pie.", tone: "Rich" }
      ]
    },
    {
      id: "sug-3",
      displayName: "Ifeanyi",
      age: 30,
      city: "Abuja",
      bio: "Consultant who prefers dessert spots over loud bars.",
      intent: "SeriousRelationship",
      preferredDateType: "DessertSpot",
      trustScore: 90,
      occupation: "Management Consultant",
      education: "UNN, Economics",
      neighborhood: "Wuse II",
      languages: ["English", "Igbo"],
      compatibilityHeadline: "You both want a real date plan, not a week of vague chat.",
      profilePrompt: "I am proud of becoming softer without losing my ambition.",
      venuePreview: "If you match, expect dessert or tea in Wuse, not a loud club.",
      photoMoments: ["City rooftop", "Dessert run", "Weekend wedding"],
      traitTags: ["Empathetic", "Driven", "Spontaneous", "Funny"],
      interestTags: ["Dessert", "Travel", "Football", "Comedy", "Faith"],
      preferenceTags: ["Serious dating", "Family minded", "Non-smoker"],
      badges: [
        { label: "Selfie checked", tone: "Trust" },
        { label: "High fit", tone: "Intentional" }
      ],
      highlights: [
        { title: "Personal motto", body: "Show up clearly or not at all.", tone: "Rich" },
        {
          title: "Favorite type of date",
          body: "A sweet place with enough privacy for a proper conversation.",
          tone: "Light"
        }
      ]
    },
    {
      id: "sug-4",
      displayName: "Zainab",
      age: 27,
      city: "Lagos",
      bio: "Brand strategist who likes dessert, rooftop dinners, and earnest people.",
      intent: "SeriousRelationship",
      preferredDateType: "CasualRestaurant",
      trustScore: 86,
      occupation: "Brand Strategist",
      education: "Babcock University",
      neighborhood: "Ikoyi",
      languages: ["English", "Hausa"],
      compatibilityHeadline: "You both like polished but low-pressure dates with room for honest conversation.",
      profilePrompt: "My idea of fun is dressing well for a place with excellent food and no chaos.",
      venuePreview: "If you match, we will line up dinner or dessert in Ikoyi.",
      photoMoments: ["Dinner fit", "Gallery opening", "Sunset selfie"],
      traitTags: ["Stylish", "Thoughtful", "Faithful", "Calm"],
      interestTags: ["Dessert", "Fashion", "Fine dining", "Documentaries", "Podcasts"],
      preferenceTags: ["Serious dating", "No smoking", "Moderate social life"],
      badges: [
        { label: "Phone verified", tone: "Trust" },
        { label: "Intentional", tone: "Intentional" }
      ],
      highlights: [
        { title: "Green flag", body: "Someone who plans with care and follows through.", tone: "Light" },
        { title: "Personal motto", body: "Softness and standards can coexist.", tone: "Rich" }
      ]
    },
    {
      id: "sug-5",
      displayName: "Chinedu",
      age: 29,
      city: "Lagos",
      bio: "Tech founder who prefers date plans with a bit of structure and good food.",
      intent: "IntentionalDating",
      preferredDateType: "Lounge",
      trustScore: 89,
      occupation: "Founder",
      education: "FUTO",
      neighborhood: "Victoria Island",
      languages: ["English", "Igbo"],
      compatibilityHeadline: "You both want chemistry, but not random chaos.",
      profilePrompt: "I take planning seriously and jokes even more seriously.",
      venuePreview: "If you match, we will line up a lounge or dinner date on the Island.",
      photoMoments: ["Founder summit", "Friends wedding", "Late dinner"],
      traitTags: ["Driven", "Funny", "Reliable", "Ambitious"],
      interestTags: ["Startups", "Food", "Live music", "Travel", "Fitness"],
      preferenceTags: ["Intentional dating", "Occasional drinks", "No smoking"],
      badges: [
        { label: "ID ready", tone: "Trust" },
        { label: "Boosted", tone: "Boost" }
      ],
      highlights: [
        { title: "Proud of", body: "Building a team without losing my friends in the process.", tone: "Light" },
        { title: "Ideal date", body: "Good food, smart conversation, and not having to shout.", tone: "Rich" }
      ]
    }
  ];

  private readonly bookings: DateBooking[] = [
    {
      id: "book-1",
      venueName: "The Lobby, Victoria Island",
      city: "Lagos",
      dateType: "HotelLobby",
      startAt: "2026-03-22T18:30:00+01:00",
      logisticsChatOpensBeforeHours: 2,
      checkInStatus: "Pending",
      tokenAmountNgn: 3500,
      bothPaid: true,
      counterpartName: "Amaka",
      venueAddress: "Adetokunbo Ademola, Victoria Island"
    }
  ];

  private readonly venues: VenuePartner[] = [
    { id: "venue-1", name: "The Lobby, Victoria Island", city: "Lagos", area: "Victoria Island", type: "HotelLobby", readiness: "ready" },
    { id: "venue-2", name: "Maple Cafe, Wuse II", city: "Abuja", area: "Wuse II", type: "Cafe", readiness: "waitlist" },
    { id: "venue-3", name: "Cocoa Rooms, Lekki", city: "Lagos", area: "Lekki", type: "DessertSpot", readiness: "ready" }
  ];

  private readonly safety: SafetyState = {
    trustedContactName: "Ada",
    trustedContactChannel: "WhatsApp"
  };

  private readonly matchround: MatchroundState = {
    currentWindowLabel: "Tonight's round",
    nextMatchroundLabel: "Next matchround at 8:00 PM",
    countdown: "06:52:51",
    usersLeftToday: 0
  };

  private readonly userSummary: UserSummary = {
    firstName: "You",
    completionScore: 20,
    completionLabel: "Finish onboarding",
    profilePhotoMood: "Night portrait",
    badges: [
      { label: "Verified", tone: "Trust" },
      { label: "Intentional", tone: "Intentional" },
      { label: "Boosted", tone: "Boost" }
    ]
  };

  private editableProfile: EditableProfile = {
    mediaSlots: [
      "Slot 1 • portrait",
      "Slot 2 • full look",
      "Slot 3 • brunch clip",
      "Slot 4 • wedding snap",
      "Slot 5 • gym mirror",
      "Slot 6 • travel reel"
    ],
    interests: ["Brunch", "Art fairs", "Afrobeats", "Road trips", "Padel", "Late night drives"],
    traits: ["Intentional", "Warm", "Playful", "Curious", "Direct"],
    bio: "Creative, affectionate, and low-drama. I like thoughtful people who can plan an actual date and still have fun.",
    qas: [
      { question: "A green flag I love", answer: "Consistency without being dry." },
      { question: "My ideal first date", answer: "Mocktails, small plates, and a place where we can talk properly." },
      { question: "A random thing about me", answer: "I will always order dessert if the place is serious about it." }
    ],
    religion: ["Christian"],
    smoking: "Never",
    drinking: "Sometimes",
    education: "University degree",
    job: "Product Designer",
    datingIntention: "Serious relationship",
    sexualOrientation: "Straight",
    languages: ["English", "Yoruba"]
  };

  private datingPreferences: DatingPreferences = {
    ageRange: "27-36",
    genderIdentity: "Men",
    heightRange: "168-195 cm",
    dateCities: ["Lagos", "Abuja"],
    dateAreas: ["Victoria Island", "Lekki", "Ikoyi", "Wuse II"],
    preferredDateActivities: ["Coffee", "Brunch", "Dessert", "Drinks", "Art gallery", "Casual dinner"]
  };

  private accountSettings: AccountSettings = {
    name: "",
    gender: "",
    birthDate: "",
    height: "",
    residence: "",
    educationLevel: "",
    email: "",
    phoneNumber: ""
  };

  private appPreferences: AppPreferences = {
    notifications: "Enabled for matches, bookings, and cancellations",
    appLanguage: "English"
  };

  private readonly notifications: InboxNotification[] = [
    {
      id: "note-1",
      title: "Date confirmed for Saturday",
      body: "We booked your first date at The Lobby, Victoria Island. Logistics chat opens 2 hours before.",
      timestampLabel: "Today",
      category: "Booking"
    },
    {
      id: "note-2",
      title: "One profile left in tonight's round",
      body: "Your final curated profile is waiting. Review before the round closes.",
      timestampLabel: "Today",
      category: "Update"
    },
    {
      id: "note-3",
      title: "Cancellation policy reminder",
      body: "Late cancellations reduce trust score and can lock future bookings for 30 days.",
      timestampLabel: "Wed Mar 18",
      category: "Cancellation"
    }
  ];

  private readonly reports: SafetyReport[] = [
    {
      id: "rep-102",
      bookingId: "book-1",
      category: "UnsafeBehavior",
      details: "Support requested a check-in after a venue host reported aggressive language.",
      severity: "high",
      status: "open",
      createdAt: "2026-03-20T18:40:00+01:00"
    },
    {
      id: "rep-099",
      bookingId: "book-1",
      category: "LateArrival",
      details: "Arrival dispute raised by one dater after 25 minutes.",
      severity: "medium",
      status: "open",
      createdAt: "2026-03-19T20:05:00+01:00"
    }
  ];

  private readonly reactions: Record<string, RoundReaction> = {};
  private pendingPhoneNumber = "";
  private readonly testOtpCode = "123456";
  private nextNotificationId = 100;
  private nextBookingId = 2;
  private nextReportId = 103;

  health() {
    return {
      ok: true,
      product: "ayuni",
      dropHourWAT: 20
    };
  }

  getBootstrap(): BootstrapPayload {
    return {
      onboarding: this.onboarding,
      verification: this.verification,
      suggestions: this.suggestions,
      bookings: this.bookings,
      safety: this.safety,
      matchround: this.matchround,
      userSummary: this.userSummary,
      notifications: [...this.notifications],
      editableProfile: this.editableProfile,
      datingPreferences: this.datingPreferences,
      accountSettings: this.accountSettings,
      appPreferences: this.appPreferences,
      reactions: { ...this.reactions }
    };
  }

  requestPhoneOtp(phoneNumber: string) {
    this.pendingPhoneNumber = phoneNumber;
    this.onboarding = {
      ...this.onboarding,
      step: "OtpVerification",
      phoneNumber
    };
    return {
      phoneNumber,
      otpSent: true,
      deliveryChannel: "SMS",
      country: "NG",
      retryAfterSeconds: 30
    };
  }

  verifyPhoneOtp(phoneNumber: string, code: string) {
    const verified = phoneNumber == this.pendingPhoneNumber && code === this.testOtpCode;
    if (verified) {
      this.verification.phoneVerified = true;
      this.accountSettings.phoneNumber = phoneNumber;
      this.onboarding = {
        ...this.onboarding,
        step: "BasicProfile",
        phoneNumber
      };
    }
    return {
      verified,
      bootstrap: this.getBootstrap()
    };
  }

  completeBasicOnboarding(body: {
    firstName: string;
    birthDate: string;
    genderIdentity: string;
    interestedIn: string;
    city: City;
    acceptedTerms: boolean;
  }) {
    if (!body.acceptedTerms) {
      return this.getBootstrap();
    }

    this.userSummary.firstName = body.firstName;
    this.userSummary.completionLabel = "Profile started";
    this.accountSettings = {
      ...this.accountSettings,
      name: body.firstName,
      gender: body.genderIdentity,
      birthDate: body.birthDate,
      residence: body.city
    };
    this.datingPreferences = {
      ...this.datingPreferences,
      genderIdentity: body.interestedIn,
      dateCities: [body.city]
    };
    this.editableProfile = {
      ...this.editableProfile,
      datingIntention: "Intentional dating"
    };
    this.onboarding = {
      ...this.onboarding,
      step: "Complete",
      completed: true
    };
    this.pushNotification(
      "Welcome to Ayuni",
      "Your account is live. You can finish the rest of your profile and verification later.",
      "Update"
    );
    this.refreshCompletion();
    return this.getBootstrap();
  }

  getVerification() {
    return this.verification;
  }

  verifySelfie() {
    this.verification.selfieVerified = true;
    this.pushNotification("Selfie verification approved", "Your liveness check passed. You are one step closer to booking.", "Update");
    return {
      status: "approved",
      reviewMode: "liveness"
    };
  }

  verifyId() {
    this.verification.governmentIdVerified = true;
    this.pushNotification("Government ID received", "Your ID is now pending a quick trust review before your next date.", "Update");
    return {
      status: "pending_manual_review"
    };
  }

  getDailySuggestions(city: City) {
    return this.suggestions.filter((profile) => profile.city === city && !this.reactions[profile.id]).slice(0, 5);
  }

  respondToMatch(matchId: string, response: "accept" | "reject") {
    const reaction: RoundReaction = response === "accept" ? "Accepted" : "Declined";
    const existingReaction = this.reactions[matchId];
    const acceptedCount = Object.values(this.reactions).filter((item) => item === "Accepted").length;

    if (reaction === "Accepted" && existingReaction !== "Accepted" && acceptedCount >= 5) {
      return {
        success: false,
        reason: "accepted_limit_reached",
        bootstrap: this.getBootstrap()
      };
    }

    this.reactions[matchId] = reaction;
    const profile = this.suggestions.find((item) => item.id === matchId);
    if (profile) {
      this.pushNotification(
        reaction === "Accepted" ? `You accepted ${profile.displayName}` : `You declined ${profile.displayName}`,
        reaction === "Accepted"
          ? "Nice. If they like you too, we will move straight into date planning."
          : "No worries. We removed them from your active round and kept the activity in your 24-hour page.",
        reaction === "Accepted" ? "Update" : "Cancellation"
      );
    }

    return {
      success: true,
      nextStep: reaction === "Accepted" ? "availability" : "closed",
      bootstrap: this.getBootstrap()
    };
  }

  submitAvailability(matchId: string, availability: string[]) {
    return {
      matchId,
      availability,
      paymentRequired: true
    };
  }

  initiateDateToken(paymentMethod: PaymentMethod) {
    return {
      paymentMethod,
      amountNgn: 3500,
      expiresInMinutes: paymentMethod === "ussd" ? 360 : 30
    };
  }

  getBookings() {
    return this.bookings;
  }

  createBooking(matchId: string) {
    const profile = this.suggestions.find((item) => item.id === matchId) ?? this.suggestions[0];
    const booking: DateBooking = {
      id: `book-${this.nextBookingId++}`,
      venueName: profile.city === "Abuja" ? "Maple Cafe, Wuse II" : "Cocoa Rooms, Lekki",
      city: profile.city,
      dateType: profile.preferredDateType,
      startAt: "2026-03-24T19:00:00+01:00",
      logisticsChatOpensBeforeHours: 2,
      checkInStatus: "Pending",
      tokenAmountNgn: 3500,
      bothPaid: true,
      counterpartName: profile.displayName,
      venueAddress: profile.city === "Abuja" ? "Aminu Kano Crescent, Wuse II" : "Admiralty Way, Lekki"
    };
    this.bookings.unshift(booking);
    this.pushNotification(
      `Date booked with ${profile.displayName}`,
      `Your date is scheduled at ${booking.venueName}. Logistics chat opens ${booking.logisticsChatOpensBeforeHours} hours before.`,
      "Booking"
    );
    return {
      matchId,
      booking,
      bootstrap: this.getBootstrap()
    };
  }

  confirmCheckIn(bookingId: string) {
    const booking = this.bookings.find((item) => item.id === bookingId);
    if (booking) {
      booking.checkInStatus = "Confirmed";
    }
    return booking;
  }

  createReport(report: Omit<SafetyReport, "id" | "severity" | "status" | "createdAt">) {
    const nextReport: SafetyReport = {
      id: `rep-${this.nextReportId++}`,
      ...report,
      severity: report.category === "UnsafeBehavior" ? "high" : "medium",
      status: "open",
      createdAt: new Date().toISOString()
    };
    this.reports.unshift(nextReport);
    this.pushNotification(
      "Support report received",
      "Our ops team has your report and will review it within the active support window.",
      "Update"
    );
    return {
      queued: true,
      severity: nextReport.severity
    };
  }

  getLogisticsChat(bookingId: string) {
    const booking = this.bookings.find((item) => item.id === bookingId);
    return {
      bookingId,
      channelType: "logistics_only",
      opensAt: booking ? booking.startAt : null,
      opensBeforeHours: booking?.logisticsChatOpensBeforeHours ?? null
    };
  }

  updateEditableProfile(profile: EditableProfile) {
    this.editableProfile = {
      ...profile,
      mediaSlots: profile.mediaSlots.slice(0, 6)
    };
    this.refreshCompletion();
    this.pushNotification("Profile updated", "Your profile changes are now live for new rounds.", "Update");
    return this.getBootstrap();
  }

  updateDatingPreferences(preferences: DatingPreferences) {
    this.datingPreferences = preferences;
    this.pushNotification("Dating preferences updated", "We will use your latest age, city, and date activity choices in future rounds.", "Update");
    return this.getBootstrap();
  }

  updateAccountSettings(settings: AccountSettings) {
    this.accountSettings = settings;
    this.userSummary.firstName = settings.name.split(" ")[0] || settings.name;
    this.pushNotification("Account settings updated", "Your account details have been saved.", "Update");
    return this.getBootstrap();
  }

  updateAppPreferences(preferences: AppPreferences) {
    this.appPreferences = preferences;
    this.pushNotification("App settings updated", "Your app language and notification preferences were saved.", "Update");
    return this.getBootstrap();
  }

  getOpsOverview() {
    const dashboard = this.getOpsDashboard();
    return dashboard.overview;
  }

  getOpsDashboard(): OpsDashboard {
    return {
      overview: {
        pendingReports: this.reports.filter((item) => item.status === "open").length,
        activeVenueCount: this.venues.filter((item) => item.readiness === "ready").length,
        totalAcceptedThisRound: Object.values(this.reactions).filter((item) => item === "Accepted").length,
        totalDeclinedThisRound: Object.values(this.reactions).filter((item) => item === "Declined").length,
        onboardingCompleted: this.onboarding.completed,
        supportWindow: "16:00-23:00 WAT"
      },
      moderationQueue: this.reports.filter((item) => item.status === "open"),
      venueNetwork: this.venues,
      bookings: this.bookings,
      verification: this.verification,
      profile: this.editableProfile,
      datingPreferences: this.datingPreferences,
      accountSettings: this.accountSettings,
      notifications: this.notifications.slice(0, 8),
      reactions: Object.entries(this.reactions).map(([profileId, reaction]) => {
        const profile = this.suggestions.find((item) => item.id === profileId)!;
        return {
          profileId,
          displayName: profile.displayName,
          city: profile.city,
          reaction
        };
      })
    };
  }

  resolveReport(reportId: string) {
    const report = this.reports.find((item) => item.id === reportId);
    if (report) {
      report.status = "resolved";
    }
    return this.getOpsDashboard();
  }

  escalateBooking(bookingId: string) {
    const booking = this.bookings.find((item) => item.id === bookingId);
    if (booking) {
      booking.checkInStatus = "SupportFlagged";
    }
    return this.getOpsDashboard();
  }

  toggleVenue(venueId: string) {
    const venue = this.venues.find((item) => item.id === venueId);
    if (venue) {
      venue.readiness = venue.readiness === "ready" ? "paused" : "ready";
    }
    return this.getOpsDashboard();
  }

  private pushNotification(title: string, body: string, category: NotificationCategory) {
    this.notifications.unshift({
      id: `note-${this.nextNotificationId++}`,
      title,
      body,
      timestampLabel: "Just now",
      category
    });
  }

  private refreshCompletion() {
    const filledFields = [
      this.editableProfile.mediaSlots.filter((item) => item.trim().length > 0).length > 0,
      this.editableProfile.interests.length >= 3,
      this.editableProfile.traits.length >= 3,
      this.editableProfile.bio.length >= 40,
      this.editableProfile.qas.length >= 2,
      this.editableProfile.languages.length >= 1,
      this.editableProfile.job.trim().length > 0,
      this.editableProfile.education.trim().length > 0
    ];
    const score = Math.round((filledFields.filter(Boolean).length / filledFields.length) * 100);
    this.userSummary.completionScore = score;
    this.userSummary.completionLabel =
      score >= 90 ? "Intentional profile" : score >= 70 ? "Solid profile" : "Needs more detail";
  }
}
