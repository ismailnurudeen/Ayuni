import { Injectable } from "@nestjs/common";
import * as crypto from "crypto";

export type PaystackInitializeResponse = {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
};

export type PaystackVerifyResponse = {
  status: boolean;
  message: string;
  data: {
    id: number;
    domain: string;
    status: string;
    reference: string;
    amount: number;
    message: string | null;
    gateway_response: string;
    paid_at: string;
    created_at: string;
    channel: string;
    currency: string;
    ip_address: string;
    metadata: Record<string, unknown>;
    fees: number;
    customer: {
      id: number;
      email: string;
    };
  };
};

export type PaystackRefundResponse = {
  status: boolean;
  message: string;
  data: {
    transaction: { reference: string };
    id: number;
    amount: number;
    currency: string;
    status: string;
    created_at: string;
  };
};

@Injectable()
export class PaystackService {
  private readonly secretKey: string;
  private readonly baseUrl = "https://api.paystack.co";

  constructor() {
    this.secretKey = process.env.PAYSTACK_SECRET_KEY || "TEST_MODE";
    if (this.secretKey === "TEST_MODE") {
      console.log("⚠️  Paystack service running in TEST MODE - payments will not be processed");
    }
  }

  async initializeTransaction(params: {
    email: string;
    amount: number;
    reference: string;
    metadata?: Record<string, unknown>;
    channels?: string[];
  }): Promise<PaystackInitializeResponse> {
    // In test mode, return mock response
    if (this.secretKey === "TEST_MODE") {
      return {
        status: true,
        message: "Authorization URL created",
        data: {
          authorization_url: `https://checkout.paystack.com/test_${params.reference}`,
          access_code: `test_access_${params.reference}`,
          reference: params.reference
        }
      };
    }

    const response = await fetch(`${this.baseUrl}/transaction/initialize`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email: params.email,
        amount: params.amount * 100, // Convert to kobo
        reference: params.reference,
        metadata: params.metadata,
        channels: params.channels
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Paystack initialization failed: ${error.message}`);
    }

    return response.json();
  }

  async verifyTransaction(reference: string): Promise<PaystackVerifyResponse> {
    // In test mode, return mock successful verification
    if (this.secretKey === "TEST_MODE") {
      return {
        status: true,
        message: "Verification successful",
        data: {
          id: 1234567,
          domain: "test",
          status: "success",
          reference: reference,
          amount: 350000, // 3500 NGN in kobo
          message: null,
          gateway_response: "Successful",
          paid_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          channel: "card",
          currency: "NGN",
          ip_address: "127.0.0.1",
          metadata: {},
          fees: 5250,
          customer: {
            id: 123456,
            email: "test@example.com"
          }
        }
      };
    }

    const response = await fetch(`${this.baseUrl}/transaction/verify/${reference}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Paystack verification failed: ${error.message}`);
    }

    return response.json();
  }

  verifyWebhookSignature(signature: string, body: string): boolean {
    // In test mode, accept any signature
    if (this.secretKey === "TEST_MODE") {
      return true;
    }

    const hash = crypto.createHmac("sha512", this.secretKey).update(body).digest("hex");
    return hash === signature;
  }

  isPaymentSuccessful(status: string): boolean {
    return status === "success";
  }

  isPaymentFailed(status: string): boolean {
    return status === "failed" || status === "abandoned";
  }

  async refundTransaction(reference: string, amountInKobo?: number): Promise<PaystackRefundResponse> {
    if (this.secretKey === "TEST_MODE") {
      return {
        status: true,
        message: "Refund has been queued",
        data: {
          transaction: { reference },
          id: 9999999,
          amount: amountInKobo || 350000,
          currency: "NGN",
          status: "processed",
          created_at: new Date().toISOString()
        }
      };
    }

    const body: Record<string, unknown> = { transaction: reference };
    if (amountInKobo !== undefined) {
      body.amount = amountInKobo;
    }

    const response = await fetch(`${this.baseUrl}/refund`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Paystack refund failed: ${error.message}`);
    }

    return response.json();
  }
}
