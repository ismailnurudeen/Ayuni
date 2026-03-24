import { Body, Controller, Headers, HttpCode, Post, RawBodyRequest, Req } from "@nestjs/common";
import { AppService } from "./app.service";
import { PaystackService } from "./paystack.service";
import { ReminderService } from "./reminder.service";

type PaystackWebhookEvent = {
  event: string;
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
    metadata: {
      userId?: string;
      paymentId?: string;
      bookingId?: string;
      paymentMethod?: string;
    };
  };
};

@Controller("webhooks")
export class WebhookController {
  constructor(
    private readonly appService: AppService,
    private readonly paystackService: PaystackService,
    private readonly reminderService: ReminderService
  ) {}

  @Post("paystack")
  @HttpCode(200)
  async handlePaystackWebhook(
    @Headers("x-paystack-signature") signature: string,
    @Body() body: PaystackWebhookEvent,
    @Req() request: RawBodyRequest<any>
  ) {
    // Verify webhook signature
    const rawBody = request.rawBody?.toString("utf-8") || JSON.stringify(body);
    
    if (!signature || !this.paystackService.verifyWebhookSignature(signature, rawBody)) {
      console.error("⚠️  Invalid Paystack webhook signature");
      return { status: "error", message: "Invalid signature" };
    }

    // Handle charge.success event
    if (body.event === "charge.success") {
      await this.appService.handlePaymentSuccess(
        body.data.reference,
        body.data.metadata.userId,
        body.data.metadata.paymentId,
        body.data.metadata.bookingId
      );
      return { status: "success" };
    }

    // Handle other events
    if (body.event === "charge.failed") {
      await this.appService.handlePaymentFailure(
        body.data.reference,
        body.data.metadata.userId,
        body.data.metadata.paymentId
      );
      return { status: "success" };
    }

    // Acknowledge other events
    return { status: "success" };
  }

  @Post("twilio/status")
  @HttpCode(200)
  async handleTwilioStatusCallback(
    @Body() body: { MessageSid: string; MessageStatus: string; To?: string; ErrorCode?: string }
  ) {
    if (body.MessageSid && body.MessageStatus) {
      await this.reminderService.updateDeliveryStatus(body.MessageSid, body.MessageStatus);
    }
    return { status: "success" };
  }
}
