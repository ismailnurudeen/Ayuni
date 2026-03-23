import {
  AccountSettings,
  AppPreferences,
  DateBooking,
  DatingPreferences,
  EditableProfile,
  InboxNotification,
  MatchroundState,
  OnboardingState,
  SafetyReport,
  SafetyState,
  SafetyIncident,
  AccountFreeze,
  SuggestionProfile,
  UserStateRecord,
  UserSummary,
  VenuePartner,
  VerificationStatus,
  GovIdSubmission
} from "./app.types";

export const demoVerification: VerificationStatus = {
  phoneVerified: false,
  selfieVerified: false,
  governmentIdVerified: false,
  idRequiredBeforeDate: true,
  govIdStatus: "not_submitted"
};

export const demoOnboarding: OnboardingState = {
  signupMethod: "Phone",
  step: "Welcome",
  completed: false,
  phoneNumber: ""
};

export const suggestionFixtures: SuggestionProfile[] = [
  {
    id: "sug-1",
    displayName: "Amaka",
    age: 28,
    gender: "Woman",
    heightCm: 168,
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
    gender: "Man",
    heightCm: 182,
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
    gender: "Man",
    heightCm: 178,
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
    gender: "Woman",
    heightCm: 165,
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
    gender: "Man",
    heightCm: 175,
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

export const venueFixtures: VenuePartner[] = [
  { id: "venue-1", name: "The Lobby, Victoria Island", city: "Lagos", area: "Victoria Island", type: "HotelLobby", readiness: "ready" },
  { id: "venue-2", name: "Maple Cafe, Wuse II", city: "Abuja", area: "Wuse II", type: "Cafe", readiness: "waitlist" },
  { id: "venue-3", name: "Cocoa Rooms, Lekki", city: "Lagos", area: "Lekki", type: "DessertSpot", readiness: "ready" }
];

const demoSafety: SafetyState = {
  trustedContactName: "Ada",
  trustedContactChannel: "WhatsApp",
  incidents: [],
  warnings: 0,
  tokenLossPenalties: 0
};

const demoMatchround: MatchroundState = {
  currentWindowLabel: "Tonight's round",
  nextMatchroundLabel: "Next matchround at 8:00 PM",
  countdown: "06:52:51",
  usersLeftToday: 0
};

const demoUserSummary: UserSummary = {
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

const demoEditableProfile: EditableProfile = {
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

const demoDatingPreferences: DatingPreferences = {
  ageRange: "27-36",
  genderIdentity: "Men",
  heightRange: "168-195 cm",
  dateCities: ["Lagos", "Abuja"],
  dateAreas: ["Victoria Island", "Lekki", "Ikoyi", "Wuse II"],
  preferredDateActivities: ["Coffee", "Brunch", "Dessert", "Drinks", "Art gallery", "Casual dinner"]
};

const blankAccountSettings: AccountSettings = {
  name: "",
  gender: "",
  birthDate: "",
  height: "",
  residence: "",
  educationLevel: "",
  email: "",
  phoneNumber: ""
};

const demoAppPreferences: AppPreferences = {
  notifications: "Enabled for matches, bookings, and cancellations",
  appLanguage: "English"
};

export const demoBookings: DateBooking[] = [
  {
    id: "book-1",
    matchId: "sug-1",
    status: "confirmed",
    venueName: "The Lobby, Victoria Island",
    city: "Lagos",
    dateType: "HotelLobby",
    startAt: "2026-03-22T18:30:00+01:00",
    logisticsChatOpensBeforeHours: 2,
    checkInStatus: "Pending",
    tokenAmountNgn: 3500,
    bothPaid: true,
    counterpartName: "Amaka",
    venueAddress: "Adetokunbo Ademola, Victoria Island",
    availability: ["Saturday evening", "Sunday afternoon"],
    createdAt: "2026-03-20T10:00:00+01:00",
    updatedAt: "2026-03-20T10:30:00+01:00"
  }
];

export const demoNotifications: InboxNotification[] = [
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

export const demoReports: SafetyReport[] = [
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

export function createInitialUserState(useDemoFixtures: boolean): UserStateRecord {
  return {
    onboarding: structuredClone(demoOnboarding),
    verification: structuredClone(demoVerification),
    safety: structuredClone(demoSafety),
    matchround: structuredClone(demoMatchround),
    userSummary: structuredClone(useDemoFixtures ? demoUserSummary : { ...demoUserSummary, firstName: "You", completionScore: 0, completionLabel: "Finish onboarding" }),
    editableProfile: structuredClone(useDemoFixtures ? demoEditableProfile : { ...demoEditableProfile, mediaSlots: ["", "", "", "", "", ""], interests: [], traits: [], bio: "", qas: [], religion: [], smoking: "", drinking: "", education: "", job: "", datingIntention: "", sexualOrientation: "", languages: [] }),
    datingPreferences: structuredClone(demoDatingPreferences),
    accountSettings: structuredClone(blankAccountSettings),
    appPreferences: structuredClone(demoAppPreferences),
    pendingPhoneNumber: "",
    nextNotificationId: 100,
    nextBookingId: 2,
    nextReportId: 103,
    nextPaymentId: 1,
    nextIncidentId: 1
  };
}

