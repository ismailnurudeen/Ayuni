import { Injectable } from "@nestjs/common";

type VerificationStatus = {
  phoneVerified: boolean;
  selfieVerified: boolean;
  governmentIdVerified: boolean;
  idRequiredBeforeDate: boolean;
};

type SuggestionProfile = {
  id: string;
  displayName: string;
  age: number;
  city: "Lagos" | "Abuja" | "PortHarcourt";
  bio: string;
  intent: "SeriousRelationship" | "IntentionalDating";
  preferredDateType: string;
  trustScore: number;
};

type DateBooking = {
  id: string;
  venueName: string;
  city: "Lagos" | "Abuja" | "PortHarcourt";
  startAt: string;
  dateType: string;
  logisticsChatOpensAt: string;
  tokenAmountNgn: number;
  bothPaid: boolean;
  checkInStatus: "Pending" | "Confirmed" | "SupportFlagged";
};

type SafetyReport = {
  bookingId: string;
  category: "LateArrival" | "NoShow" | "UnsafeBehavior";
  details: string;
};

@Injectable()
export class AppService {
  private readonly verification: VerificationStatus = {
    phoneVerified: true,
    selfieVerified: true,
    governmentIdVerified: false,
    idRequiredBeforeDate: true
  };

  private readonly suggestions: SuggestionProfile[] = [
    {
      id: "sug-1",
      displayName: "Amaka",
      age: 28,
      city: "Lagos",
      bio: "Product designer who likes brunch dates and waterfront walks.",
      intent: "SeriousRelationship",
      preferredDateType: "Brunch",
      trustScore: 92
    },
    {
      id: "sug-2",
      displayName: "Tosin",
      age: 31,
      city: "Lagos",
      bio: "Finance lead, into quiet cafes and books.",
      intent: "IntentionalDating",
      preferredDateType: "Cafe",
      trustScore: 88
    },
    {
      id: "sug-3",
      displayName: "Ifeanyi",
      age: 30,
      city: "Abuja",
      bio: "Consultant who prefers dessert spots over loud bars.",
      intent: "SeriousRelationship",
      preferredDateType: "DessertSpot",
      trustScore: 90
    }
  ];

  private readonly bookings: DateBooking[] = [
    {
      id: "book-1",
      venueName: "The Lobby, Victoria Island",
      city: "Lagos",
      startAt: "2026-03-22T18:30:00+01:00",
      dateType: "HotelLobby",
      logisticsChatOpensAt: "2026-03-22T16:30:00+01:00",
      tokenAmountNgn: 3500,
      bothPaid: true,
      checkInStatus: "Pending"
    }
  ];

  private readonly reports: SafetyReport[] = [];

  health() {
    return {
      ok: true,
      product: "sway-social",
      dropHourWAT: 20
    };
  }

  requestPhoneOtp(phoneNumber: string) {
    return {
      phoneNumber,
      otpSent: true,
      deliveryChannel: "SMS",
      country: "NG"
    };
  }

  getVerification() {
    return this.verification;
  }

  verifySelfie() {
    this.verification.selfieVerified = true;
    return {
      status: "approved",
      reviewMode: "liveness"
    };
  }

  verifyId() {
    this.verification.governmentIdVerified = true;
    return {
      status: "pending_manual_review"
    };
  }

  getDailySuggestions(city: "Lagos" | "Abuja" | "PortHarcourt") {
    return this.suggestions.filter((profile) => profile.city === city).slice(0, 5);
  }

  respondToMatch(matchId: string, response: "accept" | "reject") {
    return {
      matchId,
      response,
      nextStep: response === "accept" ? "availability" : "closed"
    };
  }

  submitAvailability(matchId: string, availability: string[]) {
    return {
      matchId,
      availability,
      paymentRequired: true
    };
  }

  initiateDateToken(paymentMethod: "card" | "bank_transfer" | "ussd") {
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
    return {
      matchId,
      booking: this.bookings[0]
    };
  }

  confirmCheckIn(bookingId: string) {
    const booking = this.bookings.find((item) => item.id === bookingId);
    if (booking) booking.checkInStatus = "Confirmed";
    return booking;
  }

  createReport(report: SafetyReport) {
    this.reports.push(report);
    return {
      queued: true,
      severity: report.category === "UnsafeBehavior" ? "high" : "medium"
    };
  }

  getLogisticsChat(bookingId: string) {
    const booking = this.bookings.find((item) => item.id === bookingId);
    return {
      bookingId,
      channelType: "logistics_only",
      opensAt: booking?.logisticsChatOpensAt ?? null
    };
  }

  getOpsOverview() {
    return {
      pendingReports: this.reports.length,
      activeVenueCount: 25,
      supportWindow: "16:00-23:00 WAT"
    };
  }
}
