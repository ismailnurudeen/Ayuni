import { AppService } from "./app.service";

describe("AppService", () => {
  let service: AppService;

  beforeEach(() => {
    service = new AppService();
  });

  it("returns five or fewer suggestions for a city", () => {
    const suggestions = service.getDailySuggestions("Lagos");
    expect(suggestions.length).toBeLessThanOrEqual(5);
    expect(suggestions.every((item) => item.city === "Lagos")).toBe(true);
  });

  it("uses NGN 3,500 for the token price", () => {
    expect(service.initiateDateToken("card").amountNgn).toBe(3500);
  });

  it("exposes logistics-only chat metadata", () => {
    const chat = service.getLogisticsChat("book-1");
    expect(chat.channelType).toBe("logistics_only");
    expect(chat.opensAt).toContain("16:30:00");
  });
});

