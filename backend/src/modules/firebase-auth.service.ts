import { Injectable } from "@nestjs/common";
import * as admin from "firebase-admin";

/**
 * Firebase Phone Auth provider.
 *
 * With Firebase, OTP send/verify happens client-side via the Firebase SDK.
 * The backend only needs to verify the resulting Firebase ID token and
 * extract the phone number from it.
 *
 * Requires FIREBASE_SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS.
 */
@Injectable()
export class FirebaseAuthService {
  private readonly app: admin.app.App | null;
  private readonly testMode: boolean;

  constructor() {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

    if (serviceAccountJson) {
      try {
        const serviceAccount = JSON.parse(serviceAccountJson);
        this.app = admin.apps.length
          ? admin.app()
          : admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
        this.testMode = false;
      } catch (error) {
        console.warn("Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON, falling back to test mode");
        this.app = null;
        this.testMode = true;
      }
    } else if (credentialsPath) {
      this.app = admin.apps.length
        ? admin.app()
        : admin.initializeApp({ credential: admin.credential.applicationDefault() });
      this.testMode = false;
    } else {
      this.app = null;
      this.testMode = true;
      console.log("⚠️  Firebase Auth service running in TEST MODE - tokens will not be verified");
    }
  }

  /**
   * Verify a Firebase ID token and extract the phone number.
   *
   * In test mode, accepts a fake token format: "test-firebase-token:<phone_number>"
   * This lets the mobile app work in development without real Firebase.
   */
  async verifyIdToken(idToken: string): Promise<{ uid: string; phoneNumber: string } | null> {
    if (this.testMode) {
      return this.handleTestMode(idToken);
    }

    try {
      const decoded = await this.app!.auth().verifyIdToken(idToken);
      if (!decoded.phone_number) {
        console.warn("Firebase token verified but no phone_number claim present");
        return null;
      }
      return {
        uid: decoded.uid,
        phoneNumber: decoded.phone_number,
      };
    } catch (error) {
      console.error("Firebase ID token verification failed:", error);
      return null;
    }
  }

  isTestMode(): boolean {
    return this.testMode;
  }

  private handleTestMode(idToken: string): { uid: string; phoneNumber: string } | null {
    // In test mode, accept "test-firebase-token:+234XXXXXXXXXX"
    if (idToken.startsWith("test-firebase-token:")) {
      const phoneNumber = idToken.substring("test-firebase-token:".length);
      if (!phoneNumber || phoneNumber.length < 10) {
        return null;
      }
      console.log(`📱 [TEST MODE] Firebase auth for ${phoneNumber}`);
      return {
        uid: `firebase-test-${phoneNumber.replace(/\+/g, "")}`,
        phoneNumber,
      };
    }
    console.log("📱 [TEST MODE] Invalid test token format. Use: test-firebase-token:<phone_number>");
    return null;
  }
}
